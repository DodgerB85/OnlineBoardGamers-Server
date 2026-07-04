<script setup>
/**
 * 
 * change 2e comp markers (and rec'd goods)
 *	
 *	
	fix kick turn skips - if operating multiple in a row

 */
/**
 * main app file. Initialise the store here
 *
 *
 */
import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import MapArea from "./components/MapArea.vue"
import ActionArea from "./components/ActionArea.vue"
import CompanysTable from "./components/CompanysTable.vue"
import PlayerTable from "./components/PlayerTable.vue"
import ReplayArea from "./components/ReplayArea.vue"

import DebugArea from "./components/DebugArea.vue"
import FooterBar from "./components/FooterBar.vue"
import HistoryTab from "./components/HistoryTab.vue"

import * as replay from "./js/INDreplay"
import * as IO from "./backend/IND_IO"
import * as view from "./js/INDview"
import * as map from "./js/INDmap"
import * as model from "./js/INDmodel"
//import * as WS from "./backend/INDwebsocket"
import * as rf from "./js/INDreference"
import * as rfm from "./js/INDmapData"
import * as funcs from "./js/INDfuncs"
//import * as controller from "./js/INDcontroller"

import { watchEffect } from "vue"

import { usePersonalStore } from "./stores/INDpersonal.js"
const personal = usePersonalStore()

import { useModelStore } from "./stores/INDstore.js"
const store = useModelStore()

// Check if we're in history-only mode
if (window.initData.historyOnly === true) {
	store.historyOnly = true
	store.topMenuViews.showHistory = true
}

watchEffect(() => {
	let backgroundColour = "floralwhite"
	if (store.topMenuViews.showReplay) backgroundColour = "lightgrey"
	else if (store.gameflow.phase === rf.PHASE_GAME_OVER) backgroundColour = "#d4eafd"
	else if (personal.canPlay()) backgroundColour = "#d4eafd"
	else if (!personal.canPlay() && personal.pov >= 0) backgroundColour = "floralwhite"
	// If it's mid game but you're not involved, should still be blue
	else backgroundColour = "#d4eafd"

	// Update the body background color directly
	document.body.style.backgroundColor = backgroundColour
})

//store.mapData.selectedMap = rf.OM_MAP_HEX
//store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.OM_MAP_HEX))

// Set IND options
let options = window.initData.preferredINDoptions
//INDoptions = ["indColour","mapType","citySizeColour","indOutline", "iconsToUse", "shipIconsToUse", "playerTableStyle"]
personal.preferredColour = options[0]
if (options.length >= 5) store.options.iconsToUse = options[4]
if (options.length >= 6) store.options.shipIconsToUse = options[5]
if (options.length >= 7) store.options.playerTableStyle = options[6]

// Check for custom map
if (window.initData.startingOptions.includes(2)) {
	store.mapData.selectedMap = rf.MAP_AEGEAN
	store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.AG_MAP))
} else if (window.initData.startingOptions.includes(3)) {
	store.mapData.selectedMap = rf.MAP_PHP
	store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.PHP_MAP))
	if (window.initData.startingOptions.includes(4)) store.useMergerSubsidy = true
	if (window.initData.startingOptions.includes(5)) store.useShippingSubsidy = true
	store.useShipRedeployment = true
}
// Otherwise original map
else {
	// 1e2e
	if (options[1] === 0) {
		store.mapData.selectedMap = rf.MAP_OM_1E2E
		store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.OM_MAP_1E2E))
		// Now adjust ship offsets for simple
		if (store.options.shipIconsToUse === 0) {
			store.mapData.selectedMapData.shipShadowOffset = 3
			store.mapData.selectedMapData.shipShadowOffsetHighlight = 4
		}
	}
	// 3e
	else if (options[1] === 4) {
		store.mapData.selectedMap = rf.MAP_OM_3E
		store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.OM_MAP_3E))
		// Now adjust ship offsets for simple
		if (store.options.shipIconsToUse === 0) {
			store.mapData.selectedMapData.shipShadowOffset = 3
			store.mapData.selectedMapData.shipShadowOffsetHighlight = 4
		}
	}
	// Hex
	else if (options[1] === 2) {
		store.mapData.selectedMap = rf.MAP_OM_HEXES
		store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.OM_MAP_HEX))
	}
}

// LEAVE HERE TO ENABLE EXTRA RnD FOR ALL MAPS
if (window.initData.startingOptions.includes(4)) store.useMergerSubsidy = true
if (window.initData.startingOptions.includes(5)) store.useShippingSubsidy = true

