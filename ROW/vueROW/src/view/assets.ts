/**
 * Asset resolver. All ROW/ROW2 art and sounds live under ROW/static/ROW/images.
 *
 * Vite cannot statically rewrite a dynamic `new URL(\`...\${path}\`)`, so we use
 * the site's absolute static prefix. This matches the rest of the repo (other
 * games hardcode `/static/...` in their templates/JS). It resolves against the
 * page origin, so it works with Django serving static in both dev and prod.
 */
const STATIC_BASE = "/static/ROW/"

function asset(path: string): string {
	return STATIC_BASE + path
}

export function getImage(image: string): string {
	if (image === "icon-house") return asset("images/icon-house.svg")
	if (image === "icon-nextGame") return asset("images/icon-nextGame.svg")
	if (image === "icon-rulebook") return asset("images/icon-rulebook.svg")
	if (image === "icon-info") return asset("images/icon-info.svg")
	if (image === "icon-rewind") return asset("images/icon-rewind.svg")
	if (image === "icon-chat") return asset("images/icon-chat.svg")
	if (image === "icon-stop") return asset("images/icon-stop.svg")
	if (image === "icon-notebook") return asset("images/icon-notebook.svg")
	if (image === "icon-scroll") return asset("images/icon-scroll.svg")
	if (image === "icon-replay") return asset("images/icon-replay.svg")
	if (image === "resign") return asset("images/resign.jpg")
	return ""
}

export function editionImage(edition: "FIRST" | "SECOND", name: string): string {
	return asset(`images/row${edition === "SECOND" ? "2" : ""}/${name}`)
}

export function boardImage(edition: "FIRST" | "SECOND"): string {
	return editionImage(edition, "board.jpg")
}

export function buildingImage(edition: "FIRST" | "SECOND", building: string, color: string): string {
	return editionImage(edition, `buildings/${building}_${color.toLowerCase()}.jpg`)
}

export function cattleImage(type: string): string {
	return asset(`images/row/cards/${type.toLowerCase()}.jpg`)
}

export function workerImage(worker: string): string {
	return asset(`images/row/${worker.toLowerCase()}.jpg`)
}

export function teepeeImage(teepee: string): string {
	return asset(`images/row/teepee_${teepee.toLowerCase()}.jpg`)
}

export function hazardImage(type: string, hand: string): string {
	return asset(`images/row/${type.toLowerCase()}_${hand.toLowerCase()}.jpg`)
}

export function jobMarketTokenImage(): string {
	return asset("images/row/job_market_token.jpg")
}

const STATION_MASTER_IMAGES: Record<string, string> = {
	GAIN_2_DOLLARS_POINT_FOR_EACH_WORKER: "point_per_worker.jpg",
	REMOVE_HAZARD_OR_TEEPEE_POINTS_FOR_EACH_2_OBJECTIVE_CARDS: "points_per_2_objective_cards.jpg",
	PERM_CERT_POINTS_FOR_EACH_2_HAZARDS: "points_per_pair_hazards.jpg",
	PERM_CERT_POINTS_FOR_TEEPEE_PAIRS: "points_per_pair_teepees.jpg",
	PERM_CERT_POINTS_FOR_EACH_2_CERTS: "points_per_2_certs.jpg",
	TWO_PERM_CERTS: "sm/2_perm_certs.jpg",
	TWELVE_DOLLARS: "sm/12_dollars.jpg",
	PERM_CERT_POINTS_PER_2_STATIONS: "sm/points_per_2_stations.jpg",
	GAIN_2_CERTS_POINTS_PER_BUILDING: "sm/2_certs.jpg",
	PLACE_BRANCHLET_POINTS_PER_2_EXCHANGE_TOKENS: "sm/place_branchlet.jpg",
	GAIN_EXCHANGE_TOKEN_POINTS_PER_AREA: "sm/points_per_area.jpg",
	GAIN_5_DOLLARS_OR_TAKE_CATTLE_CARD: "mt/gain5_take3card.jpg",
	HIRE_WORKER_PLUS_2: "mt/hire_worker_plus2.jpg",
	REMOVE_2_CARDS: "mt/remove_2_cards.jpg",
	MOVE_ENGINE_3_FORWARD: "mt/move_engine_3.jpg",
	PLACE_BUILDING_FOR_FREE: "mt/place_building_free.jpg",
}

export function stationMasterImage(master: string): string {
	const file = STATION_MASTER_IMAGES[master]
	return file ? asset(`images/row/${file}`) : ""
}

export function soundFile(relative: string): string {
	return asset(`sounds/${relative}`)
}
