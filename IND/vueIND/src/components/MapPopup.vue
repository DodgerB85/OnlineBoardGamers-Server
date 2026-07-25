<script setup>
import * as rf from "../js/INDreference.js"
import * as model from "../js/INDmodel.js"
import * as map from "../js/INDmap.js"
import * as view from "../js/INDview.js"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/INDpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"

const props = defineProps({
	mapPopupProp: {
		type: Object,
		required: true,
		default: () => ({
			popupObjectType: -1,
			svgX: 0,
			svgY: 0,
			popupObjectData: {},
			wholeSVGheight: 0,
		}),
		prop: "mapPopupProp",
	},
})

const computedPopupData = computed(() => {
    const { popupObjectType, svgX, svgY, popupObjectData } = props.mapPopupProp;

    if (popupObjectType === -1) return { left: 0, top: 0, popupHTML: "" };

    let popupHTML = "";

	if (popupObjectType === -1) return ""

	// Avail Comp
	if (popupObjectType === 0) {
		let company 
		if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
			company = rf.ALL_COMPANIES.find((comp) => comp.id === popupObjectData[0])
			popupHTML = `<strong>${rf.OM_PROVINCE_STRINGS[company.province]}<br/>${company.typeText}${getShippingExtraHTML(company)}`
		}
		else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
			company = rf.AG_ALL_COMPANIES.find((comp) => comp.id === popupObjectData[0])
			popupHTML = `<strong>${rf.AG_PROVINCE_STRINGS[company.province]}<br/>${company.typeText}${getShippingExtraHTML(company)}`
		}
		else if (store.mapData.selectedMap === rf.MAP_PHP) {
			company = rf.PH_ALL_COMPANIES.find((comp) => comp.id === popupObjectData[0])
			popupHTML = `<strong>${rf.PHP_PROVINCE_STRINGS[company.province]}<br/>${company.typeText}${getShippingExtraHTML(company)}`
		}
		if (rf.LAND_COMPANIES.includes(company.type)) popupHTML += `<br/>Value: ${company.goodValue}`
		popupHTML += "</strong>"
	}
	// City
	else if (popupObjectType === 1) {
		let city = popupObjectData[0]
		if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) popupHTML = `<strong>${rf.OM_PROVINCE_STRINGS[map.getProvinceFromTerrID(city.territory)]}<br/>Size: ${city.size}${getCityReceivedGoodsExtraHTML(city)}</strong>`
		else if (store.mapData.selectedMap === rf.MAP_AEGEAN) popupHTML = `<strong>${rf.AG_PROVINCE_STRINGS[map.getProvinceFromTerrID(city.territory)]}<br/>Size: ${city.size}${getCityReceivedGoodsExtraHTML(city)}</strong>`
		else if (store.mapData.selectedMap === rf.MAP_PHP) popupHTML = `<strong>${rf.PHP_PROVINCE_STRINGS[map.getProvinceFromTerrID(city.territory)]}<br/>Size: ${city.size}${getCityReceivedGoodsExtraHTML(city)}</strong>`
	}
	// Prod Marker
	else if (popupObjectType === 2) {
		let company = popupObjectData[0]
		popupHTML = `<strong>${getMainPlayerHTML(company.ownerIndex)}<br/>${company.typeText}<br>Slot: ${model.getSlotIDXfromCompanyID(company.id) + 1}<br/>Value: ${company.goodValue}</strong>`
	}
	// Ship Marker
	else if (popupObjectType === 3) {
		// popupObjectData = [x, y, shipGfx, company.id, terrID, l, company.ownerIndex]
		let company = store.activeCompanies.find((comp) => comp.id === popupObjectData[3])
		popupHTML = `<strong>${getMainPlayerHTML(company.ownerIndex)}<br>Slot: ${model.getSlotIDXfromCompanyID(company.id) + 1}<br/>Hull: ${company.hullCapacity}`
		if (store.gameflow.phase === rf.PHASE_OPERATIONS) popupHTML += `<br/>Used: ${view.getRemainingHullText(popupObjectData[3], popupObjectData[4], popupObjectData[5])}`
		popupHTML += `</strong>`
	}

    return {
        left: svgX, // This is already in pixels now
        top: svgY + 10, // Just add a small buffer 10px
        popupHTML: popupHTML,
    };
})

function getShippingExtraHTML(company) {
	if (rf.LAND_COMPANIES.includes(company.type)) return ""
	let shippingExtraHTML = "<br/>"
	shippingExtraHTML += store.gameflow.currentEra === rf.ERA_A ? "<span style='background-color: yellow;'>" : "<span>"
	if (company.capacity[0] === 0) shippingExtraHTML += "-"
	else shippingExtraHTML += company.capacity[0]
	shippingExtraHTML += "</span> "
	shippingExtraHTML += store.gameflow.currentEra === rf.ERA_B ? "<span style='background-color: yellow;'>" : "<span>"
	if (company.capacity[1] === 0) shippingExtraHTML += "-"
	else shippingExtraHTML += company.capacity[1]
	shippingExtraHTML += "</span> "
	shippingExtraHTML += store.gameflow.currentEra === rf.ERA_C ? "<span style='background-color: yellow;'>" : "<span>"
	shippingExtraHTML += company.capacity[2] + "</span>"
	return shippingExtraHTML
}