store.cityColourScheme = options[2]

store.topMenuViews.showTerrOutline = options[3] === 1
if (store.mapData.selectedMap === rf.MAP_PHP) store.topMenuViews.showTerrOutline = false

////// EDIT THIS FOR AG / NON AG
/*
store.mapData.selectedMap = rf.MAP_AEGEAN
store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.AG_MAP))
*/
////// END OF EDIT THIS

/** RUN THIS EVERY TIME TO INIT MAP */
let dataSet = null
if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
	dataSet = map.territoryNeighbors(rf.OM_TERRITORY_COUNT, rf.OM_NEIGHBOUR_PAIRS)
} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
	dataSet = map.territoryNeighbors(rf.AG_TERRITORY_COUNT, rf.AG_NEIGHBOUR_PAIRS)
} else if (store.mapData.selectedMap === rf.MAP_PHP) {
	dataSet = map.territoryNeighbors(rf.PH_TERRITORY_COUNT, rf.PHP_NEIGHBOUR_PAIRS, rf.PHP_ONE_WAY_NEIGHBOUR_PAIRS)
}
store.mapData.allNeighbours = dataSet.all
store.mapData.landNeighbours = dataSet.land
store.mapData.seaNeighbours = dataSet.sea
store.mapData.landWithExpansionRestrictionsNeighbours = dataSet.landWithExpansionRestrictionsNeighbours

model.initGame()

