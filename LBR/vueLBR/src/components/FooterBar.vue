<script setup>
const cover = "/static/LBR/images/lbr_icon.png";
</script>

<template>
	<div id="footer">
		<div class="content">
			<img :src="cover" class="cover" alt="Land Between Rivers" />
			<p>Land Between Rivers is based on <i>Tigris &amp; Euphrates</i>, designed by Reiner Knizia.</p>
			<p>Online Board Gamers implementation by Mihai &amp; DodgerB. Board and piece artwork by Mihai.</p>
			<p>Menu icons and tile symbols from <a href="http://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> (Lorc and Delapouite, CC BY 3.0).</p>
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
	position: relative;
	flex-shrink: 0;
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
