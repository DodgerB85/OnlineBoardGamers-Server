<script setup>
import * as view from "../js/FCMview"
import * as rf from "../js/FCMreference"
import * as plyr from "../js/FCMplayer"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/FCMpersonal.js"
const personal = usePersonalStore()

import { computed } from "vue"
const props = defineProps(["playerIndexProp"])

// Goods a marketer is advertising (campaign good, plus a second copy for
// radio campaigns when the First Radio Campaign milestone is held)
function marketerGoods(playerIndex, marketer) {
	const campaignObj = store.campaigns.find((obj) => obj.number === marketer.campaign)
	if (!campaignObj) return []
	const player = store.players[playerIndex]
	const goods = []
	if (campaignObj.duration === 9) {
		goods.push(campaignObj.good)
		if (plyr.hasMilestone(playerIndex, rf.FIRST_RADIO_CAMPAIGN) && rf.MARKETING_CAMPAIGNS[campaignObj.number].type === rf.RADIO) goods.push(campaignObj.good)
	} else {
		let secondGood = player.additionalMarketedGood?.[0] === campaignObj.number ? player.additionalMarketedGood[1] : -1
		if (secondGood === -1 && plyr.hasMilestone(playerIndex, rf.FIRST_RADIO_CAMPAIGN) && rf.MARKETING_CAMPAIGNS[campaignObj.number].type === rf.RADIO) secondGood = campaignObj.good
		goods.push(campaignObj.good)
		if (secondGood !== -1) goods.push(secondGood)
	}
	return goods
}

// Campaign image, using the double-good plane variant when 2 goods are marketed
function marketerCampaignImage(playerIndex, marketer) {
	let img = `marketing_campaign_${marketer.campaign}`
	if (marketerGoods(playerIndex, marketer).length === 2 && rf.MARKETING_CAMPAIGNS[marketer.campaign].type === rf.AIRPLANE) img += "a"
	return view.getImage(img)
}

// Count of each resource type the player holds
const resourceCounts = computed(() => {
	const player = store.players[props.playerIndexProp]
	if (!player) return {}
	const counts = {}
	for (const r of player.resources) counts[r] = (counts[r] || 0) + 1
	return counts
})
</script>