/* // 17 rice ships
let data = 
"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"
*/
/*
let data = 
"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"
*/
// AEGEAN SLOW SHIPPING DATA
/*
let ag_data = 
"H4sIAAAAAAAAA+1bWY9ct7H+L/NMAdwXv8XL9b0BssD2W6MfOpqONI40rfSM4jhB/ntq4VI8zW6NAhu4DwG09CnycClWfbWwzm63u3v/8Prt4R9vH++U+GmV08UrZ53a7ZzSyu7VzlplvbJB2QhPQStflMef3ilblM3KGWUTEtIe/nUqKBhDBfi9V0Vr+P/u69P9m+P5S5it/3IqGY2ddzuviso4lVPGKKNVUjgBDAt/8H2PC/Eah7fwRujDh0DEXUqweJjawdRecUfYDZOY6JFoYMWXVKfr29TFpEUXP01gqKM2nYbPoSgDj/gz5/7T+6mT7g0u1Z84VKCWff03EePh9ysDrI700+zrSjUeB264Ld3AqXneb+9SeKu2d8EjxRYiWOiRPE/GzzCPRoYbZjHM6/CRu0dozmpXVKqPWoVEb7tcu+DWDawAz6wSNMpMe/Y4RYQxCz3hEk0OePZwvAZYQcNEnBjWQSypv3FMjQuHd0vjAo7mggFhaWumPVnncQ4ttqHHNuojvaEGR3F3JubscH5j+hatA9GGtwzIeeybdEQbezTaB4Nz8TYNDgYNO9goHJKijcI7uEWnaYt231kAs5rGgsKrpBGcjh5VkJTA1EHKPJDBlY2hTMogdKC1MBaMQQtObcfwgmQpHi2cDY1icl0Q8bS4JKUCVpjMzE+z5icRPIoVQcQOZ9mD7pIe4/NeOT7EV6F1356HxVVjAypPlQI+CY17saEfQqJVuH4IxZZO4COwumhxCG7m3StxBqZYw2iHnLPMOR7EB3kG7vIM2ji4cZ8yKirioOUNrqTZ48ExI3AkwfoYNqw3wc+sdzdYTxSDL3SZRm2EgUNTEOQkigaoE/BnMDM7TXrrh0xHkH182VUuwRDBgmHY7eye9MH4ujCP67A2UiPtPTCrPC5AsMjQikxx108lDiYjXPjFKJoY7ft5BSPPixaxPS8cantehBXWITzpSVGsnRQFO5SqKNHJ0wKsnw4r5WJm/NSjQyD9ZBwjzcAR2cARQ+mXMZpRKdJKI5FfwVzGKp+HxhidclqcfWxnnwkvdl0OvDXYiGdYVBiQB32Q+aYfe6578F00gvYlSXBDdTGfPGsWGOwFe4D90DmFznmTbWqcr4CZEGp3mbSCKPyaLXvWF2PzEACbihn+iQlayADK900RMK6uWV/Kp3uhcM6vrtQc+G01H6HNcQgOCIo2s92NdpabMLTc45oQ62ymTrg2YDYLTm6/QVQY3knOgg5D0BKvaRf5f6MDixiJGopcfXb12dVnH/a8CpLAkFVOQwBDiCjMZNkn2EapQtnw0GUgjg54tobcg+72lJxyFVHCc93RhgEoZbSh1c6SPKVodK4SVZEhdIkA/8dJiUDYy0IqCr7p4Qk8Dkb2KrGAuSHvu3A7kmxSza1sW9PfpPkD65MQ008L3HjRqpQ2wmcQcnfsB79M/i5VReJbCH5oGZlyXOOEdviSlFrsXzxJrU90HvvqPYYUY2HX2DSfEgBDg/eAnjHPQj1jNuT2aUPuSe1prEenFRk2JL9AsLFx4Awd8hV/A9UhuQij+5hJrj0edgVS4pwzpJihaoRHkWQzClKq8LAZShoo6xiQLcWSuvA2iBFNY0pmHQBoMDGMQX2InkAVNgtm17iNWbbV8bFDNVBEUYq87m41YmFE/x5OMtjh7wRUeWDGQGJrETO9cDxdIcfFCSONZpismNl3GdRduI1N5NA4PN9gq1Q66ulRGgMEVYj5QiZRhHp0tlCe6fkKdE8UYLdxbmicNRER2xL0IyNV1SuTiIIBIUxr4rAsNjEMDPW3Jkzqj2opHQN+o0WV1zS5zqgo6mR1rYwZaopqhWMRBtvKw4jIyhSHkn7VKmTWK9IvcNb9dXfC5DJbBWE00NlEAfGM8cg6Y9l3oLPlh+FmI1Mjwi3OiZpi0BcPijGehSU7pSdT0iRZV0k2EubJacbBMJi2XcDR77fINt+DQngdxXvILfIan90QS0+oS2mEKgTEVVTVoGe8NA1M6xFXtpswqPUU45CkIXtS5psMmwXNTbrRITjoS51B7wwABsIo4fqYwBiAnEUlgYmDcJZpu6UdtRsTOPJfmnrgUAVDCjxPocYlaLeUwbF96zaSOXk5VqPvd12t40LN67kG1mo3tHpM+hLtz+Rj0FIcu6lNa4e2uiy1Fa0JH2UaE0qZmNRZb2xvaxPKbGxEKNzPltCkyRKC9qXMDk42bmgq2DzKCkgHLoekL5RV2iw0klk71j2SigScaeqn8bFFxsKRMxrBN+Wq5aWaJtYTejeVwMbJohBmJ1y0eJnm2AbVODqywghjVMjvQTexa2tBbR2hYSIICbOA9jydQdmJRki7I4fcskeu55NkIdEwDRh9CGuGiJJ/f10EBODG1ZA2LahCTthaDdngZzjbAfMc7NIZ6TZ7vFi6w1MSy3ZrtbqQS6Fil21JtEnrnCv9mhZOQCmVUahoWFCldXPBfAa0CGq13O1kXpnOFDRtu5YnbjpjJtCbnn07FzvOpm11oK6/QHy3QHzyHRZUK6jDigibQWOGuqmNbRi0ehLBDtrKu18h3UCeKsg8qcQgBGkTU2QUsmRDGv+sm/2FaGev2a5SRbbhGDIP9TgFhhQQ8xQqvIDCGX0tT4cjCK92CymYI8EcfhLhH6IMqPFAFE6gjlgvUKbJd0TxNs2Q4ic4CSZ/rvG7JZ0QUKX4iwroAJSlkG4pnxbQQV05NZjAvRDblWv/YrENZkP3gpdB32j0GJUoF4V7H2JmJFVrGzA4ocvSOuQldQXw0sdJ0Tt904ZUS/Fy+9FWLn2J3ElLkzK5JpXrsBx5A5AtXRZcOEE5rEyJXzil8UZbmtumU86LtmEoPunhrY3K0Dnp+wkqrg7DZSEjTpOL4JA5zZGviwTVhHipxJHVwHuudC2+ouug7NlvoyyjgMw4I+b1NMMVwKQrhozOu1ECLkyi2FXTunCpNXe73/fMLGqA2URVdWF0QAh4FU9H5ha1AX2nin4cSxUZOoGQ+F9cxKfc6BDvW151p6eJTAoSBWkrZLa3XVUWwEEMPKSwSLDmW+dFFDU9+xbizXh9SSuddulkCDfhP3U0ljhercAtDJ+01m3ocmkyvp04LRG9sXa6l8kCbD5P9+2wrGgKhv+5MbkCJsxFTApqbcsCA+ZdJHutIV5pKI3RdVUlq5LIvRnehpfOhojSU9H/iZ8xUV6NKzJjpBVchRRCGn59G7lySZeIapHvmQDV41WY9EE3iFrdyeVNBu43UXRZw1lXw1lOB+t21YBjJJlmdVSJQR4c8JtPT5V8JUd1JdSFA8TLVdsC2cj4D8fqR14qux7ZcqTrrK++brtbstrGXxtxp8drSGvsmv5CBG6Zk1vg3Lwds3IP4o3GFY4jGivjhV+oS/D/RfJfHMlTyGEN5gOHzYYicRhYHT+JVIKDG6QaLb8YUhHShFoaJuA5BrrpwHjUz1ISBrpDsOjCJcBz9ZHjehnpeddrMr6oXOIhggTePhEghtQBkS4msBUGtaMMyyQHg1INmKjWSiVQPt+OqzT0VgM5hHZkFu0WYrNPsaMUYawo4kK7iXmBGBlibcsYcuFbg1hEPT8CezK8plXgjAw/XkD4oorr6X26JQNUTqNiIDHkuw6izshgHphJqfB+MQMHjLAe2409cQ0ZJOJ9X7iTD8IcA6aiWHqUjNKCaGnZQeAhUDAiy51+nfCPrtS6a7x1ia8BdN2QS2uQbkjUoBi6ez+BN5sDPz+3ScwlvNyG6Fvg7m69uMB2ozD3KCAk0W37VWS/Bewd+G+Deqd5PQO9a7uurJ4ukwRsuyU1LKl2aTo+D/jbeU6gr2+Bvp5Bf21CRC5mZQw480q4SW41r68mbMixTKRumUoO7Nyum+d73Vgk/ylLMdLkV1r8tZbmGC194KlF2Jx8taXpXN2s0Rbv/oeFoToGspldjCnQxNLnZhjEOW4tziSFMveNg1CtdKqaMwcugINFRb52CK1CMExPfnoyVw0TFQDDPh2JWRCeOnlbmIJArQnduDh9kQHR4oaZamtdrSOqfOhJYj5zS/cjPU/sYzVAyHa8RYLDpRuSyJc7NQywuFRneWBfeBPIJBrbay5F8pqzKt7XZ8/P0bCnHy1nomNtj629loPEWNuT5efMN+SRzx/4zvUZyXH/5Ll/rvPnOn/O9TnzM4QfWlrToLHkSlyam0iWh0vnjbSoVACj6Xq+QRXVsjgVRSVrDvLCjaMseX1MVUJzSf5WOmdxJGHvekG36kOXNhrTb+QW1K1GiiuwNJSJYuoyG/Qk42ouUPl/aRymyOCWgZhNgTAQvfhgS8kbyouMg5z8wjhMjZ9hIGLLJQvsh//BaazFYAxc/tpN5kgxby4ylyVBty8txRI+lV+aqSK5RFkn0zk5Tlfmm+bUlB4NNSSKM0Xkbeh+u33w0j1PuZpiV0S/IprhuMo7xbSoQUmLWpNYLoUmNslqjnBQBZ13UcM1pyyGG+sWfuwUC+KLgb1ZvdIH9AZNaRXwmB9BXqEBih5vJLO+UelBJkiEdf1CFD9sSby5TTU2xhI2ZioNx0msn6xc0JShn4ycqKlfGTm8ewmRTRHutNdR1RNn6zOXUtF3Ipa/lmneFcgUW4XOaF/81YKqfbeFeBdKFR5oAVtKTIIj2xysLiKzaqqVMtZXik2V0lYAKhMrJdhKSdV2+Vbn60PtE5xnSoit+jxWSiyVkqrJNclzwS/EqnWc7Os4udT1lGqXsUqpUlKthNTaSsvpMBkQiwxFE38Q1Arih+nEcBkBq5ZukumMJER+UNC+es3pXdU+zinyBgV5IVN64F6Qsb5tTtHGXfNF7dzyQl/0xTZXN3htKLksobmw955LeBoCUNJy82ldDwfaTZvdPLcAx6/y6ZI4hdYUvCeBwgNuWhxMPB2wcyt6vpHWLItAdESuBKEb09SD54sPUzS5//LLxgF4w4SXLcWaDUWaBy+yuNJCTHRpJCSydkNx0RCuNbT1mnmKXDb0yr7J5DSaNDnNvLT3q1hszE01lPV6dQ6g6AKbGVVfknoggiTKV5LD1pyFKY6iNNKyUNCQk0ICo7WQzOm2p6CB2lNl/Q6AWlWAh3HqA5fF1wdK77EZbtX3vaA/mIm/fAh2uNSx6QBluMYEqdbY0oOVU1OFD6oPlySidmZFBQKq3XyS46tIdinN0t5Ea1hT0cKdkBcCrfKUbvhrXR7xRyTYDPIZZYpdAfbCUOV4Fk++H34jQVXbiss3lbzFb+sxlCzouzT0bW4dGJOCWALbyssrmT8LwdpZ14q8lSinbb0KmfJWGqtajYnqTmvrqOWcNla05PLCvjD6NGGs0xES9jKDRk7oJ/eBkQ29ybK8j7hHNbxtTCuEBC0jqbpH1tojqV+P/Ss5aIad5lW13uhtQITYHKq6Jvq0w/aXKcc8njRrRFcAVa/hyGkAJvU/9IEx/dyrf94dXj8/nB7vvgDa3fPxfH54Pp0fjk8/nP734c3bd/D3+e4L6Hyl7ct3H4+32r89H4+Ptzp8d7zn5g/n0/3vDue/HM8/3FjF64fnF5H7sE9vHz7wsJdvrdsWr/7f+8ObxaybDuttP709/fQ9dPzw8PjmN+fz4ee64o/n8/Hx+dvT6f63p4/nx2Ol//jxCVbwdDycX79tC3l/+PsfT09PXx+eD5VwPL85nr9/Pjx/fBJjPh3fHV8/f30+fbg//fT43e+/5lOtr999oVuX4/0358NXh/M9d2jEr07vPxwef/7h9JvXf/34cD7Ord+/Oz3/cPrDh+P58Fybzsf3h4dH2Ng3f4cXn0COeJbXh8ev3h4e3xy5N3SoQ9998efDu6fjGPR3tJMvH+6n1TH1j+cjNeBMB17R/cU4D4cP/3P48QFlBg7ou+P709+OvIaH55+/f/jH0Xx7Pv309F1b6dRmF21tDXgI578dJ0a9fXgCufz5D3/6ERn+r/2/ARiyv91TQQAA"
*/

