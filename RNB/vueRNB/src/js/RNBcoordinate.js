import * as util from "../js/RNButil"
import * as vec from "../js/RNBvector"
import * as rf from "../js/RNBreference"

export const RELATIVE = "relative"
export const ABSOLUTE = "absolute"

export function relative([side, x, y]) {
	return [RELATIVE, side, x, y]
}

export function absolute([x, y]) {
	return [ABSOLUTE, x, y]
}

export function rotateCoord(rotation) {
	return function (coord) {
		if (coord === null) return null
		const [type, ...rest] = coord
		if (type === RELATIVE) {
			const [side, x, y] = rest
			let newSide = (side + rotation) % 6
			while (newSide < 0) newSide += 6
			return [type, newSide, x, y]
		} else if (type === ABSOLUTE) {
			const [x, y] = rest
			const angle = (2 * Math.PI * rotation) / 6
			const newX = x * Math.cos(angle) - y * Math.sin(angle)
			const newY = x * Math.sin(angle) + y * Math.cos(angle)
			return [type, newX, newY]
		}
	}
}

export function toXY(scaling, [corners, sidePoints]) {
	function xvec(side) {
		let pts = sidePoints[side]
		return vec.subtract(pts[1], pts[0])
	}
	function yvec(side) {
		let pts = sidePoints[side]
		return vec.scaleBy(-0.5, vec.sum(pts[0], pts[1]))
	}
	const sides = util.indexArray(6)
	const xs = sides.map(xvec)
	const ys = sides.map(yvec)

	function transform([type, ...rest]) {
		if (type === RELATIVE) {
			const [side, x, y] = rest
			if (isNaN(side)) {
				rf.doAdminAlrt(`NaN side: ${side}, x: ${x}, y: ${y}`)
				return
			}
			return vec.scaleBy(scaling, vec.sum(corners[side], vec.sum(vec.scaleBy(x, xs[side]), vec.scaleBy(y, ys[side]))))
		} else if (type === ABSOLUTE) {
			const [x, y] = rest
			return [x, y]
		}
	}
	return transform
}