<template>
	<div v-if="playerIndexProp !== -1" class="playerDetailsDiv">
		<!-- MILESTONES -->
		<div class="playerMilestones">
			<template v-if="store.players[playerIndexProp].milestones.length > 0">
				<span class="fullMilestoneSpan" :class="rf.MILESTONES_STR[ms].type" v-for="(ms, idx) in store.players[playerIndexProp].milestones" :key="idx">
					<div class="milestoneTitle">{{ rf.MILESTONES_STR[ms].title.toUpperCase() }}</div>
					<div class="milestoneText">{{ rf.MILESTONES_STR[ms].description }}</div>
					<div class="milestoneSpacer">&nbsp;</div>
					<img class="milestoneIcon" :src="view.getImage(rf.MILESTONES_STR[ms].img)" :class="rf.MILESTONES_STR[ms].additionalClass ? rf.MILESTONES_STR[ms].additionalClass : ''" />
				</span>
			</template>
			<template v-else>{{ $t("playerDetails.noMilestones") }}</template>
		</div>

		<!-- PREVIEW ALL RESERVE CARDS -->
		<template v-if="store.bankBroken === 0 && plyr.hasMilestone(playerIndexProp, rf.FIRST_20_DOL) && (playerIndexProp === personal.pov || personal.trainingGame)">
			<div class="reserveCards">
				<p>{{ $t("playerDetails.reserveCards") }}</p>
				<div class="cardSummaryDiv" v-for="(num, idx) in store.reserveCards" :key="idx">
					<img class="cardImg" :src="view.getImage(view.getReserveCardImageKey(num))" />
				</div>
			</div>
		</template>

		<!-- CEO & RESERVE CARD & ITEMS -->
		<div class="playerDetailResourceDiv">
			<!-- CEO -->
			<div class="ceoCardWrapper">
				<div class="cardSummaryDiv">
					<img :src="view.getImage(`ceo_card_OG_${store.players[playerIndexProp].ceoSlots}`)" class="cardImg" />
					<div v-if="store.startingOptions.dumplings && store.players[playerIndexProp].ceoAction !== rf.CEO_ACTION_HIRE_1" class="ceoActionOverlay">
						<img :src="view.getImage('ceo_action_' + store.players[playerIndexProp].ceoAction)" />
					</div>
				</div>
				<div v-if="store.startingOptions.dumplings && store.players[playerIndexProp].ceoAction !== rf.CEO_ACTION_HIRE_1" class="ceoActionText">
					<span v-if="store.players[playerIndexProp].ceoAction === rf.CEO_ACTION_PRICE_MINUS_3">{{ $t("playerDetails.priceMinus3") }}</span>
					<span v-else-if="store.players[playerIndexProp].ceoAction === rf.CEO_ACTION_RECRUITING_MANAGER">{{ $t("employees.recruitingManagerDesc") }}</span>
					<span v-else-if="store.players[playerIndexProp].ceoAction === rf.CEO_ACTION_COACH">{{ $t("employees.coachDesc") }}</span>
				</div>
			</div>
			<!-- RESERVE CARD -->
			<template v-if="store.bankBroken !== 0 || (store.bankBroken === 0 && (personal.trainingGame || playerIndexProp === personal.pov))">
				<div v-if="store.reserveCards[playerIndexProp] !== -1" class="cardSummaryDiv">
					<img class="cardImg" :src="view.getImage(view.getReserveCardImageKey(store.reserveCards[playerIndexProp]))" />
				</div>
			</template>
			<!-- ITEMS -->
			<template v-if="store.players[playerIndexProp].resources.length > 0">
				<span class="resourceGroup" v-for="(count, good) in resourceCounts" :key="good">
					<span class="playerDetailResourceNumber">{{ count }}x</span>
					<img class="playerDetailResourceImage" :src="view.getImage(`item_${good}`)" :alt="good" />
				</span>
			</template>
		</div>

		<!-- MARKETEERS-->
		<template v-if="store.players[playerIndexProp].marketers.length > 0">
			<div class="marketers">
				<p>{{ $t("playerDetails.marketeers") }}</p>
				<template v-for="(marketer, idx) in store.players[playerIndexProp].marketers" :key="idx">
					<div class="item_marketing">
						<img :src="view.getImage(`emp_${marketer.marketer}`)" class="card" :class="['marketerImg', { bnw: idx === store.players[playerIndexProp].additionalCampaignArrayIndex }]" />
						<template v-if="marketer.marketer !== rf.MASS_MARKETEER">
							<div class="item_marketingCampaign">
								<img :src="marketerCampaignImage(playerIndexProp, marketer)" class="campaign" />
								<div class="item_marketingGoods">
									<img v-for="(g, gi) in marketerGoods(playerIndexProp, marketer)" :key="gi" :src="view.getImage(`item_${g}`)" :alt="g" />
								</div>
							</div>
						</template>
						<template v-if="marketer.nightShift">
							<img :src="view.getImage('so_nightShift')" class="NSMicon" />
						</template>
					</div>
				</template>
			</div>
		</template>

		<!-- BEACH -->
		<p>{{ $t("playerDetails.onTheBeach") }}</p>
		<template v-if="store.players[playerIndexProp].beach.length === 0">{{ $t("playerDetails.empty") }}</template>
		<template v-else>
			<div class="employeesLine">
				<div class="expandedEmployeeDiv" v-for="(emp, empIdx) in store.players[playerIndexProp].beach.filter((e) => e !== rf.BLANK_EMPLOYEE_SPACE)" :key="empIdx">
					<h3 class="expandedEmployeeTitle" :class="[rf.EMPLOYEES_STR[emp].type, { inverted: rf.EMPLOYEES_STR[emp].type === 'manager' || rf.EMPLOYEES_STR[emp].type === 'restaurant' }]">
						{{ rf.EMPLOYEES_STR[emp].title }}
					</h3>

					<div class="employeeDescriptionDiv">{{ rf.EMPLOYEES_STR[emp].description }}</div>

					<div class="employeeIconsDiv">
						<img v-if="rf.UNIQUE_CARDS.indexOf(emp) > -1" :src="view.getImage('icon1x')" class="iconsImg" />
						<img v-else-if="rf.HIREABLE_EMPLOYEES.indexOf(emp) > -1" :src="view.getImage('iconRecruit')" class="iconsImg" />
						<span v-else class="blankIcon">&nbsp;</span>
						<img v-if="rf.getRangeForEmployee(emp) === 8" :src="view.getImage('iconRangeInfinite')" class="iconsImg iconMiddle" />
						<img v-else-if="rf.getRangeForEmployee(emp) >= 1" :src="view.getImage('iconRange' + rf.getRangeForEmployee(emp))" class="iconsImg iconMiddle" :class="{ fixedHeight: rf.getRangeType(emp) === 'road' }" />
						<span v-else class="blankIcon iconMiddle">&nbsp;</span>
						<img v-if="rf.REQUIRE_SALARY.indexOf(emp) > -1" :src="view.getImage('iconSalary')" class="iconsImg" />
						<span v-else class="blankIcon">&nbsp;</span>
					</div>
				</div>
			</div>
		</template>

		<!-- EMPLOYEES -->
		<template v-if="store.players[playerIndexProp].employees.length > 0">
			<p>{{ $t("playerDetails.atWork") }}</p>
			<div class="employeesLine">
				<div class="expandedEmployeeDiv" v-for="(emp, empIdx) in store.players[playerIndexProp].employees.filter((e) => e !== rf.BLANK_EMPLOYEE_SPACE)" :key="empIdx">
					<h3 class="expandedEmployeeTitle" :class="[rf.EMPLOYEES_STR[emp].type, { inverted: rf.EMPLOYEES_STR[emp].type === 'manager' || rf.EMPLOYEES_STR[emp].type === 'restaurant' }]">
						{{ rf.EMPLOYEES_STR[emp].title }}
					</h3>

					<div class="employeeDescriptionDiv">{{ rf.EMPLOYEES_STR[emp].description }}</div>

					<div class="employeeIconsDiv">
						<img v-if="rf.UNIQUE_CARDS.indexOf(emp) > -1" :src="view.getImage('icon1x')" class="iconsImg" />
						<img v-else-if="rf.HIREABLE_EMPLOYEES.indexOf(emp) > -1" :src="view.getImage('iconRecruit')" class="iconsImg" />
						<span v-else class="blankIcon">&nbsp;</span>
						<img v-if="rf.getRangeForEmployee(emp) === 8" :src="view.getImage('iconRangeInfinite')" class="iconsImg iconMiddle" />
						<img v-else-if="rf.getRangeForEmployee(emp) >= 1" :src="view.getImage('iconRange' + rf.getRangeForEmployee(emp))" class="iconsImg iconMiddle" :class="{ fixedHeight: rf.getRangeType(emp) === 'road' }" />
						<span v-else class="blankIcon iconMiddle">&nbsp;</span>
						<img v-if="rf.REQUIRE_SALARY.indexOf(emp) > -1" :src="view.getImage('iconSalary')" class="iconsImg" />
						<span v-else class="blankIcon">&nbsp;</span>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped>