//funcs.importModel(data, true)

/********************************* */

if (!IO.SUPER_USERS.includes(personal.name) && !IO.DEBUG_USERS.includes(personal.name) && personal.name !== "DodgerB") {
	window.addEventListener("contextmenu", (e) => {
		e.preventDefault()
		e.stopPropagation() // not necessary in my case, could leave in case stopImmediateProp isn't available?
		e.stopImmediatePropagation()
		return false
	})
}

document.addEventListener("keyup", function (event) {
	if (store.topMenuViews.showChat) return
	else if (event.key == "ArrowLeft") {
		// left arrow
		if (store.topMenuViews.showReplay) replay.performStep(-1)
	} else if (event.key == "ArrowRight") {
		// right arrow
		if (store.topMenuViews.showReplay) replay.performStep(1)
	}
})
function getWholeMiddleAreaClass() {
	if (store.topMenuViews.showReplay) return "greyBackground"
	if (personal.canPlay()) return "normalBackground"
	return "notYourTurnBackground"
}
</script>

<template>
	<svg id="patternsSVG">
		<defs>
			<!-- COMPANY DEEDS UNIFIED PHP -->
			<pattern id="ph_companycard_era_a_rice_southbicol" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_rice_southbicol')" />
			</pattern>
			<pattern id="ph_companycard_era_a_rice_westernvisayas" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_rice_westernvisayas')" />
			</pattern>
			<pattern id="ph_companycard_era_a_rice_zamboanga" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_rice_zamboanga')" />
			</pattern>
			<pattern id="ph_companycard_era_a_shipping_capitalregion" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_shipping_capitalregion')" />
			</pattern>
			<pattern id="ph_companycard_era_a_shipping_northbicol" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_shipping_northbicol')" />
			</pattern>
			<pattern id="ph_companycard_era_a_shipping_northcaraga" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_shipping_northcaraga')" />
			</pattern>
			<pattern id="ph_companycard_era_a_shipping_zamboanga" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_shipping_zamboanga')" />
			</pattern>
			<pattern id="ph_companycard_era_a_spice_cagayanvalley" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_spice_cagayanvalley')" />
			</pattern>
			<pattern id="ph_companycard_era_a_spice_centralluzon" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_spice_centralluzon')" />
			</pattern>
			<pattern id="ph_companycard_era_a_spice_southcaraga" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_a_spice_southcaraga')" />
			</pattern>
			<pattern id="ph_companycard_era_b_rice_calabarzon" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_rice_calabarzon')" />
			</pattern>
			<pattern id="ph_companycard_era_b_rice_mindanao" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_rice_mindanao')" />
			</pattern>
			<pattern id="ph_companycard_era_b_rubber_cordillera" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_rubber_cordillera')" />
			</pattern>
			<pattern id="ph_companycard_era_b_rubber_davao" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_rubber_davao')" />
			</pattern>
			<pattern id="ph_companycard_era_b_rubber_malaysia" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_rubber_malaysia')" />
			</pattern>
			<pattern id="ph_companycard_era_b_rubber_palawan" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_rubber_palawan')" />
			</pattern>
			<pattern id="ph_companycard_era_b_shipping_cordillera" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_shipping_cordillera')" />
			</pattern>
			<pattern id="ph_companycard_era_b_shipping_malaysiadavao" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_shipping_malaysiadavao')" />
			</pattern>
			<pattern id="ph_companycard_era_b_spice_bangsamoro" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_spice_bangsamoro')" />
			</pattern>
			<pattern id="ph_companycard_era_b_spice_centralvisayas" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_spice_centralvisayas')" />
			</pattern>
			<pattern id="ph_companycard_era_b_spice_leyte" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_spice_leyte')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_bangsamoro" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_bangsamoro')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_cagayanvalley" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_cagayanvalley')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_calabarzon" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_calabarzon')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_centralluzon" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_centralluzon')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_centralvisayas" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_centralvisayas')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_cordillera" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_cordillera')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_davao" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_davao')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_leyte" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_leyte')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_malaysia" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_malaysia')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_mindanao" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_mindanao')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_palawan" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_palawan')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_southbicol" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_southbicol')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_southcaraga" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_southcaraga')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_westernvisayas" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_westernvisayas')" />
			</pattern>
			<pattern id="ph_companycard_era_c_oil_zamboanga" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_oil_zamboanga')" />
			</pattern>
			<pattern id="ph_companycard_era_c_rubber_samar" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_rubber_samar')" />
			</pattern>
			<pattern id="ph_companycard_era_c_siapfaji_malaysia" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_siapfaji_malaysia')" />
			</pattern>
			<pattern id="ph_companycard_era_c_spice_quezon" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_spice_quezon')" />
			</pattern>
			<pattern id="ph_companycard_era_b_siapfaji_malaysia" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_b_siapfaji_malaysia')" />
			</pattern>
			<pattern id="ph_companycard_era_c_rice_soccsksargen" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ph_companycard_era_c_rice_soccsksargen')" />
			</pattern>

			<!-- COMPANY DEEDS ERA A -->
			<pattern v-for="(id, idx) in [0, 1, 2, 3, 4, 5, 6, 7]" :key="idx" :id="`c_comp_0${id}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`c_comp_0${id}`)" />
			</pattern>
			<pattern v-for="(id, idx) in ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']" :key="idx" :id="`ag_c_comp_${id}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`ag_c_comp_${id}`)" />
			</pattern>
			<!--
			<pattern v-for="(id, idx) in ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09']" :key="idx"
				:id="`ph_c_comp_${id}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`ph_c_comp_${id}`)" />
			</pattern>-->
			<!-- COMPANY DEEDS ERA B -->
			<pattern v-for="(id, idx) in [10, 11, 12, 13, 14, 15, 16, 17, 18]" :key="idx" :id="`c_comp_${id}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`c_comp_${id}`)" />
			</pattern>
			<pattern v-for="(id, idx) in [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]" :key="idx" :id="`ag_c_comp_${id}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`ag_c_comp_${id}`)" />
			</pattern>
			<!--
			<pattern v-for="(id, idx) in [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]" :key="idx"
				:id="`ph_c_comp_${id}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`ph_c_comp_${id}`)" />
			</pattern>-->
			<!-- COMPANY DEEDS ERA C -->
			<pattern v-for="(id, idx) in [20, 21, 22, 23, 24, 25, 26]" :key="idx" :id="`c_comp_${id}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`c_comp_${id}`)" />
			</pattern>
			<pattern v-for="(id, idx) in [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]" :key="idx" :id="`ag_c_comp_${id}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`ag_c_comp_${id}`)" />
			</pattern>
			<!--
			<pattern v-for="(id, idx) in [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]"
				:key="idx" :id="`ph_c_comp_${id}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`ph_c_comp_${id}`)" />
			</pattern>-->
			<!-- CITIES -->
			<pattern v-for="(size, idx) in [1, 2, 3]" :key="idx" :id="`city_${size}`" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage(`city_${size}`)" />
			</pattern>
			<!-- PRODUCTION MARKERS -->
			<pattern id="prod_marker_rice" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('prod_marker_rice')" />
			</pattern>
			<pattern id="prod_marker_spice" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('prod_marker_spice')" />
			</pattern>
			<pattern id="prod_marker_rubber" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('prod_marker_rubber')" />
			</pattern>
			<pattern id="prod_marker_oil" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('prod_marker_oil')" />
			</pattern>
			<pattern id="prod_marker_siap_faji" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('prod_marker_siap_faji')" />
			</pattern>

			<!-- SHIP MARKERS - DEBUG USE ONLY-->
			<pattern id="ship_pirate" height="100%" width="100%" patternContentUnits="objectBoundingBox">
				<image height="1" width="1" preserveAspectRatio="none" :href="view.getImage('ship_barque')" />
			</pattern>
			<!-- Define the filter for the black outline -->
			<filter id="f_black" x="-50%" y="-50%" width="200%" height="200%">
				<feComponentTransfer in="SourceAlpha">
					<feFuncA type="table" tableValues="0 1" />
				</feComponentTransfer>
				<feComponentTransfer>
					<feFuncA type="table" tableValues="0 1" />
				</feComponentTransfer>
			</filter>

			<filter id="f_yellow" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="yellow" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>

			<filter id="f_lightGreen" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="lightgreen" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>

			<filter id="f_red" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="red" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>
			<filter id="f_blue" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="blue" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>

			<filter id="f_col_0" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="#84C3E2" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>
			<filter id="f_col_1" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="#3E7139" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>
			<filter id="f_col_2" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="#D65A1E" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>
			<filter id="f_col_3" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="#92385C" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>

			<filter id="f_col_4" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="#ECC81C" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>

			<filter id="f_col_yellow" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="yellow" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>
			<filter id="f_col_blue" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="blue" />
				<feComposite in2="SourceAlpha" operator="in" />
			</filter>

			<!-- Pulsing yellow filter for ship markers during expansion -->
			<filter id="f_yellow_pulse" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="yellow">
					<animate attributeName="flood-opacity" values="0.1;1;0.1" dur="1s" repeatCount="indefinite" />
				</feFlood>
				<feComposite in2="SourceAlpha" operator="in" />
				<feGaussianBlur stdDeviation="3">
					<animate attributeName="stdDeviation" values="2;5;2" dur="1s" repeatCount="indefinite" />
				</feGaussianBlur>
			</filter>

			<!-- Pulsing green filter for prod markers in merger -->
			<filter id="f_green_pulse" x="-50%" y="-50%" width="200%" height="200%">
				<feFlood flood-color="lightgreen">
					<animate attributeName="flood-opacity" values="0.1;1;0.1" dur="0.75s" repeatCount="indefinite" />
				</feFlood>
				<feComposite in2="SourceAlpha" operator="in" />
				<feGaussianBlur stdDeviation="3">
					<animate attributeName="stdDeviation" values="2;5;2" dur="1s" repeatCount="indefinite" />
				</feGaussianBlur>
			</filter>
			<filter id="f_green_pulse_ship" x="-100%" y="-100%" width="300%" height="300%">
				<feFlood flood-color="lightgreen">
					<animate attributeName="flood-opacity" values="0.1;1;0.1" dur="0.75s" repeatCount="indefinite" />
				</feFlood>
				<feComposite in2="SourceAlpha" operator="in" />
				<!-- Increased stdDeviation values for a wider, softer glow -->
				<feGaussianBlur stdDeviation="8">
					<animate attributeName="stdDeviation" values="4;12;4" dur="1s" repeatCount="indefinite" />
				</feGaussianBlur>
			</filter>
		</defs>
	</svg>
	<TopMenu v-if="!store.historyOnly" />
	<div
		id="wholeMiddleArea"
		:class="getWholeMiddleAreaClass()"
		:style="{
			'min-width': (store.players.length === 2 ? '500' : '730') + 'px',
		}">
		<transition name="fadeMainArea">
			<div id="boardContainer" v-if="!store.topMenuViews.performingRewind">
				<!-- History-only mode: show only HistoryTab -->
				<template v-if="store.historyOnly">
					<div id="middle">
						<TopMenuViews />
						<HistoryTab />
					</div>
				</template>
				<!-- Normal mode: show full game interface -->
				<template v-else>
					<div id="middle">
						<TopMenuViews />
						<HistoryTab />

						<ReplayArea v-if="store.topMenuViews.generatingReplay || !store.topMenuViews.replayAtBottom" />
						<template v-if="!store.topMenuViews.generatingReplay">
							<div id="mainAreaLessHistory">
								<PlayerTable />
								<ActionArea />
								<div v-if="store.topMenuViews.showLoader" id="fLoadingBar">
									<img :src="view.getImage('loading-bar-black')" alt="loader" />
								</div>
								<transition name="fadeGameBoard">
									<div v-if="!store.topMenuViews.performingMapChange">
										<MapArea />
									</div>
								</transition>
								<ReplayArea v-if="store.topMenuViews.replayAtBottom" />
								<template v-if="IO.DEBUG_USERS.includes(personal.name)">
									<DebugArea />
									<CompanysTable />
								</template>
							</div>
						</template>
					</div>
				</template>
			</div>
		</transition>
	</div>

	<FooterBar v-if="!store.historyOnly" />
