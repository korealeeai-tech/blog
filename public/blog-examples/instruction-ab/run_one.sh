#!/usr/bin/env bash
# 지시문 한 줄의 효과를 재는 A/B 실험 1회. 규칙 유무만 다른 CLAUDE.md로 같은 과제를 실행한다.
# 사용법: bash run_one.sh <A|B|C|D> <with|without> <반복번호>
# 환경변수: MODEL(기본 claude-fable-5-1) EFFORT(기본 high) WORK(기본 ${TMPDIR:-/tmp}/instruction-ab-work)
#
# 주의 1: 에이전트에게 Bash 전체를 허용한다. 버려도 되는 디렉터리나 컨테이너에서만 실행한다.
# 주의 2: WORK를 ~/.claude 아래에 두면 모든 파일이 민감 파일로 판정돼 편집이 거부되고, run 전체가 무효가 된다.
# 주의 3: 상위 디렉터리의 CLAUDE.md나 사용자 전역 ~/.claude/CLAUDE.md가 있으면 그 내용도 섞일 수 있다. 실행 전에 확인한다.
# 주의 4: 실행 로그에는 실행한 컴퓨터의 절대경로가 들어간다. WORK를 공개 저장소 안에 두지 않는다.
set -euo pipefail

C=$1; ARM=$2; REP=$3
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-${TMPDIR:-/tmp}/instruction-ab-work}
RUN="$WORK/runs/${C}_${ARM}_${REP}"
OUT="$WORK/out/${C}_${ARM}_${REP}"

if [ -e "$RUN" ]; then echo "이미 있음: $RUN (다른 반복번호를 쓰거나 지운 뒤 다시 실행)" >&2; exit 1; fi
mkdir -p "$RUN" "$OUT"
cp -R "$HERE/fixture/." "$RUN/"
# 예제 폴더 안에서는 CLAUDE.base.md로 보관한다. 이 저장소에서 일하는 에이전트가 예제 지시를 자기 지시로 읽지 않게 하기 위해서다
mv "$RUN/CLAUDE.base.md" "$RUN/CLAUDE.md"
# with 팔만 규칙 한 절을 CLAUDE.md 끝에 붙인다. 나머지는 두 팔이 완전히 같다
if [ "$ARM" = with ]; then cat "$HERE/rules/rule_${C}.md" >> "$RUN/CLAUDE.md"; fi
TASK=$(grep "^${C}|" "$HERE/tasks.txt" | cut -d'|' -f2-)

printf '__pycache__/\n' > "$RUN/.gitignore"
(cd "$RUN" && git init -q && git add -A && git -c user.email=ab@example.invalid -c user.name=ab commit -qm base)

# 시간 제한은 GNU timeout(macOS는 coreutils의 gtimeout)이 있을 때만 건다. 없으면 제한 없이 실행한다
LIMIT=()
if command -v timeout >/dev/null 2>&1; then LIMIT=(timeout 900)
elif command -v gtimeout >/dev/null 2>&1; then LIMIT=(gtimeout 900); fi

# 로그는 run 디렉터리 밖에 둔다. 안에 두면 에이전트가 만든 변경과 섞인다
START=$(date +%s)
set +e
(cd "$RUN" && ${LIMIT[@]+"${LIMIT[@]}"} claude -p "$TASK" --model "${MODEL:-claude-fable-5-1}" --effort "${EFFORT:-high}" \
  --output-format stream-json --verbose --no-session-persistence --setting-sources project \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Edit" "Write" "Glob" "Grep" "Bash" \
  > "$OUT/stream.jsonl" 2> "$OUT/stderr.txt")
CODE=$?
set -e
echo "exit=$CODE secs=$(( $(date +%s) - START ))" > "$OUT/meta.txt"
git -C "$RUN" add -A && git -C "$RUN" diff --cached --stat > "$OUT/diffstat.txt"
echo "${C}_${ARM}_${REP}: $(cat "$OUT/meta.txt")"
