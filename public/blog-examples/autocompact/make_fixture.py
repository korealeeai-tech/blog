#!/usr/bin/env python3
"""compact_report.py를 시험할 합성 세션 로그 세 개를 만든다. 실제 대화 내용은 없다.

사용법: python3 make_fixture.py <출력 폴더>   # <출력 폴더>/demo-project/ 아래에 session-a/b/c.jsonl

session-a: 임계 300K로 설정한 세션처럼, 267K를 넘을 때마다 압축 경계를 남기고 80K에서 다시 자란다
session-b: 임계 없이 1M 기본값으로 쓴 세션처럼, 압축 없이 70K에서 610K까지 자란다
session-c: 1M 기본값 세션에서 250K 근처에 55분 자리를 비워 idle 압축이 한 번 돈 경우
세 세션 모두 응답 하나를 두 줄(생각 블록 · 본문 블록)로 기록하고 usage를 반복한다. 실제 로그가 그렇다.
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

START = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)


def stamp(t):
    return t.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def assistant_lines(i, t, ctx):
    usage = {"input_tokens": 3, "cache_read_input_tokens": ctx - 2003, "cache_creation_input_tokens": 2000, "output_tokens": 800}
    msg = {"id": f"msg_{i:04d}", "model": "claude-demo", "usage": usage}
    # 같은 응답이 블록마다 한 줄씩 남는다 → 줄 수로 세면 요청이 두 배가 된다
    return [
        {"type": "assistant", "timestamp": stamp(t), "version": "2.1.290", "message": dict(msg, content=[{"type": "thinking"}])},
        {"type": "assistant", "timestamp": stamp(t), "version": "2.1.290", "message": dict(msg, content=[{"type": "text"}])},
    ]


def session_a():
    out, ctx, t = [], 70_000, START
    for i in range(60):
        t += timedelta(minutes=1)
        if ctx > 300_000 - 33_000:
            out.append({"type": "system", "subtype": "compact_boundary", "timestamp": stamp(t), "version": "2.1.290",
                        "compactMetadata": {"trigger": "auto", "preTokens": ctx, "postTokens": 15_000, "durationMs": 100_000}})
            t += timedelta(minutes=2)
            ctx = 80_000
        out += assistant_lines(i, t, ctx)
        ctx += 12_000
    # 오류 응답 등에 붙는 합성 메시지는 요청으로 세지 않는다
    out.append({"type": "assistant", "timestamp": stamp(t), "version": "2.1.290",
                "message": {"id": "msg_synth", "model": "<synthetic>", "usage": {"input_tokens": 0, "output_tokens": 0}}})
    return out


def session_b():
    out, ctx, t = [], 70_000, START + timedelta(hours=3)
    for i in range(37):
        t += timedelta(minutes=1)
        out += assistant_lines(1000 + i, t, ctx)
        ctx += 15_000
    return out


def session_c():
    out, ctx, t = [], 70_000, START + timedelta(hours=6)
    for i in range(30):
        t += timedelta(minutes=1)
        if i == 15:
            # 자리를 비운 55분 뒤: 안내 문구와 압축 경계가 함께 남는다. trigger는 임계 압축과 같은 "auto"다
            t += timedelta(minutes=55)
            out.append({"type": "system", "subtype": "informational", "level": "notice", "timestamp": stamp(t), "version": "2.1.290",
                        "content": "Compacted while idle, before the prompt cache expired"})
            out.append({"type": "system", "subtype": "compact_boundary", "timestamp": stamp(t), "version": "2.1.290",
                        "compactMetadata": {"trigger": "auto", "preTokens": ctx, "postTokens": 15_000, "durationMs": 90_000}})
            ctx = 80_000
        out += assistant_lines(2000 + i, t, ctx)
        ctx += 12_000
    return out


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    folder = os.path.join(argv[1], "demo-project")
    os.makedirs(folder, exist_ok=True)
    for name, rows in (("session-a.jsonl", session_a()), ("session-b.jsonl", session_b()), ("session-c.jsonl", session_c())):
        with open(os.path.join(folder, name), "w", encoding="utf-8") as fp:
            for row in rows:
                fp.write(json.dumps(row) + "\n")
    print(f"만듦: {folder}/session-a.jsonl, session-b.jsonl, session-c.jsonl")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
