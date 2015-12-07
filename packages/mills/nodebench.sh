#!/bin/sh

rm _hydrogen.cfg _code.asm

set -ex

make

node \
  --trace-hydrogen \
  --trace-hydrogen-file=_hydrogen.cfg \
  --trace-phase=Z \
  --trace-deopt \
  --code-comments \
  --hydrogen-track-positions \
  --redirect-code-traces \
  --redirect-code-traces-to=_code.asm \
  --print-opt-code \
  nodebench.js "$@"
