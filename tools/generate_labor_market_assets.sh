#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-$REPO_DIR/../Image}"
WEB_IMAGE_DIR="$REPO_DIR/FCM/static/FCM/images"
LOBBY_IMAGE_DIR="$REPO_DIR/Lobby/static/Lobby/images/startingOptions"

declare -A ASSETS=(
	[management_trainee.png]="e_management_trainee_labor_market.png"
	[temporary_worker.png]="e_temporary_worker.png"
	[headhunter.png]="e_headhunter.png"
	[union_organizer.png]="e_union_organizer.png"
)

for source_name in "${!ASSETS[@]}"; do
	source_path="$SOURCE_DIR/$source_name"
	if [[ ! -f "$source_path" ]]; then
		echo "Missing Labor Market artwork: $source_path" >&2
		exit 1
	fi
	install -m 664 "$source_path" "$WEB_IMAGE_DIR/${ASSETS[$source_name]}"
done

logo_source="$SOURCE_DIR/labor_market_icon.png"
if [[ ! -f "$logo_source" ]]; then
	echo "Missing Labor Market logo: $logo_source" >&2
	exit 1
fi
install -m 664 "$logo_source" "$WEB_IMAGE_DIR/so_laborMarket.png"
install -m 664 "$logo_source" "$LOBBY_IMAGE_DIR/so_laborMarket.png"

outputs=(
	"$WEB_IMAGE_DIR/e_management_trainee_labor_market.png"
	"$WEB_IMAGE_DIR/e_temporary_worker.png"
	"$WEB_IMAGE_DIR/e_headhunter.png"
	"$WEB_IMAGE_DIR/e_union_organizer.png"
	"$WEB_IMAGE_DIR/so_laborMarket.png"
	"$LOBBY_IMAGE_DIR/so_laborMarket.png"
)

if command -v identify >/dev/null 2>&1; then
	identify "${outputs[@]}"
else
	stat --printf='%n %s bytes\n' "${outputs[@]}"
fi
