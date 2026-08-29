#!/usr/bin/env bash
# Patch fmt 11.0.2 for Xcode 26.x clang compatibility.
#
# WHY: React Native 0.76 pins fmt 11.0.2. Xcode 26.x's clang enforces C++20
# consteval rules more strictly and rejects FMT_STRING(...) inside fmt's own
# format_to() calls with:
#
#   error: call to consteval function
#   'fmt::basic_format_string<char, int>::basic_format_string<FMT_COMPILE_STRING, 0>'
#   is not a constant expression
#
# Upstream fixed this in fmt 11.1+, but bumping fmt out from under RN is riskier
# than patching five call sites. fmt::runtime() skips compile-time format
# checking — safe here because these are fmt's own internal, known-correct
# format strings.
#
# WHEN TO RUN: after any `pod install`, `expo prebuild`, or a fresh clone.
# `ios/` is gitignored, so this patch does not survive regeneration.
#
#   ./scripts/patch-fmt-consteval.sh
#
# Idempotent — safe to run repeatedly.

set -euo pipefail

TARGET="ios/Pods/fmt/include/fmt/format-inl.h"

if [[ ! -f "$TARGET" ]]; then
  echo "✗ $TARGET not found — run 'pod install' in ios/ first." >&2
  exit 1
fi

if ! grep -q 'FMT_STRING(' "$TARGET"; then
  echo "✓ Already patched (no FMT_STRING call sites left in format_to)."
  exit 0
fi

chmod u+w "$TARGET"

python3 - "$TARGET" <<'PY'
import re, sys

path = sys.argv[1]
with open(path) as f:
    lines = f.read().split('\n')

patched = []
for i, line in enumerate(lines):
    # Only the format_to() call sites. FMT_THROW(system_error(...)) uses a
    # different overload that compiles fine — leave it alone.
    if 'FMT_STRING(' in line and 'format_to' in line:
        lines[i] = re.sub(r'FMT_STRING\((".*?")\)', r'fmt::runtime(\1)', line)
        patched.append(i + 1)

with open(path, 'w') as f:
    f.write('\n'.join(lines))

if patched:
    print(f"✓ Patched {len(patched)} call site(s) at lines: "
          + ', '.join(map(str, patched)))
else:
    print("✓ Nothing to patch.")
PY

echo "  Now rebuild:  export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8"
echo "                npx expo run:ios --configuration Release"
