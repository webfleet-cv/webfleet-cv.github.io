#!/bin/sh
set -eu
for name in install download update; do
  sh -n "content/$name.sh"
  cmp "content/$name.sh" "public/$name.sh"
done
grep -q 'github.com/webfleet-cv/webfleet/releases' content/download.sh
grep -q 'sha256' content/download.sh
echo 'webfleet release scripts smoke: ok'
