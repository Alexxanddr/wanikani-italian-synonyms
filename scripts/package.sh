#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
version="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$project_dir/manifest.json")"
output_dir="$project_dir/dist"
archive="$output_dir/wanikani-italian-synonyms-v$version.zip"

mkdir -p "$output_dir"
cd "$project_dir"
zip -q -r "$archive" manifest.json content.js styles.css popup.html popup.css popup.js LICENSE
unzip -tq "$archive"
printf '%s\n' "$archive"
