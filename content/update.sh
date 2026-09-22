#!/bin/sh
set -eu
system=false; rollback=false
while [ "$#" -gt 0 ]; do case "$1" in --system) system=true;; --rollback) rollback=true;; --help) echo 'usage: update.sh [--system] [--rollback]'; exit 0;; *) echo "unknown option: $1" >&2; exit 2;; esac; shift; done
if $system; then [ "$(id -u)" -eq 0 ] || { echo '--system requires root.' >&2; exit 1; }; binary=/usr/local/bin/webfleet; else [ "$(id -u)" -ne 0 ] || { echo 'Run without sudo or pass --system.' >&2; exit 1; }; binary=${WEBFLEET_INSTALL_DIR:-"$HOME/.local/bin"}/webfleet; fi
[ -f "$binary" ] && [ ! -L "$binary" ] || { echo "No regular Web Fleet installation at $binary" >&2; exit 1; }
if $rollback && $system; then "$binary" service rollback; exit 0; fi
previous="$binary.previous"; if $rollback; then [ -f "$previous" ] || { echo 'No rollback binary is available.' >&2; exit 1; }; cp "$previous" "$binary.rollback.$$"; chmod 0755 "$binary.rollback.$$"; mv "$binary.rollback.$$" "$binary"; echo 'Restored the previous Web Fleet binary.'; exit 0; fi
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT INT TERM; WEBFLEET_VERSION=${WEBFLEET_VERSION:-latest} sh -c "curl -fsSL https://webfleet.cv/download.sh | sh -s -- --output '$tmp/webfleet'"
if $system && [ -f /etc/systemd/system/webfleet.service ]; then sha=$(sha256sum "$tmp/webfleet" | awk '{print $1}'); "$binary" service update "$tmp/webfleet" "$sha"; else cp "$binary" "$previous.new"; chmod 0755 "$previous.new"; mv "$previous.new" "$previous"; install -m 0755 "$tmp/webfleet" "$binary.new"; mv "$binary.new" "$binary"; fi
echo 'Updated Web Fleet. Roll back with update.sh --rollback.'
