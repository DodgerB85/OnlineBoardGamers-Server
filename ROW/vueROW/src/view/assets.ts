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

export function soundFile(relative: string): string {
	return asset(`sounds/${relative}`)
}
