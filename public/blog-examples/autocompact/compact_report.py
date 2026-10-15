#!/usr/bin/env python3
"""Claude Code 세션 로그에서 자동 압축이 언제, 얼마나 돌았는지 숫자로만 요약한다.

사용법:
  python3 compact_report.py                       # 기본: ~/.claude/projects
  python3 compact_report.py <projects_dir> [--since YYYY-MM-DD] [--until YYYY-MM-DDTHH:MM] [--sweep 250000,400000,500000,1000000] [--offset 33000]
  (--since · --until은 UTC. 지금 쓰는 세션도 로그가 계속 늘어나므로, 같은 숫자를 다시 내려면 --until로 끝을 고정한다)

읽는 것: <projects_dir>/*/*.jsonl (메인 세션 로그. 하위 폴더의 서브에이전트 로그는 읽지 않는다)
출력하는 것: 기간 · 요청 수 · 요청당 컨텍스트 분포 · 압축 이벤트 분포 · 임계별 시뮬레이션.
대화 내용, 세션 ID, 파일 경로는 출력하지 않는다.

시뮬레이션은 실측이 아니다. 실제 압축이 버린 토큰을 다시 더해 '압축이 없었다면'의 순서를 만들고,
그 위에 임계만 바꿔 다시 잘라 본 근사다. 압축 뒤 대화가 실제와 똑같이 흘렀다고 가정한다.
자리를 비운 사이에 도는 idle 압축은 시뮬레이션과 크기 분포에 넣지 않고 건수만 따로 센다.
--sweep의 가장 큰 값은 모델의 컨텍스트 창으로 둔다. 200K 창 모델이라면 --sweep 150000,200000처럼 준다.
압축 지점(임계 − offset)이 압축 직후 바닥보다 높지 않은 임계는 계산이 성립하지 않아 건너뛴다.
"""
import glob
import json
import os
import statistics
import sys
from datetime import datetime, timezone

# 압축이 임계보다 이만큼 낮은 지점에서 돈다고 보고 시뮬레이션한다.
# 공식 문서의 1M 기본값(약 967K)과 같은 차이다. 자기 로그의 '압축 직전 크기'와 설정값을 대조해 --offset으로 바꿀 수 있다
DEFAULT_OFFSET = 33_000
# 압축 기록이 하나도 없을 때만 쓰는 요약 크기 가정값
DEFAULT_SUMMARY = 15_000
# 자리를 비운 사이 캐시가 식기 전에 압축했을 때 대화에 남는 안내 문구 (공식 문서의 idleCompaction 설명)
IDLE_NOTE = "Compacted while idle"


def parse_time(stamp):
    return datetime.fromisoformat(stamp.replace("Z", "+00:00")).astimezone(timezone.utc)


def read_session(path, since, until=None):
    """세션 로그 하나에서 요청(중복 제거)과 압축 경계를 뽑는다."""
    requests, compacts, seen, versions, idle_notes = [], [], set(), set(), []
    lines_with_usage = 0
    with open(path, encoding="utf-8", errors="replace") as fp:
        for line in fp:
            if '"usage"' not in line and "compact_boundary" not in line and IDLE_NOTE not in line:
                continue
            try:
                rec = json.loads(line)
            except ValueError:
                continue
            stamp = rec.get("timestamp")
            if not stamp:
                continue
            when = parse_time(stamp)
            if (since and when < since) or (until and when > until):
                continue
            if rec.get("version"):
                versions.add(rec["version"])
            if rec.get("type") == "system" and IDLE_NOTE in json.dumps(rec.get("content"), ensure_ascii=False):
                idle_notes.append(when)
                continue
            if rec.get("type") == "system" and rec.get("subtype") == "compact_boundary":
                meta = rec.get("compactMetadata") or {}
                compacts.append({"at": when, "trigger": meta.get("trigger"), "pre": meta.get("preTokens"),
                                 "post": meta.get("postTokens"), "ms": meta.get("durationMs")})
                continue
            msg = rec.get("message") or {}
            usage = msg.get("usage")
            if rec.get("type") != "assistant" or not usage:
                continue
            lines_with_usage += 1
            # 한 응답이 내용 블록마다 따로 한 줄씩 기록되고, 각 줄이 같은 usage를 반복한다.
            # 줄 수를 그대로 세면 요청 수와 토큰 합이 부풀어서 message.id로 한 번만 센다
            key = msg.get("id") or rec.get("requestId")
            if key in seen:
                continue
            seen.add(key)
            if msg.get("model") == "<synthetic>":
                continue
            ctx = sum(int(usage.get(k) or 0) for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
            requests.append({"at": when, "ctx": ctx})
    requests.sort(key=lambda r: r["at"])
    compacts.sort(key=lambda c: c["at"])
    # 압축 경계 기록의 trigger는 임계 압축과 idle 압축 모두 "auto"라서, 같은 시각에 남는 안내 문구로 구분한다
    for c in compacts:
        c["idle"] = any(abs((t - c["at"]).total_seconds()) <= 120 for t in idle_notes)
    return requests, compacts, lines_with_usage, versions


def pct(values, p):
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(len(ordered) * p))]


