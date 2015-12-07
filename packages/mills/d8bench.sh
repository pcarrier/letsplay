#!/bin/sh

set -ex

make

d8 \
  --trace-turbo \
  --turbo-types \
  d8bench.js "$@"
