/** Display-only coordinates for the printed UR board.
 *
 * The rules board will eventually provide stable area IDs and exact display
 * coordinates. Until then, these hexes make the supplied board artwork
 * inspectable and provide a safe surface for local route previews.
 */
export const MAP_WIDTH = 1216
export const MAP_HEIGHT = 986

const ROWS = [
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
	[141, 239, 337, 435, 533, 631, 729, 827, 925, 1023],
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
	[141, 239, 337, 435, 533, 631, 729, 827, 925, 1023],
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
	[141, 239, 337, 435, 533, 631, 729, 827, 925, 1023],
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
	[141, 239, 337, 435, 533, 631, 729, 827, 925, 1023],
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
]

// The artwork has nine rows spaced 89 pixels apart; a smaller pitch
// accumulates a visible offset towards the bottom of the board.
export const PRINTED_HEXES = ROWS.flatMap((xs, row) => xs.map((x, column) => ({ id: `printed-${row}-${column}`, x, y: 134 + row * 89 })))

export function hexPoints(x, y) {
	return `${x - 49},${y - 28} ${x},${y - 56} ${x + 49},${y - 28} ${x + 49},${y + 28} ${x},${y + 56} ${x - 49},${y + 28}`
}

export function getAreaPosition(area) {
	if (!area?.display || !Number.isFinite(area.display.x) || !Number.isFinite(area.display.y)) return null
	return area.display
}
