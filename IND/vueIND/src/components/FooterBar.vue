<script setup>
/** This is just the footer that sits at the bottom of the page
 * 
 * 
 * 
 * 
 */

import * as view from "../js/INDview"

</script>

<template>
  <div id="footer">
    <div class="content">
      <img :src="view.getImage('INDbox')" class="cover" />
      <p>
        Indonesia is a board game by Jeroen Doumen and Joris Wiersinga, published by <a target='_blank'
          href='https://www.splottershop.com/'>Splotter Spellen</a>.
      </p>
      <p>Online Board Gamers implementation by DodgerB & Vraid. Permissions Provided. </p>
      <p>Menu icons from <a href="http://game-icons.net">game-icons.net</a></p>
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
  width: 100%;
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