</template>

<style>
body {
	margin: 0px !important;
	/*background-color: #d4eafd;*/
	transition: background-color 1s ease-in-out;
	font-family: Arial, sans-serif;
	font-size: 16px;
}

#patternsSVG {
	height: 0px;
	margin: 0px;
	padding: 0px;
	position: absolute;
	top: 10px;
	left: 0px;
}

.fadeGameBoard-enter-active,
.fadeGameBoard-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeGameBoard-enter-from,
.fadeGameBoard-leave-to {
	opacity: 0;
}

#boardContainer {
	margin-top: 0px;
	margin-right: auto;
	margin-bottom: 0px;
	align-items: center;
	-webkit-transition: all 0.2s ease-in-out;
	-moz-transition: all 0.2s ease-in-out;
	-ms-transition: all 0.2s ease-in-out;
	-o-transition: all 0.2s ease-in-out;
	transition: all 0.2s ease-in-out;
}

.slideRight {
	margin: 0px auto 0px 460px !important;
	-webkit-transition: all 0.2s ease-in-out;
	-moz-transition: all 0.2s ease-in-out;
	-ms-transition: all 0.2s ease-in-out;
	-o-transition: all 0.2s ease-in-out;
	transition: all 0.2s ease-in-out;
}

#wholeMiddleArea {
	width: 100%;
	min-width: 1510px;
	text-align: center;
	min-height: 500px;
}

