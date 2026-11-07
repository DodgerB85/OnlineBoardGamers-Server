import { Fragment, h } from "vue"
import { getAsset } from "../js/URRassets.js"

export const CurrencyIcon = {
	setup() {
		return () => h("img", {
			src: getAsset("icon-spl.svg"), alt: "SPL", title: "SPL",
			style: { width: "1em", height: "1em", display: "inline-block", verticalAlign: "-0.12em", objectFit: "contain", flexShrink: 0, margin: 0 },
		})
	},
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const INLINE_ICON_STYLE = { width: "1.1em", height: "1.1em", display: "inline-block", verticalAlign: "-0.2em", objectFit: "contain", flexShrink: 0, margin: "0 2px 0 0" }

export default {
	props: { text: { type: String, default: "" }, inlineIcons: { type: Object, default: () => ({}) } },
	setup(props) {
		return () => {
			const labels = Object.keys(props.inlineIcons).sort((a, b) => b.length - a.length)
			const iconPattern = labels.length ? new RegExp(`(${labels.map(escapeRegExp).join("|")})`, "g") : null
			const children = []
			for (const part of props.text.split(/(\S+[ \t]+SPL\b|\bSPL\b)/g)) {
				if (/\bSPL$/.test(part)) {
					children.push(h("span", { style: { whiteSpace: "nowrap" } }, [part.slice(0, -3), h(CurrencyIcon)]))
					continue
				}
				if (!iconPattern) {
					children.push(part)
					continue
				}
				for (const piece of part.split(iconPattern)) {
					const icon = props.inlineIcons[piece]
					if (icon) children.push(h("img", { src: icon.src, alt: icon.alt, title: icon.alt, style: INLINE_ICON_STYLE }))
					if (piece) children.push(piece)
				}
			}
			return h(Fragment, children)
		}
	},
}
