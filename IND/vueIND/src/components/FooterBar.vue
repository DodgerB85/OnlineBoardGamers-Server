<script setup>
/** This is just the footer that sits at the bottom of the page
 * 
 * 
 * 
 * 
 */

import * as view from "../js/INDview"
import * as rf from "../js/INDreference"

const goods = [
  { name: "Rice", good: rf.GOOD_RICE, gfx: "prod_marker_rice" },
  { name: "Spice", good: rf.GOOD_SPICE, gfx: "prod_marker_spice" },
  { name: "Rubber", good: rf.GOOD_RUBBER, gfx: "prod_marker_rubber" },
  { name: "Siap Saji", good: rf.GOOD_SIAP_FAJI, gfx: "prod_marker_siap_faji" },
  { name: "Oil", good: rf.GOOD_OIL, gfx: "prod_marker_oil" },
]
</script>

<template>
  <div id="footer">
    <table class="goodsTable">
      <thead>
        <tr>
          <th colspan="2">Goods values</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in goods" :key="g.good">
          <td><img class="goodsTableIcon" :src="view.getImage(g.gfx)" alt="" />{{ g.name }}</td>
          <td>{{ rf.GOOD_INCOME[g.good] }}</td>
        </tr>
      </tbody>
    </table>
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

#footer .goodsTable {
  position: absolute;
  right: 2.5%;
  top: 50%;
  transform: translateY(-50%);
  border-collapse: collapse;
  font-size: 13px;
}

#footer .goodsTable th,
#footer .goodsTable td {
  border: 1px solid #666;
  padding: 1px 6px;
  text-align: left;
}

#footer .goodsTable th {
  background-color: #5875f8;
  color: white;
  text-align: center;
}

#footer .goodsTableIcon {
  width: 16px;
  height: 16px;
  border: 1px solid black;
  box-sizing: border-box;
  vertical-align: middle;
  margin-right: 6px;
}
</style>