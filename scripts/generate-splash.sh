#!/bin/zsh
# Regenerates the iOS PWA launch screens in public/splash/ by screenshotting
# scripts/splash/splash.html with headless Chrome at each device resolution.
# The device list must stay in sync with SPLASH_DEVICES in app/layout.tsx.
# Colors mirror the biarritz theme (app/globals.css): bg + faint text, both modes.
set -e
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=public/splash
mkdir -p "$OUT"

# CSS width, CSS height, device pixel ratio
sizes=(
  "440 956 3" "430 932 3" "428 926 3" "414 896 3" "414 896 2"
  "402 874 3" "393 852 3" "390 844 3" "375 812 3" "375 667 2"
)

for mode in dark light; do
  if [ $mode = dark ]; then bg="%23090a0c"; fg="%235a625e"; else bg="%23f3f5f4"; fg="%2399a29e"; fi
  for s in $sizes; do
    read -r w h dpr <<< "$s"
    pw=$((w*dpr)); ph=$((h*dpr)); px=$((24*dpr))
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
      --window-size=$pw,$ph --virtual-time-budget=8000 \
      --screenshot="$OUT/splash-${pw}x${ph}-${mode}.png" \
      "file://$PWD/scripts/splash/splash.html?bg=$bg&fg=$fg&px=$px" >/dev/null 2>&1
    echo "splash-${pw}x${ph}-${mode}.png"
  done
done
