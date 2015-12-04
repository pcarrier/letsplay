#!/bin/sh

set -ex

d8 \
  --trace-turbo \
  --turbo-types \
  d8bench.js "$@"
