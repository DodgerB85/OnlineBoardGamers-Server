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

export default {
	props: { text: { type: String, default: "" } },
	setup(props) {
		return () => h(Fragment, props.text.split(/(\S+[ \t]+SPL\b|\bSPL\b)/g).map((part) =>
			/\bSPL$/.test(part)
				? h("span", { style: { whiteSpace: "nowrap" } }, [part.slice(0, -3), h(CurrencyIcon)])
				: part
		))
	},
}
