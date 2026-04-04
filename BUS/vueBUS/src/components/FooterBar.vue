<script setup>
import * as view from '../js/BUSview.js'
</script>

<template>
  <div id="footer">
    <div class="content">
      <img :src="view.getImage('bus-box-sm')" class="cover" />
      <p>
        Bus is a board game by Jeroen Doumen and Joris Wiersinga, published by <a target='_blank'
          href='https://www.splottershop.com/'>Splotter Spellen</a>.
        20th anniversary edition art used with permission, published by <a target='_blank'
          href='https://capstone-games.com/'>Capstone Games</a>.
      </p>
      <p>Online Board Gamers implementation by DodgerB. Permissions Provided. 20th Anniversary Board inspired by Marcin Łysikowski</p>
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
  min-width: 1000px;

}

#footer .content {
  width: 95%;
  margin: auto;
  text-align: left;
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
