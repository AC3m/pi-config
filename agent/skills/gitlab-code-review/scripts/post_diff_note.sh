#!/usr/bin/env bash
set -euo pipefail

project=""
mr=""
base_sha=""
start_sha=""
head_sha=""
new_path=""
old_path=""
new_line=""
old_line=""
body=""
body_file=""
token="${GITLAB_TOKEN:-${GITLAB_ACCESS_TOKEN:-${OAUTH_TOKEN:-}}}"

usage() {
  cat <<'EOF'
Usage:
  post_diff_note.sh --project <id> --mr <iid> --base <sha> --start <sha> --head <sha> \
    --path <file> [--old-path <file>] [--line <new_line>] [--old-line <old_line>] \
    (--body <text> | --body-file <file>)

  --line        for added/changed lines (new file side)
  --old-line    for removed lines (old file side)
  --old-path    defaults to --path if omitted
  --body-file   preferred for Markdown/suggestion bodies
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)   project="$2";   shift 2 ;;
    --mr)        mr="$2";        shift 2 ;;
    --base)      base_sha="$2";  shift 2 ;;
    --start)     start_sha="$2"; shift 2 ;;
    --head)      head_sha="$2";  shift 2 ;;
    --path)      new_path="$2";  shift 2 ;;
    --old-path)  old_path="$2";  shift 2 ;;
    --line)      new_line="$2";  shift 2 ;;
    --old-line)  old_line="$2";  shift 2 ;;
    --body)      body="$2";      shift 2 ;;
    --body-file) body_file="$2"; shift 2 ;;
    -h|--help)   usage; exit 0 ;;
    *)           echo "Unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -n "$body" && -n "$body_file" ]]; then
  echo "Use either --body or --body-file, not both." >&2
  exit 1
fi

if [[ -n "$body_file" ]]; then
  if [[ ! -r "$body_file" ]]; then
    echo "Body file is not readable: $body_file" >&2
    exit 1
  fi
  body="$(cat "$body_file")"
fi

if [[ -z "$project" || -z "$mr" || -z "$base_sha" || -z "$start_sha" || -z "$head_sha" || -z "$new_path" || -z "$body" ]]; then
  usage >&2
  exit 1
fi

if [[ -z "$new_line" && -z "$old_line" ]]; then
  echo "Either --line or --old-line is required." >&2
  exit 1
fi

: "${old_path:=$new_path}"

if [[ -z "$token" ]]; then
  token="$(
    glab auth status --show-token 2>&1 \
      | sed -n 's/.*Token found: //p' \
      | head -n1 \
      | tr -d '[:space:]' \
      || true
  )"
fi

if [[ -z "$token" ]]; then
  echo "No GitLab token found. Set GITLAB_TOKEN or authenticate with glab." >&2
  exit 1
fi

header_config="$(mktemp)"
trap 'rm -f "$header_config"' EXIT
chmod 600 "$header_config"
printf 'header = "PRIVATE-TOKEN: %s"\n' "$token" > "$header_config"

curl_args=(
  --silent --show-error --fail-with-body
  --config "$header_config"
  --request POST
  --form-string "position[position_type]=text"
  --form-string "position[base_sha]=$base_sha"
  --form-string "position[start_sha]=$start_sha"
  --form-string "position[head_sha]=$head_sha"
  --form-string "position[old_path]=$old_path"
  --form-string "position[new_path]=$new_path"
  --form-string "body=$body"
)

[[ -n "$new_line" ]] && curl_args+=(--form-string "position[new_line]=$new_line")
[[ -n "$old_line" ]] && curl_args+=(--form-string "position[old_line]=$old_line")

curl "${curl_args[@]}" "https://gitlab.com/api/v4/projects/$project/merge_requests/$mr/discussions"