.playerDetailsDiv {
	border: 2px solid black;
	box-sizing: border-box;
	margin-top: -4px;
	background-color: lightblue;
	justify-content: center;
	width: 100%;
	padding: 5px 20px;
}

/** MS */
.playerMilestones {
	background-color: #94e2fa;
	border-radius: 5px;
	padding: 5px;
}
.fullMilestoneSpan {
	display: inline-block;
	width: 120px;
	height: 120px;
	margin: 10px;
	border-radius: 10px;
	position: relative;
	z-index: 1;
}

.milestoneTitle {
	height: 22px;
	margin: 2px;
	padding: 2px;
	font-family: gonzo;
	font-size: 11px;
	position: relative;
	z-index: 10;
}

.milestoneText {
	height: 70px;
	margin: 2px;
	padding: 2px;
	font-size: 13px;
	position: relative;
	z-index: 10;
}

.milestoneSpacer {
	height: 5px;
	font-size: 4px;
}

.milestoneIcon {
	position: absolute;
	width: 60px;
	bottom: -13px;
	right: -13px;
	z-index: 5;
}

.milestoneIcon.cart {
	bottom: 0;
	right: 0;
}

.milestoneIcon.billboard {
	bottom: -19px;
	width: 50px;
}

.milestoneIcon.vertical {
	width: 40px;
}

