/** Stable names for artwork promoted from tempAssets into static/URR/images. */
const STATIC_IMAGES = "/static/URR/images/"
const TERRAIN_FILES = ["terrain-hills.png", "terrain-forest.png", "terrain-savannah.png", "terrain-desert.png"]
const STATE_FILES = ["akkad", "babylon", "elam", "persia", "sumer", "urartu"]
const NATION_FILES = ["ashur", "barahshum", "calah", "der", "eridu", "first-akkadians"]

export function getAsset(name) { return STATIC_IMAGES + name }
export function getTerrainImage(type) { return getAsset(TERRAIN_FILES[type]) }
export function getStateTreasuryImage(state) { return getAsset(`state-treasury-${STATE_FILES[state]}.png`) }
export function getNationCardImage(nation) { return getAsset(`nation-${NATION_FILES[nation]}.png`) }
export function getWaterworkImage(state, capacity) { return getAsset(`waterwork-${STATE_FILES[state]}-${capacity === "M" ? "unlimited" : capacity}.png`) }
export const mapImage = getAsset("ur-map.png")
export const landPriceTrackImage = getAsset("land-price-track.png")
