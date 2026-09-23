<script setup>
import * as view from "../../js/FCMview"
import * as rf from "../../js/FCMreference"
import { ref } from "vue"

const props = defineProps({
	type: { type: String, required: true },
	employeeId: { type: Number, default: -1 },
	milestoneId: { type: Number, default: -1 },
})

const show = ref(false)
</script>

<template>
	<span class="infoPopupWrapper" @mouseenter="show = true" @mouseleave="show = false">
		<slot />
		<div v-if="show" class="infoPopup">
			<!-- Employee card -->
			<div v-if="type === 'employee' && employeeId > -1" class="expandedEmployeeDiv">
				<h3 class="expandedEmployeeTitle" :class="[rf.EMPLOYEES_STR[employeeId].type, { inverted: rf.EMPLOYEES_STR[employeeId].type === 'manager' || rf.EMPLOYEES_STR[employeeId].type === 'restaurant' }]">
					{{ rf.EMPLOYEES_STR[employeeId].title }}
				</h3>
				<div class="employeeDescriptionDiv">{{ rf.EMPLOYEES_STR[employeeId].description }}</div>
				<div class="employeeIconsDiv">
					<img v-if="rf.UNIQUE_CARDS.indexOf(employeeId) > -1" :src="view.getImage('icon1x')" class="iconsImg" />
					<img v-else-if="rf.HIREABLE_EMPLOYEES.indexOf(employeeId) > -1" :src="view.getImage('iconRecruit')" class="iconsImg" />
					<span v-else class="blankIcon">&nbsp;</span>
					<img v-if="rf.getRangeForEmployee(employeeId) === 8" :src="view.getImage('iconRangeInfinite')" class="iconsImg iconMiddle" />
					<img v-else-if="rf.getRangeForEmployee(employeeId) >= 1" :src="view.getImage('iconRange' + rf.getRangeForEmployee(employeeId))" class="iconsImg iconMiddle" :class="{ fixedHeight: rf.getRangeType(employeeId) === 'road' }" />
					<span v-else class="blankIcon iconMiddle">&nbsp;</span>
					<img v-if="rf.REQUIRE_SALARY.indexOf(employeeId) > -1" :src="view.getImage('iconSalary')" class="iconsImg" />
					<span v-else class="blankIcon">&nbsp;</span>
				</div>
			</div>

			<!-- Milestone card -->
			<div v-else-if="type === 'milestone' && milestoneId > -1" class="fullMilestoneSpan" :class="rf.MILESTONES_STR[milestoneId].type">
				<div class="milestoneTitle">{{ rf.MILESTONES_STR[milestoneId].title.toUpperCase() }}</div>
				<div class="milestoneText">{{ rf.MILESTONES_STR[milestoneId].description }}</div>
				<div class="milestoneSpacer">&nbsp;</div>
				<img class="milestoneIcon" :src="view.getImage(rf.MILESTONES_STR[milestoneId].img)" :class="rf.MILESTONES_STR[milestoneId].additionalClass ? rf.MILESTONES_STR[milestoneId].additionalClass : ''" />
			</div>
		</div>
	</span>
</template>

<style scoped>
.infoPopupWrapper {
	position: relative;
	display: inline-block;
}

.infoPopup {
	position: absolute;
	top: 100%;
	left: 0;
	z-index: 9999;
	margin-top: 4px;
	pointer-events: none;
}

/* Employee card */
.expandedEmployeeDiv {
	display: inline-block;
	width: 130px;
	height: 130px;
	background-color: #ffffff;
	border: #000 1px solid;
	border-radius: 5px;
	font-size: 13px;
	position: relative;
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

.employeeIconsDiv {
	text-align: center;
}

.blankIcon {
	width: 30px;
	display: inline-block;
}

.iconsImg {
	width: 30px;
}

.iconMiddle {
	margin: 0 12px;
}

.fixedHeight {
	width: 20px;
	height: 30px;
}

.inverted {
	color: #fff;
}

/* Employee type colours */
.pricing { background-color: #f8a48c; }
.hiring { background-color: #beb6b4; }
.food { background-color: #8fa960; }
.drink { background-color: #a4cf8a; }
.restaurant { background-color: #b8312d; }
.manager { background-color: #241e20; }
.marketer { background-color: #87c2c8; }
.waitress { background-color: #b492c4; }
.delivery { background-color: #e98d2a; }

/* Milestone card */
.fullMilestoneSpan {
	display: inline-block;
	width: 120px;
	height: 120px;
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
</style>