.milestoneIcon.house {
	width: 80px;
}

.milestoneIcon.higher {
	bottom: -5px;
}

.milestoneIcon.trainer {
	bottom: -15px;
}

.milestoneIcon.smaller {
	width: 50px;
}

.milestoneIcon.plane {
	width: 110px;
	bottom: -12px;
}

.cardSummaryDiv {
	border-radius: 10px;
	box-sizing: border-box;
	width: 75px;
	height: 111px;
	margin: 5px;
	display: inline-block;
	overflow: hidden;
	border: 2px solid black;
	position: relative;
}

.ceoCardWrapper {
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	vertical-align: top;
}

.ceoActionOverlay {
	position: absolute;
	bottom: 0;
	width: 100%;
	height: 27px;
}

.ceoActionOverlay img {
	width: 100%;
	height: 100%;
}

.ceoActionText {
	font-size: 11px;
	max-width: 85px;
	text-align: center;
}

.cardImg {
	width: 100%;
	height: 100%;
}

.resourceGroup {
	display: inline-flex;
	align-items: center;
	height: 111px;
	white-space: nowrap;
	margin-right: 3px;
	vertical-align: top;
	margin-top: 5px;
}

.resourceGroup .playerDetailResourceNumber {
	font-size: 35px;
	font-weight: bolder;
	vertical-align: middle;
}

.playerDetailResourceImage {
	width: auto !important;
	height: auto !important;
	max-width: 100px !important;
	max-height: 100px !important;
}

.resourceGroup img {
	height: 35px;
	vertical-align: middle;
}

.expandedEmployeeDiv {
	position: relative;
	z-index: 6;
	display: inline-block;
	width: 130px;
	height: 130px;
	background-color: #ffffff;
	border: #000 1px solid;
	border-radius: 5px;
	font-size: 13px;
	margin: 3px;
	padding: 0;
}

.expandedEmployeeTitle {
	margin: 0 0 3px 0;
	height: 35px;
	border-radius: 5px 5px 0 0;
}

.employeeDescriptionDiv {
	height: 70px;
	padding: 2px;
}

.blankIcon {
	width: 30px;
	display: inline-block;
}

.iconsImg {
	width: 30px;
}

.fixedHeight {
	height: 30px;
	width: 20px;
}

.iconMiddle {
	margin: 0 12px;
}

.inverted {
	color: white;
}

.marketers {
	text-align: center;
}

.marketers p {
	font-weight: bold;
}

.item_marketing {
	display: inline-block;
	position: relative;
	width: 100px;
	margin: 0 2px 5px;
	vertical-align: top;
}

.item_marketing img {
	width: 90px;
}

.item_marketing img.marketerImg {
	border-radius: 5px;
}

.item_marketingCampaign {
	position: absolute;
	top: 85px;
	left: 5px;
	width: 90px;
}

.item_marketing img.campaign {
	display: block;
	width: auto;
	max-width: 100%;
	max-height: 50px;
	margin: 0 auto;
}

.item_marketing img.NSMicon {
	position: absolute;
	top: 0px;
	left: 5px;
	width: 30px;
	height: 30px;
}

.item_marketingGoods {
	position: absolute;
	inset: 0;
	margin: auto;
	width: fit-content;
	height: fit-content;
	display: flex;
	align-items: center;
	justify-content: center;
}

.item_marketingGoods img {
	height: 25px;
	width: auto;
	margin: 0 1px;
}

img.bnw {
	filter: grayscale(100%);
}
</style>
