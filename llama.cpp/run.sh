#!/usr/bin/env bash
# Runs llama-server in router mode with the presets from models.ini.
# Extra arguments go straight to llama-server, e.g. ./run.sh --port 8080
set -euo pipefail
cd "$(dirname "$0")"

# Use the newest unpacked release in this folder, else llama-server on PATH.
server=""
for candidate in llama-*/llama-server.exe llama-*/llama-server; do
  [ -x "$candidate" ] && server=$candidate
done
server=${server:-$(command -v llama-server || true)}
if [ -z "$server" ]; then
  echo "llama-server not found: unpack a llama.cpp release into $(pwd) or put it on PATH" >&2
  exit 1
fi

exec "$server" --models-preset models.ini "$@"
