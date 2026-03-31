<script setup>

</script>

<template>
  <div id="footer">
    <div class="content">
      <img src="@static/TGZ/images/TGZ_box.jpg" class="cover" />
      <p>
        The Great Zimbabwe is a board game by Jeroen Doumen and Joris Wiersinga, published by <a target='_blank'
          href='https://www.splottershop.com/'>Splotter Spellen</a>.
      </p>
      <p>Online Board Gamers implementation by DodgerB. Permissions Provided. </p>
      <p>Menu icons from <a href="http://game-icons.net">game-icons.net</a></p>
    </div>

    <div class="scoreImg-wrapper">
      <img src="@static/TGZ/images/help_scoring.jpg" class="scoreImg" />
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

.scoreImg-wrapper {
  position: absolute;
  top: 0;
  right: 0;
}

.scoreImg {
  height: 145px;
  width: 350px;
  margin-right: 20px;
}
</style>