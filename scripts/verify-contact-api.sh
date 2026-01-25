#!/usr/bin/env bash
set -euo pipefail

base_url="${BASE_URL:-http://localhost:4321}"

missing=()
if [[ -z "${POSTGRES_URL:-}" ]]; then
  missing+=("POSTGRES_URL")
fi
if [[ -z "${ADMIN_API_KEY:-}" ]]; then
  missing+=("ADMIN_API_KEY")
fi

if (( ${#missing[@]} )); then
  echo "Missing required env vars: ${missing[*]}" >&2
  echo "Set them in .env before running this script." >&2
  exit 1
fi

tmp_body="$(mktemp)"
tmp_hdr="$(mktemp)"
cleanup() {
  rm -f "$tmp_body" "$tmp_hdr"
}
trap cleanup EXIT

request_json() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local auth_header="${4:-}"

  if [[ -n "$auth_header" ]]; then
    curl -s -D "$tmp_hdr" -o "$tmp_body" -w "%{http_code}" \
      -H "Authorization: $auth_header" \
      -H "Content-Type: application/json" \
      -X "$method" \
      --data-binary "$data" \
      "$url"
  else
    curl -s -D "$tmp_hdr" -o "$tmp_body" -w "%{http_code}" \
      -H "Content-Type: application/json" \
      -X "$method" \
      --data-binary "$data" \
      "$url"
  fi
}

echo "Verifying contact API at $base_url"

payload='{"name":"Test User","email":"test@example.com","message":"Hello from verify script","metadata":{"elapsedMs":1200,"fastSubmit":false}}'
status="$(request_json "POST" "$base_url/api/contact" "$payload")"
if [[ "$status" != "200" ]]; then
  echo "Expected 200 from /api/contact, got $status" >&2
  cat "$tmp_body" >&2
  exit 1
fi

status="$(request_json "GET" "$base_url/api/admin/contacts?limit=1" "" "Bearer $ADMIN_API_KEY")"
if [[ "$status" != "200" ]]; then
  echo "Expected 200 from /api/admin/contacts, got $status" >&2
  cat "$tmp_body" >&2
  exit 1
fi

if ! rg -i "^cache-control: no-store" "$tmp_hdr" >/dev/null; then
  echo "Expected Cache-Control: no-store on admin response." >&2
  exit 1
fi

before_total="$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(j.pagination?.total ?? 0)" "$tmp_body")"

honeypot_payload='{"name":"Test User","email":"test@example.com","message":"Hello from verify script","website":"spam","metadata":{"elapsedMs":1200,"fastSubmit":true}}'
status="$(request_json "POST" "$base_url/api/contact" "$honeypot_payload")"
if [[ "$status" != "200" ]]; then
  echo "Expected 200 from honeypot submit, got $status" >&2
  cat "$tmp_body" >&2
  exit 1
fi

status="$(request_json "GET" "$base_url/api/admin/contacts?limit=1" "" "Bearer $ADMIN_API_KEY")"
if [[ "$status" != "200" ]]; then
  echo "Expected 200 from /api/admin/contacts, got $status" >&2
  cat "$tmp_body" >&2
  exit 1
fi

after_total="$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(j.pagination?.total ?? 0)" "$tmp_body")"

if [[ "$after_total" -gt "$before_total" ]]; then
  echo "Honeypot submission appears to be stored." >&2
  exit 1
fi

echo "OK: contact API verification passed."
