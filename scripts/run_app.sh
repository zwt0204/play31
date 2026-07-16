#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/root/.nvm/versions/node/v20.20.2/bin:$PATH"

exec npm run preview -- --host 127.0.0.1 --port 4173
