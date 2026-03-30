

function leftTest() {
 IO.sendDiscordWebhook(`Test. GameiD: ${global.gameID}`)
}



function rightTest(e) {
 // V.render(0)
 //alert($(e.currentTarget).data('index'));
 
  //alert(JSON.stringify(M.players[0].factory.factoryCoords))
 // console.log(M.players[M.gameFlow.turnOrder[0]].name)
 M.players[1].factory.prettyPrint();

  //V.externalDrawSquares(M.players[0], [0], "#000", 'selectable');

  //alert(JSON.stringify(M.players, null, 4));
 // alert(JSON.stringify(M.players[0].factory.factoryComponents, null, 4))
  //$(".piece").show();

}

function myFunction() {
  alert("HIHIHI");
}

window.addEventListener('DOMContentLoaded', (event) => {
  //alert(1)
  $(".live").show();
  document.getElementById('testDiv').innerHTML = `
  <button name='button2' id='button2' onclick='leftTest();' value='before'>Click Me!</button>


  <button name='button' id='button' onclick='rightTest();' value='before'>Click Me!</button>

<script type='text/javascript'>

  `;
  // document.getElementById('live').style.display = "block"


});


