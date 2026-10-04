<script setup>
import { getAsset } from "../js/URRassets"
</script>

<template>
	<div id="footer">
		<div class="content">
			<img :src="getAsset('ur-box.jpg')" class="cover" alt="UR: 1830 BC game box" />
			<p>
				UR: 1830 BC is a board game by Jeroen Doumen and Joris Wiersinga, published by
				<a target="_blank" href="https://www.splottershop.com/">Splotter Spellen</a>.
			</p>
			<p>Permissions provided. Menu icons from <a href="http://game-icons.net">game-icons.net</a></p>
		</div>
	</div>
</template>

<style scoped>
#footer {
	background-color: #333;
	color: #eee;
	margin: 0;
	min-height: 100px;
	height: fit-content;
	padding: 10px;
	position: relative;
}
#footer .content { width: 95%; margin: auto; text-align: left; position: relative; }
#footer img.cover { float: left; height: 90px; margin-right: 10px; }
#footer a { color: #d4eafd; }
</style>
