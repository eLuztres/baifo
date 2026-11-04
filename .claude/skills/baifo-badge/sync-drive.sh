#!/usr/bin/env bash
# Uploads the badged clips to the shared Google Drive folder.
# copy, not sync: a file someone removed locally or added on Drive is never deleted there.
set -euo pipefail

rclone copy "$HOME/Videos/baifo-clips/with-badge" "InstaPosts:Baifo clips" --checksum --exclude '.*'
rclone check "$HOME/Videos/baifo-clips/with-badge" "InstaPosts:Baifo clips" --one-way --exclude '.*'
