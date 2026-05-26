#!/usr/bin/env bash
set -euo pipefail

OUTPUT_FILE="${1:-CHECKSUMS.sha256}"

# Build checksums for tracked files only, excluding VCS metadata and this checksum file.
# Sorted for deterministic output.
mapfile -t files < <(
  git ls-files \
    | grep -v '^\.git/' \
    | grep -v '^sf-brew-edge/' \
    | grep -v "^${OUTPUT_FILE}$" \
    | LC_ALL=C sort
)

: > "$OUTPUT_FILE"
for file in "${files[@]}"; do
  sha256sum "$file" >> "$OUTPUT_FILE"
done

echo "Wrote ${#files[@]} checksums to $OUTPUT_FILE"
