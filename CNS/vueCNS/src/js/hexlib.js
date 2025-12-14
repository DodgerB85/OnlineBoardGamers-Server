/**
 * Woo, this is your cool hex lib! :D
 * 
 * 
 * 
 */
import { useModelStore } from '../stores/CNSstore.js'

class Orientation {
	constructor(f0, f1, f2, f3, b0, b1, b2, b3, start_angle) {
		this.f0 = f0;
		this.f1 = f1;
		this.f2 = f2;
		this.f3 = f3;
		this.b0 = b0;
		this.b1 = b1;
		this.b2 = b2;
		this.b3 = b3;
		this.start_angle = start_angle;
	}
}

class Point {
	constructor(x, y) {
		return { x, y };
	}
}

class Hex {
	// Sets the co-ordinates of the hex, plus content
	constructor(q, r, s, color) {
		if (Math.round(q + r + s) !== 0) throw `q + r + s must be 0. They equal ${Math.round(q + r + s)}`;
		return { q: q, r: r, s: s };
	}
}

class Layout {
	constructor(orientation, size, origin) {
		this.orientation = orientation;
		this.size = size;
		this.origin = origin;
	}
	hexToPixel(h) {
		const store = useModelStore()

		var M = this.orientation;
		var size = new Point(store.refSize / store.canvasSize * 50, store.refSize / store.canvasSize * 50)

		var origin = this.origin;
		var x = (M.f0 * h.q + M.f1 * h.r) * size.x;
		var y = (M.f2 * h.q + M.f3 * h.r) * size.y;
		return new Point(x + origin.x, y + origin.y);
	}
	pixelToHex(p) {
		var M = this.orientation;
		var size = this.size;
		var origin = this.origin;
		var pt = new Point((p.x - origin.x) / size.x, (p.y - origin.y) / size.y);
		var q = M.b0 * pt.x + M.b1 * pt.y;
		var r = M.b2 * pt.x + M.b3 * pt.y;
		return new Hex(q, r, -q - r);
	}
	hexCornerOffset(corner) {
		var M = this.orientation;
		var size = this.size;
		var angle = (2.0 * Math.PI * (M.start_angle - corner)) / 6.0;
		return new Point(size.x * Math.cos(angle), size.y * Math.sin(angle));
	}
	polygonCorners(h) {
		var corners = [];
		var center = this.hexToPixel(h);
		for (var i = 0; i < 6; i++) {
			var offset = this.hexCornerOffset(i);
			corners.push(new Point(center.x + offset.x, center.y + offset.y));
		}
		return corners;
	}
}

Layout.pointy = new Orientation(
	Math.sqrt(3.0),
	Math.sqrt(3.0) / 2.0,
	0.0,
	3.0 / 2.0,
	Math.sqrt(3.0) / 3.0,
	-1.0 / 3.0,
	0.0,
	2.0 / 3.0,
	0.5
);
Layout.flat = new Orientation(
	3.0 / 2.0,
	0.0,
	Math.sqrt(3.0) / 2.0,
	Math.sqrt(3.0),
	2.0 / 3.0,
	0.0,
	-1.0 / 3.0,
	Math.sqrt(3.0) / 3.0,
	0.0
);

const l = new Layout(Layout.pointy, new Point(100, 100), new Point(0, 0));

export default {
	Layout: l,
	Hex,
	Point,
};