def k(n):
    return f"{n / 1000:.0f}K"


def virtual_sequence(requests, compacts):
    """실제 압축이 줄인 만큼을 이후 요청에 다시 더해 '압축이 없었다면'의 컨텍스트 순서를 만든다."""
    out, dropped, i = [], 0, 0
    for r in requests:
        while i < len(compacts) and compacts[i]["at"] <= r["at"]:
            # 압축 직후 첫 요청이 실제로 다시 시작한 크기와 압축 직전 크기의 차이만큼을 되돌린다
            if compacts[i]["pre"]:
                dropped += max(0, compacts[i]["pre"] - r["ctx"])
            i += 1
        out.append(r["ctx"] + dropped)
    return out


def simulate(virtual, window, offset, post):
    """임계 window에서 다시 잘랐을 때의 요청별 컨텍스트 합, 압축 횟수, 압축 호출이 읽는 토큰을 센다."""
    trigger = window - offset
    total = compactions = compaction_reads = 0
    shift = 0
    for v in virtual:
        ctx = v - shift
        if ctx > trigger:
            # 압축 호출은 그 시점의 대화 전체를 한 번 읽는다. 그 뒤 컨텍스트는 요약 크기에서 다시 자란다
            compactions += 1
            compaction_reads += ctx
            shift = v - post
            ctx = post
        total += ctx
    return total, compactions, compaction_reads


