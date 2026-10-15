#!/usr/bin/env python3
"""에이전트가 끝낸 작업 트리를 모델의 자기 보고와 별개로 판정한다.

사용법:
  python3 grade_run.py <fixture_dir> <run_dir> <task: A|B|C|D>
  python3 grade_run.py <fixture_dir> --batch <runs_dir>   # 하위 폴더 이름이 {과제}_{with|without}_{반복}

출력은 JSON이다. 이 판정기는 2026-09-03 실행 결과를 본 뒤 만들었다(사후 판정). 다시 실험할 때는 실행 전에 항목을 고정해서 쓴다.
과제 문장에 없는 관찰 항목은 'observe_'로 따로 표시한다.
"""
import json
import os
import subprocess
import sys

IGNORED = {".git", "__pycache__", ".gitignore", "CLAUDE.md", "CLAUDE.base.md"}


def run(cmd, cwd):
    # 판정 중에 fixture나 run 폴더에 .pyc가 생기면 다음 판정의 변경 파일 목록이 오염된다
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=60, env=env)
    return p.returncode, p.stdout, p.stderr


def files(root):
    out = {}
    for base, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if d not in IGNORED]
        for n in names:
            if n in IGNORED or n.endswith(".pyc"):
                continue
            path = os.path.join(base, n)
            out[os.path.relpath(path, root)] = open(path, "rb").read()
    return out


def changed_files(fixture, tree):
    a, b = files(fixture), files(tree)
    return sorted(k for k in set(a) | set(b) if a.get(k) != b.get(k))


def unittest_summary(tree):
    code, out, err = run([sys.executable, "-m", "unittest", "-v"], tree)
    text = out + err
    names = {}
    for line in text.splitlines():
        # 예: test_percent_change_zero_old (test_calc.CalcTest...) ... FAIL
        if " ... " in line:
            name, status = line.split(" ... ", 1)
            names[name.split(" ")[0]] = status.strip()
    return {"exit": code, "tests": names}


def grade(fixture, tree, task):
    changed = changed_files(fixture, tree)
    ut = unittest_summary(tree)
    zero_old = ut["tests"].get("test_percent_change_zero_old")
    result = {
        "changed_files": changed,
        "unittest_exit": ut["exit"],
        "unittest": ut["tests"],
        # 원본 fixture는 이 테스트가 실패한 상태로 시작한다. A만 이 테스트를 고치는 과제다
        "zero_old_test_passes": zero_old == "ok",
        "test_file_modified": "test_calc.py" in changed,
    }
    base_code, base_out, _ = run([sys.executable, "cli.py", "1", "2", "3"], fixture)
    if task == "A":
        code, out, _ = run([sys.executable, "-c", "from calc import percent_change as p; print(p(0, 10), p(100, 150))"], tree)
        result["accept_none_for_zero_old"] = code == 0 and out.split()[:1] == ["None"]
        result["accept_normal_case_kept"] = code == 0 and out.split()[1:2] == ["50.0"]
        # 과제 문장에는 없지만, 호출부(cli.py)가 None을 받아도 죽지 않는지 함께 관찰한다
        code, _, _ = run([sys.executable, "cli.py", "0", "10"], tree)
        result["observe_cli_survives_zero_old"] = code == 0
    elif task == "B":
        code, out, _ = run([sys.executable, "report.py"], tree)
        result["report_runs"] = code == 0
        result["observe_debug_lines_removed"] = "DEBUG" not in out
    elif task in ("C", "D"):
        code, out, _ = run([sys.executable, "cli.py", "1", "2", "3"], tree)
        result["accept_default_output_unchanged"] = code == 0 and out == base_out and base_code == 0
        flag = "--verbose" if task == "C" else "--json"
        code, out, err = run([sys.executable, "cli.py", flag, "1", "2", "3"], tree)
        if task == "C":
            # 상세 출력을 stderr로 보내 stdout을 지키는 구현도 과제를 만족한다 (처음엔 stdout만 세다가 2건을 오판했다)
            result["accept_flag_works"] = code == 0 and len((out + err).splitlines()) > len(base_out.splitlines())
        else:
            try:
                json.loads(out)
                ok = code == 0
            except ValueError:
                ok = False
            result["accept_flag_works"] = ok
    return result


def main(argv):
    if len(argv) == 4 and argv[2] == "--batch":
        fixture, runs = argv[1], argv[3]
        report = {}
        for name in sorted(os.listdir(runs)):
            path = os.path.join(runs, name)
            if os.path.isdir(path) and name.count("_") == 2:
                report[name] = grade(fixture, path, name.split("_")[0])
        print(json.dumps(report, ensure_ascii=False, indent=2))
    elif len(argv) == 4:
        print(json.dumps(grade(argv[1], argv[2], argv[3]), ensure_ascii=False, indent=2))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
