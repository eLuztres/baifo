#!/usr/bin/env bash
# Weekly backup: encrypted database dump and new pictures, see docs/RESTAURAR.md.
# The repo is public and so are its Actions logs: only counts are printed, never links or names.
set -euo pipefail

: "${BACKUP_DATABASE_URL:?}" "${BACKUP_PASSPHRASE:?}"
DESTINATION="${BACKUP_DESTINATION:-baifo:Baifo Backups}"
DUMPS_TO_KEEP="${BACKUP_DUMPS_TO_KEEP:-12}"
# Must be at least the server's Postgres version; the restore uses this same image.
PG_IMAGE=postgres:18-alpine
PICTURE_LINK='https://(utfs\.io|[a-z0-9]+\.ufs\.sh)/f/[A-Za-z0-9._-]+'

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
dump="$work/$(date -u +%F)-baifo.dump"

docker run --rm --network host -e DATABASE_URL="$BACKUP_DATABASE_URL" "$PG_IMAGE" \
  sh -c 'pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL"' > "$dump"

gpg --batch --yes --quiet --pinentry-mode loopback --symmetric --cipher-algo AES256 --passphrase-fd 3 \
  --output "$dump.gpg" "$dump" 3<<<"$BACKUP_PASSPHRASE"
rclone copy -q "$dump.gpg" "$DESTINATION/Base de datos"
echo "Database: backed up, $(du -h "$dump.gpg" | cut -f1)"

rclone lsf "$DESTINATION/Base de datos" --files-only | sort -r | tail -n "+$((DUMPS_TO_KEEP + 1))" |
  while IFS= read -r old; do rclone deletefile -q "$DESTINATION/Base de datos/$old"; done

rclone copyto -q docs/RESTAURAR.md "$DESTINATION/LEEME - Cómo restaurar.md"

# Reading the links from the dump means a new picture column is never forgotten.
docker run --rm -i "$PG_IMAGE" pg_restore --data-only --file=- < "$dump" |
  grep -oE "$PICTURE_LINK" | sort -u > "$work/links"
rclone lsf "$DESTINATION/Imágenes" --files-only 2>/dev/null | sort > "$work/saved" || true
awk -F/ 'FILENAME == ARGV[1] { saved[$0]; next } !($NF in saved)' "$work/saved" "$work/links" > "$work/new"

export DESTINATION FAILED="$work/failed"
touch "$FAILED"
# A picture deleted from UploadThing stays linked in old records: it fails here, without failing the backup.
xargs -r -P 8 -I{} bash -c 'rclone copyurl -q "$1" "$DESTINATION/Imágenes/${1##*/}" 2>/dev/null || echo x >> "$FAILED"' _ {} < "$work/new"

new_count=$(wc -l < "$work/new")
failed_count=$(wc -l < "$FAILED")
echo "Pictures: $(wc -l < "$work/links") linked, $((new_count - failed_count)) newly saved, $failed_count not available"
rclone about "$DESTINATION" --json 2>/dev/null | grep -oE '"free": *[0-9]+' | awk '{ printf "Drive: %.1f GB free\n", $2 / 1e9 }' || true
# Most new pictures failing means the copy is broken, not that a few were deleted.
if [ $((failed_count * 2)) -gt "$new_count" ]; then
  echo "Too many pictures could not be saved" >&2
  exit 1
fi