def main(argv):
    args = [a for a in argv[1:]]
    since = until = None
    sweep = [250_000, 400_000, 500_000, 1_000_000]
    if "--since" in args:
        i = args.index("--since")
        since = datetime.fromisoformat(args[i + 1]).replace(tzinfo=timezone.utc)
        del args[i:i + 2]
    if "--until" in args:
        i = args.index("--until")
        until = datetime.fromisoformat(args[i + 1]).replace(tzinfo=timezone.utc)
        del args[i:i + 2]
    offset = DEFAULT_OFFSET
    if "--offset" in args:
        i = args.index("--offset")
        offset = int(args[i + 1])
        del args[i:i + 2]
    if "--sweep" in args:
        i = args.index("--sweep")
        sweep = [int(x) for x in args[i + 1].split(",")]
        del args[i:i + 2]
    root = args[0] if args else os.path.expanduser("~/.claude/projects")
    paths = sorted(glob.glob(os.path.join(root, "*", "*.jsonl")))
    if not paths:
        print(f"세션 로그가 없다: {root}/*/*.jsonl")
        return 1

    sessions, all_req, all_cmp, versions, lines = [], [], [], set(), 0
    for path in paths:
        req, cmp_, n_lines, vers = read_session(path, since, until)
        if not req:
            continue
        sessions.append((req, cmp_))
        all_req += req
        all_cmp += cmp_
        versions |= vers
        lines += n_lines

    if not all_req:
        print("조건에 맞는 요청이 없다")
        return 1
    ctx = [r["ctx"] for r in all_req]
    first, last = min(r["at"] for r in all_req), max(r["at"] for r in all_req)
    print(f"기간: {first:%Y-%m-%d} ~ {last:%Y-%m-%d} (UTC) · 세션 {len(sessions)}개")
    if versions:
        print(f"Claude Code 버전: {min(versions)} ~ {max(versions)} (문자열 정렬)")
    print(f"요청: {len(all_req)}건 (usage가 있는 로그 줄 {lines}줄 → 같은 응답 중복 제거)")
    print(f"요청당 컨텍스트: 중앙 {k(statistics.median(ctx))} · p90 {k(pct(ctx, 0.9))} · 최대 {k(max(ctx))}")

    print(f"\n압축: {len(all_cmp)}건", end="")
    triggers = {}
    for c in all_cmp:
        triggers[c["trigger"]] = triggers.get(c["trigger"], 0) + 1
    print(" (" + ", ".join(f"{t} {n}" for t, n in sorted(triggers.items(), key=str)) + ")" if triggers else "")
    # idle 압축은 크기 기준이 아니라서 아래 분포 · 간격 · 바닥 계산에서 뺀다
    sized = [c for c in all_cmp if not c["idle"]]
    if all_cmp:
        print(f"그중 idle 압축 안내가 함께 남은 압축: {len(all_cmp) - len(sized)}건 (아래 분포는 나머지 {len(sized)}건)")
    pres = [c["pre"] for c in sized if c["pre"]]
    posts = [c["post"] for c in sized if c["post"]]
    secs = [c["ms"] / 1000 for c in sized if c["ms"]]
    if pres:
        bins = {}
        for p in pres:
            bins[p // 10_000 * 10] = bins.get(p // 10_000 * 10, 0) + 1
        top = sorted(bins.items(), key=lambda kv: -kv[1])[:6]
        print("압축 직전 크기 (1만 단위 묶음, 많은 순): " + " · ".join(f"{b}K대 {n}건" for b, n in top))
        print(f"압축 직후 크기: 중앙 {k(statistics.median(posts))} · p90 {k(pct(posts, 0.9))}")
        print(f"압축 소요 시간: 중앙 {statistics.median(secs):.0f}초 · p90 {pct(secs, 0.9):.0f}초")
        gaps = []
        for req, cmp_ in sessions:
            times = [c["at"] for c in cmp_ if not c["idle"]]
            for a, b in zip(times, times[1:]):
                gaps.append(sum(1 for r in req if a < r["at"] <= b))
        if gaps:
            print(f"같은 세션 안 압축 사이 요청 수: 중앙 {statistics.median(gaps):.0f}건 · p90 {pct(gaps, 0.9)}건")

    # 압축 기록의 postTokens는 요약된 대화 부분만 센다. 다음 요청에는 시스템 프롬프트 · 도구 정의 ·
    # 다시 읽어 넣는 지시문이 함께 실리므로, 시뮬레이션은 '압축 직후 첫 요청의 실제 컨텍스트'에서 다시 자라게 한다
    restart = []
    for req, cmp_ in sessions:
        for c in (c for c in cmp_ if not c["idle"]):
            nxt = next((r["ctx"] for r in req if r["at"] > c["at"]), None)
            if nxt:
                restart.append(nxt)
    if restart:
        post = statistics.median(restart)
        print(f"압축 직후 첫 요청의 실제 컨텍스트: 중앙 {k(post)} (postTokens보다 큰 만큼이 압축 뒤 다시 실리는 몫)")
    else:
        post = statistics.median(req[0]["ctx"] for req, _ in sessions) + DEFAULT_SUMMARY
        print(f"압축 기록 없음 → 세션 첫 요청 중앙값 + 요약 {k(DEFAULT_SUMMARY)} = {k(post)}를 압축 직후 크기로 가정")
    print(f"\n시뮬레이션 (근사, 압축 직후 {k(post)}에서 다시 자람 · 압축은 임계보다 {k(offset)} 낮은 지점에서 돈다고 가정)")
    print(f"{'임계':>8} {'요청 컨텍스트 합':>14} {'압축 횟수':>8} {'압축 호출이 읽는 양':>16} {'합계 대비':>8}")
    rows = []
    for window in sweep:
        if window - offset <= post:
            print(f"{k(window):>8} 건너뜀: 압축 지점({k(window - offset)})이 압축 직후 바닥({k(post)})보다 높지 않다")
            continue
        total = comps = reads = 0
        for req, cmp_ in sessions:
            t, c, r = simulate(virtual_sequence(req, cmp_), window, offset, post)
            total, comps, reads = total + t, comps + c, reads + r
        rows.append((window, total, comps, reads))
    if not rows:
        print("계산할 임계가 없다. --sweep에 더 큰 값을 준다")
        return 1
    base = max(rows, key=lambda r: r[0])
    for window, total, comps, reads in rows:
        share = (total + reads) / (base[1] + base[3]) * 100
        print(f"{k(window):>8} {total / 1e6:>13.1f}M {comps:>8} {reads / 1e6:>15.1f}M {share:>7.0f}%")
    print("합계 대비 = (요청 컨텍스트 합 + 압축 호출이 읽는 양) / 가장 큰 임계의 같은 값")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