#mainAreaLessHistory {
	min-height: 100px;
	min-width: 1310px;
}

.greyBackground {
	background-color: lightgray;
	transition: background-color 1s ease-in-out;
}

.normalBackground {
	background-color: #d4eafd;
	transition: background-color 1s ease-in-out;
}

.fadeMainArea-enter-active,
.fadeMainArea-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeMainArea-enter-from,
.fadeMainArea-leave-to {
	opacity: 0;
}

#fLoadingBar {
	width: 100%;
	text-align: center;
}

/** UNSCOPED CSS */
.mainEntryPlayer {
	color: white;
	font-weight: bolder;
	padding: 2px;
	border: 1px solid black;
	margin-right: 3px;
	display: inline-block;
	margin-top: 1px;
}

.mainEntryPlayerNewTurn {
	color: white;
	font-weight: bolder;
	padding: 2px;
	display: inline-block;
	margin: 0px;
}

.mainEntryPlayer0 {
	background-color: #84c3e2;
	/* rgb(52, 116, 169) */
	color: black !important;
}

.mainEntryPlayer1 {
	background-color: #3e7139;
	/* rgb(161, 37, 41) */
}

.mainEntryPlayer2 {
	background-color: #d65a1e;
	/* rgb(246, 113, 18) */
}

.mainEntryPlayer3 {
	background-color: #92385c;
	/* rgb(128, 0, 128) */
}

.mainEntryPlayer4 {
	background-color: #ecc81c;
	/* rgb(236, 227, 52) */
	color: black !important;
}

.actionsLineButton {
	margin: 10px;
	width: fit-content;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 5px;
}

.actionsLineButton:hover {
	background-color: lightgrey;
}

.actionsLineButton:active {
	background-color: darkgrey;
}

.actionsLineSelect {
	margin: 10px;
	width: fit-content;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 5px;
}

.actionsLineSelect:hover {
	background-color: lightgrey;
}

.actionsLineSelect > option {
	background-color: white;
}
</style>
