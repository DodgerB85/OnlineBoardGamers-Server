export function getImage(image) {
	// Icons
	if (image === "icon-house") return new URL(`../../../static/BUS/images/icon-house.svg`, import.meta.url).href
	else if (image === "icon-nextGame") return new URL(`../../../static/BUS/images/icon-nextGame.svg`, import.meta.url).href
	else if (image === "icon-rulebook") return new URL(`../../../static/BUS/images/icon-rulebook.svg`, import.meta.url).href
	//else if (image === "icon-info") return new URL(`../../../static/BUS/images/icon-info.svg`, import.meta.url).href
	else if (image === "icon-rewind") return new URL(`../../../static/BUS/images/icon-rewind.svg`, import.meta.url).href
	else if (image === "icon-chat") return new URL(`../../../static/BUS/images/icon-chat.svg`, import.meta.url).href
	else if (image === "icon-stop") return new URL(`../../../static/BUS/images/icon-stop.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/BUS/images/icon-notebook.svg`, import.meta.url).href
	else if (image === "icon-scroll") return new URL(`../../../static/BUS/images/icon-scroll.svg`, import.meta.url).href
	else if (image === "icon-replay") return new URL(`../../../static/BUS/images/icon-replay.svg`, import.meta.url).href
	else if (image === "icon-notebook") return new URL(`../../../static/BUS/images/icon-notebook.svg`, import.meta.url).href
	//else if (image === "icon-hand-card") return new URL(`../../../static/BUS/images/icon-hand-card.svg`, import.meta.url).href
	//else if (image === "icon-cog") return new URL(`../../../static/BUS/images/icon-cog.svg`, import.meta.url).href
	else if (image === "icon-board") return new URL(`../../../static/BUS/images/icon-board.svg`, import.meta.url).href
	// Other imports
	else if (image === "loading-bar-black") return new URL(`../../../static/BUS/images/loading-bar-black.gif`, import.meta.url).href
	//else if (image === "Busbox") return new URL(`../../../static/BUS/images/Busbox.jpg`, import.meta.url).href
	else if (image === "email") return new URL(`../../../static/BUS/images/email.png`, import.meta.url).href
	// Buildings
	if (image === "building1") return new URL(`../../../static/BUS/images/building1.png`, import.meta.url).href
	if (image === "building2") return new URL(`../../../static/BUS/images/building2.png`, import.meta.url).href
	if (image === "building3") return new URL(`../../../static/BUS/images/building3.png`, import.meta.url).href
	if (image === "passenger") return new URL(`../../../static/BUS/images/passenger.png`, import.meta.url).href

	if (image === "building1_orig") return new URL(`../../../static/BUS/images/building1_orig.jpg`, import.meta.url).href
	if (image === "building2_orig") return new URL(`../../../static/BUS/images/building2_orig.jpg`, import.meta.url).href
	if (image === "building3_orig") return new URL(`../../../static/BUS/images/building3_orig.jpg`, import.meta.url).href
	if (image === "passenger_orig") return new URL(`../../../static/BUS/images/passenger.png`, import.meta.url).href

	if (image === "bus0") return new URL(`../../../static/BUS/images/bus_blue.png`, import.meta.url).href
	if (image === "bus1") return new URL(`../../../static/BUS/images/bus_green.png`, import.meta.url).href
	if (image === "bus2") return new URL(`../../../static/BUS/images/bus_purple.png`, import.meta.url).href
	if (image === "bus3") return new URL(`../../../static/BUS/images/bus_red.png`, import.meta.url).href
	if (image === "bus4") return new URL(`../../../static/BUS/images/bus_yellow.png`, import.meta.url).href

	if (image === "rightActions") return new URL(`../../../static/BUS/images/rightActions.jpg`, import.meta.url).href
	if (image === "rightActions_orig") return new URL(`../../../static/BUS/images/rightActions_orig.jpg`, import.meta.url).href

	if (image === "stone_blue") return new URL(`../../../static/BUS/images/stone_blue.png`, import.meta.url).href
	if (image === "stone_green") return new URL(`../../../static/BUS/images/stone_green.png`, import.meta.url).href

	if (image === "bus-box-sm") return new URL(`../../../static/BUS/images/bus-box-sm.jpg`, import.meta.url).href
	if (image === "pointer") return new URL(`../../../static/BUS/images/pointer.png`, import.meta.url).href

	if (image === "Board_20A") return new URL(`../../../static/BUS/images/Board_20A.jpg`, import.meta.url).href
	if (image === "Board_orig") return new URL(`../../../static/BUS/images/Board_orig.jpg`, import.meta.url).href
	if (image === "Board_origV2") return new URL(`../../../static/BUS/images/Board_origV2.jpg`, import.meta.url).href
	if (image === "Board_20AC") return new URL(`../../../static/BUS/images/Board_20AC.jpg`, import.meta.url).href
}
