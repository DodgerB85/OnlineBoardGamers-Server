/** Stable names for artwork promoted from tempAssets into static/URR/images. */
const STATIC_IMAGES = "/static/URR/images/"
const TERRAIN_FILES = ["terrain-hills.png", "terrain-forest.png", "terrain-savannah.png", "terrain-desert.png"]
const CITY_FILES = ["city-hills.png", "city-forest.png", "city-savannah.png", "city-desert.png"]
const STATE_FILES = ["akkad", "babylon", "elam", "persia", "sumer", "urartu"]
// The archived First Akkadians bitmap prints 40 SPL; the current rulebook specifies 35.
// Der and Calah also use references matching the current ownership and location rules.
const NATION_FILES = ["nation-ashur.png", "nation-barahshum.png", "nation-calah.svg", "nation-der.svg", "nation-eridu.png", "nation-first-akkadians.svg"]
const PLAYER_FILES = ["orange", "green", "teal", "brown", "purple", "pink"]

export function getAsset(name) { return STATIC_IMAGES + name }
export function getTerrainImage(type, isCity = false) { return getAsset((isCity ? CITY_FILES : TERRAIN_FILES)[type]) }
export function getStateTreasuryImage(state) { return getAsset(`state-treasury-${STATE_FILES[state]}.png`) }
export function getStateOrderImage(state) { return getAsset(`state-order-${STATE_FILES[state]}.png`) }
export function getNationCardImage(nation) { return getAsset(NATION_FILES[nation]) }
export function getWaterworkImage(state, capacity) { return getAsset(`waterwork-${STATE_FILES[state]}-${capacity === "M" ? "unlimited" : capacity}.png`) }
export function getPlayerMarkerImage(player) { return getAsset(`ownership-marker-${PLAYER_FILES[player]}.png`) }
export const mapImage = getAsset("ur-map.png")
export const landPriceTrackImage = getAsset("land-price-track.png")

// Rendered at 300 dpi from tempAssets/BGG/ur1830bc_redesign/cards_version1.pdf.
export function getEquipmentCardImage(era) { return getAsset(`equipment-era-${era}.png`) }
export const primogenitureImage = getAsset("primogeniture.png")
