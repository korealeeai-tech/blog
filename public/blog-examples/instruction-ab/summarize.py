#!/usr/bin/env python3
"""run_one.sh가 남긴 stream-json 로그를 run 단위 지표로 요약한다.

사용법: python3 summarize.py <out_dir>   # 하위 폴더 이름이 {과제}_{with|without}_{반복}

턴·도구 호출·테스트 실행·질문 종결·토큰·시간은 본 실행 전에 정한 지표다. 기존 실패 언급(mentions_preexisting_failure)은
결과를 본 뒤 추가했고, 이름 없이 쓴 보고를 놓친 것을 보고 기준을 한 번 넓혔다.
무효 run(권한 거부·비정상 종료)은 valid=false로 표시한다. 이 스크립트는 run별 값만 내고 합산하지 않으니, 비교할 때 무효 run을 빼고 본다.
"""
import json
import os
import re
import sys


def summarize(path):
    tools, bash, result, init = {}, [], None, None
    for line in open(path, encoding="utf-8", errors="replace"):
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "system" and ev.get("subtype") == "init":
            init = ev
        elif ev.get("type") == "assistant":
            for blk in ev.get("message", {}).get("content", []):
                if blk.get("type") == "tool_use":
                    name = blk.get("name", "?")
                    tools[name] = tools.get(name, 0) + 1
                    if name == "Bash":
                        bash.append(blk.get("input", {}).get("command", ""))
        elif ev.get("type") == "result":
            result = ev
    result = result or {}
    final = result.get("result") or ""
    denials = len(result.get("permission_denials") or [])
    edits = tools.get("Edit", 0) + tools.get("Write", 0)
    return {
        "model": (init or {}).get("model"),
        "cli_version": (init or {}).get("claude_code_version"),
        # 권한 거부가 하나라도 있으면 모델 행동이 아니라 하네스 설정을 잰 것이므로 무효로 본다
        "valid": result.get("subtype") == "success" and not result.get("is_error") and denials == 0,
        "permission_denials": denials,
        "turns": result.get("num_turns"),
        "tool_calls": sum(tools.values()),
        "edit_calls": edits,
        "agent_ran_unittest": any(re.search(r"unittest", c) for c in bash),
        # 원본 fixture에는 처음부터 실패하는 테스트가 하나 있다. 최종 보고가 그것을 언급했는지 본다
        # (테스트 이름 없이 "percent_change(0, 10)" 으로만 쓴 보고도 있어 둘 다 센다. 과제 A는 이 실패 자체가 과제라 해당 없음)
        "mentions_preexisting_failure": "test_percent_change_zero_old" in final or "percent_change(0" in final,
        # 편집 없이 끝났고 마지막 메시지가 사용자에게 묻는 형태면 '질문으로 종결'로 센다
        "ended_with_question": edits == 0 and "?" in final,
        "output_tokens": (result.get("usage") or {}).get("output_tokens"),
        "cost_usd": round(result.get("total_cost_usd") or 0, 3),
        "duration_s": round((result.get("duration_ms") or 0) / 1000),
    }


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    out = {}
    for name in sorted(os.listdir(argv[1])):
        log = os.path.join(argv[1], name, "stream.jsonl")
        if os.path.exists(log):
            out[name] = summarize(log)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
