#!/usr/bin/env bash
# 과제 4개 × with/without × 반복 REPS회를 동시 PARALLEL개로 실행한 뒤 요약과 판정을 만든다.
# 사용법: REPS=2 PARALLEL=4 bash run_all.sh
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
# 실행 로그에 절대경로가 들어가므로 작업 폴더는 예제 폴더 밖에 둔다
export WORK=${WORK:-${TMPDIR:-/tmp}/instruction-ab-work}
REPS=${REPS:-2}; PARALLEL=${PARALLEL:-4}

for C in A B C D; do for ARM in with without; do for REP in $(seq 1 "$REPS"); do
  echo "$C $ARM $REP"
done; done; done | xargs -P "$PARALLEL" -L 1 bash "$HERE/run_one.sh"   # 내려받으면 실행 권한이 빠지므로 bash로 부른다

python3 "$HERE/summarize.py" "$WORK/out" > "$WORK/metrics.json"
python3 "$HERE/grade_run.py" "$HERE/fixture" --batch "$WORK/runs" > "$WORK/grades.json"
echo "요약: $WORK/metrics.json / 판정: $WORK/grades.json"
