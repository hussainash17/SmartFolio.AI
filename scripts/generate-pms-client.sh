#! /usr/bin/env bash

set -euo pipefail

# Usage:
#   BACKEND_URL=http://localhost:8000 ./scripts/generate-pms-client.sh
#
# Fetches OpenAPI JSON from the running backend and regenerates the
# TypeScript API client for pms-frontend using openapi-ts.

BACKEND_URL=${BACKEND_URL:-http://localhost:8000}
API_PATH=/api/v1/openapi.json
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
PMS_DIR="$ROOT_DIR/pms-frontend"

echo "Fetching OpenAPI from: ${BACKEND_URL}${API_PATH}"
mkdir -p "$PMS_DIR"
curl -fsSL "${BACKEND_URL}${API_PATH}" -o "$PMS_DIR/openapi.json"

echo "Generating client in pms-frontend/src/client"
cd "$PMS_DIR"
npm run --silent generate-client

echo "Done."


