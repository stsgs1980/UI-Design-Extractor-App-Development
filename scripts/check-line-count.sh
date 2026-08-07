#!/usr/bin/env bash
# ==============================================================================
# check-line-count.sh -- RULE-MONOLITH-012 enforcement
# Checks staged source files against per-category line limits.
#
# Limits (from STD-META-001 s4.18.1):
#   Source code (.ts/.tsx/.js/.jsx/.py/.sh): hard 250, soft 150
#   Tests (.test.* /.spec.*): hard 400, soft 250
#   Other .md: hard 400, soft 250
#
# Usage:
#   bash scripts/check-line-count.sh [--hard] [--soft]
#   --hard: fail on hard limit violation (default)
#   --soft: warn on soft limit violation only
# ==============================================================================
set -euo pipefail

MODE="hard"
if [[ "${1:-}" == "--soft" ]]; then
  MODE="soft"
fi

VIOLATIONS=0
WARNINGS=0

# Get staged files (added, modified, copied)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

if [[ -z "$STAGED_FILES" ]]; then
  exit 0
fi

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  [[ ! -f "$file" ]] && continue

  # Determine category
  BASENAME=$(basename "$file")
  EXT="${BASENAME##*.}"
  LINES=$(wc -l < "$file")

  HARD_LIMIT=0
  SOFT_LIMIT=0

  if [[ "$BASENAME" == *.test.* || "$BASENAME" == *.spec.* ]]; then
    HARD_LIMIT=400
    SOFT_LIMIT=250
  elif [[ "$EXT" == "ts" || "$EXT" == "tsx" || \
        "$EXT" == "js" || "$EXT" == "jsx" || \
        "$EXT" == "py" || "$EXT" == "sh" ]]; then
    HARD_LIMIT=250
    SOFT_LIMIT=150
  elif [[ "$EXT" == "md" ]]; then
    HARD_LIMIT=400
    SOFT_LIMIT=250
  fi

  [[ $HARD_LIMIT -eq 0 ]] && continue

  if [[ $LINES -gt $HARD_LIMIT ]]; then
    echo "FAIL: $file is $LINES lines (hard limit $HARD_LIMIT for .$EXT)"
    VIOLATIONS=$((VIOLATIONS + 1))
  elif [[ $MODE == "soft" && $LINES -gt $SOFT_LIMIT ]]; then
    echo "WARN: $file is $LINES lines (soft limit $SOFT_LIMIT for .$ext)"
    WARNINGS=$((WARNINGS + 1))
  fi
done <<< "$STAGED_FILES"

if [[ $VIOLATIONS -gt 0 ]]; then
  echo ""
  echo "Line-count check FAILED: $VIOLATIONS hard violation(s)."
  echo "Split oversized files before committing. See RULE-MONOLITH-012."
  exit 1
fi

exit 0
