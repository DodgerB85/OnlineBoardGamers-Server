<script setup>
/** This is just the footer that sits at the bottom of the page
 *
 *
 *
 *
 */

import * as view from '../js/AQYview'

</script>

<template>
	<div id="footer">
		<div class="content">
			<img :src="view.getImage('AQYbox')" class="cover" />
			<i18n-t keypath="footer.antiquityCredits" tag="p" scope="global">
				<template #publisher><a target="_blank" href="https://www.splottershop.com/">{{ $t("footer.splotterSpellen") }}</a></template>
			</i18n-t>
			<p>{{ $t("footer.implementationCredits") }}</p>
			<i18n-t keypath="footer.menuIcons" tag="p" scope="global">
				<template #link><a href="http://game-icons.net">{{ $t("footer.gameIconsNet") }}</a></template>
			</i18n-t>
		</div>
	</div>
</template>

<style scoped>
#footer {
	background-color: #333;
	color: #eee;
	margin: 0;
	min-height: 125px;
	height: fit-content;
	padding: 10px;
	min-width: 1310px;
	position: relative;
}

#footer .content {
	width: 95%;
	margin: auto;
	text-align: left;
	position: relative;
}

#footer img.cover {
	float: left;
	height: 100px;
	margin-right: 10px;
}

#footer a {
	color: #d4eafd;
}
</style>
