#!/usr/bin/env bash
# Puts the round baifo.es badge on a video, high enough to clear a phone's story bar: add-badge.sh <in> [out]
# The VP9 decoder is named because the built-in one drops the transparency.
set -euo pipefail

INPUT="$1"
OUTPUT="${2:-${INPUT%.*}-baifo.mp4}"
BADGE="$(dirname "$(readlink -f "$0")")/baifo-badge.webm"
BADGE_WIDTH="${BADGE_WIDTH:-0.46}"     # share of the video's short side, shadow included
BOTTOM_MARGIN="${BOTTOM_MARGIN:-0.20}" # share of the height, portrait videos
WIDE_MARGIN=0.06                       # landscape videos sit mid-screen in a story, no bar over them
APPEAR_AT=0.15                         # seconds
if [ -n "${BADGE_AT:-}" ]; then # "x,y": the badge's center, as shares of the width and height
  BADGE_X="W*${BADGE_AT%,*}-w/2"
  BADGE_Y="H*${BADGE_AT#*,}-h/2"
else # landscape: a corner, people stand in the middle
  BADGE_X='if(gt(W\,H)\,W-w*1.02\,(W-w)/2)'
  BADGE_Y="H-h-H*if(gt(W\,H)\,$WIDE_MARGIN\,$BOTTOM_MARGIN)"
fi

ffmpeg -nostdin -loglevel error -y -i "$INPUT" -c:v libvpx-vp9 -stream_loop -1 -i "$BADGE" -filter_complex "
  [1:v][0:v]scale2ref=w=trunc(min(rw\,rh)*$BADGE_WIDTH/2)*2:h=ow[badge][video];
  [badge]format=rgba,fade=in:st=$APPEAR_AT:d=0.35:alpha=1[badge];
  [video][badge]overlay=x=$BADGE_X:y=$BADGE_Y+H*0.03*exp(-7*max(t-$APPEAR_AT\,0)):eval=frame:shortest=1,format=yuv420p[out]" \
  -map '[out]' -map 0:a? -c:v libx264 -preset medium -crf 18 -c:a copy -movflags +faststart "$OUTPUT"
echo "$OUTPUT"