function getCityReceivedGoodsExtraHTML(city) {
	if (store.gameflow.phase !== rf.PHASE_OPERATIONS) return ""
	let riceCount = city.receivedGoods.filter((good) => good === rf.GOOD_RICE).length
	let spiceCount = city.receivedGoods.filter((good) => good === rf.GOOD_SPICE).length
	let rubberCount = city.receivedGoods.filter((good) => good === rf.GOOD_RUBBER).length
	let siapCount = city.receivedGoods.filter((good) => good === rf.GOOD_SIAP_FAJI).length
	let oilCount = city.receivedGoods.filter((good) => good === rf.GOOD_OIL).length

	let showRice = store.activeCompanies.some((comp) => comp.good === rf.GOOD_RICE)
	let showSpice = store.activeCompanies.some((comp) => comp.good === rf.GOOD_SPICE)
	let showRubber = store.activeCompanies.some((comp) => comp.good === rf.GOOD_RUBBER)
	let showSiap = store.activeCompanies.some((comp) => comp.good === rf.GOOD_SIAP_FAJI)
	let showOil = store.activeCompanies.some((comp) => comp.good === rf.GOOD_OIL)

	let extraHTML = "<br/>"
	// RICE
	if (showRice) {
		for (let i = 0; i < riceCount; i++) extraHTML += `<div class='popCityDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_RICE)}"></div>`
		for (let i = 0; i < city.size - riceCount; i++) extraHTML += `<div class='popCityDeliveredDiv popCityNotDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_RICE)}"></div>`
		extraHTML += riceCount === city.size ? "<span style='color: red;'>" : ""
		extraHTML += "Rice:" + riceCount + "<br/>"
		extraHTML += "</span>"
	}

	// SPICE
	if (showSpice) {
		for (let i = 0; i < spiceCount; i++) extraHTML += `<div class='popCityDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_SPICE)}"></div>`
		for (let i = 0; i < city.size - spiceCount; i++) extraHTML += `<div class='popCityDeliveredDiv popCityNotDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_SPICE)}"></div>`
		extraHTML += spiceCount === city.size ? "<span style='color: red;'>" : ""
		extraHTML += "Spice:" + spiceCount + "<br/>"
		extraHTML += "</span>"
		if (store.gameflow.currentEra === rf.ERA_A) return extraHTML
	}

	// RUBBER
	if (showRubber) {
		for (let i = 0; i < rubberCount; i++) extraHTML += `<div class='popCityDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_RUBBER)}"></div>`
		for (let i = 0; i < city.size - rubberCount; i++) extraHTML += `<div class='popCityDeliveredDiv popCityNotDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_RUBBER)}"></div>`
		extraHTML += rubberCount === city.size ? "<span style='color: red;'>" : ""
		extraHTML += "Rubber:" + rubberCount + "<br/>"
		extraHTML += "</span>"
	}

	// SIAP FAJI
	if (showSiap) {
		for (let i = 0; i < siapCount; i++) extraHTML += `<div class='popCityDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_SIAP_FAJI)}"></div>`
		for (let i = 0; i < city.size - siapCount; i++) extraHTML += `<div class='popCityDeliveredDiv popCityNotDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_SIAP_FAJI)}"></div>`
		extraHTML += siapCount === city.size ? "<span style='color: red;'>" : ""
		extraHTML += "Siap Saji:" + siapCount + "<br/>"
		extraHTML += "</span>"
		if (store.gameflow.currentEra === rf.ERA_B) return extraHTML
	}

	// OIL
	if (showOil) {
		for (let i = 0; i < oilCount; i++) extraHTML += `<div class='popCityDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_OIL)}"></div>`
		for (let i = 0; i < city.size - oilCount; i++) extraHTML += `<div class='popCityDeliveredDiv popCityNotDeliveredDiv' style="background-color: ${view.getGoodColour(rf.GOOD_OIL)}"></div>`
		extraHTML += oilCount === city.size ? "<span style='color: red;'>" : ""
		extraHTML += "Oil:" + oilCount + "<br/>"
		extraHTML += "</span>"
	}
	return extraHTML
}

function getMainPlayerHTML(playerIndex) {
	return `<span class="mainEntryPlayer mainEntryPlayer${personal.getCorrectedColour(store.players[playerIndex].colour)}">${store.players[playerIndex].displayName}</span>`
}
</script>

<template>
	<div v-if="mapPopupProp.popupObjectType !== -1" class="infoPopup" :style="{ left: computedPopupData.left + 'px', top: computedPopupData.top + 'px' }" v-html="computedPopupData.popupHTML"></div>
</template>

<style scoped>
.infoPopup {
    position: absolute;
    background-color: #eee9e6;
    border: 1px solid black;
    padding: 5px;
    pointer-events: none; /* Prevents flickering if mouse hits popup */
    z-index: 1000;
    transform: translateX(-50%); /* Centers the popup on svgX */
    white-space: nowrap; /* Prevents text wrapping awkwardly */
}

:deep(.popCityDeliveredDiv) {
	display: inline-block;
	border: 1px solid black;
	width: 12px;
	height: 12px;
	margin-right: 5px;
	vertical-align: middle;
}
:deep(.popCityNotDeliveredDiv) {
	opacity: 0.3;
}
</style>
