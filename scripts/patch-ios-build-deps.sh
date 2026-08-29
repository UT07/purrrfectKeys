#!/usr/bin/env bash
# Patch vendored native deps for Xcode 26.x compatibility.
#
# Both patches below fix TOOLCHAIN DRIFT, not code regressions: a build that
# succeeded on an older Xcode starts failing here with no source change.
# Both target gitignored trees (ios/, node_modules/), so neither survives
# `pod install`, `expo prebuild`, or `npm install`. Re-run this after any of them.
#
#   ./scripts/patch-ios-build-deps.sh
#
# Idempotent — safe to run repeatedly.
#
# ── Patch 1: fmt 11.0.2 consteval ──────────────────────────────────────────
# RN 0.76 pins fmt 11.0.2. Xcode 26's clang enforces C++20 consteval strictly
# and rejects FMT_STRING(...) inside fmt's own format_to() calls:
#
#   error: call to consteval function 'fmt::basic_format_string<char, int>::
#   basic_format_string<FMT_COMPILE_STRING, 0>' is not a constant expression
#
# Upstream fixed this in fmt 11.1+. Bumping fmt out from under RN is riskier
# than patching 5 call sites. fmt::runtime() skips compile-time format checking,
# which is safe here — these are fmt's own internal, known-correct format strings.
#
# ── Patch 2: react-native-audio-api missing <cstddef> ──────────────────────
# Constants.h uses unqualified `size_t` but includes only <cmath> and <limits>.
# Xcode 26's stricter header modularization no longer pulls in <cstddef>
# transitively, so `size_t` becomes an unknown type:
#
#   error: unknown type name 'size_t'   (Constants.h lines 11, 21, 22, 23)

set -euo pipefail

FMT="ios/Pods/fmt/include/fmt/format-inl.h"
AUDIO="node_modules/react-native-audio-api/common/cpp/audioapi/core/utils/Constants.h"
rc=0

# ── Patch 1 ────────────────────────────────────────────────────────────────
if [[ ! -f "$FMT" ]]; then
  echo "⚠ $FMT not found — run 'pod install' in ios/ first."
  rc=1
elif ! grep -qE 'FMT_STRING\(.*\).*' "$FMT" || ! grep -q 'format_to.*FMT_STRING(' "$FMT"; then
  echo "✓ fmt: already patched"
else
  chmod u+w "$FMT"
  python3 - "$FMT" <<'PY'
import re, sys
path = sys.argv[1]
lines = open(path).read().split('\n')
hits = []
for i, line in enumerate(lines):
    # Only format_to() call sites. FMT_THROW(system_error(...)) uses a
    # different overload that compiles fine — leave it alone.
    if 'FMT_STRING(' in line and 'format_to' in line:
        lines[i] = re.sub(r'FMT_STRING\((".*?")\)', r'fmt::runtime(\1)', line)
        hits.append(i + 1)
open(path, 'w').write('\n'.join(lines))
print(f"✓ fmt: patched {len(hits)} call site(s) at lines {', '.join(map(str, hits))}")
PY
fi

# ── Patch 2 ────────────────────────────────────────────────────────────────
if [[ ! -f "$AUDIO" ]]; then
  echo "⚠ $AUDIO not found — run 'npm install' first."
  rc=1
elif grep -q '#include <cstddef>' "$AUDIO"; then
  echo "✓ audio-api: already patched"
else
  chmod u+w "$AUDIO"
  python3 - "$AUDIO" <<'PY'
import sys
path = sys.argv[1]
s = open(path).read()
s = s.replace('#include <cmath>\n#include <limits>',
              '#include <cmath>\n#include <cstddef>\n#include <limits>', 1)
open(path, 'w').write(s)
print("✓ audio-api: added <cstddef> to Constants.h")
PY
fi

echo
echo "Rebuild with:"
echo "  export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8"
echo "  npx expo run:ios --configuration Release --device <HARDWARE_UDID>"
echo
echo "Do NOT 'rm -rf ios/build' — it deletes ReactCodegen output that the"
echo "codegen script phase will not regenerate. Recover with: cd ios && pod install"

exit $rc
