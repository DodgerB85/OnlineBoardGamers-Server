var LZString = function () { function o(o, r) { if (!t[o]) { t[o] = {}; for (var n = 0; n < o.length; n++)t[o][o.charAt(n)] = n } return t[o][r] } var r = String.fromCharCode, n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$", t = {}, i = { compressToBase64: function (o) { if (null == o) return ""; var r = i._compress(o, 6, function (o) { return n.charAt(o) }); switch (r.length % 4) { default: case 0: return r; case 1: return r + "==="; case 2: return r + "=="; case 3: return r + "=" } }, decompressFromBase64: function (r) { return null == r ? "" : "" == r ? null : i._decompress(r.length, 32, function (e) { return o(n, r.charAt(e)) }) }, compressToUTF16: function (o) { return null == o ? "" : i._compress(o, 15, function (o) { return r(o + 32) }) + " " }, decompressFromUTF16: function (o) { return null == o ? "" : "" == o ? null : i._decompress(o.length, 16384, function (r) { return o.charCodeAt(r) - 32 }) }, compressToUint8Array: function (o) { for (var r = i.compress(o), n = new Uint8Array(2 * r.length), e = 0, t = r.length; t > e; e++) { var s = r.charCodeAt(e); n[2 * e] = s >>> 8, n[2 * e + 1] = s % 256 } return n }, decompressFromUint8Array: function (o) { if (null === o || void 0 === o) return i.decompress(o); for (var n = new Array(o.length / 2), e = 0, t = n.length; t > e; e++)n[e] = 256 * o[2 * e] + o[2 * e + 1]; var s = []; return n.forEach(function (o) { s.push(r(o)) }), i.decompress(s.join("")) }, compressToEncodedURIComponent: function (o) { return null == o ? "" : i._compress(o, 6, function (o) { return e.charAt(o) }) }, decompressFromEncodedURIComponent: function (r) { return null == r ? "" : "" == r ? null : (r = r.replace(/ /g, "+"), i._decompress(r.length, 32, function (n) { return o(e, r.charAt(n)) })) }, compress: function (o) { return i._compress(o, 16, function (o) { return r(o) }) }, _compress: function (o, r, n) { if (null == o) return ""; var e, t, i, s = {}, p = {}, u = "", c = "", a = "", l = 2, f = 3, h = 2, d = [], m = 0, v = 0; for (i = 0; i < o.length; i += 1)if (u = o.charAt(i), Object.prototype.hasOwnProperty.call(s, u) || (s[u] = f++, p[u] = !0), c = a + u, Object.prototype.hasOwnProperty.call(s, c)) a = c; else { if (Object.prototype.hasOwnProperty.call(p, a)) { if (a.charCodeAt(0) < 256) { for (e = 0; h > e; e++)m <<= 1, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++; for (t = a.charCodeAt(0), e = 0; 8 > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1 } else { for (t = 1, e = 0; h > e; e++)m = m << 1 | t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t = 0; for (t = a.charCodeAt(0), e = 0; 16 > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1 } l--, 0 == l && (l = Math.pow(2, h), h++), delete p[a] } else for (t = s[a], e = 0; h > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1; l--, 0 == l && (l = Math.pow(2, h), h++), s[c] = f++, a = String(u) } if ("" !== a) { if (Object.prototype.hasOwnProperty.call(p, a)) { if (a.charCodeAt(0) < 256) { for (e = 0; h > e; e++)m <<= 1, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++; for (t = a.charCodeAt(0), e = 0; 8 > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1 } else { for (t = 1, e = 0; h > e; e++)m = m << 1 | t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t = 0; for (t = a.charCodeAt(0), e = 0; 16 > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1 } l--, 0 == l && (l = Math.pow(2, h), h++), delete p[a] } else for (t = s[a], e = 0; h > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1; l--, 0 == l && (l = Math.pow(2, h), h++) } for (t = 2, e = 0; h > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1; for (; ;) { if (m <<= 1, v == r - 1) { d.push(n(m)); break } v++ } return d.join("") }, decompress: function (o) { return null == o ? "" : "" == o ? null : i._decompress(o.length, 32768, function (r) { return o.charCodeAt(r) }) }, _decompress: function (o, n, e) { var t, i, s, p, u, c, a, l, f = [], h = 4, d = 4, m = 3, v = "", w = [], A = { val: e(0), position: n, index: 1 }; for (i = 0; 3 > i; i += 1)f[i] = i; for (p = 0, c = Math.pow(2, 2), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; switch (t = p) { case 0: for (p = 0, c = Math.pow(2, 8), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; l = r(p); break; case 1: for (p = 0, c = Math.pow(2, 16), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; l = r(p); break; case 2: return "" }for (f[3] = l, s = l, w.push(l); ;) { if (A.index > o) return ""; for (p = 0, c = Math.pow(2, m), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; switch (l = p) { case 0: for (p = 0, c = Math.pow(2, 8), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; f[d++] = r(p), l = d - 1, h--; break; case 1: for (p = 0, c = Math.pow(2, 16), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; f[d++] = r(p), l = d - 1, h--; break; case 2: return w.join("") }if (0 == h && (h = Math.pow(2, m), m++), f[l]) v = f[l]; else { if (l !== d) return null; v = s + s.charAt(0) } w.push(v), f[d++] = s + v.charAt(0), h--, s = v, 0 == h && (h = Math.pow(2, m), m++) } } }; return i }(); "function" == typeof define && define.amd ? define(function () { return LZString }) : "undefined" != typeof module && null != module && (module.exports = LZString);

//         <a onclick="this.href='data:text/html;charset=UTF-8,'+encodeURIComponent(document.documentElement.outerHTML)" href="#" download="page.html">Download all as HTML</a>


// Function to download data to a file
function download(data, filename, type) {
  var file = new Blob([data], { type: type });
  if (window.navigator.msSaveOrOpenBlob) // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  else { // Others
    var a = document.createElement("a"),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}

// get CSRF for javascript
function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Removes coffee at turn end and food payment, and mass marketeers from marketeers 
function removeItemAll(arr, value) {
  var i = 0;
  while (i < arr.length) {
    if (arr[i] === value) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
}

function sleepPause(miliseconds) {
  var currentTime = new Date().getTime();

  while (currentTime + miliseconds >= new Date().getTime()) {
    // Do nothing
  }
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



//var arr;
/*const contains = arr.some(element => {
  if (str.includes(element)) {
    return true;
  }

  return false;
});*/

/*function actionRematch() {
  document.getElementById("mapDataRematch").value = M.map.getOriginalTiles(false);
  var rematchData = {};
  rematchData.gameName = global.gameName;

  rematchData.totalPlayers = M.players.length;
  rematchData.scenarioName = "";
  //if (global.gameName.includes)

  SCENARIO_NAMES.some(element => {
    if (global.gameName.includes(element)) {
      rematchData.scenarioName = element;
    }
      //return false;
  });

  document.getElementById("rematchData").value = JSON.stringify(rematchData);

  var form = document.getElementById("rematchForm");
  form.submit();
}*/

if (!Array.prototype.last) {
  Array.prototype.last = function () {
    return this[this.length - 1];
  };
}

function getOccurrence(array, value) {
  var count = 0;
  array.forEach((v) => (v === value && count++));
  return count;
}

function historyToggle() {
  setTimeout(function () {
    if (global.historyOrder == 0) global.historyOrder = 1;
    else global.historyOrder = 0;
    Log.refreshHistory(M);
  }, 400);
}

/*function showDropDown(e){
  //alert(1)
  document.getElementById('showDropdown').onclick = function(){};
  if(e.stopPropagation)
      e.stopPropagation();   // W3C model
  else
      e.cancelBubble = true; // IE model

  document.getElementById("dropdown").style.display = "block";
  document.onclick = function(e){
      var ele = document.elementFromPoint(e.clientX, e.clientY);
      if(ele == document.getElementById("showDropdown")){
          hideDropDown();
          return;
      }
      do{
          if(ele == document.getElementById("dropdown"))
              return;
      }while(ele = ele.parentNode);
      hideDropDown();
  };
}

function hideDropDown(){
  alert(2)
 document.onclick = function(){};
 document.getElementById("dropdown").style.display = "none";
 document.getElementById('showDropdown').onclick = showDropDown;
}*/

function toggleDropDown() {
  if ($('#dropdown').is(":visible")) {
    $("#dropdown").fadeOut(400);
  } else {
    $("#dropdown").fadeIn(400);
  }
}

if (!String.format) {
  String.format = function(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number] 
        : match
      ;
    });
  };
}

/*function validateRewindOptions(_id) {
  if (_id === "checkUnderstand") {
    if ($('#checkUnderstand').is(":checked")) {
      $("#checkOnce").removeAttr("disabled");
      $("#checkPermanent").removeAttr("disabled");
    } else {
      $("#checkOnce").attr("disabled", true);
      $("#checkPermanent").attr("disabled", true);
      $("#checkOnce").attr("checked", false);
      $("#checkPermanent").attr("checked", false);
    }
  }
}*/


//alert(JSON.stringify(M, null, 4));
//download(JSON.stringify(M, null, 4), 'file.txt', 'txt') // file is filename, and txt is type of file.	
function download(data, filename, type) {
  var file = new Blob([data], { type: type });
  if (window.navigator.msSaveOrOpenBlob) // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  else { // Others
    var a = document.createElement("a"),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}
			//download(JSON.stringify(tab[18], null, 4), 'file.txt', 'txt') // file is filename, and txt is type of file.	

function compressObjectToDB(obj) {
  var step1 = JSON.stringify(obj);
  var step2 = LZString.compressToEncodedURIComponent(step1);
  return step2;
}

function decompressObjectFromDB(str) {
  var step1 = LZString.decompressFromEncodedURIComponent(str);
  var step2 = JSON.parse(step1);
	//	download(JSON.stringify(step2, null, 4), 'file.txt', 'txt') // file is filename, and txt is type of file.	
  return step2;
}


/*function removeItemAll(arr, value) {
  var i = 0;
  while (i < arr.length) {
    if (arr[i] === value) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
}*/

// FInd index
//var index = this.model.players.map(item => item.colour).indexOf(colour);
const TL_IDX = 4 // tech level index - of mainlines & dealerships

const MW_IDX = 5 // Market Window Index - consists of [-1,-1,-1] = [M board selling square loc, rotation, size]
const SE_IDX = 6 // sales exclude index

const SL_IDX = 5 // stock level of mainline => Only need a number - type is automatic from which mainline it is

const RA_IDX = 4 // related arrows index - for techs

const TL_DISPLAY_IDX_ORDER = [0, 2, 3, 4, 1] // Display on dealerships in order of min spec order

DELETE_VOTE_TOPIC = "delete_game_votes"
STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"
REWIND_CONSENT_VOTE_TOPIC = "rewind_consent_votes"
KICKOUT_VOTE_TOPIC = "kickout_player_votes"
KICKOUT_SOLO_DELAY_MS = 2 * 24 * 60 * 60 * 1000

var RED = 0
var GREEN = 1
var PURPLE = 2
var BLUE = 3
var YELLOW = 4

// USED IN HISTORY > Expec Adavance
var TTnamesFromColour = [gettext("Speed"), gettext("Range"), gettext("Design"), gettext("Reliability"), gettext("Safety")]

// Componenet NAMES
var FACTORY_MAIN_TILE = 0
var FACTORY_EXPANSION_TILE = 1
var MAINLINE_CAR = 2
var MAINLINE_TRUCK = 3
var MAINLINE_SPORTS = 4
var DEPARTMENT_RESEARCH = 5
var DEPARTMENT_PLANNING = 6
const CHASSIS = 7
var BODY = 8
var RADIATOR = 9
var DOOR = 10
var BUMPER = 11
var DASHBOARD = 12
var PAINT = 13
var BATTERY = 14
var ENGINE = 15
var GEARS = 16
var FUEL_TANK = 17
var STEERING_WHEEL = 18
var BRAKE = 19
var TIRE = 20
var HEADLIGHT = 21
var WINDSHIELD = 22
var CLAXON = 23
var ARROW_DESIGN_A = 24
var ARROW_DESIGN_B = 25
var ARROW_DESIGN_C = 26
var ARROW_DESIGN_D = 27
var ARROW_REL_A = 28
var ARROW_REL_B = 29
var ARROW_REL_C = 30
var ARROW_SPD_B = 31
var ARROW_SPD_C = 32
var ARROW_SPD_D = 33
var ARROW_SAFETY_A = 34
var ARROW_SAFETY_B = 35
var ARROW_SAFETY_D = 36
var ARROW_RANGE_A = 37
var ARROW_RANGE_B = 38
var ARROW_RANGE_D = 39

var DEALERSHIP_RED_POMIGLIANO = 40
var DEALERSHIP_RED_GRUGLIASCO = 41
var DEALERSHIP_RED_TORINO = 42

var DEALERSHIP_GREEN_ELLESMERE = 43
var DEALERSHIP_GREEN_DUNSTABLE = 44
var DEALERSHIP_GREEN_LUTON = 45

var DEALERSHIP_PURPLE_AUDINCOURT = 46
var DEALERSHIP_PURPLE_FIVES = 47
var DEALERSHIP_PURPLE_SOCHAUX = 48

var DEALERSHIP_BLUE_KANSAS = 49
var DEALERSHIP_BLUE_DEARBORN = 50
var DEALERSHIP_BLUE_DETROIT = 51

var DEALERSHIP_YELLOW_STUTTGART = 52
var DEALERSHIP_YELLOW_LADENBURG = 53
var DEALERSHIP_YELLOW_MANNHEIM = 54

var DEPARTMENT_MARKETING_RED = 55
var DEPARTMENT_MARKETING_GREEN = 56
var DEPARTMENT_MARKETING_PURPLE = 57
var DEPARTMENT_MARKETING_BLUE = 58
var DEPARTMENT_MARKETING_YELLOW = 59
// 4 in each colour, DEPARTMENT_MARKETING

var RED_DEALERSHIPS = [DEALERSHIP_RED_POMIGLIANO, DEALERSHIP_RED_GRUGLIASCO, DEALERSHIP_RED_TORINO]
var GREEN_DEALERSHIPS = [DEALERSHIP_GREEN_ELLESMERE, DEALERSHIP_GREEN_DUNSTABLE, DEALERSHIP_GREEN_LUTON]
var PURPLE_DEALERSHIPS = [DEALERSHIP_PURPLE_AUDINCOURT, DEALERSHIP_PURPLE_FIVES, DEALERSHIP_PURPLE_SOCHAUX]
var BLUE_DEALERSHIPS = [DEALERSHIP_BLUE_KANSAS, DEALERSHIP_BLUE_DEARBORN, DEALERSHIP_BLUE_DETROIT]
var YELLOW_DEALERSHIPS = [DEALERSHIP_YELLOW_STUTTGART, DEALERSHIP_YELLOW_LADENBURG, DEALERSHIP_YELLOW_MANNHEIM]

var DEALERSHIPS = [...RED_DEALERSHIPS]
	.concat([...GREEN_DEALERSHIPS])
	.concat([...PURPLE_DEALERSHIPS])
	.concat([...BLUE_DEALERSHIPS])
	.concat([...YELLOW_DEALERSHIPS])
var DEPARTMENTS_MARKETING = [DEPARTMENT_MARKETING_RED, DEPARTMENT_MARKETING_GREEN, DEPARTMENT_MARKETING_PURPLE, DEPARTMENT_MARKETING_BLUE, DEPARTMENT_MARKETING_YELLOW]
var MAINLINES = [MAINLINE_CAR, MAINLINE_TRUCK, MAINLINE_SPORTS]

const A_TECHS = [CHASSIS, BODY, RADIATOR, DOOR, BUMPER] // ARROW_DESIGN_A_SQ, ARROW_REL_A_SQ, ARROW_SAFETY_A_SQ, ARROW_RANGE_A_SQ  ];
var B_TECHS = [ENGINE, GEARS, FUEL_TANK, STEERING_WHEEL, BRAKE] //, ARROW_DESIGN_B_SQ, ARROW_REL_B_SQ, ARROW_SPD_B_SQ, ARROW_SAFETY_B_SQ, ARROW_RANGE_B_SQ];
var C_TECHS = [DASHBOARD, PAINT, BATTERY] //, ARROW_DESIGN_C_SQ, ARROW_REL_C_SQ, ARROW_SPD_C_SQ];
var D_TECHS = [TIRE, HEADLIGHT, WINDSHIELD, CLAXON] //, ARROW_DESIGN_D_SQ, ARROW_SPD_D_SQ, ARROW_SAFETY_D_SQ, ARROW_RANGE_D_SQ];

var ONE_SLOT_TECH = [DOOR, PAINT, BATTERY, BRAKE, WINDSHIELD, CLAXON]
const TWO_SLOT_TECH = [CHASSIS, BODY, RADIATOR, BUMPER, DASHBOARD, GEARS, FUEL_TANK, STEERING_WHEEL, HEADLIGHT]
var THREE_SLOT_TECH = [ENGINE, TIRE]

var ARROWS = [ARROW_DESIGN_A, ARROW_DESIGN_B, ARROW_DESIGN_C, ARROW_DESIGN_D, ARROW_REL_A, ARROW_REL_B, ARROW_REL_C, ARROW_SPD_B, ARROW_SPD_C, ARROW_SPD_D, ARROW_SAFETY_A, ARROW_SAFETY_B, ARROW_SAFETY_D, ARROW_RANGE_A, ARROW_RANGE_B, ARROW_RANGE_D]

var ARROWS_PURPLE = [ARROW_DESIGN_A, ARROW_DESIGN_B, ARROW_DESIGN_C, ARROW_DESIGN_D]
var ARROWS_BLUE = [ARROW_REL_A, ARROW_REL_B, ARROW_REL_C]
var ARROWS_RED = [ARROW_SPD_B, ARROW_SPD_C, ARROW_SPD_D]
var ARROWS_YELLOW = [ARROW_SAFETY_A, ARROW_SAFETY_B, ARROW_SAFETY_D]
var ARROWS_GREEN = [ARROW_RANGE_A, ARROW_RANGE_B, ARROW_RANGE_D]

var A_ARROWS = [ARROW_DESIGN_A, ARROW_REL_A, ARROW_SAFETY_A, ARROW_RANGE_A]
var B_ARROWS = [ARROW_DESIGN_B, ARROW_REL_B, ARROW_SPD_B, ARROW_SAFETY_B, ARROW_RANGE_B]
var C_ARROWS = [ARROW_DESIGN_C, ARROW_REL_C, ARROW_SPD_C]
var D_ARROWS = [ARROW_DESIGN_D, ARROW_SPD_D, ARROW_SAFETY_D, ARROW_RANGE_D]

var ROTATE_4_COMPONENTS = [FACTORY_EXPANSION_TILE]
// WIDTH then HEIGHT in NATURAL PIC
var DIMENSIONS = [
	/*Main tile*/ [12, 12],
	/*expansion tile */ [6, 8],
	/*MAINLINE_CAR*/ [4, 3],
	/*MAINLINE_TRUCK*/ [6, 3],
	/*MAINLINE_SPORTS*/ [5, 3],
	/*DEPARTMENT_RESEARCH*/ [3, 3],
	/*DEPARTMENT_PLANNING*/ [2, 3],
	/*CHASSIS*/ [3, 4],
	/*BODY*/ [3, 3],
	/*RADIATOR*/ [2, 3],
	/*DOOR*/ [2, 2],
	/*BUMPER*/ [4, 1],
	/*DASHBOARD*/ [4, 2],
	/*PAINT*/ [2, 3],
	/*BATTERY*/ [2, 2],
	/*ENGINE*/ [4, 4],
	/*GEARS*/ [3, 4],
	/*FUEL_TANK*/ [4, 2],
	/*STEERING_WHEEL*/ [3, 3],
	/*BRAKE*/ [2, 2],
	/*TIRE*/ [3, 3],
	/*HEADLIGHT*/ [2, 3],
	/*WINDSHIELD*/ [4, 2],
	/*CLAXON*/ [2, 2],
	/* ARROW_DESIGN_A */ [1, 1],
	/* ARROW_DESIGN_B */ [1, 1],
	/* ARROW_DESIGN_C */ [1, 1],
	/* ARROW_DESIGN_D */ [1, 1],
	/* ARROW_REL_A */ [1, 1],
	/* ARROW_REL_B */ [1, 1],
	/* ARROW_REL_C */ [1, 1],
	/* ARROW_SPD_B */ [1, 1],
	/* ARROW_SPD_C */ [1, 1],
	/* ARROW_SPD_D */ [1, 1],
	/* ARROW_SAFETY_A */ [1, 1],
	/* ARROW_SAFETY_B */ [1, 1],
	/* ARROW_SAFETY_D */ [1, 1],
	/* ARROW_RANGE_A */ [1, 1],
	/* ARROW_RANGE_B */ [1, 1],
	/* ARROW_RANGE_D */ [1, 1],

	/* DEALERSHIP_RED_POMIGLIANO */ [5, 4],
	/* DEALERSHIP_RED_GRUGLIASCO */ [4, 4],
	/* DEALERSHIP_RED_TORINO */ [4, 3],

	/* DEALERSHIP_GREEN_ELLESMERE */ [5, 4],
	/* DEALERSHIP_GREEN_DUNSTABLE */ [4, 4],
	/* DEALERSHIP_GREEN_LUTON */ [4, 3],

	/* DEALERSHIP_PURPLE_AUDINCOURT */ [5, 4],
	/* DEALERSHIP_PURPLE_FIVES */ [4, 4],
	/* DEALERSHIP_PURPLE_SOCHAUX */ [4, 3],

	/* DEALERSHIP_BLUE_KANSAS */ [5, 4],
	/* DEALERSHIP_BLUE_DEARBORN */ [4, 4],
	/* DEALERSHIP_BLUE_DETROIT */ [4, 3],

	/* DEALERSHIP_YELLOW_STUTTGART */ [5, 4],
	/* DEALERSHIP_YELLOW_LADENBURG */ [4, 4],
	/* DEALERSHIP_YELLOW_MANNHEIM */ [4, 3],

	/* DEPARTMENT_MARKETING_RED */ [4, 3],
	/* DEPARTMENT_MARKETING_GREEN */ [4, 3],
	/* DEPARTMENT_MARKETING_PURPLE */ [4, 3],
	/* DEPARTMENT_MARKETING_BLUE */ [4, 3],
	/* DEPARTMENT_MARKETING_YELLOW */ [4, 3],
]

var STARTING_COMPONENT_LIMITS_5P = [
	/*Main tile*/ 5, /*expansion tile */ 30, /*MAINLINE_CAR*/ 10, /*MAINLINE_TRUCK*/ 10, /*MAINLINE_SPORTS*/ 10, /*DEPARTMENT_RESEARCH*/ 25, /*DEPARTMENT_PLANNING*/ 30, /*CHASSIS*/ 6, /*BODY*/ 6, /*RADIATOR*/ 10, /*DOOR*/ 10, /*BUMPER*/ 10, /*DASHBOARD*/ 6, /*PAINT*/ 10, /*BATTERY*/ 10, /*ENGINE*/ 6, /*GEARS*/ 6, /*FUEL_TANK*/ 6, /*STEERING_WHEEL*/ 6, /*BRAKE*/ 10, /*TIRE*/ 6, /*HEADLIGHT*/ 6, /*WINDSHIELD*/ 10, /*CLAXON*/ 10, /* ARROW_DESIGN_A */ 16, /* ARROW_DESIGN_B */ 6, /* ARROW_DESIGN_C */ 16, /* ARROW_DESIGN_D */ 6, /* ARROW_REL_A */ 28, /* ARROW_REL_B */ 6, /* ARROW_REL_C */ 10, /* ARROW_SPD_B */ 18, /* ARROW_SPD_C */ 6, /* ARROW_SPD_D */ 16, /* ARROW_SAFETY_A */ 10, /* ARROW_SAFETY_B */ 16, /* ARROW_SAFETY_D */ 22, /* ARROW_RANGE_A */ 20, /* ARROW_RANGE_B */ 18, /* ARROW_RANGE_D */ 6,

	/* DEALERSHIP_RED_POMIGLIANO */ 1, /* DEALERSHIP_RED_GRUGLIASCO */ 1, /* DEALERSHIP_RED_TORINO */ 1,

	/* DEALERSHIP_GREEN_ELLESMERE */ 1, /* DEALERSHIP_GREEN_DUNSTABLE */ 1, /* DEALERSHIP_GREEN_LUTON */ 1,

	/* DEALERSHIP_PURPLE_AUDINCOURT */ 1, /* DEALERSHIP_PURPLE_FIVES */ 1, /* DEALERSHIP_PURPLE_SOCHAUX */ 1,

	/* DEALERSHIP_BLUE_KANSAS */ 1, /* DEALERSHIP_BLUE_DEARBORN */ 1, /* DEALERSHIP_BLUE_DETROIT */ 1,

	/* DEALERSHIP_YELLOW_STUTTGART */ 1, /* DEALERSHIP_YELLOW_LADENBURG */ 1, /* DEALERSHIP_YELLOW_MANNHEIM */ 1,

	/* DEPARTMENT_MARKETING_RED */ 4, /* DEPARTMENT_MARKETING_GREEN */ 4, /* DEPARTMENT_MARKETING_PURPLE */ 4, /* DEPARTMENT_MARKETING_BLUE */ 4, /* DEPARTMENT_MARKETING_YELLOW */ 4,
]

var COMPONENTS_NAME_STRING = [/*Main tile*/ "main tile", /*expansion tile */ gettext("Factory Expansion"), /*MAINLINE_CAR*/ gettext("Car Mainline"), /*MAINLINE_TRUCK*/ gettext("Truck Mainline"), /*MAINLINE_SPORTS*/ gettext("Sports Mainline"), /*DEPARTMENT_RESEARCH*/ gettext("Research Department"), /*DEPARTMENT_PLANNING*/ gettext("Planning Department"), /*CHASSIS*/ gettext("Chassis"), /*BODY*/ gettext("Body"), /*RADIATOR*/ gettext("Radiator"), /*DOOR*/ gettext("Door"), /*BUMPER*/ gettext("Bumper"), /*DASHBOARD*/ gettext("Dashboard"), /*PAINT*/ gettext("Paint"), /*BATTERY*/ gettext("Battery"), /*ENGINE*/ gettext("Engine"), /*GEARS*/ gettext("Gears"), /*FUEL_TANK*/ gettext("Fuel Tank"), /*STEERING_WHEEL*/ gettext("Steering Wheel"), /*BRAKE*/ gettext("Brake"), /*TIRE*/ gettext("Tire"), /*HEADLIGHT*/ gettext("Headlights"), /*WINDSHIELD*/ gettext("Windshield"), /*CLAXON*/ gettext("Claxon"), /* ARROW_DESIGN_A */ gettext("Spec (Design A)"), /* ARROW_DESIGN_B */ gettext("Spec (Design B)"), /* ARROW_DESIGN_C */ gettext("Spec (Design C)"), /* ARROW_DESIGN_D */ gettext("Spec (Design D)"), /* ARROW_REL_A */ gettext("Spec (Reliability A)"), /* ARROW_REL_B */ gettext("Spec (Reliability B)"), /* ARROW_REL_C */ gettext("Spec (Reliability C)"), /* ARROW_SPD_B */ gettext("Spec (Speed B)"), /* ARROW_SPD_C */ gettext("Spec (Speed C)"), /* ARROW_SPD_D */ gettext("Spec (Speed D)"), /* ARROW_SAFETY_A */ gettext("Spec (Safety A)"), /* ARROW_SAFETY_B */ gettext("Spec (Safety B)"), /* ARROW_SAFETY_D */ gettext("Spec (Safety D)"), /* ARROW_RANGE_A */ gettext("Spec (Range A)"), /* ARROW_RANGE_B */ gettext("Spec (Range B)"), /* ARROW_RANGE_D */ gettext("Spec (Range D)"), /* DEALERSHIP_RED_POMIGLIANO */ "Pomigliano d'Arco (Red)", /* DEALERSHIP_RED_GRUGLIASCO */ "Grugliasco (Red)", /* DEALERSHIP_RED_TORINO */ "Torino (Red)", /* DEALERSHIP_GREEN_ELLESMERE */ "Ellesmere Port (Green)", /* DEALERSHIP_GREEN_DUNSTABLE */ "Dunstable (Green)", /* DEALERSHIP_GREEN_LUTON */ "Luton (Green)", /* DEALERSHIP_PURPLE_AUDINCOURT */ "Audincourt (Purple)", /* DEALERSHIP_PURPLE_FIVES */ "Fives-Lille (Purple)", /* DEALERSHIP_PURPLE_SOCHAUX */ "Sochaux (Purple)", /* DEALERSHIP_BLUE_KANSAS */ "Kansas City (Blue)", /* DEALERSHIP_BLUE_DEARBORN */ "Dearborn (Blue)", /* DEALERSHIP_BLUE_DETROIT */ "Detroit (Blue)", /* DEALERSHIP_YELLOW_STUTTGART */ "Stuttgart (Yellow)", /* DEALERSHIP_YELLOW_LADENBURG */ "Ladenburg (Yellow)", /* DEALERSHIP_YELLOW_MANNHEIM */ "Mannheim (Yellow)", /* DEPARTMENT_MARKETING_RED */ gettext("Marketing Deparment"), /* DEPARTMENT_MARKETING_GREEN */ gettext("Marketing Deparment"), /* DEPARTMENT_MARKETING_PURPLE */ gettext("Marketing Deparment"), /* DEPARTMENT_MARKETING_BLUE */ gettext("Marketing Deparment"), /* DEPARTMENT_MARKETING_YELLOW */ gettext("Marketing Deparment")]

// Co-Ords
var OUT_OF_BOUNDS = -1
var LOADING_DOCK_KC = 0
var EMPTY_SPACE = 1
var LOADING_DOCK_INNER = 2
var LOADING_BAY_KC_CORNER = 3

var DEPARTMENT_RESEARCH_SQ = 5
var DEPARTMENT_PLANNING_SQ = 6
const CHASSIS_SQ = 7
var BODY_SQ = 8
var RADIATOR_SQ = 9
var DOOR_SQ = 10
var BUMPER_SQ = 11
var DASHBOARD_SQ = 12
var PAINT_SQ = 13
var BATTERY_SQ = 14
var ENGINE_SQ = 15
var GEARS_SQ = 16
var FUEL_TANK_SQ = 17
var STEERING_WHEEL_SQ = 18
var BRAKE_SQ = 19
var TIRE_SQ = 20
var HEADLIGHT_SQ = 21
var WINDSHIELD_SQ = 22
var CLAXON_SQ = 23
var ARROW_DESIGN_A_SQ = 24
var ARROW_DESIGN_B_SQ = 25
var ARROW_DESIGN_C_SQ = 26
var ARROW_DESIGN_D_SQ = 27
var ARROW_REL_A_SQ = 28
var ARROW_REL_B_SQ = 29
var ARROW_REL_C_SQ = 30
var ARROW_SPD_B_SQ = 31
var ARROW_SPD_C_SQ = 32
var ARROW_SPD_D_SQ = 33
var ARROW_SAFETY_A_SQ = 34
var ARROW_SAFETY_B_SQ = 35
var ARROW_SAFETY_D_SQ = 36
var ARROW_RANGE_A_SQ = 37
var ARROW_RANGE_B_SQ = 38
var ARROW_RANGE_D_SQ = 39

var DEALERSHIP_RED_TORINO_SQ = 40
var DEALERSHIP_RED_POMIGLIANO_SQ = 41
var DEALERSHIP_RED_GRUGLIASCO_SQ = 42
var DEALERSHIP_GREEN_DUNSTABLE_SQ = 43
var DEALERSHIP_GREEN_LUTON_SQ = 44
var DEALERSHIP_GREEN_ELLESMERE_SQ = 45

var DEALERSHIP_PURPLE_SOCHAUX_SQ = 46
var DEALERSHIP_PURPLE_AUDINCOURT_SQ = 47
var DEALERSHIP_PURPLE_FIVES_SQ = 48
/*var DEALERSHIP_PURPLE_SOCHAUX_SQ = 48;
var DEALERSHIP_PURPLE_AUDINCOURT_SQ = 49;
var DEALERSHIP_PURPLE_FIVES_SQ = 47;*/

var DEALERSHIP_BLUE_KANSAS_SQ = 49
var DEALERSHIP_BLUE_DETROIT_SQ = 50
var DEALERSHIP_BLUE_DEARBORN_SQ = 51

var DEALERSHIP_YELLOW_MANNHEIM_SQ = 52
var DEALERSHIP_YELLOW_STUTTGART_SQ = 53
var DEALERSHIP_YELLOW_LADENBURG_SQ = 54

var DEPARTMENT_MARKETING_RED_SQ = 55
var DEPARTMENT_MARKETING_GREEN_SQ = 56
var DEPARTMENT_MARKETING_PURPLE_SQ = 57
var DEPARTMENT_MARKETING_BLUE_SQ = 58
var DEPARTMENT_MARKETING_YELLOW_SQ = 59

var MAINLINE_CAR_SQ_AC = 60
var MAINLINE_CAR_SQ_A = 61
var MAINLINE_CAR_SQ_AB = 62
var MAINLINE_CAR_SQ_B = 63
var MAINLINE_CAR_SQ_BD = 64
var MAINLINE_CAR_SQ_D = 65
var MAINLINE_CAR_SQ_CD = 66
var MAINLINE_CAR_SQ_C = 67

var MAINLINE_TRUCK_SQ_AC = 68
var MAINLINE_TRUCK_SQ_A = 69
var MAINLINE_TRUCK_SQ_AB = 70
var MAINLINE_TRUCK_SQ_B = 71
var MAINLINE_TRUCK_SQ_BD = 72
var MAINLINE_TRUCK_SQ_D = 73
var MAINLINE_TRUCK_SQ_CD = 74
var MAINLINE_TRUCK_SQ_C = 75

var MAINLINE_SPORTS_SQ_AC = 76
var MAINLINE_SPORTS_SQ_A = 77
var MAINLINE_SPORTS_SQ_AB = 78
var MAINLINE_SPORTS_SQ_B = 79
var MAINLINE_SPORTS_SQ_BD = 80
var MAINLINE_SPORTS_SQ_D = 81
var MAINLINE_SPORTS_SQ_CD = 82
var MAINLINE_SPORTS_SQ_C = 83

var MAINLINE_INNER_SQUARE = 84

var ALL_DEALERSHUP_SQ = [DEALERSHIP_RED_TORINO_SQ, DEALERSHIP_RED_POMIGLIANO_SQ, DEALERSHIP_RED_GRUGLIASCO_SQ, DEALERSHIP_GREEN_DUNSTABLE_SQ, DEALERSHIP_GREEN_LUTON_SQ, DEALERSHIP_GREEN_ELLESMERE_SQ, DEALERSHIP_PURPLE_SOCHAUX_SQ, DEALERSHIP_PURPLE_AUDINCOURT_SQ, DEALERSHIP_PURPLE_FIVES_SQ, DEALERSHIP_BLUE_KANSAS_SQ, DEALERSHIP_BLUE_DETROIT_SQ, DEALERSHIP_BLUE_DEARBORN_SQ, DEALERSHIP_YELLOW_MANNHEIM_SQ, DEALERSHIP_YELLOW_STUTTGART_SQ, DEALERSHIP_YELLOW_LADENBURG_SQ] //, DEPARTMENT_MARKETING_RED_SQ, DEPARTMENT_MARKETING_GREEN_SQ, DEPARTMENT_MARKETING_PURPLE_SQ, DEPARTMENT_MARKETING_BLUE_SQ, DEPARTMENT_MARKETING_YELLOW_SQ];
//var ALL_MAINLINE_SQ = [MAINLINE_CAR_SQ_A, MAINLINE_CAR_SQ_B, MAINLINE_CAR_SQ_C, MAINLINE_CAR_SQ_D, MAINLINE_TRUCK_SQ_A, MAINLINE_TRUCK_SQ_B, MAINLINE_TRUCK_SQ_C, MAINLINE_TRUCK_SQ_D, MAINLINE_SPORTS_SQ_A, MAINLINE_SPORTS_SQ_B, MAINLINE_SPORTS_SQ_C, MAINLINE_SPORTS_SQ_D];
var MAINLINE_A_SQS_PURE = [MAINLINE_CAR_SQ_A, MAINLINE_TRUCK_SQ_A, MAINLINE_SPORTS_SQ_A]
var MAINLINE_B_SQS_PURE = [MAINLINE_CAR_SQ_B, MAINLINE_TRUCK_SQ_B, MAINLINE_SPORTS_SQ_B]
var MAINLINE_C_SQS_PURE = [MAINLINE_CAR_SQ_C, MAINLINE_TRUCK_SQ_C, MAINLINE_SPORTS_SQ_C]
var MAINLINE_D_SQS_PURE = [MAINLINE_CAR_SQ_D, MAINLINE_TRUCK_SQ_D, MAINLINE_SPORTS_SQ_D]

var MAINLINE_SQS_PURE = [...MAINLINE_A_SQS_PURE]
	.concat([...MAINLINE_B_SQS_PURE])
	.concat([...MAINLINE_C_SQS_PURE])
	.concat([...MAINLINE_D_SQS_PURE])

var MAINLINE_SQS_AC = [MAINLINE_CAR_SQ_AC, MAINLINE_TRUCK_SQ_AC, MAINLINE_SPORTS_SQ_AC]
var MAINLINE_SQS_CD = [MAINLINE_CAR_SQ_CD, MAINLINE_TRUCK_SQ_CD, MAINLINE_SPORTS_SQ_CD]
var MAINLINE_SQS_BD = [MAINLINE_CAR_SQ_BD, MAINLINE_TRUCK_SQ_BD, MAINLINE_SPORTS_SQ_BD]
var MAINLINE_SQS_AB = [MAINLINE_CAR_SQ_AB, MAINLINE_TRUCK_SQ_AB, MAINLINE_SPORTS_SQ_AB]

var MAINLINE_SQS_CORNERS = [...MAINLINE_SQS_AC]
	.concat([...MAINLINE_SQS_CD])
	.concat([...MAINLINE_SQS_BD])
	.concat([...MAINLINE_SQS_AB])

var MAINLINE_A_SQS = [MAINLINE_CAR_SQ_AC, MAINLINE_CAR_SQ_A, MAINLINE_CAR_SQ_AB, MAINLINE_TRUCK_SQ_AC, MAINLINE_TRUCK_SQ_A, MAINLINE_TRUCK_SQ_AB, MAINLINE_SPORTS_SQ_AC, MAINLINE_SPORTS_SQ_A, MAINLINE_SPORTS_SQ_AB]
var MAINLINE_B_SQS = [MAINLINE_CAR_SQ_AB, MAINLINE_CAR_SQ_B, MAINLINE_CAR_SQ_BD, MAINLINE_TRUCK_SQ_AB, MAINLINE_TRUCK_SQ_B, MAINLINE_TRUCK_SQ_BD, MAINLINE_SPORTS_SQ_AB, MAINLINE_SPORTS_SQ_B, MAINLINE_SPORTS_SQ_BD]
var MAINLINE_C_SQS = [MAINLINE_CAR_SQ_AC, MAINLINE_CAR_SQ_C, MAINLINE_CAR_SQ_CD, MAINLINE_TRUCK_SQ_AC, MAINLINE_TRUCK_SQ_C, MAINLINE_TRUCK_SQ_CD, MAINLINE_SPORTS_SQ_AC, MAINLINE_SPORTS_SQ_C, MAINLINE_SPORTS_SQ_CD]
var MAINLINE_D_SQS = [MAINLINE_CAR_SQ_BD, MAINLINE_CAR_SQ_D, MAINLINE_CAR_SQ_CD, MAINLINE_TRUCK_SQ_BD, MAINLINE_TRUCK_SQ_D, MAINLINE_TRUCK_SQ_CD, MAINLINE_SPORTS_SQ_BD, MAINLINE_SPORTS_SQ_D, MAINLINE_SPORTS_SQ_CD]

var MAINLINE_ALL_SQS = [...MAINLINE_A_SQS]
	.concat([...MAINLINE_B_SQS])
	.concat([...MAINLINE_C_SQS])
	.concat([...MAINLINE_D_SQS])

const A_TECH_SQS = [CHASSIS_SQ, BODY_SQ, RADIATOR_SQ, DOOR_SQ, BUMPER_SQ, ARROW_DESIGN_A_SQ, ARROW_REL_A_SQ, ARROW_SAFETY_A_SQ, ARROW_RANGE_A_SQ]
var B_TECH_SQS = [ENGINE_SQ, GEARS_SQ, FUEL_TANK_SQ, STEERING_WHEEL_SQ, BRAKE_SQ, ARROW_DESIGN_B_SQ, ARROW_REL_B_SQ, ARROW_SPD_B_SQ, ARROW_SAFETY_B_SQ, ARROW_RANGE_B_SQ]
var C_TECH_SQS = [DASHBOARD_SQ, PAINT_SQ, BATTERY_SQ, ARROW_DESIGN_C_SQ, ARROW_REL_C_SQ, ARROW_SPD_C_SQ]
var D_TECH_SQS = [TIRE_SQ, HEADLIGHT_SQ, WINDSHIELD_SQ, CLAXON_SQ, ARROW_DESIGN_D_SQ, ARROW_SPD_D_SQ, ARROW_SAFETY_D_SQ, ARROW_RANGE_D_SQ]

var ALL_TECH_SQS = [...A_TECH_SQS]
	.concat([...B_TECH_SQS])
	.concat([...C_TECH_SQS])
	.concat([...D_TECH_SQS])

var ALL_A_SQS = [...MAINLINE_A_SQS].concat([...A_TECH_SQS])
var ALL_B_SQS = [...MAINLINE_B_SQS].concat([...B_TECH_SQS])
var ALL_C_SQS = [...MAINLINE_C_SQS].concat([...C_TECH_SQS])
var ALL_D_SQS = [...MAINLINE_D_SQS].concat([...D_TECH_SQS])

// Componenet DATA

var MAIN_FACTORY_TILE_COMPONENT = [LOADING_BAY_KC_CORNER, LOADING_DOCK_KC, LOADING_DOCK_KC, LOADING_DOCK_KC, LOADING_DOCK_KC, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, LOADING_DOCK_INNER, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE]

var EXPANSION_FACTORY_TILE_COMPONENT = [LOADING_BAY_KC_CORNER, LOADING_DOCK_KC, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, LOADING_DOCK_INNER, LOADING_DOCK_INNER, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE, EMPTY_SPACE]

var MAINLINE_CAR_COMPONENT = [MAINLINE_CAR_SQ_CD, MAINLINE_CAR_SQ_D, MAINLINE_CAR_SQ_D, MAINLINE_CAR_SQ_BD, MAINLINE_CAR_SQ_C, MAINLINE_INNER_SQUARE, MAINLINE_INNER_SQUARE, MAINLINE_CAR_SQ_B, MAINLINE_CAR_SQ_AC, MAINLINE_CAR_SQ_A, MAINLINE_CAR_SQ_A, MAINLINE_CAR_SQ_AB]
var MAINLINE_TRUCK_COMPONENT = [MAINLINE_TRUCK_SQ_CD, MAINLINE_TRUCK_SQ_D, MAINLINE_TRUCK_SQ_D, MAINLINE_TRUCK_SQ_D, MAINLINE_TRUCK_SQ_D, MAINLINE_TRUCK_SQ_BD, MAINLINE_TRUCK_SQ_C, MAINLINE_INNER_SQUARE, MAINLINE_INNER_SQUARE, MAINLINE_INNER_SQUARE, MAINLINE_INNER_SQUARE, MAINLINE_TRUCK_SQ_B, MAINLINE_TRUCK_SQ_AC, MAINLINE_TRUCK_SQ_A, MAINLINE_TRUCK_SQ_A, MAINLINE_TRUCK_SQ_A, MAINLINE_TRUCK_SQ_A, MAINLINE_TRUCK_SQ_AB]
var MAINLINE_SPORTS_COMPONENT = [MAINLINE_SPORTS_SQ_CD, MAINLINE_SPORTS_SQ_D, MAINLINE_SPORTS_SQ_D, MAINLINE_SPORTS_SQ_D, MAINLINE_SPORTS_SQ_BD, MAINLINE_SPORTS_SQ_C, MAINLINE_INNER_SQUARE, MAINLINE_INNER_SQUARE, MAINLINE_INNER_SQUARE, MAINLINE_SPORTS_SQ_B, MAINLINE_SPORTS_SQ_AC, MAINLINE_SPORTS_SQ_A, MAINLINE_SPORTS_SQ_A, MAINLINE_SPORTS_SQ_A, MAINLINE_SPORTS_SQ_AB]

var ALL_MAINLINE_SQ = MAINLINE_CAR_COMPONENT.concat(MAINLINE_TRUCK_COMPONENT).concat(MAINLINE_SPORTS_COMPONENT)

var DEPARTMENT_RESEARCH_COMPONENT = new Array(9).fill(DEPARTMENT_RESEARCH_SQ)
var DEPARTMENT_PLANNING_COMPONENT = new Array(6).fill(DEPARTMENT_PLANNING_SQ)
const CHASSIS_COMPONENT = new Array(12).fill(CHASSIS_SQ)
var BODY_COMPONENT = new Array(12).fill(BODY_SQ)
var RADIATOR_COMPONENT = new Array(6).fill(RADIATOR_SQ)
var DOOR_COMPONENT = new Array(4).fill(DOOR_SQ)
var BUMPER_COMPONENT = new Array(4).fill(BUMPER_SQ)
var DASHBOARD_COMPONENT = new Array(8).fill(DASHBOARD_SQ)
var PAINT_COMPONENT = new Array(6).fill(PAINT_SQ)
var BATTERY_COMPONENT = new Array(4).fill(BATTERY_SQ)
var ENGINE_COMPONENT = new Array(16).fill(ENGINE_SQ)
var GEARS_COMPONENT = new Array(12).fill(GEARS_SQ)
var FUEL_TANK_COMPONENT = new Array(8).fill(FUEL_TANK_SQ)
var STEERING_WHEEL_COMPONENT = new Array(9).fill(STEERING_WHEEL_SQ)
var BRAKE_COMPONENT = new Array(4).fill(BRAKE_SQ)
var TIRE_COMPONENT = new Array(9).fill(TIRE_SQ)
var HEADLIGHT_COMPONENT = new Array(6).fill(HEADLIGHT_SQ)
var WINDSHIELD_COMPONENT = new Array(8).fill(WINDSHIELD_SQ)
var CLAXON_COMPONENT = new Array(4).fill(CLAXON_SQ)
var ARROW_DESIGN_A_COMPONENT = new Array(1).fill(ARROW_DESIGN_A_SQ)
var ARROW_DESIGN_B_COMPONENT = new Array(1).fill(ARROW_DESIGN_B_SQ)
var ARROW_DESIGN_C_COMPONENT = new Array(1).fill(ARROW_DESIGN_C)
var ARROW_DESIGN_D_COMPONENT = new Array(1).fill(ARROW_DESIGN_D_SQ)
var ARROW_REL_A_COMPONENT = new Array(1).fill(ARROW_REL_A_SQ)
var ARROW_REL_B_COMPONENT = new Array(1).fill(ARROW_REL_B_SQ)
var ARROW_REL_C_COMPONENT = new Array(1).fill(ARROW_REL_C_SQ)
var ARROW_SPD_B_COMPONENT = new Array(1).fill(ARROW_SPD_B_SQ)
var ARROW_SPD_C_COMPONENT = new Array(1).fill(ARROW_SPD_C_SQ)
var ARROW_SPD_D_COMPONENT = new Array(1).fill(ARROW_SPD_D_SQ)
var ARROW_SAFETY_A_COMPONENT = new Array(1).fill(ARROW_SAFETY_A_SQ)
var ARROW_SAFETY_B_COMPONENT = new Array(1).fill(ARROW_SAFETY_B_SQ)
var ARROW_SAFETY_D_COMPONENT = new Array(1).fill(ARROW_SAFETY_D_SQ)
var ARROW_RANGE_A_COMPONENT = new Array(1).fill(ARROW_RANGE_A_SQ)
var ARROW_RANGE_B_COMPONENT = new Array(1).fill(ARROW_RANGE_B_SQ)
var ARROW_RANGE_D_COMPONENT = new Array(1).fill(ARROW_RANGE_D_SQ)

var DEALERSHIP_RED_POMIGLIANO_COMPONENT = new Array(20).fill(DEALERSHIP_RED_POMIGLIANO_SQ)
var DEALERSHIP_RED_GRUGLIASCO_COMPONENT = new Array(16).fill(DEALERSHIP_RED_GRUGLIASCO_SQ)
var DEALERSHIP_RED_TORINO_COMPONENT = new Array(12).fill(DEALERSHIP_RED_TORINO_SQ)

var DEALERSHIP_GREEN_ELLESMERE_COMPONENT = new Array(20).fill(DEALERSHIP_GREEN_ELLESMERE_SQ)
var DEALERSHIP_GREEN_DUNSTABLE_COMPONENT = new Array(16).fill(DEALERSHIP_GREEN_DUNSTABLE_SQ)
var DEALERSHIP_GREEN_LUTON_COMPONENT = new Array(12).fill(DEALERSHIP_GREEN_LUTON_SQ)

var DEALERSHIP_PURPLE_AUDINCOURT_COMPONENT = new Array(20).fill(DEALERSHIP_PURPLE_AUDINCOURT_SQ)
var DEALERSHIP_PURPLE_FIVES_COMPONENT = new Array(16).fill(DEALERSHIP_PURPLE_FIVES_SQ)
var DEALERSHIP_PURPLE_SOCHAUX_COMPONENT = new Array(12).fill(DEALERSHIP_PURPLE_SOCHAUX_SQ)

var DEALERSHIP_BLUE_KANSAS_COMPONENT = new Array(20).fill(DEALERSHIP_BLUE_KANSAS_SQ)
var DEALERSHIP_BLUE_DEARBORN_COMPONENT = new Array(16).fill(DEALERSHIP_BLUE_DEARBORN_SQ)
var DEALERSHIP_BLUE_DETROIT_COMPONENT = new Array(12).fill(DEALERSHIP_BLUE_DETROIT_SQ)

var DEALERSHIP_YELLOW_STUTTGART_COMPONENT = new Array(20).fill(DEALERSHIP_YELLOW_STUTTGART_SQ)
//var DEALERSHIP_YELLOW_LADENBURG_COMPONENT = new Array(16).fill(DEALERSHIP_YELLOW_MANNHEIM_SQ);
//var DEALERSHIP_YELLOW_MANNHEIM_COMPONENT = new Array(12).fill(DEALERSHIP_YELLOW_LADENBURG_SQ);
var DEALERSHIP_YELLOW_LADENBURG_COMPONENT = new Array(16).fill(DEALERSHIP_YELLOW_LADENBURG_SQ)
var DEALERSHIP_YELLOW_MANNHEIM_COMPONENT = new Array(12).fill(DEALERSHIP_YELLOW_MANNHEIM_SQ)

var DEPARTMENT_MARKETING_RED_COMPONENT = new Array(12).fill(DEPARTMENT_MARKETING_RED_SQ)
var DEPARTMENT_MARKETING_GREEN_COMPONENT = new Array(12).fill(DEPARTMENT_MARKETING_GREEN_SQ)
var DEPARTMENT_MARKETING_PURPLE_COMPONENT = new Array(12).fill(DEPARTMENT_MARKETING_PURPLE_SQ)
var DEPARTMENT_MARKETING_BLUE_COMPONENT = new Array(12).fill(DEPARTMENT_MARKETING_BLUE_SQ)
var DEPARTMENT_MARKETING_YELLOW_COMPONENT = new Array(12).fill(DEPARTMENT_MARKETING_YELLOW_SQ)

function getComponentModelFromName(componentName) {
	if (componentName === MAINLINE_CAR) return MAINLINE_CAR_COMPONENT
	if (componentName === MAINLINE_TRUCK) return MAINLINE_TRUCK_COMPONENT
	if (componentName === MAINLINE_SPORTS) return MAINLINE_SPORTS_COMPONENT
	if (componentName === DEPARTMENT_RESEARCH) return DEPARTMENT_RESEARCH_COMPONENT
	if (componentName === DEPARTMENT_PLANNING) return DEPARTMENT_PLANNING_COMPONENT
	if (componentName === CHASSIS) return CHASSIS_COMPONENT
	if (componentName === BODY) return BODY_COMPONENT
	if (componentName === RADIATOR) return RADIATOR_COMPONENT
	if (componentName === DOOR) return DOOR_COMPONENT
	if (componentName === BUMPER) return BUMPER_COMPONENT
	if (componentName === DASHBOARD) return DASHBOARD_COMPONENT
	if (componentName === PAINT) return PAINT_COMPONENT
	if (componentName === BATTERY) return BATTERY_COMPONENT
	if (componentName === ENGINE) return ENGINE_COMPONENT
	if (componentName === GEARS) return GEARS_COMPONENT
	if (componentName === FUEL_TANK) return FUEL_TANK_COMPONENT
	if (componentName === STEERING_WHEEL) return STEERING_WHEEL_COMPONENT
	if (componentName === BRAKE) return BRAKE_COMPONENT
	if (componentName === TIRE) return TIRE_COMPONENT
	if (componentName === HEADLIGHT) return HEADLIGHT_COMPONENT
	if (componentName === WINDSHIELD) return WINDSHIELD_COMPONENT
	if (componentName === CLAXON) return CLAXON_COMPONENT
	if (componentName === ARROW_DESIGN_A) return ARROW_DESIGN_A_COMPONENT
	if (componentName === ARROW_DESIGN_B) return ARROW_DESIGN_B_COMPONENT
	if (componentName === ARROW_DESIGN_C) return ARROW_DESIGN_C_COMPONENT
	if (componentName === ARROW_DESIGN_D) return ARROW_DESIGN_D_COMPONENT
	if (componentName === ARROW_REL_A) return ARROW_REL_A_COMPONENT
	if (componentName === ARROW_REL_B) return ARROW_REL_B_COMPONENT
	if (componentName === ARROW_REL_C) return ARROW_REL_C_COMPONENT
	if (componentName === ARROW_SPD_B) return ARROW_SPD_B_COMPONENT
	if (componentName === ARROW_SPD_C) return ARROW_SPD_C_COMPONENT
	if (componentName === ARROW_SPD_D) return ARROW_SPD_D_COMPONENT
	if (componentName === ARROW_SAFETY_A) return ARROW_SAFETY_A_COMPONENT
	if (componentName === ARROW_SAFETY_B) return ARROW_SAFETY_B_COMPONENT
	if (componentName === ARROW_SAFETY_D) return ARROW_SAFETY_D_COMPONENT
	if (componentName === ARROW_RANGE_A) return ARROW_RANGE_A_COMPONENT
	if (componentName === ARROW_RANGE_B) return ARROW_RANGE_B_COMPONENT
	if (componentName === ARROW_RANGE_D) return ARROW_RANGE_D_COMPONENT

	if (componentName === DEALERSHIP_RED_POMIGLIANO) return DEALERSHIP_RED_POMIGLIANO_COMPONENT
	if (componentName === DEALERSHIP_RED_GRUGLIASCO) return DEALERSHIP_RED_GRUGLIASCO_COMPONENT
	if (componentName === DEALERSHIP_RED_TORINO) return DEALERSHIP_RED_TORINO_COMPONENT

	if (componentName === DEALERSHIP_GREEN_ELLESMERE) return DEALERSHIP_GREEN_ELLESMERE_COMPONENT
	if (componentName === DEALERSHIP_GREEN_DUNSTABLE) return DEALERSHIP_GREEN_DUNSTABLE_COMPONENT
	if (componentName === DEALERSHIP_GREEN_LUTON) return DEALERSHIP_GREEN_LUTON_COMPONENT

	if (componentName === DEALERSHIP_PURPLE_AUDINCOURT) return DEALERSHIP_PURPLE_AUDINCOURT_COMPONENT
	if (componentName === DEALERSHIP_PURPLE_FIVES) return DEALERSHIP_PURPLE_FIVES_COMPONENT
	if (componentName === DEALERSHIP_PURPLE_SOCHAUX) return DEALERSHIP_PURPLE_SOCHAUX_COMPONENT

	if (componentName === DEALERSHIP_BLUE_KANSAS) return DEALERSHIP_BLUE_KANSAS_COMPONENT
	if (componentName === DEALERSHIP_BLUE_DEARBORN) return DEALERSHIP_BLUE_DEARBORN_COMPONENT
	if (componentName === DEALERSHIP_BLUE_DETROIT) return DEALERSHIP_BLUE_DETROIT_COMPONENT

	if (componentName === DEALERSHIP_YELLOW_STUTTGART) return DEALERSHIP_YELLOW_STUTTGART_COMPONENT
	if (componentName === DEALERSHIP_YELLOW_LADENBURG) return DEALERSHIP_YELLOW_LADENBURG_COMPONENT
	if (componentName === DEALERSHIP_YELLOW_MANNHEIM) return DEALERSHIP_YELLOW_MANNHEIM_COMPONENT

	if (componentName === DEPARTMENT_MARKETING_RED) return DEPARTMENT_MARKETING_RED_COMPONENT
	if (componentName === DEPARTMENT_MARKETING_GREEN) return DEPARTMENT_MARKETING_GREEN_COMPONENT
	if (componentName === DEPARTMENT_MARKETING_PURPLE) return DEPARTMENT_MARKETING_PURPLE_COMPONENT
	if (componentName === DEPARTMENT_MARKETING_BLUE) return DEPARTMENT_MARKETING_BLUE_COMPONENT
	if (componentName === DEPARTMENT_MARKETING_YELLOW) return DEPARTMENT_MARKETING_YELLOW_COMPONENT
}

function getComponentNameFromSquare(square) {
	// CANNOT return floor tiles, as they could share index with an actual component!

	/*if (MAIN_FACTORY_TILE_COMPONENT.includes(square)) return FACTORY_MAIN_TILE;
    if (EXPANSION_FACTORY_TILE_COMPONENT.includes(square)) return FACTORY_EXPANSION_TILE;

    // NEED TO PREVENT WEIRD ERRORS
    if (square === OUT_OF_BOUNDS) return FACTORY_MAIN_TILE;*/

	if (MAINLINE_CAR_COMPONENT.includes(square)) return MAINLINE_CAR
	if (MAINLINE_TRUCK_COMPONENT.includes(square)) return MAINLINE_TRUCK
	if (MAINLINE_SPORTS_COMPONENT.includes(square)) return MAINLINE_SPORTS
	if (DEPARTMENT_RESEARCH_COMPONENT.includes(square)) return DEPARTMENT_RESEARCH
	if (DEPARTMENT_PLANNING_COMPONENT.includes(square)) return DEPARTMENT_PLANNING
	if (CHASSIS_COMPONENT.includes(square)) return CHASSIS
	if (BODY_COMPONENT.includes(square)) return BODY
	if (RADIATOR_COMPONENT.includes(square)) return RADIATOR
	if (DOOR_COMPONENT.includes(square)) return DOOR
	if (BUMPER_COMPONENT.includes(square)) return BUMPER
	if (DASHBOARD_COMPONENT.includes(square)) return DASHBOARD
	if (PAINT_COMPONENT.includes(square)) return PAINT
	if (BATTERY_COMPONENT.includes(square)) return BATTERY
	if (ENGINE_COMPONENT.includes(square)) return ENGINE
	if (GEARS_COMPONENT.includes(square)) return GEARS
	if (FUEL_TANK_COMPONENT.includes(square)) return FUEL_TANK
	if (STEERING_WHEEL_COMPONENT.includes(square)) return STEERING_WHEEL
	if (BRAKE_COMPONENT.includes(square)) return BRAKE
	if (TIRE_COMPONENT.includes(square)) return TIRE
	if (HEADLIGHT_COMPONENT.includes(square)) return HEADLIGHT
	if (WINDSHIELD_COMPONENT.includes(square)) return WINDSHIELD
	if (CLAXON_COMPONENT.includes(square)) return CLAXON
	if (ARROW_DESIGN_A_COMPONENT.includes(square)) return ARROW_DESIGN_A
	if (ARROW_DESIGN_B_COMPONENT.includes(square)) return ARROW_DESIGN_B
	if (ARROW_DESIGN_C_COMPONENT.includes(square)) return ARROW_DESIGN_C
	if (ARROW_DESIGN_D_COMPONENT.includes(square)) return ARROW_DESIGN_D
	if (ARROW_REL_A_COMPONENT.includes(square)) return ARROW_REL_A
	if (ARROW_REL_B_COMPONENT.includes(square)) return ARROW_REL_B
	if (ARROW_REL_C_COMPONENT.includes(square)) return ARROW_REL_C
	if (ARROW_SPD_B_COMPONENT.includes(square)) return ARROW_SPD_B
	if (ARROW_SPD_C_COMPONENT.includes(square)) return ARROW_SPD_C
	if (ARROW_SPD_D_COMPONENT.includes(square)) return ARROW_SPD_D
	if (ARROW_SAFETY_A_COMPONENT.includes(square)) return ARROW_SAFETY_A
	if (ARROW_SAFETY_B_COMPONENT.includes(square)) return ARROW_SAFETY_B
	if (ARROW_SAFETY_D_COMPONENT.includes(square)) return ARROW_SAFETY_D
	if (ARROW_RANGE_A_COMPONENT.includes(square)) return ARROW_RANGE_A
	if (ARROW_RANGE_B_COMPONENT.includes(square)) return ARROW_RANGE_B
	if (ARROW_RANGE_D_COMPONENT.includes(square)) return ARROW_RANGE_D

	if (DEALERSHIP_RED_POMIGLIANO_COMPONENT.includes(square)) return DEALERSHIP_RED_POMIGLIANO
	if (DEALERSHIP_RED_GRUGLIASCO_COMPONENT.includes(square)) return DEALERSHIP_RED_GRUGLIASCO
	if (DEALERSHIP_RED_TORINO_COMPONENT.includes(square)) return DEALERSHIP_RED_TORINO

	if (DEALERSHIP_GREEN_ELLESMERE_COMPONENT.includes(square)) return DEALERSHIP_GREEN_ELLESMERE
	if (DEALERSHIP_GREEN_DUNSTABLE_COMPONENT.includes(square)) return DEALERSHIP_GREEN_DUNSTABLE
	if (DEALERSHIP_GREEN_LUTON_COMPONENT.includes(square)) return DEALERSHIP_GREEN_LUTON

	if (DEALERSHIP_PURPLE_AUDINCOURT_COMPONENT.includes(square)) return DEALERSHIP_PURPLE_AUDINCOURT
	if (DEALERSHIP_PURPLE_FIVES_COMPONENT.includes(square)) return DEALERSHIP_PURPLE_FIVES
	if (DEALERSHIP_PURPLE_SOCHAUX_COMPONENT.includes(square)) return DEALERSHIP_PURPLE_SOCHAUX

	if (DEALERSHIP_BLUE_KANSAS_COMPONENT.includes(square)) return DEALERSHIP_BLUE_KANSAS
	if (DEALERSHIP_BLUE_DEARBORN_COMPONENT.includes(square)) return DEALERSHIP_BLUE_DEARBORN
	if (DEALERSHIP_BLUE_DETROIT_COMPONENT.includes(square)) return DEALERSHIP_BLUE_DETROIT

	if (DEALERSHIP_YELLOW_STUTTGART_COMPONENT.includes(square)) return DEALERSHIP_YELLOW_STUTTGART
	if (DEALERSHIP_YELLOW_LADENBURG_COMPONENT.includes(square)) return DEALERSHIP_YELLOW_LADENBURG
	if (DEALERSHIP_YELLOW_MANNHEIM_COMPONENT.includes(square)) return DEALERSHIP_YELLOW_MANNHEIM

	if (DEPARTMENT_MARKETING_RED_COMPONENT.includes(square)) return DEPARTMENT_MARKETING_RED
	if (DEPARTMENT_MARKETING_GREEN_COMPONENT.includes(square)) return DEPARTMENT_MARKETING_GREEN
	if (DEPARTMENT_MARKETING_PURPLE_COMPONENT.includes(square)) return DEPARTMENT_MARKETING_PURPLE
	if (DEPARTMENT_MARKETING_BLUE_COMPONENT.includes(square)) return DEPARTMENT_MARKETING_BLUE
	if (DEPARTMENT_MARKETING_YELLOW_COMPONENT.includes(square)) return DEPARTMENT_MARKETING_YELLOW

	// THIS NEEDS TO BE -100 OR LOWER, TO REPRESENT NO COMPONENT TILE FOUND
	return -100
}

var NOT_ADJACENT_LOADING_BAY = 0
var NOT_ADJ_TO_DEALERSHIP = 1
var NOT_ADJ_MAINLINE = 2
var DUPLICATE_TECH = 3
var NO_CONNECTED_ARROW = 4
var NO_MAINLINE_CONNECTION = 5
var UNKNOWN = 6
var TURN_0_ERROR = 7

var COMPONENT_ERROR_STRING = [
	gettext("No connection to loading bay"), //0
	gettext("Not Adjacent to Dealership"), //1
	gettext("Not Adjacent to Mainline"), //2
	gettext("Duplicate Tech in Connection"), //3
	gettext("No Spec Indicator Attached"), //4
	gettext("No connection to Mainline"), //5
	gettext("Unknown"), //6
	gettext("You must place One Research Department and One Planning Department"), //7
]

// Selling phase skips
var SKIP_NO_DEALERSHUPS = 0
var SKIP_NO_STOCK = 1
var SKIP_NO_MIN_SPEC = 2
var SKIP_NO_SELLING_SQUARES = 3
var SKIP_BOT = 4
var SKIP_SINGLE_SALE = 5
var skipStrings = [gettext("No Dealerships"), gettext("No stock"), gettext("No Min Spec Dealerships"), gettext("No more sales possible"), gettext("Bot player"), gettext("Final sale processed automatically")]

/* Other images */
var MARKET_BOARD = 0

var PHASE_FACTORY_SETUP = 0
var PHASE_RESEARCH = 1
var PHASE_SET_FOCUS = 2
var PHASE_BUILD_FACTORY = 3
var PHASE_PRINT_SALES_BROCHURES = 4
var PHASE_SELL = 5
var PHASE_GAME_END_CHECK = 6
var PHASE_ADVANCE_EXPECTATIONS = 7
var PHASE_GROW_DEMANDS = 8

var MARKET_BOARD_PHASES = [PHASE_RESEARCH, PHASE_SET_FOCUS, PHASE_GROW_DEMANDS, PHASE_SELL]

var PHASES_STR = [gettext("Factory Setup"), gettext("Research"), gettext("Set Focus"), gettext("Build Factory"), gettext("Print Sales Brochures"), gettext("Sell"), gettext("Game End"), gettext("Increase Expectations"), gettext("Grow Demands")]

const PRICE_BAND_0_SQS = [32, 40, 41, 48, 49, 50, 56, 57, 58, 59]
const PRICE_BAND_1_SQS = [0, 8, 9, 16, 17, 18, 24, 25, 26, 27, 33, 34, 35, 36, 42, 43, 44, 45, 51, 52, 53, 54, 60, 61, 62, 63]
const PRICE_BAND_2_SQS = [1, 2, 3, 4, 10, 11, 12, 13, 19, 20, 21, 22, 28, 29, 30, 31, 37, 38, 39, 46, 47, 55]
const PRICE_BAND_3_SQS = [5, 6, 7, 14, 15, 23]

function getTechTrackSectionHoverInfo(colour, position) {
	if (position === 0) return ""
	if (colour === YELLOW) {
		// Safety
		if (position === 1) return gettext("B - Brake\n2 x 2")
		if (position === 2) return gettext("D - Windshield\n4 x 2")
		if (position === 3) return gettext("B - Steering Wheel\n3 x 3\nAlso Design 6")
		if (position === 4) return gettext("A - Bumper\n4 x 1\nAlso Reliability 4")
		if (position === 5) return gettext("D - Headlights\n2 x 3\nAlso Design 3")
		if (position === 6) return gettext("D - Tire\n3 x 3\nAlso Range 3 Speed 4")
	} else if (colour === BLUE) {
		// Reliability
		if (position === 1) return gettext("C - Battery\n2 x 2")
		if (position === 2) return gettext("A - Chassis\n3 x 4\nAlso Reliability 6")
		if (position === 3) return gettext("A - Body\n3 x 3\nAlso Design 5")
		if (position === 4) return gettext("A - Bumper\n4 x 1\nAlso Safety 4")
		if (position === 5) return gettext("B - Engine\n4 x 4\nAlso Speed 1 Range 1")
		if (position === 6) return gettext("A - Chassis\n3 x 4\nAlso Reliability 2")
	} else if (colour === GREEN) {
		// Range
		if (position === 1) return gettext("B - Engine\n4 x 4\nAlso Speed 1 Reliability 5")
		if (position === 2) return gettext("A - Radiator\n2 x 3\nAlso Range 5")
		if (position === 3) return gettext("D - Tire\n3 x 3\nAlso Speed 4 Safety 6")
		if (position === 4) return gettext("B - Fuel Tank\n4 x 2\nAlso Speed 5")
		if (position === 5) return gettext("A - Radiator\n2 x 3\nAlso Range 2")
		if (position === 6) return gettext("B - Gears\n3 x 4\nAlso Speed 3")
	} else if (colour === RED) {
		// Speed
		if (position === 1) return gettext("B - Engine\n4 x 4\nAlso Range 1 Reliability 5")
		if (position === 2) return gettext("D - Claxon\n2 x 2")
		if (position === 3) return gettext("B - Gears\n3 x 4\nAlso Range 6")
		if (position === 4) return gettext("D - Tire\n3 x 3\nAlso Range 3 Safety 6")
		if (position === 5) return gettext("B - Fuel Tank\n4 x 2\nAlso Range 4")
		if (position === 6) return gettext("C - Dashboard\n4 x 2\nAlso Design 4")
	} else if (colour === PURPLE) {
		// Design
		if (position === 1) return gettext("C - Paint\n2 x 3")
		if (position === 2) return gettext("A - Door\n2 x 2")
		if (position === 3) return gettext("D - Headlights\n2 x 3\nAlso Safety 5")
		if (position === 4) return gettext("C - Dashboard\n4 x 2\nAlso Speed 6")
		if (position === 5) return gettext("A - Body\n3 x 3\nAlso Reliability 3")
		if (position === 6) return gettext("B - Steering Wheel\n3 x 3\nAlso Safety 3")
	}

	return ""
}

const neutralCard0 = [0, 3, 4]
const neutralCard1 = [1, 2, 3]
const neutralCard2 = [0, 2, 3]
const neutralCard3 = [2, 3, 3]
const neutralCard4 = [1, 3, 3]
const neutralCard5 = [0, 1, 3]
const neutralCard6 = [0, 3, 3]

const blueCard10 = [0, [2, 3, 1]] // B0
const blueCard11 = [0, [2, 3, 0]] // B1
const blueCard12 = [0, [3, 2, 2]] // B2
const blueCard13 = [1, [1, 3, 0]] // B3

const blueCard20 = [0, [0, 2, 0], [1, 2, 0]] // B4
const blueCard21 = [1, [1, 2, 1]] // B5
const blueCard22 = [2, [1, 0, 2]] // B6
const blueCard23 = [2, [0, 0, 1], [0, 2, 1]] // B7
const blueCard24 = [2, [1, 2, 0], [2, 1, 0]] // B8
const blueCard25 = [4] // B9

const blueCard30 = [0, [0, 3, 0], [3, 1, 0], [3, 2, 0]] // B10
const blueCard31 = [1, [0, 2, 0], [3, 0, 2], [2, 1, 2]] // B11
const blueCard32 = [1, [1, 3, 1], [2, 2, 1], [3, 3, 1]] // B12
const blueCard33 = [3, [0, 1, 1], [0, 3, 1], [1, 1, 1]] // B13
const blueCard34 = [3, [1, 2, 0], [2, 0, 2], [3, 1, 2]] // B14
const blueCard35 = [3, [1, 1, 0], [1, 3, 0], [2, 3, 0]] // B15

const blueCard40 = [1, [2, 0, 0], [2, 1, 0], [3, 0, 0], [3, 0, 0]] // B16

const greenCard10 = [0, [1, 0, 2]] // G0
const greenCard11 = [0, [2, 2, 0]] // G1
const greenCard12 = [0, [2, 2, 1]] // G2
const greenCard13 = [1, [1, 2, 0]] // G3

const greenCard20 = [0, [0, 3, 0], [1, 3, 0]] // G4
const greenCard21 = [1, [0, 2, 1]] // G5
const greenCard22 = [2, [3, 2, 2]] // G6
const greenCard23 = [2, [0, 1, 1], [0, 3, 1]] // G7
const greenCard24 = [2, [2, 0, 0], [1, 1, 0]] // G8
const greenCard25 = [4] // G9

const greenCard30 = [0, [3, 0, 0], [3, 1, 0], [0, 2, 0]] // G10
const greenCard31 = [1, [3, 0, 2], [2, 1, 2], [1, 3, 0]] // G11
const greenCard32 = [1, [0, 0, 1], [1, 1, 1], [1, 2, 1]] // G12
const greenCard33 = [3, [0, 0, 0], [1, 2, 0], [2, 2, 0]] // G13
const greenCard34 = [3, [2, 0, 2], [3, 1, 2], [0, 3, 0]] // G14
const greenCard35 = [3, [1, 3, 1], [2, 3, 1], [3, 3, 1]] // G15

const greenCard40 = [1, [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 1, 0]] // G16

const purpleCard10 = [0, [3, 2, 2]] // P0
const purpleCard11 = [0, [1, 1, 0]] // P1
const purpleCard12 = [0, [2, 3, 1]] // P2
const purpleCard13 = [1, [1, 2, 0]] // P3

const purpleCard20 = [0, [0, 2, 0], [0, 3, 0]] // P4
const purpleCard21 = [1, [1, 3, 1]] // P5
const purpleCard22 = [2, [1, 0, 2]] // P6
const purpleCard23 = [2, [1, 1, 1], [0, 3, 1]] // P7
const purpleCard24 = [2, [3, 1, 0], [2, 2, 0]] // P8
const purpleCard25 = [4] // P9

const purpleCard30 = [0, [1, 0, 0], [2, 0, 0], [1, 3, 0]] // P10
const purpleCard31 = [1, [3, 0, 2], [2, 1, 2], [0, 3, 0]] // P11
const purpleCard32 = [1, [1, 2, 1], [2, 2, 1], [3, 3, 1]] // P12
const purpleCard33 = [3, [1, 1, 0], [1, 2, 0], [3, 3, 0]] // P13
const purpleCard34 = [3, [2, 0, 2], [3, 1, 2], [0, 2, 0]] // P14
const purpleCard35 = [3, [0, 0, 1], [0, 1, 1], [0, 2, 1]] // P15

const purpleCard40 = [1, [3, 0, 0], [2, 1, 0], [3, 1, 0], [3, 1, 0]] // P16

const redCard10 = [0, [3, 2, 2]] // R0
const redCard11 = [0, [0, 1, 0]] // R1
const redCard12 = [0, [0, 1, 1]] // R2
const redCard13 = [1, [0, 2, 0]] // R3

const redCard20 = [0, [1, 2, 0], [1, 3, 0]] // R4
const redCard21 = [1, [1, 2, 1]] // R5
const redCard22 = [2, [1, 0, 2]] // R6
const redCard23 = [2, [1, 3, 1], [3, 3, 1]] // R7
const redCard24 = [2, [3, 2, 0], [2, 3, 0]] // R8
const redCard25 = [4] // R9

const redCard30 = [0, [3, 0, 0], [3, 1, 0], [0, 3, 0]] // R10
const redCard31 = [1, [3, 0, 2], [2, 1, 2], [1, 2, 0]] // R11
const redCard32 = [1, [0, 0, 1], [1, 1, 1], [0, 2, 1]] // R12
const redCard33 = [3, [0, 1, 0], [0, 2, 0], [2, 3, 0]] // R13
const redCard34 = [3, [2, 0, 2], [3, 1, 2], [1, 3, 0]] // R14
const redCard35 = [3, [0, 3, 1], [2, 2, 1], [2, 3, 1]] // R15

const redCard40 = [1, [1, 0, 0], [2, 0, 0], [2, 0, 0], [2, 1, 0]] // R16

const yellowCard10 = [0, [2, 3, 0]] // Y0
const yellowCard11 = [0, [1, 1, 1]] // Y1
const yellowCard12 = [0, [1, 0, 2]] // Y2
const yellowCard13 = [1, [1, 3, 0]] // Y3

const yellowCard20 = [0, [0, 2, 0], [1, 2, 0]] // Y4
const yellowCard21 = [1, [0, 2, 1]] // Y5
const yellowCard22 = [2, [0, 3, 1], [2, 3, 1]] // Y6
const yellowCard23 = [2, [1, 0, 0], [0, 1, 0]] // Y7
const yellowCard24 = [2, [3, 2, 2]] // Y8
const yellowCard25 = [4] // Y9

const yellowCard30 = [0, [0, 3, 0], [2, 0, 0], [3, 0, 0]] // Y10
const yellowCard31 = [1, [0, 0, 1], [0, 1, 1], [1, 2, 1]] // Y11
const yellowCard32 = [1, [3, 0, 2], [2, 1, 2], [1, 2, 0]] // Y12
const yellowCard33 = [3, [0, 1, 0], [1, 3, 0], [2, 3, 0]] // Y13
const yellowCard34 = [3, [2, 0, 2], [3, 1, 2], [0, 2, 0]] // Y14
const yellowCard35 = [3, [1, 3, 1], [2, 2, 1], [3, 3, 1]] // Y15

const yellowCard40 = [1, [2, 1, 0], [2, 1, 0], [3, 1, 0], [3, 2, 0]] // Y16

const PLAYER_CARDS_WITH_CARS_STR = ["B1", "B3", "B4", "B8", "B10", "B11", "B14", "B15", "B16", "G1", "G3", "G4", "G8", "G10", "G11", "G13", "G14", "G16", "P1", "P3", "P4", "P8", "P10", "P11", "P13", "P14", "P16", "R1", "R3", "R4", "R8", "R10", "R11", "R13", "R14", "R16", "Y0", "Y3", "Y4", "Y7", "Y10", "Y12", "Y13", "Y14", "Y16"]
const PLAYER_CARDS_WITH_TRUCKS_STR = ["B0", "B5", "B7", "B12", "B13", "G2", "G5", "G7", "G12", "G15", "P2", "P5", "P7", "P12", "P15", "R2", "R5", "R7", "R12", "R15", "Y1", "Y5", "Y6", "Y11", "Y15"]
const PLAYER_CARDS_WITH_SPORTS_STR = ["B2", "B6", "B11", "B14", "G0", "G6", "G11", "G14", "P0", "P6", "P11", "P14", "R0", "R6", "R11", "R14", "Y2", "Y8", "Y12", "Y14"]

function getCardDataFromCardName(cardName) {
	if (cardName === "R0") return redCard10
	if (cardName === "R1") return redCard11
	if (cardName === "R2") return redCard12
	if (cardName === "R3") return redCard13

	if (cardName === "R4") return redCard20
	if (cardName === "R5") return redCard21
	if (cardName === "R6") return redCard22
	if (cardName === "R7") return redCard23
	if (cardName === "R8") return redCard24
	if (cardName === "R9") return redCard25

	if (cardName === "R10") return redCard30
	if (cardName === "R11") return redCard31
	if (cardName === "R12") return redCard32
	if (cardName === "R13") return redCard33
	if (cardName === "R14") return redCard34
	if (cardName === "R15") return redCard35

	if (cardName === "R16") return redCard40
	/* */
	if (cardName === "G0") return greenCard10
	if (cardName === "G1") return greenCard11
	if (cardName === "G2") return greenCard12
	if (cardName === "G3") return greenCard13

	if (cardName === "G4") return greenCard20
	if (cardName === "G5") return greenCard21
	if (cardName === "G6") return greenCard22
	if (cardName === "G7") return greenCard23
	if (cardName === "G8") return greenCard24
	if (cardName === "G9") return greenCard25

	if (cardName === "G10") return greenCard30
	if (cardName === "G11") return greenCard31
	if (cardName === "G12") return greenCard32
	if (cardName === "G13") return greenCard33
	if (cardName === "G14") return greenCard34
	if (cardName === "G15") return greenCard35

	if (cardName === "G16") return greenCard40
	/* */
	if (cardName === "P0") return purpleCard10
	if (cardName === "P1") return purpleCard11
	if (cardName === "P2") return purpleCard12
	if (cardName === "P3") return purpleCard13

	if (cardName === "P4") return purpleCard20
	if (cardName === "P5") return purpleCard21
	if (cardName === "P6") return purpleCard22
	if (cardName === "P7") return purpleCard23
	if (cardName === "P8") return purpleCard24
	if (cardName === "P9") return purpleCard25

	if (cardName === "P10") return purpleCard30
	if (cardName === "P11") return purpleCard31
	if (cardName === "P12") return purpleCard32
	if (cardName === "P13") return purpleCard33
	if (cardName === "P14") return purpleCard34
	if (cardName === "P15") return purpleCard35

	if (cardName === "P16") return purpleCard40
	/* */
	if (cardName === "B0") return blueCard10
	if (cardName === "B1") return blueCard11
	if (cardName === "B2") return blueCard12
	if (cardName === "B3") return blueCard13

	if (cardName === "B4") return blueCard20
	if (cardName === "B5") return blueCard21
	if (cardName === "B6") return blueCard22
	if (cardName === "B7") return blueCard23
	if (cardName === "B8") return blueCard24
	if (cardName === "B9") return blueCard25

	if (cardName === "B10") return blueCard30
	if (cardName === "B11") return blueCard31
	if (cardName === "B12") return blueCard32
	if (cardName === "B13") return blueCard33
	if (cardName === "B14") return blueCard34
	if (cardName === "B15") return blueCard35

	if (cardName === "B16") return blueCard40
	/* */
	if (cardName === "Y0") return yellowCard10
	if (cardName === "Y1") return yellowCard11
	if (cardName === "Y2") return yellowCard12
	if (cardName === "Y3") return yellowCard13

	if (cardName === "Y4") return yellowCard20
	if (cardName === "Y5") return yellowCard21
	if (cardName === "Y6") return yellowCard22
	if (cardName === "Y7") return yellowCard23
	if (cardName === "Y8") return yellowCard24
	if (cardName === "Y9") return yellowCard25

	if (cardName === "Y10") return yellowCard30
	if (cardName === "Y11") return yellowCard31
	if (cardName === "Y12") return yellowCard32
	if (cardName === "Y13") return yellowCard33
	if (cardName === "Y14") return yellowCard34
	if (cardName === "Y15") return yellowCard35

	if (cardName === "Y16") return yellowCard40
}

function getCorrectedDealershipColour(dealershipName, colour) {
	var newColour = getCorrectedColour(colour)
	if (newColour === colour) return dealershipName
	else {
		var difference = newColour - colour
		return dealershipName + difference * 3
	}
}

function getCorrectedMarketingDepartmentColour(marketingDepartmentName, colour) {
	var newColour = getCorrectedColour(colour)
	if (newColour === colour) return marketingDepartmentName
	else {
		var difference = newColour - colour
		return marketingDepartmentName + difference
	}
}

function getNeutralCardImage(CardID) {
	var img = $("<img>")
	if (CardID === "card0") img.attr("src", imagePreURL + "/Cards/card_N_0.jpg")
	else if (CardID === "card1") img.attr("src", imagePreURL + "/Cards/card_N_1.jpg")
	else if (CardID === "card2") img.attr("src", imagePreURL + "/Cards/card_N_2.jpg")
	else if (CardID === "card3") img.attr("src", imagePreURL + "/Cards/card_N_3.jpg")
	else if (CardID === "card4") img.attr("src", imagePreURL + "/Cards/card_N_4.jpg")
	else if (CardID === "card5") img.attr("src", imagePreURL + "/Cards/card_N_5.jpg")
	else if (CardID === "card6") img.attr("src", imagePreURL + "/Cards/card_N_6.jpg")
	return img
}

function getCorrectedCardImage(correctedCardID) {
	var img = $("<img>")

	// cardP00_Y
	//card_P_10_Y

	var oldLetter = correctedCardID.slice(4, 5)
	var newLetter = correctedCardID.slice(8)

	var oldID = correctedCardID.slice(5, 7)
	var visID
	if (oldID === "00") visID = "10"
	if (oldID === "01") visID = "11"
	if (oldID === "02") visID = "12"
	if (oldID === "03") visID = "13"
	if (oldID === "04") visID = "20"
	if (oldID === "05") visID = "21"
	if (oldID === "06") visID = "22"
	if (oldID === "07") visID = "23"
	if (oldID === "08") visID = "24"
	if (oldID === "09") visID = "25"
	if (oldID === "10") visID = "30"
	if (oldID === "11") visID = "31"
	if (oldID === "12") visID = "32"
	if (oldID === "13") visID = "33"
	if (oldID === "14") visID = "34"
	if (oldID === "15") visID = "35"
	if (oldID === "16") visID = "40"

	var fileName = "card_" + oldLetter + "_" + visID + "_" + newLetter

	img.attr("src", imagePreURL + "/Cards/" + fileName + ".jpg")

	return img
}

function getPlayerHexColourFromNumber(col) {
	var ret = "#ffffff"
	if (col === RED) ret = "#E83435"
	else if (col === GREEN) ret = "#70C96B"
	else if (col === PURPLE) ret = "#8E63B3"
	else if (col === BLUE) ret = "#435EB5"
	else if (col === YELLOW) ret = "#EECD30"
	return ret
}

function getCardIDcorrectedFromColourAndNumber(colour, cardNumber, returnCorrected) {
	var letterOriginal
	if (colour === RED) letterOriginal = "R"
	if (colour === GREEN) letterOriginal = "G"
	if (colour === PURPLE) letterOriginal = "P"
	if (colour === BLUE) letterOriginal = "B"
	if (colour === YELLOW) letterOriginal = "Y"

	var cardID = "card" + letterOriginal + String(cardNumber)
	if (!returnCorrected) return cardID

	var correctedColour = getCorrectedColour(colour)
	if (correctedColour === RED) letterNew = "R"
	if (correctedColour === GREEN) letterNew = "G"
	if (correctedColour === PURPLE) letterNew = "P"
	if (correctedColour === BLUE) letterNew = "B"
	if (correctedColour === YELLOW) letterNew = "Y"

	var cardNumberString = String(cardNumber)
	if (cardNumber < 10) cardNumberString = "0" + String(cardNumber)

	var CardIDcorrected = "card" + letterOriginal + cardNumberString + "_" + letterNew
	return CardIDcorrected
}

/**
	Class representing an FCM player
	@class
	@param {string} name
	@param {number} colour
*/
Player = function (n, c, i, d) {
	this.name = n;
	this.originalName = n;
	this.colour = c;
	this.factory = new Factory();
	// ADD IN PLAYER CARDS - remove disallowed ones later
	this.playerCards = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
	this.gantt = 0;
	this.money = 0;
	this.arrayPos = i;
	//this.autoplay = false;
	this.displayName = d;
};

Player.import = function (tab) {
	var p = new Player(0, 0, 0);
	if (tab != undefined && tab.length > 0) {
		p.factory = Factory.import(tab[0]);
		p.name = tab[1];
		p.colour = tab[2];
		p.playerCards = tab[3];
		p.gantt = tab[4];
		p.money = tab[5];
		p.arrayPos = tab[6];
		if (tab[7] === 1) p.autoplay = true;
		else p.autoplay = false;
		if (tab[8] != undefined) p.originalName = tab[8];
		else p.originalName = p.name;
		if (tab[8] != undefined) p.displayName = tab[9];
		else p.displayName = undefined;
	}
	return p;
};

Player.prototype.export = function () {
	var res = [];

	// 0
	res.push(this.factory.export());

	// 1
	res.push(this.name);

	// 2
	res.push(this.colour);

	// 3
	res.push(this.playerCards);

	// 4
	res.push(this.gantt);

	// 5
	res.push(this.money);

	// 6
	res.push(this.arrayPos);

	// 7
	if (this.autoplay === true) res.push(1);
	else res.push(0);

	// 8
	res.push(this.originalName);

	// 9
	res.push(this.displayName);

	return res;
};

















/** 
	
	  @module Rules
	  isSimulOhase
	  canPlay
	  getNumberOfResearchPoints
	  getNumberOfPlanningOffices
	  getMinSpecsInOrder
	  isDealershipSuitableToDisplay
	  canSkipCurrentSellingPlayer
	  setCurrentMarketBoardPrices
	  playNeutralCards
	  playSingleNeutralCard
	  getAllowedTechOnOneTrack
	  getNativelyAllowedTechLevels
	  getAllowedTechLevels
	  getEligibleFactoryComponentNames
	  canResign
	  anyBotPlayers

 */
var Rules = (function () {
	var self = {}

	self.isSimulPhase = function () {
		if (M.trainingGame) return false
		if (M.gameFlow.turn === 0) return true
		else if (M.gameFlow.phase === PHASE_BUILD_FACTORY) return true
		return false
	}

	self.canPlay = function () {
		if (global.haltPlay === true) return false
		if (global.name === "BotKickStarter") {
			M.gameFlow.currentPlayer = global.pov
			return true
		}
		//return true;
		if (global.superuser) return true
		if (global.pov == undefined) return false
		if (global.pov < 0) return false
		if (M.trainingGame) return true

		if (!self.isSimulPhase()) {
			M.gameFlow.currentPlayer = M.gameFlow.turnOrder[0]
			if (global.pov === M.gameFlow.currentPlayer) return true
			return false
		}
		if (self.isSimulPhase()) {
			M.gameFlow.currentPlayer = global.pov
			// if you have a move, can't move
			if (M.gameFlow.turn === 0) {
				if (global.move != undefined && global.move.turn == M.gameFlow.turn && global.move.phase == M.gameFlow.phase) return false
				if (M.gameFlow.turnOrder.indexOf(global.pov) !== -1) return true
			} else {
				if (global.justMoved) return false
				if (global.move != undefined && global.move.turn == M.gameFlow.turn && global.move.phase == M.gameFlow.phase && !global.currentPlayers.indexOf(global.name) == 0) return false
				if (global.currentPlayers.indexOf(global.name) > -1) return true
			}
		}
		return false
	}

	self.getNumberOfResearchPoints = function (player) {
		if (global.debug) return 99
		var res = 0
		for (var i = 0; i < player.factory.factoryComponents.length; i++) {
			if (player.factory.factoryComponents[i][0] === DEPARTMENT_RESEARCH) res++
		}
		res -= M.piecesUsedInResearch.length
		return res
	}

	self.getNumberOfPlanningOffices = function (player) {
		var res = 0
		for (var i = 0; i < player.factory.factoryComponents.length; i++) {
			if (player.factory.factoryComponents[i][0] === DEPARTMENT_PLANNING) res++
		}
		return res
	}

	self.getMinSpecsInOrder = function () {
		var res = [0, 0, 0, 0, 0]
		for (var i = 0; i < M.techTracks.length; i++) {
			if (M.techTracks[i][7][0] === RED) res[RED] = M.techTracks[i][7][1]
			if (M.techTracks[i][7][0] === GREEN) res[GREEN] = M.techTracks[i][7][1]
			if (M.techTracks[i][7][0] === PURPLE) res[PURPLE] = M.techTracks[i][7][1]
			if (M.techTracks[i][7][0] === BLUE) res[BLUE] = M.techTracks[i][7][1]
			if (M.techTracks[i][7][0] === YELLOW) res[YELLOW] = M.techTracks[i][7][1]
		}

		return res
	}

	self.removeFCIATTcomponentsFromPlay = function (factory) {
		var expansionCollapsed = false
		for (var i = 0; i < factory.factoryComponenetIndexesAddedThisTurn.length; i++) {
			// find component in factory
			let index = _.findIndex(
				factory.factoryComponents,
				function (el) {
					return el[1] == factory.factoryComponenetIndexesAddedThisTurn[i]
				},
				this
			)
			// If not found, the factory may be in a post-expansion state (NODATASFWET saved after
			// expansion ran). Remove the most recent expansion tile from the grid, then collapse
			// back to pre-expansion once and retry.
			if (index === -1 && !expansionCollapsed && factory.factoryExpansions.length > 0) {
				console.log("Removing expansion tile from grid")
				var lastExp = factory.factoryExpansions[factory.factoryExpansions.length - 1]
				var expIndex = lastExp[0]
				var expRotation = lastExp[1]
				var tableWidth = DIMENSIONS[FACTORY_EXPANSION_TILE][0]
				var tableHeight = DIMENSIONS[FACTORY_EXPANSION_TILE][1]
				if (expRotation % 2 === 1) {
					tableWidth = DIMENSIONS[FACTORY_EXPANSION_TILE][1]
					tableHeight = DIMENSIONS[FACTORY_EXPANSION_TILE][0]
				}
				for (var ey = 0; ey < tableHeight; ey++) {
					for (var ex = expIndex; ex < expIndex + tableWidth; ex++) {
						factory.factoryCoords[ex + ey * factory.width] = OUT_OF_BOUNDS
					}
				}
				factory.factoryExpansions.pop()
				factory.collapseFactoryAfterExpansion()
				expansionCollapsed = true
				index = _.findIndex(
					factory.factoryComponents,
					function (el) {
						return el[1] == factory.factoryComponenetIndexesAddedThisTurn[i]
					},
					this
				)
			}
			// If still not found after collapse attempt, skip to avoid a crash
			if (index === -1) {
				console.log("Component not found in factory:", factory.factoryComponenetIndexesAddedThisTurn[i])
				continue
			}
			// get the name
			var componentName = factory.factoryComponents[index][0]
			// remove from available
			M.availableComponents[componentName]--
		}
	}

	self.isDealershipSuitableToDisplay = function (player, dealership, allowDuds) {
		var p = player

		// If no vehicles available to any dealership, can skip
		var zeroStock = true
		var stock = p.factory.getStockForDealership(dealership)
		if (stock[0] + stock[1] + stock[2] !== 0) zeroStock = false //return [true, 0];

		// If no dealerships with min specs, can skip
		var belowMinSpec = true
		var minSpecs = Rules.getMinSpecsInOrder()
		if (dealership[TL_IDX][0] >= minSpecs[0] && dealership[TL_IDX][1] >= minSpecs[1] && dealership[TL_IDX][2] >= minSpecs[2] && dealership[TL_IDX][3] >= minSpecs[3] && dealership[TL_IDX][4] >= minSpecs[4]) belowMinSpec = false

		var availableSalesWindow = false
		if (dealership[MW_IDX][0] === -1) {
			availableSalesWindow = true
			// If not allowing duds, remove it from options
			if (!allowDuds) if (M.wouldPlacingMWallowAnySales(player, dealership) === false) availableSalesWindow = false
		}

		// If no possible niches to sell to, can skip
		// NOW you have all dealerships with min tech, stock, placed sales windows, so just have to check if you can still sell
		if (M.getSellingNichesEligibilityForDealership(p, dealership)[0].length > 0) anySellingSquare = true
		else anySellingSquare = false

		if (belowMinSpec) return false
		if (availableSalesWindow) return true
		if (zeroStock) return false
		if (anySellingSquare) return true

		return false
	}

	self.canSkipCurrentSellingPlayer = function (player) {
		for (var i = 0; i < M.players.length; i++) {
			M.players[i].factory.checkDealershipLevels()
		}

		if (M.gameFlow.phase !== PHASE_SELL) return [false, 0]

		if (player.name === "HcBot") return [true, SKIP_BOT]

		var factory = player.factory
		// if no dealerships, can't play
		if (!_.some(factory.factoryComponents, (component) => DEALERSHIPS.includes(component[0]))) {
			return [true, SKIP_NO_DEALERSHUPS]
		}

		// If no vehicles available to any dealership, can skip
		var allZeroStock = true
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					var stock = factory.getStockForDealership(component)
					if (stock[0] + stock[1] + stock[2] !== 0) allZeroStock = false
					else component[SE_IDX] = -1
				}
			},
			this
		)

		if (allZeroStock) return [true, SKIP_NO_STOCK]

		// If no dealerships with min specs, can skip
		var allBelowMinSpec = true
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					var minSpecs = Rules.getMinSpecsInOrder()
					if (component[TL_IDX][0] >= minSpecs[0] && component[TL_IDX][1] >= minSpecs[1] && component[TL_IDX][2] >= minSpecs[2] && component[TL_IDX][3] >= minSpecs[3] && component[TL_IDX][4] >= minSpecs[4]) allBelowMinSpec = false
					else component[SE_IDX] = -1
				}
			},
			this
		)

		if (allBelowMinSpec) return [true, SKIP_NO_MIN_SPEC]

		// NOW, you have dealership with STOCK, MIN TECH
		// if sales window not placed, you can play
		var availableSalesWindows = 0
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					var minSpecs = Rules.getMinSpecsInOrder()
					// If a MW is available, increase the count, and decrease for min spec / no sales
					if (component[MW_IDX][0] === -1) {
						availableSalesWindows++
						// But if this dealership is below min spec, it can't be used
						if (!(component[TL_IDX][0] >= minSpecs[0] && component[TL_IDX][1] >= minSpecs[1] && component[TL_IDX][2] >= minSpecs[2] && component[TL_IDX][3] >= minSpecs[3] && component[TL_IDX][4] >= minSpecs[4])) availableSalesWindows--
						// If it is above min spec, check if none of the available squares could be sold to, it can't be used
						else if (M.wouldPlacingMWallowAnySales(player, component) === false) availableSalesWindows--
					}
				}
			},
			this
		)

		if (availableSalesWindows > 0) return [false, 0]

		// If no possible niches to sell to, can skip
		// NOW you have all dealerships with min tech, stock, placed sales windows, so just have to check if you can still sell
		var anySellingSquare = false
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					if (M.getSellingNichesEligibilityForDealership(player, component)[0].length > 0) anySellingSquare = true
					else component[SE_IDX] = -1
				}
			},
			this
		)

		if (!anySellingSquare) return [true, SKIP_NO_SELLING_SQUARES]

		// Now you must be left with dealerships that have min tech, stock, placed sales window, and at least 1 possible sale
		// Finally, if there is ONE dealership, with ONE selling square, auto sell and skip
		var totalSellingSquares = 0
		var dealershipToUse
		var MBindexToUse
		// NOTE - I think there is a chance that if you have stock of something that can't sell, this could cause an ENDLESS LOOP
		_.each(
			factory.factoryComponents,
			function (component) {
				if (DEALERSHIPS.includes(component[0])) {
					var stock = factory.getStockForDealership(component)
					if (stock[0] + stock[1] + stock[2] !== 0) {
						totalSellingSquares += M.getSellingNichesEligibilityForDealership(player, component)[0].length
						if (M.getSellingNichesEligibilityForDealership(player, component)[0].length === 1) {
							MBindexToUse = M.getSellingNichesEligibilityForDealership(player, component)[0][0]
							dealershipToUse = component
						}
					}
				}
			},
			this
		)
		if (totalSellingSquares === 1) {
			C.actionSales(MBindexToUse, dealershipToUse, true)
			return [true, SKIP_SINGLE_SALE]
		}
		return false
	}

	self.setCurrentMarketBoardPrices = function () {
		var band3empty = true
		var band2empty = true
		var band1empty = true
		var band0empty = true
		var i = 0
		for (i = 0; i < PRICE_BAND_3_SQS.length; i++) {
			if (!M.isNicheIndexEmptyOfStock(PRICE_BAND_3_SQS[i])) band3empty = false
		}
		for (i = 0; i < PRICE_BAND_2_SQS.length; i++) {
			if (!M.isNicheIndexEmptyOfStock(PRICE_BAND_2_SQS[i])) band2empty = false
		}
		for (i = 0; i < PRICE_BAND_1_SQS.length; i++) {
			if (!M.isNicheIndexEmptyOfStock(PRICE_BAND_1_SQS[i])) band1empty = false
		}
		for (i = 0; i < PRICE_BAND_0_SQS.length; i++) {
			if (!M.isNicheIndexEmptyOfStock(PRICE_BAND_0_SQS[i])) band0empty = false
		}

		if (band3empty) M.priceBand[3] = 0
		if (band2empty) M.priceBand[2] = 0
		if (band1empty) M.priceBand[1] = 0
		if (band0empty) M.priceBand[0] = 0

		var availablePrice = 6
		if (!band3empty) {
			M.priceBand[3] = availablePrice
			if (availablePrice === 6) availablePrice = 4
			else availablePrice--
		}
		if (!band2empty) {
			M.priceBand[2] = availablePrice
			if (availablePrice === 6) availablePrice = 4
			else availablePrice--
		}
		if (!band1empty) {
			M.priceBand[1] = availablePrice
			if (availablePrice === 6) availablePrice = 4
			else availablePrice--
		}
		if (!band0empty) {
			M.priceBand[0] = availablePrice
			if (availablePrice === 6) availablePrice = 4
			else availablePrice--
		}
	}

	self.getValidNeutralCards = function () {
		const ALL_CARDS = [0, 1, 2, 3, 4, 5, 6]

		// Define exclusion lists for readability
		const carIndices = [1, 2, 3, 4, 5, 6]
		const truckIndices = [0]
		const sportsIndices = []

		return ALL_CARDS.filter((x) => {
			if (M.excludeCars && carIndices.includes(x)) return false
			if (M.excludeTrucks && truckIndices.includes(x)) return false
			if (M.excludeSports && sportsIndices.includes(x)) return false
			return true
		})
	}
	self.playNeutralCards = function () {
		var i = 0
		var histNeutralCards = []
		var VALID_NEUTRAL_CARDS = this.getValidNeutralCards()
		var neutralCards = _.shuffle(VALID_NEUTRAL_CARDS)
		if (M.gameFlow.turn === 0) {
			for (i = 0; i < M.players.length + 1; i++) {
				if (neutralCards.length < i) neutralCards = neutralCards.concat(VALID_NEUTRAL_CARDS)
				if (neutralCards.length < 1) return
				this.playSingleNeutralCard(neutralCards[i], 1)
				histNeutralCards.push([neutralCards[i], 1])
			}
		} else {
			var maxCards = 0
			for (i = 0; i < M.players.length; i++) {
				if (M.players[i].autoplay !== true) maxCards++
			}
			for (i = 0; i < maxCards; i++) {
				if (neutralCards.length < i) neutralCards = neutralCards.concat(VALID_NEUTRAL_CARDS)
				if (neutralCards.length < 1) return
				if (i < M.players.length - 2) {
					this.playSingleNeutralCard(neutralCards[i], 1)
					histNeutralCards.push([neutralCards[i], 1])
				}
				if (i === M.players.length - 2) {
					this.playSingleNeutralCard(neutralCards[i], 2)
					histNeutralCards.push([neutralCards[i], 2])
				}
				if (i === M.players.length - 1) {
					this.playSingleNeutralCard(neutralCards[i], 3)
					histNeutralCards.push([neutralCards[i], 3])
				}
			}
		}
		M.log(Log.NEUTRAL_CARDS, [...histNeutralCards])
	}

	self.playSingleNeutralCard = function (cardNum, quadrant) {
		if (cardNum === 0) card = neutralCard0
		if (cardNum === 1) card = neutralCard1
		if (cardNum === 2) card = neutralCard2
		if (cardNum === 3) card = neutralCard3
		if (cardNum === 4) card = neutralCard4
		if (cardNum === 5) card = neutralCard5
		if (cardNum === 6) card = neutralCard6
		var Xstart = 0
		var Ystart = 0
		if (quadrant === 1) Ystart = 4
		if (quadrant === 2) {
			Xstart = 4
			Ystart = 4
		}
		if (quadrant === 4) Xstart = 4
		// Now add the ACTUAL demand in correct place
		var MBindex = M.getIndexForMBcoord(Xstart + card[0], Ystart + card[1])
		M.marketBoard[MBindex][card[2]]++
	}

	self.getAllowedTechOnOneTrack = function (techTrackIndex, min, colour) {
		if (M.sandboxMode) return 6
		var previousPeople = 0
		for (var i = M.techTracks[techTrackIndex].length - 2; i >= 0; i--) {
			var currentLevel = i
			// Firstly, check if you're there
			if (M.techTracks[techTrackIndex][i].includes(colour)) return i
			if (M.techTracks[techTrackIndex][i].length > 0) previousPeople += M.techTracks[techTrackIndex][i].length
			if (previousPeople >= min) return i
		}
	}

	self.getNativelyAllowedTechLevels = function (localPOV, inColourOrder) {
		var i,
			j = 0
		var colour = M.players[localPOV].colour
		var nativelyAllowedTechLevels = [0, 0, 0, 0, 0]
		for (i = 0; i < M.techTracks.length; i++) {
			for (j = 0; j < M.techTracks[i].length - 1; j++) if (M.techTracks[i][j].indexOf(colour) > -1) nativelyAllowedTechLevels[i] = j
			if (M.trainingGame && M.techTracks[i][j].indexOf(C.currentPlayer().colour) > -1) nativelyAllowedTechLevels[i] = j
		}
		if (!inColourOrder) return nativelyAllowedTechLevels
		// Else sort into colour order
		var allowedTechLevelsByColour = [0, 0, 0, 0, 0]

		for (i = 0; i < allowedTechLevelsByColour.length; i++) {
			for (j = 0; j < M.techTracks.length; j++) {
				if (i === M.techTracks[j][7][0]) allowedTechLevelsByColour[i] = nativelyAllowedTechLevels[j]
			}
		}
		return allowedTechLevelsByColour
	}

	// Returns array based on L-R order of TechTracks
	self.getAllowedTechLevels = function (inColourOrder) {
		if (M.sandboxMode) return [6, 6, 6, 6, 6]
		var allowedTechLevels = [0, 0, 0, 0, 0]
		var previousPeoplRequired = 0
		let botRefund = 0
		var i = 0
		if (M.trainingGame) previousPeoplRequired = M.gameFlow.ready.length + 1
		else {
			// need our position in UNALTERED turn order,say, [2,0,1] then PPR is [1,2,3]
			for (i = 0; i < M.gameFlow.unalteredTurnOrder.length; i++) {
				if (M.players[M.gameFlow.unalteredTurnOrder[i]].autoplay == true) botRefund++
				if (M.gameFlow.unalteredTurnOrder[i] === global.pov) previousPeoplRequired = i + 1 - botRefund
			}
		}

		for (i = 0; i < allowedTechLevels.length; i++) {
			allowedTechLevels[i] = this.getAllowedTechOnOneTrack(i, previousPeoplRequired, C.currentPlayer().colour)
		}
		if (!inColourOrder) return allowedTechLevels
		// Else sort into colour order
		var allowedTechLevelsByColour = [0, 0, 0, 0, 0]

		for (i = 0; i < allowedTechLevelsByColour.length; i++) {
			for (var j = 0; j < M.techTracks.length; j++) {
				if (i === M.techTracks[j][7][0]) allowedTechLevelsByColour[i] = allowedTechLevels[j]
			}
		}
		return allowedTechLevelsByColour
	}

	self.getEligibleFactoryComponentNames = function (player) {
		var i = 0
		var res = []
		if (M.gameFlow.turn === 0 && !M.sandboxMode) return [DEPARTMENT_PLANNING, DEPARTMENT_RESEARCH]
		res.push(MAINLINE_CAR)
		res.push(MAINLINE_TRUCK)
		res.push(MAINLINE_SPORTS)
		res.push(DEPARTMENT_RESEARCH)
		res.push(DEPARTMENT_PLANNING)

		/* Now check which techs you can build */
		/* get access of each player, in UNALTERED TURN ORDER */

		// Get allowed techs
		var allowedTechLevels = self.getAllowedTechLevels()

		// now add components
		for (i = 0; i < M.techTracks.length; i++) {
			if (M.techTracks[i][7][0] === RED) {
				if (allowedTechLevels[i] >= 1) {
					res.push(ENGINE)
					res.push(ARROW_SPD_B)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(CLAXON)
					res.push(ARROW_SPD_D)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(GEARS)
					res.push(ARROW_SPD_B)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(TIRE)
					res.push(ARROW_SPD_D)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(FUEL_TANK)
					res.push(ARROW_SPD_B)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(DASHBOARD)
					res.push(ARROW_SPD_C)
				}
			} else if (M.techTracks[i][7][0] === GREEN) {
				if (allowedTechLevels[i] >= 1) {
					res.push(ENGINE)
					res.push(ARROW_RANGE_B)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(RADIATOR)
					res.push(ARROW_RANGE_A)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(TIRE)
					res.push(ARROW_RANGE_D)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(FUEL_TANK)
					res.push(ARROW_RANGE_B)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(RADIATOR)
					res.push(ARROW_RANGE_A)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(GEARS)
					res.push(ARROW_RANGE_B)
				}
			} else if (M.techTracks[i][7][0] === PURPLE) {
				if (allowedTechLevels[i] >= 1) {
					res.push(PAINT)
					res.push(ARROW_DESIGN_C)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(DOOR)
					res.push(ARROW_DESIGN_A)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(HEADLIGHT)
					res.push(ARROW_DESIGN_D)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(DASHBOARD)
					res.push(ARROW_DESIGN_C)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(BODY)
					res.push(ARROW_DESIGN_A)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(STEERING_WHEEL)
					res.push(ARROW_DESIGN_B)
				}
			} else if (M.techTracks[i][7][0] === BLUE) {
				if (allowedTechLevels[i] >= 1) {
					res.push(BATTERY)
					res.push(ARROW_REL_C)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(CHASSIS)
					res.push(ARROW_REL_A)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(BODY)
					res.push(ARROW_REL_A)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(BUMPER)
					res.push(ARROW_REL_A)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(ENGINE)
					res.push(ARROW_REL_B)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(CHASSIS)
					res.push(ARROW_REL_A)
				}
			} else if (M.techTracks[i][7][0] === YELLOW) {
				if (allowedTechLevels[i] >= 1) {
					res.push(BRAKE)
					res.push(ARROW_SAFETY_B)
				}
				if (allowedTechLevels[i] >= 2) {
					res.push(WINDSHIELD)
					res.push(ARROW_SAFETY_D)
				}
				if (allowedTechLevels[i] >= 3) {
					res.push(STEERING_WHEEL)
					res.push(ARROW_SAFETY_B)
				}
				if (allowedTechLevels[i] >= 4) {
					res.push(BUMPER)
					res.push(ARROW_SAFETY_A)
				}
				if (allowedTechLevels[i] >= 5) {
					res.push(HEADLIGHT)
					res.push(ARROW_SAFETY_D)
				}
				if (allowedTechLevels[i] >= 6) {
					res.push(TIRE)
					res.push(ARROW_SAFETY_D)
				}
			}
		}

		// Now pull out the player we want, and add the appropriate techs
		if (global.debug || M.sandboxMode) {
			res.push(CHASSIS)
			res.push(BODY)
			res.push(RADIATOR)
			res.push(DOOR)
			res.push(BUMPER)
			res.push(DASHBOARD)
			res.push(PAINT)
			res.push(BATTERY)
			res.push(ENGINE)
			res.push(GEARS)
			res.push(FUEL_TANK)
			res.push(STEERING_WHEEL)
			res.push(BRAKE)
			res.push(TIRE)
			res.push(HEADLIGHT)
			res.push(WINDSHIELD)
			res.push(CLAXON)
			res.push(ARROW_DESIGN_A)
			res.push(ARROW_DESIGN_B)
			res.push(ARROW_DESIGN_C)
			res.push(ARROW_DESIGN_D)
			res.push(ARROW_REL_A)
			res.push(ARROW_REL_B)
			res.push(ARROW_REL_C)
			res.push(ARROW_SPD_B)
			res.push(ARROW_SPD_C)
			res.push(ARROW_SPD_D)
			res.push(ARROW_SAFETY_A)
			res.push(ARROW_SAFETY_B)
			res.push(ARROW_SAFETY_D)
			res.push(ARROW_RANGE_A)
			res.push(ARROW_RANGE_B)
			res.push(ARROW_RANGE_D)
		}

		if (player.colour === RED) res = res.concat(RED_DEALERSHIPS)
		if (player.colour === GREEN) res = res.concat(GREEN_DEALERSHIPS)
		if (player.colour === PURPLE) res = res.concat(PURPLE_DEALERSHIPS)
		if (player.colour === BLUE) res = res.concat(BLUE_DEALERSHIPS)
		if (player.colour === YELLOW) res = res.concat(YELLOW_DEALERSHIPS)

		if (player.colour === RED) res.push(DEPARTMENT_MARKETING_RED)
		if (player.colour === GREEN) res.push(DEPARTMENT_MARKETING_GREEN)
		if (player.colour === PURPLE) res.push(DEPARTMENT_MARKETING_PURPLE)
		if (player.colour === BLUE) res.push(DEPARTMENT_MARKETING_BLUE)
		if (player.colour === YELLOW) res.push(DEPARTMENT_MARKETING_YELLOW)

		res = _.uniq(res)

		// If you've used your dealerships or marketings, get rid of them; no need to clog up space
		for (i = res.length - 1; i >= 0; i--) {
			if (DEALERSHIPS.includes(res[i]) && M.availableComponents[res[i]] === 0) {
				res.splice(i, 1)
			}
			if (DEPARTMENTS_MARKETING.includes(res[i]) && M.availableComponents[res[i]] === 0) {
				res.splice(i, 1)
			}
		}

		// Sort arrows to end
		res.sort(function (x, y) {
			return !ARROWS.includes(x) ? -1 : !ARROWS.includes(y) ? 1 : 0
		})

		return res
	}

	self.canResign = function (model, playerNumber) {
		if (playerNumber == undefined) {
			playerNumber = global.pov
		}
		playerNumber = global.pov
		if (model.workflow.turn == 0 && model.workflow.phase < PHASE_SETUP_RESERVE) {
			return true
		} else if (model.workflow.turn < 4) {
			return false
		} else if (model.workflow.turn >= 4 && model.workflow.phase == PHASE_RESTRUCTURING) {
			return true
		}
		return false
	}

	self.anyBotPlayers = function () {
		for (let i = 0; i < M.players.length; i++) {
			if (M.players[i].autoplay == true) return true
		}
		return false
	}

	// tech levels must be in COLOUR order
	self.getCorrectBorderColour = function (component, allowedTechLevels, nativelyAllowedTechLevels) {
		var borderColour = "black"

		// BLUE
		if (component === BATTERY && nativelyAllowedTechLevels[BLUE] >= 1) borderColour = "lightgreen"
		else if (component === BATTERY && allowedTechLevels[BLUE] >= 1) borderColour = "yellow"

		if (component === CHASSIS && nativelyAllowedTechLevels[BLUE] >= 2) borderColour = "lightgreen"
		else if (component === CHASSIS && allowedTechLevels[BLUE] >= 2) borderColour = "yellow"

		if (component === BODY && (nativelyAllowedTechLevels[BLUE] >= 3 || nativelyAllowedTechLevels[PURPLE] >= 5)) borderColour = "lightgreen"
		else if (component === BODY && (allowedTechLevels[BLUE] >= 3 || allowedTechLevels[PURPLE] >= 5)) borderColour = "yellow"

		if (component === BUMPER && (nativelyAllowedTechLevels[BLUE] >= 4 || nativelyAllowedTechLevels[YELLOW] >= 4)) borderColour = "lightgreen"
		else if (component === BUMPER && (allowedTechLevels[BLUE] >= 4 || allowedTechLevels[YELLOW] >= 4)) borderColour = "yellow"

		if (component === ENGINE && (nativelyAllowedTechLevels[BLUE] >= 5 || nativelyAllowedTechLevels[GREEN] >= 1 || nativelyAllowedTechLevels[RED] >= 1)) borderColour = "lightgreen"
		else if (component === ENGINE && (allowedTechLevels[BLUE] >= 5 || allowedTechLevels[GREEN] >= 1 || allowedTechLevels[RED] >= 1)) borderColour = "yellow"

		// PURPLE
		if (component === PAINT && nativelyAllowedTechLevels[PURPLE] >= 1) borderColour = "lightgreen"
		else if (component === PAINT && allowedTechLevels[PURPLE] >= 1) borderColour = "yellow"

		if (component === DOOR && nativelyAllowedTechLevels[PURPLE] >= 2) borderColour = "lightgreen"
		else if (component === DOOR && allowedTechLevels[PURPLE] >= 2) borderColour = "yellow"

		if (component === HEADLIGHT && (nativelyAllowedTechLevels[PURPLE] >= 3 || nativelyAllowedTechLevels[YELLOW] >= 5)) borderColour = "lightgreen"
		else if (component === HEADLIGHT && (allowedTechLevels[PURPLE] >= 3 || allowedTechLevels[YELLOW] >= 5)) borderColour = "yellow"

		if (component === DASHBOARD && (nativelyAllowedTechLevels[PURPLE] >= 4 || nativelyAllowedTechLevels[RED] >= 6)) borderColour = "lightgreen"
		else if (component === DASHBOARD && (allowedTechLevels[PURPLE] >= 4 || allowedTechLevels[RED] >= 6)) borderColour = "yellow"

		if (component === STEERING_WHEEL && (nativelyAllowedTechLevels[PURPLE] >= 6 || nativelyAllowedTechLevels[YELLOW] >= 3)) borderColour = "lightgreen"
		else if (component === STEERING_WHEEL && (allowedTechLevels[PURPLE] >= 6 || allowedTechLevels[YELLOW] >= 3)) borderColour = "yellow"

		// GREEN
		if (component === RADIATOR && nativelyAllowedTechLevels[GREEN] >= 2) borderColour = "lightgreen"
		else if (component === RADIATOR && allowedTechLevels[GREEN] >= 2) borderColour = "yellow"

		if (component === TIRE && (nativelyAllowedTechLevels[GREEN] >= 3 || nativelyAllowedTechLevels[RED] >= 4 || nativelyAllowedTechLevels[YELLOW] >= 6)) borderColour = "lightgreen"
		else if (component === TIRE && (allowedTechLevels[GREEN] >= 3 || allowedTechLevels[RED] >= 4 || allowedTechLevels[YELLOW] >= 6)) borderColour = "yellow"

		if (component === FUEL_TANK && (nativelyAllowedTechLevels[GREEN] >= 4 || nativelyAllowedTechLevels[RED] >= 5)) borderColour = "lightgreen"
		else if (component === FUEL_TANK && (allowedTechLevels[GREEN] >= 4 || allowedTechLevels[RED] >= 5)) borderColour = "yellow"

		if (component === GEARS && (nativelyAllowedTechLevels[GREEN] >= 6 || nativelyAllowedTechLevels[RED] >= 3)) borderColour = "lightgreen"
		else if (component === GEARS && (allowedTechLevels[GREEN] >= 6 || allowedTechLevels[RED] >= 3)) borderColour = "yellow"

		// RED
		if (component === CLAXON && nativelyAllowedTechLevels[RED] >= 2) borderColour = "lightgreen"
		else if (component === CLAXON && allowedTechLevels[RED] >= 2) borderColour = "yellow"

		// YELLOW
		if (component === BRAKE && nativelyAllowedTechLevels[YELLOW] >= 1) borderColour = "lightgreen"
		else if (component === BRAKE && allowedTechLevels[YELLOW] >= 1) borderColour = "yellow"

		if (component === WINDSHIELD && nativelyAllowedTechLevels[YELLOW] >= 2) borderColour = "lightgreen"
		else if (component === WINDSHIELD && allowedTechLevels[YELLOW] >= 2) borderColour = "yellow"

		return borderColour
	}
	return self
})()

Factory = function () {
	this.width = 12
	this.height = 12
	this.mainFactoryIndex = 0
	this.mainFactoryRotation = 0
	this.mainFactoryFlipped = 0
	this.factoryCoords = this.rotateSquare(MAIN_FACTORY_TILE_COMPONENT, this.mainFactoryRotation, 12, this.mainFactoryFlipped)
	this.factoryExpansions = []

	/* 0 - com name, 1 - index, 2 - rotation, 3-flipped, THEN MAINLINE AND DEALERSHUP has 4 - TECH LEVELS< THEN  
                                                  5 -Dship -> [-1,-1,-1] = [M board selling square loc, rotation, size]
                                                    6 - sales exclude
                                                      7 - spare
                                                  5 - Mainline -> stock level CHECK - appears to init with number, not array?
                                                    6 - spare
                                                      7 - spare
                  THEN techs have [4] -1 for each arrow slot, which becomes the index of fac floor sq of an arrow
                            NB doesn't have to be -1,-1 in order; each -1 is linked to a particular spec COLOUR
  */
	this.factoryComponents = []
	this.factoryComponenetIndexesAddedThisTurn = []

	// NOT SAVED
	this.factoryComponentNamesAddedThisTurn = []
	this.factoryDataBeforeExpansion = []

	this.componentBeingAdded = -1
	this.componentBeingAddedRotation = -1
	this.componentBeingAddedFlipped = 0

	this.isValidFactory = false

	this.factoryExpansionIndexAddedThisTurn = -1
}

// import
// export
// showPossibleExpansionAreas
// getEmptyFactorySpaces
// placeFactoryComponent
// clickedOnNudge
// placeFactoryExpansion
// collapseFactoryAfterExpansion
// shiftIndexesOfAllComponents
// clearComponentBeingPlaced
// isOnTopOfFactory / bottom / left / right
// getIndexForCoord / VV
// getOriginalCoordsForIndex
// getNeighbourItemsOfIndex
// getNeighbourIndexesOfIndex
// getNeighbourIndexesOfIndexWithDirection
// expandFactoryArea
// placeComponentIntoFactoryModel
// rotateRectangle
// getLocalIndexForCoord
// rotateSquare
// checkForDuplicateTechValidation
// validateSingleComponent
// checkValidityOfArrowTile
// checkValidArrowAndTech
// checkMainlineCornerConnection
// getComponentIndexFromAnyIndex
// getAllComponentDataOfDirectConnectionsToComponentIndex
// getAllDirectlyAdjacentIndexesOnlyFromComponentIndex
// getAllDirectlyAdjacentIndexesOnlyFromComponentIndexWithInwardsPointer
// getComponentDataAtIndex
// hasAnyAdjacencyToLoadingBay
// getConnectedIndexesFromIndex
// checkEligibilityOfSquareForConnection
// checkDealershipLevels
// getConnectedIndexesFromIndexWithThroughMainlines
/* Gets the indexes of the component, from an index (unless anySquares, then everything not OOB / Empty)
 MUST be the index of the compnent matching that in factoryComponents*/
// getAdjacentIndexesFromIndex
// removeComponentAtIndex
// getStockForDealership
// removeItemFromMainlineAdjacentToDealership
// findAllPossibleSpecsToAdd
// prettyPrint

Factory.import = function (tab) {
	var f = new Factory()
	if (tab != undefined && tab.length > 0) {
		f.width = tab[0]
		f.height = tab[1]

		f.factoryCoords = tab[2]
		f.factoryExpansions = tab[3]
		f.factoryComponents = tab[4]

		f.mainFactoryIndex = tab[5]
		f.mainFactoryRotation = tab[6]
		f.mainFactoryFlipped = tab[7]
		f.factoryComponenetIndexesAddedThisTurn = tab[8]

		// Add unsaved Vars
		f.factoryComponentNamesAddedThisTurn = []
		f.factoryDataBeforeExpansion = []
		f.componentBeingAdded = -1
		f.componentBeingAddedRotation = -1
		f.componentBeingAddedFlipped = 0
		f.isValidFactory = false
		f.factoryExpansionIndexAddedThisTurn = -1
	}
	return f
}

Factory.prototype.export = function () {
	var res = []
	// 0
	res.push(this.width)

	// 1
	res.push(this.height)

	// 2
	res.push(this.factoryCoords)

	//3
	res.push(this.factoryExpansions)

	// 4
	res.push(this.factoryComponents)

	// 5
	res.push(this.mainFactoryIndex)

	// 6
	res.push(this.mainFactoryRotation)

	// 7
	res.push(this.mainFactoryFlipped)

	// 7
	res.push(this.factoryComponenetIndexesAddedThisTurn)

	return res
}

Factory.prototype.showPossibleExpansionAreas = function (player) {
	$("#nudgeDiv").remove()
	this.componentBeingAdded = FACTORY_EXPANSION_TILE
	this.componentBeingAddedRotation = 0
	this.componentBeingAddedFlipped = 0

	this.expandFactoryArea(8, 8)
	V.showComponentBeingAdded(this, FACTORY_EXPANSION_TILE)
	V.updateQSPdiv(player)
	if (M.sandboxMode) V.render()
	else if (M.trainingGame) V.renderFactoryFloor(M.players[M.gameFlow.turnOrder[0]])
	else V.renderFactoryFloor(M.players[M.gameFlow.turnOrder[M.gameFlow.turnOrder.indexOf(global.pov)]])

	var OOB_indexes = []
	for (var i = 0; i < this.factoryCoords.length; i++) if (this.factoryCoords[i] === OUT_OF_BOUNDS) OOB_indexes.push(i)
}

Factory.prototype.getEmptyFactorySpaces = function () {
	var res = []
	for (var i = 0; i < this.factoryCoords.length; i++) {
		if (this.factoryCoords[i] === EMPTY_SPACE) res.push(i)
	}
	return res
}

Factory.prototype.placeFactoryComponent = function (e) {
	var index = $(e.currentTarget).data("index")
	var player = e.data.player
	player.factory.actionPlaceFactoryComponent(index, player)
}

Factory.prototype.actionPlaceFactoryComponent = function (index, player) {
	var thisFac = player.factory
	var newComponentName = thisFac.componentBeingAdded
	var newComponentModel = thisFac.rotateRectangle(getComponentModelFromName(newComponentName), thisFac.componentBeingAddedRotation, DIMENSIONS[newComponentName][0], DIMENSIONS[newComponentName][1], thisFac.componentBeingAddedFlipped)
	var tableWidth = DIMENSIONS[newComponentName][0]
	var tableHeight = DIMENSIONS[newComponentName][1]
	if (thisFac.componentBeingAddedRotation % 2 == 1) {
		tableWidth = DIMENSIONS[newComponentName][1]
		tableHeight = DIMENSIONS[newComponentName][0]
	}
	var i = 0
	var x = 0
	var y = 0
	var left = 0
	var top = 0
	var suitableTechLevel = false
	var arrayIndex = 0
	var techComponentName = 0

	// Check if there is enough space
	var SpaceAvailable = true
	for (y = 0; y < tableHeight; y++) {
		for (x = index; x < index + tableWidth; x++) {
			if (thisFac.factoryCoords[x + y * thisFac.width] !== EMPTY_SPACE) {
				SpaceAvailable = false
				break
			}
			i++
		}
		if (!SpaceAvailable) break
	}
	// Now check for right side overhang
	var indexCoords = thisFac.getCoordsForIndex(index)
	var Xcoord = indexCoords[0]
	Xcoord = Xcoord % thisFac.width
	if (Xcoord + tableWidth > thisFac.width) SpaceAvailable = false
	// Now check bottom for overhang
	var Ycoord = indexCoords[1]
	if (Ycoord + tableHeight > thisFac.height) SpaceAvailable = false

	if (!SpaceAvailable) {
		$("#nudgeDiv").remove()

		left = thisFac.getCoordsForIndex(index)[0] * V.smallSqPxWidth
		top = (thisFac.getCoordsForIndex(index)[1] - 1.5) * V.smallSqPxWidth
		var div = $("<div/>")
		div.attr("class", "noSpaceDiv")
		div.html(gettext("No Space"))
		div.css({
			"background-color": "white",
			"font-weight": "bolder",
			width: "100px",
			height: "30px",
			"z-index": "500",
			position: "absolute",
			left: String(left) + "px",
			top: String(top) + "px",
		})
		$("#factoryFloorDiv").append(div)

		setTimeout(function () {
			$(".noSpaceDiv").fadeOut()
		}, 1000)
		return
	}
	// If you are adding an arrow, check if it is pointing at an appropriate tech, and link it to that tech NEED TO REMOVE WHEN PLUCKED
	if (ARROWS.includes(newComponentName)) {
		// This takes ARROW COMPONENT data, and checks it CAN join with a tech (no check for tech, no check for multiple arrows)
		var validArrow = thisFac.checkValidityOfArrowTile([newComponentName, index, thisFac.componentBeingAddedRotation])
		// Now we have a valid arrow and valid tech tile.
		// So check the tech tile has space for it
		if (validArrow[0]) {
			var techComponentIndex = validArrow[1]
			arrayIndex = _.findIndex(thisFac.factoryComponents, function (el) {
				return el[1] === techComponentIndex
			})
			techComponentName = thisFac.factoryComponents[arrayIndex][0]
			var validated = false
			if (ONE_SLOT_TECH.includes(techComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
			else {
				if (techComponentName === CHASSIS && ARROWS_BLUE.includes(newComponentName) && (thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1 || thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1)) validated = true

				if (techComponentName === BODY && ARROWS_BLUE.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
				if (techComponentName === BODY && ARROWS_PURPLE.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) validated = true

				if (techComponentName === RADIATOR && ARROWS_GREEN.includes(newComponentName) && (thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1 || thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1)) validated = true

				if (techComponentName === BUMPER && ARROWS_BLUE.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
				if (techComponentName === BUMPER && ARROWS_YELLOW.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) validated = true

				if (techComponentName === DASHBOARD && ARROWS_PURPLE.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
				if (techComponentName === DASHBOARD && ARROWS_RED.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) validated = true

				if (techComponentName === ENGINE && ARROWS_RED.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
				if (techComponentName === ENGINE && ARROWS_GREEN.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) validated = true
				if (techComponentName === ENGINE && ARROWS_BLUE.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][2] === -1) validated = true

				if (techComponentName === GEARS && ARROWS_RED.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
				if (techComponentName === GEARS && ARROWS_GREEN.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) validated = true

				if (techComponentName === FUEL_TANK && ARROWS_GREEN.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
				if (techComponentName === FUEL_TANK && ARROWS_RED.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) validated = true

				if (techComponentName === STEERING_WHEEL && ARROWS_YELLOW.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
				if (techComponentName === STEERING_WHEEL && ARROWS_PURPLE.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) validated = true

				if (techComponentName === TIRE && ARROWS_GREEN.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
				if (techComponentName === TIRE && ARROWS_RED.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) validated = true
				if (techComponentName === TIRE && ARROWS_YELLOW.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][2] === -1) validated = true

				if (techComponentName === HEADLIGHT && ARROWS_PURPLE.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) validated = true
				if (techComponentName === HEADLIGHT && ARROWS_YELLOW.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) validated = true
			}

			if (!validated) validArrow[0] = false

			if (validated) {
				var allowedTechLevels = Rules.getAllowedTechLevels(false)
				// We have CORRECT Arrow, pointing at CORRECT tech, AND there is space for it, so check the tech is OK
				//var allowedTechLevels = [0, 0, 0, 0, 0];

				/// REPLACE ALL THIS WITH Rules.getAllowedTechLevels() ????
				/*var previousPeoplRequired = 0;
        if (M.trainingGame) previousPeoplRequired = M.gameFlow.ready.length + 1;
        else {
          // need our position in UNALTERED turn order,say, [2,0,1] then PPR is [1,2,3]
          for (i = 0; i < M.gameFlow.unalteredTurnOrder.length; i++) {
            if (M.gameFlow.unalteredTurnOrder[i] === global.pov)
              previousPeoplRequired = i + 1;
          }
        }

        for (i = 0; i < allowedTechLevels.length; i++) {
          allowedTechLevels[i] = Rules.getAllowedTechOnOneTrack(
            i,
            previousPeoplRequired,
            C.currentPlayer().colour
          );
        }*/
				//////////////////// TO HERE ?

				var RtechLevel = 0
				var GtechLevel = 0
				var PtechLevel = 0
				var BtechLevel = 0
				var YtechLevel = 0
				for (i = 0; i < M.techTracks.length; i++) {
					if (M.techTracks[i][7][0] === RED) RtechLevel = allowedTechLevels[i]
					if (M.techTracks[i][7][0] === GREEN) GtechLevel = allowedTechLevels[i]
					if (M.techTracks[i][7][0] === PURPLE) PtechLevel = allowedTechLevels[i]
					if (M.techTracks[i][7][0] === BLUE) BtechLevel = allowedTechLevels[i]
					if (M.techTracks[i][7][0] === YELLOW) YtechLevel = allowedTechLevels[i]
				}

				suitableTechLevel = false
				if (techComponentName === CHASSIS) {
					// If both empty, must be ok
					if (thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1 && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1 && BtechLevel >= 2) suitableTechLevel = true
					// else one is taken, so need blue tech level 4
					else if (BtechLevel >= 6) suitableTechLevel = true
				}
				if (techComponentName === BODY && ARROWS_BLUE.includes(newComponentName) && BtechLevel >= 3) suitableTechLevel = true
				if (techComponentName === BODY && ARROWS_PURPLE.includes(newComponentName) && PtechLevel >= 5) suitableTechLevel = true
				if (techComponentName === RADIATOR) {
					// If both empty, must be ok
					if (thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1 && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1 && GtechLevel >= 2) suitableTechLevel = true
					// else one is taken, so need blue tech level 4
					else if (GtechLevel >= 5) suitableTechLevel = true
				}
				if (techComponentName === DOOR && ARROWS_PURPLE.includes(newComponentName) && PtechLevel >= 2) suitableTechLevel = true
				if (techComponentName === BUMPER && ARROWS_BLUE.includes(newComponentName) && BtechLevel >= 4) suitableTechLevel = true
				if (techComponentName === BUMPER && ARROWS_YELLOW.includes(newComponentName) && YtechLevel >= 4) suitableTechLevel = true
				if (techComponentName === DASHBOARD && ARROWS_PURPLE.includes(newComponentName) && PtechLevel >= 4) suitableTechLevel = true
				if (techComponentName === DASHBOARD && ARROWS_RED.includes(newComponentName) && RtechLevel >= 6) suitableTechLevel = true
				if (techComponentName === PAINT && ARROWS_PURPLE.includes(newComponentName) && PtechLevel >= 1) suitableTechLevel = true
				if (techComponentName === BATTERY && ARROWS_BLUE.includes(newComponentName) && BtechLevel >= 1) suitableTechLevel = true
				if (techComponentName === ENGINE && ARROWS_RED.includes(newComponentName) && RtechLevel >= 1) suitableTechLevel = true
				if (techComponentName === ENGINE && ARROWS_GREEN.includes(newComponentName) && GtechLevel >= 1) suitableTechLevel = true
				if (techComponentName === ENGINE && ARROWS_BLUE.includes(newComponentName) && BtechLevel >= 5) suitableTechLevel = true
				if (techComponentName === GEARS && ARROWS_RED.includes(newComponentName) && RtechLevel >= 3) suitableTechLevel = true
				if (techComponentName === GEARS && ARROWS_GREEN.includes(newComponentName) && GtechLevel >= 6) suitableTechLevel = true
				if (techComponentName === FUEL_TANK && ARROWS_GREEN.includes(newComponentName) && GtechLevel >= 4) suitableTechLevel = true
				if (techComponentName === FUEL_TANK && ARROWS_RED.includes(newComponentName) && RtechLevel >= 5) suitableTechLevel = true
				if (techComponentName === STEERING_WHEEL && ARROWS_YELLOW.includes(newComponentName) && YtechLevel >= 3) suitableTechLevel = true
				if (techComponentName === STEERING_WHEEL && ARROWS_PURPLE.includes(newComponentName) && PtechLevel >= 6) suitableTechLevel = true
				if (techComponentName === BRAKE && ARROWS_YELLOW.includes(newComponentName) && YtechLevel >= 1) suitableTechLevel = true
				if (techComponentName === TIRE && ARROWS_GREEN.includes(newComponentName) && GtechLevel >= 3) suitableTechLevel = true
				if (techComponentName === TIRE && ARROWS_RED.includes(newComponentName) && RtechLevel >= 4) suitableTechLevel = true
				if (techComponentName === TIRE && ARROWS_YELLOW.includes(newComponentName) && YtechLevel >= 6) suitableTechLevel = true
				if (techComponentName === HEADLIGHT && ARROWS_PURPLE.includes(newComponentName) && PtechLevel >= 3) suitableTechLevel = true
				if (techComponentName === HEADLIGHT && ARROWS_YELLOW.includes(newComponentName) && YtechLevel >= 5) suitableTechLevel = true
				if (techComponentName === WINDSHIELD && ARROWS_YELLOW.includes(newComponentName) && YtechLevel >= 2) suitableTechLevel = true
				if (techComponentName === CLAXON && ARROWS_RED.includes(newComponentName) && RtechLevel >= 2) suitableTechLevel = true
			} // end valid once checking twice
		}

		if (!validArrow[0]) {
			left = thisFac.getCoordsForIndex(index)[0] * V.smallSqPxWidth
			top = (thisFac.getCoordsForIndex(index)[1] - 1.5) * V.smallSqPxWidth
			var div2 = $("<div/>")
			div2.attr("class", "noTechDiv")
			div2.html(gettext("Not pointing at suitable tech"))
			div2.css({
				"background-color": "white",
				"font-weight": "bolder",
				width: "100px",
				height: "60px",
				"z-index": "500",
				position: "absolute",
				left: String(left) + "px",
				top: String(top) + "px",
			})
			$("#factoryFloorDiv").append(div2)

			setTimeout(function () {
				$(".noTechDiv").fadeOut()
			}, 1000)
			$("#nudgeDiv").remove()

			return
		}
		if (!suitableTechLevel && !global.debug) {
			left = thisFac.getCoordsForIndex(index)[0] * V.smallSqPxWidth
			top = (thisFac.getCoordsForIndex(index)[1] - 1.5) * V.smallSqPxWidth
			var div3 = $("<div/>")
			div3.attr("class", "noTechDiv")
			div3.html(gettext("Tech level too low for Spec"))
			div3.css({
				"background-color": "white",
				"font-weight": "bolder",
				width: "100px",
				height: "60px",
				"z-index": "500",
				position: "absolute",
				left: String(left) + "px",
				top: String(top) + "px",
			})
			$("#factoryFloorDiv").append(div3)

			setTimeout(function () {
				$(".noTechDiv").fadeOut()
			}, 1000)
			$("#nudgeDiv").remove()

			return
		}
	}

	// Enough Space! So add Component into model, view, and release gfx placement
	i = 0
	for (y = 0; y < tableHeight; y++) {
		for (x = index; x < index + tableWidth; x++) {
			thisFac.factoryCoords[x + y * thisFac.width] = newComponentModel[i]
			i++
		}
	}

	if (A_TECHS.includes(thisFac.componentBeingAdded) || B_TECHS.includes(thisFac.componentBeingAdded) || C_TECHS.includes(thisFac.componentBeingAdded) || D_TECHS.includes(thisFac.componentBeingAdded)) {
		if (ONE_SLOT_TECH.includes(thisFac.componentBeingAdded)) thisFac.factoryComponents.push([thisFac.componentBeingAdded, index, thisFac.componentBeingAddedRotation, thisFac.componentBeingAddedFlipped, [-1]])
		else if (TWO_SLOT_TECH.includes(thisFac.componentBeingAdded)) thisFac.factoryComponents.push([thisFac.componentBeingAdded, index, thisFac.componentBeingAddedRotation, thisFac.componentBeingAddedFlipped, [-1, -1]])
		else if (THREE_SLOT_TECH.includes(thisFac.componentBeingAdded)) thisFac.factoryComponents.push([thisFac.componentBeingAdded, index, thisFac.componentBeingAddedRotation, thisFac.componentBeingAddedFlipped, [-1, -1, -1]])
	} else if (DEALERSHIPS.includes(thisFac.componentBeingAdded)) thisFac.factoryComponents.push([thisFac.componentBeingAdded, index, thisFac.componentBeingAddedRotation, thisFac.componentBeingAddedFlipped, [0, 0, 0, 0, 0], [-1, -1, -1], 0, 0])
	else if (MAINLINES.includes(thisFac.componentBeingAdded)) thisFac.factoryComponents.push([thisFac.componentBeingAdded, index, thisFac.componentBeingAddedRotation, thisFac.componentBeingAddedFlipped, [0, 0, 0, 0, 0], 0, 0, 0])
	else thisFac.factoryComponents.push([thisFac.componentBeingAdded, index, thisFac.componentBeingAddedRotation, thisFac.componentBeingAddedFlipped, [], -1])

	// Add data to related tech component
	if (ARROWS.includes(newComponentName)) {
		// get the tech component
		var relatedTechIndex = thisFac.checkValidityOfArrowTile([newComponentName, index, thisFac.componentBeingAddedRotation])[1]
		arrayIndex = _.findIndex(thisFac.factoryComponents, function (el) {
			return el[1] === relatedTechIndex
		})
		techComponentName = thisFac.factoryComponents[arrayIndex][0]

		if (ONE_SLOT_TECH.includes(techComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
		else {
			// FIX
			if (techComponentName === CHASSIS && ARROWS_BLUE.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === CHASSIS && ARROWS_BLUE.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			else if (techComponentName === BODY && ARROWS_BLUE.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === BODY && ARROWS_PURPLE.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			// FIX
			else if (techComponentName === RADIATOR && ARROWS_GREEN.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][0] === -1) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === RADIATOR && ARROWS_GREEN.includes(newComponentName) && thisFac.factoryComponents[arrayIndex][RA_IDX][1] === -1) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			else if (techComponentName === BUMPER && ARROWS_BLUE.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === BUMPER && ARROWS_YELLOW.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			else if (techComponentName === DASHBOARD && ARROWS_PURPLE.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === DASHBOARD && ARROWS_RED.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			else if (techComponentName === ENGINE && ARROWS_RED.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === ENGINE && ARROWS_GREEN.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			else if (techComponentName === ENGINE && ARROWS_BLUE.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][2] = index
			else if (techComponentName === GEARS && ARROWS_RED.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === GEARS && ARROWS_GREEN.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			else if (techComponentName === FUEL_TANK && ARROWS_GREEN.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === FUEL_TANK && ARROWS_RED.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			else if (techComponentName === STEERING_WHEEL && ARROWS_YELLOW.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === STEERING_WHEEL && ARROWS_PURPLE.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			else if (techComponentName === TIRE && ARROWS_GREEN.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === TIRE && ARROWS_RED.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
			else if (techComponentName === TIRE && ARROWS_YELLOW.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][2] = index
			else if (techComponentName === HEADLIGHT && ARROWS_PURPLE.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][0] = index
			else if (techComponentName === HEADLIGHT && ARROWS_YELLOW.includes(newComponentName)) thisFac.factoryComponents[arrayIndex][RA_IDX][1] = index
		}
	}

	thisFac.factoryComponenetIndexesAddedThisTurn.push(index)
	M.availableComponents[thisFac.componentBeingAdded]--
	$("#newComponentDiv").remove()
	$("#componentValidationDiv").css("visibility", "visible")
	V.addNudgeDiv(player)

	thisFac.clearComponentBeingPlaced()
	var eligibleFactoryTiles = Rules.getEligibleFactoryComponentNames(player)
	V.displayEligibleFactoryTiles(player, eligibleFactoryTiles)
	V.renderFactoryFloor(player)
	V.updateQSPdiv(player)
}

Factory.prototype.clickedOnNudge = function (e) {
	var nudgeDirection = e.data.direction
	var expansion = e.data.expansion
	C.currentPlayer().factory.actionNudge(nudgeDirection, expansion)
}

Factory.prototype.actionNudge = function (nudgeDirection, expansion) {
	// Going left, so need to check left edge is free
	//0 - com name, 1 - index, 2 - rotation, 3-flipped,
	var index
	if (expansion) {
		this.componentBeingAdded = FACTORY_EXPANSION_TILE

		index = this.factoryExpansions.last()[0]
		this.componentBeingAddedRotation = this.factoryExpansions.last()[1]
		this.componentBeingAddedFlipped = this.factoryExpansions.last()[2]

		// remove coords
		var tableHeight = 8
		var tableWidth = 6
		if (this.componentBeingAddedRotation % 2 === 1) {
			tableHeight = 6
			tableWidth = 8
		}
		for (y = 0; y < tableHeight; y++) {
			for (x = index; x < index + tableWidth; x++) {
				this.factoryCoords[x + y * this.width] = OUT_OF_BOUNDS
			}
		}
		// remove from expansion
		this.factoryExpansions.pop()

		if (nudgeDirection === 0) index--
		if (nudgeDirection === 1) index -= this.width
		if (nudgeDirection === 2) index++
		if (nudgeDirection === 3) index += this.width
		this.actionPlaceFactoryExpansion(index, C.currentPlayer())
	} else {
		this.componentBeingAdded = this.factoryComponents.last()[0]
		index = this.factoryComponents.last()[1]
		this.componentBeingAddedRotation = this.factoryComponents.last()[2]
		this.componentBeingAddedFlipped = this.factoryComponents.last()[3]
		this.removeComponentAtIndex(index)
		if (nudgeDirection === 0) index--
		if (nudgeDirection === 1) index -= this.width
		if (nudgeDirection === 2) index++
		if (nudgeDirection === 3) index += this.width
		this.actionPlaceFactoryComponent(index, C.currentPlayer())
	}

	V.render()
}

Factory.prototype.placeFactoryExpansion = function (e) {
	var index = $(e.currentTarget).data("index")
	var player = e.data.player
	player.factory.actionPlaceFactoryExpansion(index, player)
}

Factory.prototype.actionPlaceFactoryExpansion = function (index, player) {
	var left = 0
	var top = 0
	var div

	var thisFac = player.factory
	var newExpansion = thisFac.rotateRectangle(EXPANSION_FACTORY_TILE_COMPONENT, thisFac.componentBeingAddedRotation, 6, 8, thisFac.componentBeingAddedFlipped)
	var tableWidth = 6
	var tableHeight = 8
	if (thisFac.componentBeingAddedRotation % 2 == 1) {
		tableWidth = 8
		tableHeight = 6
	}
	var i = 0
	var x = 0
	var y = 0

	// ********************* Check if there is enough space *** and get collection of indexes needed
	var SpaceAvailable = true
	var indexesNeeded = []
	for (y = 0; y < tableHeight; y++) {
		for (x = index; x < index + tableWidth; x++) {
			indexesNeeded.push(x + y * thisFac.width)
			if (thisFac.factoryCoords[x + y * thisFac.width] !== OUT_OF_BOUNDS) {
				SpaceAvailable = false
				break
			}
			i++
		}
		if (!SpaceAvailable) break
	}
	// Now check for right side overhang
	var indexCoords = thisFac.getCoordsForIndex(index)
	var Xcoord = indexCoords[0]
	Xcoord = Xcoord % thisFac.width
	if (Xcoord + tableWidth > thisFac.width) SpaceAvailable = false
	// Now check bottom for overhang
	var Ycoord = indexCoords[1]
	if (Ycoord + tableHeight > thisFac.height) SpaceAvailable = false

	if (!SpaceAvailable) {
		$("#nudgeDiv").remove()
		left = thisFac.getCoordsForIndex(index)[0] * V.smallSqPxWidth
		top = (thisFac.getCoordsForIndex(index)[1] - 1.5) * V.smallSqPxWidth
		div = $("<div/>")
		div.attr("class", "noSpaceDiv")
		div.html(gettext("No Space"))
		div.css({
			"background-color": "white",
			"font-weight": "bolder",
			width: "100px",
			height: "30px",
			"z-index": "15000",
			position: "absolute",
			left: String(left) + "px",
			top: String(top) + "px",
		})
		$("#factoryFloorDiv").append(div)

		setTimeout(function () {
			$(".noSpaceDiv").fadeOut()
		}, 1000)
		return
	}

	// ********************** Now check it touches factory
	var touchingFactory = false
	// We know there is enough space and the EXPANSION is not overhanging
	var outsideIndexes = []
	// Add top row
	if (index - thisFac.width >= 0) {
		for (i = 0; i < tableWidth; i++) outsideIndexes.push(index - thisFac.width + i)
	}
	// Add bottom row
	if (index + thisFac.width * tableHeight < thisFac.factoryCoords.length) {
		for (i = 0; i < tableWidth; i++) outsideIndexes.push(index + thisFac.width * tableHeight + i)
	}
	// Add left Col
	if ((index % thisFac.width) - 1 >= 0) {
		for (i = 0; i < tableHeight; i++) outsideIndexes.push(index + i * thisFac.width - 1)
	}
	//Add Right Col
	if ((index % thisFac.width) + tableWidth + 1 < thisFac.width) {
		for (i = 0; i < tableHeight; i++) outsideIndexes.push(index + i * thisFac.width + tableWidth)
	}

	for (i = 0; i < outsideIndexes.length; i++) {
		if (thisFac.factoryCoords[outsideIndexes[i]] !== OUT_OF_BOUNDS) touchingFactory = true
	}

	if (!touchingFactory) {
		$("#nudgeDiv").remove()
		left = thisFac.getCoordsForIndex(index)[0] * V.smallSqPxWidth
		top = (thisFac.getCoordsForIndex(index)[1] - 1.5) * V.smallSqPxWidth
		div = $("<div/>")
		div.attr("class", "noSpaceDiv")
		div.html(gettext("Not Adjacent to Factory"))
		div.css({
			"background-color": "white",
			"font-weight": "bolder",
			width: "100px",
			height: "40px",
			"z-index": "15000",
			position: "absolute",
			left: String(left) + "px",
			top: String(top) + "px",
		})
		$("#factoryFloorDiv").append(div)

		setTimeout(function () {
			$(".noSpaceDiv").fadeOut()
		}, 1000)
		return
	}

	// Now it IS touching factory AND in free space
	// We alreayd have outsideCoords. So check none includes loading bay.
	var blockingLoadingBay = false
	for (i = 0; i < outsideIndexes.length; i++) {
		if (thisFac.factoryCoords[outsideIndexes[i]] === LOADING_DOCK_KC) blockingLoadingBay = true
	}
	// Now check the pesky corner blocks
	var blockingLoadingBayKC = false
	if (blockingLoadingBay === false)
		for (i = 0; i < outsideIndexes.length; i++) {
			if (thisFac.factoryCoords[outsideIndexes[i]] === LOADING_BAY_KC_CORNER) {
				// We know one of the new outside squares is a KC corner.
				var lbkccIndex = outsideIndexes[i]
				if (thisFac.mainFactoryFlipped === 0) {
					if (thisFac.mainFactoryRotation === 0 && indexesNeeded.includes(thisFac.mainFactoryIndex - thisFac.width)) blockingLoadingBayKC = true
					if (thisFac.mainFactoryRotation === 1 && indexesNeeded.includes(thisFac.mainFactoryIndex + 12)) blockingLoadingBayKC = true
					if (thisFac.mainFactoryRotation === 2 && indexesNeeded.includes(thisFac.mainFactoryIndex + thisFac.width * 12 + 11)) blockingLoadingBayKC = true
					if (thisFac.mainFactoryRotation === 3 && indexesNeeded.includes(thisFac.mainFactoryIndex + thisFac.width * 11 - 1)) blockingLoadingBayKC = true
				}
				if (thisFac.mainFactoryFlipped === 1) {
					if (thisFac.mainFactoryRotation === 0 && indexesNeeded.includes(thisFac.mainFactoryIndex - thisFac.width + 11)) blockingLoadingBayKC = true
					if (thisFac.mainFactoryRotation === 1 && indexesNeeded.includes(thisFac.mainFactoryIndex + thisFac.width * 11 + 12)) blockingLoadingBayKC = true
					if (thisFac.mainFactoryRotation === 2 && indexesNeeded.includes(thisFac.mainFactoryIndex + thisFac.width * 12)) blockingLoadingBayKC = true
					if (thisFac.mainFactoryRotation === 3 && indexesNeeded.includes(thisFac.mainFactoryIndex - 1)) blockingLoadingBayKC = true
				}
				// Now check placed factory expansions for collisions
				for (var j = 0; j < thisFac.factoryExpansions.length; j++) {
					if (thisFac.factoryExpansions[j][2] === 0) {
						if (thisFac.factoryExpansions[j][1] === 0 && indexesNeeded.includes(thisFac.factoryExpansions[j][0] - thisFac.width)) blockingLoadingBayKC = true
						if (thisFac.factoryExpansions[j][1] === 1 && indexesNeeded.includes(thisFac.factoryExpansions[j][0] + 8)) blockingLoadingBayKC = true
						if (thisFac.factoryExpansions[j][1] === 2 && indexesNeeded.includes(thisFac.factoryExpansions[j][0] + thisFac.width * 8 + 5)) blockingLoadingBayKC = true
						if (thisFac.factoryExpansions[j][1] === 3 && indexesNeeded.includes(thisFac.factoryExpansions[j][0] + thisFac.width * 5 - 1)) blockingLoadingBayKC = true
					}
					if (thisFac.factoryExpansions[j][2] === 1) {
						if (thisFac.factoryExpansions[j][1] === 0 && indexesNeeded.includes(thisFac.factoryExpansions[j][0] - thisFac.width + 5)) blockingLoadingBayKC = true
						if (thisFac.factoryExpansions[j][1] === 1 && indexesNeeded.includes(thisFac.factoryExpansions[j][0] + thisFac.width * 5 + 8)) blockingLoadingBayKC = true
						if (thisFac.factoryExpansions[j][1] === 2 && indexesNeeded.includes(thisFac.factoryExpansions[j][0] + thisFac.width * 8)) blockingLoadingBayKC = true
						if (thisFac.factoryExpansions[j][1] === 3 && indexesNeeded.includes(thisFac.factoryExpansions[j][0] - 1)) blockingLoadingBayKC = true
					}
				}
			} // end if outside index is KC corner
		} // end outsideIndex loop

	if (blockingLoadingBay || blockingLoadingBayKC) {
		left = thisFac.getCoordsForIndex(index)[0] * V.smallSqPxWidth
		top = (thisFac.getCoordsForIndex(index)[1] - 2.5) * V.smallSqPxWidth
		div = $("<div/>")
		div.attr("class", "noSpaceDiv")
		div.html(gettext("Blocking Factory Loading Bay"))

		div.css({
			"background-color": "white",
			"font-weight": "bolder",
			width: "100px",
			height: "70px",
			"z-index": "15000",
			position: "absolute",
			left: String(left) + "px",
			top: String(top) + "px",
		})
		$("#factoryFloorDiv").append(div)

		setTimeout(function () {
			$(".noSpaceDiv").fadeOut()
		}, 1000)
		return
	}

	// Now check the current loading bay isn't blocked
	var newLoadingBayBlocked = false
	var requiredFreeSquares = []
	if (thisFac.componentBeingAddedFlipped === 0) {
		if (thisFac.componentBeingAddedRotation === 0) {
			requiredFreeSquares.push(index - thisFac.width)
			requiredFreeSquares.push(index - thisFac.width + 1)
		}
		if (thisFac.componentBeingAddedRotation === 1) {
			requiredFreeSquares.push(index + 8)
			requiredFreeSquares.push(index + thisFac.width + 8)
		}
		if (thisFac.componentBeingAddedRotation === 2) {
			requiredFreeSquares.push(index + thisFac.width * 8 + 4)
			requiredFreeSquares.push(index + thisFac.width * 8 + 5)
		}
		if (thisFac.componentBeingAddedRotation === 3) kclbindex = index + thisFac.width * 5
		if (thisFac.componentBeingAddedRotation === 3) {
			requiredFreeSquares.push(index + thisFac.width * 4 - 1)
			requiredFreeSquares.push(index + thisFac.width * 5 - 1)
		}
	} else if (thisFac.componentBeingAddedFlipped === 1) {
		if (thisFac.componentBeingAddedRotation === 0) {
			requiredFreeSquares.push(index - thisFac.width + 4)
			requiredFreeSquares.push(index - thisFac.width + 5)
		}
		if (thisFac.componentBeingAddedRotation === 1) {
			requiredFreeSquares.push(index + thisFac.width * 4 + 8)
			requiredFreeSquares.push(index + thisFac.width * 5 + 8)
		}
		if (thisFac.componentBeingAddedRotation === 2) {
			requiredFreeSquares.push(index + thisFac.width * 8)
			requiredFreeSquares.push(index + thisFac.width * 8 + 1)
		}
		if (thisFac.componentBeingAddedRotation === 3) {
			requiredFreeSquares.push(index - 1)
			requiredFreeSquares.push(index + thisFac.width - 1)
		}
	}
	for (i = 0; i < requiredFreeSquares.length; i++) {
		if (requiredFreeSquares[i] >= 0 && requiredFreeSquares[i] < thisFac.factoryCoords.length && thisFac.factoryCoords[requiredFreeSquares[i]] !== OUT_OF_BOUNDS) newLoadingBayBlocked = true
	}

	if (newLoadingBayBlocked) {
		left = thisFac.getCoordsForIndex(index)[0.0] * V.smallSqPxWidth
		top = (thisFac.getCoordsForIndex(index)[1] - 2.5) * V.smallSqPxWidth
		div = $("<div/>")
		div.attr("class", "noSpaceDiv")
		div.html(gettext("New Expansion Loading Bay Blocked"))

		div.css({
			"background-color": "white",
			"font-weight": "bolder",
			width: "100px",
			height: "80px",
			"z-index": "15000",
			position: "absolute",
			left: String(left) + "px",
			top: String(top) + "px",
		})
		$("#factoryFloorDiv").append(div)

		setTimeout(function () {
			$(".noSpaceDiv").fadeOut()
		}, 1000)
		return
	}

	// All Good! So add into components and cooords
	i = 0
	thisFac.factoryExpansions.push([index, thisFac.componentBeingAddedRotation, thisFac.componentBeingAddedFlipped])
	for (y = 0; y < tableHeight; y++) {
		for (x = index; x < index + tableWidth; x++) {
			thisFac.factoryCoords[x + y * thisFac.width] = newExpansion[i]
			i++
		}
	}

	thisFac.factoryExpansionIndexAddedThisTurn = index
	V.addNudgeDiv(player, true)

	thisFac.clearComponentBeingPlaced()
	V.renderFactoryFloor(player)
	// At end of factory expansion, so can end turn
	if (M.sandboxMode) C.addEndExpansionSandboxButton()
	else C.addFinishTurnButton(M.gameFlow.turn, M.gameFlow.phase, gettext("End Turn"))
}

Factory.prototype.collapseFactoryAfterExpansion = function () {
	var i = 0
	var x = 0
	var y = 0
	var floorTest = 0

	// Now collapse the canvas as much as possible, and change the indexes
	var originalWidth = this.width
	var originalHeight = this.height
	var rowsToRemove = []
	for (y = 0; y < this.height; y++) {
		floorTest = 0
		for (x = 0; x < this.width; x++) {
			if (this.factoryCoords[x + y * this.width] === OUT_OF_BOUNDS) floorTest++
		}
		if (floorTest === this.width) rowsToRemove.push(y)
	}
	rowsToRemove.sort(function (a, b) {
		return b - a
	})
	var firstUsedRow = 0
	for (i = 0; i < this.factoryCoords.length; i++) {
		if (this.factoryCoords[i] !== OUT_OF_BOUNDS) {
			firstUsedRow = parseInt(i / this.width)
			break
		}
	}
	var componenetUpshift = 0
	for (i = 0; i < rowsToRemove.length; i++) {
		if (rowsToRemove[i] < firstUsedRow) componenetUpshift++
	}
	// remove rows from coords and update new height
	for (i = 0; i < rowsToRemove.length; i++) {
		this.factoryCoords.splice(rowsToRemove[i] * this.width, this.width)
	}
	this.height = this.height - rowsToRemove.length

	// Now remove cols
	var colsToRemove = []
	for (x = 0; x < this.width; x++) {
		floorTest = 0
		for (y = 0; y < this.height; y++) {
			if (this.factoryCoords[x + y * this.width] === OUT_OF_BOUNDS) floorTest++
		}
		if (floorTest === this.height) colsToRemove.push(x)
	}
	colsToRemove.sort(function (a, b) {
		return b - a
	})
	var firstUsedCol = 0
	for (x = 0; x < this.width; x++) {
		for (y = 0; y < this.height; y++) {
			if (this.factoryCoords[x + y * this.width] !== OUT_OF_BOUNDS) {
				firstUsedCol = x
				break
			}
		}
		if (firstUsedCol > 0) break
	}
	var componenetLeftshift = 0
	for (i = 0; i < colsToRemove.length; i++) {
		if (colsToRemove[i] < firstUsedCol) componenetLeftshift++
	}
	// remove cols from coords and update new width
	// Chop off every bottom of the column, and work up
	for (y = this.height - 1; y >= 0; y--) {
		for (x = this.width - 1; x >= 0; x--) {
			if (colsToRemove.includes(x)) this.factoryCoords.splice(x + y * this.width, 1)
		}
	}
	this.width = this.width - colsToRemove.length

	// Now Alter the index of the components
	this.shiftIndexesOfAllComponents(originalWidth, originalHeight, componenetLeftshift, componenetUpshift)

	// Now place all components back into the model
	for (i = 0; i < this.factoryComponents.length; i++) {
		this.placeComponentIntoFactoryModel(this.factoryComponents[i][0], getComponentModelFromName(this.factoryComponents[i][0]), this.factoryComponents[i][1], this.factoryComponents[i][2], this.factoryComponents[i][3], false)
	}
}

Factory.prototype.shiftIndexesOfAllComponents = function (originalWidth, originalHeight, leftShift, upShift) {
	var i = 0
	// Main index
	var originalCoords = []

	originalCoords = this.getOriginalCoordsForIndex(this.mainFactoryIndex, originalWidth, originalHeight)
	originalCoords[0] -= leftShift
	originalCoords[1] -= upShift

	this.mainFactoryIndex = this.getIndexForCoord(originalCoords)

	// Expansion indexes
	for (i = 0; i < this.factoryExpansions.length; i++) {
		originalCoords = this.getOriginalCoordsForIndex(this.factoryExpansions[i][0], originalWidth, originalHeight)
		originalCoords[0] -= leftShift
		originalCoords[1] -= upShift
		this.factoryExpansions[i][0] = this.getIndexForCoord(originalCoords)
	}
	// Componenets
	for (i = 0; i < this.factoryComponents.length; i++) {
		originalCoords = this.getOriginalCoordsForIndex(this.factoryComponents[i][1], originalWidth, originalHeight)
		originalCoords[0] -= leftShift
		originalCoords[1] -= upShift
		this.factoryComponents[i][1] = this.getIndexForCoord(originalCoords)
	}
}

Factory.prototype.clearComponentBeingPlaced = function () {
	$("#newComponentDiv").remove()
	$("#componentValidationDiv").css("visibility", "visible")

	$(".selectable").remove()
	$(".ghostComponentImg").remove()
	$("#factoryFloorPlusCdiv").off()
	this.componentBeingAdded = -1
	this.componentBeingAddedRotation = -1
	this.componentBeingAddedFlipped = 0
}

Factory.prototype.isOnTopOfFactory = function (index) {
	if (this.factoryCoords[index] === OUT_OF_BOUNDS && this.factoryCoords[index + this.width] !== OUT_OF_BOUNDS) return true
	return false
}
Factory.prototype.isOnBottomOfFactory = function (index) {
	if (this.factoryCoords[index] === OUT_OF_BOUNDS && this.factoryCoords[index - this.width] !== OUT_OF_BOUNDS) return true
	return false
}
Factory.prototype.isOnLeftOfFactory = function (index) {
	if (this.factoryCoords[index] === OUT_OF_BOUNDS && this.factoryCoords[index + 1] !== OUT_OF_BOUNDS) return true
	return false
}
Factory.prototype.isOnRightOfFactory = function (index) {
	if (this.factoryCoords[index] === OUT_OF_BOUNDS && this.factoryCoords[index - 1] !== OUT_OF_BOUNDS) return true
	return false
}

Factory.prototype.getIndexForCoord = function (x, y) {
	if (y == undefined && x.length == 2) {
		return x[1] * this.width + x[0]
	} else {
		return y * this.width + x
	}
}

Factory.prototype.getCoordsForIndex = function (index) {
	var res = []
	res.push(index % this.width)
	res.push(Math.floor(index / this.width))
	return res
}

Factory.prototype.getOriginalCoordsForIndex = function (index, originalWidth, originalHeight) {
	var res = []
	res.push(index % originalWidth)
	res.push(Math.floor(index / originalWidth))
	return res
}

Factory.prototype.getNeighbourItemsOfIndex = function (index) {
	var neighbourIndexes = this.getNeighbourIndexesOfIndex(index)
	res = []
	for (var i = 0; i < neighbourIndexes.length; i++) {
		res.push(this.factoryCoords[neighbourIndexes[i]])
	}
	return res
}

Factory.prototype.getNeighbourIndexesOfIndex = function (index) {
	var W = this.width
	var H = this.height
	var res = []

	if (index >= W) res.push(index - W)
	if (Math.floor(index / W) < H - 1) res.push(index + W)
	if (index % W > 0) res.push(index - 1)
	if (index % W < W - 1) res.push(index + 1)

	return res
}

Factory.prototype.getNeighbourIndexesOfIndexWithDirection = function (index) {
	var W = this.width
	var H = this.height
	var res = []

	if (index >= W) res.push({ index: index - W, indexFrom: index, directionMoving: "UP" })
	if (Math.floor(index / W) < H - 1) res.push({ index: index + W, indexFrom: index, directionMoving: "DOWN" })
	if (index % W > 0) res.push({ index: index - 1, indexFrom: index, directionMoving: "LEFT" })
	if (index % W < W - 1) res.push({ index: index + 1, indexFrom: index, directionMoving: "RIGHT" })

	return res
}

// Add an extension to allow new expansion to be placed
Factory.prototype.expandFactoryArea = function (moreW, moreH) {
	var i = 0
	// Get new coords
	this.factoryCoords = new Array((moreW + this.width + moreW) * (moreH + this.height + moreH)).fill(OUT_OF_BOUNDS)
	var originalWidth = this.width
	var originalHeight = this.height
	// Now move existing components
	this.width += 2 * moreW
	this.height += 2 * moreH
	this.shiftIndexesOfAllComponents(originalWidth, originalHeight, -moreW, -moreH)

	// Now place components back in the model

	// Main tile
	this.placeComponentIntoFactoryModel(FACTORY_MAIN_TILE, MAIN_FACTORY_TILE_COMPONENT, this.mainFactoryIndex, this.mainFactoryRotation, this.mainFactoryFlipped, false)
	// Expansions
	for (i = 0; i < this.factoryExpansions.length; i++) {
		this.placeComponentIntoFactoryModel(FACTORY_EXPANSION_TILE, EXPANSION_FACTORY_TILE_COMPONENT, this.factoryExpansions[i][0], this.factoryExpansions[i][1], this.factoryExpansions[i][2], false)
	}
	// components
	for (i = 0; i < this.factoryComponents.length; i++) {
		this.placeComponentIntoFactoryModel(this.factoryComponents[i][0], getComponentModelFromName(this.factoryComponents[i][0]), this.factoryComponents[i][1], this.factoryComponents[i][2], this.factoryComponents[i][3], false)
	}
}

Factory.prototype.placeComponentIntoFactoryModel = function (componentName, _componentData, index, rotation, flipped, removal) {
	var componentData = this.rotateRectangle(_componentData, rotation, DIMENSIONS[componentName][0], DIMENSIONS[componentName][1], flipped)

	var i = 0
	var modelWidth = DIMENSIONS[componentName][0]
	var mdodelHeight = DIMENSIONS[componentName][1]
	if (rotation % 2 == 1) {
		modelWidth = DIMENSIONS[componentName][1]
		mdodelHeight = DIMENSIONS[componentName][0]
	}
	for (var y = 0; y < mdodelHeight; y++) {
		for (var x = index; x < index + modelWidth; x++) {
			if (removal) this.factoryCoords[x + y * this.width] = EMPTY_SPACE
			else this.factoryCoords[x + y * this.width] = componentData[i]
			i++
		}
	}
}

Factory.prototype.rotateRectangle = function (_componentData, nb, _width, _height, flipped) {
	var x = 0
	var y = 0
	var startIndex = 0
	var endIndex = 0
	var FI = 0

	var res = []

	if (flipped == undefined) flipped = 0
	var componentData = [..._componentData]
	var width = _width
	var height = _height
	if (nb == undefined) nb = 0
	nb = nb % 4
	if (nb === 0) res = componentData
	if (nb === 2) res = componentData.reverse()
	if (nb === 1) {
		// start in bottom left corner and work up in strips
		for (x = 0; x < width; x++) {
			for (y = width * (height - 1); y >= 0; y -= width) {
				res.push(componentData[y + x])
			}
		}
	}
	if (nb === 3) {
		// start in top right corner and work down and back in strips
		for (x = width - 1; x >= 0; x--) {
			for (y = 0; y <= width * (height - 1); y += width) {
				res.push(componentData[y + x])
			}
		}
	}

	if (flipped === 1) {
		if (nb % 2 === 0) {
			for (y = 0; y < height; y++) {
				for (FI = 0; FI <= width / 2 - 1; FI++) {
					startIndex = this.getLocalIndexForCoord(FI, y, width)
					endIndex = this.getLocalIndexForCoord(width - 1 - FI, y, width)
					;[res[startIndex], res[endIndex]] = [res[endIndex], res[startIndex]]
				}
			}
		} else if (nb % 2 === 1) {
			for (x = 0; x < height; x++) {
				for (FI = 0; FI <= width / 2; FI++) {
					startIndex = this.getLocalIndexForCoord(x, FI, height)
					endIndex = this.getLocalIndexForCoord(x, width - 1 - FI, height)
					;[res[startIndex], res[endIndex]] = [res[endIndex], res[startIndex]]
				}
			}
		}
	}

	return res
}

Factory.prototype.getLocalIndexForCoord = function (x, y, _width) {
	if (y == undefined && x.length == 2) {
		return x[1] * _width + x[0]
	} else {
		return y * _width + x
	}
}

Factory.prototype.rotateSquare = function (component, nb, _width, flipped) {
	var width = _width
	var i = 0
	var x = 0
	var y = 0
	var FI = 0
	var startIndex = 0
	var endIndex = 0

	if (nb == undefined) nb = 1
	nb = nb % 4

	var res = []
	for (i = 0; i < width * width; i++) {
		var c = this.getCoordsForIndex(i)
		x = c[0]
		y = c[1]
		switch (nb) {
			case 0:
				res[i] = component[i]
				break
			case 1:
				res[this.getIndexForCoord(y, x)] = component[this.getIndexForCoord(x, width - y - 1)]
				break
			case 2:
				res[this.getIndexForCoord(x, y)] = component[this.getIndexForCoord(width - x - 1, width - y - 1)]
				break
			case 3:
				res[this.getIndexForCoord(y, x)] = component[this.getIndexForCoord(width - x - 1, y)]
				break
		}
	}
	if (flipped === 1) {
		if (nb % 2 === 0) {
			for (y = 0; y < _width; y++) {
				for (FI = 0; FI <= 5; FI++) {
					startIndex = this.getIndexForCoord(FI, y)
					endIndex = this.getIndexForCoord(_width - 1 - FI, y)
					;[res[startIndex], res[endIndex]] = [res[endIndex], res[startIndex]]
				}
			}
		} else if (nb % 2 === 1) {
			for (x = 0; x < _width; x++) {
				for (FI = 0; FI <= 5; FI++) {
					startIndex = this.getIndexForCoord(x, FI)
					endIndex = this.getIndexForCoord(x, _width - 1 - FI)
					;[res[startIndex], res[endIndex]] = [res[endIndex], res[startIndex]]
				}
			}
		}
	}
	return res
}

Factory.prototype.checkForDuplicateTechValidation = function (componenetData) {
	var componenetName = componenetData[0]
	var index = componenetData[1]

	if (A_TECHS.includes(componenetName) || B_TECHS.includes(componenetName) || C_TECHS.includes(componenetName) || D_TECHS.includes(componenetName)) {
		var arrayIndex = _.findIndex(this.factoryComponents, function (el) {
			return el[1] === index
		})
		var letter = "A"
		if (B_TECHS.includes(componenetName)) letter = "B"
		if (C_TECHS.includes(componenetName)) letter = "C"
		if (D_TECHS.includes(componenetName)) letter = "D"
		var squaresInConnection = this.getConnectedIndexesFromIndex(index, letter)
		var squaresInConnectionThroughMainline = this.getConnectedIndexesFromIndexWithThroughMainlines(index, letter)

		/*$('selectable').remove();
    V.externalDrawSquares(M.players[0], squaresInConnectionThroughMainline, "blue", 'selectable');
    //debugger;*/

		// check component is unique in line
		var componentSqsInConnectionThroughMainline = []
		for (var i = 0; i < squaresInConnectionThroughMainline.length; i++) {
			componentSqsInConnectionThroughMainline.push(this.factoryCoords[squaresInConnectionThroughMainline[i]])
		}
		var componentSqAtIndex = this.factoryCoords[index]
		const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0)
		var sqCount = countOccurrences(componentSqsInConnectionThroughMainline, componentSqAtIndex)

		if (componenetName === CHASSIS && sqCount > 12) return [false, DUPLICATE_TECH]
		if (componenetName === BODY && sqCount > 12) return [false, DUPLICATE_TECH]
		if (componenetName === RADIATOR && sqCount > 6) return [false, DUPLICATE_TECH]
		if (componenetName === DOOR && sqCount > 4) return [false, DUPLICATE_TECH]
		if (componenetName === BUMPER && sqCount > 4) return [false, DUPLICATE_TECH]
		if (componenetName === DASHBOARD && sqCount > 8) return [false, DUPLICATE_TECH]
		if (componenetName === PAINT && sqCount > 6) return [false, DUPLICATE_TECH]
		if (componenetName === BATTERY && sqCount > 4) return [false, DUPLICATE_TECH]
		if (componenetName === ENGINE && sqCount > 16) return [false, DUPLICATE_TECH]
		if (componenetName === GEARS && sqCount > 12) return [false, DUPLICATE_TECH]
		if (componenetName === FUEL_TANK && sqCount > 8) return [false, DUPLICATE_TECH]
		if (componenetName === STEERING_WHEEL && sqCount > 9) return [false, DUPLICATE_TECH]
		if (componenetName === BRAKE && sqCount > 4) return [false, DUPLICATE_TECH]
		if (componenetName === TIRE && sqCount > 9) return [false, DUPLICATE_TECH]
		if (componenetName === HEADLIGHT && sqCount > 6) return [false, DUPLICATE_TECH]
		if (componenetName === WINDSHIELD && sqCount > 8) return [false, DUPLICATE_TECH]
		if (componenetName === CLAXON && sqCount > 4) return [false, DUPLICATE_TECH]
	}
	return [true, -1]
}

Factory.prototype.validateSingleComponent = function (componenetData) {
	var i = 0

	var componenetName = componenetData[0]
	var index = componenetData[1]
	var rotation = componenetData[2]

	if (!this.hasAnyAdjacencyToLoadingBay(index)) {
		return [false, NOT_ADJACENT_LOADING_BAY]
	}
	if (componenetName === DEPARTMENT_RESEARCH || componenetName === DEPARTMENT_PLANNING) {
		// Check turn 0 limits
		if (M.gameFlow.turn === 0 && !M.sandboxMode) {
			var resDeptCount = 0
			var planDeptCount = 0
			for (i = 0; i < this.factoryComponents.length; i++) {
				if (this.factoryComponents[i][0] === DEPARTMENT_RESEARCH) resDeptCount++
				if (this.factoryComponents[i][0] === DEPARTMENT_PLANNING) planDeptCount++
			}
			if (!(resDeptCount === planDeptCount && planDeptCount === 1)) return [false, TURN_0_ERROR]
		}
		return [true]
	}
	if (DEALERSHIPS.includes(componenetName) || DEPARTMENTS_MARKETING.includes(componenetName) || MAINLINES.includes(componenetName)) {
		var squaresAdjacentToComponent = this.getAllDirectlyAdjacentIndexesOnlyFromComponentIndex(index)
		var componentSqauresAdjacentToComponent = []
		for (i = 0; i < squaresAdjacentToComponent.length; i++) componentSqauresAdjacentToComponent.push(this.factoryCoords[squaresAdjacentToComponent[i]])
		componentSqauresAdjacentToComponent = _.uniq(componentSqauresAdjacentToComponent)
		// Marketing Dept must be directly Adj to Dealership
		if (DEPARTMENTS_MARKETING.includes(componenetName)) {
			return [componentSqauresAdjacentToComponent.some((r) => ALL_DEALERSHUP_SQ.includes(r)), NOT_ADJ_TO_DEALERSHIP]
		}
		// Mainlines must be directly Adj to Dealership
		else if (MAINLINES.includes(componenetName)) {
			return [componentSqauresAdjacentToComponent.some((r) => ALL_DEALERSHUP_SQ.includes(r)), NOT_ADJ_TO_DEALERSHIP]
		}
		// Dealership adj to mainline
		else if (DEALERSHIPS.includes(componenetName)) {
			return [componentSqauresAdjacentToComponent.some((r) => ALL_MAINLINE_SQ.includes(r)), NOT_ADJ_MAINLINE]
		}
		return [false, UNKNOWN]
	}
	if (A_TECHS.includes(componenetName) || B_TECHS.includes(componenetName) || C_TECHS.includes(componenetName) || D_TECHS.includes(componenetName)) {
		var arrayIndex = _.findIndex(this.factoryComponents, function (el) {
			return el[1] === index
		})
		var letter = "A"
		if (B_TECHS.includes(componenetName)) letter = "B"
		if (C_TECHS.includes(componenetName)) letter = "C"
		if (D_TECHS.includes(componenetName)) letter = "D"
		var squaresInConnection = this.getConnectedIndexesFromIndex(index, letter)
		var squaresInConnectionThroughMainline = this.getConnectedIndexesFromIndexWithThroughMainlines(index, letter)

		/*$('selectable').remove();
    V.externalDrawSquares(M.players[0], squaresInConnectionThroughMainline, "blue", 'selectable');
    //debugger;*/

		// check component is unique in line
		var componentSqsInConnectionThroughMainline = []
		for (i = 0; i < squaresInConnectionThroughMainline.length; i++) {
			componentSqsInConnectionThroughMainline.push(this.factoryCoords[squaresInConnectionThroughMainline[i]])
		}
		var componentSqAtIndex = this.factoryCoords[index]
		const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0)
		var sqCount = countOccurrences(componentSqsInConnectionThroughMainline, componentSqAtIndex)

		if (componenetName === CHASSIS && sqCount > 12) return [false, DUPLICATE_TECH]
		if (componenetName === BODY && sqCount > 12) return [false, DUPLICATE_TECH]
		if (componenetName === RADIATOR && sqCount > 6) return [false, DUPLICATE_TECH]
		if (componenetName === DOOR && sqCount > 4) return [false, DUPLICATE_TECH]
		if (componenetName === BUMPER && sqCount > 4) return [false, DUPLICATE_TECH]
		if (componenetName === DASHBOARD && sqCount > 8) return [false, DUPLICATE_TECH]
		if (componenetName === PAINT && sqCount > 6) return [false, DUPLICATE_TECH]
		if (componenetName === BATTERY && sqCount > 4) return [false, DUPLICATE_TECH]
		if (componenetName === ENGINE && sqCount > 16) return [false, DUPLICATE_TECH]
		if (componenetName === GEARS && sqCount > 12) return [false, DUPLICATE_TECH]
		if (componenetName === FUEL_TANK && sqCount > 8) return [false, DUPLICATE_TECH]
		if (componenetName === STEERING_WHEEL && sqCount > 9) return [false, DUPLICATE_TECH]
		if (componenetName === BRAKE && sqCount > 4) return [false, DUPLICATE_TECH]
		if (componenetName === TIRE && sqCount > 9) return [false, DUPLICATE_TECH]
		if (componenetName === HEADLIGHT && sqCount > 6) return [false, DUPLICATE_TECH]
		if (componenetName === WINDSHIELD && sqCount > 8) return [false, DUPLICATE_TECH]
		if (componenetName === CLAXON && sqCount > 4) return [false, DUPLICATE_TECH]

		// Check for any connected arrows
		var result = -1
		for (i = 0; i < this.factoryComponents[arrayIndex][RA_IDX].length; i++) {
			if (this.factoryComponents[arrayIndex][RA_IDX][i] > result) result = this.factoryComponents[arrayIndex][RA_IDX][i]
		}
		if (result === -1) return [false, NO_CONNECTED_ARROW]

		//var neighbourSquares = [];
		//for (var i = 0; i < squaresInConnection.length; i++) neighbourSquares = neighbourSquares.concat(this.getNeighbourIndexesOfIndex(squaresInConnection[i]));
		//V.externalDrawSquares(M.players[0], neighbourSquares, "yellow", 'selectable');*/
		var neighbourSquaresWithDir = []
		for (i = 0; i < squaresInConnection.length; i++) neighbourSquaresWithDir = neighbourSquaresWithDir.concat(this.getNeighbourIndexesOfIndexWithDirection(squaresInConnection[i]))

		// Guaranteed easy cases first
		for (i = 0; i < neighbourSquaresWithDir.length; i++) {
			//var checkIndex = neighbourSquaresWithDir[i].index;
			if (letter === "A" && MAINLINE_A_SQS_PURE.includes(this.factoryCoords[neighbourSquaresWithDir[i].index])) return [true]
			if (letter === "B" && MAINLINE_B_SQS_PURE.includes(this.factoryCoords[neighbourSquaresWithDir[i].index])) return [true]
			if (letter === "C" && MAINLINE_C_SQS_PURE.includes(this.factoryCoords[neighbourSquaresWithDir[i].index])) return [true]
			if (letter === "D" && MAINLINE_D_SQS_PURE.includes(this.factoryCoords[neighbourSquaresWithDir[i].index])) return [true]
		}
		// Now corner cases [validate single component]
		for (i = 0; i < neighbourSquaresWithDir.length; i++) {
			//var checkIndex = neighbourSquaresWithDir[i].index;
			if (this.checkMainlineCornerConnection(neighbourSquaresWithDir[i], letter)) return [true]
		}
		return [false, NO_MAINLINE_CONNECTION]
	}
	if (ARROWS.includes(componenetName)) {
		// Validated on placement
		return [true]
	}

	return [false, UNKNOWN]
}

// This takes ARROW COMPONENT data, and checks it CAN join with a tech (no check for tech, no check for multiple arrows)
Factory.prototype.checkValidityOfArrowTile = function (componenetData) {
	var arrowName = componenetData[0]
	var arrowIndex = componenetData[1]
	var arrowRotation = componenetData[2]
	var targetIndex = -1
	if (arrowRotation === 0 && arrowIndex - this.width >= 0) targetIndex = arrowIndex - this.width
	if (arrowRotation === 1 && (arrowIndex % this.width) + 1 < this.width) targetIndex = arrowIndex + 1
	if (arrowRotation === 2 && arrowIndex + this.width < this.factoryCoords.length) targetIndex = arrowIndex + this.width
	if (arrowRotation === 3 && (arrowIndex % this.width) - 1 >= 0) targetIndex = arrowIndex - 1
	var techComponentIndex = this.getComponentIndexFromAnyIndex(targetIndex)
	var arrayIndex = _.findIndex(this.factoryComponents, function (el) {
		return el[1] === techComponentIndex
	})
	if (arrayIndex === -1) return [false, -1]
	var componentName = this.factoryComponents[arrayIndex][0]
	return [this.checkValidArrowAndTech(arrowName, componentName), techComponentIndex]
}

Factory.prototype.checkValidArrowAndTech = function (arrowName, techName) {
	if (techName === CHASSIS && arrowName === ARROW_REL_A) return true

	if (techName === BODY && (arrowName === ARROW_REL_A || arrowName === ARROW_DESIGN_A)) return true
	if (techName === RADIATOR && arrowName === ARROW_RANGE_A) return true
	if (techName === DOOR && arrowName === ARROW_DESIGN_A) return true
	if (techName === BUMPER && (arrowName === ARROW_REL_A || arrowName === ARROW_SAFETY_A)) return true
	if (techName === DASHBOARD && (arrowName === ARROW_DESIGN_C || arrowName === ARROW_SPD_C)) return true
	if (techName === PAINT && arrowName === ARROW_DESIGN_C) return true
	if (techName === BATTERY && arrowName === ARROW_REL_C) return true
	if (techName === ENGINE && (arrowName === ARROW_SPD_B || arrowName === ARROW_RANGE_B || arrowName === ARROW_REL_B)) return true
	if (techName === GEARS && (arrowName === ARROW_SPD_B || arrowName === ARROW_RANGE_B)) return true
	if (techName === FUEL_TANK && (arrowName === ARROW_RANGE_B || arrowName === ARROW_SPD_B)) return true
	if (techName === STEERING_WHEEL && (arrowName === ARROW_SAFETY_B || arrowName === ARROW_DESIGN_B)) return true
	if (techName === BRAKE && arrowName === ARROW_SAFETY_B) return true
	if (techName === TIRE && (arrowName === ARROW_RANGE_D || arrowName === ARROW_SPD_D || arrowName === ARROW_SAFETY_D)) return true
	if (techName === HEADLIGHT && (arrowName === ARROW_DESIGN_D || arrowName === ARROW_SAFETY_D)) return true
	if (techName === WINDSHIELD && arrowName === ARROW_SAFETY_D) return true
	if (techName === CLAXON && arrowName === ARROW_SPD_D) return true

	return false
}

Factory.prototype.checkMainlineCornerConnection = function (neighbourSquareWithDir, letter, allowComingFromMainlineSq) {
	var index = neighbourSquareWithDir.index
	// ONLY WORKS IF ELIGIBILITY IS ALREADY CHECKED
	//if (letter === "ALL" && MAINLINE_ALL_SQS.includes(this.factoryCoords[index])) return true;

	// YOU MUST BE MOVING ON TO A MAINLINE CORNER
	if ((letter === "A" && MAINLINE_A_SQS.includes(this.factoryCoords[index])) || (letter === "B" && MAINLINE_B_SQS.includes(this.factoryCoords[index])) || (letter === "C" && MAINLINE_C_SQS.includes(this.factoryCoords[index])) || (letter === "D" && MAINLINE_D_SQS.includes(this.factoryCoords[index]))) {
		// We now have a possible connection
		var componentIndex = this.getComponentIndexFromAnyIndex(index)
		var arrayIndex = _.findIndex(this.factoryComponents, function (el) {
			return el[1] === componentIndex
		})
		var componentName = this.factoryComponents[arrayIndex][0]
		var componentRotation = this.factoryComponents[arrayIndex][2]
		var componentFlipped = this.factoryComponents[arrayIndex][3]
		if (componentFlipped === 0) {
			// Check to move ON TO a mainline
			if (!ALL_MAINLINE_SQ.includes(this.factoryCoords[neighbourSquareWithDir.indexFrom])) {
				if (componentRotation === 0) {
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "B") return true
				} else if (componentRotation === 1) {
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "D") return true
				} else if (componentRotation === 2) {
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "C") return true
				} else if (componentRotation === 3) {
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "A") return true
				}
			}
			// Now check thru mainline connections. [] I DONT UNDERSTAND THIS EITHER
			if (allowComingFromMainlineSq && ALL_MAINLINE_SQ.includes(this.factoryCoords[neighbourSquareWithDir.indexFrom])) {
				if (componentRotation === 0 || componentRotation === 2) {
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "B") return true
				} else if (componentRotation === 1 || componentRotation === 3) {
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "B") return true
				}
			}
		} else if (componentFlipped === 1) {
			// Check to move ON TO a mainline
			if (!ALL_MAINLINE_SQ.includes(this.factoryCoords[neighbourSquareWithDir.indexFrom])) {
				if (componentRotation === 0) {
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "B") return true
				} else if (componentRotation === 1) {
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "D") return true
				} else if (componentRotation === 2) {
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "C") return true
				} else if (componentRotation === 3) {
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "A") return true
				}
			}
			// Now check thru mainline connections. []
			/** *************************************************  I DONT UNDERSTAND THIS AT ALL NEED TO DO */
			if (allowComingFromMainlineSq && ALL_MAINLINE_SQ.includes(this.factoryCoords[neighbourSquareWithDir.indexFrom])) {
				if (componentRotation === 0 || componentRotation === 2) {
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "B") return true
				} else if (componentRotation === 1 || componentRotation === 3) {
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "A") return true
					if (neighbourSquareWithDir.directionMoving === "UP" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "DOWN" && letter === "D") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "C") return true
					if (neighbourSquareWithDir.directionMoving === "LEFT" && letter === "B") return true
					if (neighbourSquareWithDir.directionMoving === "RIGHT" && letter === "B") return true
				}
			}
		}
	}

	return false
}

Factory.prototype.getComponentIndexFromAnyIndex = function (index) {
	var i = 0
	var indexCoords
	var componentCoords
	var componentEndCoords
	var component
	var componentIndex = 0
	var tableWidth = 0
	var tableHeight = 0

	var componentName = getComponentNameFromSquare(this.factoryCoords[index])
	if (componentName === -100) return -100

	var numOfSameComponents = []
	for (i = 0; i < this.factoryComponents.length; i++) {
		if (this.factoryComponents[i][0] === componentName) numOfSameComponents.push(i)
	}
	if (numOfSameComponents.length === 1) return this.factoryComponents[numOfSameComponents[0]][1]

	// THIS WILL ALWAYS RETURN, AS MAIN INCLUDES ALL EXP SQS!
	if (componentName === FACTORY_MAIN_TILE) return this.mainFactoryIndex

	if (componentName === FACTORY_EXPANSION_TILE) {
		indexCoords = this.getCoordsForIndex(index)
		for (i = 0; i < this.factoryExpansions.length; i++) {
			component = EXPANSION_FACTORY_TILE_COMPONENT
			componentIndex = this.factoryExpansions[1][0]
			componentCoords = this.getCoordsForIndex(componentIndex)
			tableWidth = DIMENSIONS[component[0]][0]
			tableHeight = DIMENSIONS[component[0]][1]
			if (component[2] % 2 === 1) {
				tableWidth = DIMENSIONS[component[0]][1]
				tableHeight = DIMENSIONS[component[0]][0]
			}
			// NEED TO SUBTRACT ONE AS OUR CO-ORDS START AT ZERO
			componentEndCoords = [componentCoords[0] + tableWidth - 1, componentCoords[1] + tableHeight - 1]
			if (componentCoords[0] <= indexCoords[0] && indexCoords[0] <= componentEndCoords[0] && componentCoords[1] <= indexCoords[1] && indexCoords[1] <= componentEndCoords[1]) return this.factoryExpansions[1][0]
		}
	}

	// We know the component name, but not which one it is
	indexCoords = this.getCoordsForIndex(index)
	for (i = 0; i < numOfSameComponents.length; i++) {
		component = this.factoryComponents[numOfSameComponents[i]]
		componentIndex = component[1]
		componentCoords = this.getCoordsForIndex(componentIndex)
		tableWidth = DIMENSIONS[component[0]][0]
		tableHeight = DIMENSIONS[component[0]][1]
		if (component[2] % 2 === 1) {
			tableWidth = DIMENSIONS[component[0]][1]
			tableHeight = DIMENSIONS[component[0]][0]
		}
		// NEED TO SUBTRACT ONE AS OUR CO-ORDS START AT ZERO
		componentEndCoords = [componentCoords[0] + tableWidth - 1, componentCoords[1] + tableHeight - 1]
		if (componentCoords[0] <= indexCoords[0] && indexCoords[0] <= componentEndCoords[0] && componentCoords[1] <= indexCoords[1] && indexCoords[1] <= componentEndCoords[1]) return component[1]
	}
}

Factory.prototype.getAllComponentDataOfDirectConnectionsToComponentIndex = function (index) {
	var i = 0

	var adjacentSquares = this.getAllDirectlyAdjacentIndexesOnlyFromComponentIndex(index)
	var adjacentComponentIndexes = []
	for (i = 0; i < adjacentSquares.length; i++) {
		if (this.getComponentIndexFromAnyIndex(adjacentSquares[i]) > -100) adjacentComponentIndexes.push(this.getComponentIndexFromAnyIndex(adjacentSquares[i]))
	}
	var res = []
	for (i = 0; i < this.factoryComponents.length; i++) {
		if (adjacentComponentIndexes.includes(this.factoryComponents[i][1])) res.push(this.factoryComponents[i])
	}
	return res
}

Factory.prototype.getAllDirectlyAdjacentIndexesOnlyFromComponentIndex = function (componenetIndex) {
	var res = []
	var componentIndexes = this.getAdjacentIndexesFromIndex(componenetIndex, false)
	/*V.externalDrawSquares(M.players[1],  componentIndexes, "yellow", 'selectable');
  debugger;*/
	for (var i = 0; i < componentIndexes.length; i++) {
		// top
		if (componentIndexes[i] - this.width >= 0) res.push(componentIndexes[i] - this.width)
		// Bottom
		if (componentIndexes[i] + this.width < this.factoryCoords.length) res.push(componentIndexes[i] + this.width)
		//left
		if ((componentIndexes[i] % this.width) - 1 >= 0) res.push(componentIndexes[i] - 1)
		// right
		if ((componentIndexes[i] % this.width) + 1 < this.width) res.push(componentIndexes[i] + 1)
	}
	res = _.uniq(res)
	res = _.difference(res, componentIndexes)
	return res
}

Factory.prototype.getAllDirectlyAdjacentIndexesOnlyFromComponentIndexWithInwardsPointer = function (componenetIndex) {
	var res = []
	var res2 = []
	var componentIndexes = this.getAdjacentIndexesFromIndex(componenetIndex, false)
	/*V.externalDrawSquares(M.players[1],  componentIndexes, "yellow", 'selectable');
  debugger;*/
	for (var i = 0; i < componentIndexes.length; i++) {
		// top
		if (componentIndexes[i] - this.width >= 0) {
			res.push([componentIndexes[i] - this.width, 2])
		}
		// Bottom
		if (componentIndexes[i] + this.width < this.factoryCoords.length) {
			res.push([componentIndexes[i] + this.width, 0])
		}
		//left
		if ((componentIndexes[i] % this.width) - 1 >= 0) {
			res.push([componentIndexes[i] - 1, 1])
		}
		// right
		if ((componentIndexes[i] % this.width) + 1 < this.width) {
			res.push([componentIndexes[i] + 1, 3])
		}
	}
	res = _.uniq(res)
	res = _.difference(res, componentIndexes)
	return res
}

Factory.prototype.getComponentDataAtIndex = function (index) {
	var arrayIndex = _.findIndex(this.factoryComponents, function (el) {
		return el[1] === index
	})
	if (arrayIndex === -1) alert("Component find error")
	var componentName = this.factoryComponents[arrayIndex][0]
	var componentRotation = this.factoryComponents[arrayIndex][2]
	return [componentName, index, componentRotation]
}

Factory.prototype.hasAnyAdjacencyToLoadingBay = function (index) {
	var allAdjacentSquares = this.getAdjacentIndexesFromIndex(index, true)
	for (var i = 0; i < allAdjacentSquares.length; i++) {
		allAdjacentSquares[i] = this.factoryCoords[allAdjacentSquares[i]]
	}
	if (allAdjacentSquares.includes(LOADING_DOCK_INNER)) return true
	return false
}

Factory.prototype.getConnectedIndexesFromIndex = function (index, letter) {
	var res = [index]
	var explo = [index]
	var anchorComponentSquares = [...A_TECH_SQS]
	if (letter === "B") anchorComponentSquares = [...B_TECH_SQS]
	if (letter === "C") anchorComponentSquares = [...C_TECH_SQS]
	if (letter === "D") anchorComponentSquares = [...D_TECH_SQS]
	var toExplo = _.filter(
		this.getNeighbourIndexesOfIndex.call(this, index),
		function (space) {
			return anchorComponentSquares.includes(this.factoryCoords[space])
		},
		this
	)

	while (toExplo.length > 0) {
		var temp = []
		_.each(
			toExplo,
			function (space) {
				if (explo.indexOf(space) == -1 && res.indexOf(space) == -1 && anchorComponentSquares.includes(this.factoryCoords[space])) {
					res.push(space)
					explo.push(space)
					temp = temp.concat(
						_.filter(
							this.getNeighbourIndexesOfIndex.call(this, space),
							function (s) {
								return anchorComponentSquares.includes(this.factoryCoords[space])
							},
							this
						)
					)
				}
			},
			this
		)
		toExplo = _.difference(_.uniq(temp), explo)
	}
	return res
}

Factory.prototype.checkEligibilityOfSquareForConnection = function (anchorComponentSquares, space, letter) {
	// Check moving FROM ONE mainline TO ANOTHER separate mainline
	if (MAINLINE_ALL_SQS.includes(this.factoryCoords[space.indexFrom]) && MAINLINE_ALL_SQS.includes(this.factoryCoords[space.index])) {
		// If noth Mainline SQS, check components are different
		var mainlineIndex1 = this.getComponentIndexFromAnyIndex(space.indexFrom)
		var mainlineIndex2 = this.getComponentIndexFromAnyIndex(space.index)

		// If different mainlines, check you can continue
		if (mainlineIndex1 !== mainlineIndex2) {
			var proceed = false

			var mainlineComponentSq1 = this.factoryCoords[space.indexFrom]
			var mainlineComponentSq2 = this.factoryCoords[space.index]
			// You can go from PURE to PURE
			if (mainlineComponentSq1 === mainlineComponentSq2 && MAINLINE_SQS_PURE.includes(mainlineComponentSq1)) proceed = true
			// Otherwise, you only need to worry about "Opposit" corners, or Corner to main
			// They can only touch if the rotations are 180 degrees out
			var arrayIndex1 = _.findIndex(this.factoryComponents, function (el) {
				return el[1] === mainlineIndex1
			})
			var arrayIndex2 = _.findIndex(this.factoryComponents, function (el) {
				return el[1] === mainlineIndex2
			})

			var mainlineComponentRotation1 = this.factoryComponents[arrayIndex1][2]
			var mainlineComponentRotation2 = this.factoryComponents[arrayIndex2][2]

			var mainlineComponentFlipped1 = this.factoryComponents[arrayIndex1][3]
			var mainlineComponentFlipped2 = this.factoryComponents[arrayIndex2][3]

			var rotationalDifference = Math.abs(mainlineComponentRotation1 - mainlineComponentRotation2)
			var flippedDifference = Math.abs(mainlineComponentFlipped1 - mainlineComponentFlipped2)
			// They must have opposite Rotations, or else they can't join
			// So first check same flippedness
			if (rotationalDifference === 2 && flippedDifference === 0) {
				// IF VALID THEN RETURN TRUE
				// If horizontal AND inverted to each other
				if (mainlineComponentRotation1 % 2 === 0) {
					if (letter === "D" && MAINLINE_D_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "D" && MAINLINE_D_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
					if (letter === "A" && MAINLINE_A_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "A" && MAINLINE_A_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
				}
				// otherwise must be joined L/R and inverted
				else {
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
					if (letter === "A" && MAINLINE_A_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "A" && MAINLINE_A_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
					if (letter === "D" && MAINLINE_D_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "D" && MAINLINE_D_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
				}
			} else if (rotationalDifference === 2 && flippedDifference === 1) {
				// IF VALID THEN RETURN TRUE
				// If horizontal AND inverted to each other
				if (mainlineComponentRotation1 % 2 === 0) {
					if (letter === "D" && MAINLINE_D_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "D" && MAINLINE_D_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
					if (letter === "A" && MAINLINE_A_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "A" && MAINLINE_A_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
				}
				// otherwise must be joined L/R and inverted
				else {
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
					if (letter === "A" && MAINLINE_A_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "A" && MAINLINE_A_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
					if (letter === "D" && MAINLINE_D_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "D" && MAINLINE_D_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
				}
			} else if (rotationalDifference == 0 && flippedDifference === 1) {
				if (mainlineComponentRotation1 % 2 === 0) {
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "LEFT") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "RIGHT") return true
				}
				// otherwise must be joined L/R and inverted
				else if (mainlineComponentRotation1 % 2 === 1) {
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "B" && MAINLINE_B_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "DOWN") return true
					if (letter === "C" && MAINLINE_C_SQS.includes(mainlineComponentSq1) && space.directionMoving === "UP") return true
				}
			}

			if (!proceed) return false
		}
	}

	// check when trying to move FROM a mainline CORNER TO TECH, IF wrong DIR, return false
	if (MAINLINE_SQS_CORNERS.includes(this.factoryCoords[space.indexFrom]) && !MAINLINE_ALL_SQS.includes(this.factoryCoords[space.index])) {
		var mainlineComponentIndex = this.getComponentIndexFromAnyIndex(space.indexFrom)
		var arrayIndex = _.findIndex(this.factoryComponents, function (el) {
			return el[1] === mainlineComponentIndex
		})
		var mainlineComponentName = this.factoryComponents[arrayIndex][0]
		var mainlineComponentRotation = this.factoryComponents[arrayIndex][2]
		var mainlineComponentFlipped = this.factoryComponents[arrayIndex][3]
		if (mainlineComponentFlipped === 0) {
			if (mainlineComponentRotation === 0) {
				if (letter === "A" && space.directionMoving !== "DOWN") return false
				if (letter === "B" && space.directionMoving !== "RIGHT") return false
				if (letter === "C" && space.directionMoving !== "LEFT") return false
				if (letter === "D" && space.directionMoving !== "UP") return false
			} else if (mainlineComponentRotation === 1) {
				if (letter === "A" && space.directionMoving !== "LEFT") return false
				if (letter === "B" && space.directionMoving !== "DOWN") return false
				if (letter === "C" && space.directionMoving !== "UP") return false
				if (letter === "D" && space.directionMoving !== "RIGHT") return false
			} else if (mainlineComponentRotation === 2) {
				if (letter === "A" && space.directionMoving !== "UP") return false
				if (letter === "B" && space.directionMoving !== "LEFT") return false
				if (letter === "C" && space.directionMoving !== "RIGHT") return false
				if (letter === "D" && space.directionMoving !== "DOWN") return false
			} else if (mainlineComponentRotation === 3) {
				if (letter === "A" && space.directionMoving !== "RIGHT") return false
				if (letter === "B" && space.directionMoving !== "UP") return false
				if (letter === "C" && space.directionMoving !== "DOWN") return false
				if (letter === "D" && space.directionMoving !== "LEFT") return false
			}
		} else if (mainlineComponentFlipped === 1) {
			if (mainlineComponentRotation === 0) {
				if (letter === "A" && space.directionMoving !== "DOWN") return false
				if (letter === "B" && space.directionMoving !== "LEFT") return false
				if (letter === "C" && space.directionMoving !== "RIGHT") return false
				if (letter === "D" && space.directionMoving !== "UP") return false
			} else if (mainlineComponentRotation === 1) {
				if (letter === "A" && space.directionMoving !== "LEFT") return false
				if (letter === "B" && space.directionMoving !== "UP") return false
				if (letter === "C" && space.directionMoving !== "DOWN") return false
				if (letter === "D" && space.directionMoving !== "RIGHT") return false
			} else if (mainlineComponentRotation === 2) {
				if (letter === "A" && space.directionMoving !== "UP") return false
				if (letter === "B" && space.directionMoving !== "RIGHT") return false
				if (letter === "C" && space.directionMoving !== "LEFT") return false
				if (letter === "D" && space.directionMoving !== "DOWN") return false
			} else if (mainlineComponentRotation === 3) {
				if (letter === "A" && space.directionMoving !== "RIGHT") return false
				if (letter === "B" && space.directionMoving !== "DOWN") return false
				if (letter === "C" && space.directionMoving !== "UP") return false
				if (letter === "D" && space.directionMoving !== "LEFT") return false
			}
		}
	}
	// If it's a correct tech square, then add it

	// Before checking anchor techs, need to make sure we're not switching lines with "ALL"
	if (letter === "ALL") {
		var sqFrom = this.factoryCoords[space.indexFrom]
		var sqTo = this.factoryCoords[space.index]
		const containsAllA = [sqFrom, sqTo].every((element) => {
			return ALL_A_SQS.includes(element)
		})
		const containsAllB = [sqFrom, sqTo].every((element) => {
			return ALL_B_SQS.includes(element)
		})
		const containsAllC = [sqFrom, sqTo].every((element) => {
			return ALL_C_SQS.includes(element)
		})
		const containsAllD = [sqFrom, sqTo].every((element) => {
			return ALL_D_SQS.includes(element)
		})
		if (!containsAllA && !containsAllB && !containsAllC && !containsAllD) return false
	}

	if (anchorComponentSquares.includes(this.factoryCoords[space.index])) return true
	// else if moving on to mainline from correct corner then add it [check eligibilty of sq for connection]
	if (this.checkMainlineCornerConnection(space, letter, true)) return true

	return false
}

Factory.prototype.checkDealershipLevels = function () {
	var i = 0
	var j = 0

	var mainlineIndexes = []
	for (i = 0; i < this.factoryComponents.length; i++) {
		if (MAINLINES.includes(this.factoryComponents[i][0])) mainlineIndexes.push(this.factoryComponents[i][1])
	}
	// For each mainline, find the nnumber of spec arrows connected to it
	for (i = 0; i < mainlineIndexes.length; i++) {
		var mainlineTechLevels = [0, 0, 0, 0, 0]
		// Get all indexes of the Mainline index
		var currentMainlineIndexes = this.getAdjacentIndexesFromIndex(mainlineIndexes[i])

		var Aindex = -1
		var Bindex = -1
		var Cindex = -1
		var Dindex = -1
		/*$('.selectable').remove();
    V.externalDrawSquares(M.players[0], currentMainlineIndexes, "red", 'selectable');
    debugger;*/

		// Now find a pure A / B / C / D square
		for (j = 0; j < currentMainlineIndexes.length; j++) {
			if (Aindex === -1 && MAINLINE_A_SQS_PURE.includes(this.factoryCoords[currentMainlineIndexes[j]])) Aindex = currentMainlineIndexes[j]
			if (Bindex === -1 && MAINLINE_B_SQS_PURE.includes(this.factoryCoords[currentMainlineIndexes[j]])) Bindex = currentMainlineIndexes[j]
			if (Cindex === -1 && MAINLINE_C_SQS_PURE.includes(this.factoryCoords[currentMainlineIndexes[j]])) Cindex = currentMainlineIndexes[j]
			if (Dindex === -1 && MAINLINE_D_SQS_PURE.includes(this.factoryCoords[currentMainlineIndexes[j]])) Dindex = currentMainlineIndexes[j]
		}

		/*$('.selectable').remove();
    V.externalDrawSquares(M.players[0], [Aindex], "red", 'selectable');
    debugger;
    $('.selectable').remove();
    V.externalDrawSquares(M.players[0], [Bindex], "red", 'selectable');
    debugger;
    $('.selectable').remove();
    V.externalDrawSquares(M.players[0], [Cindex], "red", 'selectable');
    debugger;
    $('.selectable').remove();
    V.externalDrawSquares(M.players[0], [Dindex], "red", 'selectable');
    debugger;*/

		var AallConnectedSquares = this.getConnectedIndexesFromIndexWithThroughMainlines(Aindex, "A")
		var BallConnectedSquares = this.getConnectedIndexesFromIndexWithThroughMainlines(Bindex, "B")
		var CallConnectedSquares = this.getConnectedIndexesFromIndexWithThroughMainlines(Cindex, "C")
		var DallConnectedSquares = this.getConnectedIndexesFromIndexWithThroughMainlines(Dindex, "D")

		/*$('.selectable').remove();
    V.externalDrawSquares(M.players[0], AallConnectedSquares, "red", 'selectable');
    debugger;
    $('.selectable').remove();
    V.externalDrawSquares(M.players[0], BallConnectedSquares, "red", 'selectable');
    debugger;
    $('.selectable').remove();
    V.externalDrawSquares(M.players[0], CallConnectedSquares, "red", 'selectable');
    debugger;
    $('.selectable').remove();
    V.externalDrawSquares(M.players[0], DallConnectedSquares, "red", 'selectable');
    debugger;*/

		// Now find all connected squares to those and concat
		var allConnectedSquares = AallConnectedSquares.concat(BallConnectedSquares).concat(CallConnectedSquares).concat(DallConnectedSquares)

		/*$('.selectable').remove();
    V.externalDrawSquares(M.players[0], allConnectedSquares, "red", 'selectable');
    /*debugger;*/

		connectedIndexes = []
		for (j = 0; j < allConnectedSquares.length; j++) {
			// Don't think i need a -100 check here but not sure
			if (this.getComponentIndexFromAnyIndex(allConnectedSquares[j]) > -100) connectedIndexes.push(this.getComponentIndexFromAnyIndex(allConnectedSquares[j]))
		}
		connectedIndexes = _.uniq(connectedIndexes)
		// Now for each connected index, go thru factory components, find where it is, and find if it's an arrow.
		for (j = 0; j < connectedIndexes.length; j++) {
			var index = connectedIndexes[j]
			var arrayIndex = _.findIndex(this.factoryComponents, function (el) {
				return el[1] === index
			})
			// During fac expan
			if (arrayIndex === -1) return
			var componentName = this.factoryComponents[arrayIndex][0]

			if (ARROWS_RED.includes(componentName)) mainlineTechLevels[0]++
			if (ARROWS_GREEN.includes(componentName)) mainlineTechLevels[1]++
			if (ARROWS_PURPLE.includes(componentName)) mainlineTechLevels[2]++
			if (ARROWS_BLUE.includes(componentName)) mainlineTechLevels[3]++
			if (ARROWS_YELLOW.includes(componentName)) mainlineTechLevels[4]++
		}
		// Now add the data to the mainline
		var arrayIndexMainline = _.findIndex(this.factoryComponents, function (el) {
			return el[1] === mainlineIndexes[i]
		})
		this.factoryComponents[arrayIndexMainline][TL_IDX] = [...mainlineTechLevels]
	}

	// Finally, all dealershups in factory
	var allDealershipIndexes = []
	for (i = 0; i < this.factoryComponents.length; i++) {
		if (DEALERSHIPS.includes(this.factoryComponents[i][0])) allDealershipIndexes.push(this.factoryComponents[i][1])
	}

	// Now get the adjacent mainlines, and take the min tech from every one
	for (i = 0; i < allDealershipIndexes.length; i++) {
		// Needs to be 9s, as it starts at the max and works down
		var thisDealershipTech = [9, 9, 9, 9, 9]
		var squaresAdjacentToDealership = this.getAllDirectlyAdjacentIndexesOnlyFromComponentIndex(allDealershipIndexes[i])
		// for each component square, find the component index
		var componentIndexesAdjacent = []
		_.each(
			squaresAdjacentToDealership,
			function (sq) {
				if (this.getComponentIndexFromAnyIndex(sq) > -100) componentIndexesAdjacent.push(this.getComponentIndexFromAnyIndex(sq))
			},
			this
		)

		componentIndexesAdjacent = _.uniq(componentIndexesAdjacent)
		_.each(
			componentIndexesAdjacent,
			function (compIndexAdj) {
				// find component
				var arrayIndex = _.findIndex(this.factoryComponents, function (el) {
					return el[1] === compIndexAdj
				})
				// if it is a mainline, get its techlevel
				if (arrayIndex > -1 && MAINLINES.includes(this.factoryComponents[arrayIndex][0])) {
					for (j = 0; j < thisDealershipTech.length; j++) {
						if (thisDealershipTech[j] > this.factoryComponents[arrayIndex][TL_IDX][j]) thisDealershipTech[j] = this.factoryComponents[arrayIndex][TL_IDX][j]
					}
				}
			},
			this
		)

		// Now add the data back to the dealership in factory components
		var dealershipIndex = _.findIndex(this.factoryComponents, function (el) {
			return el[1] === allDealershipIndexes[i]
		})

		// Reset for debugging
		//thisDealershipTech = [9, 9, 9, 9, 9];

		this.factoryComponents[dealershipIndex][TL_IDX] = [...thisDealershipTech]
	} // END each dealership
}

// THIS IS ALSO THE FIRST STEP OF CHECKING TECH LEVELS // FIRST STEP IN DUPLICATE TECH CHECK -> single letter goes thru
Factory.prototype.getConnectedIndexesFromIndexWithThroughMainlines = function (index, letter, startAtWholeDealership) {
	var res = [index]
	var explo = [index]
	var anchorComponentSquares = [...A_TECH_SQS].concat([...MAINLINE_A_SQS_PURE])
	if (letter === "B") anchorComponentSquares = [...B_TECH_SQS].concat([...MAINLINE_B_SQS_PURE])
	if (letter === "C") anchorComponentSquares = [...C_TECH_SQS].concat([...MAINLINE_C_SQS_PURE])
	if (letter === "D") anchorComponentSquares = [...D_TECH_SQS].concat([...MAINLINE_D_SQS_PURE])
	// All means we can go thru all techs, plus PURE mainline sqs, BUT need to CHECK CORNERS and when moving FROM MLINE TO MLINE
	if (letter === "ALL")
		anchorComponentSquares = [...ALL_TECH_SQS].concat(
			[...MAINLINE_A_SQS_PURE]
				.concat([...MAINLINE_B_SQS_PURE])
				.concat([...MAINLINE_C_SQS_PURE])
				.concat([...MAINLINE_D_SQS_PURE])
		)

	var toExplo = _.filter(
		this.getNeighbourIndexesOfIndexWithDirection.call(this, index),
		function (space) {
			return this.checkEligibilityOfSquareForConnection(anchorComponentSquares, space, letter)
		},
		this
	)

	// if using ALL, you are starting at a Mainline, so get all the squares of that firest.
	//if (letter === ("ALL")) {
	if (startAtWholeDealership) {
		res = this.getAdjacentIndexesFromIndex(index)
		//explo = this.getNeighbourIndexesOfIndexWithDirection(index);
		explo = this.getAdjacentIndexesFromIndex(index)
		toExplo = []
		_.each(
			explo,
			function (exploIndex) {
				var neighbs = this.getNeighbourIndexesOfIndexWithDirection(exploIndex)
				_.filter(
					neighbs,
					function (space) {
						return this.checkEligibilityOfSquareForConnection(anchorComponentSquares, space, letter)
					},
					this
				)
				if (neighbs.length > 0) toExplo = toExplo.concat([...neighbs])
			},
			this
		)

		/*$('selectable').remove();
    V.externalDrawSquares(M.players[0], res, "green", 'selectable');
    debugger;
    /*$('selectable').remove();
    V.externalDrawSquares(M.players[0], explo, "yello", 'selectable');
    debugger;*/
	}

	/*$('selectable').remove();
  var tempDraw = [];
  for (var i=0;i<toExplo.length;i++) tempDraw.push(toExplo[i].index)
  V.externalDrawSquares(M.players[0], tempDraw, "blue", 'selectable');
  debugger;*/

	while (toExplo.length > 0) {
		var temp = []
		_.each(
			toExplo,
			function (space) {
				if (explo.indexOf(space) == -1 && res.indexOf(space.index) == -1 && this.checkEligibilityOfSquareForConnection(anchorComponentSquares, space, letter)) {
					res.push(space.index)
					explo.push(space.index)
					temp = temp.concat(
						_.filter(
							this.getNeighbourIndexesOfIndexWithDirection.call(this, space.index),
							function (s) {
								return this.checkEligibilityOfSquareForConnection(anchorComponentSquares, s, letter)
							},
							this
						)
					)
				}
			},
			this
		)

		toExplo = _.difference(_.uniq(temp), explo)
	}
	return res
}

// Gets the indexes of the component, from an index (unless anySquares, then everything not OOB / Empty)
// MUST be the index of the compnent matching that in factoryComponents
Factory.prototype.getAdjacentIndexesFromIndex = function (index, anySquares) {
	var res = [index]
	var explo = [index]
	var anchorComponentSq = this.factoryCoords[index]
	var anchorComponentSquares = [anchorComponentSq]
	var componenetData = this.getComponentDataAtIndex(index)
	var tableWidth = DIMENSIONS[componenetData[0]][0]
	var tableHeight = DIMENSIONS[componenetData[0]][1]
	if (componenetData[2] % 2 == 1) {
		tableWidth = DIMENSIONS[componenetData[0]][1]
		tableHeight = DIMENSIONS[componenetData[0]][0]
	}
	if (MAINLINES.includes(componenetData[0])) {
		anchorComponentSquares = [...ALL_MAINLINE_SQ]
	}

	var indexCoords = this.getCoordsForIndex(index)

	var toExplo = _.filter(
		this.getNeighbourIndexesOfIndex.call(this, index),
		function (space) {
			if (anySquares) return this.factoryCoords[space] !== OUT_OF_BOUNDS && this.factoryCoords[space] !== EMPTY_SPACE
			else return anchorComponentSquares.includes(this.factoryCoords[space])
		},
		this
	)

	while (toExplo.length > 0) {
		var temp = []

		_.each(
			toExplo,
			function (space) {
				if (explo.indexOf(space) == -1 && res.indexOf(space) == -1 && this.factoryCoords[space] !== OUT_OF_BOUNDS && this.factoryCoords[space] !== EMPTY_SPACE) {
					var spaceCoords = this.getCoordsForIndex(space)
					// Make sure you don't spill into another same componenet
					if (anySquares || (spaceCoords[0] - indexCoords[0] < tableWidth && spaceCoords[1] - indexCoords[1] < tableHeight && spaceCoords[0] >= indexCoords[0] && spaceCoords[1] >= indexCoords[1] && anchorComponentSquares.includes(this.factoryCoords[space]))) {
						res.push(space)
						explo.push(space)
						temp = temp.concat(
							_.filter(
								this.getNeighbourIndexesOfIndex.call(this, space),
								function (s) {
									if (anySquares) return s !== OUT_OF_BOUNDS && s !== EMPTY_SPACE
									else return anchorComponentSquares.includes(this.factoryCoords[space])
								},
								this
							)
						)
					}
				}
			},
			this
		)
		toExplo = _.difference(_.uniq(temp), explo)
	}

	return res
}

Factory.prototype.removeComponentAtIndex = function (index) {
	var i = 0
	var placedComponentIndex = index
	// find out what componentName is at this index and add one back
	var arrayIndex = _.findIndex(this.factoryComponents, function (el) {
		return el[1] === placedComponentIndex
	})
	var componentName = this.factoryComponents[arrayIndex][0]
	var placedComponentRotation = this.factoryComponents[arrayIndex][2]
	var placedComponentFlipped = this.factoryComponents[arrayIndex][3]

	M.availableComponents[componentName]++

	// If it's tech, remove the arrows as well
	if (A_TECHS.includes(componentName) || B_TECHS.includes(componentName) || C_TECHS.includes(componentName) || D_TECHS.includes(componentName)) {
		for (i = 0; i < this.factoryComponents[arrayIndex][RA_IDX].length; i++) {
			// remove the arrows
			if (this.factoryComponents[arrayIndex][RA_IDX][i] >= 0) {
				var arrowIndex = this.factoryComponents[arrayIndex][RA_IDX][i]
				var fcArrayIndex = _.findIndex(this.factoryComponents, function (el) {
					return el[1] === arrowIndex
				})
				// add back into stock
				M.availableComponents[this.factoryComponents[fcArrayIndex][0]]++

				// wipe from model
				//							= function (componentName, _componentData, index, rotation, flipped, removal) {
				this.placeComponentIntoFactoryModel(this.factoryComponents[fcArrayIndex][0], getComponentModelFromName(this.factoryComponents[fcArrayIndex][0]), this.factoryComponents[fcArrayIndex][1], 0, 0, true)
				// and factory
				_.remove(this.factoryComponenetIndexesAddedThisTurn, (number) => number == arrowIndex)
				_.remove(this.factoryComponents, (number) => number[1] === arrowIndex)
			}
		}
	}

	// If it's an arrow, remove it from it's related tech
	if (ARROWS.includes(componentName)) {
		var techindex = this.checkValidityOfArrowTile(this.factoryComponents[arrayIndex])[1]
		var arrayTechIndex = _.findIndex(this.factoryComponents, function (el) {
			return el[1] === techindex
		})
		for (i = 0; i < this.factoryComponents[arrayTechIndex][RA_IDX].length; i++) {
			if (this.factoryComponents[arrayTechIndex][RA_IDX][i] === placedComponentIndex) this.factoryComponents[arrayTechIndex][RA_IDX][i] = -1
		}
	}

	// remove component from player factory lists
	_.remove(this.factoryComponenetIndexesAddedThisTurn, (number) => number == placedComponentIndex)
	_.remove(this.factoryComponents, (number) => number[1] === placedComponentIndex)

	// remove component from model ************
	//							 = function (componentName, _componentData, index, rotation, flipped, removal) {
	this.placeComponentIntoFactoryModel(componentName, getComponentModelFromName(componentName), placedComponentIndex, placedComponentRotation, placedComponentFlipped, true)
}

Factory.prototype.getStockForDealership = function (dship) {
	var adjMainlineData = this.getAllComponentDataOfDirectConnectionsToComponentIndex(dship[1])
	adjMainlineData = adjMainlineData.filter(function (componenet) {
		return MAINLINES.includes(componenet[0])
	})
	var stock = [0, 0, 0]
	for (var j = 0; j < adjMainlineData.length; j++) {
		if (adjMainlineData[j][0] === MAINLINE_CAR) stock[0] = stock[0] + adjMainlineData[j][SL_IDX]
		else if (adjMainlineData[j][0] === MAINLINE_TRUCK) stock[1] = stock[1] + adjMainlineData[j][SL_IDX]
		else if (adjMainlineData[j][0] === MAINLINE_SPORTS) stock[2] = stock[2] + adjMainlineData[j][SL_IDX]
	}
	return stock
}

Factory.prototype.removeItemFromMainlineAdjacentToDealership = function (dealership, item) {
	var adjMainlineData = this.getAllComponentDataOfDirectConnectionsToComponentIndex(dealership[1])
	adjMainlineData = adjMainlineData.filter(function (componenet) {
		return MAINLINES.includes(componenet[0])
	})

	// Now we have all connected mainlines by data. Want JUST the correct vehicle type
	if (item === 0)
		adjMainlineData = adjMainlineData.filter(function (componenet) {
			return componenet[0] === MAINLINE_CAR
		})
	else if (item === 1)
		adjMainlineData = adjMainlineData.filter(function (componenet) {
			return componenet[0] === MAINLINE_TRUCK
		})
	else if (item === 2)
		adjMainlineData = adjMainlineData.filter(function (componenet) {
			return componenet[0] === MAINLINE_SPORTS
		})

	// Now we have the correct type, need to check stock level is > 0
	adjMainlineData = adjMainlineData.filter(function (componenet) {
		return componenet[SL_IDX] > 0
	})

	// Now we have the correct type, and stock, need to try to limit to unique connection
	var indexToUse = 0

	for (var i = 0; i < adjMainlineData.length; i++) {
		// Get connected components
		var connectedComponentData = this.getAllComponentDataOfDirectConnectionsToComponentIndex(adjMainlineData[i][1])
		// If only a single dealer
		var connectedDealerships = 0
		for (var j = 0; j < connectedComponentData.length; j++) {
			if (DEALERSHIPS.includes(connectedComponentData[j][0])) connectedDealerships++
		}
		if (connectedDealerships === 1) {
			indexToUse = i
			break
		}
	}
	adjMainlineData[indexToUse][SL_IDX]--
}

Factory.prototype.findAllPossibleSpecsToAdd = function () {
	// Store an array, each entry being [index of factory components missing spec, missing spec, missing spec, missing spec]
	var ret = []
	var ret_line = []
	var allowedTechLevels = Rules.getAllowedTechLevels(true)

	// Go through every component in the factory
	for (var i = 0; i < this.factoryComponents.length; i++) {
		// If it can have spec arrows
		if (ONE_SLOT_TECH.includes(this.factoryComponents[i][0]) && this.factoryComponents[i][4][0] === -1) {
			// var ONE_SLOT_TECH = [DOOR, PAINT, BATTERY, BRAKE, WINDSHIELD, CLAXON];
			// Store info
			if (this.factoryComponents[i][0] === DOOR) ret.push([i, ARROW_DESIGN_A])
			if (this.factoryComponents[i][0] === PAINT) ret.push([i, ARROW_DESIGN_C])
			if (this.factoryComponents[i][0] === BATTERY) ret.push([i, ARROW_REL_C])
			if (this.factoryComponents[i][0] === BRAKE) ret.push([i, ARROW_SAFETY_B])
			if (this.factoryComponents[i][0] === WINDSHIELD) ret.push([i, ARROW_SAFETY_D])
			if (this.factoryComponents[i][0] === CLAXON) ret.push([i, ARROW_SPD_D])
		} else if (TWO_SLOT_TECH.includes(this.factoryComponents[i][0]) && (this.factoryComponents[i][4][0] === -1 || this.factoryComponents[i][4][1] === -1)) {
			// const TWO_SLOT_TECH = [CHASSIS, BODY, RADIATOR, BUMPER, DASHBOARD, GEARS, FUEL_TANK, STEERING_WHEEL, HEADLIGHT];
			ret_line = [i]
			// If both empty, check both tech levels
			if (this.factoryComponents[i][0] === CHASSIS && this.factoryComponents[i][RA_IDX][0] === -1 && this.factoryComponents[i][RA_IDX][1] === -1) {
				if (allowedTechLevels[BLUE] >= 6) ret.push([i, ARROW_REL_A, ARROW_REL_A])
				else if (allowedTechLevels[BLUE] >= 2) ret.push([i, ARROW_REL_A])
			}
			// If either empty, check higher tech
			else if (this.factoryComponents[i][0] === CHASSIS && (this.factoryComponents[i][RA_IDX][0] === -1 || this.factoryComponents[i][RA_IDX][1] === -1)) {
				if (allowedTechLevels[BLUE] >= 6) ret.push([i, ARROW_REL_A])
			}
			// If both empty, check both tech levels
			if (this.factoryComponents[i][0] === RADIATOR && this.factoryComponents[i][RA_IDX][0] === -1 && this.factoryComponents[i][RA_IDX][1] === -1) {
				if (allowedTechLevels[GREEN] >= 5) ret.push([i, ARROW_RANGE_A, ARROW_RANGE_A])
				else if (allowedTechLevels[GREEN] >= 2) ret.push([i, ARROW_RANGE_A])
			}
			// If either empty, check higher tech
			else if (this.factoryComponents[i][0] === RADIATOR && (this.factoryComponents[i][RA_IDX][0] === -1 || this.factoryComponents[i][RA_IDX][1] === -1)) {
				if (allowedTechLevels[GREEN] >= 5) ret.push([i, ARROW_RANGE_A])
			}

			if (this.factoryComponents[i][0] === BODY && this.factoryComponents[i][RA_IDX][0] === -1 && allowedTechLevels[BLUE] >= 3) ret_line.push(ARROW_REL_A)
			if (this.factoryComponents[i][0] === BODY && this.factoryComponents[i][RA_IDX][1] === -1 && allowedTechLevels[PURPLE] >= 5) ret_line.push(ARROW_DESIGN_A)

			if (this.factoryComponents[i][0] === BUMPER && this.factoryComponents[i][RA_IDX][0] === -1 && allowedTechLevels[BLUE] >= 4) ret_line.push(ARROW_REL_A)
			if (this.factoryComponents[i][0] === BUMPER && this.factoryComponents[i][RA_IDX][1] === -1 && allowedTechLevels[YELLOW] >= 4) ret_line.push(ARROW_SAFETY_A)

			if (this.factoryComponents[i][0] === DASHBOARD && this.factoryComponents[i][RA_IDX][0] === -1 && allowedTechLevels[PURPLE] >= 4) ret_line.push(ARROW_DESIGN_C)
			if (this.factoryComponents[i][0] === DASHBOARD && this.factoryComponents[i][RA_IDX][1] === -1 && allowedTechLevels[RED] >= 6) ret_line.push(ARROW_SPD_C)

			if (this.factoryComponents[i][0] === GEARS && this.factoryComponents[i][RA_IDX][0] === -1 && allowedTechLevels[RED] >= 3) ret_line.push(ARROW_SPD_B)
			if (this.factoryComponents[i][0] === GEARS && this.factoryComponents[i][RA_IDX][1] === -1 && allowedTechLevels[GREEN] >= 6) ret_line.push(ARROW_RANGE_B)

			if (this.factoryComponents[i][0] === FUEL_TANK && this.factoryComponents[i][RA_IDX][0] === -1 && allowedTechLevels[GREEN] >= 4) ret_line.push(ARROW_RANGE_B)
			if (this.factoryComponents[i][0] === FUEL_TANK && this.factoryComponents[i][RA_IDX][1] === -1 && allowedTechLevels[RED] >= 5) ret_line.push(ARROW_SPD_B)

			if (this.factoryComponents[i][0] === STEERING_WHEEL && this.factoryComponents[i][RA_IDX][0] === -1 && allowedTechLevels[YELLOW] >= 3) ret_line.push(ARROW_SAFETY_B)
			if (this.factoryComponents[i][0] === STEERING_WHEEL && this.factoryComponents[i][RA_IDX][1] === -1 && allowedTechLevels[PURPLE] >= 6) ret_line.push(ARROW_DESIGN_B)

			if (this.factoryComponents[i][0] === HEADLIGHT && this.factoryComponents[i][RA_IDX][0] === -1 && allowedTechLevels[PURPLE] >= 3) ret_line.push(ARROW_DESIGN_D)
			if (this.factoryComponents[i][0] === HEADLIGHT && this.factoryComponents[i][RA_IDX][1] === -1 && allowedTechLevels[YELLOW] >= 5) ret_line.push(ARROW_SAFETY_D)

			if (ret_line.length > 1) ret.push(ret_line)
		} else if (THREE_SLOT_TECH.includes(this.factoryComponents[i][0]) && (this.factoryComponents[i][4][0] === -1 || this.factoryComponents[i][4][1] === -1 || this.factoryComponents[i][4][2] === -1)) {
			// var THREE_SLOT_TECH = [ENGINE, TIRE];
			ret_line = [i]
			if (this.factoryComponents[i][0] === ENGINE && this.factoryComponents[i][RA_IDX][0] === -1 && allowedTechLevels[RED] >= 1) ret_line.push(ARROW_SPD_B)
			if (this.factoryComponents[i][0] === ENGINE && this.factoryComponents[i][RA_IDX][1] === -1 && allowedTechLevels[GREEN] >= 1) ret_line.push(ARROW_RANGE_B)
			if (this.factoryComponents[i][0] === ENGINE && this.factoryComponents[i][RA_IDX][2] === -1 && allowedTechLevels[BLUE] >= 5) ret_line.push(ARROW_REL_B)

			if (this.factoryComponents[i][0] === TIRE && this.factoryComponents[i][RA_IDX][0] === -1 && allowedTechLevels[GREEN] >= 3) ret_line.push(ARROW_RANGE_D)
			if (this.factoryComponents[i][0] === TIRE && this.factoryComponents[i][RA_IDX][1] === -1 && allowedTechLevels[RED] >= 4) ret_line.push(ARROW_SPD_D)
			if (this.factoryComponents[i][0] === TIRE && this.factoryComponents[i][RA_IDX][2] === -1 && allowedTechLevels[YELLOW] >= 6) ret_line.push(ARROW_SAFETY_D)

			if (ret_line.length > 1) ret.push(ret_line)
		}
	}

	return ret
}

Factory.prototype.prettyPrint = function () {
	var W = this.width

	var res = ""
	for (var i = 0; i < this.factoryCoords.length; i++) {
		var imp = "+ " // houses, crossroads
		switch (this.factoryCoords[i]) {
			case EMPTY_SPACE:
				imp = ". "
				break
			case OUT_OF_BOUNDS:
				imp = "=="
				break
			case LOADING_DOCK_INNER:
				imp = "L "
				break
			case LOADING_DOCK_KC:
				imp = "X "
				break
			case LOADING_BAY_KC_CORNER:
				imp = "Xc"
				break

			case CHASSIS_SQ:
				imp = "ch"
				break
			case BODY_SQ:
				imp = "bo"
				break
			case RADIATOR_SQ:
				imp = "ra"
				break
			case DOOR_SQ:
				imp = "do"
				break
			case BUMPER_SQ:
				imp = "bu"
				break
			case DASHBOARD_SQ:
				imp = "da"
				break
			case PAINT_SQ:
				imp = "pa"
				break
			case BATTERY_SQ:
				imp = "ba"
				break
			case ENGINE_SQ:
				imp = "en"
				break
			case GEARS_SQ:
				imp = "ge"
				break
			case FUEL_TANK_SQ:
				imp = "fu"
				break
			case STEERING_WHEEL_SQ:
				imp = "st"
				break
			case BRAKE_SQ:
				imp = "br"
				break
			case TIRE_SQ:
				imp = "ti"
				break
			case HEADLIGHT_SQ:
				imp = "he"
				break
			case WINDSHIELD_SQ:
				imp = "wi"
				break
			case CLAXON_SQ:
				imp = "cl"
				break
			case null:
				imp = "!!"
				break
			case undefined:
				imp = "!!"
				break
			case 48:
				imp = "pd"
				break
		}
		if (MAINLINE_CAR_COMPONENT.includes(this.factoryCoords[i])) imp = "MC"
		if (MAINLINE_TRUCK_COMPONENT.includes(this.factoryCoords[i])) imp = "MT"
		if (MAINLINE_SPORTS_COMPONENT.includes(this.factoryCoords[i])) imp = "MS"
		res += imp
		if (i > 0 && i % W == W - 1) res += "\n"
	}
	res += "\n"
	console.log(res)
}

/**
	@class
	start
	getPlayerByColour
	getMBcoordsForIndex
	getIndexForMBcoord
	getDemandSummaryInfo
	getNichesEligibilityForDealership
	getSellingNichesEligibilityForDealership
	isNicheIndexEmpty
	isNicheIndexEmptyOfStock
	getIndexForPriceDisplay
	getCoveredIndexesOfMarketWindow
	placeDealershipWindowIntoModel
	log
	export
	import
*/
Model = function () {
	this.start = function (options) {
		var i = 0
		if (options != undefined && typeof options == "object") {
			this.firstGame = false
			this.trainingGame = false
			this.excludeCars = false
			this.excludeTrucks = false
			this.excludeSports = false
			this.increaseMainlines = false

			if (global.startingOptions && global.startingOptions.length > 0) {
				var optionsArr = global.startingOptions
				for (i = 0; i < optionsArr.length; i++) {
					if (optionsArr[i] == 102) {
						this.trainingGame = true
					}
					if (optionsArr[i] == 3) {
						// Only Cars
						this.excludeTrucks = true
						this.excludeSports = true
					}
					if (optionsArr[i] == 4) {
						// Only Trucks
						this.excludeCars = true
						this.excludeSports = true
					}
					if (optionsArr[i] == 5) {
						// Only Sports
						this.excludeCars = true
						this.excludeTrucks = true
					}
					if (optionsArr[i] == 6) {
						// No Sports
						this.excludeSports = true
					}
					if (optionsArr[i] == 7) {
						// No Trucks
						this.excludeTrucks = true
					}
					if (optionsArr[i] == 8) {
						// No Cars
						this.excludeCars = true
					}
					if (optionsArr[i] == 9) {
						// No Trucks
						this.increaseMainlines = true
					}
				}
			}
			// Set up Game Data

			// Add available general componenents; adjust for player count
			// each index is the component name; each entry is the number left

			//this.techTracks = _.shuffle([TECH_TRACK_RED, TECH_TRACK_GREEN, TECH_TRACK_PURPLE, TECH_TRACK_BLUE, TECH_TRACK_YELLOW, ]);
			this.techTracks = _.shuffle([
				[[], [], [], [], [], [], [], [RED, 0]],
				[[], [], [], [], [], [], [], [GREEN, 0]],
				[[], [], [], [], [], [], [], [PURPLE, 0]],
				[[], [], [], [], [], [], [], [BLUE, 0]],
				[[], [], [], [], [], [], [], [YELLOW, 0]],
			])
			//					SPARKS 	then DEMAND in car / truck / sports
			this.marketBoard = [
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
				[[], [], [], [], [], []],
			]
			for (i = 0; i < this.marketBoard.length; i++) {
				for (var j = 0; j < this.marketBoard[i].length; j++) this.marketBoard[i][j] = 0
			}

			// Point at Bottom
			this.obsolescenceMarkerDirection = 1

			var colours = _.shuffle([RED, GREEN, PURPLE, BLUE, YELLOW])

			this.players = []

			playersName = options.players
			for (i = 0; i < playersName.length; i++) {
				var d = undefined
				if (this.trainingGame) {
					let displayNames = global.displayNames
					let displayNamesArr = displayNames//displayNames.split(/,/)
					if (playersName[i] === "SHADOW") d = displayNamesArr[0]
					if (playersName[i] === "SHADOW_2") d = displayNamesArr[1]
					if (playersName[i] === "SHADOW_3") d = displayNamesArr[2]
					if (playersName[i] === "SHADOW_4") d = displayNamesArr[3]
					if (playersName[i] === "SHADOW_5") d = displayNamesArr[4]
				}
				this.players.push(new Player(playersName[i], colours[i], i, d))
			}

			var to = []
			for (i = 0; i < this.players.length; to[i] = i++);

			var unalteredTurnOrder = [...to]

			this.gameFlow = {
				phase: 0,
				turn: 0,
				// THIS IS THE INDEX in M.players that is currently active
				currentPlayer: 0,
				// This is the current order of players
				turnOrder: to,
				unalteredTurnOrder: unalteredTurnOrder,
				ready: [],
				subphase: 0,
			}

			this.gameFlow.currentPlayer = to[0]

			this.assemblyCapacityTrack = [[], [], [], [], []]

			for (i = 0; i < this.players.length; i++) {
				this.assemblyCapacityTrack[0].push(this.players[i].colour)
				this.players[i].gantt = this.players.length - i
			}

			this.punchClockNumber = 0
			if (this.players.length == 3) this.punchClockNumber = 24
			if (this.players.length == 4) this.punchClockNumber = 32
			if (this.players.length == 5) this.punchClockNumber = 40

			this.alreadyPlayedCards = []

			var pInfos = []
			_.each(this.players, function (p) {
				pInfos.push(p.name, p.colour)
			})
			this.log(Log.SETUP_GAME, _.flatten([booleanToInt(this.trainingGame), booleanToInt(this.firstGame), pInfos]))

			// Now populate the components
			// Place player markers on tech tracks
			_.each(
				this.players,
				function (player) {
					this.techTracks[0][1].push(player.colour)
					this.techTracks[1][1].push(player.colour)
					this.techTracks[2][0].push(player.colour)
					this.techTracks[3][0].push(player.colour)
					this.techTracks[4][0].push(player.colour)
				},
				this
			)

			this.availableComponents = [...STARTING_COMPONENT_LIMITS_5P]
			for (i = 0; i < 5 - this.players.length; i++) {
				this.availableComponents[CHASSIS]--
				this.availableComponents[BODY]--
				this.availableComponents[RADIATOR] -= 2
				this.availableComponents[DOOR] -= 2
				this.availableComponents[BUMPER] -= 2

				this.availableComponents[DASHBOARD]--
				this.availableComponents[PAINT] -= 2
				this.availableComponents[BATTERY] -= 2

				this.availableComponents[ENGINE]--
				this.availableComponents[GEARS]--
				this.availableComponents[FUEL_TANK]--
				this.availableComponents[STEERING_WHEEL]--
				this.availableComponents[BRAKE] -= 2

				this.availableComponents[TIRE]--
				this.availableComponents[HEADLIGHT]--
				this.availableComponents[WINDSHIELD] -= 2
				this.availableComponents[CLAXON] -= 2

				this.availableComponents[MAINLINE_CAR] -= 2
				this.availableComponents[MAINLINE_TRUCK] -= 2
				this.availableComponents[MAINLINE_SPORTS] -= 2

				this.availableComponents[DEPARTMENT_RESEARCH] -= 5
				this.availableComponents[DEPARTMENT_PLANNING] -= 6
			}

			// If removing player cards, do it now
			if (this.excludeCars || this.excludeTrucks || this.excludeSports) {
				for (i = 0; i < this.players.length; i++) {
					let playerCards = this.players[i].playerCards
					let playerColour = this.players[i].colour
					var letterOriginal
					if (playerColour === RED) letterOriginal = "R"
					if (playerColour === GREEN) letterOriginal = "G"
					if (playerColour === PURPLE) letterOriginal = "P"
					if (playerColour === BLUE) letterOriginal = "B"
					if (playerColour === YELLOW) letterOriginal = "Y"

					for (j = playerCards.length - 1; j >= 0; j--) {
						var cardIDstr = letterOriginal + String(playerCards[j])
						if (this.excludeCars && PLAYER_CARDS_WITH_CARS_STR.includes(cardIDstr)) {
							playerCards.splice(j, 1)
							continue
						}
						if (this.excludeTrucks && PLAYER_CARDS_WITH_TRUCKS_STR.includes(cardIDstr)) {
							playerCards.splice(j, 1)
							continue
						}
						if (this.excludeSports && PLAYER_CARDS_WITH_SPORTS_STR.includes(cardIDstr)) {
							playerCards.splice(j, 1)
							continue
						}
					}
				}
			}

			// If increasing mainlines, do it here. Also remove ineligible ones

			const totalPlayers = this.players.length
			// If missing 2 types, need to add 12/16/20 mainlines
			if ((this.excludeTrucks && this.excludeSports) || (this.excludeCars && this.excludeSports) || (this.excludeCars && this.excludeTrucks)) {
				//let extras = 12
				//if (this.players.length == 4) extras = 16
				//else if (this.players.length == 5) extras = 20
				// Add them in
				if (this.excludeTrucks && this.excludeSports) {
					if (this.increaseMainlines) this.availableComponents[MAINLINE_CAR] += this.availableComponents[MAINLINE_TRUCK] + this.availableComponents[MAINLINE_SPORTS]
					this.availableComponents[MAINLINE_TRUCK] = 0
					this.availableComponents[MAINLINE_SPORTS] = 0
				} else if (this.excludeCars && this.excludeSports) {
					if (this.increaseMainlines) this.availableComponents[MAINLINE_TRUCK] += this.availableComponents[MAINLINE_CAR]
					if (this.increaseMainlines) this.availableComponents[MAINLINE_TRUCK] += this.availableComponents[MAINLINE_SPORTS]
					this.availableComponents[MAINLINE_CAR] = 0
					this.availableComponents[MAINLINE_SPORTS] = 0
				} else if (this.excludeCars && this.excludeTrucks) {
					if (this.increaseMainlines) this.availableComponents[MAINLINE_SPORTS] += this.availableComponents[MAINLINE_TRUCK]
					if (this.increaseMainlines) this.availableComponents[MAINLINE_SPORTS] += this.availableComponents[MAINLINE_CAR]
					this.availableComponents[MAINLINE_TRUCK] = 0
					this.availableComponents[MAINLINE_CAR] = 0
				}
			}
			// Otherwise, check for single missing type
			if (this.excludeTrucks && !this.excludeCars && !this.excludeSports) {
				if (this.increaseMainlines) this.availableComponents[MAINLINE_CAR] += Math.round(this.availableComponents[MAINLINE_TRUCK] / 2)
				if (this.increaseMainlines) this.availableComponents[MAINLINE_SPORTS] += Math.round(this.availableComponents[MAINLINE_TRUCK] / 2)
				this.availableComponents[MAINLINE_TRUCK] = 0
			} else if (this.excludeCars && !this.excludeTrucks && !this.excludeSports) {
				if (this.increaseMainlines) this.availableComponents[MAINLINE_TRUCK] += Math.round(this.availableComponents[MAINLINE_CAR] / 2)
				if (this.increaseMainlines) this.availableComponents[MAINLINE_SPORTS] += Math.round(this.availableComponents[MAINLINE_CAR] / 2)
				this.availableComponents[MAINLINE_CAR] = 0
			} else if (this.excludeSports && !this.excludeCars && !this.excludeTrucks) {
				if (this.increaseMainlines) this.availableComponents[MAINLINE_TRUCK] += Math.round(this.availableComponents[MAINLINE_SPORTS] / 2)
				if (this.increaseMainlines) this.availableComponents[MAINLINE_CAR] += Math.round(this.availableComponents[MAINLINE_SPORTS] / 2)
				this.availableComponents[MAINLINE_SPORTS] = 0
			}

			this.prevEngFocusOrder = []
			this.newEngFocusOrder = []

			this.priceBand = [0, 0, 0, 0]

			this.gameEnded = 0

			// TEMPORARY VARS ****************************************************************************
			this.alreadySetFocus = 0
			this.piecesUsedInResearch = []
			this.setupSubPhase = 0
			this.historyObj = []
			this.historyObjV2 = []
			this.sandboxMode = false
			this.preventMultipleDealershipUses = -1
			this.justAutoSold = false
		}
	}

	/*this.getPlayerByColour = function (number) {
		return _.find(this.players, 'colour', number);
	};*/

	this.getMBcoordsForIndex = function (index) {
		var res = []
		res.push(index % 8)
		res.push(Math.floor(index / 8))
		return res
	}

	this.getIndexForMBcoord = function (x, y) {
		if (y == undefined && x.length == 2) {
			return x[1] * 8 + x[0]
		} else {
			return y * 8 + x
		}
	}

	this.getDemandSummaryInfo = function () {
		var res = []

		var Q00indexes = [48, 49, 56, 57]

		var Q10indexes = [32, 33, 40, 41]
		var Q01indexes = [50, 51, 58, 59]

		var Q20indexes = [16, 17, 24, 25]
		var Q11indexes = [34, 35, 42, 42]
		var Q02indexes = [52, 53, 60, 61]

		var Q30indexes = [0, 1, 8, 9]
		var Q21indexes = [18, 19, 26, 27]
		var Q212ndexes = [36, 37, 44, 45]
		var Q03indexes = [54, 55, 62, 63]

		var Q31indexes = [2, 3, 10, 11]
		var Q22indexes = [20, 21, 28, 29]
		var Q13indexes = [38, 39, 46, 47]

		var Q32indexes = [4, 5, 12, 13]
		var Q23indexes = [22, 23, 30, 31]

		var Q33indexes = [6, 7, 14, 15]

		var allQindexes = []
		allQindexes.push(Q00indexes)
		allQindexes.push(Q10indexes)
		allQindexes.push(Q01indexes)
		allQindexes.push(Q20indexes)
		allQindexes.push(Q11indexes)
		allQindexes.push(Q02indexes)
		allQindexes.push(Q30indexes)
		allQindexes.push(Q21indexes)
		allQindexes.push(Q212ndexes)
		allQindexes.push(Q03indexes)
		allQindexes.push(Q31indexes)
		allQindexes.push(Q22indexes)
		allQindexes.push(Q13indexes)
		allQindexes.push(Q32indexes)
		allQindexes.push(Q23indexes)
		allQindexes.push(Q33indexes)

		for (var i = 0; i < allQindexes.length; i++) {
			var Ylevel = 0
			var Xlevel = 0
			if ([0, 2, 5, 9].includes(i)) Ylevel = 0
			if ([1, 4, 8, 12].includes(i)) Ylevel = 1
			if ([3, 7, 11, 14].includes(i)) Ylevel = 2
			if ([6, 10, 13, 15].includes(i)) Ylevel = 3

			if ([0, 1, 3, 6].includes(i)) Xlevel = 0
			if ([2, 4, 7, 10].includes(i)) Xlevel = 1
			if ([5, 8, 11, 13].includes(i)) Xlevel = 2
			if ([9, 12, 14, 15].includes(i)) Xlevel = 3

			var thisStock = [0, 0, 0]
			for (var j = 0; j < allQindexes[i].length; j++) {
				thisStock[0] += this.marketBoard[allQindexes[i][j]][3]
				thisStock[1] += this.marketBoard[allQindexes[i][j]][4]
				thisStock[2] += this.marketBoard[allQindexes[i][j]][5]
			}
			var Yinc = this.techTracks[0][7][1]
			var Xinc = this.techTracks[1][7][1]

			res.push([Ylevel + Yinc, Xlevel + Xinc, [...thisStock]])
			// NEED Yi tec, Xi tec, [stock]
		}
		return res
	}

	this.getNichesEligibilityForDealership = function (dealership) {
		var inelgibile = []
		var eligiible = []
		var dealershipTechLevels = dealership[TL_IDX]
		for (var y = 0; y < 8; y++) {
			for (var x = 0; x < 8; x++) {
				// x = Xcoord
				// y = Ycoord
				var YspecAxis = [this.techTracks[0][7][1], this.techTracks[0][7][1] + 1, this.techTracks[0][7][1] + 2, this.techTracks[0][7][1] + 3]
				var XspecAxis = [this.techTracks[1][7][1], this.techTracks[1][7][1] + 1, this.techTracks[1][7][1] + 2, this.techTracks[1][7][1] + 3]

				var reqdTT0 = YspecAxis[3 - Math.floor(y / 2)]
				var reqdTT1 = XspecAxis[Math.floor(x / 2)]
				var TT0colour = this.techTracks[0][7][0]
				var TT1colour = this.techTracks[1][7][0]
				if (dealershipTechLevels[TT0colour] >= reqdTT0 && dealershipTechLevels[TT1colour] >= reqdTT1) eligiible.push(this.getIndexForMBcoord([x, y]))
				else inelgibile.push(this.getIndexForMBcoord([x, y]))
			}
		}
		return [eligiible, inelgibile]
	}

	this.wouldPlacingMWallowAnySales = function (player, dealership) {
		var allPossibleNiches = this.getNichesEligibilityForDealership(dealership)[0]
		var stock = player.factory.getStockForDealership(dealership)

		for (var i = 0; i < allPossibleNiches.length; i++) {
			if ((this.marketBoard[allPossibleNiches[i]][3] > 0 && stock[0] > 0) || (this.marketBoard[allPossibleNiches[i]][4] > 0 && stock[1] > 0) || (this.marketBoard[allPossibleNiches[i]][5] > 0 && stock[2] > 0)) return true
		}

		return false
	}

	this.getSellingNichesEligibilityForDealership = function (player, dealership) {
		var inelgibile = []
		var eligiible = []
		var coveredIndexes = this.getCoveredIndexesOfMarketWindow(dealership[MW_IDX][0], dealership[MW_IDX][1], dealership[MW_IDX][2])
		var stock = player.factory.getStockForDealership(dealership)

		for (var i = 0; i < coveredIndexes.length; i++) {
			if ((this.marketBoard[coveredIndexes[i]][3] > 0 && stock[0] > 0) || (this.marketBoard[coveredIndexes[i]][4] > 0 && stock[1] > 0) || (this.marketBoard[coveredIndexes[i]][5] > 0 && stock[2] > 0)) eligiible.push(coveredIndexes[i])
			else inelgibile.push(coveredIndexes[i])
		}

		return [eligiible, inelgibile]
	}

	this.isNicheIndexEmpty = function (index) {
		var MBniche = this.marketBoard[index]
		var contents = 0
		for (var i = 0; i < MBniche.length; i++) {
			contents += MBniche[i]
		}
		if (contents === 0) return true
		return false
	}
	this.isNicheIndexEmptyOfStock = function (index) {
		var MBniche = this.marketBoard[index]
		var contents = 0
		for (var i = 0; i < 3; i++) {
			contents += MBniche[i + 3]
		}
		if (contents === 0) return true
		return false
	}

	this.getIndexForPriceDisplay = function (band) {
		var i = 0
		var prefOrder
		if (band == 0) {
			prefOrder = [49, 48, 41, 57, 50, 56, 58, 59, 40]
			for (i = 0; i < prefOrder.length; i++) {
				if (this.isNicheIndexEmpty(prefOrder[i])) return prefOrder[i]
			}
			return 32
		}
		if (band == 1) {
			prefOrder = [26, 34, 35, 43, 44, 25, 17, 52, 53]
			for (i = 0; i < prefOrder.length; i++) {
				if (this.isNicheIndexEmpty(prefOrder[i])) return prefOrder[i]
			}
			return 9
		}
		if (band == 2) {
			prefOrder = [12, 20, 21, 29, 30, 38, 11, 3, 2, 4, 10]
			for (i = 0; i < prefOrder.length; i++) {
				if (this.isNicheIndexEmpty(prefOrder[i])) return prefOrder[i]
			}
			return 13
		}
		if (band == 3) {
			prefOrder = [6, 15, 7, 5, 14]
			for (i = 0; i < prefOrder.length; i++) {
				if (this.isNicheIndexEmpty(prefOrder[i])) return prefOrder[i]
			}
			return 23
		}
		return 0
	}

	this.getCoveredIndexesOfMarketWindow = function (index, rotation, MWsize) {
		var indexCoords = this.getMBcoordsForIndex(index)

		var coveredIndexes = []
		if (MWsize === 0) {
			coveredIndexes.push(index)
			if (rotation === 0 && indexCoords[1] < 7) coveredIndexes.push(index + 8)
			if (rotation === 1 && indexCoords[0] > 0) coveredIndexes.push(index - 1)
			if (rotation === 2 && indexCoords[1] > 0) coveredIndexes.push(index - 8)
			if (rotation === 3 && indexCoords[0] < 7) coveredIndexes.push(index + 1)
		} else {
			var startCoords = this.getMBcoordsForIndex(index)
			if (rotation === 1) startCoords[0] -= MWsize
			if (rotation === 2) {
				startCoords[0] -= MWsize
				startCoords[1] -= MWsize
			}
			if (rotation === 3) startCoords[1] -= MWsize

			for (var x = 0; x <= MWsize; x++) {
				for (var y = 0; y <= MWsize; y++) {
					var currentCoords = [startCoords[0] + x, startCoords[1] + y]
					if (currentCoords[0] >= 0 && currentCoords[0] < 8 && currentCoords[1] >= 0 && currentCoords[1] < 8) coveredIndexes.push(this.getIndexForMBcoord(currentCoords))
				}
			}
		}
		return coveredIndexes
	}

	this.placeDealershipWindowIntoModel = function (index, dealership, MWsize) {
		// this affects the actual dealership of the player's factoryComponents
		this.preventMultipleDealershipUses = dealership[0]
		$("#MWrotationDiv").remove()

		dealership[MW_IDX][0] = index
		dealership[MW_IDX][1] = this.MWrotation
		dealership[MW_IDX][2] = MWsize
		V.render(-1)
		let HISTindex = index
		if (MWsize === 0 && this.MWrotation === 1) HISTindex--
		else if (MWsize === 0 && this.MWrotation === 2) HISTindex-=8
		else if (MWsize === 1) HISTindex--
		else if (MWsize === 2) HISTindex-=2
		M.historyObjV2[M.historyObjV2.length-1][1] = HISTindex
		M.historyObjV2[M.historyObjV2.length-1][2] = MWsize
		if (MWsize === 0 && ![0,2].includes(this.MWrotation)) M.historyObjV2[1].push(1)
		
	}

	this.log = function (action, param, playerNumber, timestamp) {
		if (playerNumber == undefined) {
			playerNumber = this.gameFlow.turnOrder[0]
		}
		Log.log(this, playerNumber, action, param, timestamp)
	}

	/** 
		<ol>

		</ol>
		Use {@linkcode undefined} if an object doesn't exist
		@return {array} The compressed model
	 */
	this.export = function () {
		var temp = []
		var tab = []

		// 0
		temp.push(this.availableComponents)

		// 1
		temp.push(this.alreadyPlayedCards)

		// 2
		var t = [this.gameFlow.phase, this.gameFlow.turn, this.gameFlow.currentPlayer, this.gameFlow.turnOrder.concat([]), this.gameFlow.unalteredTurnOrder.concat([]), this.gameFlow.subphase]
		if (this.gameFlow.ready != undefined) t.push(this.gameFlow.ready.concat([]))
		else t.push(undefined)
		temp.push(t)

		// 3
		if (this.players != undefined) {
			var pl = []
			_.each(this.players, function (player) {
				pl.push(player.export())
			})
			temp.push(pl)
		} else temp.push(undefined)

		// 4
		if (this.firstGame === true) temp.push(1)
		else temp.push(0)

		// 5
		temp.push(this.techTracks)

		// 6
		temp.push(this.marketBoard)

		// 7
		temp.push(this.obsolescenceMarkerDirection)

		// 8
		temp.push(this.assemblyCapacityTrack)

		// 9
		temp.push(this.punchClockNumber)

		// 10
		temp.push(this.prevEngFocusOrder)

		// 11
		temp.push(this.priceBand)

		// 12
		temp.push(this.gameEnded)

		// 13
		temp.push(this.newEngFocusOrder)

		// 14
		if (this.trainingGame === true) temp.push(1)
		else temp.push(0)

		// FIXED AS ACCESSED ON SERVER
		// 15,16
		if (this.logs != undefined && this.logs.length > 0) {
			var tRef = this.logs[0].timestamp
			var t2 = [tRef]
			var ts = []
			_.each(this.logs, function (log) {
				t2.push([log.player, log.action, log.param])
				ts.push(log.timestamp - tRef)
			})
			temp.push(t2)
			temp.push(ts)
		} else {
			temp.push(undefined)
			temp.push(undefined)
		}

		return temp
	}
}

function booleanToInt(b) {
	if (b === true) {
		return 1
	} else {
		return 0
	}
}

/**
 * @see {@link Model#export}
 * @param {array} tab - The input data
 * @static
 */
Model.import = function (tab) {
	var m = new Model()
	if (tab != undefined && tab.length != undefined) {
		m.availableComponents = tab[0]

		m.alreadyPlayedCards = tab[1]

		if (tab[2] != undefined) {
			m.gameFlow = {
				phase: tab[2][0],
				turn: tab[2][1],
				currentPlayer: tab[2][2],
				turnOrder: tab[2][3],
				unalteredTurnOrder: tab[2][4],
				subphase: tab[2][5],
				ready: tab[2][6],
			}
		}

		if (tab[3] != undefined && tab[3].length > 0) {
			m.players = []
			_.each(
				tab[3],
				function (t) {
					var p = Player.import(t)
					m.players.push(p)
				},
				m
			)
		}

		if (tab[4] === 1) m.firstGame = true
		else m.firstGame = false

		m.techTracks = tab[5]

		m.marketBoard = tab[6]

		m.obsolescenceMarkerDirection = tab[7]

		m.assemblyCapacityTrack = tab[8]

		m.punchClockNumber = tab[9]

		m.prevEngFocusOrder = tab[10]

		m.priceBand = tab[11]

		m.gameEnded = tab[12]

		m.newEngFocusOrder = tab[13]

		if (tab[14] == 1) m.trainingGame = true
		else m.trainingGame = false

		// FIXED AS ACCESSED ON SERVER
		if (tab[15] != undefined && tab[16] != undefined) {
			m.logs = []
			var tRef = 0
			_.each(tab[15], function (log) {
				if (typeof log === "number") {
					tRef = log
				} else {
					var l = {
						player: log[0],
						action: log[1],
						param: log[2],
					}
					if (typeof l.param === "number") l.param = [l.param]
					m.logs.push(l)
				}
			})

			// FIXED AS ACCESSED ON SERVER
			for (var i = 0; i < tab[16].length; i++) {
				if (tab[16][i] != undefined) m.logs[i].timestamp = tab[16][i] + tRef
				else m.logs[i].timestamp = 0
			}
		}

		// Get data from starting options
		if (global.startingOptions && global.startingOptions.length > 0) {
			let optionsArr = global.startingOptions
			for (i = 0; i < optionsArr.length; i++) {
				if (optionsArr[i] == 102) {
					m.trainingGame = true
				}
				if (optionsArr[i] == 3) {
					// Only Cars
					m.excludeTrucks = true
					m.excludeSports = true
				}
				if (optionsArr[i] == 4) {
					// Only Trucks
					m.excludeCars = true
					m.excludeSports = true
				}
				if (optionsArr[i] == 5) {
					// Only Sports
					m.excludeCars = true
					m.excludeTrucks = true
				}
				if (optionsArr[i] ==6) {
					// No Sports
					m.excludeSports = true
				}
				if (optionsArr[i] == 7) {
					// No Trucks
					m.excludeTrucks = true
				}
				if (optionsArr[i] == 8) {
					// No Cars
					m.excludeCars = true
				}
				if (optionsArr[i] == 9) {
					// No Trucks
					m.increaseMainlines = true
				}
			}
		}

		// Add in unsaved vars
		m.alreadySetFocus = 0
		m.piecesUsedInResearch = []
		m.setupSubPhase = 0
		m.historyObj = []
		m.historyObjV2 = []
		m.sandboxMode = false
		m.preventMultipleDealershipUses = -1
		m.justAutoSold = false
	}
	return m
}

var View = function (model) {
	this.model = model

	/** @private */
	function init() {
		this.smallSqPxWidth = 30
		this.nicheSqPxWidth = 68
		this.currentViewItem = -1
		this.previouslyPlacedComponentBorderSize = 1
		this.newlyPlacedComponentBorderSize = 4
		SMALL_SQUARE = '<svg width="' + this.smallSqPxWidth + '" height="' + this.smallSqPxWidth + '"><rect width="' + this.smallSqPxWidth + '" height="' + this.smallSqPxWidth + '" style="fill:COLOR;stroke-width:1;fill-opacity:0.3"></svg>'
		MB_SMALL_SQUARE = '<svg width="68px" height="68px"><rect width="68px" height="68px" style="fill:COLOR;stroke-width:1;fill-opacity:0.3"></svg>'

		//<rect id="rect1872" stroke-linejoin="round" fill-rule="evenodd" rx="50" ry="50" height="972.48" width="472.48" stroke="#000" y="66.121" x="13.759" stroke-width="27.517" fill="none"/>
		// 1sq = w/h 75.5 + niceh 68 +
		const stroke_width = 5
		var gap = 5
		//MW_SMALL = '<svg width="75.5px" height="25.5px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="5px" ry="5px" height="70.5px" width="70.5px" stroke="COLOUR" y="2.5px" x="2.5px" stroke-width="5px" fill="none"/></svg>';
		MW_SMALL = '<svg height="' + String(stroke_width * 2 + gap + this.nicheSqPxWidth * 2) + 'px" width="' + String(stroke_width * 2 + this.nicheSqPxWidth) + 'px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + gap + this.nicheSqPxWidth * 2) + 'px" width="' + String(stroke_width / 2 + this.nicheSqPxWidth) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'
		MW_SMALL_R = '<svg height="' + String(stroke_width * 2 + this.nicheSqPxWidth) + 'px" width="' + String(stroke_width * 2 + gap + this.nicheSqPxWidth * 2) + 'px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + this.nicheSqPxWidth) + 'px" width="' + String(stroke_width / 2 + gap + this.nicheSqPxWidth * 2) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'
		MW_MEDIUM = '<svg height="' + String(stroke_width * 2 + gap + this.nicheSqPxWidth * 2) + 'px" width="' + String(stroke_width * 2 + gap + this.nicheSqPxWidth * 2) + 'px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + gap + this.nicheSqPxWidth * 2) + 'px" width="' + String(stroke_width / 2 + gap + this.nicheSqPxWidth * 2) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'
		MW_LARGE = '<svg height="' + String(stroke_width * 2 + gap * 2 + this.nicheSqPxWidth * 3) + 'px" width="' + String(stroke_width * 2 + gap * 2 + this.nicheSqPxWidth * 3) + 'px"><rect stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + gap * 2 + this.nicheSqPxWidth * 3) + 'px" width="' + String(stroke_width / 2 + gap * 2 + this.nicheSqPxWidth * 3) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'

		gap = 16
		Qhighlight = '<svg height="' + String(stroke_width * 2 + gap * 1 + this.nicheSqPxWidth * 4) + 'px" width="' + String(stroke_width * 2 + gap * 1 + this.nicheSqPxWidth * 4) + 'px"><rect class="SVGQ" id="THISID" stroke-linejoin="round" fill-rule="evenodd" rx="10px" ry="10px" height="' + String(stroke_width / 2 + gap * 1 + this.nicheSqPxWidth * 4) + 'px" width="' + String(stroke_width / 2 + gap * 1 + this.nicheSqPxWidth * 4) + 'px" stroke="COLOUR" y="' + String(stroke_width / 2) + 'px" x="' + String(stroke_width / 2) + 'px" stroke-width="' + String(stroke_width) + 'px" fill="none"/></svg>'

		P_CARD_AREA = '<svg class="CLASS"><rect stroke-linejoin="round" fill-rule="evenodd" rx="5px" ry="5px" height="50px" width="50px" stroke="#000" y="5px" x="5px" stroke-width="5px" fill="none"/><rect stroke-linejoin="round" fill-rule="evenodd" rx="5px" ry="5px" height="25px" width="25px" stroke="#000" y="5px" x="5px" stroke-width="5px" fill="COLOUR"/></svg>'
	}

	this.reloadModel = function (model) {
		this.model = model
		this.render()
	}

	/**
	 * Render the board
	 */

	// item -1 marketboard
	// OTHERWISE item is the array index of UnalteredTurnOrder
	// 0 should be player at start of line and 4 at end

	// ITEM is UNALTERED TURN ORDER INEDX
	this.render = function (item) {
		$("#SSD").empty()
		// ADD IN AN UNDEFINED CHECK FOR RESET BUTTON RELOAD
		if (item == undefined) {
			if (this.model.gameEnded > 0) item = -1
			else if (this.model.sandboxMode) {
				item = this.model.gameFlow.unalteredTurnOrder.indexOf(global.pov)
			} else if (MARKET_BOARD_PHASES.includes(this.model.gameFlow.phase)) item = -1
			else {
				if (!Rules.isSimulPhase()) item = this.model.gameFlow.turnOrder[0]
				else item = this.model.gameFlow.unalteredTurnOrder.indexOf(this.model.gameFlow.currentPlayer)
				if (M.trainingGame) {
					item = this.model.players.length - this.model.gameFlow.turnOrder.length
				}
			}
		} // end item undefinded

		this.currentViewItem = item

		if (window.innerWidth < 1700) {
			// gameName 1536 - 280 - 160 = 1096 so ~ 10px width / char
			if (window.innerWidth - 700 - 152 - $("#gameNameSpan").text().length * 10 < 0) {
				var charsToRemove = 0
				while (window.innerWidth - 700 - 152 + charsToRemove * 10 - $("#gameNameSpan").text().length * 10 < 0) {
					charsToRemove++
				}
				var remainingLength = Math.max(global.gameName.length - charsToRemove, 10)
				global.gameName = global.gameName.slice(0, remainingLength)
				global.gameName += "..."
			}
		}

		$("#gameName").html(global.gameName)

		$("#turnNumber").html(String(this.model.gameFlow.turn))
		$("#phase").html(PHASES_STR[this.model.gameFlow.phase])
		$("#currentPlayer").html(global.currentPlayers.join(", "))

		this.renderPlayerLineDiv(item)
		if (item === -1) {
			this.renderMarketBoardScreen()
			if (Rules.canPlay() && this.model.gameFlow.phase === PHASE_RESEARCH && !this.model.sandboxMode) C.startActions()
		} else {
			var player = this.model.players[this.model.gameFlow.unalteredTurnOrder[item]]
			this.renderFactoryFloor(player)
		}
		if (this.model.gameEnded > 0) {
			$("#actions").empty()
			if (this.model.gameEnded === 1) $("#actions").append(gettext("Game ended by Punch Clock"))
			if (this.model.gameEnded === 2) $("#actions").append(gettext("Game ended by Factory Expansions"))
			if (this.model.gameEnded === 3) $("#actions").append(gettext("Game ended by King of the Hill"))
			$("#actions").append("<BR/><BR/>")
			$("#actions").append("Winner: " + this.model.players[this.model.gameFlow.turnOrder[0]].name)

			if (global.name === this.model.players[this.model.gameFlow.turnOrder[0]].name) {
				$("#actions").append("<h1>CONGRATULATIONS!</h1>")
				$("#actions").append("Fancy a <a href='/createHLCpage/" + String(global.gameID) + "/'>rematch</a>?")
			} else {
				$("#actions").append("<BR/><BR/>Fancy a <a href='/createHLCpage/" + String(global.gameID) + "/'>rematch</a>?")
			}
			$("#actions").append("<BR/><BR/><a href='/HLC/HLCgameSummary/" + String(global.gameID) + "/'>Click here to see game summary stats</a>")
		}
		$(".topMenuItem").off().on("click", { view: this }, topMenuItem)
	}

	this.renderPlayerLineDiv = function (item) {
		var img

		var playerLineDiv = $("#playerLineDiv")
		playerLineDiv.empty()
		playerLineDiv.css({
			width: "100%",
			display: "flex",
			"flex-wrap": "wrap",
			margin: "auto",
			"justify-content": "center",
			"margin-bottom": "5px", // Needed if no actions to allow buffer below
		})

		// Add punch clock
		var punchClockDiv = $("<div></div>")
		punchClockDiv.attr("id", "punchClockDiv")
		var punchClockImg
		if (this.model.punchClockNumber > 0) {
			punchClockImg = $("<img>")
			punchClockImg.attr("src", imagePreURL + "/punch_clock.png")
			punchClockImg.attr("id", "punchClockImg")

			punchClockDiv.append(punchClockImg)
			punchClockDiv.append("X " + String(this.model.punchClockNumber))
		} else {
			punchClockImg = $("<img>")
			punchClockImg.attr("src", imagePreURL + "/punch_clock_end.png")
			punchClockImg.attr("id", "punchClockImg")

			punchClockDiv.append(punchClockImg)
			punchClockDiv.append(" (" + String(this.model.punchClockNumber) + ")")
		}
		playerLineDiv.append(punchClockDiv)

		// Add Link to Market Board
		var marketBoardLinkdiv = $("<div></div>")
		marketBoardLinkdiv.attr("id", "playerDiv-1")
		marketBoardLinkdiv.addClass("playerDiv")
		if (item === -1) marketBoardLinkdiv.addClass("playerLineActive")
		marketBoardLinkdiv.css({ color: "black" })

		marketBoardLinkdiv.append(gettext("View Market Board"))
		playerLineDiv.append(marketBoardLinkdiv)
		this.addHighlightsOnMouseOverToElement(marketBoardLinkdiv, 5, true)
		marketBoardLinkdiv.on("click", function () {
			var arrayIndex = parseInt(this.id.slice(9))
			V.render(arrayIndex)
		})

		// Add links to each players factories
		var focusDiv
		for (var i = 0; i < this.model.gameFlow.unalteredTurnOrder.length; i++) {
			if (i === 0) {
				focusDiv = $("<div></div>")
				focusDiv.css({
					"margin-right": "20px",
					"margin-top": "5px",
					border: "1px solid black",
					padding: "2px",
					"padding-left": "2px",
					"padding-right": "2px",
					"font-weight": "bolder",
					width: "100px",
					color: "black",
					"background-color": "#C7DaD6",
				})
				if (this.model.gameFlow.phase === PHASE_SET_FOCUS) focusDiv.append(gettext("Most Gantt"))
				else if (this.model.gameFlow.phase === PHASE_SELL) focusDiv.append(gettext("Sales"))
				else if (this.model.gameEnded > 0) focusDiv.append(gettext("Winner"))
				else focusDiv.append(gettext("Engineering"))
				img = $("<img>")
				img.attr("src", imagePreURL + "/arrow.png")
				img.css({
					width: "70px",
					height: "30px",
				})
				focusDiv.append(img)
				playerLineDiv.append(focusDiv)
			} // END i  = 0

			var playerDiv = $("<div></div>")
			playerDiv.attr("id", "playerDiv" + String(i))
			playerDiv.addClass("playerDiv")
			var num = this.model.gameFlow.unalteredTurnOrder[i]

			if (!Rules.isSimulPhase()) {
				if (this.model.gameFlow.turnOrder[0] === num) playerDiv.addClass("playerTurn")
			} else {
				// simul phase
				if (global.currentPlayers.includes(this.model.players[this.model.gameFlow.unalteredTurnOrder[i]].name)) playerDiv.addClass("playerTurn")
			}
			if (item === i) playerDiv.addClass("playerLineActive")
			var colour = getCorrectedColour(this.model.players[num].colour)
			if (colour === RED) playerDiv.css({ "background-color": "#A12529" })
			if (colour === GREEN) playerDiv.css({ "background-color": "#456334" })
			if (colour === PURPLE) playerDiv.css({ "background-color": "#51365F" })
			if (colour === BLUE) playerDiv.css({ "background-color": "#3474A9" })
			if (colour === YELLOW) playerDiv.css({ "background-color": "#C28727" })

			if (this.model.trainingGame && this.model.players[num].displayName != undefined) playerDiv.append(this.model.players[num].displayName)
			else playerDiv.append(this.model.players[num].name)
			playerDiv.append('<BR/><span class="moneySpan">$' + this.model.players[num].money + "</span> G: " + this.model.players[num].gantt + " (+" + Rules.getNumberOfPlanningOffices(this.model.players[num]) + ")")
			playerDiv.on("click", function () {
				var playerNumber = parseInt(this.id.slice(9))
				if (item !== playerNumber) V.render(playerNumber)
				else V.render(-1)
			})
			playerLineDiv.append(playerDiv)
			this.addHighlightsOnMouseOverToElement(playerDiv, 5, true)
			if (i === this.model.gameFlow.unalteredTurnOrder.length - 1) {
				focusDiv = $("<div></div>")
				focusDiv.css({
					"margin-right": "20px",
					"margin-top": "5px",
					border: "1px solid black",
					padding: "2px",
					"padding-left": "2px",
					"padding-right": "2px",
					"font-weight": "bolder",
					width: "100px",
					color: "black",
					"background-color": "#C7DaD6",
				})
				if (this.model.gameFlow.phase === PHASE_SET_FOCUS) focusDiv.append(gettext("Least Gantt"))
				else if (this.model.gameFlow.phase === PHASE_SELL) focusDiv.append(gettext("Engineering"))
				else if (this.model.gameEnded > 0) focusDiv.append(gettext("Stuck in Traffic"))
				else focusDiv.append(gettext("Sales"))
				img = $("<img>")
				img.attr("src", imagePreURL + "/arrow.png")
				img.addClass("r2")
				img.css({
					width: "70px",
					height: "30px",
				})
				focusDiv.append(img)
				playerLineDiv.append(focusDiv)
			}
		}
	}

	this.renderMarketBoardScreen = function () {
		var top = 0
		var i = 0
		var j = 0
		var k = 0
		var imgDiv
		var img
		var numDiv
		var Xcoord = 0
		var Ycoord = 0
		var divXcoord = 0
		var divYcoord = 0
		var minSpec = 0
		var minSpecStickDiv
		var left = 0
		var pieceDiv
		var pieceImg
		var pieceLeft = 0
		var pieceWidth = 28
		var pieceHeight = 28
		var col = "black"

		$("#wholeFactoryDiv").hide()
		$("#wholeMarketScreenDiv").show()

		if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			$("#allDealershipsWithStockDiv").remove()
			// Add stock to newly built Dships
			for (i = 0; i < this.model.players.length; i++) {
				factory = this.model.players[i].factory
				for (j = 0; j < factory.factoryComponents.length; j++) {
					if (MAINLINES.includes(factory.factoryComponents[j][0])) {
						for (k = 0; k < this.model.assemblyCapacityTrack.length; k++) if (this.model.assemblyCapacityTrack[k].indexOf(this.model.players[i].colour) > -1) factory.factoryComponents[j][SL_IDX] = k + 1
					}
				}
			}
			$("#actions").append(this.displayAllDealershipsWithStock())
		}
		// Vertical TT
		var verticalTTdiv = $("#verticalTTdiv")
		verticalTTdiv.empty()
		var verticalTTimg = this.getImage("ttImg" + String(this.model.techTracks[0][7][0]), true)
		verticalTTimg.attr({ id: "verticalTTimg" })
		verticalTTimg.addClass("trackImg")
		verticalTTdiv.append(verticalTTimg)
		var specAxis = $("<div></div>")
		specAxis.attr("id", "verticalSpecAxis")
		// add spec divs
		var YspecAxis = [this.model.techTracks[0][7][1], this.model.techTracks[0][7][1] + 1, this.model.techTracks[0][7][1] + 2, this.model.techTracks[0][7][1] + 3]
		for (i = 0; i < 4; i++) {
			var spcDiv = $("<div></div>")
			top = 150 * i
			spcDiv.css({
				position: "absolute",
				left: "0px",
				top: String(top) + "px",
				width: "14px",
				"margin-left": "2px",
				height: "140px",
				"line-height": "140px",
				"font-weight": "bolder",
				"margin-top": "5px",
				"margin-bottom": "5px",
				border: "1px solid black",
			})
			spcDiv.append(String(YspecAxis[3 - i]))
			specAxis.append(spcDiv)
		}
		verticalTTdiv.append(specAxis)
		// Add min spec sticks
		minSpec = this.model.techTracks[0][7][1]
		minSpecStickDiv = $("<div></div>")
		top = 132 + minSpec * 66
		minSpecStickDiv.css({
			position: "absolute",
			left: "24px",
			top: String(top) + "px",
			width: "90px",
			height: "10px",
			"margin-left": "2px",
			"background-color": "white",
			border: "1px solid black",
		})

		verticalTTdiv.append(minSpecStickDiv)

		// now add in player pieces
		for (i = 0; i < this.model.techTracks[0].length - 1; i++) {
			// ALWAYS add the div to supply tool tips
			// create a div to hold the pieces
			pieceDiv = $("<div></div>")
			pieceDiv.addClass("pieceDiv")
			top = 73 + 66 * i
			pieceDiv.css({
				// Start at left 73. Shift 66
				position: "absolute",
				left: "28px",
				top: String(top) + "px",
				width: "90px",
				height: "59px",
			})
			pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[0][7][0], i))
			verticalTTdiv.append(pieceDiv)
			for (j = 0; j < this.model.techTracks[0][i].length; j++) {
				pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[0][i][j])))
				pieceImg.addClass("piece")
				pieceImg.attr("id", "TT0" + String(i) + String(this.model.techTracks[0][i][j]))
				pieceWidth = 29
				pieceHeight = 30
				// Fix the width at 29; adjust height for oval
				if (getCorrectedColour(this.model.techTracks[0][i][j]) === BLUE) pieceHeight = 21
				pieceImg.css({
					width: String(pieceWidth) + "px",
					height: String(pieceHeight) + "px",
					filter: `drop-shadow(2px 0 0 white) 
									drop-shadow(0 2px 0 white)
									drop-shadow(-2px 0 0 white) 
									drop-shadow(0 -2px 0 white)`,
				})
				pieceDiv.append(pieceImg)
			}
			//} END if piece in array pos
		}
		// Market Board
		var marketBoarddiv = $("#marketBoarddiv")
		marketBoarddiv.empty()
		var marketBoardImg = this.getImage(MARKET_BOARD)
		marketBoardImg.css({
			width: "600px",
			height: "600px",
		})
		marketBoarddiv.append(marketBoardImg)
		// Now add sparks / demand
		for (i = 0; i < this.model.marketBoard.length; i++) {
			if (this.model.marketBoard[i][0] + this.model.marketBoard[i][1] + this.model.marketBoard[i][0] + this.model.marketBoard[i][2] + this.model.marketBoard[i][3] + this.model.marketBoard[i][4] + this.model.marketBoard[i][5] > 0) {
				// Create a niche div
				Xcoord = this.model.getMBcoordsForIndex(i)[0]
				Ycoord = this.model.getMBcoordsForIndex(i)[1]

				var nicheDiv = $("<div></div>")
				divXcoord = 9 + 71.5 * Xcoord
				divYcoord = 9 + 71.5 * Ycoord

				if (Xcoord >= 2) divXcoord += 4.5
				if (Xcoord >= 4) divXcoord += 7
				if (Xcoord >= 6) divXcoord += 4.5

				if (Ycoord >= 2) divYcoord += 4.5
				if (Ycoord >= 4) divYcoord += 7
				if (Ycoord >= 6) divYcoord += 4.5

				nicheDiv.css({
					position: "absolute",
					top: String(divYcoord) + "px",
					left: String(divXcoord) + "px",
					width: "68px",
					height: "68px",
				})
				var demandDiv = $("<div></div>")
				demandDiv.css({
					position: "absolute",
					display: "flex",
					"flex-wrap": "wrap",
					top: "0px",
					left: "0px",
					width: "69px",
					height: "40px",
					"z-index": "500",
				})
				for (j = 3; j < 6; j++) {
					if (this.model.marketBoard[i][j] > 0) {
						imgDiv = $("<div></div>")
						imgDiv.css({
							position: "relative",
							width: "34px",
							height: "20px",
						})
						img = this.getImage("V" + String(j - 3))
						img.css({
							position: "absolute",
							top: "0px",
							left: "0px",
							width: "34px",
							height: "20px",
						})
						imgDiv.append(img)
						numDiv = $("<div></div>")
						numDiv.css({
							position: "absolute",
							top: "0px",
							left: "10px",
							color: "yellow",
							"font-weight": "bolder",
							padding: "2px",
							"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
						})
						numDiv.append(String(this.model.marketBoard[i][j]))
						imgDiv.append(numDiv)
						demandDiv.append(imgDiv)
					}
				}
				var sparkDiv = $("<div></div>")
				sparkDiv.css({
					position: "absolute",
					display: "flex",
					"flex-wrap": "wrap",
					top: "42px",
					left: "0px",
					width: "68px",
					height: "28px",
					"z-index": "500",
				})
				for (j = 0; j < 3; j++) {
					if (this.model.marketBoard[i][j] > 0) {
						imgDiv = $("<div></div>")
						imgDiv.css({
							position: "relative",
							width: "22px",
							height: "22px",
						})
						img = this.getImage("S" + String(j))
						img.css({
							position: "absolute",
							top: "0px",
							left: "0px",
							width: "22px",
							height: "22px",
						})
						imgDiv.append(img)
						numDiv = $("<div></div>")
						numDiv.css({
							position: "absolute",
							top: "0px",
							left: "5px",
							color: "yellow",
							"font-weight": "bolder",
							padding: "2px",
							"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
						})
						numDiv.append(String(this.model.marketBoard[i][j]))
						imgDiv.append(numDiv)
						sparkDiv.append(imgDiv)
					}
				}

				nicheDiv.append(demandDiv)
				nicheDiv.append(sparkDiv)
				marketBoarddiv.append(nicheDiv)
			}
		}

		// Now add PLACED market windows
		var alreadyCoveredIndexes = []
		for (i = 0; i < this.model.players.length; i++) {
			for (j = 0; j < this.model.players[i].factory.factoryComponents.length; j++) {
				var component = this.model.players[i].factory.factoryComponents[j]
				if (DEALERSHIPS.includes(component[0])) {
					if (component[MW_IDX][0] != -1) {
						// We have a dealership with a placed market window
						var index = component[MW_IDX][0]
						var rotation = component[MW_IDX][1]
						var MWsize = component[MW_IDX][2]
						var str
						if (MWsize === 0) str = MW_SMALL
						if (MWsize === 0 && rotation % 2 == 1) str = MW_SMALL_R
						if (MWsize === 1) str = MW_MEDIUM
						if (MWsize === 2) str = MW_LARGE
						col = "black"
						if (RED_DEALERSHIPS.includes(component[0])) col = RED
						if (GREEN_DEALERSHIPS.includes(component[0])) col = GREEN
						if (PURPLE_DEALERSHIPS.includes(component[0])) col = PURPLE
						if (BLUE_DEALERSHIPS.includes(component[0])) col = BLUE
						if (YELLOW_DEALERSHIPS.includes(component[0])) col = YELLOW

						var correctedDshipName = COMPONENTS_NAME_STRING[getCorrectedDealershipColour(component[0], col)]
						correctedDshipName = correctedDshipName.substring(0, 10)

						col = getCorrectedColour(col)
						var colNum = col
						if (col === RED) col = "#E83435"
						if (col === GREEN) col = "#70C96B"
						if (col === PURPLE) col = "#8E63B3"
						if (col === BLUE) col = " #435EB5"
						if (col === YELLOW) col = "#EECD30"

						var MWImg = $(str.replace(/COLOUR/, col))
						var MWwidth = 3
						var MWheight = 3
						if (MWsize == 1) {
							MWwidth = 2
							MWheight = 2
						}
						if (MWsize == 0 && rotation % 2 == 0) {
							MWwidth = 1
							MWheight = 2
						}
						if (MWsize == 0 && rotation % 2 == 1) {
							MWwidth = 2
							MWheight = 1
						}
						Xcoord = this.model.getMBcoordsForIndex(index)[0]
						Ycoord = this.model.getMBcoordsForIndex(index)[1]
						// Shift for rotation first
						divXcoord = 0
						divYcoord = 0
						if (rotation == 1) {
							// top is good, but left needs to move back
							divXcoord = divXcoord - (this.nicheSqPxWidth + 5) * (MWwidth - 1)
						}
						if (rotation == 2) {
							// need to shift left and up
							divXcoord = divXcoord - (this.nicheSqPxWidth + 5) * (MWwidth - 1)
							divYcoord = divYcoord - (this.nicheSqPxWidth + 5) * (MWheight - 1)
						}
						if (rotation == 3) {
							// left is good, but top needs to move o[]
							divYcoord = divYcoord - (this.nicheSqPxWidth + 5) * (MWheight - 1)
						}
						divXcoord += 9 + 71.5 * Xcoord
						divYcoord += 9 + 71.5 * Ycoord

						if (Xcoord >= 2) divXcoord += 4.5
						if (Xcoord >= 4) divXcoord += 7
						if (Xcoord >= 6) divXcoord += 4.5

						if (Ycoord >= 2) divYcoord += 4.5
						if (Ycoord >= 4) divYcoord += 7
						if (Ycoord >= 6) divYcoord += 4.5

						// Now shift for outer px
						divXcoord -= 5
						divYcoord -= 5

						// shift for already covered
						var alreadyL = 0
						var alreadyT = 0
						var newlyCoveredIndexes = this.model.getCoveredIndexesOfMarketWindow(index, rotation, MWsize)

						if (newlyCoveredIndexes.some((r) => alreadyCoveredIndexes.includes(r))) {
							alreadyL = 3 * colNum
							alreadyT = 3 * colNum
						}
						alreadyCoveredIndexes = alreadyCoveredIndexes.concat(newlyCoveredIndexes)

						MWImg.css({
							position: "absolute",
							left: String(divXcoord + alreadyL) + "px",
							top: String(divYcoord + alreadyT) + "px",
							"z-index": String(5 + colNum),
						})

						$("#marketBoarddiv").append(MWImg)
						var MWnameSpan = $("<span>")
						MWnameSpan.addClass("MWnameSpan")
						MWnameSpan.append(correctedDshipName)
						MWnameSpan.css({
							position: "absolute",
							left: String(divXcoord + alreadyL) + "px",
							top: String(divYcoord + alreadyT - 5) + "px",
							"z-index": String(5 + colNum),
						})
						$("#marketBoarddiv").append(MWnameSpan)
					}
				}
			}
		}

		// Add prices
		for (i = 0; i < this.model.priceBand.length; i++) {
			if (this.model.priceBand[i] > 0) {
				var indexToUse = this.model.getIndexForPriceDisplay(i)
				// Create a niche div
				var priceDiv = this.getPriceDiv(indexToUse, this.model.priceBand[i])
				marketBoarddiv.append(priceDiv)
			}
		}

		// Horizontal TT
		var horizontalTTdiv = $("#horizontalTTdiv")
		horizontalTTdiv.empty()
		specAxis = $("<div></div>")
		specAxis.attr("id", "horizontalSpecAxis")

		// add spec divs
		var XspecAxis = [this.model.techTracks[1][7][1], this.model.techTracks[1][7][1] + 1, this.model.techTracks[1][7][1] + 2, this.model.techTracks[1][7][1] + 3]
		for (i = 0; i < 4; i++) {
			var specDiv = $("<div></div>")
			left = 150 * i
			specDiv.css({
				position: "absolute",
				left: String(left) + "px",
				top: "0px",
				height: "14px",
				"margin-top": "2px",
				width: "140px",
				"font-weight": "bolder",
				"font-size": "13px",
				"margin-left": "5px",
				"margin-right": "5px",
				border: "1px solid black",
			})
			specDiv.append(String(XspecAxis[i]))
			specAxis.append(specDiv)
		}

		horizontalTTdiv.append(specAxis)
		var horizontalTTImg = this.getImage("ttImg" + String(this.model.techTracks[1][7][0]), false)
		horizontalTTImg.addClass("trackImg")
		horizontalTTImg.attr("id", "horizontalTTImg")
		horizontalTTImg.css({
			position: "relative",
			top: "20px",
			left: "55px",
			width: "490px",
			height: "120px",
		})
		horizontalTTdiv.append(horizontalTTImg)

		// Add min spec sticks
		minSpec = this.model.techTracks[1][7][1]
		minSpecStickDiv = $("<div></div>")
		left = 131 + minSpec * 66
		minSpecStickDiv.css({
			position: "absolute",
			left: String(left) + "px",
			top: "24px",
			width: "10px",
			height: "90px",
			"background-color": "white",
			border: "1px solid black",
		})

		horizontalTTdiv.append(minSpecStickDiv)

		// now add in player pieces
		for (i = 0; i < this.model.techTracks[1].length - 1; i++) {
			// create a div to hold the pieces
			pieceDiv = $("<div></div>")
			pieceDiv.addClass("pieceDiv")
			left = 73 + 66 * i
			pieceDiv.css({
				// Start at left 73. Shift 66
				position: "absolute",
				top: "28px",
				left: String(left) + "px",
				width: "59px",
				height: "85px",
			})
			pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[1][7][0], i))
			horizontalTTdiv.append(pieceDiv)
			for (j = 0; j < this.model.techTracks[1][i].length; j++) {
				pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[1][i][j])))
				pieceImg.addClass("piece")
				pieceImg.attr("id", "TT1" + String(i) + String(this.model.techTracks[1][i][j]))
				pieceWidth = 29
				pieceHeight = 30
				// Fix the width at 29; adjust height for oval
				if (getCorrectedColour(this.model.techTracks[1][i][j]) === BLUE) pieceHeight = 21
				pieceImg.css({
					width: String(pieceWidth) + "px",
					height: String(pieceHeight) + "px",
					filter: `drop-shadow(2px 0 0 white) 
									drop-shadow(0 2px 0 white)
									drop-shadow(-2px 0 0 white) 
									drop-shadow(0 -2px 0 white)`,
				})
				pieceDiv.append(pieceImg)
			}
		}

		// Obs marker
		var obsMarkerDiv = $("<div></div>")
		obsMarkerDiv.css({
			position: "absolute",
			top: "600px",
			left: "0px",
			width: "140px",
			height: "140px",
		})
		$("#wholeMarketBoardDiv").append(obsMarkerDiv)
		var obsMarkerImg = this.getImage("obsMarker", false)
		if (this.model.obsolescenceMarkerDirection === 0) obsMarkerImg.addClass("r3")
		obsMarkerImg.css({
			width: "140px",
			height: "140px",
		})
		obsMarkerDiv.append(obsMarkerImg)

		// Right Infos
		var allRightInfos = $("<div></div>")
		allRightInfos.css({
			position: "absolute",
			top: "0px",
			left: "740px",
			width: "490px",
			height: "740px",
		})
		$("#wholeMarketBoardDiv").append(allRightInfos)

		//min spec
		var minSpecDiv = $("<div></div>")
		minSpecDiv.css({
			position: "absolute",
			top: "0px",
			left: "0px",
			width: "490px",
			height: "152px",
		})
		allRightInfos.append(minSpecDiv)
		var minSpecImg = this.getImage("minSpecs", false)
		minSpecImg.css({
			width: "320px",
			height: "142px",
			border: "2px solid black",
		})
		minSpecDiv.append(minSpecImg)

		var minSpecs = Rules.getMinSpecsInOrder()
		for (i = 0; i < minSpecs.length; i++) {
			if (minSpecs[i] > 0) {
				// Add min spec sticks
				var minSpecTokenkDiv = $("<div></div>")
				var leftShift = 0
				var text
				if (i === RED) {
					leftShift = 0
					col = "#A12529"
					text = "Speed"
					textCol = "white"
				}
				if (i === PURPLE) {
					leftShift = 1
					col = "#51365F"
					text = "Design"
					textCol = "white"
				}
				if (i === BLUE) {
					leftShift = 2
					col = "#3474A9"
					text = "Reliability"
					textCol = "white"
				}
				if (i === YELLOW) {
					leftShift = 3
					col = "#C28727"
					text = "Safety"
					textCol = "white"
				}
				if (i === GREEN) {
					leftShift = 4
					col = "#456334"
					text = "Range"
					textCol = "white"
				}

				left = 99 + leftShift * 58
				minSpecTokenkDiv.css({
					position: "absolute",
					left: String(left) + "px",
					top: "90px",
					width: "50px",
					height: "45px",
					"font-size": "43px",
					"background-color": col,
					border: "1px solid black",
					color: textCol,
				})
				minSpecTokenkDiv.append(String(minSpecs[i]))

				minSpecDiv.append(minSpecTokenkDiv)
			}
		}

		var showPiecesDiv = $("<div></div>")
		showPiecesDiv.css({
			position: "absolute",
			left: "5px",
			top: "5px",
			width: "60px",
			height: "60px",
			"margin-left": "2px",
		})
		var showPiecesButton = $("<button id='showPiecesButton'>" + gettext("Hide Pieces") + "</button>")
		showPiecesButton.addClass("actionsLineButton")
		showPiecesButton.css({
			"font-weight": "bolder",
			"font-size": "17px",
			width: "68px",
			height: "60px",
			"margin-left": "0px",
		})
		showPiecesDiv.append(showPiecesButton)

		showPiecesButton.off()
		showPiecesButton.on("click", function () {
			if ($(".piece").is(":visible")) {
				$(".piece").fadeOut()
			} else {
				$(".piece").fadeIn()
			}
			if (showPiecesButton.text() == gettext("Hide Pieces")) showPiecesButton.text(gettext("Show Pieces"))
			else showPiecesButton.text(gettext("Hide Pieces"))
		})

		minSpecDiv.append(showPiecesDiv)

		// assem capac
		var assemCapacDiv = $("<div></div>")
		assemCapacDiv.css({
			position: "absolute",
			top: "152px",
			left: "0px",
			width: "490px",
			height: "228px",
		})
		allRightInfos.append(assemCapacDiv)
		var assemCapacImg = this.getImage("assemCapac", false)
		assemCapacImg.addClass("trackImg")
		assemCapacImg.css({
			width: "380px",
			height: "218px",
			border: "2px solid black",
		})
		assemCapacDiv.append(assemCapacImg)
		// now add in player pieces
		for (i = 0; i < this.model.assemblyCapacityTrack.length; i++) {
			if (this.model.assemblyCapacityTrack[i].length > 0 || 1 == 1) {
				// create a div to hold the pieces
				pieceDiv = $("<div></div>")
				pieceDiv.addClass("pieceDiv")
				left = 55 + 76 * i
				pieceDiv.css({
					// Start at left 73. Shift 66
					position: "absolute",
					top: "125px",
					left: String(left) + "px",
					width: "75px",
					height: "83px",
				})
				assemCapacDiv.append(pieceDiv)
				for (j = 0; j < this.model.assemblyCapacityTrack[i].length; j++) {
					pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.assemblyCapacityTrack[i][j])))
					pieceImg.addClass("piece")
					pieceImg.attr("id", "ACT" + String(i) + String(this.model.assemblyCapacityTrack[i][j]))
					pieceWidth = 29
					pieceHeight = 30
					// Fix the width at 29; adjust height for oval
					if (getCorrectedColour(this.model.assemblyCapacityTrack[i][j]) === BLUE) pieceHeight = 21
					pieceImg.css({
						width: String(pieceWidth) + "px",
						height: String(pieceHeight) + "px",
						filter: `drop-shadow(2px 0 0 white) 
										drop-shadow(0 2px 0 white)
										drop-shadow(-2px 0 0 white) 
										drop-shadow(0 -2px 0 white)`,
					})
					pieceDiv.append(pieceImg)
				}
			}
		}

		// 360 for 3 x TT
		for (i = 2; i < this.model.techTracks.length; i++) {
			var divTop = 380 + 120 * (i - 2)
			var ttDiv = $("<div></div>")
			ttDiv.css({
				position: "absolute",
				top: String(divTop) + "px",
				left: "0px",
				width: "490px",
				height: "120px",
			})
			allRightInfos.append(ttDiv)
			var ttImg = this.getImage("ttImg" + String(this.model.techTracks[i][7][0]), false)
			ttImg.addClass("trackImg")
			ttImg.css({
				width: "490px",
				height: "120px",
			})
			ttDiv.append(ttImg)

			// Add min spec sticks
			minSpec = this.model.techTracks[i][7][1]
			minSpecStickDiv = $("<div></div>")
			left = 76 + minSpec * 66
			minSpecStickDiv.css({
				position: "absolute",
				left: String(left) + "px",
				top: "4px",
				width: "10px",
				height: "90px",
				"background-color": "white",
				border: "1px solid black",
			})

			ttDiv.append(minSpecStickDiv)

			// now add in player pieces
			for (j = 0; j < this.model.techTracks[1].length - 1; j++) {
				// create a div to hold the pieces
				pieceDiv = $("<div></div>")
				pieceDiv.addClass("pieceDiv")
				pieceLeft = 18 + 66 * j
				pieceDiv.css({
					// Start at left 73. Shift 66
					position: "absolute",
					top: "12px",
					left: String(pieceLeft) + "px",
					width: "56px",
					height: "85px",
				})
				pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[i][7][0], j))
				ttDiv.append(pieceDiv)
				for (k = 0; k < this.model.techTracks[i][j].length; k++) {
					pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[i][j][k])))
					pieceImg.addClass("piece")
					pieceImg.attr("id", "TT" + String(i) + String(j) + String(this.model.techTracks[i][j][k]))
					pieceWidth = 28
					pieceHeight = 29
					// Fix the width at 28 for off board TTs; adjust height for oval
					if (getCorrectedColour(this.model.techTracks[i][j][k]) === BLUE) pieceHeight = 21
					pieceImg.css({
						width: String(pieceWidth) + "px",
						height: String(pieceHeight) + "px",
						filter: `drop-shadow(2px 0 0 white) 
										drop-shadow(0 2px 0 white)
										drop-shadow(-2px 0 0 white) 
										drop-shadow(0 -2px 0 white)`,
					})
					pieceDiv.append(pieceImg)
				}
			}
		}

		// Add in the help div
		$("#marketBoardHelpDiv").empty()

		var phasesHelpDiv = $("<div></div>")
		phasesHelpDiv.css({
			//position: "absolute",
			top: "0px",
			left: "0px",
			width: "321px",
			height: "fit-content",
			border: "2px solid black",
			padding: "2px",
			margin: "2px",
			"font-weight": "bolder",
			"line-height": "28px",
			"text-align": "left",
		})
		phasesHelpDiv.append("<B><U>" + gettext("Phases") + "</B></U><BR/>")
		phasesHelpDiv.append(String(1) + " - " + PHASES_STR[1] + " " + gettext("(E &#x2192; S)") + "<BR/>")
		phasesHelpDiv.append(String(2) + " - " + PHASES_STR[2] + "  " + gettext("(Most Gantt &#x2192; Least Gantt)") + "<BR/>")
		phasesHelpDiv.append(String(3) + " - " + PHASES_STR[3] + " " + gettext("(E &#x2192; S)") + "<BR/>")
		phasesHelpDiv.append(String(4) + " - " + PHASES_STR[4] + "<BR/>")
		phasesHelpDiv.append(String(5) + " - " + PHASES_STR[5] + " " + gettext("(S &#x2192; E)") + "<BR/>")
		phasesHelpDiv.append(String(6) + " - " + PHASES_STR[6] + "<BR/>")
		phasesHelpDiv.append(String(7) + " - " + PHASES_STR[7] + "<BR/>")
		phasesHelpDiv.append(String(8) + " - " + PHASES_STR[8] + " " + gettext("(E &#x2192; S)") + "<BR/>")

		$("#marketBoardHelpDiv").append(phasesHelpDiv)

		var justFactoryFloorDiv = $("<div></div>")
		justFactoryFloorDiv.css({
			position: "absolute",
			top: "0px",
			left: "341px",
			width: "fit-content",
			height: "fit-content",
			//border: "2px solid black",
			padding: "2px",
			margin: "2px",
		})

		justFactoryFloorDiv.append(this.justRenderJustFactory(C.currentPlayer()))

		$("#marketBoardHelpDiv").append(justFactoryFloorDiv)

		let minHeight = 1010 // Market board screen PLUS phase summary div
		minHeight += justFactoryFloorDiv.height() // Add on height of JFF div
		minHeight -= phasesHelpDiv.height() // Remove height of phase summary div

		$("#wholeMarketScreenDiv").css("min-height", String(minHeight) + "px") // Set the min-height to 300px
	}

	this.getPriceDiv = function (index, price) {
		var priceDiv = $("<div></div>")
		var Xcoord = this.model.getMBcoordsForIndex(index)[0]
		var Ycoord = this.model.getMBcoordsForIndex(index)[1]

		var divXcoord = 9 + 71.5 * Xcoord
		var divYcoord = 9 + 71.5 * Ycoord

		if (Xcoord >= 2) divXcoord += 4.5
		if (Xcoord >= 4) divXcoord += 7
		if (Xcoord >= 6) divXcoord += 4.5

		if (Ycoord >= 2) divYcoord += 4.5
		if (Ycoord >= 4) divYcoord += 7
		if (Ycoord >= 6) divYcoord += 4.5

		priceDiv.css({
			position: "absolute",
			top: String(divYcoord + 10) + "px",
			left: String(divXcoord + 10) + "px",
			width: "48px",
			height: "28px",
			border: "1px solid black",
			"background-color": "#D8E3CD",
			"font-weight": "bolder",
			"line-height": "28px",
		})
		priceDiv.html("$" + String(price) + ".")
		return priceDiv
	}

	this.getImage = function (imgName, verticalImage) {
		var img = $("<img>")

		if (imgName === "ttImg" + String(BLUE) && verticalImage) img.attr("src", imagePreURL + "/tt_B_V.png")
		else if (imgName === "ttImg" + String(GREEN) && verticalImage) img.attr("src", imagePreURL + "/tt_G_V.png")
		else if (imgName === "ttImg" + String(PURPLE) && verticalImage) img.attr("src", imagePreURL + "/tt_P_V.png")
		else if (imgName === "ttImg" + String(RED) && verticalImage) img.attr("src", imagePreURL + "/tt_R_V.png")
		else if (imgName === "ttImg" + String(YELLOW) && verticalImage) img.attr("src", imagePreURL + "/tt_Y_V.png")
		else if (imgName === "ttImg" + String(BLUE)) img.attr("src", imagePreURL + "/tt_B.png")
		else if (imgName === "ttImg" + String(GREEN)) img.attr("src", imagePreURL + "/tt_G.png")
		else if (imgName === "ttImg" + String(PURPLE)) img.attr("src", imagePreURL + "/tt_P.png")
		else if (imgName === "ttImg" + String(RED)) img.attr("src", imagePreURL + "/tt_R.png")
		else if (imgName === "ttImg" + String(YELLOW)) img.attr("src", imagePreURL + "/tt_Y.png")
		else if (imgName === "obsMarker") img.attr("src", imagePreURL + "/obs_marker.png")
		else if (imgName === MARKET_BOARD) img.attr("src", imagePreURL + "/market_board.jpg")
		else if (imgName === "piece" + String(RED)) img.attr("src", imagePreURL + "/piece_R.png")
		else if (imgName === "piece" + String(GREEN)) img.attr("src", imagePreURL + "/piece_G.png")
		else if (imgName === "piece" + String(PURPLE)) img.attr("src", imagePreURL + "/piece_P.png")
		else if (imgName === "piece" + String(BLUE)) img.attr("src", imagePreURL + "/piece_B.png")
		else if (imgName === "piece" + String(YELLOW)) img.attr("src", imagePreURL + "/piece_Y.png")
		else if (imgName === "minSpecs") img.attr("src", imagePreURL + "/min_specs.jpg")
		else if (imgName === "assemCapac") img.attr("src", imagePreURL + "/assem_capac.jpg")
		else if (imgName === "V0") img.attr("src", imagePreURL + "/v_car.png")
		else if (imgName === "V1") img.attr("src", imagePreURL + "/v_truck.png")
		else if (imgName === "V2") img.attr("src", imagePreURL + "/v_sports.png")
		else if (imgName === "S0") img.attr("src", imagePreURL + "/s_car.jpg")
		else if (imgName === "S1") img.attr("src", imagePreURL + "/s_truck.jpg")
		else if (imgName === "S2") img.attr("src", imagePreURL + "/s_sports.jpg")
		else if (imgName === "MWicon0") img.attr("src", imagePreURL + "/MW_sm_i.jpg")
		else if (imgName === "MWicon0_v") img.attr("src", imagePreURL + "/MW_sm_i_v.jpg")
		else if (imgName === "MWicon1") img.attr("src", imagePreURL + "/MW_med_i.jpg")
		else if (imgName === "MWicon2") img.attr("src", imagePreURL + "/MW_lrg_i.jpg")

		return img
	}

	this.renderFactoryFloor = function (player) {
		if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			$("#allDealershipsWithStockDiv").remove()
		}
		var img
		var i = 0
		var j = 0
		var col = "black"
		var left = 0
		var Cwidth = 0
		var Cheight = 0
		var Cleft = 0
		var Ctop = 0
		var borderCol = "lightgreen"
		var shiftForHighlight = 0
		var rotOffset = 0
		var index = 0
		var rotation = 0
		var Xcoord = 0
		var Ycoord = 0

		$("#wholeMarketScreenDiv").hide()
		$("#eligibleComponentsDiv").hide()
		if (global.name !== "BotKickStarter") $("#finishTurnButton").hide()
		$("#SSD").empty()

		if (!Rules.isSimulPhase() && this.model.players[this.model.gameFlow.turnOrder[0]] === player) $("#eligibleComponentsDiv").show()
		else {
			if (this.model.players[global.pov] === player && global.currentPlayers.indexOf(player.name) > -1) {
				$("#eligibleComponentsDiv").show()
			}
		}
		if (M.trainingGame) $("#eligibleComponentsDiv").show()
		if (global.name === "BotKickStarter") $("#eligibleComponentsDiv").show()

		if (Rules.canPlay() && global.currentPlayers.indexOf(player.name) > -1 && this.model.gameFlow.turn !== 0) {
			// show sell summary Div
			var SSD = $("#SSD")
			SSD.css({
				position: "relative",
				width: "100%",
			})
			var SSDwholeLineDiv = $("<div></div>")
			SSDwholeLineDiv.css({
				position: "relative",
				width: "fit-content",
				margin: "auto",
				display: "flex",
				"line-height": "32px",
			})
			// Show the min specs
			var minSpecs = Rules.getMinSpecsInOrder()
			//min spec
			var minSpecDiv = $("<div></div>")
			minSpecDiv.css({
				display: "flex",
			})
			var minAdded = false
			for (i = 0; i < minSpecs.length; i++) {
				if (minSpecs[i] > 0) {
					if (!minAdded) {
						minSpecDiv.append("Min: ")
						minAdded = true
					}
					// Add min spec sticks
					var minSpecTokenkDiv = $("<div></div>")
					var leftShift = 0
					var text
					if (i === RED) {
						leftShift = 0
						col = "#A12529"
						text = "Speed"
						textCol = "white"
					}
					if (i === PURPLE) {
						leftShift = 1
						col = "#46305D"
						text = "Design"
						textCol = "white"
					}
					if (i === BLUE) {
						leftShift = 2
						col = "#3474A9"
						text = "Reliability"
						textCol = "white"
					}
					if (i === YELLOW) {
						leftShift = 3
						col = "#C28727"
						text = "Safety"
						textCol = "white"
					}
					if (i === GREEN) {
						leftShift = 4
						col = "#456334"
						text = "Range"
						textCol = "white"
					}

					minSpecTokenkDiv.css({
						width: "30px",
						height: "30px",
						"font-size": "25px",
						"background-color": col,
						border: "1px solid black",
						color: textCol,
						"margin-left": "2px",
					})
					minSpecTokenkDiv.append(String(minSpecs[i]))
					minSpecDiv.append(minSpecTokenkDiv)
				}
			}
			SSDwholeLineDiv.append(minSpecDiv)

			SSDwholeLineDiv.append("&nbsp;" + gettext("Market Demand:") + " ")
			var DSinfo = this.model.getDemandSummaryInfo()

			for (i = 0; i < DSinfo.length; i++) {
				if (DSinfo[i][2][0] > 0 || DSinfo[i][2][1] > 0 || DSinfo[i][2][2] > 0) {
					var demandDiv = $("<div></div>")
					demandDiv.css({
						position: "relative",
						height: "30px",
						"margin-left": "5px",
						border: "1px solid black",
						"min-width": "fit-content",
					})
					demandDiv.append("<span class=SSD" + this.model.techTracks[0][7][0] + ">" + DSinfo[i][0] + "</span>")
					demandDiv.append("<span class=SSD" + this.model.techTracks[1][7][0] + ">" + DSinfo[i][1] + "</span>")
					var numberAdded = 0
					for (j = 0; j < DSinfo[i][2].length; j++) {
						if (DSinfo[i][2][j] > 0) {
							img = this.getImage("V" + String(j))
							img.css({
								width: "30px",
								height: "15px",
							})
							demandDiv.append(img)
							var valueSpan = $("<span></span>")
							valueSpan.text(DSinfo[i][2][j])
							left = 35 + numberAdded * 30
							valueSpan.css({
								position: "absolute",
								top: "0px",
								left: String(left) + "px",
								"font-size": "30px",
								color: "yellow",
								"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
							})
							demandDiv.append(valueSpan)
							numberAdded++
						}
					}

					SSDwholeLineDiv.append(demandDiv)
				}
			}

			SSD.append(SSDwholeLineDiv)

			var TSD = $("<div></div>")
			TSD.css({
				position: "relative",
				width: "100%",
				height: "fit=content",
			})

			var techSummaryWholeLineDiv = $("<div></div>")
			techSummaryWholeLineDiv.css({
				display: "flex",
				"flex-wrap": "wrap",
				"justify-content": "space-around",
			})

			//////////////
			var FacShowPiecesDiv = $("<div></div>")
			FacShowPiecesDiv.css({
				left: "15px",
				top: "0px",
				width: "50px",
				height: "50px",
				"margin-left": "2px",
				"margin-top": "0px",
			})
			var FacShowPiecesButton = $("<button id='showPiecesButton'>" + gettext("Show Pieces") + "</button>")
			FacShowPiecesButton.addClass("actionsLineButton")
			FacShowPiecesButton.css({
				"font-weight": "bolder",
				"font-size": "12px",
				width: "50px",
				height: "50px",
				"margin-left": "0px",
				"margin-top": "0px",
			})
			FacShowPiecesDiv.append(FacShowPiecesButton)
			FacShowPiecesButton.off()
			FacShowPiecesButton.on("click", function () {
				if ($(".TTsummaryPiece").is(":visible")) {
					$(".TTsummaryPiece").fadeOut()
				} else {
					$(".TTsummaryPiece").fadeIn()
				}
				if (FacShowPiecesButton.text() == gettext("Hide Pieces")) FacShowPiecesButton.text(gettext("Show Pieces"))
				else FacShowPiecesButton.text(gettext("Hide Pieces"))
			})

			techSummaryWholeLineDiv.append(FacShowPiecesDiv)

			////////////////////

			var allowedTechLevels = Rules.getAllowedTechLevels(false)
			var nativelyAllowedTechLevels = Rules.getNativelyAllowedTechLevels(global.pov)
			for (i = 0; i < this.model.techTracks.length; i++) {
				img = $("<img>")
				if (this.model.techTracks[i][7][0] === RED) img.attr("src", imagePreURL + "/tt_R_S.jpg")
				if (this.model.techTracks[i][7][0] === GREEN) img.attr("src", imagePreURL + "/tt_G_S.jpg")
				if (this.model.techTracks[i][7][0] === PURPLE) img.attr("src", imagePreURL + "/tt_P_S.jpg")
				if (this.model.techTracks[i][7][0] === BLUE) img.attr("src", imagePreURL + "/tt_B_S.jpg")
				if (this.model.techTracks[i][7][0] === YELLOW) img.attr("src", imagePreURL + "/tt_Y_S.jpg")

				if (this.model.techTracks[i][7][0] === RED) col = "#A12529"
				if (this.model.techTracks[i][7][0] === PURPLE) col = "#46305D"
				if (this.model.techTracks[i][7][0] === BLUE) col = "#3474A9"
				if (this.model.techTracks[i][7][0] === YELLOW) col = "#C28727"
				if (this.model.techTracks[i][7][0] === GREEN) col = "#456334"

				var singleTTsummaryDiv = $("<div></div>")
				singleTTsummaryDiv.css({
					position: "relative",
					margin: "auto", // NEEDED TO CENTRE OVERFLOW
				})

				img.css({
					width: "300px",
					height: "35px",
					"margin-right": "5px",
					border: "7px solid" + col,
				})

				singleTTsummaryDiv.append(img)

				for (j = 1; j <= 6; j++) {
					// Add a div for tooltip
					var techTooltipDiv = $("<div></div>")
					left = 9 + (j - 1) * 50
					techTooltipDiv.css({
						position: "absolute",
						left: String(left) + "px",
						top: "0px",
						width: "46px",
						height: "47px",
					})
					techTooltipDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[i][7][0], j))
					singleTTsummaryDiv.append(techTooltipDiv)
					// Add Tech Sticks
					if (allowedTechLevels[i] > 0 && allowedTechLevels[i] >= j) {
						var techBarDiv = $("<div></div>")
						if (nativelyAllowedTechLevels[i] >= j) borderCol = "lightgreen"
						else borderCol = "yellow"
						techBarDiv.css({
							position: "absolute",
							left: "0px",
							top: "0px",
							width: "40px",
							height: "5px",
							"background-color": col,
							border: "3px solid " + borderCol,
						})
						techTooltipDiv.append(techBarDiv)
					}
					// Add player minis
					var playerPiecesMiniDiv = $("<div></div>")
					playerPiecesMiniDiv.css({
						position: "absolute",
						left: "0px",
						top: "8px",
						width: "51px",
						height: "36px",
					})
					techTooltipDiv.append(playerPiecesMiniDiv)
					// Now go thru the single entry on the TT to see if pieces need to be added

					for (k = 0; k < this.model.techTracks[i][j].length; k++) {
						pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[i][j][k])))
						pieceImg.addClass("TTsummaryPiece")
						pieceWidth = 17
						pieceHeight = 18
						// Fix the width at 29; adjust height for oval
						if (getCorrectedColour(this.model.techTracks[i][j][k]) === BLUE) pieceHeight = 15
						pieceImg.css({
							width: String(pieceWidth) + "px",
							height: String(pieceHeight) + "px",
							display: "none",
						})
						playerPiecesMiniDiv.append(pieceImg)
					}
				}
				techSummaryWholeLineDiv.append(singleTTsummaryDiv)
			}
			TSD.append(techSummaryWholeLineDiv)
			SSD.append(TSD)
			SSD.show()
		}

		$("#wholeFactoryDiv").show()

		// START FAC CODE
		var factory = player.factory
		i = 0
		$("#factoryFloorDiv").empty()
		var factoryFloorDiv = $("#factoryFloorDiv")
		factoryFloorDiv.css({
			height: String(this.smallSqPxWidth * factory.height) + "px",
			width: String(this.smallSqPxWidth * factory.width) + "px",
		})
		// ************************************************************************************************** Main factory
		img = $("<img>")
		img.attr("src", imagePreURL + "/f_main.jpg")
		if (factory.mainFactoryFlipped === 0) img.addClass("factoryFllor").addClass("r" + factory.mainFactoryRotation)
		else img.addClass("factoryFllor").addClass("r" + String(factory.mainFactoryRotation) + "M")
		var mainFactoryCoords = factory.getCoordsForIndex(factory.mainFactoryIndex)
		img.css({
			height: String(this.smallSqPxWidth * 12) + "px",
			width: String(this.smallSqPxWidth * 12) + "px",
			position: "absolute",
			left: String(mainFactoryCoords[0] * this.smallSqPxWidth) + "px",
			top: String(mainFactoryCoords[1] * this.smallSqPxWidth) + "px",
		})
		factoryFloorDiv.append(img)

		// Render Expansions ******************************************************************************** EXPANSIONS
		for (i = 0; i < factory.factoryExpansions.length; i++) {
			// Expansion
			img = $("<img>")
			img.attr("src", imagePreURL + "/f_expansion.jpg")
			img.addClass("factoryFloor")
			if (factory.factoryExpansions[i][2] === 0) img.addClass("r" + String(factory.factoryExpansions[i][1]))
			else img.addClass("r" + String(factory.factoryExpansions[i][1]) + "M")

			// Render newly added expansion
			shiftForHighlight = 0
			if (factory.factoryExpansions[i][0] === factory.factoryExpansionIndexAddedThisTurn && (Rules.canPlay() || M.sandboxMode)) {
				shiftForHighlight = 1

				img.css({
					border: String(this.newlyPlacedComponentBorderSize) + "px solid green",
				})

				img.on("mouseover", function (e) {
					$(this).css({
						border: String(V.newlyPlacedComponentBorderSize) + "px solid yellow",
					})
				})
				img.on("mouseout", function (e) {
					$(this).css({
						border: String(V.newlyPlacedComponentBorderSize) + "px solid green",
					})
				})

				// PLUCK EXPANSION FROM FACTORY
				img.on("click", function (e) {
					$("#finishTurnButton").remove()
					$("#endExpansionSandboxButton").remove()

					//var i = 0;
					var placedExpansionIndex = factory.factoryExpansionIndexAddedThisTurn
					var placedExpansionRotation = factory.factoryExpansions[factory.factoryExpansions.length - 1][1]
					var placedExpansionFlipped = factory.factoryExpansions[factory.factoryExpansions.length - 1][2]

					// remove coords
					var tableHeight = 8
					var tableWidth = 6
					if (placedExpansionRotation % 2 === 1) {
						tableHeight = 6
						tableWidth = 8
					}
					for (y = 0; y < tableHeight; y++) {
						for (x = placedExpansionIndex; x < placedExpansionIndex + tableWidth; x++) {
							factory.factoryCoords[x + y * factory.width] = OUT_OF_BOUNDS
						}
					}
					// remove from expansion
					factory.factoryExpansions.pop()

					V.renderFactoryFloor(player)

					// Now do the function as if you'd clicked it from the title

					$(".ghostComponentImg").remove()
					$("#nudgeDiv").remove()

					player.factory.componentBeingAdded = FACTORY_EXPANSION_TILE
					player.factory.componentBeingAddedRotation = placedExpansionRotation
					player.factory.componentBeingAddedFlipped = placedExpansionFlipped

					V.showComponentBeingAdded(factory, FACTORY_EXPANSION_TILE)
					V.updateQSPdiv(player)

					$(".selectable").remove()
					var OOB_indexes = []
					for (var i = 0; i < player.factory.factoryCoords.length; i++) if (player.factory.factoryCoords[i] === OUT_OF_BOUNDS) OOB_indexes.push(i)
					V.externalDrawSquares(player, OOB_indexes, "#f00", "selectable")
					$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryExpansion)
					$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
					$("#componentValidationDiv").css("visibility", "hidden")
				}) // END PLACED EXPANSION CLICK
			} // END This turn fac expansion

			var expansionCoords = factory.getCoordsForIndex(factory.factoryExpansions[i][0])
			rotOffset = 0
			if (factory.factoryExpansions[i][1] % 2 == 1) rotOffset = 1
			img.css({
				height: String(this.smallSqPxWidth * 8 - 2 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				width: String(this.smallSqPxWidth * 6 - 2 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				position: "absolute",
				left: String((expansionCoords[0] + rotOffset) * this.smallSqPxWidth - 0 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				top: String((expansionCoords[1] - rotOffset) * this.smallSqPxWidth - 0 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
			})
			factoryFloorDiv.append(img)
		} // END EXPANSION DISPLAY

		// Render components ************************************************************************************************** COMPONENTS

		var componentValidationDiv = $("#componentValidationDiv")
		componentValidationDiv.html()
		componentValidationDiv.empty()
		componentValidationDiv.css({
			visibility: "visible",
		})
		var invalidCount = 0
		for (i = 0; i < factory.factoryComponents.length; i++) {
			var component = factory.factoryComponents[i][0]
			index = factory.factoryComponents[i][1]
			rotation = factory.factoryComponents[i][2]
			var flipped = factory.factoryComponents[i][3]
			var componentImg = this.getComponentImage(component)
			if (flipped === 0) componentImg.addClass("factoryComponent").addClass("r" + String(rotation))
			else componentImg.addClass("factoryComponent").addClass("r" + String(rotation) + "M")
			componentImg.attr("id", "factoryComponent" + String(rotation) + String(index))
			Cwidth = DIMENSIONS[component][0] * this.smallSqPxWidth
			Cheight = DIMENSIONS[component][1] * this.smallSqPxWidth

			// Render newly added components
			shiftForHighlight = 0
			var previousTurnComponent = true
			// Need to check names, as otherwise it was possible to move previous people's factories aroundy
			if ((global.pov != undefined && factory.factoryComponenetIndexesAddedThisTurn.includes(index) && player.name === M.players[global.pov].name && (Rules.canPlay() || M.sandboxMode)) || (M.trainingGame && factory.factoryComponenetIndexesAddedThisTurn.includes(index) && Rules.canPlay())) {
				shiftForHighlight = 1
				previousTurnComponent = false
				var validation = factory.validateSingleComponent(factory.factoryComponents[i])
				if (validation[0]) {
					componentImg.addClass("valid")
					componentImg.css({
						border: String(this.newlyPlacedComponentBorderSize) + "px solid green",
					})
				} else {
					componentImg.css({
						border: String(this.newlyPlacedComponentBorderSize) + "px solid red",
					})
				}
				if (!validation[0]) {
					invalidCount++
					componentValidationDiv.append("<LI>" + COMPONENTS_NAME_STRING[component] + " - " + COMPONENT_ERROR_STRING[validation[1]] + "</LI>")
				}

				componentImg.on("mouseover", function (e) {
					$(this).css({
						border: String(V.newlyPlacedComponentBorderSize) + "px solid yellow",
					})
				})
				componentImg.on("mouseout", function (e) {
					if ($(this).hasClass("valid")) {
						$(this).css({
							border: String(V.newlyPlacedComponentBorderSize) + "px solid green",
						})
					} else {
						$(this).css({
							border: String(V.newlyPlacedComponentBorderSize) + "px solid red",
						})
					}
				})

				// PLUCK COMPONENET FROM FACTORY
				componentImg.on("click", function (e) {
					var i = 0
					var originalPossibleSpecsToAdd
					var possibleSpecsToAdd

					var placedComponentRotation = parseInt(this.id.slice(16, 17))
					var placedComponentIndex = parseInt(this.id.slice(17))
					// find out what componentName is at this index and add one back
					var arrayIndex = _.findIndex(factory.factoryComponents, function (el) {
						return el[1] === placedComponentIndex
					})
					var componentName = factory.factoryComponents[arrayIndex][0]
					var placedComponentFlipped = factory.factoryComponents[arrayIndex][3]

					if (ARROWS.includes(componentName)) originalPossibleSpecsToAdd = factory.findAllPossibleSpecsToAdd()

					factory.removeComponentAtIndex(placedComponentIndex)

					// refresh components
					V.displayEligibleFactoryTiles(player, Rules.getEligibleFactoryComponentNames(player))

					V.renderFactoryFloor(player)

					// Now do the function as if you'd clicked it from the title

					$(".ghostComponentImg").remove()
					$("#nudgeDiv").remove()

					player.factory.componentBeingAdded = componentName
					player.factory.componentBeingAddedRotation = placedComponentRotation
					player.factory.componentBeingAddedFlipped = placedComponentFlipped

					V.showComponentBeingAdded(player.factory, componentName)
					V.updateQSPdiv(player)

					$(".selectable").remove()

					if (ARROWS.includes(componentName)) {
						// Gets array [index in array of factory component now arrowless, arrowdID]
						possibleSpecsToAdd = factory.findAllPossibleSpecsToAdd()
						var specArray = []
						// Need 1 as the default
						var specArrayIndex = 1

						// Loop over the larger arrary to find the element not in the smaller, OR in smaller, but with different length
						for (i = 0; i < possibleSpecsToAdd.length; i++) {
							var found = false
							for (var j = 0; j < originalPossibleSpecsToAdd.length; j++) {
								// If index same and length same, it is found
								if (possibleSpecsToAdd[i][0] === originalPossibleSpecsToAdd[j][0] && possibleSpecsToAdd[i].length === originalPossibleSpecsToAdd[j].length) {
									found = true
									break
								}
								// If referencing the same component, check lengths are the same
								if (possibleSpecsToAdd[i][0] === originalPossibleSpecsToAdd[j][0] && possibleSpecsToAdd[i].length !== originalPossibleSpecsToAdd[j].length) {
									// Find the additional element in the bigger array, then get its index
									var missingArrow = possibleSpecsToAdd[i].filter((x) => !originalPossibleSpecsToAdd[j].includes(x))[0]
									if (missingArrow == undefined) missingArrow = originalPossibleSpecsToAdd[j].last()
									specArrayIndex = possibleSpecsToAdd[i].indexOf(missingArrow)
									break
								}
							}
							if (!found) {
								specArray.push(possibleSpecsToAdd[i])
								break
							}
						}
						// spec array is [component, arrow, arrow, arrow]
						// but need the index of the missing arrow
						V.actionClickedonQSPspec(specArray[0], specArray[0][specArrayIndex])
					} else {
						V.externalDrawSquares(player, player.factory.getEmptyFactorySpaces(), "yellow", "selectable")
						$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryComponent)
						$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
					}
				}) // END PLACED COMPONENT CLICK
			} // END This turn fac components
			Cwidth = DIMENSIONS[component][0]
			Cheight = DIMENSIONS[component][1]

			rotOffset = 0
			if (rotation % 2 == 1) rotOffset = 1
			rotOffset = (rotOffset * (Cwidth - Cheight)) / 2

			Cleft = factory.getCoordsForIndex(index)[0] - rotOffset
			Ctop = factory.getCoordsForIndex(index)[1] + rotOffset

			var borderShift = this.previouslyPlacedComponentBorderSize
			if (!previousTurnComponent) borderShift = this.newlyPlacedComponentBorderSize

			componentImg.css({
				height: String(Cheight * this.smallSqPxWidth - 2 * borderShift) + "px",
				width: String(Cwidth * this.smallSqPxWidth - 2 * borderShift) + "px",
				position: "absolute",
				left: String(Cleft * this.smallSqPxWidth - 0 * shiftForHighlight) + "px",
				top: String(Ctop * this.smallSqPxWidth - 0 * shiftForHighlight) + "px",
			})
			if (previousTurnComponent) componentImg.css({ border: "1px solid black" })

			factoryFloorDiv.append(componentImg)
		} // END faactory componennts

		if (this.model.gameFlow.turn === 0 && player.factory.factoryComponents.length !== 2) invalidCount++

		// Finally, check you are not duplicating preciously placed techs
		for (i = 0; i < factory.factoryComponents.length; i++) {
			var validation2 = factory.checkForDuplicateTechValidation(factory.factoryComponents[i])

			if (!validation2[0]) {
				invalidCount++
				componentValidationDiv.append(
					"<LI>" +
						interpolate(
							gettext("Adding a new tech caused: %(componentName)s - %(componentError)s"),
							{
								componentName: COMPONENTS_NAME_STRING[factory.factoryComponents[i][0]],
								componentError: COMPONENT_ERROR_STRING[validation2[1]],
							},
							true
						) +
						"</LI>"
				)
			}
		}

		// And check avail compo not negative!
		if (Rules.canPlay()) {
			for (i = 0; i < this.model.availableComponents.length; i++) {
				if (this.model.availableComponents[i] < 0) {
					invalidCount++
					componentValidationDiv.append(
						"<LI>" +
							interpolate(
								gettext("Please remove: %(componentName)s - previous players already took this"),
								{
									componentName: COMPONENTS_NAME_STRING[i],
								},
								true
							) +
							"</LI>"
					)
					break
				}
			}
		}

		if (invalidCount === 0) {
			// You may end the turn
			$("#finishTurnButton").show()

			// Add button back to div
			$(".enableOnInput").prop("disabled", true)
			player.factory.isValidFactory = true
			player.factory.checkDealershipLevels()
			componentValidationDiv.css({
				color: "darkgreen",
				"text-align": "left",
			})

			// Now components are updated with tech. So just go thru factory Components and add to div
			for (i = 0; i < player.factory.factoryComponents.length; i++) {
				if (MAINLINES.includes(player.factory.factoryComponents[i][0]) || DEALERSHIPS.includes(player.factory.factoryComponents[i][0])) {
					index = player.factory.factoryComponents[i][1]
					rotation = player.factory.factoryComponents[i][2]
					Xcoord = player.factory.getCoordsForIndex(index)[0]
					Ycoord = player.factory.getCoordsForIndex(index)[1]
					Cheight = DIMENSIONS[player.factory.factoryComponents[i][0]][1]

					if (DEALERSHIPS.includes(player.factory.factoryComponents[i][0])) {
						if (rotation == 0) Ycoord += 1.5
						if (rotation == 3) Xcoord += 1
					}
					var techLevelsDiv = $("<div></div>")
					techLevelsDiv.css({
						position: "absolute",
						left: String(Xcoord * this.smallSqPxWidth + 8) + "px",
						top: String(Ycoord * this.smallSqPxWidth + 8) + "px",
						width: "fit-content",
						height: "fit-content",
						"z-index": "1000",
					})
					var techLevelsSpan = $("<span></span>")
					techLevelsSpan.addClass("techLevelsSpan")

					var addedNumbers = 0
					/*for (j = 0; j < player.factory.factoryComponents[i][TL_IDX].length; j++) {
						if (player.factory.factoryComponents[i][TL_IDX][j] > 0) {
							techLevelsSpan.append("<span class='techLevelNumber" + String(j) + "a'>" + String(player.factory.factoryComponents[i][TL_IDX][j]) + "</span>")
							addedNumbers++
							if (rotation % 2 == 1 && addedNumbers % 2 === 0) techLevelsSpan.append("<BR/>")
						}
					}*/
					for (const j of TL_DISPLAY_IDX_ORDER) {
						const value = player.factory.factoryComponents[i][TL_IDX][j]

						if (value > 0) {
							techLevelsSpan.append("<span class='techLevelNumber" + String(j) + "a'>" + String(value) + "</span>")
							addedNumbers++

							// Handle the line break logic based on your rotation/count
							if (rotation % 2 == 1 && addedNumbers % 2 === 0) {
								techLevelsSpan.append("<BR/>")
							}
						}
					}
					techLevelsDiv.append(techLevelsSpan)
					factoryFloorDiv.append(techLevelsDiv)
				}
			}
		} else {
			componentValidationDiv.css({
				color: "red",
				"text-align": "left",
			})
		}

		// If you clicked back onto the factory, re-enable highlights
		if (player.factory.componentBeingAdded != -1) {
			// Now do the function as if you'd clicked it from the title

			$(".ghostComponentImg").remove()

			var componentName = player.factory.componentBeingAdded

			V.showComponentBeingAdded(player.factory, componentName)
			V.updateQSPdiv(player)
			$(".selectable").remove()
			if (componentName !== FACTORY_EXPANSION_TILE) {
				V.externalDrawSquares(player, player.factory.getEmptyFactorySpaces(), "yellow", "selectable")
				$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryComponent)
				$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
			} else {
				var OOB_indexes = []
				for (i = 0; i < player.factory.factoryCoords.length; i++) if (player.factory.factoryCoords[i] === OUT_OF_BOUNDS) OOB_indexes.push(i)
				V.externalDrawSquares(player, OOB_indexes, "#f00", "selectable")
				$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryExpansion)
				$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
				$("#componentValidationDiv").css("visibility", "hidden")
			}
		}

		// if your fac, show sandbox button
		if (this.model.players.indexOf(player) === global.pov) {
			if (!this.model.sandboxMode) {
				var sandboxButton = $('<button id="sandboxButton">' + gettext("Enter Sandbox Mode") + "</button>")
				sandboxButton.addClass("actionsLineButton")
				$("#componentValidationDiv").prepend(sandboxButton)
				$("#componentValidationDiv").show()
				sandboxButton.on("click", function () {
					M.sandboxMode = true
					if (!(M.gameFlow.phase === PHASE_BUILD_FACTORY && M.gameFlow.subphase === 1)) global.sandboxReset = compressObjectToDB(M.export())
					C.startActions()
					V.updateQSPdiv()
				})
			} else if (this.model.sandboxMode) {
				$("#eligibleComponentsDiv").show()
			}
		}

		// Show a summary of the market board
		$("#wholeMarketAreaSummaryDiv").remove()

		var top

		var wholeMarketAreaSummaryDiv = $("<div></div>")
		wholeMarketAreaSummaryDiv.attr("id", "wholeMarketAreaSummaryDiv") // Not in CSS -- just used to remove

		wholeMarketAreaSummaryDiv.css({
			position: "relative",
			//width: "fit-content",
			width: "1250px",
			overflow: "scroll",
			margin: "auto",
			height: "780px",
			display: "flex",
			//"background-color": "lightblue",
			"margin-top": "10px",
			/*"border-left-style": "solid",
			"border-left-width": "10px",
			"border-left-color": left_border_colour,
			"border-bottom-style": "solid",
			"border-bottom-width": "10px",
			"border-bottom-color": bottom_border_colour,
			"padding-left": "5px",
			"padding-bottom": "5px",
			"margin-bottom": "5px",*/
		})

		/*var left_border_colour = "#A12529"
		if (this.model.techTracks[0][7][0] === GREEN) left_border_colour = "#456334"
		else if (this.model.techTracks[0][7][0] === PURPLE) left_border_colour = "#51365F"
		else if (this.model.techTracks[0][7][0] === BLUE) left_border_colour = "#3474A9"
		else if (this.model.techTracks[0][7][0] === YELLOW) left_border_colour = "#C28727"
		var bottom_border_colour = "#A12529"
		if (this.model.techTracks[1][7][0] === GREEN) bottom_border_colour = "#456334"
		else if (this.model.techTracks[1][7][0] === PURPLE) bottom_border_colour = "#51365F"
		else if (this.model.techTracks[1][7][0] === BLUE) bottom_border_colour = "#3474A9"
		else if (this.model.techTracks[1][7][0] === YELLOW) bottom_border_colour = "#C28727"*/

		var leftSideDiv = $("<div></div>")
		leftSideDiv.css({
			position: "relative",
			top: "0px",
			width: "140px",
			height: "600px",
			//"background-color": "red",
			display: "inline-block",
			"margin-top": "0px",
			"vertical-align": "top",
		})

		// Vertical TT
		var verticalTTdiv = $("<div></div>")
		var verticalTTimg = this.getImage("ttImg" + String(this.model.techTracks[0][7][0]), true)
		verticalTTimg.css({
			position: "absolute",
			top: "55px",
			left: "0px",
			width: "120px",
			height: "490px",
			margin: "0px",
			padding: "0px",
			//"background-color": "red",
		})
		verticalTTimg.addClass("trackImg")
		verticalTTdiv.append(verticalTTimg)
		var specAxis = $("<div></div>")
		specAxis.attr("id", "verticalSpecAxis")
		// add spec divs
		var YspecAxis = [this.model.techTracks[0][7][1], this.model.techTracks[0][7][1] + 1, this.model.techTracks[0][7][1] + 2, this.model.techTracks[0][7][1] + 3]
		for (i = 0; i < 4; i++) {
			var spcDiv = $("<div></div>")
			top = 150 * i
			spcDiv.css({
				position: "absolute",
				left: "0px",
				top: String(top) + "px",
				width: "14px",
				"margin-left": "2px",
				height: "140px",
				"line-height": "140px",
				"font-weight": "bolder",
				"margin-top": "5px",
				"margin-bottom": "5px",
				border: "1px solid black",
			})
			spcDiv.append(String(YspecAxis[3 - i]))
			specAxis.append(spcDiv)
		}
		verticalTTdiv.append(specAxis)
		// Add min spec sticks
		minSpec = this.model.techTracks[0][7][1]
		minSpecStickDiv = $("<div></div>")
		top = 132 + minSpec * 66
		minSpecStickDiv.css({
			position: "absolute",
			left: "24px",
			top: String(top) + "px",
			width: "90px",
			height: "10px",
			"margin-left": "2px",
			"background-color": "white",
			border: "1px solid black",
		})

		verticalTTdiv.append(minSpecStickDiv)

		// now add in player pieces
		for (i = 0; i < this.model.techTracks[0].length - 1; i++) {
			// ALWAYS add the div to supply tool tips
			// create a div to hold the pieces
			pieceDiv = $("<div></div>")
			pieceDiv.addClass("pieceDiv")
			top = 73 + 66 * i
			pieceDiv.css({
				// Start at left 73. Shift 66
				position: "absolute",
				left: "28px",
				top: String(top) + "px",
				width: "90px",
				height: "59px",
			})
			pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[0][7][0], i))
			verticalTTdiv.append(pieceDiv)
			for (j = 0; j < this.model.techTracks[0][i].length; j++) {
				pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[0][i][j])))
				pieceImg.addClass("piece")
				pieceImg.attr("id", "TT0" + String(i) + String(this.model.techTracks[0][i][j]))
				pieceWidth = 29
				pieceHeight = 30
				// Fix the width at 29; adjust height for oval
				if (getCorrectedColour(this.model.techTracks[0][i][j]) === BLUE) pieceHeight = 21
				pieceImg.css({
					width: String(pieceWidth) + "px",
					height: String(pieceHeight) + "px",
					filter: `drop-shadow(2px 0 0 white) 
							drop-shadow(0 2px 0 white)
							drop-shadow(-2px 0 0 white) 
							drop-shadow(0 -2px 0 white)`,
				})
				pieceDiv.append(pieceImg)
			}
			//} END if piece in array pos
		} // end adding player pieces to veritcal TT
		leftSideDiv.append(verticalTTdiv)

		wholeMarketAreaSummaryDiv.append(leftSideDiv)

		var marketBoardDiv = this.getMarketBoardDiv(600)
		marketBoardDiv.css({
			"margin-top": "0px",
			"vertical-align": "top",
		})

		wholeMarketAreaSummaryDiv.append(marketBoardDiv)

		// RIGHT SIDE
		var allRightInfos = $("<div></div>")
		allRightInfos.css({
			/*position: "absolute",
			top: "0px",
			left: "740px",
			width: "490px",
			height: "740px",*/

			position: "relative",
			top: "0px",
			left: "px",
			width: "490px",
			height: "fit-content",
			display: "inline-block",
			//"background-color": "white",
		})

		//min spec
		var minSpecDiv = $("<div></div>")
		minSpecDiv.css({
			position: "absolute",
			top: "0px",
			left: "0px",
			width: "490px",
			height: "152px",
		})
		allRightInfos.append(minSpecDiv)
		var minSpecImg = this.getImage("minSpecs", false)
		minSpecImg.css({
			width: "320px",
			height: "142px",
			border: "2px solid black",
		})
		minSpecDiv.append(minSpecImg)

		var minSpecs = Rules.getMinSpecsInOrder()
		for (i = 0; i < minSpecs.length; i++) {
			if (minSpecs[i] > 0) {
				// Add min spec sticks
				var minSpecTokenkDiv = $("<div></div>")
				var leftShift = 0
				var text
				if (i === RED) {
					leftShift = 0
					col = "#A12529"
					text = "Speed"
					textCol = "white"
				}
				if (i === PURPLE) {
					leftShift = 1
					col = "#51365F"
					text = "Design"
					textCol = "white"
				}
				if (i === BLUE) {
					leftShift = 2
					col = "#3474A9"
					text = "Reliability"
					textCol = "white"
				}
				if (i === YELLOW) {
					leftShift = 3
					col = "#C28727"
					text = "Safety"
					textCol = "white"
				}
				if (i === GREEN) {
					leftShift = 4
					col = "#456334"
					text = "Range"
					textCol = "white"
				}

				left = 99 + leftShift * 58
				minSpecTokenkDiv.css({
					position: "absolute",
					left: String(left) + "px",
					top: "90px",
					width: "50px",
					height: "45px",
					"font-size": "43px",
					"background-color": col,
					border: "1px solid black",
					color: textCol,
				})
				minSpecTokenkDiv.append(String(minSpecs[i]))

				minSpecDiv.append(minSpecTokenkDiv)
			}
		}

		var showPiecesDiv = $("<div></div>")
		showPiecesDiv.css({
			position: "absolute",
			left: "5px",
			top: "5px",
			width: "60px",
			height: "60px",
			"margin-left": "2px",
		})
		var showPiecesButton = $("<button id='showPiecesButton'>" + gettext("Hide Pieces") + "</button>")
		showPiecesButton.addClass("actionsLineButton")
		showPiecesButton.css({
			"font-weight": "bolder",
			"font-size": "17px",
			width: "68px",
			height: "60px",
			"margin-left": "0px",
		})
		showPiecesDiv.append(showPiecesButton)

		showPiecesButton.off()
		showPiecesButton.on("click", function () {
			if ($(".piece").is(":visible")) {
				$(".piece").fadeOut()
			} else {
				$(".piece").fadeIn()
			}
			if (showPiecesButton.text() == gettext("Hide Pieces")) showPiecesButton.text(gettext("Show Pieces"))
			else showPiecesButton.text(gettext("Hide Pieces"))
		})

		minSpecDiv.append(showPiecesDiv)

		// assem capac
		var assemCapacDiv = $("<div></div>")
		assemCapacDiv.css({
			position: "absolute",
			top: "152px",
			left: "0px",
			width: "490px",
			height: "228px",
		})
		allRightInfos.append(assemCapacDiv)
		var assemCapacImg = this.getImage("assemCapac", false)
		assemCapacImg.addClass("trackImg")
		assemCapacImg.css({
			width: "380px",
			height: "218px",
			border: "2px solid black",
		})
		assemCapacDiv.append(assemCapacImg)
		// now add in player pieces
		for (i = 0; i < this.model.assemblyCapacityTrack.length; i++) {
			if (this.model.assemblyCapacityTrack[i].length > 0 || 1 == 1) {
				// create a div to hold the pieces
				pieceDiv = $("<div></div>")
				pieceDiv.addClass("pieceDiv")
				left = 55 + 76 * i
				pieceDiv.css({
					// Start at left 73. Shift 66
					position: "absolute",
					top: "125px",
					left: String(left) + "px",
					width: "75px",
					height: "83px",
				})
				assemCapacDiv.append(pieceDiv)
				for (j = 0; j < this.model.assemblyCapacityTrack[i].length; j++) {
					pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.assemblyCapacityTrack[i][j])))
					pieceImg.addClass("piece")
					pieceImg.attr("id", "ACT" + String(i) + String(this.model.assemblyCapacityTrack[i][j]))
					pieceWidth = 29
					pieceHeight = 30
					// Fix the width at 29; adjust height for oval
					if (getCorrectedColour(this.model.assemblyCapacityTrack[i][j]) === BLUE) pieceHeight = 21
					pieceImg.css({
						width: String(pieceWidth) + "px",
						height: String(pieceHeight) + "px",
						filter: `drop-shadow(2px 0 0 white) 
										drop-shadow(0 2px 0 white)
										drop-shadow(-2px 0 0 white) 
										drop-shadow(0 -2px 0 white)`,
					})
					pieceDiv.append(pieceImg)
				}
			}
		}

		// 360 for 3 x TT
		for (i = 2; i < this.model.techTracks.length; i++) {
			var divTop = 380 + 120 * (i - 2)
			var ttDiv = $("<div></div>")
			ttDiv.css({
				position: "absolute",
				top: String(divTop) + "px",
				left: "0px",
				width: "490px",
				height: "120px",
			})
			allRightInfos.append(ttDiv)
			var ttImg = this.getImage("ttImg" + String(this.model.techTracks[i][7][0]), false)
			ttImg.addClass("trackImg")
			ttImg.css({
				width: "490px",
				height: "120px",
			})
			ttDiv.append(ttImg)

			// Add min spec sticks
			minSpec = this.model.techTracks[i][7][1]
			minSpecStickDiv = $("<div></div>")
			left = 76 + minSpec * 66
			minSpecStickDiv.css({
				position: "absolute",
				left: String(left) + "px",
				top: "4px",
				width: "10px",
				height: "90px",
				"background-color": "white",
				border: "1px solid black",
			})

			ttDiv.append(minSpecStickDiv)

			// now add in player pieces
			for (j = 0; j < this.model.techTracks[1].length - 1; j++) {
				// create a div to hold the pieces
				pieceDiv = $("<div></div>")
				pieceDiv.addClass("pieceDiv")
				pieceLeft = 18 + 66 * j
				pieceDiv.css({
					// Start at left 73. Shift 66
					position: "absolute",
					top: "12px",
					left: String(pieceLeft) + "px",
					width: "56px",
					height: "85px",
				})
				pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[i][7][0], j))
				ttDiv.append(pieceDiv)
				for (k = 0; k < this.model.techTracks[i][j].length; k++) {
					pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[i][j][k])))
					pieceImg.addClass("piece")
					pieceImg.attr("id", "TT" + String(i) + String(j) + String(this.model.techTracks[i][j][k]))
					pieceWidth = 28
					pieceHeight = 29
					// Fix the width at 28 for off board TTs; adjust height for oval
					if (getCorrectedColour(this.model.techTracks[i][j][k]) === BLUE) pieceHeight = 21
					pieceImg.css({
						width: String(pieceWidth) + "px",
						height: String(pieceHeight) + "px",
						filter: `drop-shadow(2px 0 0 white) 
										drop-shadow(0 2px 0 white)
										drop-shadow(-2px 0 0 white) 
										drop-shadow(0 -2px 0 white)`,
					})
					pieceDiv.append(pieceImg)
				}
			}
		}

		wholeMarketAreaSummaryDiv.append(allRightInfos)

		// Now the abs divs
		// Obs marker
		var obsMarkerDiv = $("<div></div>")
		obsMarkerDiv.css({
			position: "absolute",
			top: "600px",
			left: "0px",
			width: "140px",
			height: "140px",
		})
		//$("#wholeMarketBoardDiv").append(obsMarkerDiv)
		var obsMarkerImg = this.getImage("obsMarker", false)
		if (this.model.obsolescenceMarkerDirection === 0) obsMarkerImg.addClass("r3")
		obsMarkerImg.css({
			width: "140px",
			height: "140px",
		})
		obsMarkerDiv.append(obsMarkerImg)

		wholeMarketAreaSummaryDiv.append(obsMarkerDiv)

		// Horiz TT
		// Horizontal TT
		var horizontalTTdiv = $("<div></div>")
		horizontalTTdiv.css({
			position: "absolute",
			top: "600px",
			left: "140px",
			height: "140px",
			width: "600px",
			display: "flex",
			"justify-content": "left",
		})
		specAxis = $("<div></div>")
		specAxis.attr("id", "horizontalSpecAxis")

		// add spec divs
		var XspecAxis = [this.model.techTracks[1][7][1], this.model.techTracks[1][7][1] + 1, this.model.techTracks[1][7][1] + 2, this.model.techTracks[1][7][1] + 3]
		for (i = 0; i < 4; i++) {
			var specDiv = $("<div></div>")
			left = 150 * i
			specDiv.css({
				position: "absolute",
				left: String(left) + "px",
				top: "0px",
				height: "14px",
				"margin-top": "2px",
				width: "140px",
				"font-weight": "bolder",
				"font-size": "13px",
				"margin-left": "5px",
				"margin-right": "5px",
				border: "1px solid black",
			})
			specDiv.append(String(XspecAxis[i]))
			specAxis.append(specDiv)
		}

		horizontalTTdiv.append(specAxis)
		var horizontalTTImg = this.getImage("ttImg" + String(this.model.techTracks[1][7][0]), false)
		horizontalTTImg.addClass("trackImg")
		horizontalTTImg.attr("id", "horizontalTTImg")
		horizontalTTImg.css({
			position: "relative",
			top: "20px",
			left: "55px",
			width: "490px",
			height: "120px",
		})
		horizontalTTdiv.append(horizontalTTImg)

		// Add min spec sticks
		minSpec = this.model.techTracks[1][7][1]
		minSpecStickDiv = $("<div></div>")
		left = 131 + minSpec * 66
		minSpecStickDiv.css({
			position: "absolute",
			left: String(left) + "px",
			top: "24px",
			width: "10px",
			height: "90px",
			"background-color": "white",
			border: "1px solid black",
		})

		horizontalTTdiv.append(minSpecStickDiv)

		// now add in player pieces
		for (i = 0; i < this.model.techTracks[1].length - 1; i++) {
			// create a div to hold the pieces
			pieceDiv = $("<div></div>")
			pieceDiv.addClass("pieceDiv")
			left = 73 + 66 * i
			pieceDiv.css({
				// Start at left 73. Shift 66
				position: "absolute",
				top: "28px",
				left: String(left) + "px",
				width: "59px",
				height: "85px",
			})
			pieceDiv.attr("title", getTechTrackSectionHoverInfo(this.model.techTracks[1][7][0], i))
			horizontalTTdiv.append(pieceDiv)
			for (j = 0; j < this.model.techTracks[1][i].length; j++) {
				pieceImg = this.getImage("piece" + String(getCorrectedColour(this.model.techTracks[1][i][j])))
				pieceImg.addClass("piece")
				pieceImg.attr("id", "TT1" + String(i) + String(this.model.techTracks[1][i][j]))
				pieceWidth = 29
				pieceHeight = 30
				// Fix the width at 29; adjust height for oval
				if (getCorrectedColour(this.model.techTracks[1][i][j]) === BLUE) pieceHeight = 21
				pieceImg.css({
					width: String(pieceWidth) + "px",
					height: String(pieceHeight) + "px",
					filter: `drop-shadow(2px 0 0 white) 
									drop-shadow(0 2px 0 white)
									drop-shadow(-2px 0 0 white) 
									drop-shadow(0 -2px 0 white)`,
				})
				pieceDiv.append(pieceImg)
			}
		}

		wholeMarketAreaSummaryDiv.append(horizontalTTdiv)

		// Add to bottom of fac
		$("#wholeFactoryDiv").append(wholeMarketAreaSummaryDiv)
	}

	this.justRenderJustFactory = function (player) {
		// START FAC CODE
		var factory = player.factory
		var i = 0
		//$("#factoryFloorDiv").empty()
		var factoryFloorDiv = $('<div class="" >')

		factoryFloorDiv.css({
			height: String(this.smallSqPxWidth * factory.height) + "px",
			width: String(this.smallSqPxWidth * factory.width) + "px",
		})
		// ************************************************************************************************** Main factory
		var img = $("<img>")
		img.attr("src", imagePreURL + "/f_main.jpg")
		if (factory.mainFactoryFlipped === 0) img.addClass("factoryFllor").addClass("r" + factory.mainFactoryRotation)
		else img.addClass("factoryFllor").addClass("r" + String(factory.mainFactoryRotation) + "M")
		var mainFactoryCoords = factory.getCoordsForIndex(factory.mainFactoryIndex)
		img.css({
			height: String(this.smallSqPxWidth * 12) + "px",
			width: String(this.smallSqPxWidth * 12) + "px",
			position: "absolute",
			left: String(mainFactoryCoords[0] * this.smallSqPxWidth) + "px",
			top: String(mainFactoryCoords[1] * this.smallSqPxWidth) + "px",
		})
		factoryFloorDiv.append(img)

		// Render Expansions ******************************************************************************** EXPANSIONS
		for (i = 0; i < factory.factoryExpansions.length; i++) {
			// Expansion
			img = $("<img>")
			img.attr("src", imagePreURL + "/f_expansion.jpg")
			img.addClass("factoryFloor")
			if (factory.factoryExpansions[i][2] === 0) img.addClass("r" + String(factory.factoryExpansions[i][1]))
			else img.addClass("r" + String(factory.factoryExpansions[i][1]) + "M")

			// Render newly added expansion
			var shiftForHighlight = 0
			if (factory.factoryExpansions[i][0] === factory.factoryExpansionIndexAddedThisTurn && (Rules.canPlay() || M.sandboxMode)) {
				shiftForHighlight = 1

				img.css({
					border: String(this.newlyPlacedComponentBorderSize) + "px solid green",
				})
			} // END This turn fac expansion

			var expansionCoords = factory.getCoordsForIndex(factory.factoryExpansions[i][0])
			rotOffset = 0
			if (factory.factoryExpansions[i][1] % 2 == 1) rotOffset = 1
			img.css({
				height: String(this.smallSqPxWidth * 8 - 2 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				width: String(this.smallSqPxWidth * 6 - 2 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				position: "absolute",
				left: String((expansionCoords[0] + rotOffset) * this.smallSqPxWidth - 0 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
				top: String((expansionCoords[1] - rotOffset) * this.smallSqPxWidth - 0 * this.newlyPlacedComponentBorderSize * shiftForHighlight) + "px",
			})
			factoryFloorDiv.append(img)
		} // END EXPANSION DISPLAY

		// Render components ************************************************************************************************** COMPONENTS

		var componentValidationDiv = $("#componentValidationDiv")
		componentValidationDiv.html()
		componentValidationDiv.empty()
		componentValidationDiv.css({
			visibility: "visible",
		})
		//var invalidCount = 0
		for (i = 0; i < factory.factoryComponents.length; i++) {
			var component = factory.factoryComponents[i][0]
			index = factory.factoryComponents[i][1]
			rotation = factory.factoryComponents[i][2]
			var flipped = factory.factoryComponents[i][3]
			var componentImg = this.getComponentImage(component)
			if (flipped === 0) componentImg.addClass("factoryComponent").addClass("r" + String(rotation))
			else componentImg.addClass("factoryComponent").addClass("r" + String(rotation) + "M")
			componentImg.attr("id", "factoryComponent" + String(rotation) + String(index))
			Cwidth = DIMENSIONS[component][0] * this.smallSqPxWidth
			Cheight = DIMENSIONS[component][1] * this.smallSqPxWidth

			// Render newly added components
			shiftForHighlight = 0
			var previousTurnComponent = true
			// Need to check names, as otherwise it was possible to move previous people's factories aroundy
			/*if ((global.pov != undefined && factory.factoryComponenetIndexesAddedThisTurn.includes(index) && player.name === M.players[global.pov].name && (Rules.canPlay() || M.sandboxMode)) || (M.trainingGame && factory.factoryComponenetIndexesAddedThisTurn.includes(index) && Rules.canPlay())) {
				shiftForHighlight = 1
				previousTurnComponent = false
				var validation = factory.validateSingleComponent(factory.factoryComponents[i])
				if (validation[0]) {
					componentImg.addClass("valid")
					componentImg.css({
						border: String(this.newlyPlacedComponentBorderSize) + "px solid green",
					})
				} else {
					componentImg.css({
						border: String(this.newlyPlacedComponentBorderSize) + "px solid red",
					})
				}

			} // END This turn fac components*/
			Cwidth = DIMENSIONS[component][0]
			Cheight = DIMENSIONS[component][1]

			rotOffset = 0
			if (rotation % 2 == 1) rotOffset = 1
			rotOffset = (rotOffset * (Cwidth - Cheight)) / 2

			Cleft = factory.getCoordsForIndex(index)[0] - rotOffset
			Ctop = factory.getCoordsForIndex(index)[1] + rotOffset

			var borderShift = this.previouslyPlacedComponentBorderSize
			if (!previousTurnComponent) borderShift = this.newlyPlacedComponentBorderSize

			componentImg.css({
				height: String(Cheight * this.smallSqPxWidth - 2 * borderShift) + "px",
				width: String(Cwidth * this.smallSqPxWidth - 2 * borderShift) + "px",
				position: "absolute",
				left: String(Cleft * this.smallSqPxWidth - 0 * shiftForHighlight) + "px",
				top: String(Ctop * this.smallSqPxWidth - 0 * shiftForHighlight) + "px",
			})
			if (previousTurnComponent) componentImg.css({ border: "1px solid black" })

			factoryFloorDiv.append(componentImg)
		} // END faactory componennts

		return factoryFloorDiv
	}

	this.displayEligibleFactoryTiles = function (player, eligibleFactoryTiles) {
		var mainlinesDiv = $("<div></div>")
		var AlinesDiv = $("<div></div>")
		var BlinesDiv = $("<div></div>")
		var ClinesDiv = $("<div></div>")
		var DlinesDiv = $("<div></div>")
		var departmentsDiv = $("<div></div>")
		var playerComponentsDiv = $("<div></div>")

		mainlinesDiv.addClass("componentsBin")
		AlinesDiv.addClass("componentsBin")
		BlinesDiv.addClass("componentsBin")
		ClinesDiv.addClass("componentsBin")
		DlinesDiv.addClass("componentsBin")
		departmentsDiv.addClass("componentsBin")
		playerComponentsDiv.addClass("componentsBin")

		var eligibleComponentsDiv = $("#eligibleComponentsDiv")
		eligibleComponentsDiv.empty()

		var allowedTechLevels = Rules.getAllowedTechLevels(true)
		var nativelyAllowedTechLevels = Rules.getNativelyAllowedTechLevels(global.pov, true)
		// Now we have allowed, natively allowed, in colour order

		for (var i = 0; i < eligibleFactoryTiles.length; i++) {
			var newComponentIndividualDiv = $("<div/>")
			newComponentIndividualDiv.css({
				position: "relative",
			})
			var newComponentImg = this.getComponentImage(eligibleFactoryTiles[i])
			newComponentImg.attr("id", "newComponentImg" + String(eligibleFactoryTiles[i]))

			// CHANGE THE BORDER DEPENDING ON ELIGIBILIGY. OUTLINE TO BLACK
			var borderColour = Rules.getCorrectBorderColour(eligibleFactoryTiles[i], allowedTechLevels, nativelyAllowedTechLevels)

			newComponentImg.css({
				margin: "4px",
				border: "2px solid " + borderColour,
				outline: "1px solid black",
			})
			// Check if it isn't available
			if (M.availableComponents[eligibleFactoryTiles[i]] <= 0) {
				newComponentImg.css({
					opacity: "0.5",
				})
			}
			newComponentIndividualDiv.append(newComponentImg)

			var newComponentIndividualAmountDiv = $("<div/>")
			newComponentIndividualAmountDiv.html(String(M.availableComponents[eligibleFactoryTiles[i]]))
			var top = 5
			var left = 5
			if (eligibleFactoryTiles[i] === BUMPER) left = 45
			if (ARROWS.includes(eligibleFactoryTiles[i])) top = 35
			if (ARROWS.includes(eligibleFactoryTiles[i])) newComponentIndividualAmountDiv.css({ visibility: "hidden" })

			newComponentIndividualAmountDiv.css({
				position: "absolute",
				top: String(top) + "px",
				left: String(left) + "px",
				color: "white",
				"background-color": "black",
				"font-size": "15px",
				"z-index": "50",
				padding: "2px",
			})
			if (M.availableComponents[eligibleFactoryTiles[i]] <= 0) newComponentIndividualAmountDiv.css({ color: "white", "background-color": "red", "font-weight": "bolder" })
			newComponentIndividualDiv.append(newComponentIndividualAmountDiv)

			if (MAINLINES.includes(eligibleFactoryTiles[i])) mainlinesDiv.append(newComponentIndividualDiv)
			if (A_TECHS.includes(eligibleFactoryTiles[i]) || A_ARROWS.includes(eligibleFactoryTiles[i])) AlinesDiv.append(newComponentIndividualDiv)
			if (B_TECHS.includes(eligibleFactoryTiles[i]) || B_ARROWS.includes(eligibleFactoryTiles[i])) BlinesDiv.append(newComponentIndividualDiv)
			if (C_TECHS.includes(eligibleFactoryTiles[i]) || C_ARROWS.includes(eligibleFactoryTiles[i])) ClinesDiv.append(newComponentIndividualDiv)
			if (D_TECHS.includes(eligibleFactoryTiles[i]) || D_ARROWS.includes(eligibleFactoryTiles[i])) DlinesDiv.append(newComponentIndividualDiv)
			if (eligibleFactoryTiles[i] === DEPARTMENT_RESEARCH || eligibleFactoryTiles[i] === DEPARTMENT_PLANNING) departmentsDiv.append(newComponentIndividualDiv)
			if (DEALERSHIPS.includes(eligibleFactoryTiles[i]) || DEPARTMENTS_MARKETING.includes(eligibleFactoryTiles[i])) playerComponentsDiv.append(newComponentIndividualDiv)

			if (M.availableComponents[eligibleFactoryTiles[i]] > 0) {
				newComponentImg.on("mouseover", function (e) {
					$(this).css({
						outline: "1px solid yellow",
					})
				})
				newComponentImg.on("mouseout", function (e) {
					$(this).css({
						outline: "1px solid black",
					})
				})

				// PICK UP NEW TILE
				newComponentImg.on("click", function (e) {
					$(".ghostComponentImg").remove()
					$("#nudgeDiv").remove()

					player.factory.componentBeingAdded = parseInt(this.id.slice(15))
					player.factory.componentBeingAddedRotation = 0
					player.factory.componentBeingAddedFlipped = 0
					V.showComponentBeingAdded(player.factory, parseInt(this.id.slice(15)))
					V.updateQSPdiv(player)
					$(".selectable").remove()
					V.externalDrawSquares(player, player.factory.getEmptyFactorySpaces(), "yellow", "selectable")
					$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryComponent)
					$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.componentMouseOnHighlight)
					$("#newComponentAndQSPdiv").on("mouseover", function (e) {
						$(".ghostComponentImg").remove()
					})
				})
			}
		} // END Eligible Factory Tiles loop

		// Add the titles to each Div
		var name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("MAINLINES"))
		mainlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("A LINES"))
		AlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("B LINES"))
		BlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("C LINES"))
		ClinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("D LINES"))
		DlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("DEPARTMENTS"))
		departmentsDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("DEALERSHIPS"))
		playerComponentsDiv.append(name)

		if (eligibleFactoryTiles.some((r) => MAINLINES.includes(r))) eligibleComponentsDiv.append(mainlinesDiv)
		if (eligibleFactoryTiles.some((r) => A_TECHS.includes(r))) eligibleComponentsDiv.append(AlinesDiv)
		if (eligibleFactoryTiles.some((r) => B_TECHS.includes(r))) eligibleComponentsDiv.append(BlinesDiv)
		if (eligibleFactoryTiles.some((r) => C_TECHS.includes(r))) eligibleComponentsDiv.append(ClinesDiv)
		if (eligibleFactoryTiles.some((r) => D_TECHS.includes(r))) eligibleComponentsDiv.append(DlinesDiv)
		if (eligibleFactoryTiles.some((r) => r === DEPARTMENT_RESEARCH || r === DEPARTMENT_PLANNING)) eligibleComponentsDiv.append(departmentsDiv)
		if (eligibleFactoryTiles.some((r) => DEALERSHIPS.includes(r) || DEPARTMENTS_MARKETING.includes(r))) eligibleComponentsDiv.append(playerComponentsDiv)
	}

	this.displayAllDealershipsWithStock = function () {
		var stock
		var dshipDiv
		var j = 0
		var i = 0

		var dealershipsDiv = $("<div></div>")
		dealershipsDiv.attr("id", "allDealershipsWithStockDiv")
		dealershipsDiv.css({
			position: "relative",
			display: "flex",
			"flex-wrap": "wrap",
			"justify-content": "center",
			width: "fit-content",
			height: "fit-content",
			padding: "3px",
			margin: "0 auto",
		})

		for (j = 0; j < this.model.gameFlow.unalteredTurnOrder.length; j++) {
			for (i = 0; i < this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.factoryComponents.length; i++) {
				if (DEALERSHIPS.includes(this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.factoryComponents[i][0])) {
					stock = this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.getStockForDealership(this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.factoryComponents[i])
					dshipDiv = V.getDealershipSellingDiv(this.model.players[this.model.gameFlow.unalteredTurnOrder[j]].factory.factoryComponents[i], stock, false, this.model.gameFlow.unalteredTurnOrder[j])
					dealershipsDiv.append(dshipDiv)
				}
			}
		}

		if (dealershipsDiv.children().length === 0) {
			dealershipsDiv.append("(No Valid Dealerships)<br/><br/>")
		}

		return dealershipsDiv
	}

	this.nicheMouseOnHighlight = function (e) {
		var index = $(e.currentTarget).data("index")
		V.ghostMWimageOnHighlight(index, e.data.dealership, e.data.MWsize)
	}

	this.ghostMWimageOnHighlight = function (index, dealership, MWsize) {
		var rotation = this.model.MWrotation
		$(".ghostMWImg").remove()
		if (MWsize === 0) str = MW_SMALL
		if (MWsize === 0 && rotation % 2 == 1) str = MW_SMALL_R

		if (MWsize === 1) str = MW_MEDIUM
		if (MWsize === 2) str = MW_LARGE

		var col = "black"
		if (RED_DEALERSHIPS.includes(dealership[0])) col = RED
		if (GREEN_DEALERSHIPS.includes(dealership[0])) col = GREEN
		if (PURPLE_DEALERSHIPS.includes(dealership[0])) col = PURPLE
		if (BLUE_DEALERSHIPS.includes(dealership[0])) col = BLUE
		if (YELLOW_DEALERSHIPS.includes(dealership[0])) col = YELLOW
		col = getCorrectedColour(col)
		if (col === RED) col = "#E83435"
		if (col === GREEN) col = "#70C96B"
		if (col === PURPLE) col = "#8E63B3"
		if (col === BLUE) col = " #435EB5"
		if (col === YELLOW) col = "#EECD30"

		var ghostMWImg = $(str.replace(/COLOUR/, col))

		var MWwidth = 3
		var MWheight = 3
		if (MWsize == 1) {
			MWwidth = 2
			MWheight = 2
		}
		if (MWsize == 0 && rotation % 2 == 0) {
			MWwidth = 1
			MWheight = 2
		}
		if (MWsize == 0 && rotation % 2 == 1) {
			MWwidth = 2
			MWheight = 1
		}

		var Xcoord = this.model.getMBcoordsForIndex(index)[0]
		var Ycoord = this.model.getMBcoordsForIndex(index)[1]

		// Shift for rotation first
		// Now shift for rotation
		var divXcoord = 0
		var divYcoord = 0
		if (rotation == 1) {
			// top is good, but left needs to move back
			divXcoord = divXcoord - (this.nicheSqPxWidth + 5) * (MWwidth - 1)
		}
		if (rotation == 2) {
			// need to shift left and up
			divXcoord = divXcoord - (this.nicheSqPxWidth + 5) * (MWwidth - 1)
			divYcoord = divYcoord - (this.nicheSqPxWidth + 5) * (MWheight - 1)
		}
		if (rotation == 3) {
			// left is good, but top needs to move o[]
			divYcoord = divYcoord - (this.nicheSqPxWidth + 5) * (MWheight - 1)
		}

		divXcoord += 9 + 71.5 * Xcoord
		divYcoord += 9 + 71.5 * Ycoord

		if (Xcoord >= 2) divXcoord += 4.5
		if (Xcoord >= 4) divXcoord += 7
		if (Xcoord >= 6) divXcoord += 4.5

		if (Ycoord >= 2) divYcoord += 4.5
		if (Ycoord >= 4) divYcoord += 7
		if (Ycoord >= 6) divYcoord += 4.5

		// Now shift for outer px
		divXcoord -= 5
		divYcoord -= 5

		ghostMWImg.attr("class", "ghostMWImg r")
		ghostMWImg.attr("id", "ghostMWImg")

		ghostMWImg.css({
			position: "absolute",
			left: String(divXcoord) + "px",
			top: String(divYcoord) + "px",
			"z-index": "5",
		})

		ghostMWImg.on("contextmenu", function (e) {
			e.originalEvent.preventDefault()
			e.preventDefault()
		})

		$("#marketBoarddiv").append(ghostMWImg)
	}

	this.tryToPlaceMarketWindow = function (e) {
		var index = $(e.currentTarget).data("index")
		var indexCoords = M.getMBcoordsForIndex(index)
		var MWsize = e.data.MWsize
		var dealership = e.data.dealership

		// find the affected Indexes
		var coveredIndexes = M.getCoveredIndexesOfMarketWindow(index, M.MWrotation, MWsize)

		// Now check they are all eligible
		var eligibleNiches = M.getNichesEligibilityForDealership(dealership)[0]
		for (var i = 0; i < coveredIndexes.length; i++) {
			if (!eligibleNiches.includes(coveredIndexes[i])) {
				var left = indexCoords[0] * V.nicheSqPxWidth
				var top = (indexCoords[1] - 1) * V.nicheSqPxWidth
				var div = $("<div/>")
				div.attr("class", "noSpaceDiv")
				div.html(gettext("Niche Square exceeds Sepcs of Dealership"))
				div.css({
					"background-color": "white",
					"font-weight": "bolder",
					width: "100px",
					height: "102px",
					position: "absolute",
					left: String(left) + "px",
					top: String(top) + "px",
					"z-index": "100000",
				})
				$("#marketBoarddiv").append(div)

				setTimeout(function () {
					$(".noSpaceDiv").fadeOut()
				}, 1000)
				return
			}
		}

		$(".marketIneligible").remove()
		$(".marketSelectable").remove()
		// Now you have an eligible div, so place it into the model
		M.placeDealershipWindowIntoModel(index, dealership, MWsize)
		C.enableSellingForDealership(dealership, true)
	}

	this.componentMouseOnHighlight = function (e) {
		var index = $(e.currentTarget).data("index")
		V.ghostComponentImageOnHighlight(e.data.player, index)
	}

	this.arrowMouseOnHighlight = function (e) {
		var index = $(e.currentTarget).data("index")
		var player = e.data.player
		var rotation = $(e.currentTarget).data("rotation")
		player.factory.componentBeingAddedRotation = rotation
		V.ghostComponentImageOnHighlight(player, index)
	}

	this.ghostComponentImageOnHighlight = function (player, index) {
		// get the image to ghost
		$(".ghostComponentImg").remove()
		var ghostComponentImg = this.getComponentImage(player.factory.componentBeingAdded)
		var Cwidth = DIMENSIONS[player.factory.componentBeingAdded][0]
		var Cheight = DIMENSIONS[player.factory.componentBeingAdded][1]

		var rotOffset = 0
		if (player.factory.componentBeingAddedRotation % 2 == 1) rotOffset = 1
		rotOffset = (rotOffset * (Cwidth - Cheight)) / 2
		var Cleft = player.factory.getCoordsForIndex(index)[0] - rotOffset
		var Ctop = player.factory.getCoordsForIndex(index)[1] + rotOffset

		if (player.factory.componentBeingAddedFlipped === 0) ghostComponentImg.attr("class", "ghostComponentImg r" + String(player.factory.componentBeingAddedRotation))
		else ghostComponentImg.attr("class", "ghostComponentImg r" + String(player.factory.componentBeingAddedRotation) + "M")
		ghostComponentImg.attr("id", "ghostComponentImg")

		ghostComponentImg.css({
			height: String(Cheight * this.smallSqPxWidth) + "px",
			width: String(Cwidth * this.smallSqPxWidth) + "px",
			position: "absolute",
			left: String(Cleft * this.smallSqPxWidth) + "px",
			top: String(Ctop * this.smallSqPxWidth) + "px",
			opacity: "0.5",
		})

		ghostComponentImg.on("contextmenu", function (e) {
			e.originalEvent.preventDefault()
			e.preventDefault()
		})

		var factoryFloorDiv = $("#factoryFloorDiv")
		factoryFloorDiv.append(ghostComponentImg)
	}

	this.getSetupInitialFactoryFloorDiv = function () {
		var setupFactoryFloorDiv = $("<div></div>")
		setupFactoryFloorDiv.attr("id", "setupFactoryFloorDiv")
		setupFactoryFloorDiv.css({
			border: "1px solid black",
			margin: "0 auto",
			padding: "5px",
		})
		var buttonL = $("<img>")
		var buttonR = $("<img>")
		var buttonFlipH = $("<img>")
		var buttonFlipV = $("<img>")
		buttonL.attr("src", imagePreURL + "/rot_anticlockwise.svg")
		buttonR.attr("src", imagePreURL + "/rot_clockwise.svg")
		buttonFlipH.attr("src", imagePreURL + "/flip_h.svg")
		buttonFlipV.attr("src", imagePreURL + "/flip_h.svg")
		buttonL.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonR.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonFlipH.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonFlipV.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})

		$(setupFactoryFloorDiv).append(buttonL)
		$(setupFactoryFloorDiv).append(buttonR)
		$(setupFactoryFloorDiv).append("<BR/>")
		$(setupFactoryFloorDiv).append(buttonFlipH)
		$(setupFactoryFloorDiv).append(buttonFlipV)

		buttonFlipV.addClass("r1")

		setupFactoryFloorDiv.css({
			width: "200px",
			height: "115px",
		})
		buttonR.on("click", function () {
			C.currentPlayer().factory.mainFactoryRotation++
			if (C.currentPlayer().factory.mainFactoryRotation === 4) C.currentPlayer().factory.mainFactoryRotation = 0
			V.render()
		})
		buttonL.on("click", function () {
			C.currentPlayer().factory.mainFactoryRotation--
			if (C.currentPlayer().factory.mainFactoryRotation === -1) C.currentPlayer().factory.mainFactoryRotation = 3
			V.render()
		})
		buttonFlipH.on("click", function () {
			if (C.currentPlayer().factory.mainFactoryFlipped === 0) C.currentPlayer().factory.mainFactoryFlipped = 1
			else C.currentPlayer().factory.mainFactoryFlipped = 0
			if (C.currentPlayer().factory.mainFactoryRotation === 1) C.currentPlayer().factory.mainFactoryRotation = 3
			else if (C.currentPlayer().factory.mainFactoryRotation === 3) C.currentPlayer().factory.mainFactoryRotation = 1
			V.render()
		})
		buttonFlipV.on("click", function () {
			if (C.currentPlayer().factory.mainFactoryFlipped === 0) C.currentPlayer().factory.mainFactoryFlipped = 1
			else C.currentPlayer().factory.mainFactoryFlipped = 0
			if (C.currentPlayer().factory.mainFactoryRotation === 0) C.currentPlayer().factory.mainFactoryRotation = 2
			else if (C.currentPlayer().factory.mainFactoryRotation === 2) C.currentPlayer().factory.mainFactoryRotation = 0
			V.render()
		})

		V.addHighlightsOnMouseOverToElement(buttonR)
		V.addHighlightsOnMouseOverToElement(buttonL)
		V.addHighlightsOnMouseOverToElement(buttonFlipH)
		V.addHighlightsOnMouseOverToElement(buttonFlipV)
		return setupFactoryFloorDiv
	}

	this.showComponentBeingAdded = function (factory, component) {
		$("#newComponentDiv").remove()
		var newComponentDiv = $("<div></div>")
		newComponentDiv.attr("id", "newComponentDiv")

		var newComponentImg = this.getComponentImage(component)
		newComponentImg.attr("id", "newComponentImg")
		if (factory.componentBeingAddedFlipped === 0) newComponentImg.addClass("r" + String(factory.componentBeingAddedRotation % 4))
		else newComponentImg.addClass("r" + String(factory.componentBeingAddedRotation % 4) + "M")
		newComponentDiv.append(newComponentImg)
		if (DIMENSIONS[component][0] > DIMENSIONS[component][1]) {
			var extra = String(5 + ((DIMENSIONS[component][0] - DIMENSIONS[component][1]) * this.smallSqPxWidth) / 2)
			newComponentImg.css({ "padding-top": extra + "px" })
			newComponentImg.css({ "padding-bottom": extra + "px" })
		}
		// Shift Rotate buttons onto new line
		newComponentDiv.append("<BR/>")
		var buttonL = $("<img>")
		var buttonR = $("<img>")
		var buttonFlipH = $("<img>")
		var buttonFlipV = $("<img>")
		buttonL.attr("src", imagePreURL + "/rot_anticlockwise.svg")
		buttonR.attr("src", imagePreURL + "/rot_clockwise.svg")
		buttonFlipH.attr("src", imagePreURL + "/flip_h.svg")
		buttonFlipV.attr("src", imagePreURL + "/flip_h.svg")
		buttonL.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonR.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonFlipH.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		buttonFlipV.css({
			width: "50px",
			height: "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})

		newComponentDiv.append(buttonL)
		if (component !== FACTORY_EXPANSION_TILE) newComponentDiv.append("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")
		newComponentDiv.append(buttonR)

		var binImg = $("<img>")
		binImg.attr("src", imagePreURL + "/f_bin.png")
		binImg.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "15px",
		})
		if (component !== FACTORY_EXPANSION_TILE) newComponentDiv.append(binImg)
		if (MAINLINES.includes(component) || component === FACTORY_EXPANSION_TILE) {
			newComponentDiv.append(buttonFlipH)
			newComponentDiv.append(buttonFlipV)
			buttonFlipV.addClass("r1")
		}
		var ncdWidth = Math.max(newComponentImg.height(), newComponentImg.width(), 6 * this.smallSqPxWidth)
		var ncdheight = Math.max(newComponentImg.height() + 40, newComponentImg.width() + 40)
		// Make room for bin
		ncdheight += 75
		newComponentDiv.css({
			width: ncdWidth + "px",
			border: "1px solid black",
		})
		buttonR.on("click", function () {
			V.rotateComponentR(factory, false)
		})

		buttonL.on("click", function () {
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation))
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation) + "M")

			factory.componentBeingAddedRotation--
			if (factory.componentBeingAddedRotation === -1) factory.componentBeingAddedRotation = 3

			if (factory.componentBeingAddedFlipped === 0) $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation))
			else $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation) + "M")
		})
		buttonFlipH.on("click", function () {
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation))
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation) + "M")

			if (factory.componentBeingAddedFlipped === 0) factory.componentBeingAddedFlipped = 1
			else factory.componentBeingAddedFlipped = 0

			if (factory.componentBeingAddedRotation === 1) factory.componentBeingAddedRotation = 3
			else if (factory.componentBeingAddedRotation === 3) factory.componentBeingAddedRotation = 1

			if (factory.componentBeingAddedFlipped === 0) $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation))
			else $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation) + "M")
		})

		buttonFlipV.on("click", function () {
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation))
			$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation) + "M")

			if (factory.componentBeingAddedFlipped === 0) factory.componentBeingAddedFlipped = 1
			else factory.componentBeingAddedFlipped = 0

			if (factory.componentBeingAddedRotation === 0) factory.componentBeingAddedRotation = 2
			else if (factory.componentBeingAddedRotation === 2) factory.componentBeingAddedRotation = 0

			if (factory.componentBeingAddedFlipped === 0) $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation))
			else $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation) + "M")
		})

		if (component !== FACTORY_EXPANSION_TILE) V.addHighlightsOnMouseOverToElement(binImg)
		V.addHighlightsOnMouseOverToElement(buttonR)
		V.addHighlightsOnMouseOverToElement(buttonL)
		V.addHighlightsOnMouseOverToElement(buttonFlipH)
		V.addHighlightsOnMouseOverToElement(buttonFlipV)
		binImg.on("click", function () {
			factory.clearComponentBeingPlaced()
		})

		$("#newComponentAndQSPdiv").append(newComponentDiv)
	}

	this.rotateComponentR = function (factory, fromKeyPress) {
		$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation))
		$("#newComponentImg").removeClass("r" + String(factory.componentBeingAddedRotation) + "M")

		factory.componentBeingAddedRotation++
		if (factory.componentBeingAddedRotation === 4) factory.componentBeingAddedRotation = 0

		if (factory.componentBeingAddedFlipped === 0) $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation))
		else $("#newComponentImg").addClass("r" + String(factory.componentBeingAddedRotation) + "M")

		if (fromKeyPress) {
			// also update the ghost image
			var ghostComponentImg = $("#ghostComponentImg")
			var Cwidth = DIMENSIONS[factory.componentBeingAdded][0]
			var Cheight = DIMENSIONS[factory.componentBeingAdded][1]

			if (factory.componentBeingAddedFlipped === 0) ghostComponentImg.attr("class", "ghostComponentImg r" + String(factory.componentBeingAddedRotation))
			else ghostComponentImg.attr("class", "ghostComponentImg r" + String(factory.componentBeingAddedRotation) + "M")

			// now shift the left / top so it still aligns with the cursor
			if (Cwidth !== Cheight) {
				var shiftSquares = Cwidth - Cheight
				if (factory.componentBeingAddedRotation === 2) shiftSquares = -((Cwidth - Cheight) / 2)
				if (factory.componentBeingAddedRotation === 0) shiftSquares = -(Cwidth - Cheight) / 2
				var oldTop = ghostComponentImg.position().top
				var oldLeft = ghostComponentImg.position().left

				var newLeft = oldLeft - shiftSquares * this.smallSqPxWidth
				var newTop = oldTop + shiftSquares * this.smallSqPxWidth
				ghostComponentImg.css({
					position: "absolute",
					left: String(newLeft) + "px",
					top: String(newTop) + "px",
					opacity: "0.5",
				})
			}
		}
	}

	this.addHighlightsOnMouseOverToElement = function (element, thickness, checkForActive, checkForActiveCard) {
		if (thickness == undefined) thickness = 1
		element.on("mouseover", function (e) {
			$(this).css({
				border: "" + String(thickness) + "px solid yellow",
			})
		})
		element.on("mouseout", function (e) {
			var greenBorder = false
			if (checkForActive) {
				var arrayIndex = parseInt(this.id.slice(9))
				if (V.currentViewItem === arrayIndex) greenBorder = true
			}
			if (checkForActiveCard) {
				if (element.hasClass("activeCard")) greenBorder = true
			}
			if (!greenBorder) {
				$(this).css({
					border: "" + String(thickness) + "px solid black",
				})
			} else if (greenBorder) {
				$(this).css({
					border: "" + String(thickness) + "px solid lightgreen",
				})
			}
		})
	}

	this.externalDrawSquares = function (player, spaces, col, cssClass) {
		var w = this.smallSqPxWidth
		var str = SMALL_SQUARE
		_.each(
			spaces,
			function (space) {
				var coords = player.factory.getCoordsForIndex(space)
				var x = coords[0]
				var y = coords[1]
				x = x * w
				y = y * w
				var img = $(str.replace(/COLOR/, col))
				img.attr("class", cssClass).css({
					left: x + "px",
					top: y + "px",
					width: w - 1 + "px",
					height: w - 1 + "px",
					border: "1px transparent white",
				})
				img.attr("id", "index" + String(space))
				img.attr("data", "index" + String(space))
				img.data("index", space)
				$("#factoryFloorDiv").append(img)
			},
			this
		)
	}

	this.externalDrawSquaresQSP = function (player, spacesWithDirection, col, cssClass) {
		var w = this.smallSqPxWidth
		var str = SMALL_SQUARE
		_.each(
			spacesWithDirection,
			function (space) {
				var coords = player.factory.getCoordsForIndex(space[0])
				var x = coords[0]
				var y = coords[1]
				x = x * w
				y = y * w
				var img = $(str.replace(/COLOR/, col))
				img.attr("class", cssClass).css({
					left: x + "px",
					top: y + "px",
					width: w - 1 + "px",
					height: w - 1 + "px",
					border: "1px transparent white",
				})
				img.attr("id", "index" + String(space[0]))
				img.data("index", space[0])
				img.data("rotation", space[1])
				$("#factoryFloorDiv").append(img)
			},
			this
		)
	}

	this.drawMarketSquares = function (spaces, col, cssClass) {
		var str = MB_SMALL_SQUARE
		_.each(
			spaces,
			function (space) {
				var coords = M.getMBcoordsForIndex(space)
				var Xcoord = coords[0]
				var Ycoord = coords[1]

				var svgXcoord = 9 + 71.5 * Xcoord
				var svgYcoord = 9 + 71.5 * Ycoord

				if (Xcoord >= 2) svgXcoord += 4.5
				if (Xcoord >= 4) svgXcoord += 7
				if (Xcoord >= 6) svgXcoord += 4.5

				if (Ycoord >= 2) svgYcoord += 4.5
				if (Ycoord >= 4) svgYcoord += 7
				if (Ycoord >= 6) svgYcoord += 4.5

				//shift to allow for tech tracks
				svgXcoord += 140

				var img = $(str.replace(/COLOR/, col))
				img.attr("class", cssClass).css({
					left: String(svgXcoord) + "px",
					top: String(svgYcoord) + "px",
					border: "1px transparent white",
				})
				img.attr("id", "index" + String(space))
				img.attr("data", "index" + String(space))
				img.data("index", space)
				$("#wholeMarketBoardDiv").append(img)
			},
			this
		)
	}

	this.getAvailableCardsDiv = function (colour, cards, reserve) {
		var div = $("<div></div>")
		for (var i = 0; i < cards.length; i++) {
			let cardNumber = cards[i]
			let cardID = getCardIDcorrectedFromColourAndNumber(colour, cardNumber, false)
			let CardIDcorrected = getCardIDcorrectedFromColourAndNumber(colour, cardNumber, true)

			var img = getCorrectedCardImage(CardIDcorrected, false)
			img.addClass("availableCardsImg")
			if (reserve) {
				img.css({
					width: "50px",
					height: "75px",
					border: "3px solid black",
					"margin-left": "5px",
				})
			} else {
				img.css({
					width: "100px",
					height: "159px",
					border: "3px solid black",
					"margin-left": "5px",
				})
			}
			img.attr("id", cardID)

			if (!reserve) {
				this.addHighlightsOnMouseOverToElement(img, 3, false, true)
				img.on("click", { pcap: i }, C.clickedOnCard)
			}

			div.append(img)
		}
		return div
	}

	this.enableQuadrantSelectionForCard = function (card) {
		$(".SVGQ").remove()
		for (var i = 1; i <= 4; i++) {
			var str = Qhighlight
			var img = $(str.replace(/COLOUR/, "black").replace(/THISID/, "Q" + String(i) + "stroke"))

			const offset = 2.5
			var left = 0 + offset
			var top = 300 + offset
			if (i === 2) left = 300 + offset
			if (i === 3) {
				left = 0 + offset
				top = 0 + offset
			}
			if (i === 4) {
				left = 300 + offset
				top = 0 + offset
			}

			img.attr("id", "Q" + String(i)) // + card);
			img.data("card", card)

			img.css({
				position: "absolute",
				top: String(top) + "px",
				left: String(left) + "px",
				"z-index": "500",
			})

			img.on("mouseover", function (e) {
				$(".SVGQ").css({
					stroke: "black",
				})
				$("#" + this.id + "stroke").css({
					stroke: "yellow",
				})
				var cardName = $(e.currentTarget).data("card").slice(4)
				var cardData = getCardDataFromCardName(cardName)
				V.addGhostSparks(parseInt(this.id.slice(1, 2)), cardData)
			})
			img.on("mouseout", function (e) {
				$(".ghostNicheDiv").remove()
				$(".ghostSpark").remove()
				$(".SVGQ").css({
					stroke: "black",
				})
			})

			$("#marketBoarddiv").append(img)
			img.on("click", C.clickedOnQ)
		}
	}

	this.addGhostSparks = function (quadrant, cardData) {
		var Xcoord = 0
		var Ycoord = 0

		for (var i = 1; i < cardData.length; i++) {
			Xcoord = 0
			Ycoord = 0
			if (quadrant === 1) Ycoord = 4
			if (quadrant === 4) Xcoord = 4
			if (quadrant === 2) {
				Xcoord = 4
				Ycoord = 4
			}
			// Create a niche div
			Xcoord = Xcoord + cardData[i][0]
			Ycoord = Ycoord + cardData[i][1]

			var nicheDiv = $("<div></div>")
			var divXcoord = 9 + 71.5 * Xcoord
			var divYcoord = 9 + 71.5 * Ycoord

			if (Xcoord >= 2) divXcoord += 4.5
			if (Xcoord >= 4) divXcoord += 7
			if (Xcoord >= 6) divXcoord += 4.5

			if (Ycoord >= 2) divYcoord += 4.5
			if (Ycoord >= 4) divYcoord += 7
			if (Ycoord >= 6) divYcoord += 4.5

			nicheDiv.css({
				position: "absolute",
				top: String(divYcoord) + "px",
				left: String(divXcoord) + "px",
				width: "68px",
				height: "68px",
			})
			var sparkImg = this.getImage("S" + String(cardData[i][2]))
			sparkImg.addClass("ghostSpark")
			sparkImg.css({
				width: "34px",
				height: "34px",
				opacity: "0.5",
			})
			nicheDiv.append(sparkImg)
			$("#marketBoarddiv").append(nicheDiv)
		}
	}

	this.getAlreadyPlayedCardsDiv = function () {
		var alreadyPlayedCardsDiv = $("<div></div>")
		for (var i = 0; i < this.model.alreadyPlayedCards.length; i++) {
			var col = "black"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === RED) col = "#E83435"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === GREEN) col = "#70C96B"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === PURPLE) col = "#8E63B3"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === BLUE) col = " #435EB5"
			if (getCorrectedColour(this.model.alreadyPlayedCards[i][0]) === YELLOW) col = "#EECD30"

			var img = $(P_CARD_AREA.replace(/COLOUR/, col))

			if (this.model.alreadyPlayedCards[i][1] === 4) img = $(P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r1"))
			if (this.model.alreadyPlayedCards[i][1] === 2) img = $(P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r2"))
			if (this.model.alreadyPlayedCards[i][1] === 1) img = $(P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r3"))
			img.css({
				width: "60px",
				height: "60px",
				"margin-right": "5px",
			})
			alreadyPlayedCardsDiv.append(img)
		}
		return alreadyPlayedCardsDiv
	}

	this.getDealershipSellingDiv = function (dealership, stocks, activate, playerIndex) {
		var i = 0
		var img

		// refresh all tech levels. WHY???? To fix 9s
		for (i = 0; i < this.model.players.length; i++) {
			this.model.players[i].factory.checkDealershipLevels()
		}

		var Cwidth = DIMENSIONS[dealership[0]][0] * this.smallSqPxWidth
		var Cheight = DIMENSIONS[dealership[0]][1] * this.smallSqPxWidth

		var dealershipSellingDiv = $("<div></div>")
		dealershipSellingDiv.attr("id", "dship" + String(dealership[1]))
		dealershipSellingDiv.css({
			position: "relative",
			width: String(Cwidth + 10 + 70) + "px",
			height: String(Cheight + 20) + "px",
			border: "3px solid black",
			"margin-right": "5px",
			"margin-bottom": "5px",
		})

		var componentImg = this.getComponentImage(dealership[0])
		componentImg.addClass("factoryComponent")
		componentImg.css({
			height: String(Cheight) + "px",
			width: String(Cwidth) + "px",
			position: "absolute",
			left: "5px",
			top: "5px",
		})

		dealershipSellingDiv.append(componentImg)

		var techLevelsDiv = $("<div></div>")
		techLevelsDiv.css({
			position: "absolute",
			left: String(11) + "px",
			top: String(53) + "px",
			/*'background-color': 'red',*/
			width: "fit-content",
			height: "fit-content",
			"z-index": "1000",
		})
		var techLevelsSpan = $("<span></span>")
		techLevelsSpan.addClass("techLevelsSpan")

		var addedNumbers = 0
		for (var j = 0; j < dealership[TL_IDX].length; j++) {
			if (dealership[TL_IDX][j] > 0 && dealership[TL_IDX][j] !== 9) {
				techLevelsSpan.append("<span class='techLevelNumber" + String(j) + "a'>" + String(dealership[TL_IDX][j]) + "</span>")
				addedNumbers++
			}
		}
		techLevelsDiv.append(techLevelsSpan)
		dealershipSellingDiv.append(techLevelsDiv)

		// Now add adjacent Stocks
		var stocksDiv = $("<div></div>")
		stocksDiv.css({
			position: "absolute",
			left: String(Cwidth + 10) + "px",
			top: "5px",
			height: String(Cheight + 20) + "px",
			width: "70px",
		})

		// If it is below min spec, add icon
		var belowMinSpec = true
		var minSpecs = Rules.getMinSpecsInOrder()
		if (dealership[TL_IDX][0] >= minSpecs[0] && dealership[TL_IDX][1] >= minSpecs[1] && dealership[TL_IDX][2] >= minSpecs[2] && dealership[TL_IDX][3] >= minSpecs[3] && dealership[TL_IDX][4] >= minSpecs[4]) belowMinSpec = false
		if (belowMinSpec) {
			stocksDiv.append(gettext("Below Min Spec") + "<BR/>")
		}
		// else add stock
		else {
			for (i = 0; i < stocks.length; i++) {
				if (stocks[i] > 0) {
					stocksDiv.append(stocks[i])
					stocksDiv.append(" X ")
					img = this.getImage("V" + String(i))
					img.css({
						width: "41px",
					})
					stocksDiv.append(img)
					stocksDiv.append("<BR/>")
				}
			}
		}
		// Add MW icon
		var adjMarketingDeparmentData = M.players[playerIndex].factory.getAllComponentDataOfDirectConnectionsToComponentIndex(dealership[1])
		adjMarketingDeparmentData = adjMarketingDeparmentData.filter(function (componenet) {
			return DEPARTMENTS_MARKETING.includes(componenet[0])
		})
		var MWsize = Math.min(2, adjMarketingDeparmentData.length)
		img = this.getImage("MWicon" + String(MWsize))
		var iconWidth = 41
		if (MWsize < 2) iconWidth = 28
		img.css({
			width: String(iconWidth) + "px",
		})
		stocksDiv.append(img)

		if (activate) {
			this.addHighlightsOnMouseOverToElement(dealershipSellingDiv, 3, false)
			dealershipSellingDiv.on("click", { /*this: C,*/ dealership: dealership }, C.clickedOnDealership)
		} else {
			this.addHighlightsOnMouseOverToElement(dealershipSellingDiv, 3, false)
			dealershipSellingDiv.on("click", { /*this: C,*/ dealership: dealership, stocks: stocks }, C.clickedOnDealershipOther)
		}

		dealershipSellingDiv.append(stocksDiv)

		return dealershipSellingDiv
	}

	this.addNudgeDiv = function (player, expansion) {
		player = C.currentPlayer()
		$("#nudgeDiv").remove()

		var nudgeDiv = $("<div></div>")
		nudgeDiv.attr("id", "nudgeDiv")
		nudgeDiv.css({
			border: "1px solid black",
			width: "180px",
			height: "fit-content",
			padding: "10px",
			"text-align": "center",
		})
		nudgeDiv.append("<b><u>" + gettext("Nudge Component") + "</b></u><BR/>")
		for (var i = 0; i < 4; i++) {
			var img = $("<img>")
			img.attr("src", imagePreURL + "/nudge.svg")
			if (i === 0) {
				img.addClass("r3")
				img.css({
					position: "relative",
					top: "26px",
				})
			}
			if (i === 2) {
				img.addClass("r1")
				img.css({
					position: "relative",
					top: "26px",
				})
			}
			if (i === 3) {
				img.addClass("r2")
				img.css({
					"margin-left": "0px",
				})
				nudgeDiv.append("<BR/>")
			}
			img.css({
				width: "53px",
				height: "55px",
				border: "1px solid black",
				"border-radius": "10px",
				"margin-right": "5px",
				"margin-top": "5px",
				"padding-bottom": "2px",
			})
			this.addHighlightsOnMouseOverToElement(img, 1, false, false)
			nudgeDiv.append(img)

			img.on("click", { this: player.factory, direction: i, expansion: expansion }, player.factory.clickedOnNudge)
		}
		$("#newComponentAndQSPdiv").append(nudgeDiv)
	}

	this.updateQSPdiv = function (player) {
		player = C.currentPlayer()
		$("#QSPdiv").remove()

		// exit now if during factory expansion
		if (this.model.subphase === 1) return

		var possibleSpecsToAdd = player.factory.findAllPossibleSpecsToAdd()
		if (possibleSpecsToAdd.length > 0) {
			var QSPdiv = $("<div></div>")
			QSPdiv.attr("id", "QSPdiv")
			QSPdiv.css({
				border: "1px solid black",
				width: "180px",
				height: "fit-content",
				padding: "10px",
				"text-align": "left",
			})
			QSPdiv.append("<b><u>" + gettext("Quick Spec Pick") + "</b></u>")
			for (var i = 0; i < possibleSpecsToAdd.length; i++) {
				QSPdiv.append("<BR/>")
				QSPdiv.append(COMPONENTS_NAME_STRING[player.factory.factoryComponents[possibleSpecsToAdd[i][0]][0]])
				QSPdiv.append(": ")
				for (var j = 1; j < possibleSpecsToAdd[i].length; j++) {
					if (j != 1) QSPdiv.append("&nbsp;")
					var img = this.getComponentImage(possibleSpecsToAdd[i][j])
					img.css({
						border: "1px solid black",
					})
					img.on("click", { player: player, specData: possibleSpecsToAdd[i], specName: possibleSpecsToAdd[i][j] }, this.clickedOnQSPspec)
					V.addHighlightsOnMouseOverToElement(img)
					QSPdiv.append(img)
				}
			}
			$("#newComponentAndQSPdiv").prepend(QSPdiv)
		}
	}

	this.clickedOnQSPspec = function (e) {
		// Clear component being placed, just in case

		var specData = e.data.specData // Just used for specData[0], which is the component being linked TO
		var specName = e.data.specName // Just used for p.f.componentBeingAdded

		V.actionClickedonQSPspec(specData, specName)
		//var player = e.data.player;
	}

	this.actionClickedonQSPspec = function (specData, specName) {
		$("#newComponentDiv").remove()
		var player = C.currentPlayer()

		$(".ghostComponentImg").remove()
		$("#nudgeDiv").remove()

		player.factory.componentBeingAdded = specName
		player.factory.componentBeingAddedRotation = 0
		player.factory.componentBeingAddedFlipped = 0

		// Find empty squares next to component
		var eligibleEmptySquaresWithDirection = player.factory.getAllDirectlyAdjacentIndexesOnlyFromComponentIndexWithInwardsPointer(player.factory.factoryComponents[specData[0]][1])
		eligibleEmptySquaresWithDirection = eligibleEmptySquaresWithDirection.filter((entry) => player.factory.factoryCoords[entry[0]] === EMPTY_SPACE)
		$(".selectable").remove()

		V.externalDrawSquaresQSP(player, eligibleEmptySquaresWithDirection, "yellow", "selectable")
		$("#factoryFloorDiv .selectable").on("click", { self: self, player: player }, player.factory.placeFactoryComponent)
		$("#factoryFloorDiv .selectable").on("mouseover", { self: self, player: player }, V.arrowMouseOnHighlight)

		$("#newComponentAndQSPdiv").on("mouseover", function (e) {
			$(".ghostComponentImg").remove()
		})
	}

	// WARNING: THIS is now Div ELEMENT
	this.clickedOnCard = function (e) {
		$(".availableCardsImg").removeClass("activeCard")
		$(".availableCardsImg").css({ border: "3px solid black" })
		this.classList.add("activeCard")
		this.style.border = "3px solid lightgreen"
		C.currentPlayer.pcap = e.data.pcap
		V.enableQuadrantSelectionForCard(this.id)
	}

	this.getMarketBoardDiv = function (size) {
		// Market Board
		var marketBoarddiv = $("<div></div>")
		marketBoarddiv.css({
			position: "relative",
			display: "inline-block",
			top: "0px",
			left: "0px",
			width: "600px",
			height: "600px",
			"margin-top": "30px",
		})
		marketBoarddiv.empty()
		var marketBoardImg = this.getImage(MARKET_BOARD)
		marketBoardImg.css({
			width: "600px",
			height: "600px",
		})
		marketBoarddiv.append(marketBoardImg)
		// Now add sparks / demand
		for (i = 0; i < this.model.marketBoard.length; i++) {
			if (this.model.marketBoard[i][0] + this.model.marketBoard[i][1] + this.model.marketBoard[i][0] + this.model.marketBoard[i][2] + this.model.marketBoard[i][3] + this.model.marketBoard[i][4] + this.model.marketBoard[i][5] > 0) {
				// Create a niche div
				Xcoord = this.model.getMBcoordsForIndex(i)[0]
				Ycoord = this.model.getMBcoordsForIndex(i)[1]

				var nicheDiv = $("<div></div>")
				divXcoord = 9 + 71.5 * Xcoord
				divYcoord = 9 + 71.5 * Ycoord

				if (Xcoord >= 2) divXcoord += 4.5
				if (Xcoord >= 4) divXcoord += 7
				if (Xcoord >= 6) divXcoord += 4.5

				if (Ycoord >= 2) divYcoord += 4.5
				if (Ycoord >= 4) divYcoord += 7
				if (Ycoord >= 6) divYcoord += 4.5

				nicheDiv.css({
					position: "absolute",
					top: String(divYcoord) + "px",
					left: String(divXcoord) + "px",
					width: "68px",
					height: "68px",
				})
				var demandDiv = $("<div></div>")
				demandDiv.css({
					position: "absolute",
					display: "flex",
					"flex-wrap": "wrap",
					top: "0px",
					left: "0px",
					width: "69px",
					height: "40px",
					"z-index": "500",
				})
				for (j = 3; j < 6; j++) {
					if (this.model.marketBoard[i][j] > 0) {
						imgDiv = $("<div></div>")
						imgDiv.css({
							position: "relative",
							width: "34px",
							height: "20px",
						})
						img = this.getImage("V" + String(j - 3))
						img.css({
							position: "absolute",
							top: "0px",
							left: "0px",
							width: "34px",
							height: "20px",
						})
						imgDiv.append(img)
						numDiv = $("<div></div>")
						numDiv.css({
							position: "absolute",
							top: "0px",
							left: "10px",
							color: "yellow",
							"font-weight": "bolder",
							padding: "2px",
							"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
						})
						numDiv.append(String(this.model.marketBoard[i][j]))
						imgDiv.append(numDiv)
						demandDiv.append(imgDiv)
					}
				}
				var sparkDiv = $("<div></div>")
				sparkDiv.css({
					position: "absolute",
					display: "flex",
					"flex-wrap": "wrap",
					top: "42px",
					left: "0px",
					width: "68px",
					height: "28px",
					"z-index": "500",
				})
				for (j = 0; j < 3; j++) {
					if (this.model.marketBoard[i][j] > 0) {
						imgDiv = $("<div></div>")
						imgDiv.css({
							position: "relative",
							width: "22px",
							height: "22px",
						})
						img = this.getImage("S" + String(j))
						img.css({
							position: "absolute",
							top: "0px",
							left: "0px",
							width: "22px",
							height: "22px",
						})
						imgDiv.append(img)
						numDiv = $("<div></div>")
						numDiv.css({
							position: "absolute",
							top: "0px",
							left: "5px",
							color: "yellow",
							"font-weight": "bolder",
							padding: "2px",
							"text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
						})
						numDiv.append(String(this.model.marketBoard[i][j]))
						imgDiv.append(numDiv)
						sparkDiv.append(imgDiv)
					}
				}

				nicheDiv.append(demandDiv)
				nicheDiv.append(sparkDiv)
				marketBoarddiv.append(nicheDiv)
			}
		}

		// Add prices
		for (i = 0; i < this.model.priceBand.length; i++) {
			if (this.model.priceBand[i] > 0) {
				var indexToUse = this.model.getIndexForPriceDisplay(i)
				// Create a niche div
				var priceDiv = this.getPriceDiv(indexToUse, this.model.priceBand[i])
				marketBoarddiv.append(priceDiv)
			}
		}
		return marketBoarddiv
	}

	// css used in component rotation div only atm.
	this.getComponentImage = function (componentName) {
		var img = $("<img>")
		var originalColour = 0

		if (DEALERSHIPS.includes(componentName)) {
			originalColour = Math.floor((componentName - 40) / 3)
			componentName = getCorrectedDealershipColour(componentName, originalColour)
		}
		if (DEPARTMENTS_MARKETING.includes(componentName)) {
			originalColour = componentName - 55
			componentName = getCorrectedMarketingDepartmentColour(componentName, originalColour)
		}

		if (componentName === FACTORY_MAIN_TILE) img.attr("src", imagePreURL + "/f_main.jpg")
		else if (componentName === FACTORY_EXPANSION_TILE) img.attr("src", imagePreURL + "/f_expansion.jpg")
		else if (componentName === MAINLINE_CAR) img.attr("src", imagePreURL + "/f_c_mainline_car.jpg")
		else if (componentName === MAINLINE_TRUCK) img.attr("src", imagePreURL + "/f_c_mainline_truck.jpg")
		else if (componentName === MAINLINE_SPORTS) img.attr("src", imagePreURL + "/f_c_mainline_sports.jpg")
		else if (componentName === DEPARTMENT_RESEARCH) img.attr("src", imagePreURL + "/f_c_researchDepartment.jpg")
		else if (componentName === DEPARTMENT_PLANNING) img.attr("src", imagePreURL + "/f_c_planningDepartment.jpg")
		else if (componentName === CHASSIS) img.attr("src", imagePreURL + "/f_c_chassis.jpg")
		else if (componentName === BODY) img.attr("src", imagePreURL + "/f_c_body.jpg")
		else if (componentName === RADIATOR) img.attr("src", imagePreURL + "/f_c_radiator.jpg")
		else if (componentName === DOOR) img.attr("src", imagePreURL + "/f_c_door.jpg")
		else if (componentName === BUMPER) img.attr("src", imagePreURL + "/f_c_bumper.jpg")
		else if (componentName === DASHBOARD) img.attr("src", imagePreURL + "/f_c_dashboard.jpg")
		else if (componentName === PAINT) img.attr("src", imagePreURL + "/f_c_paint.jpg")
		else if (componentName === BATTERY) img.attr("src", imagePreURL + "/f_c_battery.jpg")
		else if (componentName === ENGINE) img.attr("src", imagePreURL + "/f_c_engine.jpg")
		else if (componentName === GEARS) img.attr("src", imagePreURL + "/f_c_gears.jpg")
		else if (componentName === FUEL_TANK) img.attr("src", imagePreURL + "/f_c_fuelTank.jpg")
		else if (componentName === STEERING_WHEEL) img.attr("src", imagePreURL + "/f_c_steeringWheel.jpg")
		else if (componentName === BRAKE) img.attr("src", imagePreURL + "f_c_brake.jpg")
		else if (componentName === TIRE) img.attr("src", imagePreURL + "/f_c_tire.jpg")
		else if (componentName === HEADLIGHT) img.attr("src", imagePreURL + "/f_c_headlight.jpg")
		else if (componentName === WINDSHIELD) img.attr("src", imagePreURL + "/f_c_windshield.jpg")
		else if (componentName === CLAXON) img.attr("src", imagePreURL + "/f_c_claxon.jpg")
		else if (componentName === ARROW_DESIGN_A) img.attr("src", imagePreURL + "/f_arrow_PA.jpg")
		else if (componentName === ARROW_DESIGN_B) img.attr("src", imagePreURL + "/f_arrow_PB.jpg")
		else if (componentName === ARROW_DESIGN_C) img.attr("src", imagePreURL + "/f_arrow_PC.jpg")
		else if (componentName === ARROW_DESIGN_D) img.attr("src", imagePreURL + "/f_arrow_PD.jpg")
		else if (componentName === ARROW_REL_A) img.attr("src", imagePreURL + "/f_arrow_BA.jpg")
		else if (componentName === ARROW_REL_B) img.attr("src", imagePreURL + "/f_arrow_BB.jpg")
		else if (componentName === ARROW_REL_C) img.attr("src", imagePreURL + "/f_arrow_BC.jpg")
		else if (componentName === ARROW_SPD_B) img.attr("src", imagePreURL + "/f_arrow_RB.jpg")
		else if (componentName === ARROW_SPD_C) img.attr("src", imagePreURL + "/f_arrow_RC.jpg")
		else if (componentName === ARROW_SPD_D) img.attr("src", imagePreURL + "/f_arrow_RD.jpg")
		else if (componentName === ARROW_SAFETY_A) img.attr("src", imagePreURL + "/f_arrow_YA.jpg")
		else if (componentName === ARROW_SAFETY_B) img.attr("src", imagePreURL + "/f_arrow_YB.jpg")
		else if (componentName === ARROW_SAFETY_D) img.attr("src", imagePreURL + "/f_arrow_YD.jpg")
		else if (componentName === ARROW_RANGE_A) img.attr("src", imagePreURL + "/f_arrow_GA.jpg")
		else if (componentName === ARROW_RANGE_B) img.attr("src", imagePreURL + "/f_arrow_GB.jpg")
		else if (componentName === ARROW_RANGE_D) img.attr("src", imagePreURL + "/f_arrow_GD.jpg")
		else if (componentName === DEALERSHIP_RED_POMIGLIANO) img.attr("src", imagePreURL + "/f_dealership_R0.jpg")
		else if (componentName === DEALERSHIP_RED_GRUGLIASCO) img.attr("src", imagePreURL + "/f_dealership_R1.jpg")
		else if (componentName === DEALERSHIP_RED_TORINO) img.attr("src", imagePreURL + "/f_dealership_R2.jpg")
		else if (componentName === DEALERSHIP_GREEN_ELLESMERE) img.attr("src", imagePreURL + "/f_dealership_G0.jpg")
		else if (componentName === DEALERSHIP_GREEN_DUNSTABLE) img.attr("src", imagePreURL + "/f_dealership_G1.jpg")
		else if (componentName === DEALERSHIP_GREEN_LUTON) img.attr("src", imagePreURL + "/f_dealership_G2.jpg")
		else if (componentName === DEALERSHIP_PURPLE_AUDINCOURT) img.attr("src", imagePreURL + "/f_dealership_P0.jpg")
		else if (componentName === DEALERSHIP_PURPLE_FIVES) img.attr("src", imagePreURL + "/f_dealership_P1.jpg")
		else if (componentName === DEALERSHIP_PURPLE_SOCHAUX) img.attr("src", imagePreURL + "/f_dealership_P2.jpg")
		else if (componentName === DEALERSHIP_BLUE_KANSAS) img.attr("src", imagePreURL + "/f_dealership_B0.jpg")
		else if (componentName === DEALERSHIP_BLUE_DEARBORN) img.attr("src", imagePreURL + "/f_dealership_B1.jpg")
		else if (componentName === DEALERSHIP_BLUE_DETROIT) img.attr("src", imagePreURL + "/f_dealership_B2.jpg")
		else if (componentName === DEALERSHIP_YELLOW_STUTTGART) img.attr("src", imagePreURL + "/f_dealership_Y0.jpg")
		else if (componentName === DEALERSHIP_YELLOW_LADENBURG) img.attr("src", imagePreURL + "/f_dealership_Y1.jpg")
		else if (componentName === DEALERSHIP_YELLOW_MANNHEIM) img.attr("src", imagePreURL + "/f_dealership_Y2.jpg")
		else if (componentName === DEPARTMENT_MARKETING_RED) img.attr("src", imagePreURL + "/f_marketingDepartment_R.jpg")
		else if (componentName === DEPARTMENT_MARKETING_GREEN) img.attr("src", imagePreURL + "/f_marketingDepartment_G.jpg")
		else if (componentName === DEPARTMENT_MARKETING_PURPLE) img.attr("src", imagePreURL + "/f_marketingDepartment_P.jpg")
		else if (componentName === DEPARTMENT_MARKETING_BLUE) img.attr("src", imagePreURL + "/f_marketingDepartment_B.jpg")
		else if (componentName === DEPARTMENT_MARKETING_YELLOW) img.attr("src", imagePreURL + "/f_marketingDepartment_Y.jpg")

		try {
			String(DIMENSIONS[componentName][0] * this.smallSqPxWidth)
		} catch {
			alert("Componenet Error:  " + String(componentName))
		}

		img.css({
			width: "" + String(DIMENSIONS[componentName][0] * this.smallSqPxWidth) + "px",
			height: "" + String(DIMENSIONS[componentName][1] * this.smallSqPxWidth) + "px",
		})
		img.attr("title", COMPONENTS_NAME_STRING[componentName] + "\n" + String(DIMENSIONS[componentName][0]) + " x " + String(DIMENSIONS[componentName][1]))

		return img
	}

	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */
	/************************************************************************************************************************************************** */

	this.renderKickoutCountdown = function () {
		//if (replay.showingReplay || global.secondsToNextKickout > 1200 || global.secondsToNextKickout == undefined || M.workflow.phase == END_GAME || M.trainingGame) {
		if (global.secondsToNextKickout > 1200 || global.secondsToNextKickout == undefined || M.workflow?.phase == PHASE_GAME_END_CHECK || M.trainingGame) {
			$("#kickoutTimerSpan").hide()
			clearInterval(global.kickoutCountdownIntervalTimer)
		} else {
			if ($("#kickoutTimerTimer").css("color") != "rgb(238, 238, 238)") $("#kickoutTimerTimer").css("color", "rgb(238, 238, 238)")
			$("#kickoutTimerSpan").show()
			let localSecondsToNextKickout = global.secondsToNextKickout
			if (localSecondsToNextKickout < 0) localSecondsToNextKickout = 0
			var minsToGo = String(Math.floor(localSecondsToNextKickout / 60))
			var secsToGo = "0" + String(Math.floor(localSecondsToNextKickout % 60))
			$("#kickoutTimerTimer").html(" " + minsToGo + " : " + secsToGo.slice(-2) + "")

			if (global.kickoutCountdownIntervalTimer != undefined) clearInterval(global.kickoutCountdownIntervalTimer)
			global.kickoutCountdownIntervalTimer = setInterval(this.kickoutTimeFunction, 1000)
		}
	}
	this.kickoutTimeFunction = function () {
		global.secondsToNextKickout--
		if (global.secondsToNextKickout > 1200 || global.secondsToNextKickout == undefined) {
			$("#kickoutTimerSpan").hide()
			clearInterval(global.kickoutCountdownIntervalTimer)
		} else {
			if (global.secondsToNextKickout < 60) {
				if ($("#kickoutTimerTimer").css("color") == "rgb(238, 238, 238)") $("#kickoutTimerTimer").css("color", "rgb(255, 6, 0)")
				else $("#kickoutTimerTimer").css("color", "rgb(238, 238, 238)")
			}
			if (global.secondsToNextKickout < 0) global.secondsToNextKickout = 0
			var minsToGo = String(Math.floor(global.secondsToNextKickout / 60))
			var secsToGo = "0" + String(Math.floor(global.secondsToNextKickout % 60))
			$("#kickoutTimerTimer").html(" " + minsToGo + " : " + secsToGo.slice(-2) + "")
		}
	}

	this.kickoutFlexiTimeFunction = function () {
		global.remainingFlexiSeconds--
		if (global.remainingFlexiSeconds < 0) global.remainingFlexiSeconds = 0
		let hoursToGo = String(Math.floor(global.remainingFlexiSeconds / 60 / 60))
		let minsToGo = String(Math.floor((global.remainingFlexiSeconds % 3600) / 60)).padStart(2, "0")
		let secsToGo = String(Math.floor(global.remainingFlexiSeconds % 60)).padStart(2, "0")

		$("#flexiKickoutTimerSpan").html(" " + hoursToGo + ":" + minsToGo + ":" + secsToGo)
	}

	function topMenuItem(e) {
		var v = e.data.view
		var item = $(e.currentTarget).data("type")

		if (item === 7) {
			if ($("#reserve").is(":visible")) {
				closeReserve.call(v)
			} else {
				displayReserve.call(v, true)
			}
		} else if (item === 4) {
			if ($("body").hasClass("history")) {
				closeHistory.call(v)
				$(e.currentTarget).removeClass("highlighted")
			} else {
				closeChat.call(v)
				closeNotes.call(v)
				$(e.currentTarget).addClass("highlighted")
				displayHistory.call(v)
			}
		} else if (item === 2) {
			// Bug entry
			if ($("#bugReport").is(":visible")) {
				closeBugReport.call(v)
				$(e.currentTarget).removeClass("highlighted")
			} else {
				displayBugReport.call(v, true)
				$(e.currentTarget).addClass("highlighted")
			}
		} else if (item === 5) {
			// CHAT
			if ($("#wholeChat").is(":visible")) {
				closeChat.call(v)
				$(e.currentTarget).removeClass("highlighted")
			} else {
				displayChat.call(v)
				$(e.currentTarget).addClass("highlighted")
			}
		} else if (item === 3) {
			if ($("#notesBox").is(":visible")) {
				closeNotes.call(v)
			} else {
				displayNotes.call(v)
			}
		} else if (item === 9) {
			// TOGGLE ASSISTANCE HERE
			if (M.gourmet || M.ruralMarketers) {
				if ($("body").hasClass("noassistance")) {
					$("body").removeClass("noassistance")
					$("#assistIcon").attr("src", "/static/FCM/images/assistance.svg")
					IO.saveAssistance(true)
				} else {
					$("body").addClass("noassistance")
					$("#assistIcon").attr("src", "/static/FCM/images/assistanceNo.svg")
					IO.saveAssistance(false)
				}
			} else {
				if ($("#assistance").is(":hidden")) {
					$("#assistance").show()
					$("#assistIcon").attr("src", "/static/FCM/images/assistance.svg")
					IO.saveAssistance(true)
				} else {
					$("#assistance").hide()
					$("#assistIcon").attr("src", "/static/FCM/images/assistanceNo.svg")
					IO.saveAssistance(false)
				}
			}
		} else if (item === 6) {
			if (global.nextUrl != undefined) {
				window.location.href = "/" + global.nextUrl
			} else {
				window.location.href = "/"
			}
		} else if (item === 10) {
			if (!M.trainingGame) {
				toggleDropDown()
			} else {
				$("#wholeMainArea").fadeOut("slow", function () {
					IO.loadRewind(C)
				})
			}
		} else if (item === 99) {
			if (M.trainingGame) {
			} else {
				$("#wholeMainArea").fadeOut("slow", function () {
					IO.loadRewind(C)
				})
			}
		}
	}

	function closeHistory() {
		$("body").removeClass("history")
		$("#menuButtonHistory").removeClass("highlighted")

		$("#history").fadeOut(400)
	}

	function closeChat() {
		$("body").removeClass("chat")
		$("#wholeChat").fadeOut(400)
		$("#menuButtonChat").removeClass("highlighted")
	}

	function closeNotes() {
		$("body").removeClass("notes")
		$("#menuButtonNotes").removeClass("highlighted")
	}

	function closeBugReport() {
		$("#bugReport").hide()
		$("#menuButtonBug").removeClass("highlighted")
	}

	function displayHistory() {
		closeChat.call(this)
		$("body").addClass("history")
		var b = $("#footer").position().top
		var a = 69
		$("#history").css("max-height", parseInt(b - a) + "px")
		$("#history").fadeIn(400)
	}

	function displayChat() {
		// WS starts anyway now
		$("body").addClass("chat")
		closeHistory.call(this)

		var b = $("#footer").position().top
		var a = 69
		$("#wholeChat").css("max-height", parseInt(b - a) + "px")

		$("#wholeChat").fadeIn(400)

		$("#chatBox button")
			.off()
			.on("click", { view: this }, function (e) {
				var v = e.data.view
				var message = $("#chatMessage").val()

				if (message != undefined && message.length > 0 && global.name != undefined) {
					$("#chatMessage").val("")
					addMessageToDisplay.call(this, { timestamp: new Date().getTime(), message: htmlEscape(message), name: global.name }, true)
					IO.postMessage(message, global.name)
				}
			})
	}

	function displayNotes() {
		closeReserve.call(this)
		closeHistory.call(this)
		closeBugReport.call(this)
		closeChat.call(this)
		//closePlayerDetails.call(this);
		$("body").addClass("notes")
		$("#menuButtonNotes").addClass("highlighted")

		if (global.notes != undefined) {
			$("#notes").val(htmlUnescape(global.notes))
		}

		$("#notesBox #submitNotes")
			.off()
			.on("click", { view: this }, function (e) {
				var v = e.data.view
				var note = $("#notes").val()

				if (note != undefined && note.length > 0 && global.name != undefined) {
					global.notes = note
					IO.postNote(note, global.name)
					closeNotes.call(this)
				}
			})

		$("#notesBox #closeNotes")
			.off()
			.on("click", function () {
				closeNotes.call(this)
			})

		$("#notesBox #clearNotes")
			.off()
			.on("click", function () {
				$("#notes").val("")
				delete global.notes
				IO.postNote("", global.name)
				closeNotes.call(this)
			})
	}

	this.displayChat = function () {
		displayChat.call(this)
	}

	function displayBugReport() {
		closeReserve.call(this)
		closeChat.call(this)
		closeHistory.call(this)
		closeNotes.call(this)

		$("#bugReport #submitBug")
			.off()
			.on("click", { view: this }, function (e) {
				var v = e.data.view
				var desc = $("#bugContent").val()

				if (desc != undefined && desc.length > 0) {
					IO.bugEntry(desc, returnFromBugSubmit, v)
				}
			})

		$("#bugReport #resetBug")
			.off()
			.on("click", function () {
				$("#bugContent").val("")
				closeBugReport.call(this)
			})

		$("#bugReport").show()
	}

	function returnFromBugSubmit(data) {
		$("#bugContent").val("")
		closeBugReport.call(this)
		alert(gettext("Your bug report has been submitted"))
	}

	this.refreshChat = function () {
		$("#messageList").empty()
		var messages = []
		if (global.chat != undefined) {
			messages = global.chat.chat
		}

		messages.push({ name: "WelcomeBot", timestamp: global.gameCreationTimestamp, message: gettext("Welcome to Horseless Carriage Online!=-NEWLINE-==-NEWLINE-=If you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!") })

		_.each(
			messages,
			function (message) {
				addMessageToDisplay.call(this, message)
			},
			this
		)
	}

	function addMessageToDisplay(message, pre) {
		var div = $('<div class="chatentry" >')
		var header = $('<div class="header"/>')
		header.append('<span class="date">' + Log.giveFormattedDate(message.timestamp) + " </span>")
		header.append('<span class="bold">' + message.name + "</span>")
		div.append(header)
		message.message = message.message.replace(/=-NEWLINE-=/g, "<br/>")
		message.message = message.message.replace(/\n/g, "<br/>")
		div.append('<div class="body">' + message.message + "</span>")
		if (message.date != undefined) div.data("ts", message.timestamp)
		else div.data("ts", -1)
		if (pre === true) $("#messageList").prepend(div)
		else $("#messageList").append(div)
	}

	this.addMessageToDisplayLive = function (message) {
		displayChat.call(this)
		addMessageToDisplay.call(this, message, true)
	}

	function displayReserve() {
		var i = 0

		var eligibleFactoryTiles = []
		for (i = 0; i < M.availableComponents.length; i++) {
			eligibleFactoryTiles.push(i)
		}

		$("#reserve").empty()
		$("#reserveMenuButton").addClass("highlighted")

		var mainlinesDiv = $("<div></div>")
		var AlinesDiv = $("<div></div>")
		var BlinesDiv = $("<div></div>")
		var ClinesDiv = $("<div></div>")
		var DlinesDiv = $("<div></div>")
		var departmentsDiv = $("<div></div>")
		var playerComponentsDiv = $("<div></div>")
		var playerCardsResDiv = $("<div></div>")

		mainlinesDiv.addClass("componentsBinRes")
		AlinesDiv.addClass("componentsBinRes")
		BlinesDiv.addClass("componentsBinRes")
		ClinesDiv.addClass("componentsBinRes")
		DlinesDiv.addClass("componentsBinRes")
		departmentsDiv.addClass("componentsBinRes")
		playerComponentsDiv.addClass("componentsBinRes")
		playerCardsResDiv.addClass("componentsBinRes")

		var eligibleComponentsDiv = $("#reserve")
		for (i = 0; i < eligibleFactoryTiles.length; i++) {
			var newComponentIndividualDiv = $("<div/>")
			newComponentIndividualDiv.css({
				position: "relative",
				"font-weight": "bolder",
				"font-size": "15px",
			})

			var newComponentImg = this.getComponentImage(eligibleFactoryTiles[i])
			newComponentImg.css({
				width: "" + String((DIMENSIONS[eligibleFactoryTiles[i]][0] * this.smallSqPxWidth) / 2) + "px",
				height: "" + String((DIMENSIONS[eligibleFactoryTiles[i]][1] * this.smallSqPxWidth) / 2) + "px",
			})
			newComponentImg.attr("id", "newComponentImg" + String(eligibleFactoryTiles[i]))
			newComponentImg.css({
				margin: "4px",
				border: "1px solid black",
				"margin-bottom": "0px",
			})
			// Check if it isn't available
			if (M.availableComponents[eligibleFactoryTiles[i]] <= 0) {
				newComponentImg.css({
					opacity: "0.5",
				})
				newComponentIndividualDiv.css({
					color: "red",
				})
			}
			newComponentIndividualDiv.append(newComponentImg)

			if (!ARROWS.includes(eligibleFactoryTiles[i])) newComponentIndividualDiv.append("<BR/>" + DIMENSIONS[eligibleFactoryTiles[i]][0] + " x " + DIMENSIONS[eligibleFactoryTiles[i]][1])

			var newComponentIndividualAmountDiv = $("<div/>")
			newComponentIndividualAmountDiv.html(String(M.availableComponents[eligibleFactoryTiles[i]]))
			var top = 5
			if (ARROWS.includes(eligibleFactoryTiles[i])) top = 35
			var left = 5
			if (eligibleFactoryTiles[i] === BUMPER) left = 25
			if (ARROWS.includes(eligibleFactoryTiles[i])) newComponentIndividualAmountDiv.css({ visibility: "hidden" })

			newComponentIndividualAmountDiv.css({
				position: "absolute",
				top: String(top) + "px",
				left: String(left) + "px",
				color: "white",
				"background-color": "black",
				"font-size": "15px",
				"z-index": "50",
				padding: "2px",
			})
			if (M.availableComponents[eligibleFactoryTiles[i]] <= 0) {
				newComponentIndividualAmountDiv.css({
					color: "salmon",
				})
			}
			newComponentIndividualDiv.append(newComponentIndividualAmountDiv)

			//eligibleComponentsDiv.append(newComponentIndividualDiv);
			if (MAINLINES.includes(eligibleFactoryTiles[i])) mainlinesDiv.append(newComponentIndividualDiv)
			if (A_TECHS.includes(eligibleFactoryTiles[i]) || A_ARROWS.includes(eligibleFactoryTiles[i])) AlinesDiv.append(newComponentIndividualDiv)
			if (B_TECHS.includes(eligibleFactoryTiles[i]) || B_ARROWS.includes(eligibleFactoryTiles[i])) BlinesDiv.append(newComponentIndividualDiv)
			if (C_TECHS.includes(eligibleFactoryTiles[i]) || C_ARROWS.includes(eligibleFactoryTiles[i])) ClinesDiv.append(newComponentIndividualDiv)
			if (D_TECHS.includes(eligibleFactoryTiles[i]) || D_ARROWS.includes(eligibleFactoryTiles[i])) DlinesDiv.append(newComponentIndividualDiv)
			if (eligibleFactoryTiles[i] === DEPARTMENT_RESEARCH || eligibleFactoryTiles[i] === DEPARTMENT_PLANNING) departmentsDiv.append(newComponentIndividualDiv)
			if (DEALERSHIPS.includes(eligibleFactoryTiles[i]) || DEPARTMENTS_MARKETING.includes(eligibleFactoryTiles[i])) playerComponentsDiv.append(newComponentIndividualDiv)
		} // END Eligible Factory Tiles loop

		var name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("MAINLINES"))
		mainlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("A LINES"))
		AlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("B LINES"))
		BlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("C LINES"))
		ClinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("D LINES"))
		DlinesDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("D'MENTS"))
		departmentsDiv.append(name)
		name = $("<div></div>")
		name.addClass("componentsBinName")
		name.html(gettext("DEALERSHIPS"))
		playerComponentsDiv.append(name)

		if (eligibleFactoryTiles.some((r) => MAINLINES.includes(r))) eligibleComponentsDiv.append(mainlinesDiv)
		if (eligibleFactoryTiles.some((r) => A_TECHS.includes(r))) eligibleComponentsDiv.append(AlinesDiv)
		if (eligibleFactoryTiles.some((r) => B_TECHS.includes(r))) eligibleComponentsDiv.append(BlinesDiv)
		if (eligibleFactoryTiles.some((r) => C_TECHS.includes(r))) eligibleComponentsDiv.append(ClinesDiv)
		if (eligibleFactoryTiles.some((r) => D_TECHS.includes(r))) eligibleComponentsDiv.append(DlinesDiv)
		if (eligibleFactoryTiles.some((r) => r === DEPARTMENT_RESEARCH || r === DEPARTMENT_PLANNING)) eligibleComponentsDiv.append(departmentsDiv)
		if (eligibleFactoryTiles.some((r) => DEALERSHIPS.includes(r) || DEPARTMENTS_MARKETING.includes(r))) eligibleComponentsDiv.append(playerComponentsDiv)

		// player cards
		var p
		if (M.trainingGame) p = C.currentPlayer()
		else if (global.pov != undefined) p = this.model.players[global.pov]
		else if (this.model.gameFlow.turnOrder[0] != undefined) p = this.model.players[this.model.gameFlow.turnOrder[0]]
		else p = this.model.players[0]

		if (global.pov != undefined) {
			var availCardsDiv = this.getAvailableCardsDiv(p.colour, p.playerCards, true)
			$("#reserve").append(availCardsDiv)
		}
		for (i = 0; i < this.model.players.length; i++) {
			//$("#reserve").append(gettext("The person having the visual colour:") + " " + getColourNameFromNumber(getCorrectedColour(M.players[i].colour)) + " " + gettext("has the original game cards in colour:") + " " + getColourNameFromNumber(M.players[i].colour) + "<BR/>");

			$("#reserve").append(
				interpolate(
					gettext("The person having the visual colour:: %(visualColour)s has the original game cards in colour: %(originalColour)s"),
					{
						visualColour: getColourNameFromNumber(getCorrectedColour(M.players[i].colour)),
						originalColour: getColourNameFromNumber(M.players[i].colour),
					},
					true
				) + "<BR/>"
			)
		}
		$("#reserve").append("Flex-Times: ")
		for (let i = 0; i < M.players.length; i++) {
			$("#reserve").append(M.players[i].name + ": " + getFlexiTimeString(M.players[i].name))
			$("#reserve").append("&nbsp;&nbsp;&nbsp;")
		}

		$("#reserve").css({ display: "flex" })
		$("#reserve").show()
	}

	function getFlexiTimeString(playerName) {
		let KickoutFlexiDataArray = global.KickoutFlexiDataArray
		let secondsIn24Hours = 24 * 60 * 60
		let playerSeconds = 0

		// Iterate over the KickoutFlexiDataArray to find the player's entry
		for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
			let entry = KickoutFlexiDataArray[i]

			// Check if the entry is a length-2 array and the first element matches the playerName
			if (Array.isArray(entry) && entry.length === 2 && entry[0] === playerName) {
				playerSeconds = entry[1]
				break
			}
		}

		let remainingSeconds = secondsIn24Hours - playerSeconds
		let hours = Math.floor(remainingSeconds / 3600)
		let minutes = Math.floor((remainingSeconds % 3600) / 60)

		// Set remaining time to 0 if it is negative
		hours = Math.max(hours, 0)
		minutes = Math.max(minutes, 0)

		// Format the hours and minutes as a string in the format hh:mm
		let formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

		return formattedTime
	}

	function closeReserve() {
		$("#reserve").hide()
		$("#reserve").empty()
		$("#reserveMenuButton").removeClass("highlighted")
	}

	var SMALL_SQUARE
	var MB_SMALL_SQUARE
	var MW_SMALL
	var MW_SMALL_R
	var MW_MEDIUM
	var MW_LARGE
	var Qhighlight
	var P_CARD_AREA

	this.reloadModel = function (model) {
		this.model = model
		this.render()
	}

	init.call(this)
}

function showLoader() {
	$("#loader").show()
}

function hideLoader() {
	$("#loader").hide()
}

function getCorrectedColour(colour) {
	if (global.preferredColour != undefined && global.preferredColour > -1 && global.pov != undefined && global.pov > -1 && M != undefined) {
		if (M.players[global.pov].colour === colour) {
			return global.preferredColour
		} else if (global.preferredColour === colour) {
			return M.players[global.pov].colour
		}
	}
	return colour
}

function getColourNameFromNumber(colour) {
	if (colour === 0) return "Red"
	if (colour === 1) return "Green"
	if (colour === 2) return "Purple"
	if (colour === 3) return "Blue"
	if (colour === 4) return "Yellow"
}

var Controller = function (_model, _view) {
	this.startActions = function () {
		var i = 0
		var j = 9
		$("#QSPdiv").remove()

		if (global.fullreset == undefined) {
			global.fullreset = compressObjectToDB(this.model.export())
		}
		if (this.model.phase !== PHASE_BUILD_FACTORY) {
			delete global.expansionReset
		}

		// if sandbox, then enable that
		if (this.model.sandboxMode) {
			this.enableFactoryBuildingSandbox()
			return
		}

		// DISPLAY INFO IF IT IS NOT YOUR TURN
		if (!Rules.canPlay()) {
			// Prevents removal of game end text on WS update
			if (this.model.gameEnded === 0) $("#actions").empty()
			if (M.gameFlow.phase === PHASE_SET_FOCUS) {
				// In set focus, but NOT our turn
				$("#actions").empty()

				var passedPlayers = []
				for (i = 0; i < M.prevEngFocusOrder.length; i++) {
					if (!M.gameFlow.turnOrder.includes(M.prevEngFocusOrder[i]) && !M.newEngFocusOrder.includes(M.prevEngFocusOrder[i])) passedPlayers.push(M.prevEngFocusOrder[i])
				}
				if (passedPlayers.length > 0) {
					$("#actions").append("<BR/>" + gettext("These players have passed and will be inserted in leftover spaces in this order:") + " ")
					for (i = 0; i < passedPlayers.length; i++) {
						$("#actions").append(C.getNameSpan(M.players[passedPlayers[i]].colour))
						if (i != passedPlayers.length - 1) $("#actions").append(",")
					}
					$("#actions").append("<BR/>")
				} // end passed players
				// prev eng focus
				$("#actions").append("<BR/><B>" + gettext("Previous Focus Order:") + "</B>")
				$("#actions").append(C.getNameSpan(-1) + "&nbsp;")
				for (i = 0; i < M.prevEngFocusOrder.length; i++) {
					$("#actions").append(C.getNameSpan(M.players[M.prevEngFocusOrder[i]].colour) + "&nbsp;")
				}
				$("#actions").append(C.getNameSpan(10) + "<BR/>")
				// New eng focus
				$("#actions").append("<BR/><B>" + gettext("New Focus Order:") + "</B>")
				$("#actions").append(C.getNameSpan(-1) + "&nbsp;")

				for (i = 0; i < M.newEngFocusOrder.length; i++) {
					if (M.newEngFocusOrder[i] == -1) {
						var button
						if (M.alreadySetFocus === 0) button = $('<span class="choosePos">' + (i + 1) + "</span> ")
						else button = $("<span>" + (i + 1) + "</span> ")
						$("#actions").append("&nbsp;&nbsp;")
						$("#actions").append(button)
						$("#actions").append("&nbsp;&nbsp;")
					} else {
						$("#actions").append("&nbsp;&nbsp;" + C.getNameSpan(M.players[M.newEngFocusOrder[i]].colour) + "&nbsp;&nbsp;")
					}
				}
				$("#actions").append("&nbsp;" + C.getNameSpan(10) + "<BR/>")
			} else if (this.model.gameFlow.phase === PHASE_SELL) {
				var dealershipsDiv = $("<div></div>")
				dealershipsDiv.css({
					position: "relative",
					display: "flex",
					floar: "left",
					width: "fit-content",
					height: "fit-content",
					padding: "3px",
					margin: "0 auto",
				})

				for (j = 0; j < this.model.gameFlow.turnOrder.length; j++) {
					for (i = 0; i < this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents.length; i++) {
						if (DEALERSHIPS.includes(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i][0])) {
							if (Rules.isDealershipSuitableToDisplay(this.model.players[this.model.gameFlow.turnOrder[j]], this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], false)) {
								stock = this.model.players[this.model.gameFlow.turnOrder[j]].factory.getStockForDealership(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i])
								dshipDiv = V.getDealershipSellingDiv(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], stock, false, this.model.gameFlow.turnOrder[j])
								dealershipsDiv.append(dshipDiv)
							}
						}
					}
				}
				$("#actions").append(dealershipsDiv)
			}
			return
		} // END if !RUles.can play (then display this info)
		if (this.model.gameEnded > 0) return

		// So now we can play
		if (this.model.gameFlow.turn === 0) this.enableFactorySetup()
		else if (this.model.gameFlow.phase === PHASE_RESEARCH) this.enableResearchPhase()
		else if (this.model.gameFlow.phase === PHASE_SET_FOCUS) this.enableSetFocusOptions()
		else if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			if (this.model.gameFlow.subphase === 1) this.enableFactoryExpansion()
			else this.enableFactoryBuilding()
		} else if (this.model.gameFlow.phase === PHASE_SELL) this.enableSell()
		else if (this.model.gameFlow.phase === PHASE_GROW_DEMANDS) this.enableGrowDemands()
	}

	/**************************************************************************************************************
	 *
	 * UTILS & COMMONS
	 *
	 **************************************************************************************************************/

	this.currentPlayer = function () {
		if (M.sandboxMode) return this.model.players[global.pov]
		if (M.trainingGame) return this.model.players[this.model.gameFlow.turnOrder[0]]

		if (!Rules.isSimulPhase()) return this.model.players[this.model.gameFlow.turnOrder[0]]
		if (Rules.isSimulPhase()) return this.model.players[this.model.gameFlow.currentPlayer]
	}

	this.addFinishTurnButton = function (turn, phase, buttonText) {
		if (this.model.sandboxMode) return
		$("#finishTurnButton").remove()
		var finishTurnButton = $('<button id="finishTurnButton">' + buttonText + "</button>")
		finishTurnButton.addClass("actionsLineButton")
		$("#actions").append(finishTurnButton)
		finishTurnButton.on("click", function () {
			if (phase === PHASE_SELL) C.endPlayerSalesTurn()
			else C.endPlayerTurn()
		})
	}

	this.addResetButton = function (text) {
		if (text == undefined) text = gettext("Reset")
		if ($("#resetTotalButton").length === 0) {
			var resetTotalButton = $('<button id="resetTotalButton">' + text + "</button>")
			resetTotalButton.addClass("actionsLineButton")

			$("#actions").append(resetTotalButton)
			resetTotalButton.on("click", { controller: this, total: true }, this.resetButton)
		}
	}

	this.resetButton = function (e) {
		var c = e.data.controller
		c.reset(c, e.data.total)
	}

	this.reset = function (total) {
		this.model.historyObj.splice(0, this.model.historyObj.length)
		this.reloadModel(global.fullreset)
	}

	this.reloadModel = async function (strModel) {
		var modelData = decompressObjectFromDB(strModel)
		this.model = Model.import(modelData)
		this.model.historyObj.splice(0, this.model.historyObj.length)
		M = this.model

		// Do this just to correct gameFlow.currentPLayer
		Rules.canPlay()
		if (!Rules.isSimulPhase()) global.currentPlayers = [this.model.players[this.model.gameFlow.turnOrder[0]].name]
		$("#actions").empty()
		this.view.reloadModel(this.model)
		// Hide newComponentDiv
		$("#newComponentDiv").remove()

		// Allows for spectator auto update history
		//if (global.pov != undefined) this.start(suppressActions);
		Log.refreshHistory(this.model)

		// remove old vies
		$("#eligibleComponentsDiv").empty()
		$("#componentValidationDiv").empty()
		if (Rules.canPlay()) this.sayBeep()
		this.startActions()
	}

	/**************************************************************************************************************
	 *
	 * PHASE 0.1 : SETUP - FACTORY /// Facotry Build
	 *
	 **************************************************************************************************************/

	this.enableFactorySetup = function () {
		var p = this.currentPlayer()
		if (this.model.setupSubPhase === 0) {
			$("#actions").append("<h2><b>" + gettext("Welcome to Horseless Carriage Online!</b><BR/>If you have any suggestions, questions or comments, then please do contact the webmaster at <img src='/static/Lobby/email.png' width='400px' height='30px'>. Thanks!"))

			if (this.model.trainingGame) $("#actions").append("<h2>" + gettext("In this practice game You will play all 3 players. Submit a bug report to report errors and game data to the webmaster. Thanks!") + "</h2>")

			$("#actions").append(gettext("Orientate your main factory tile"))
			$("#actions").append("<BR/>")
			$("#actions").append(V.getSetupInitialFactoryFloorDiv())
			var confirmButton = $('<button id="">Confirm</button>')
			confirmButton.addClass("actionsLineButton")
			this.addResetButton()
			$("#actions").append(confirmButton)
			confirmButton.on("click", function () {
				M.setupSubPhase++
				// set factory model correctly
				C.currentPlayer().factory.factoryCoords = C.currentPlayer().factory.rotateSquare(MAIN_FACTORY_TILE_COMPONENT, C.currentPlayer().factory.mainFactoryRotation, 12, C.currentPlayer().factory.mainFactoryFlipped)
				//var pos = M.gameFlow.ready.length;
				V.render()
				C.startActions()
			})
			if (global.debug) this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, "Debug End")
		} else {
			var eligibleFactoryTiles = Rules.getEligibleFactoryComponentNames(this.currentPlayer())
			this.view.displayEligibleFactoryTiles(this.currentPlayer(), eligibleFactoryTiles)
			$("#actions").empty()
			if (this.model.gameFlow.turn === 0) $("#actions").append(gettext("Place one Research Department and one Planning Department"))
			$("#actions").append("<BR/>")

			this.addResetButton()

			var undoButton = $('<button id="undoButton">Undo</button>')
			undoButton.addClass("actionsLineButton")
			$("#actions").append(undoButton)
			undoButton.on("click", function () {
				if (C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length > 0) {
					C.currentPlayer().factory.removeComponentAtIndex(C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn[C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length - 1])
					V.render()
				}
			})
		}

		this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, gettext("End Turn"))
		$("#finishTurnButton").hide()
		V.render()
	}

	/**************************************************************************************************************
	 *
	 * PHASE 1 : Research
	 *
	 **************************************************************************************************************/

	this.enableResearchPhase = function () {
		// delete info from turn 0
		delete global.move
		for (var i = 0; i < this.model.players.length; i++) {
			this.model.players[i].factory.factoryComponenetIndexesAddedThisTurn.splice(0, this.model.players[i].factory.factoryComponenetIndexesAddedThisTurn.length)
		}

		var player = this.currentPlayer()
		var researchPonts = Rules.getNumberOfResearchPoints(player)
		$("#actions").empty()
		$("#actions").append(this.view.displayAllDealershipsWithStock())

		$("#actions").append(gettext("Advance your Assembly Capacity or any player's Research"))
		$("#actions").append("<BR/>")
		if (Rules.anyBotPlayers()) {
			$("#actions").append("<BR/>")
			$("#actions").append(gettext("NOTE: Bot players do not restrict tech access. So the first human player in Eng order will have access to all techs"))
			$("#actions").append("<BR/>")
		}

		var resignButton = $("<button>" + gettext("Resign") + "</button>")
		resignButton.addClass("actionsLineButton")

		if (!this.model.trainingGame) $("#actions").append(resignButton)

		resignButton.on("click", { controller: this }, function (e) {
			$("#actions").empty()
			$("#actions").append("<p>" + gettext("Are you sure you want to resign?") + "</p><BR/>")
			$("#actions").append("<p>" + gettext("Resigning will unbalance the game for the remaining players.") + "</p>")
			$("#actions").append("<p>" + gettext("Please carry on playing if that is at all possible.") + "</p>")
			$("#actions").append("<p>" + gettext("Even if you think you can't win, you could still aim for 2nd place / not last place / funny factory layout / etc.") + "</p>")
			var img = $("<img>")
			img.attr("src", imagePreURL + "breakdown.jpg")
			img.css({
				height: "178px",
				width: "400px",
			})
			$("#actions").append(img)

			var line = $("<div>")
			var yesButton = $("<button>" + gettext("Yes, I still want to resign") + "</button>")
			var noButton = $("<button>" + gettext("Carry on playing") + "</button>")
			yesButton.addClass("actionsLineButton")
			noButton.addClass("actionsLineButton")

			line.append(noButton)
			line.append(yesButton)
			$("#actions").append(line)
			yesButton.on("click", { controller: C }, C.actionResign)

			noButton.on("click", { controller: C, total: true }, C.resetButton)
		})

		$("#actions").append(gettext("Research points remaining:") + " " + String(researchPonts))
		if (researchPonts > 0) {
			$(".piece").off()
			$(".piece").each(function (i, obj) {
				// if not used in research AND NOT(On ACT with different colour) and not
				if (!M.piecesUsedInResearch.includes(obj.id) && !(obj.id.slice(0, 3) === "ACT" && parseInt(obj.id.slice(4, 5)) !== C.currentPlayer().colour)) {
					// Can't advance if at end of tech track / ACT
					if (!(obj.id.slice(0, 3) === "ACT" && parseInt(obj.id.slice(3, 4)) === 4) && !(obj.id.slice(0, 3) !== "ACT" && parseInt(obj.id.slice(3, 4)) === 6)) {
						$(this).css({
							filter: `drop-shadow(4px 0 0 yellow) 
							drop-shadow(0 4px 0 yellow)
							drop-shadow(-4px 0 0 yellow) 
							drop-shadow(0 -4px 0 yellow)`,
						})
					}
				}
			})

			$(".piece").on("mouseover", function () {
				if (!M.piecesUsedInResearch.includes(this.id) && !(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(4, 5)) !== C.currentPlayer().colour)) {
					if (!(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(3, 4)) === 4) && !(this.id.slice(0, 3) !== "ACT" && parseInt(this.id.slice(3, 4)) === 6)) {
						$(this).css({
							filter: `drop-shadow(4px 0 0 green) 
				drop-shadow(0 4px 0 green)
				drop-shadow(-4px 0 0 green) 
				drop-shadow(0 -4px 0 green)`,
						})
					}
				}
			})

			$(".piece").on("mouseout", function () {
				if (!M.piecesUsedInResearch.includes(this.id) && !(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(4, 5)) !== C.currentPlayer().colour)) {
					if (!(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(3, 4)) === 4) && !(this.id.slice(0, 3) !== "ACT" && parseInt(this.id.slice(3, 4)) === 6)) {
						$(this).css({
							filter: `drop-shadow(4px 0 0 yellow) 
				drop-shadow(0 4px 0 yellow)
				drop-shadow(-4px 0 0 yellow) 
				drop-shadow(0 -4px 0 yellow)`,
						})
					}
				}
			})

			$(".piece").on("click", function (e) {
				if (!M.piecesUsedInResearch.includes(this.id) && !(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(4, 5)) !== C.currentPlayer().colour)) {
					if (!(this.id.slice(0, 3) === "ACT" && parseInt(this.id.slice(3, 4)) === 4) && !(this.id.slice(0, 3) !== "ACT" && parseInt(this.id.slice(3, 4)) === 6)) {
						var id = this.id
						var track = this.id.slice(0, 3)
						var originalPos = parseInt(this.id.slice(3, 4))
						var colour = parseInt(this.id.slice(4, 5))
						var trackToUse
						if (track.slice(0, 2) === "TT") trackToUse = M.techTracks[parseInt(track.slice(2, 3))]
						if (track === "ACT") trackToUse = M.assemblyCapacityTrack
						// Remove from old pos
						trackToUse[originalPos] = trackToUse[originalPos].filter(function (item) {
							return item !== colour
						})

						// Add to new pos
						trackToUse[originalPos + 1].push(colour)
						M.piecesUsedInResearch.push(track + String(originalPos + 1) + String(colour))
						$(".piece").off()

						// Do punch clock
						if (track !== "ACT" && originalPos + 1 === 4) M.punchClockNumber--
						if (track !== "ACT" && originalPos + 1 === 6) M.punchClockNumber--
						if (track === "ACT" && originalPos + 1 === 4) M.punchClockNumber--

						// Recalc Stocks
						if (track === "ACT") {
							// Add stock back in to display dealerships
							for (let i = 0; i < M.players.length; i++) {
								// Each players dealershup produces vehicles accoeding to the assem capac track -- this is simply set to the correct max value
								let factory = M.players[i].factory
								for (let j = 0; j < factory.factoryComponents.length; j++) {
									if (MAINLINES.includes(factory.factoryComponents[j][0])) {
										for (let k = 0; k < M.assemblyCapacityTrack.length; k++) if (M.assemblyCapacityTrack[k].indexOf(M.players[i].colour) > -1) factory.factoryComponents[j][SL_IDX] = k + 1
									}
								}
							}
						}

						// Add to history object
						// colour of piece being moved, TT0 < index, or ACT < track
						M.historyObj.push([colour, C.getTrackCompressedNumberFromID(track.slice(0, 3)), originalPos + 1, M.punchClockNumber])

						V.render(-1)
					}
				}
			})
		}

		// For any moved pieces, indicate whether it was yours or others
		$(".piece").each(function (i, obj) {
			// if not used in research AND NOT(On ACT with different colour) and not
			if (M.piecesUsedInResearch.includes(obj.id)) {
				if (parseInt(obj.id.slice(4, 5)) === C.currentPlayer().colour) {
					$(this).css({
						filter: `drop-shadow(3px 0 0 lightgreen) 
							drop-shadow(0 3px 0 lightgreen)
							drop-shadow(-3px 0 0 lightgreen) 
							drop-shadow(0 -3px 0 lightgreen)`,
					})
				} else {
					$(this).css({
						filter: `drop-shadow(3px 0 0 orange) 
							drop-shadow(0 3px 0 orange)
							drop-shadow(-3px 0 0 orange) 
							drop-shadow(0 -3px 0 orange)`,
					})
				}
			}
		})

		this.addResetButton()

		$("#actions").append("<BR/>")

		_.each(
			M.historyObj,
			function (p, i) {
				var pos = p[2]
				if (p[1] === 5) pos++

				var arrIndex = this.model.players.map((player) => player.colour).indexOf(p[0])
				var playerName = M.players[arrIndex].name
				if (playerName === global.name) playerName = "yourself"

				$("#actions").append(
					"<SPAN id='researchReminderSpan" +
						String(i) +
						"'>" +
						interpolate(
							gettext("You moved %(playerName)s %(playerToken)s to %(techTrack)s %(newPosition)s"),
							{
								playerName: playerName,
								playerToken: Log.getPlayerTokenFromColour(p[0]).prop("outerHTML"),
								techTrack: Log.getTrackNameFromCompressedNumberL(p[1]),
								newPosition: String(pos),
							},
							true
						) +
						"</SPAN><BR/>"
				)

				if (M.players[arrIndex].name === this.currentPlayer().name) {
					$("#researchReminderSpan" + String(i)).css({
						color: "darkgreen",
					})
				} else {
					$("#researchReminderSpan" + String(i)).css({
						color: "chocolate",
					})
				}
			},
			this
		)

		if (researchPonts === 0 || global.debug) {
			this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, gettext("End Turn"))
			$("#finishTurnButton").show()
		}
	}

	this.actionResign = function (e) {
		var c = e.data.controller
		$("#actions").empty()
		// Need to use global.pov otherwise resiginnign in turn order kicks out wrong person
		// THIS JUST ADDS A LOG, AND CHANGES THE NAME / AUTOPLAY
		IO.resign(c.model, c.currentPlayer().name)

		Bot.actionResign(c.model, global.pov)
	}

	this.getTrackCompressedNumberFromID = function (id) {
		if (id === "ACT")
			return 5 //"Assembly Capacity Track";
		else {
			var trackToUse = this.model.techTracks[parseInt(id.slice(2, 3))]
			var colour = trackToUse[7][0]
			if (colour === 0) return 0 //"Speed Techs";
			if (colour === 1) return 1 //"Range Techs";
			if (colour === 2) return 2 //"Design Techs";
			if (colour === 3) return 3 //"Reliability Techs";
			if (colour === 4) return 4 //"Safety Techs";
		}
	}

	/**************************************************************************************************************
	 *
	 * PHASE 2 : Set Focus
	 *
	 **************************************************************************************************************/

	this.enableSetFocusOptions = function () {
		var i = 0
		//V.render(-1);
		$("#actions").empty()

		$("#actions").append(this.view.displayAllDealershipsWithStock())

		var passedPlayers = []
		for (i = 0; i < this.model.prevEngFocusOrder.length; i++) {
			if (!this.model.gameFlow.turnOrder.includes(this.model.prevEngFocusOrder[i]) && !this.model.newEngFocusOrder.includes(this.model.prevEngFocusOrder[i])) passedPlayers.push(this.model.prevEngFocusOrder[i])
		}
		if (passedPlayers.length > 0) {
			$("#actions").append("<BR/>" + gettext("These players have passed and will be inserted in leftover spaces in this order:") + " ")
			for (i = 0; i < passedPlayers.length; i++) {
				$("#actions").append(this.getNameSpan(this.model.players[passedPlayers[i]].colour))
				if (i != passedPlayers.length - 1) $("#actions").append(",")
			}
			$("#actions").append("<BR/>")
		} // end passed players

		$("#actions").append("<BR/><B>" + gettext("Previous Focus Order") + ": </B>")
		$("#actions").append(this.getNameSpan(-1) + "&nbsp;")
		for (i = 0; i < this.model.prevEngFocusOrder.length; i++) {
			$("#actions").append(this.getNameSpan(this.model.players[this.model.prevEngFocusOrder[i]].colour) + "&nbsp;")
		}
		$("#actions").append(this.getNameSpan(10) + "<BR/>")

		if (Rules.anyBotPlayers()) {
			$("#actions").append("<BR/>")
			$("#actions").append(gettext("NOTE: Bot players do not restrict tech access. So the first human player in Eng order will have access to all techs"))
			$("#actions").append("<BR/>")
		}

		$("#actions").append("<BR/><B>" + gettext("Spend all Gantt to choose focus, or keep your Gantt. Remember: reaching 10 Gantt will reduce the punch clock by 1") + "</b><BR/>")

		var div = $("<div/>")
		for (i = 0; i < this.model.newEngFocusOrder.length; i++) {
			if (this.model.newEngFocusOrder[i] == -1) {
				var button
				if (this.model.alreadySetFocus === 0) button = $('<button class="choosePos">' + (i + 1) + "</button> ")
				else button = $("<span>" + (i + 1) + "</span> ")
				button.data("position", i)
				div.append("&nbsp;&nbsp;")
				div.append(button)
				div.append("&nbsp;&nbsp;")
			} else {
				div.append("&nbsp;&nbsp;" + this.getNameSpan(this.model.players[this.model.newEngFocusOrder[i]].colour) + "&nbsp;&nbsp;")
			}
		}
		$("#actions").append(div)
		if (this.model.alreadySetFocus === 0) {
			var keepGanttButton = $("<button id=''>" + gettext("Pass & Keep Gantt") + "</button>")
			keepGanttButton.addClass("actionsLineButton")
			$("#actions").append(keepGanttButton)
			keepGanttButton.on("click", function () {
				M.log(Log.SET_FOCUS, -1)
				M.alreadySetFocus = 1
				C.startActions()
			})
		}

		$(".choosePos").on("click", { controller: this }, choosePosition)
		if (this.model.alreadySetFocus === 1) {
			this.addResetButton()
			this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, "End Turn")
		}
		V.render(-1)
	}

	this.getNameSpan = function (colour) {
		var span
		if (colour === -1) {
			span = "<span class='playerName" + String(colour) + "'>" + gettext("Eng") + " ></span>"
			return span
		} else if (colour === 10) {
			span = "<span class='playerName-1'>< " + gettext("Sales") + "</span>"
			return span
		}
		// get index first
		var index = this.model.players.map((item) => item.colour).indexOf(colour)
		// Then correct colour
		colour = getCorrectedColour(colour)
		span = "<span class='playerName" + String(colour) + "'> " + this.model.players[index].name + " </span>"
		return span
	}

	function choosePosition(e) {
		var c = e.data.controller
		var pos = $(e.currentTarget).data("position")
		var player = c.currentPlayer()
		player.gantt = 0
		c.model.newEngFocusOrder[pos] = player.arrayPos
		M.alreadySetFocus = 1
		M.log(Log.SET_FOCUS, pos)

		C.startActions()
	}

	/**************************************************************************************************************
	 *
	 * PHASE 3 : Factory Build
	 *
	 **************************************************************************************************************/

	this.enableFactoryBuilding = function () {
		var i = 0
		var eligibleFactoryTiles = Rules.getEligibleFactoryComponentNames(this.currentPlayer())
		this.view.displayEligibleFactoryTiles(this.currentPlayer(), eligibleFactoryTiles)
		$("#actions").empty()
		if (global.move) $("#actions").append("<B><span style='color: red'>" + gettext("Previous players used up the components. Please rearrange your factory") + "</span></B><BR/>")
		if (!Rules.canPlay()) {
			$("#actions").append("<B><span style='color: red'><br/>" + gettext("IT IS NOT YET YOUR TURN. You will be able to fix your factory on your turn") + "</span></B><BR/>")
		}

		$("#actions").append(gettext("Place components into your factory"))

		if (Rules.anyBotPlayers()) {
			$("#actions").append("<BR/>")
			$("#actions").append("<BR/>")
			$("#actions").append(gettext("NOTE: Bot players do not restrict tech access. So the first human player in Eng order will have access to all techs"))
			$("#actions").append("<BR/>")
		}

		if (!this.model.trainingGame) {
			if (global.currentPlayers.indexOf(global.name) === 0) $("#actions").append("<BR/><B>" + gettext("You are the current player. You can use any available component") + "</B>")
			else $("#actions").append("<BR/><B>" + gettext("You are not the current player. If previous players use up components that you also use, you will need to modify your factory") + "</B>")
		}
		$("#actions").append("<BR/>")

		this.addResetButton()

		var undoButton = $("<button id='undoButton'>" + gettext("Remove Last Component") + "</button>")
		undoButton.addClass("actionsLineButton")
		$("#actions").append(undoButton)
		undoButton.on("click", this.clickedOnRemoveLastComponent)

		if (!this.model.trainingGame) {
			var saveFactoryWithoutEndingTurnButton = $("<button id='saveWithoutEndingTurnButton'>" + gettext("Save Without Ending Turn") + "</button>")
			saveFactoryWithoutEndingTurnButton.addClass("actionsLineButton")
			saveFactoryWithoutEndingTurnButton.on("click", IO.saveFactoryWithoutEndingTurn)
			$("#actions").append(saveFactoryWithoutEndingTurnButton)
		}

		// Need to add then hide
		var endBuildingButton = $("<button id='finishTurnButton'>" + gettext("Finish Building") + "</button>")
		endBuildingButton.addClass("actionsLineButton")
		$("#actions").append(endBuildingButton)
		endBuildingButton.on("click", function () {
			//$("#QSPdiv").remove(); NO EFFECT - JUST GETS READDED!
			// BEFORE WE EXPAND, NEED TO CAPTURE WHAT WAS ADDED THIS TURN
			if (!M.trainingGame) {
				var factory = M.players[global.pov].factory
				factory.factoryComponentNamesAddedThisTurn = factory.factoryComponentNamesAddedThisTurn.splice(0, factory.factoryComponenetIndexesAddedThisTurn.length)
				for (i = 0; i < factory.factoryComponenetIndexesAddedThisTurn.length; i++) {
					var arrayIndex = _.findIndex(
						factory.factoryComponents,
						function (el) {
							return el[1] === factory.factoryComponenetIndexesAddedThisTurn[i]
						},
						this
					)
					// NEEDED TO FIX GAMES BREAKING
					try {
						factory.factoryComponentNamesAddedThisTurn.push(factory.factoryComponents[arrayIndex][0])
					} catch {
						// Do nothing
					}
				}
				if (factory.factoryDataBeforeExpansion.length === 0) {
					factory.factoryDataBeforeExpansion.push(factory.export())
					factory.factoryDataBeforeExpansion.push([...M.availableComponents])
				}
				// END CAPTURE

				factory.factoryDataBeforeExpansion = compressObjectToDB(factory.factoryDataBeforeExpansion)
			}
			C.enableFactoryExpansion()
		})
		if (global.name !== "BotKickStarter") $("#finishTurnButton").hide()

		V.render()
		V.updateQSPdiv(this.currentPlayer())
	}

	this.clickedOnRemoveLastComponent = function () {
		$("#newComponentDiv").remove()
		if (C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length > 0) {
			C.currentPlayer().factory.removeComponentAtIndex(C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn[C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length - 1])

			// refresh components
			V.displayEligibleFactoryTiles(C.currentPlayer(), Rules.getEligibleFactoryComponentNames(C.currentPlayer()))

			V.render()
			$("#newComponentDiv").remove()
			V.updateQSPdiv(C.currentPlayer())
		}
	}

	this.enableFactoryExpansion = function () {
		global.sandboxReset = compressObjectToDB(M.export())
		this.model.subphase = 0
		this.model.gameFlow.subphase = 0
		global.undoExpansionReset = compressObjectToDB(M.export())
		this.model.subphase = 1
		$("#actions").empty()
		$(".piece").off()
		$("#actions").empty()
		$("#eligibleComponentsDiv").empty()
		$("#actions").append(gettext("Expand your Factory") + "<BR/>")

		this.addResetButton(gettext("Reset Whole Factory"))

		var undoExpansionResetButton = $("<button id='resetTotalButton222'>" + gettext("Go back to Factory Building") + "</button>")
		undoExpansionResetButton.addClass("actionsLineButton")
		$("#actions").append(undoExpansionResetButton)
		undoExpansionResetButton.on("click", function () {
			M.historyObj.splice(0, M.historyObj.length)
			C.reloadModel(global.undoExpansionReset)
		})

		this.model.gameFlow.subphase = 1
		global.expansionReset = compressObjectToDB(this.model.export())

		this.currentPlayer().factory.showPossibleExpansionAreas()
		if (M.trainingGame) V.render()

		if (global.name === "BotKickStarter") C.addFinishTurnButton(M.gameFlow.turn, M.gameFlow.phase, gettext("End Turn"))
	}

	///////////////////////////////////////////////////// SANDBOX FACTORY /////////////////////////////////////////////////////////////////
	this.enableFactoryBuildingSandbox = function () {
		var i = 0
		var eligibleFactoryTiles = Rules.getEligibleFactoryComponentNames(this.currentPlayer())
		this.view.displayEligibleFactoryTiles(this.currentPlayer(), eligibleFactoryTiles)
		$("#actions").empty()
		$("#actions").append("<B><span class='sandboxWarning'>" + gettext("SANDBOX MODE - USE THE BUTTON TO EXIT SANDBOX MODE") + "</span></B><BR/>")

		$("#actions").append(gettext("Place components into your factory"))

		var undoButton = $("<button id='undoButton'>" + gettext("Remove Last Component") + "</button>")
		undoButton.addClass("actionsLineButton")
		undoButton.css({ width: "200px" })
		$("#actions").append(undoButton)
		undoButton.on("click", function () {
			$("#newComponentDiv").remove()
			if (C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length > 0) {
				C.currentPlayer().factory.removeComponentAtIndex(C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn[C.currentPlayer().factory.factoryComponenetIndexesAddedThisTurn.length - 1])
				// refresh components
				V.displayEligibleFactoryTiles(C.currentPlayer(), Rules.getEligibleFactoryComponentNames(C.currentPlayer()))
				V.render()
				$("#newComponentDiv").remove()
				V.updateQSPdiv(C.currentPlayer())
			}
		})

		// Need to add then hide
		var endBuildingButton = $("<button id='finishTurnButton'>" + gettext("Expand Factory") + "</button>")
		endBuildingButton.addClass("actionsLineButton")
		$("#actions").append(endBuildingButton)
		endBuildingButton.on("click", function () {
			C.enableFactoryExpansionSandbox()
		})
		$("#finishTurnButton").hide()

		var exitSandboxButton = $("<button id='exitSandboxButton'>" + gettext("Exit Sandbox Mode") + "</button>")
		exitSandboxButton.addClass("actionsLineButton")
		$("#actions").append(exitSandboxButton)
		exitSandboxButton.on("click", function () {
			$("#nudgeDiv").remove()
			if (M.gameFlow.phase === PHASE_BUILD_FACTORY) C.reloadModel(global.sandboxReset)
			else C.reloadModel(global.fullreset)
		})

		V.render()
	}

	///////////////////////////////////////////////////// SANDBOX EXPANSION /////////////////////////////////////////////////////////////////
	this.enableFactoryExpansionSandbox = function () {
		this.model.subphase = 1
		$("#actions").empty()
		$(".piece").off()
		$("#actions").empty()
		$("#eligibleComponentsDiv").empty()
		$("#actions").append("<B><span class='sandboxWarning'>" + gettext("SANDBOX MODE - REFRESH THE PAGE OR USE THE BUTTON TO EXIT SANDBOX MODE") + "</span></B><BR/>")

		$("#actions").append(gettext("Expand your Factory") + "<BR/>")

		var exitSandboxButton = $("<button id='exitSandboxButton'>" + gettext("Exit Sandbox Mode") + "</button>")
		exitSandboxButton.addClass("actionsLineButton")
		$("#actions").append(exitSandboxButton)
		exitSandboxButton.on("click", function () {
			if (M.gameFlow.phase === PHASE_BUILD_FACTORY) C.reloadModel(global.sandboxReset)
			else C.reloadModel(global.fullreset)
		})

		this.model.gameFlow.subphase = 1
		this.currentPlayer().factory.showPossibleExpansionAreas()
		V.render()
	}

	///////////////////////////////////////////////////// SANDBOX /////////////////////////////////////////////////////////////////
	this.addEndExpansionSandboxButton = function () {
		$("#endExpansionSandboxButton").remove()

		var endExpansionSandboxButton = $("<button id='endExpansionSandboxButton'>" + gettext("Start Building Again") + "</button>")
		endExpansionSandboxButton.addClass("actionsLineButton")
		$("#actions").append(endExpansionSandboxButton)
		endExpansionSandboxButton.on("click", function () {
			C.currentPlayer().factory.collapseFactoryAfterExpansion()
			$("#nudgeDiv").remove()
			C.startActions()
		})
	}
	///////////////////////////////////////////////////// SANDBOX /////////////////////////////////////////////////////////////////

	/**************************************************************************************************************
	 *
	 * PHASE 5 : Sell
	 *
	 **************************************************************************************************************/

	this.enableSell = function () {
		$(".marketSelectable").remove()
		$(".marketSelectable").off()
		$(".marketIneligible").remove()
		$(".marketIneligible").off()

		var i = 0
		var j = 0
		var stock
		var dshipDiv
		if (this.model.MWrotation == undefined) this.model.MWrotation = 0
		$("#actions").empty()
		$("#actions").append("<B>" + gettext("Choose a dealership, place a Market Window, then if possible, sell to a niche<BR/>Once you select a dealership, you can rotate the market window using the buttons that appear underneath the dealerships") + "</b><BR/>")

		var p = this.currentPlayer()
		var dealershipsDiv = $("<div></div>")
		dealershipsDiv.css({
			position: "relative",
			display: "flex",
			"flex-wrap": "wrap",
			"justify-content": "center",
			width: "fit-content",
			height: "fit-content",
			padding: "3px",
			margin: "0 auto",
		})

		var includeNoMWduds = false
		for (i = 0; i < p.factory.factoryComponents.length; i++) {
			if (DEALERSHIPS.includes(p.factory.factoryComponents[i][0])) {
				if (Rules.isDealershipSuitableToDisplay(p, p.factory.factoryComponents[i], false)) {
					includeNoMWduds = true
					break
				}
			}
		}

		for (i = 0; i < p.factory.factoryComponents.length; i++) {
			if (DEALERSHIPS.includes(p.factory.factoryComponents[i][0])) {
				if (Rules.isDealershipSuitableToDisplay(p, p.factory.factoryComponents[i], includeNoMWduds)) {
					stock = p.factory.getStockForDealership(p.factory.factoryComponents[i])
					dshipDiv = V.getDealershipSellingDiv(p.factory.factoryComponents[i], stock, true, this.model.gameFlow.turnOrder[0])
					dealershipsDiv.append(dshipDiv)
				}
			}
		}
		for (j = 1; j < this.model.gameFlow.turnOrder.length; j++) {
			includeNoMWduds = false
			for (i = 0; i < this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents.length; i++) {
				if (DEALERSHIPS.includes(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i][0])) {
					if (Rules.isDealershipSuitableToDisplay(this.model.players[this.model.gameFlow.turnOrder[j]], this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], false)) {
						includeNoMWduds = true
						break
					}
				}
			}

			for (i = 0; i < this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents.length; i++) {
				if (DEALERSHIPS.includes(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i][0])) {
					if (Rules.isDealershipSuitableToDisplay(this.model.players[this.model.gameFlow.turnOrder[j]], this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], includeNoMWduds)) {
						stock = this.model.players[this.model.gameFlow.turnOrder[j]].factory.getStockForDealership(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i])
						dshipDiv = V.getDealershipSellingDiv(this.model.players[this.model.gameFlow.turnOrder[j]].factory.factoryComponents[i], stock, false, this.model.gameFlow.turnOrder[j])
						dealershipsDiv.append(dshipDiv)
					}
				}
			}
		}

		$("#actions").append(dealershipsDiv)
		if (global.debug) this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, "Debug End")
	}

	this.clickedOnDealershipOther = function (e) {
		$(".marketIneligible").remove()
		$(".marketSelectable").remove()
		$("#MWrotationDiv").remove()
		if (e.data.dealership[MW_IDX][0] == -1) {
			// Get all squares that can't meet tech and highlight red
			var nichesEligibility = M.getNichesEligibilityForDealership(e.data.dealership)

			V.drawMarketSquares(nichesEligibility[0], "green", "marketSelectable")
			V.drawMarketSquares(nichesEligibility[1], "red", "marketIneligible")
		} else {
			// Highlight the market window squares
			var inelgibile = []
			var eligiible = []
			var coveredIndexes = M.getCoveredIndexesOfMarketWindow(e.data.dealership[MW_IDX][0], e.data.dealership[MW_IDX][1], e.data.dealership[MW_IDX][2])
			var stock = e.data.stocks

			for (var i = 0; i < coveredIndexes.length; i++) {
				if ((M.marketBoard[coveredIndexes[i]][3] > 0 && stock[0] > 0) || (M.marketBoard[coveredIndexes[i]][4] > 0 && stock[1] > 0) || (M.marketBoard[coveredIndexes[i]][5] > 0 && stock[2] > 0)) eligiible.push(coveredIndexes[i])
				else inelgibile.push(coveredIndexes[i])
			}

			V.drawMarketSquares(eligiible, "green", "marketSelectable")
			V.drawMarketSquares(inelgibile, "red", "marketIneligible")
		}
		$(".marketSelectable").mouseover(function () {
			$(".marketSelectable").remove()
			$(".marketSelectable").off()
			$(".marketIneligible").remove()
			$(".marketIneligible").off()
		})
		$(".marketIneligible").mouseover(function () {
			$(".marketSelectable").remove()
			$(".marketSelectable").off()
			$(".marketIneligible").remove()
			$(".marketIneligible").off()
		})
	}

	// WARNING: THIS is now Div ELEMENT
	this.clickedOnDealership = function (e) {
		if (M.preventMultipleDealershipUses !== e.data.dealership[0] && M.preventMultipleDealershipUses !== -1) return
		// Chcek if no sales window placed
		$(".marketIneligible").remove()
		$(".marketSelectable").remove()
		M.historyObj.splice(0, M.historyObj.length)
		M.historyObjV2.splice(0)

		M.historyObj.push(e.data.dealership[0])
		M.historyObjV2.push(e.data.dealership[0])

		if (e.data.dealership[MW_IDX][0] == -1) {
			C.enableMarketWindowPlacement(e.data.dealership)
			M.historyObj.push(-1)
			M.historyObjV2.push([0, -1, -1])
		} else {
			M.historyObj.push(e.data.dealership[MW_IDX][0])
			let HISTindex = e.data.dealership[MW_IDX][0]
			const MWsize = e.data.dealership[MW_IDX][2]
			if (MWsize === 0 && e.data.dealership[MW_IDX][1] === 1) HISTindex--
			else if (MWsize === 0 && e.data.dealership[MW_IDX][1] === 2) HISTindex -= 8
			else if (MWsize === 1) HISTindex--
			else if (MWsize === 2) HISTindex -= 2
			M.historyObjV2.push([1, HISTindex, MWsize])
			if (MWsize === 0 && ![0, 2].includes(e.data.dealership[MW_IDX][1])) M.historyObjV2[M.historyObjV2.length - 1].push(1)

			C.enableSellingForDealership(e.data.dealership)
		}
	}

	this.enableMarketWindowPlacement = function (dealership) {
		this.model.MWrotation = 0
		var p = this.currentPlayer()
		// Get the market window size
		var adjMarketingDeparmentData = p.factory.getAllComponentDataOfDirectConnectionsToComponentIndex(dealership[1])
		adjMarketingDeparmentData = adjMarketingDeparmentData.filter(function (componenet) {
			return DEPARTMENTS_MARKETING.includes(componenet[0])
		})
		var MWsize = Math.min(2, adjMarketingDeparmentData.length)
		// add rotation area
		C.addResetButton()
		$("#MWrotationDiv").remove()
		var MWrotationDiv = $("<div></div>")
		MWrotationDiv.attr("id", "MWrotationDiv")
		var buttonL = $("<img>")
		var buttonR = $("<img>")
		var svgRot = $("<img>")
		buttonL.attr("src", imagePreURL + "/rot_anticlockwise.svg")
		buttonR.attr("src", imagePreURL + "/rot_clockwise.svg")
		svgRot.attr("src", imagePreURL + "/mw_0.svg")
		svgRot.attr("id", "svgRot")

		if (MWsize === 0) svgRot.attr("src", imagePreURL + "/mw_0.svg")
		else if (MWsize === 1) svgRot.attr("src", imagePreURL + "/mw_1.svg")
		else if (MWsize === 2) svgRot.attr("src", imagePreURL + "/mw_2.svg")
		buttonL.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "5px",
		})
		buttonR.css({
			width: "" + "50px",
			height: "" + "50px",
			border: "1px solid black",
			"border-radius": "5px",
		})
		svgRot.css({
			width: "50px",
			height: "50px",
		})

		MWrotationDiv.append(buttonL)
		MWrotationDiv.append("&nbsp;&nbsp;")
		MWrotationDiv.append(svgRot)

		MWrotationDiv.append("&nbsp;&nbsp;")
		MWrotationDiv.append(buttonR)

		$("#actions").append(MWrotationDiv)

		if (MWsize > 0) {
			this.model.MWrotation = 1
			$("#svgRot").addClass("r" + String(M.MWrotation))
		}

		buttonR.on("click", function () {
			$("#svgRot").removeClass("r" + String(M.MWrotation))
			M.MWrotation++
			if (M.MWrotation === 4) M.MWrotation = 0
			$("#svgRot").addClass("r" + String(M.MWrotation))
		})
		buttonL.on("click", function () {
			$("#svgRot").removeClass("r" + String(M.MWrotation))
			M.MWrotation--
			if (M.MWrotation === -1) M.MWrotation = 3
			$("#svgRot").addClass("r" + String(M.MWrotation))
		})
		V.addHighlightsOnMouseOverToElement(buttonR)
		V.addHighlightsOnMouseOverToElement(buttonL)

		// Get all squares that can't meet tech and highlight red
		var nichesEligibility = this.model.getNichesEligibilityForDealership(dealership)

		V.drawMarketSquares(nichesEligibility[0], "green", "marketSelectable")
		V.drawMarketSquares(nichesEligibility[1], "red", "marketIneligible")
		$("#wholeMarketBoardDiv .marketSelectable").on("click", { self: self, dealership: dealership, MWsize: MWsize }, V.tryToPlaceMarketWindow)
		$("#wholeMarketBoardDiv .marketSelectable").on("mouseover", { self: self, dealership: dealership, MWsize: MWsize }, V.nicheMouseOnHighlight)
	}

	this.enableSellingForDealership = function (dealership, fromMWplacement) {
		var sellingNichesEligibility = this.model.getSellingNichesEligibilityForDealership(C.currentPlayer(), dealership)
		if (sellingNichesEligibility[0].length == 0) {
			M.historyObj.push(-1)
			M.historyObjV2.push(-1)
			$("#actions").empty()
			$("#actions").append(gettext("No sales possible"))
			dealership[SE_IDX] = -1

			C.addResetButton()

			C.addFinishTurnButton(M.gameFlow.turn, M.gameFlow.phase, gettext("End turn"))
		} else {
			if (!fromMWplacement) C.addResetButton()

			V.drawMarketSquares(sellingNichesEligibility[0], "green", "marketSelectable")
			V.drawMarketSquares(sellingNichesEligibility[1], "red", "marketIneligible")
			$("#wholeMarketBoardDiv .marketSelectable").on("click", { self: self, dealership: dealership }, C.processSalesClick)
		}
	}

	this.processSalesClick = function (e) {
		var MBindex = $(e.currentTarget).data("index")
		var dealership = e.data.dealership
		C.actionSales(MBindex, dealership, false)
	}

	this.actionSales = function (MBindex, dealership, autoSale) {
		var p = C.currentPlayer()
		var stock = p.factory.getStockForDealership(dealership)

		var histTotalIncome = 0
		var histSales = [
			[0, 0, -1],
			[0, 0, -1],
			[0, 0, -1],
		]

		for (var i = 0; i < stock.length; i++) {
			if (stock[i] > 0 && M.marketBoard[MBindex][3 + i] > 0) {
				while (stock[i] > 0 && M.marketBoard[MBindex][3 + i] > 0) {
					// Remove from local stock data
					stock[i]--
					histSales[i][0]++
					histSales[i][2] = MBindex
					// Remove from factory data
					p.factory.removeItemFromMainlineAdjacentToDealership(dealership, i)
					// Remove from niche
					M.marketBoard[MBindex][3 + i]--
					// Add players money
					if (PRICE_BAND_0_SQS.includes(MBindex)) {
						p.money += M.priceBand[0]
						histSales[i][1] = M.priceBand[0]
						histTotalIncome += M.priceBand[0]
					} else if (PRICE_BAND_1_SQS.includes(MBindex)) {
						p.money += M.priceBand[1]
						histSales[i][1] = M.priceBand[1]
						histTotalIncome += M.priceBand[1]
					} else if (PRICE_BAND_2_SQS.includes(MBindex)) {
						p.money += M.priceBand[2]
						histSales[i][1] = M.priceBand[2]
						histTotalIncome += M.priceBand[2]
					} else if (PRICE_BAND_3_SQS.includes(MBindex)) {
						p.money += M.priceBand[3]
						histSales[i][1] = M.priceBand[3]
						histTotalIncome += M.priceBand[3]
					}
					// 1 bonus for truck, 2 for sports
					histTotalIncome += i
					p.money += i
				}
			}
		}

		// NEEDED TO SOLVE ENDLESS LOOP ISSUE (but this alone can prevent final sale. Fix in RULES skip)
		if (histTotalIncome === 0) autoSale = false

		if (autoSale) {
			// Must come from a placed MW
			M.historyObj.push(dealership[0])
			M.historyObj.push(dealership[MW_IDX][0])
			M.historyObjV2.push(dealership[0])
			let HISTindex = dealership[MW_IDX][0]
			const MWsize = dealership[MW_IDX][2]
			if (MWsize === 0 && dealership[MW_IDX][1] === 1) HISTindex--
			else if (MWsize === 0 && dealership[MW_IDX][1] === 2) HISTindex -= 8
			else if (MWsize === 1) HISTindex--
			else if (MWsize === 2) HISTindex -= 2

			M.historyObjV2.push([1, HISTindex, MWsize])
			if (MWsize === 0 && ![0, 2].includes(dealership[MW_IDX][1])) M.historyObjV2[M.historyObjV2.length - 1].push(1)
		}
		M.historyObj.push(histSales)
		M.historyObj.push(histTotalIncome)
		M.historyObjV2.push(histSales)
		M.historyObjV2.push(histTotalIncome)

		// If auto selling, add the history now
		if (autoSale) {
			M.historyObj.push(1)
			M.historyObjV2.push(1)
			//M.log(Log.SALES, [...M.historyObj], M.gameFlow.turnOrder[0])
			M.log(Log.SALES_V2, [...M.historyObjV2], M.gameFlow.turnOrder[0])
			M.historyObj.splice(0, M.historyObj.length)
			M.historyObjV2.splice(0)
			M.justAutoSold = true
		}

		// End turn / undo
		V.render()

		// remove highlights
		$(".marketSelectable").remove()
		$(".marketSelectable").off()
		$(".marketIneligible").remove()
		$(".marketIneligible").off()

		$("#actions").empty()
		$("#actions").append("Sales Complete")

		C.addResetButton()

		C.addFinishTurnButton(M.gameFlow.turn, M.gameFlow.phase, gettext("End turn"))
	}

	/**************************************************************************************************************
	 *
	 * PHASE 8 : Grow Demands
	 *
	 **************************************************************************************************************/

	this.enableGrowDemands = function () {
		var i = 0
		// delete info from build
		delete global.move
		for (i = 0; i < this.model.players.length; i++) {
			this.model.players[i].factory.factoryComponenetIndexesAddedThisTurn.splice(0, this.model.players[i].factory.factoryComponenetIndexesAddedThisTurn.length)
		}

		$("#actions").empty()
		$("#actions").append(this.view.displayAllDealershipsWithStock())

		$("#actions").append("<B>" + gettext("Choose a card, then select the quadrant you wish to add it to") + "</b><BR/>")
		var p = this.currentPlayer()
		var availableCardsDiv = $("<div></div>")
		availableCardsDiv.css({
			position: "relative",
			display: "flex",
			floar: "left",
			width: "fit-content",
			height: "fit-content",
			padding: "3px",
			margin: "0 auto",
		})
		var possibleCards = []
		var maxCard = 17
		if (this.model.gameFlow.turn === 1) maxCard = 3
		if (this.model.gameFlow.turn === 2) maxCard = 9
		if (this.model.gameFlow.turn === 3) maxCard = 15
		for (i = 0; i < p.playerCards.length; i++) {
			if (p.playerCards[i] <= maxCard) possibleCards.push(p.playerCards[i])
		}
		var availCardsDiv = V.getAvailableCardsDiv(p.colour, possibleCards)

		availableCardsDiv.append(availCardsDiv)
		$("#actions").append(availableCardsDiv)
		var alreadyPlayedCardsDiv = V.getAlreadyPlayedCardsDiv()
		$("#actions").append(alreadyPlayedCardsDiv)
		if (global.debug) this.addFinishTurnButton(this.model.gameFlow.turn, this.model.gameFlow.phase, "End Debug")
	}

	// WARNING: THIS is now Div ELEMENT
	this.clickedOnCard = function (e) {
		V.render(-1)
		$(".availableCardsImg").removeClass("activeCard")
		$(".availableCardsImg").css({ border: "3px solid black" })
		this.classList.add("activeCard")
		this.style.border = "3px solid lightgreen"
		C.currentPlayer.pcap = e.data.pcap
		V.enableQuadrantSelectionForCard(this.id)
	}

	this.clickedOnQ = function (e) {
		var Q = parseInt(this.id.slice(1, 2))
		var cardName = $(e.currentTarget).data("card").slice(4)
		var cardData = getCardDataFromCardName(cardName)
		M.alreadyPlayedCards.push([C.currentPlayer().colour, Q, cardData, cardName])
		// Remove card from player

		M.log(Log.PLAY_CARD, [Q])

		C.currentPlayer().playerCards.splice(C.currentPlayer.pcap, 1)
		delete C.currentPlayer.pcap

		V.render(-1)
		$("#actions").empty()

		$("#actions").append("")
		var alreadyPlayedCardsDiv = V.getAlreadyPlayedCardsDiv()
		$("#actions").append(alreadyPlayedCardsDiv)

		C.addResetButton()

		C.addFinishTurnButton(M.gameFlow.turn, M.gameFlow.phase, gettext("End Turn"))
	}

	/**************************************************************************************************************
	 *
	 * End Turn ETC
	 *
	 **************************************************************************************************************/

	this.endPlayerTurn = function () {
		$("#nudgeDiv").remove()
		if (this.model.sandboxMode) {
			alert(gettext("You are in sandbox mode. Please refresh the page"))
			return
		}
		delete global.expansionReset
		this.model.gameFlow.subphase = 0

		// Log action
		if (this.model.gameFlow.phase === PHASE_FACTORY_SETUP) {
			this.model.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn.splice(0, this.model.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn.length)
			this.model.log(Log.FACTORY_SETUP, [])
		} else if (this.model.gameFlow.phase === PHASE_RESEARCH) {
			this.model.log(Log.RESEARCH, [...this.model.historyObj], this.model.gameFlow.turnOrder[0])
			this.model.historyObj.splice(0, this.model.historyObj.length)
		} else if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			// Need to finish off the expansion process
			this.currentPlayer().factory.collapseFactoryAfterExpansion()
			// needs a render, but this is done at the end
		} 
		// NB sales phase is handled in its own function
		else if (this.model.gameFlow.phase === PHASE_GROW_DEMANDS) {
			// remove here, as all players will make this move
			this.model.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn.splice(0, this.model.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn.length)
		}

		// Clear vars
		delete global.fullreset
		this.model.setupSubPhase = 0
		this.model.piecesUsedInResearch.splice(0, this.model.piecesUsedInResearch.length)
		this.model.alreadySetFocus = 0

		// remove action areas
		$(".piece").off()
		$("#actions").empty()
		$("#eligibleComponentsDiv").empty()

		// add current player to ready
		this.model.gameFlow.ready.push(this.currentPlayer())
		//  remove current player from turnOrder
		// remove player form turn order

		if (!Rules.isSimulPhase()) this.model.gameFlow.turnOrder.splice(0, 1)
		else if (this.model.gameFlow.turn === 0) {
			var index = this.model.gameFlow.turnOrder.indexOf(global.pov)
			this.model.gameFlow.turnOrder.splice(index, 1)
		}

		if (this.model.gameFlow.turn === 0) {
			if (this.model.trainingGame) IO.saveGame(this.model)
			else IO.saveTurnZeroMove(this.model)
		} else if (this.model.gameFlow.phase !== PHASE_BUILD_FACTORY) {
			IO.saveGame(this.model)
		} else if (this.model.gameFlow.phase === PHASE_BUILD_FACTORY) {
			// Cannot be sure if we are first in turn order or not
			if (M.trainingGame) IO.saveGame(this.model)
			else IO.saveFactoryMove(this.model, this.model.players[global.pov])
		}

		if (M.trainingGame) V.render()

		if (this.model.gameFlow.turnOrder.length > 0) {
			this.model.gameFlow.currentPlayer = this.model.gameFlow.turnOrder[0]
			if (MARKET_BOARD_PHASES.includes(this.model.gameFlow.phase)) V.render(-1)
			if (M.trainingGame) this.startActions()
		}
	}

	this.endPlayerSalesTurn = async function () {
		if (this.model.sandboxMode) {
			alert(gettext("You are in sandbox mode. Please refresh the page"))
			return
		}

		if (this.model.players[this.model.gameFlow.turnOrder[0]].name !== "HcBot") {
			//this.model.log(Log.SALES, [...this.model.historyObj], this.model.gameFlow.turnOrder[0])
			this.model.log(Log.SALES_V2, [...this.model.historyObjV2], this.model.gameFlow.turnOrder[0])
		}
		this.model.historyObj.splice(0, this.model.historyObj.length)
		this.model.historyObjV2.splice(0)

		delete global.fullreset

		this.model.preventMultipleDealershipUses = -1
		this.model.MWrotation = 0
		$(".piece").off()
		$("#actions").empty()
		$("#eligibleComponentsDiv").empty()
		// remove MB highlights
		$(".marketIneligible").remove()
		$(".marketSelectable").remove()
		// Move player to back of queue
		this.model.gameFlow.turnOrder.push(this.model.gameFlow.turnOrder.shift())
		while (this.model.gameFlow.turnOrder.length > 0 && Rules.canSkipCurrentSellingPlayer(this.model.players[this.model.gameFlow.turnOrder[0]])[0] && this.model.gameFlow.phase === PHASE_SELL) {
			if (!this.model.justAutoSold) this.model.gameFlow.ready.push(this.currentPlayer())
			if (!this.model.justAutoSold) this.model.log(Log.SALES_SKIP, Rules.canSkipCurrentSellingPlayer(this.model.players[this.model.gameFlow.turnOrder[0]])[1])

			if (!this.model.justAutoSold) this.model.gameFlow.turnOrder.splice(0, 1)

			if (this.model.justAutoSold) this.model.gameFlow.turnOrder.push(this.model.gameFlow.turnOrder.shift())
			this.model.justAutoSold = false
		}

		if (this.model.gameFlow.turnOrder.length !== 0) {
			// Do a save now
			IO.saveGame(this.model)
			V.render(-1)
		}
		if (this.model.gameFlow.turnOrder.length === 0) {
			this.moveToNextPhase()
			await IO.saveGame(this.model)
		} else this.startActions()
	}

	this.moveToNextPhase = function () {
		var i = 0
		var j = 0
		var k = 0
		var factory

		// clear all ready players
		this.model.gameFlow.ready.splice(0, this.model.gameFlow.ready.length)

		var oldPhase = this.model.gameFlow.phase
		if (oldPhase === PHASE_FACTORY_SETUP) {
			if (!this.model.trainingGame) {
				for (i = 0; i < this.model.players.length; i++) {
					this.model.log(Log.FACTORY_SETUP, [], i, Math.round((new Date().getTime() - IO.timeOffset) / 1000) - (6 - i))
				}
			}

			Rules.playNeutralCards() // MOVE THIS AFTER FIRST FAC SETUP
			Rules.setCurrentMarketBoardPrices()

			this.model.gameFlow.turn = 1
			this.model.log(Log.NEW_TURN, [this.model.gameFlow.turn])
			this.model.gameFlow.phase = PHASE_RESEARCH
			this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]
			this.model.gameFlow.currentPlayer = this.model.gameFlow.turnOrder[0]
			this.model.piecesUsedInResearch.splice(0, this.model.piecesUsedInResearch.length)
			V.render(-1)
		} else if (oldPhase === PHASE_RESEARCH) {
			// Start SET FOCUS
			this.model.gameFlow.phase = PHASE_SET_FOCUS

			// Check vars are empty
			this.model.prevEngFocusOrder.splice(0, this.model.prevEngFocusOrder.length)
			this.model.newEngFocusOrder.splice(0, this.model.newEngFocusOrder.length)

			// set up vars
			this.model.prevEngFocusOrder = [...this.model.gameFlow.unalteredTurnOrder]
			for (i = 0; i < this.model.players.length; i++) this.model.newEngFocusOrder.push(-1)

			var ganttOrder = []
			for (i = 0; i < this.model.prevEngFocusOrder.length; i++) {
				ganttOrder.push([this.model.prevEngFocusOrder[i], this.model.players[this.model.prevEngFocusOrder[i]].gantt])
			}

			ganttOrder.sort(function (a, b) {
				return b[1] - a[1]
			})
			for (i = 0; i < ganttOrder.length; i++) {
				this.model.gameFlow.turnOrder.push(ganttOrder[i][0])
			}
			this.model.gameFlow.unalteredTurnOrder = [...this.model.gameFlow.turnOrder]
			V.render(-1)
		} else if (oldPhase === PHASE_SET_FOCUS) {
			// Need to fill up new eng focus with leftover people
			// It just works in reverse
			for (i = this.model.newEngFocusOrder.length - 1; i >= 0; i--) {
				if (this.model.newEngFocusOrder[i] === -1) {
					// replace with first unused number in oldOld
					for (j = 0; j < this.model.prevEngFocusOrder.length; j++) {
						if (!this.model.newEngFocusOrder.includes(this.model.prevEngFocusOrder[j])) this.model.newEngFocusOrder[i] = this.model.prevEngFocusOrder[j]
					}
				}
			}

			// Start BUILD FACTORY
			this.model.gameFlow.phase = PHASE_BUILD_FACTORY

			this.model.gameFlow.turnOrder = [...this.model.newEngFocusOrder]
			this.model.gameFlow.unalteredTurnOrder = [...this.model.gameFlow.turnOrder]

			// set up vars
		} else if (oldPhase === PHASE_BUILD_FACTORY) {
			// start Print Sales Brochues
			this.model.gameFlow.phase = PHASE_PRINT_SALES_BROCHURES

			// Each player increases gantt by no. planning offices.
			var ganttHist = []
			for (i = 0; i < this.model.players.length; i++) {
				if (this.model.players[i].autoplay !== true) {
					var clockReduction = 0
					if (this.model.players[i].gantt < 10 && this.model.players[i].gantt + Rules.getNumberOfPlanningOffices(this.model.players[i]) >= 10) clockReduction = 1

					this.model.players[i].gantt += Rules.getNumberOfPlanningOffices(this.model.players[i])
					// limit to max 20
					this.model.players[i].gantt = Math.min(20, this.model.players[i].gantt)

					this.model.punchClockNumber -= clockReduction
					ganttHist.push([this.model.players[i].name, Rules.getNumberOfPlanningOffices(this.model.players[i]), clockReduction])
				}
				// Each players dealershup produces vehicles accoeding to the assem capac track
				factory = this.model.players[i].factory
				for (j = 0; j < factory.factoryComponents.length; j++) {
					if (MAINLINES.includes(factory.factoryComponents[j][0])) {
						for (k = 0; k < this.model.assemblyCapacityTrack.length; k++) if (this.model.assemblyCapacityTrack[k].indexOf(this.model.players[i].colour) > -1) factory.factoryComponents[j][SL_IDX] = k + 1
					}
				}
			}
			this.model.log(Log.INCREASE_GANTT, [...ganttHist], -1)

			// Each players dealershup produces car

			this.model.gameFlow.phase = PHASE_SELL

			this.model.gameFlow.unalteredTurnOrder.reverse()
			this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]

			// Check if we can skip the 1st player
			while (this.model.gameFlow.turnOrder.length > 0 && Rules.canSkipCurrentSellingPlayer(this.model.players[this.model.gameFlow.turnOrder[0]])[0] && this.model.gameFlow.phase === PHASE_SELL) {
				this.model.gameFlow.ready.push(this.currentPlayer())

				this.model.log(Log.SALES_SKIP, Rules.canSkipCurrentSellingPlayer(this.model.players[this.model.gameFlow.turnOrder[0]])[1])

				this.model.gameFlow.turnOrder.splice(0, 1)
				if (this.model.gameFlow.turnOrder.length === 0) this.moveToNextPhase()
			}
			// THIS IS THEN SAVED BY THE PLAYER ENDING FACTORY BUILD
			V.render(-1)
		} else if (oldPhase === PHASE_SELL) {
			// Produce a selling summary
			var relevantSellingLogs = []
			const ACTIONS_FOR_SALES_HISTORY = [Log.SALES, Log.SALES_V2, Log.SALES_SKIP, Log.REWIND, Log.RESIGN, Log.KICKOUT]

			i = this.model.logs.length - 1
			while (ACTIONS_FOR_SALES_HISTORY.includes(this.model.logs[i].action)) {
				if (this.model.logs[i].action === Log.SALES && this.model.logs[i].param[2] !== -1) relevantSellingLogs.push(this.model.logs[i])
				if (this.model.logs[i].action === Log.SALES_V2 && this.model.logs[i].param[2] !== -1) relevantSellingLogs.push(this.model.logs[i])
				i--
			}

			// Now collect the number of cars / sports / trucks sold by each player, and a grand total

			var salesSummaryHist = []
			for (i = 0; i < this.model.players.length; i++)
				salesSummaryHist.push([
					[
						[0, 0],
						[0, 0],
						[0, 0],
					],
					[
						[0, 0],
						[0, 0],
						[0, 0],
					],
					[
						[0, 0],
						[0, 0],
						[0, 0],
					],
					0,
				])

			/* salesSummaryHist corresponds to M.players order
				[0] = player 0
					[0][0-2] = player 0's dealerships, each wtih [VamountSold, PricePerV no bonus] c 3
					[0][3] = Total income with bonuses
			*/
			for (i = 0; i < relevantSellingLogs.length; i++) {
				/* Each log has:
						player: Index of M.players
						action:	8 (sell)
						param:  0 - ComponentName of Dealership
								1 - MW Index => either -1 if placed, or index if used
									NB THESE PRICES DO NOT INCLUDE THE BONUSES
								2 - [CarAmountSold, PricePerCar], [TruckAmountSold, PricePerTruck], [SportsAmountSold, PricePerSports]  
								3 - TOTAL income of this sale, including bonuses
						timestamps: (whatever)
				*/

				// Find the indexes to use
				var playerIndex = relevantSellingLogs[i].player
				var dealershipIndex = (relevantSellingLogs[i].param[0] - 40) % 3
				// Add the sales info
				for (j = 0; j < relevantSellingLogs[i].param[2].length; j++) {
					salesSummaryHist[playerIndex][dealershipIndex][j][0] += relevantSellingLogs[i].param[2][j][0]
					salesSummaryHist[playerIndex][dealershipIndex][j][1] += relevantSellingLogs[i].param[2][j][1]
				}
				// Add total sales
				salesSummaryHist[playerIndex][3] += relevantSellingLogs[i].param[3]
			}

			this.model.log(Log.SALES_SUMMARY, [...salesSummaryHist])

			// End of selling summary
			this.model.gameFlow.phase = PHASE_GAME_END_CHECK

			if (this.model.punchClockNumber <= 0) this.model.gameEnded = 1
			if (this.model.gameFlow.turn >= 7) this.model.gameEnded = 2

			if (this.model.gameEnded > 0) {
				// Find winner. Sort players by sakes focus, then move highgest money to front
				this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]
				var moneyInSalesOrder = []
				for (i = 0; i < this.model.gameFlow.turnOrder.length; i++) {
					moneyInSalesOrder.push([this.model.gameFlow.turnOrder[i], this.model.players[this.model.gameFlow.turnOrder[i]].money])
				}
				moneyInSalesOrder.sort(function (a, b) {
					return b[1] - a[1]
				})

				for (i = 0; i < this.model.players.length; i++) {
					this.model.gameFlow.unalteredTurnOrder[i] = moneyInSalesOrder[i][0]
					this.model.gameFlow.turnOrder[i] = moneyInSalesOrder[i][0]
				}

				this.model.log(Log.GAME_END, [this.model.players[this.model.gameFlow.unalteredTurnOrder[0]].name, this.model.gameEnded])
				global.winner = this.model.players[this.model.gameFlow.unalteredTurnOrder[0]].name
				V.render(-1)
				return
			}

			this.model.gameFlow.phase = PHASE_ADVANCE_EXPECTATIONS
			this.model.historyObj.splice(0, this.model.historyObj.length)

			// Remove old sales windows from model
			for (i = 0; i < this.model.players.length; i++) {
				for (j = 0; j < this.model.players[i].factory.factoryComponents.length; j++) {
					var component = this.model.players[i].factory.factoryComponents[j]
					if (DEALERSHIPS.includes(component[0])) {
						// reset sales window data
						component[MW_IDX][0] = -1
						component[MW_IDX][1] = -1
						component[MW_IDX][2] = -1
					}
				}
			}

			// Find the new TT from the off board ones
			var innovations = [0, 0, 0, 0, 0]
			var maxPastMinMarker = [0, 0, 0, 0, 0]
			for (i = 2; i <= 4; i++) {
				var minTech = this.model.techTracks[i][7][1]
				for (j = minTech + 1; j < this.model.techTracks[i].length - 1; j++) {
					innovations[i] += this.model.techTracks[i][j].length * (j - minTech)
					if (this.model.techTracks[i][j].length > 0) maxPastMinMarker[i] = j - this.model.techTracks[i][7][1]
				}
			}

			var max = Math.max(...innovations)
			var res = []
			var winner = -1
			innovations.forEach((item, index) => (item === max && index >= 2 ? res.push(index) : null))

			if (res.length != 1) {
				for (i = 0; i < maxPastMinMarker.length; i++) {
					if (!res.includes(i)) maxPastMinMarker[i] = 0
				}

				var maxMaxPastMinMarker = Math.max(...maxPastMinMarker)
				for (i = 0; i < res.length; i++) {
					if (maxPastMinMarker[res[i]] < maxMaxPastMinMarker) res[i] = -1
				}
			}
			// Now remove the -1s
			res = res.filter(function (val) {
				return val !== -1
			})
			if (res.length > 1) {
				winner = Math.min(...res)
			} else winner = res[0]

			// log the colour of the old TT 0
			this.model.historyObj.push(this.model.techTracks[this.model.obsolescenceMarkerDirection][7][0])

			// log the new value of the min demand 1
			this.model.historyObj.push(this.model.techTracks[this.model.obsolescenceMarkerDirection][7][1] + 1)

			// Add the off board innovation levels
			this.model.historyObj.push([
				[innovations[2], this.model.techTracks[2][7][0], maxPastMinMarker[2]],
				[innovations[3], this.model.techTracks[3][7][0], maxPastMinMarker[3]],
				[innovations[4], this.model.techTracks[4][7][0], maxPastMinMarker[4]],
			])

			// log the colour of the winning tech track 2
			this.model.historyObj.push(this.model.techTracks[winner][7][0])

			// Now increase the min demand of the obs one by 1
			this.model.techTracks[this.model.obsolescenceMarkerDirection][7][1]++

			// Now swap the winning TT with the obs one
			;[this.model.techTracks[this.model.obsolescenceMarkerDirection], this.model.techTracks[winner]] = [this.model.techTracks[winner], this.model.techTracks[this.model.obsolescenceMarkerDirection]]
			// now push the old TT to the end (now in winner position)
			this.model.techTracks.push([...this.model.techTracks[winner]])

			// Now splice out the old one in the winner position
			this.model.techTracks.splice(winner, 1)

			// switch the obs marker
			if (this.model.obsolescenceMarkerDirection === 1) this.model.obsolescenceMarkerDirection = 0
			else this.model.obsolescenceMarkerDirection = 1

			// log the new obsmarker direction
			this.model.historyObj.push(this.model.obsolescenceMarkerDirection)

			this.model.log(Log.ADVANCE_EXPECTATIONS, [...this.model.historyObj], -1)
			this.model.historyObj.splice(0, this.model.historyObj.length)

			this.model.gameFlow.phase = PHASE_GROW_DEMANDS
			this.model.gameFlow.unalteredTurnOrder.reverse()
			this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]

			// Add stock back in to display dealerships
			for (i = 0; i < this.model.players.length; i++) {
				// Each players dealershup produces vehicles accoeding to the assem capac track -- this is simply set to the correct max value
				factory = this.model.players[i].factory
				for (j = 0; j < factory.factoryComponents.length; j++) {
					if (MAINLINES.includes(factory.factoryComponents[j][0])) {
						for (k = 0; k < this.model.assemblyCapacityTrack.length; k++) if (this.model.assemblyCapacityTrack[k].indexOf(this.model.players[i].colour) > -1) factory.factoryComponents[j][SL_IDX] = k + 1
					}
				}
			}
			V.render(-1)

			// Check for any skips
			while (this.currentPlayer().playerCards.length === 0) {
				M.log(Log.NO_CARDS, [], M.gameFlow.turnOrder[0])
				this.model.gameFlow.turnOrder.shift()
				if (this.model.gameFlow.turnOrder.length === 0) {
					this.moveToNextPhase()
					return
				}
			}
		} else if (oldPhase === PHASE_GROW_DEMANDS) {
			// Add sparks to model, take away clocks
			var totalClocks = 0
			for (i = 0; i < this.model.alreadyPlayedCards.length; i++) {
				var clocks = this.model.alreadyPlayedCards[i][2][0]
				// Take away clocks
				this.model.punchClockNumber -= clocks
				totalClocks += clocks

				var Q = this.model.alreadyPlayedCards[i][1]
				var cardData = this.model.alreadyPlayedCards[i][2]
				for (j = 1; j < cardData.length; j++) {
					var Xcoord = 0
					var Ycoord = 0
					if (Q === 1) Ycoord = 4
					if (Q === 4) Xcoord = 4
					if (Q === 2) {
						Xcoord = 4
						Ycoord = 4
					}
					Xcoord = Xcoord + cardData[j][0]
					Ycoord = Ycoord + cardData[j][1]
					var index = this.model.getIndexForMBcoord([Xcoord, Ycoord])
					this.model.marketBoard[index][cardData[j][2]]++
				}
			}
			this.model.log(Log.SHOW_CARDS, [totalClocks, [...this.model.alreadyPlayedCards]], -1)
			//remove data
			this.model.alreadyPlayedCards.splice(0, this.model.alreadyPlayedCards.length)

			// Sparks add Demand
			for (i = 0; i < this.model.marketBoard.length; i++) {
				for (j = 0; j < 3; j++) {
					var vehiclesToAdd = this.model.marketBoard[i][j]
					var maxVehicles = this.model.marketBoard[i][j] * 2
					while (this.model.marketBoard[i][j + 3] < maxVehicles && vehiclesToAdd > 0) {
						this.model.marketBoard[i][j + 3]++
						vehiclesToAdd--
					}
				}
			}

			// Add neutral cards
			Rules.playNeutralCards()

			// set prices
			Rules.setCurrentMarketBoardPrices()

			// Empty data
			this.model.alreadyPlayedCards.splice(0, this.model.alreadyPlayedCards.length)

			this.model.gameFlow.turnOrder = [...this.model.gameFlow.unalteredTurnOrder]

			// Set Phase & Clear data
			this.model.gameFlow.phase = PHASE_RESEARCH
			this.model.piecesUsedInResearch.splice(0, this.model.piecesUsedInResearch.length)

			this.model.gameFlow.turn++
			this.model.log(Log.NEW_TURN, [this.model.gameFlow.turn])
			V.render(-1)
		}

		// MOVE BOTS TO START OF TURN ORDER AND SKIP
		Bot.correctTurnOrderForBots(this.model)

		// Useed in IO.saveGame
		return this.model
	}

	this.sayBeep = function () {
		if (global.liveNotification > 0) {
			if (this.beep == undefined) {
				if (global.liveNotification == 1) this.beep = new Audio(soundPreURL + "beep.mp3")
				if (global.liveNotification == 2) this.beep = new Audio(soundPreURL + "bell.mp3")
			}
			this.beep.play()
		}
	}

	this.model = _model
	this.view = _view
}

var HISTORY_LENGTH = 20

var Log = {
	// actions possible
	P_CARD_AREA: '<svg class="CLASS"><rect stroke-linejoin="round" fill-rule="evenodd" rx="2.5px" ry="2.5px" height="25px" width="25px" stroke="#000" y="2.5px" x="2.5px" stroke-width="2.5px" fill="none"/><rect stroke-linejoin="round" fill-rule="evenodd" rx="2.5px" ry="2.5px" height="12.5px" width="12.5px" stroke="#000" y="2.5px" x="2.5px" stroke-width="2.5px" fill="COLOUR"/></svg>',

	SETUP_GAME: 0,
	FACTORY_SETUP: 1,
	RESEARCH: 2,
	SET_FOCUS: 3,
	// FIXED AND USED IN DB
	FACTORY_EXPAND: 4,
	SALES_SKIP: 5,
	PLAY_CARD: 6,
	INCREASE_GANTT: 7,
	SALES: 8,
	SALES_V2: 18,
	ADVANCE_EXPECTATIONS: 9,
	SHOW_CARDS: 10,
	NEUTRAL_CARDS: 11,
	SALES_SUMMARY: 12,
	// USED IN DB
	FACTORY_BUILD: 13,
	NO_CARDS: 14,

	NEW_TURN: 23,
	GAME_END: 24,

	REWIND: 34,
	RESIGN: 35,
	KICKOUT: 36,
	//////////////////////////////////////
	DISPLAY_RESERVE: 20,
	FIRE: 21,
	DELETE_RESOURCES: 22,

	BANKRUPT: 25,
	TOTAL_BANKRUPT: 26,
	ONE_LEFT: 27,

	TECH_LOGS: [0],

	log: function (model, player, action, param, timestamp) {
		if (timestamp == undefined) timestamp = Math.round((new Date().getTime() - IO.timeOffset) / 1000)
		if (timestamp < 0) timestamp = 0

		if (this.TECH_LOGS.indexOf(action) == -1) {
			this.history(model, player, action, param, timestamp)
		}

		if (model.logs == undefined) model.logs = []
		model.logs.push({
			player: player,
			action: action,
			param: param,
			timestamp: timestamp,
		})
	},

	history: function (model, player, action, param, timestamp) {
		if (this.TECH_LOGS.indexOf(action) == -1) {
			var div = $('<div class="log">')

			var strPlayer = ""
			if (player > -1 && player < 63 && player != null && player != undefined) {
				strPlayer = model.players[player].name
				div.addClass("color" + getCorrectedColour(model.players[player].color))
			}

			if (action !== this.NEW_TURN) div.append('<div class="header"><span> ' + this.giveFormattedDate(timestamp * 1000) + " </span></div>")
			else div.addClass("separator")
			div.append(this.giveFullText(strPlayer, action, param))
			if (global.historyOrder == 0) {
				$("#history").prepend(div)
				var histTogDiv = $("#historyToggleDiv")
				histTogDiv.show()
				$("#history").prepend(histTogDiv)
			} else $("#history").append(div)
		}
	},

	giveFullText: function (player, action, param) {
		var playerSpan
		var index
		var colour
		var resDiv
		var col = "black"
		var img
		var cardID
		var showCardsDiv

		if (player !== "") {
			playerSpan = this.getPlayerSpan(player)
			index = M.players.map((item) => item.name).indexOf(player)
			if (index === -1) index = M.players.map((item) => item.originalName).indexOf(player)
			colour = M.players[index].colour
		}

		var i = 0
		var ul

		var res = $("<div>")
		//res.append(JSON.stringify(param))
		var str = ""
		if (action == this.FACTORY_SETUP) {
			/*res.append(playerSpan);
			res.append(gettext("  sets up factory"));*/

			res.append(
				interpolate(
					gettext("%(playerName)s sets up factory"),
					{
						playerName: playerSpan.prop("outerHTML"),
					},
					true
				)
			)
		} else if (action == this.REWIND) {
			if (param != undefined && param.length == 1) {
				res.append(
					"<div class='rewind'>" +
						interpolate(
							gettext("Game rewound to here by %(playerName)s"),
							{
								playerName: param[0],
							},
							true
						) +
						//gettext("Game rewound to here by") + " " + param[0]
						"</div>"
				)
			}
		} else if (action == this.KICKOUT) {
			if (param != undefined && param.length == 1) {
				//res.append('<div class="rewind">' + param[0] + " " + gettext('was kicked out') + '</div>');
				res.append(
					"<div class='rewind'>" +
						interpolate(
							gettext("%(playerName)s was kicked out"),
							{
								playerName: param[0],
							},
							true
						) +
						"</div>"
				)
			}
		} else if (action == this.RESIGN) {
			if (param != undefined && param.length == 1) {
				res.append('<div class="rewind">' + interpolate(gettext("%(resignedPlayer)s Resigns"), { resignedPlayer: param[0] }, true) + "</div>")
			}
		} else if (action === this.RESEARCH) {
			resDiv = $("<div></div>")
			resDiv.append(playerSpan)
			resDiv.append(" ")

			_.each(
				param,
				function (p) {
					if (p.length === 2) {
						resDiv.append(this.getPlayerTokenFromColour(p[0]))
						resDiv.append(" on " + this.getTrackNameFromCompressedNumberL(p[1]) + "s<BR/>")
					} else if (p.length === 4) {
						var pos = p[2]
						if (p[1] === 5) pos++

						resDiv.append(gettext("moves"))
						resDiv.append(this.getPlayerTokenFromColour(p[0]))
						resDiv.append(" ")
						resDiv.append(gettext("to") + " " + this.getTrackNameFromCompressedNumberL(p[1]) + " " + String(pos))

						if (p[2] === 4 || p[2] === 6) {
							var punchClockImg = $("<img>")
							punchClockImg.attr("src", imagePreURL + "/punch_clock.png")
							punchClockImg.addClass("punchClockHist")
							punchClockImg.css({
								width: "30px",
								height: "30px",
								"vertical-align": "middle",
							})
							resDiv.append(" ")
							resDiv.append(punchClockImg)
							resDiv.append(" -1 (" + p[3] + ")")
						}
						resDiv.append("<BR/>")
					}
				},
				this
			)

			res.append(resDiv)
		} else if (action === this.SET_FOCUS) {
			resDiv = $("<div></div>")
			//resDiv.append(playerSpan);
			if (parseInt(param) === -1) {
				//resDiv.append(" " + gettext("passes and keeps their Gantt"));

				resDiv.append(
					interpolate(
						gettext("%(playerName)s passes and keeps their Gantt"),
						{
							playerName: playerSpan.prop("outerHTML"),
						},
						true
					)
				)
			} else {
				//resDiv.append(" " + gettext("spends all Gantt to choose position:") + " " + String(parseInt(param) + 1));
				resDiv.append(
					interpolate(
						gettext("%(playerName)s spends all Gantt to choose position: %(position)s"),
						{
							playerName: playerSpan.prop("outerHTML"),
							position: String(parseInt(param) + 1),
						},
						true
					)
				)
			}

			res.append(resDiv)
		} else if (action == this.FACTORY_EXPAND) {
			var bldgStr
			res.append(playerSpan)
			res.append("  " + gettext("builds") + " ")
			bldgStr = ""
			_.each(
				param,
				function (p) {
					var nameNumber = p
					if (DEALERSHIPS.includes(p)) {
						var originalColour = Math.floor((p - 40) / 3)
						nameNumber = getCorrectedDealershipColour(p, originalColour)
					}
					bldgStr += "" + COMPONENTS_NAME_STRING[nameNumber] + ", "
				},
				this
			)
			bldgStr = bldgStr.slice(0, -2)
			res.append(bldgStr)
		} else if (action == this.FACTORY_BUILD) {
			res.append(playerSpan)
			res.append("  " + gettext("builds") + " ")
			bldgStr = ""
			var componentNameNumbers = []

			var playerIndex = M.players.findIndex((obj) => obj.name === player)

			for (i = param[1] - param[0]; i < param[1]; i++) {
				// undefined check as crash caused? possibly by not building anything?
				if (M.players[playerIndex].factory.factoryComponents[i] != undefined) componentNameNumbers.push(M.players[playerIndex].factory.factoryComponents[i][0])
			}

			_.each(
				componentNameNumbers,
				function (p) {
					var nameNumber = p
					if (DEALERSHIPS.includes(p)) {
						var originalColour = Math.floor((p - 40) / 3)
						nameNumber = getCorrectedDealershipColour(p, originalColour)
					}
					bldgStr += "" + COMPONENTS_NAME_STRING[nameNumber] + ", "
				},
				this
			)
			bldgStr = bldgStr.slice(0, -2)
			if (bldgStr === "") bldgStr = "nothing."
			res.append(bldgStr)
			res.css({
				border: "1px solid yellow",
			})
			res.on("mouseover", function (e) {
				$(this).css({
					border: "1px solid green",
					cursor: "pointer",
				})
			})
			res.on("mouseout", function (e) {
				$(this).css({
					border: "1px solid yellow",
				})
			})
			res.on("click", { playerIndex: playerIndex, p0: param[0], p1: param[1] }, Log.clickedOnBuildHistory)
		} else if (action == this.SALES_SKIP) {
			//res.append(playerSpan);
			//res.append("  " + gettext("passes:") + " " + skipStrings[param]);

			res.append(
				interpolate(
					gettext("%(playerName)s passes: %(reason)s"),
					{
						playerName: playerSpan.prop("outerHTML"),
						reason: skipStrings[param],
					},
					true
				)
			)
		} else if (action == this.INCREASE_GANTT) {
			res.append(gettext("Gantt Increases") + "<BR/>")
			_.each(
				param,
				function (p) {
					//res.append(this.getPlayerSpan(p[0]));
					res.append(interpolate(gettext("%(playerName)s gains %(numberOfGantt)s Gantt"), { playerName: this.getPlayerSpan(p[0]).prop("outerHTML"), numberOfGantt: String(p[1]) }, true))

					if (p[2] > 0) {
						var punchClockImg = $("<img>")
						punchClockImg.attr("src", imagePreURL + "/punch_clock.png")
						punchClockImg.addClass("punchClockHist")
						punchClockImg.css({
							width: "30px",
							height: "30px",
							"vertical-align": "middle",
						})
						res.append(" ")
						res.append(punchClockImg)
						res.append(" -1")
					}
					res.append("<BR/>")
				},
				this
			)
		} else if (action == this.SALES) {
			//res.append(playerSpan);
			// param[1] has MW info
			// param[0] has dealership component name
			var originalColour = Math.floor((param[0] - 40) / 3)
			var correctedDshipName = getCorrectedDealershipColour(param[0], originalColour)

			// 0 = dship name
			// 1 = -1, or MB index of MW
			// 2 = -1 if no sellingNicheEligibility
			//	= histSales

			if (param[2] === -1) {
				if (param[1] === -1) res.append(interpolate(gettext("%(playerName)s places %(dealershipName)s but cannot make any sales"), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + "<BR/>")
				else res.append(interpolate(gettext("%(playerName)s uses %(dealershipName)s but cannot make any sales"), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + "<BR/>")
			} else {
				if (param[1] === -1) res.append(interpolate(gettext("%(playerName)s places %(dealershipName)s to sell:"), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + "<BR/>")
				else res.append(interpolate(gettext("%(playerName)s uses %(dealershipName)s to sell"), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + (param[4] === 1 ? " " + gettext("(automatically)") : "") + ":<BR/>")

				var infoAdded = false
				if (typeof param[2][0] === "number") {
					infoAdded = false
					if (param[2][0] > 0) {
						res.append(String(param[2][0]) + " Car" + (param[2][0] > 1 ? "s" : "") + "")
						infoAdded = true
					}
					if (param[2][1] > 0) {
						if (infoAdded) res.append(", ")
						res.append(String(param[2][1]) + " Truck" + (param[2][1] > 1 ? "s" : "") + "")
						infoAdded = true
					}
					if (param[2][2] > 0) {
						if (infoAdded) res.append(", ")
						res.append(String(param[2][2]) + " Sports Car" + (param[2][2] > 1 ? "s" : "") + "")
						infoAdded = true
					}
				} else {
					// New info
					infoAdded = false
					if (param[2][0][0] > 0) {
						const data = {
							carAmount: param[2][0][0],
							eachSaleAmount: param[2][0][1],
						}

						const formats = ngettext("%(carAmount)s Car for $%(eachSaleAmount)s", "%(carAmount)s Cars, each for $%(eachSaleAmount)s", data.carAmount)
						res.append(interpolate(formats, data, true))

						infoAdded = true
					}
					if (param[2][1][0] > 0) {
						if (infoAdded) res.append("<BR/>")
						const data = {
							truckAmount: param[2][1][0],
							eachSaleAmount: param[2][1][1],
						}
						const formats = ngettext("%(truckAmount)s Truck for $%(eachSaleAmount)s plus bonus $1", "%(truckAmount)s Trucks, each for $%(eachSaleAmount)s plus bonus $1", data.truckAmount)
						res.append(interpolate(formats, data, true))

						infoAdded = true
					}
					if (param[2][2][0] > 0) {
						if (infoAdded) res.append("<BR/>")
						const data = {
							sportsAmount: param[2][2][0],
							eachSaleAmount: param[2][2][1],
						}
						const formats = ngettext("%(sportsAmount)s Sports Car for $%(eachSaleAmount)s plus bonus $2", "%(sportsAmount)s Sports Cars, each for $%(eachSaleAmount)s plus bonus $2", data.sportsAmount)
						res.append(interpolate(formats, data, true))

						infoAdded = true
					}
				}
				res.append("<BR>" + gettext("Total Income:") + " $" + String(param[3]))
			}
		} else if (action == this.SALES_V2) {
			//res.append(playerSpan);
			// param[1] has MW info
			// param[0] has dealership component name
			var originalColour = Math.floor((param[0] - 40) / 3)
			var correctedDshipName = getCorrectedDealershipColour(param[0], originalColour)

			// 0 = dship name
			// 1 = [0(newplacement) or 1(alreadyplaced), Index, Size, {{1 = rotated, ie a horizontal 2x1 window}}]
			// 2 = -1 if no sellingNicheEligibility
			//	 = histSales

			const MWindex = param[1][1]
			const MWxcoord = (MWindex % 8) + 1
			const MWycoord = Math.floor(MWindex / 8) + 1
			const MWsize = param[1][2]
			let imgRotation = 1
			if (param[1].length >= 4 && param[1][3] === 1) {
				imgRotation = 0
			}

			// Start with either place or use
			if (param[1][0] === 0) {
				res.append(interpolate(gettext("%(playerName)s places %(dealershipName)s "), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + "")
			} else if (param[1][0] === 1) {
				res.append(interpolate(gettext("%(playerName)s uses %(dealershipName)s "), { playerName: playerSpan.prop("outerHTML"), dealershipName: COMPONENTS_NAME_STRING[correctedDshipName] }, true) + "")
			}

			let MWimg
			if (MWsize === 0 && imgRotation === 1) MWimg = V.getImage(`MWicon${MWsize}_v`)
			else MWimg = V.getImage(`MWicon${MWsize}`)
			MWimg.addClass("MWhistImg")
			if (MWsize !== 0) {
				MWimg.css({
					height: "30px",
					width: "30px",
				})
			} else if (imgRotation === 0) {
				MWimg.css({
					height: "15px",
					width: "30px",
				})
			} else {
				MWimg.css({
					height: "30px",
					width: "15px",
				})
			}

			res.append(MWimg)

			res.append(interpolate(gettext(" at position (%(xcoord)s, %(ycoord)s) "), { xcoord: MWxcoord, ycoord: MWycoord }, true))

			// NO POSSIBLE SALES
			if (param[2] === -1) res.append(gettext("but cannot make any sales"))
			// RECORD SALES
			else {
				res.append(gettext("to sell: ") + "<br/>")

				var infoAdded = false
				// New info
				infoAdded = false
				if (param[2][0][0] > 0) {
					const data = {
						carAmount: param[2][0][0],
						eachSaleAmount: param[2][0][1],
						xCoord: (param[2][0][2] % 8) +1,
						yCoord: Math.floor(param[2][0][2] / 8) +1
					}

					const formats = ngettext("%(carAmount)s Car for $%(eachSaleAmount)s (%(xCoord)s,%(yCoord)s)", "%(carAmount)s Cars, each for $%(eachSaleAmount)s (%(xCoord)s,%(yCoord)s)", data.carAmount)
					res.append(interpolate(formats, data, true))

					infoAdded = true
				}
				if (param[2][1][0] > 0) {
					if (infoAdded) res.append("<BR/>")
					const data = {
						truckAmount: param[2][1][0],
						eachSaleAmount: param[2][1][1],
						xCoord: (param[2][1][2] % 8) +1,
						yCoord: Math.floor(param[2][1][2] / 8) +1
					}
					const formats = ngettext("%(truckAmount)s Truck for $%(eachSaleAmount)s plus bonus $1 (%(xCoord)s,%(yCoord)s)", "%(truckAmount)s Trucks, each for $%(eachSaleAmount)s plus bonus $1 (%(xCoord)s,%(yCoord)s)", data.truckAmount)
					res.append(interpolate(formats, data, true))

					infoAdded = true
				}
				if (param[2][2][0] > 0) {
					if (infoAdded) res.append("<BR/>")
					const data = {
						sportsAmount: param[2][2][0],
						eachSaleAmount: param[2][2][1],
						xCoord: (param[2][2][2] % 8) +1,
						yCoord: Math.floor(param[2][2][2] / 8) +1
					}
					const formats = ngettext("%(sportsAmount)s Sports Car for $%(eachSaleAmount)s plus bonus $2 (%(xCoord)s,%(yCoord)s)", "%(sportsAmount)s Sports Cars, each for $%(eachSaleAmount)s plus bonus $2 (%(xCoord)s,%(yCoord)s)", data.sportsAmount)
					res.append(interpolate(formats, data, true))

					infoAdded = true
				}

				res.append("<BR>" + gettext("Total Income:") + " $" + String(param[3]))
			}
		} else if (action === this.SALES_SUMMARY) {
			res.append("<span class=salesSummaryTitle>" + gettext("Sales Summary") + "</span>")
			var table = $('<table class="salesSummaryTable"><thead><tr><td class="blankTD"></td><td><img class="salesSummaryVehicle" src="' + imagePreURL + '/v_car.png"></td><td><img class="salesSummaryVehicle" src="' + imagePreURL + '/v_truck.png"></td><td><img class="salesSummaryVehicle" src="' + imagePreURL + '/v_sports.png"></td><td>' + gettext("Total") + "</td></tr></thead></table>")

			for (i = 0; i < param.length; i++) {
				var totalCars = 0
				var totalTrucks = 0
				var totalSports = 0

				// this does all 3 dealerships
				for (j = 0; j < param[i].length - 1; j++) {
					if (param[i][j][0][0] > 0) totalCars += param[i][j][0][0]
					if (param[i][j][1][0] > 0) totalTrucks += param[i][j][1][0]
					if (param[i][j][2][0] > 0) totalSports += param[i][j][2][0]
				}
				var tr = $("<tr>")
				var td = $("<td>")
				td.append(this.getPlayerSpan(M.players[i].name))
				tr.append(td)
				tr.append("<td>" + String(totalCars) + "</td>")
				tr.append("<td>" + String(totalTrucks) + "</td>")
				tr.append("<td>" + String(totalSports) + "</td>")
				tr.append("<td><B>$" + String(param[i][3]) + "</B></td>")
				table.append(tr)
			}
			res.append(table)
		} else if (action == this.ADVANCE_EXPECTATIONS) {
			res.append(gettext("Expectations Advance:") + "<BR/>")
			res.append(interpolate(gettext("%(techTrackName)s has a new min value of %(minValue)s"), { techTrackName: TTnamesFromColour[param[0]], minValue: String(param[1]) }, true) + "<BR/>")

			// 2 is all the innovation levels
			res.append(gettext("Innovation Levels:") + "<BR/>")

			res.append("&nbsp;&nbsp;" + interpolate(gettext("%(techTrackName)s: %(innovationLevel)s - Furthest from Min Marker:  %(furtehstFromMin)s"), { techTrackName: TTnamesFromColour[param[2][0][1]], innovationLevel: String(param[2][0][0]), furtehstFromMin: String(param[2][0][2]) }, true) + "<BR/>")
			res.append("&nbsp;&nbsp;" + interpolate(gettext("%(techTrackName)s: %(innovationLevel)s - Furthest from Min Marker:  %(furtehstFromMin)s"), { techTrackName: TTnamesFromColour[param[2][1][1]], innovationLevel: String(param[2][1][0]), furtehstFromMin: String(param[2][1][2]) }, true) + "<BR/>")
			res.append("&nbsp;&nbsp;" + interpolate(gettext("%(techTrackName)s: %(innovationLevel)s - Furthest from Min Marker:  %(furtehstFromMin)s"), { techTrackName: TTnamesFromColour[param[2][2][1]], innovationLevel: String(param[2][2][0]), furtehstFromMin: String(param[2][2][2]) }, true) + "<BR/>")

			res.append(gettext("New Tech Track Introduced:") + " " + TTnamesFromColour[param[3]])
			res.append("<BR/>" + gettext("Obsolesence Marker points:") + " " + (param[4] === 0 ? gettext("Up") : gettext("Right")))
		} else if (action == this.PLAY_CARD) {
			//res.append(playerSpan);
			col = "black"
			colour = getCorrectedColour(colour)
			if (colour === RED) col = "#E83435"
			if (colour === GREEN) col = "#70C96B"
			if (colour === PURPLE) col = "#8E63B3"
			if (colour === BLUE) col = " #435EB5"
			if (colour === YELLOW) col = "#EECD30"

			img = $(this.P_CARD_AREA.replace(/COLOUR/, col))

			if (param[0] === 4) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r1"))
			if (param[0] === 2) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r2"))
			if (param[0] === 1) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r3"))
			img.css({
				width: "30px",
				height: "30px",
				"margin-right": "5px",
			})
			//res.append("  " + gettext("plays a card"));@
			res.append(
				interpolate(
					gettext("%(playerName)s plays a card"),
					{
						playerName: playerSpan.prop("outerHTML"),
					},
					true
				)
			)
			res.append(img)
		} else if (action == this.NO_CARDS) {
			res.append(
				interpolate(
					gettext("%(playerName)s has no more cards"),
					{
						playerName: playerSpan.prop("outerHTML"),
					},
					true
				)
			)
		} else if (action == this.GAME_END) {
			if (param[1] === 1) res.append("<div class='new_turn'>" + gettext("Game Ended by: Punch Clock") + "</div>")
			if (param[1] === 2) res.append("<div class='new_turn'>" + gettext("Game Ended by: Turn 7") + "</div>")
			if (param[1] === 3) res.append("<div class='new_turn'>" + gettext("Game Ended by: King of the Hill") + "</div>")

			res.append("<div class='new_turn'>" + gettext("The winner is:") + " " + param[0] + "</div>")

			res.append("<div class='new_turn'><a href='/HLC/HLCgameSummary/" + String(global.gameID) + "/'>" + gettext("Click here to see game summary stats") + "</a></div>")
		} else if (action == this.NEW_TURN) {
			if (param != undefined && (param.length == 1 || param.length == 2 || param.length == 3)) {
				if (param.length == 1) res.append("<div class='new_turn'>" + interpolate(gettext("Start of turn %(turnNumber)s"), { turnNumber: param[0] }, true) + "</div>")
			}
		} else if (action == this.SHOW_CARDS) {
			res.append(interpolate(gettext("Punch Clock decreases by: %(amount)s"), { amount: String(param[0]) }, true) + "<BR/>")
			showCardsDiv = $("<div></div>")
			showCardsDiv.css({
				width: "100%",
				display: "flex",
			})

			for (i = 0; i < param[1].length; i++) {
				var showCardDiv = $("<div></div>")
				showCardDiv.css({
					width: "fit-content",
				})
				col = "black"

				if (getCorrectedColour(param[1][i][0]) === RED) col = "#E83435"
				if (getCorrectedColour(param[1][i][0]) === GREEN) col = "#70C96B"
				if (getCorrectedColour(param[1][i][0]) === PURPLE) col = "#8E63B3"
				if (getCorrectedColour(param[1][i][0]) === BLUE) col = " #435EB5"
				if (getCorrectedColour(param[1][i][0]) === YELLOW) col = "#EECD30"

				img = $(this.P_CARD_AREA.replace(/COLOUR/, col))

				if (param[1][i][1] === 4) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r1"))
				if (param[1][i][1] === 2) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r2"))
				if (param[1][i][1] === 1) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r3"))
				img.css({
					width: "30px",
					height: "30px",
					"margin-right": "5px",
				})
				showCardDiv.append(img)
				showCardDiv.append("<BR/>")

				//cardP00_Y
				cardID = param[1][i][3]
				var newCardID = ""
				if (cardID.length === 2) newCardID = cardID[0] + "0" + cardID[1]
				else newCardID = cardID

				//now add _CC
				var corrCol = getCorrectedColour(param[1][i][0])
				var extraLetter = "R"
				if (corrCol === 1) extraLetter = "G"
				if (corrCol === 2) extraLetter = "P"
				if (corrCol === 3) extraLetter = "B"
				if (corrCol === 4) extraLetter = "Y"

				var img2 = getCorrectedCardImage("card" + newCardID + "_" + extraLetter)
				img2.css({
					width: "50px",
					height: "75px",
					"margin-right": "5px",
				})
				showCardDiv.append(img2)
				showCardsDiv.append(showCardDiv)
			}
			res.append(showCardsDiv)
		} else if (action == this.NEUTRAL_CARDS) {
			res.append(gettext("Neutral Cards:") + "<BR/>")
			showCardsDiv = $("<div></div>")
			showCardsDiv.css({
				width: "100%",
				display: "flex",
			})

			for (i = 0; i < param.length; i++) {
				showCardDiv = $("<div></div>")
				showCardDiv.css({
					width: "fit-content",
				})
				col = "gray"

				img = $(this.P_CARD_AREA.replace(/COLOUR/, col))

				if (param[i][1] === 4) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r1"))
				if (param[i][1] === 2) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r2"))
				if (param[i][1] === 1) img = $(this.P_CARD_AREA.replace(/COLOUR/, col).replace(/CLASS/, "r3"))
				img.css({
					width: "30px",
					height: "30px",
					"margin-right": "5px",
				})
				showCardDiv.append(img)
				showCardDiv.append("<BR/>")
				//cardP00_Y
				cardID = param[i][0]
				img = getNeutralCardImage("card" + String(cardID))
				img.css({
					width: "50px",
					height: "75px",
					"margin-right": "5px",
				})
				showCardDiv.append(img)
				showCardsDiv.append(showCardDiv)
			}
			res.append(showCardsDiv)
		}
		res.css({
			"line-height": "25px",
		})

		return res
	},

	// WARNING: THIS is now Div ELEMENT
	clickedOnBuildHistory: function (e) {
		var i = 0
		// Set the view to correct factory
		var itemIndex = M.gameFlow.unalteredTurnOrder.indexOf(e.data.playerIndex)
		V.render(itemIndex)

		// Find all indexes required to be highlighted
		var componentIndexes = []
		for (i = e.data.p1 - e.data.p0; i < e.data.p1; i++) {
			componentIndexes.push(M.players[e.data.playerIndex].factory.factoryComponents[i][1])
		}
		// Find all the needed squares
		var squaresToHighlight = []
		for (i = 0; i < componentIndexes.length; i++) {
			squaresToHighlight = squaresToHighlight.concat(M.players[e.data.playerIndex].factory.getAdjacentIndexesFromIndex(componentIndexes[i]))
		}
		V.externalDrawSquares(M.players[e.data.playerIndex], squaresToHighlight, "yellow", "historyComponentHighlight")
	},

	getPlayerSpan: function (name) {
		var index = M.players.map((item) => item.name).indexOf(name)
		if (index === -1) index = M.players.map((item) => item.originalName).indexOf(name)
		var colour = getCorrectedColour(M.players[index].colour)

		var span = $("<span></span>")

		if (M.trainingGame && M.players[index].displayName != undefined) span.append(M.players[index].displayName)
		else span.append(M.players[index].name)
		if (colour === RED) span.css({ "background-color": "#A12529" })
		if (colour === GREEN) span.css({ "background-color": "#456334" })
		if (colour === PURPLE) span.css({ "background-color": "#51365F" })
		if (colour === BLUE) span.css({ "background-color": "#3474A9" })
		if (colour === YELLOW) span.css({ "background-color": "#C28727" })
		span.css({
			color: "white",
			"font-weight": "bolder",
			padding: "3px",
			border: "1px solid black",
		})
		return span
	},

	getPlayerTokenFromColour: function (colour) {
		var img = $("<img>")
		colour = getCorrectedColour(colour)

		if (colour === RED) img.attr("src", imagePreURL + "/piece_R.png")
		else if (colour === GREEN) img.attr("src", imagePreURL + "/piece_G.png")
		else if (colour === PURPLE) img.attr("src", imagePreURL + "/piece_P.png")
		else if (colour === BLUE) img.attr("src", imagePreURL + "/piece_B.png")
		else if (colour === YELLOW) img.attr("src", imagePreURL + "/piece_Y.png")

		img.css({
			height: "20px",
			width: "20px",
		})

		return img
	},

	getTrackNameFromCompressedNumberL: function (number) {
		if (number === 5) return gettext("Assembly Capacity Track")
		else {
			if (number === 0) return gettext("Speed Tech")
			if (number === 1) return gettext("Range Tech")
			if (number === 2) return gettext("Design Tech")
			if (number === 3) return gettext("Reliability Tech")
			if (number === 4) return gettext("Safety Tech")
		}
	},

	giveFormattedDate: function (timestamp) {
		var d = new Date(timestamp)
		var res = d.getFullYear() + "/"
		if (d.getMonth() < 9) res += "0" + (d.getMonth() + 1) + "/"
		else res += d.getMonth() + 1 + "/"
		if (d.getDate() < 10) res += "0" + d.getDate() + " "
		else res += d.getDate() + " "
		if (d.getHours() < 10) res += "0" + d.getHours() + ":"
		else res += d.getHours() + ":"
		if (d.getMinutes() < 10) res += "0" + d.getMinutes() + ":"
		else res += d.getMinutes() + ":"
		if (d.getSeconds() < 10) res += "0" + d.getSeconds()
		else res += d.getSeconds()

		return res
	},

	refreshHistory: function (model, last) {
		if (last == undefined) last = HISTORY_LENGTH
		if (model.logs != undefined) {
			var t = _.sortBy(model.logs, "timestamp")

			var histTogDiv = $("#historyToggleDiv")

			$("#history").empty()

			if (last > -1 && t.length > last) {
				var button = $("<div><button>" + gettext("Show full history") + "</button></div>")
				button.on("click", function () {
					Log.refreshHistory(model, -1)
				})
				$("#history").append(button)
				t = t.slice(t.length - last, t.length)
			}
			_.each(
				t,
				function (item) {
					if (item.timestamp > 0) this.history(model, item.player, item.action, item.param, item.timestamp)
					else this.history(model, item.player, item.action, item.param, -item.timestamp)
				},
				this
			)

			// THIS ONLY HAPPENS ONCE
			$("#history").prepend(histTogDiv)
			histTogDiv.show()
		}
	},
}

var IO = {
	url: "processHLCturn",
	decalage: 0,

	init: function (controller) {
		this.controller = controller
		this.ts = new Date().getTime()
		this.tsChat = new Date().getTime()
		return this
	},

	// here, player is the NAME only
	resign: async function (model, player) {
		showLoader()
		var csrftoken = getCookie("csrftoken")
		if (player == undefined) player = model.players[global.pov].name

		fetch("/HLC/processHLCturn/", {
			method: "POST",
			// None of this is used - the player actioning the API must be the one resigning
			body: JSON.stringify({
				gameID: global.gameID,
				action: "resign",
				user: player,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				delete global.move
				hideLoader()
			})
			.catch((error) => {
				console.log("Error:", error)
				alert(gettext("Something went wrong. Please reload the page. If the problem persists, please contact the webmaster"))
			})
	},

	votedToDelete: async function () {
		showLoader()
		let csrftoken = getCookie("csrftoken")

		let postData = {
			action: "voteToDelete",
			gameID: global.gameID,
		}

		try {
			const response = await fetch("/HLC/voteToDelete/", {
				method: "POST",
				body: JSON.stringify(postData),
				headers: { "X-CSRFToken": csrftoken },
			})
			if (!response.ok) {
				if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
				throw new Error("Network response was not ok")
			}
			const data = await response.json()

			hideLoader()
			if (data.voteChanged === true) {
				$("#actions").prepend("<B>" + gettext("Vote Saved") + "<B>")
				global.votedToDelete = true
				global.deleteVotesData = JSON.parse(data.deleteVotesData)
				$("#deleteDiv").html("<hr/>Refresh page to view votes")
				if (data.redirect_url) window.location.href = data.redirect_url
			} else if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
		} catch (error) {
			console.error("Error fetching data:", error)
			if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
			return false
		}
	},

	bugEntry: function (desc, callback, context) {
		showLoader()
		if (global != undefined && global.name != undefined) {
			var csrftoken = getCookie("csrftoken")
			fetch("/HLC/bugEntry/", {
				method: "POST",
				body: JSON.stringify({
					gameID: global.gameID,
					action: "bugentry",
					user: global.name,
					description: desc,
					gameData: compressObjectToDB(M.export()),
				}),
				headers: { "X-CSRFToken": csrftoken },
			})
				.then((response) => response.json())
				.then((result) => {
					hideLoader()
					callback.call(context)
				})
				.catch((error) => {
					console.log("Error:", error)
				})
		}
	},

	saveGame: async function (model, saveOnly) {
		let wsConnecting = null
		wsConnecting = StartWebSocket()
		

		global.haltPlay = true


		var i = 0
		var nextPlayer = []
		/* CURRENT PLAYER MUST HAVE BEEN UPDATED */

		// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER
		showLoader()
		// THESE ARE INCORRECT IN NORMAL FLOW - UPDATED BELOW
		var turn = model.gameFlow.turn
		var phase = model.gameFlow.phase

		if (saveOnly !== true) {
			// IF NON-SIMUL AND NOTHING IN TURN ORDER
			if (!Rules.isSimulPhase() && model.gameFlow.turnOrder.length === 0) {
				model = C.moveToNextPhase()
				if (model.gameFlow.phase === PHASE_BUILD_FACTORY) {
					// use TURNORDER to account for removed bots
					for (i = 0; i < model.gameFlow.turnOrder.length; i++) {
						nextPlayer.push(model.players[model.gameFlow.turnOrder[i]].name)
					}
				} else nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]
			}
			// Otherwise, it is not a new phase.
			else {
				nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]
			}
			turn = model.gameFlow.turn
			phase = model.gameFlow.phase

			// Set up very first current players
			if (turn === 0) {
				nextPlayer = []
				for (i = 0; i < global.players.length; i++) {
					nextPlayer.push(global.players[i])
				}
			}
			if (M.trainingGame) nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]

			global.currentPlayers = nextPlayer
		} else if (saveOnly === true) {
			nextPlayer = global.currentPlayers
		}

		if (global.latestUpdate == undefined) global.latestUpdate = "9999999999999"

		var callData = {
			action: "save", // USED
			latestUpdate: global.latestUpdate, // USED
			data: compressObjectToDB(model.export()), // USED
			turn: turn, // USED
			nextPlayer: nextPlayer, // USED > goes to currentPlayers
			phase: phase, // USED
			status: "ACTIVE", // USED - only if FINISHED
			gameID: global.gameID, // USED
			saveRewind: global.saveRewind,
		}
		if (model.gameEnded > 0) {
			callData.status = "FINISHED" // USED
			callData.winner = global.winner // USED
			let finalPositions = []
			for (let i = 0; i < model.gameFlow.unalteredTurnOrder.length; i++) {
				finalPositions.push(model.players[model.gameFlow.unalteredTurnOrder[i]].name)
			}
			callData.finalPositions = finalPositions
			callData.deleteMoves = "true" // USED
			callData.saveRewind = false
		}

		var csrftoken = getCookie("csrftoken")
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify(callData),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				global.latestUpdate = String(result.latestUpdate)
				global.saveRewind = true
				if (result.syncError) {
					alert(gettext("It appears you have an older version of the game. Please refresh the page"))
					return
				}

				hideLoader()
				if (model.trainingGame) {
					global.haltPlay = false
					V.render()
					C.startActions()
				} else if (model.gameFlow.turn !== 0) {
					// Don't transmit if the game can still go on
					/*var transmit = true;
						if (transmit && global.liveWS && HLCwebSocket.readyState === 1)
							HLCwebSocket.send(
							"NEWDATATS" + String(global.gameID) + String(result.latestUpdate)
							);
						else if (transmit && global.liveWS && HLCwebSocket.readyState === 0) {
							sleepPause(1000);
							if (global.liveWS && HLCwebSocket.readyState === 1)
							HLCwebSocket.send(
								"NEWDATATS" +
								String(global.gameID) +
								String(result.latestUpdate)
							);
						}*/

					
					global.haltPlay = false
					V.render()
					C.startActions()
					broadcastGameUpdate(wsConnecting)
					//if (M.trainingGame) V.render()
				}
				// Otherwise start actions for the opening game player
				else {
					global.haltPlay = false
					C.startActions()
				}
				if (model.players[global.pov].name == "HcBot" && model.gameFlow.phase != PHASE_GAME_END_CHECK && global.name !== "BotKickStarter") $("#actions").html("")
			})
			.catch((error) => {
				console.log("Error:", error)
			})

		return false
	}, // END saveGame

	loadGame: async function (controller) {
		delete global.fullreset
		var csrftoken = getCookie("csrftoken")

		await fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "load",
				gameID: global.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then(async (result) => {
				loadDataString = String(result.loadData)
				global.latestUpdate = String(result.latestUpdate)
				$("#actions").empty()
				// Do this to update the top line info / green player highlights
				global.currentPlayers = result.currentPlayers
				await controller.reloadModel(loadDataString)
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	saveFactoryWithoutEndingTurn: function () {
		var player = M.players[global.pov]
		showLoader()

		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "saveFactoryWithoutEndingTurn", // USED
				data: compressObjectToDB(player.factory.export()), // USED
				gameID: global.gameID,
				name: player.originalName,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				hideLoader()
				if ($("#actions").text().substring(0, 8) != gettext("Your factory has been saved").substring(0, 8)) $("#actions").prepend("<B>" + gettext("Your factory has been saved") + "</B><BR/>")
			})
			.catch((error) => {
				console.log("Error:", error)
			})

		return false
	},

	sendDiscordWebhook: function (message) {
		let csrftoken = getCookie("csrftoken")

		fetch("/sendAdminMessage/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": csrftoken, // Important for Django CSRF protection
			},
			body: JSON.stringify({ message: message }),
		})
			.then((response) => {
				if (!response.ok) {
					console.error("Error sending webhook:", response.status, response.statusText)
				}
			})
			.catch((error) => {
				console.error("Error sending webhook:", error)
			})
	},

	saveFactoryMove: function (model, player, _useTheFirst) {
		// we cannot be sure if we are first in turn order accoring to the server.
		// So need to submit to server and check where we're at.
		// We could (now) be first, but not first when we started - so all factories need to be validated really

		// The server must be up to date, so we need to submit all factory data, plus componentNAMES added this turn
		//var player = model.players[global.pov];

		var FCIATT = player.factory.factoryComponenetIndexesAddedThisTurn
		var FCNATT = player.factory.factoryComponentNamesAddedThisTurn
		var FDBEdeco = decompressObjectFromDB(player.factory.factoryDataBeforeExpansion)
		var FDBE = []
		var ThisAC = []
		if (FDBEdeco != null) {
			FDBE = FDBEdeco[0] // CAUSES AN ERROR
			ThisAC = FDBEdeco[1]
		}

		var useTheFirst = false
		if (_useTheFirst) useTheFirst = true
		var idxToUse = global.currentPlayers.indexOf(global.name)
		if (idxToUse === -1) idxToUse = global.currentPlayers.indexOf(M.players[global.pov].name)
		if (idxToUse === -1 && global.name === "BotKickStarter") idxToUse = 0

		showLoader()

		var csrftoken = getCookie("csrftoken")

		// Use this for turns that could be simultaneous; eg payday, restructure, fridge
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				latestUpdate: global.latestUpdate, // USED
				action: "saveFactoryMove", // USED
				other: compressObjectToDB([FDBE, FCIATT, FCNATT, ThisAC]),
				data: compressObjectToDB(player.factory.export()), // USED
				idx: idxToUse,
				gameID: global.gameID,
				name: player.originalName,
				BKSN: M.players[global.pov].name,
				useTheFirst: useTheFirst,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				if (result.syncError) {
					alert(gettext("It appears you have an older version of the game. Please refresh the page"))
					return
				}
				hideLoader()
				// if fac is immediately unverified, reopen the turn
				if (result.invalid) {
					var name = result.name
					var backInfo = decompressObjectFromDB(result.backInfo)
					var FDBE = backInfo[0]
					var FCIATT = backInfo[1]
					var DBavailableComponents = backInfo[2]
					M.availableComponents = [...DBavailableComponents]
					var player = M.players[global.pov]
					player.factory = Factory.import(FDBE)
					player.factory.factoryComponenetIndexesAddedThisTurn = [...FCIATT]
					V.render()
					C.startActions()
					// Don't need, as given in info
					// But do need this is immediately invalid
					$("#actions").prepend("<B><span style='color: red'>" + gettext("Previous players used up the components. Please rearrange your factory") + "</span></B><BR/>")

					global.fullreset = compressObjectToDB(M.export())
				}
				// if the fac is verified, but NOT first player, just say it's stored

				// If fac is verified, AND first player, update players, game data
				else if (result.VFFFP === true) {
					delete global.fullreset
					global.currentPlayers = result.currentPlayers
					global.latestUpdate = String(result.latestUpdate)
					$("#actions").empty()
					C.reloadModel(result.gameData)
					if (global.currentPlayers.length === 0) {
						delete global.fullreset
						M = C.moveToNextPhase()
						IO.saveGame(M)
						C.startActions()
					}
					// refresh active players
					return
				} else if (result.stored) {
					delete global.fullreset
					$("#actions").empty()
					$("#actions").append(gettext("Your factory has been saved. It will be verified again when it's your turn"))
					$("#eligibleComponentsDiv").hide()
					global.move = true
					// Clear factory expansion excesses -- need to keep components inactive
					global.justMoved = true
					V.render(M.gameFlow.unalteredTurnOrder.indexOf(global.pov))
				}

				// If you are here and currentPlayers is empty, send alert
				if (global.currentPlayers.length === 0) {
					this.sendDiscordWebhook(`HLC GameID ${global.gameID} - currentPlayers is empty after factory move save.`)
				}
			})
			.catch((error) => {
				console.log("Error:", error)
			})

		return false
	},

	saveTurnZeroMove: function (model, playerToKickIndex) {
		var player = model.players[global.pov]
		if (playerToKickIndex != undefined && playerToKickIndex >= 0) player = model.players[playerToKickIndex]
		var callData = {
			latestUpdate: global.latestUpdate, // USED
			action: "turn0move", // USED
			content: compressObjectToDB(player.factory.export()), // USED
			gameID: global.gameID,
		}
		if (playerToKickIndex != undefined && playerToKickIndex >= 0) callData.kickedPlayerName = player.originalName

		showLoader()
		var csrftoken = getCookie("csrftoken")
		// Use this for turns that could be simultaneous; eg payday, restructure, fridge
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify(callData),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				if (result.syncError) {
					alert(gettext("It appears you have an older version of the game. Please refresh the page"))
					return
				}
				hideLoader()
				if (result.ready === false) {
					global.currentPlayers = result.currentPlayers
					// refresh active players
					V.render(M.gameFlow.unalteredTurnOrder.indexOf(global.pov))
				} else if (result.ready === true) {
					// reload model
					C.reloadModel(result.gameData)
					$("#actions").empty()
					M = C.moveToNextPhase()
					IO.saveGame(M)
				}
			})
			.catch((error) => {
				console.log("Error:", error)
			})

		return false
	},

	kickout: async function () {
		// Voting layer: 3p+ games need a majority vote to kick, unless the
		// requester's own vote for this target is more than 2 days old.
		// If the vote is only recorded, return straight away without kicking.
		showLoader()
		var csrftoken = getCookie("csrftoken")
		return fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "kickout",
				gameID: global.gameID,
				kickedName: global.playerToKickName,
				latestUpdate: global.latestUpdate,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				if (result.syncError) {
					alert(gettext("It appears you have an older version of the game. Please refresh the page"))
					return
				}
				hideLoader()
				if (result.voteCast) {
					global.kickoutVotesData = JSON.parse(result.votesData)
					global.kickoutVoteThreshold = result.threshold
					return result
				}
				global.latestUpdate = String(result.latestUpdate)
				global.secondsToNextKickout = result.secondsToNextKickout
				return result
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	saveGameDataFromKickout: async function (model, nextPlayersArr, kickedName) {
		// TODO
		let wsConnecting = null
		wsConnecting = StartWebSocket()

		var turn = M.gameFlow.turn
		var phase = M.gameFlow.phase
		showLoader()
		var callData = {
			action: "saveAfterKickout",
			data: compressObjectToDB(model.export()),
			turn: turn,
			phase: phase,
			nextPlayer: nextPlayersArr,
			gameID: global.gameID,
			kickedName: kickedName,
			latestUpdate: global.latestUpdate,
			status: "ACTIVE",
		}
		if (model.gameEnded > 0) {
			callData.status = "FINISHED" // USED
			callData.winner = global.winner // USED
			callData.deleteMoves = "true" // USED
			let finalPositions = []
			for (let i = 0; i < M.players.length; i++) {
				finalPositions.push(M.players[i].name)
			}
			callData.finalPositions = finalPositions
		}

		var csrftoken = getCookie("csrftoken")
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify(callData),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				var index
				var player
				global.latestUpdate = String(result.latestUpdate)
				if (result.syncError && !ignoreSync) {
					alert(gettext("It appears you have an older version of the game. Please refresh the page"))
					return
				}
				hideLoader()
				$("#actions").empty()
				global.secondsToNextKickout = result.secondsToNextKickout

				// Now set the game to the next state
				// You can only kickout someone in turn order. So must be first in turn order
				if (M.gameEnded > 0) {
					// Do this to display that you are the winner
					V.render()
				} else if (M.gameFlow.turn === 0) {
					// just save a turn 0 move with the bot player
					index = model.players.map((item) => item.originalName).indexOf(kickedName)
					player = M.players[index]
					showLoader()
					var csrftoken = getCookie("csrftoken")
					fetch("/HLC/processHLCturn/", {
						method: "POST",
						body: JSON.stringify({
							latestUpdate: global.latestUpdate, // USED
							action: "turn0move", // USED
							content: compressObjectToDB(player.factory.export()), // USED
							gameID: global.gameID,
							kickedPlayerName: kickedName,
						}),
						headers: { "X-CSRFToken": csrftoken },
					})
						.then((response) => response.json())
						.then((result) => {
							if (result.syncError) {
								alert(gettext("It appears you have an older version of the game. Please refresh the page"))
								return
							}
							hideLoader()
							if (result.ready === false) {
								global.currentPlayers = result.currentPlayers
								// refresh active players
								V.render(M.gameFlow.unalteredTurnOrder.indexOf(global.pov))
							} else {
								// reload model
								C.reloadModel(result.gameData)
								$("#actions").empty()
								M = C.moveToNextPhase()
								IO.saveGame(M)
							}
						})
						.catch((error) => {
							console.log("Error:", error)
						})
				} // END TURN 0 KICKOUT
				else if (M.gameFlow.phase === PHASE_BUILD_FACTORY) {
					
					// kickout last player
					if (global.currentPlayers.length === 0) {
						M = C.moveToNextPhase()
						IO.saveGame(M)
					}
					// Otherwise save a fac move for the kicked out player
					else {
						index = model.players.map((item) => item.originalName).indexOf(kickedName)
						player = M.players[index]
						IO.saveFactoryMove(M, player, true)
					}

					broadcastGameUpdate(wsConnecting)

				}
				// Otherwise in standard non-simul phase
				else {
					if (M.gameFlow.phase === PHASE_SELL) C.endPlayerSalesTurn()
					else C.endPlayerTurn()
				}
			})
			.catch((error) => {
				alert("Something went wrong during kickout. Please submit a bug report so I can restart the game")
				console.log("Error:", error)
			})
	},

	resign: function (model, player, callback, context) {
		if (model.allowSurrender == true) {
			showLoader()
			var csrftoken = getCookie("csrftoken")
			if (player == undefined) player = model.players[global.pov].name

			fetch("/HLC/processTurn/", {
				method: "POST",
				// None of this is used - the player actioning the API must be the one resigning
				body: JSON.stringify({
					gameID: global.gameID,
					action: "resign",
					user: player,
				}),
				headers: { "X-CSRFToken": csrftoken },
			})
				.then((response) => response.json())
				.then((result) => {
					delete global.move
					hideLoader()
					var nbNonPlayers = 0
					_.each(model.players, function (p) {
						if (p.autoplay == true || p.bankrupt == true) {
							nbNonPlayers++
						}
					})

					if (nbNonPlayers >= model.players.length - 1) {
						model.endGame()
						IO.saveGameData(model)
						V.render()
						return false
					}
					if (model.workflow.turn == 0) C.next()
					else IO.saveGameData(model)
					// Want to check return data, passing it into simul phase to carry on the game
				})
				.catch((error) => {
					console.log("Error:", error)
					alert("Something went wrong. Please reload the page. If the problem persists, please contact the webmaster")
				})
		}
	},

	loadRewind: function (controller) {
		if (global.alreadyRewinding) return
		global.alreadyRewinding = true
		if (M.gameEnded > 0) {
			$("#wholeMainArea").fadeIn("slow")
			if ($("#actions").html().slice(0, 8) !== "You cann") $("#actions").prepend(gettext("You cannot rewind a finished game") + "<BR/>")
			global.alreadyRewinding = false
			return
		}
		var csrftoken = getCookie("csrftoken")
		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "loadRewind",
				gameID: global.gameID,
				phase: M.gameFlow.phase,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				global.latestUpdate = result.latestUpdate
				$("#dropdown").hide()
				if (result.message != undefined) {
					$("#wholeMainArea").fadeIn("slow")
					if ($("#actions").html().slice(0, 8) != result.message.slice(0, 8)) $("#actions").prepend(result.message)
				} else {
					delete global.move
					delete global.fullreset
					delete global.sandboxReset
					loadDataString = String(result.loadData)
					var i = 0
					var j = 0
					$("#actions").empty()
					controller.reloadModel(loadDataString)
					$("#wholeMainArea").fadeIn("slow")
					$("#actions").prepend("<B>" + gettext("Game Rewound") + "<B>")
					M.log(Log.REWIND, [M.players[global.pov].name], -1)

					// Re kick booted players
					for (i = 0; i < result.missingPlayers.length; i++) {
						for (j = 0; j < M.players.length; j++) {
							if (M.players[j].name == result.missingPlayers[i]) {
								M.players[j].name = "HcBot"
								M.players[j].autoplay = true
								if (M.players[j].money != undefined && M.players[j].money > 0) M.players[j].money *= -1
							}
						}
					}
					// Send back to DB with another save
					IO.updateDataFromLoadRewind(M)
				}

				global.alreadyRewinding = false
			})
			.catch((error) => {
				$("#actions").prepend("<B>" + gettext("Could not rewind") + "<B>")
				console.log("Error:", error)
			})
	},

	updateDataFromLoadRewind: async function (model) {
		let wsConnecting = null
		wsConnecting = StartWebSocket()

		var i = 0
		// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER
		var nextPlayer = []
		if (!Rules.isSimulPhase() && model.gameFlow.turnOrder.length === 0) {
			model = C.moveToNextPhase()
			if (model.gameFlow.phase === PHASE_BUILD_FACTORY) {
				for (i = 0; i < model.gameFlow.unalteredTurnOrder.length; i++) {
					nextPlayer.push(global.players[model.gameFlow.unalteredTurnOrder[i]])
				}
			} else nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]
		}
		// Otherwise, it is not a new phase.
		else {
			nextPlayer = [model.players[model.gameFlow.turnOrder[0]].name]
		}
		// if not trainng, and it is now building factory, enable everyone
		if (!model.trainingGame && (model.gameFlow.phase === PHASE_BUILD_FACTORY || model.gameFlow.turn === 0)) {
			nextPlayer = []
			for (i = 0; i < model.gameFlow.unalteredTurnOrder.length; i++) {
				nextPlayer.push(model.players[model.gameFlow.unalteredTurnOrder[i]].name)
			}
		}

		global.currentPlayers = nextPlayer
		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/processHLCturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: model.gameFlow.turn,
				nextPlayer: nextPlayer,
				gameID: global.gameID,
				phase: model.gameFlow.phase,
				data: compressObjectToDB(M.export()),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				global.latestUpdate = result.latestUpdate
				hideLoader()


				broadcastGameUpdate(wsConnecting)
				$("#actions").empty()
				C.startActions()
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	/* BELOW IS OTHER FUNCTIONS NOT USING -- processTurn -- IE BUG, CHAT, NOTES, REWIND_CONSENT, CHANGE_ASSISTANCE, ZOOM */
	checkForLatestData: async function () {
		let csrftoken = getCookie("csrftoken")

		// Function to fetch data from the database
		try {
			const response = await fetch("/HLC/data/3/", {
				method: "POST",
				body: JSON.stringify({
					gameID: global.gameID,
					latestUpdate: global.latestUpdate,
				}),
				headers: { "X-CSRFToken": csrftoken },
			})

			if (!response.ok) {
				throw new Error("Network response was not ok")
			}
			const data = await response.json()
			if (data.gameDoesNotExist === true) location.reload()
			if (data.latest === true) return
			else {
				let loadDataString = String(data.loadData)
				global.latestUpdate = String(data.latestUpdate)
				global.secondsToNextKickout = data.secondsToNextKickout
				$("#actions").empty()
				// Do this to update the top line info / green player highlights
				C.reloadModel(loadDataString)
			}
		} catch (error) {
			console.error("Error fetching data:", error)
		}
	},

	postMessage: function (message, player) {
		showLoader()
		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/chat/", {
			method: "POST",
			body: JSON.stringify({
				action: "addMessage",
				player: player,
				gameID: global.gameID,
				message: htmlEscape(message),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				hideLoader()
				var d = new Date().getTime()
				var m = { m: htmlEscape(message), p: player, t: d }
				if (IO.chat != undefined) {
					IO.tsChat = d
					IO.chat.child("message").set(m)
				}
				if (global.liveWS) HLCwebSocket.send("NEWCHATTS" + String(global.gameID))
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	refreshChat: function () {
		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/chat/", {
			method: "POST",
			body: JSON.stringify({
				action: "refreshChat",
				gameID: global.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				var message = {
					message: htmlUnescape(result.message),
					timestamp: result.timestamp,
					name: result.name,
				}
				V.addMessageToDisplayLive(message)
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	postNote: function (note, player) {
		showLoader()
		var csrftoken = getCookie("csrftoken")

		fetch("/HLC/notes/", {
			method: "POST",
			body: JSON.stringify({
				action: "notes",
				type: "post",
				user: player,
				note: htmlEscape(note),
				gameID: global.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
			.then((response) => response.json())
			.then((result) => {
				hideLoader()
				if (note != "") $("#menuButtonNotes").addClass("notesAvailable")
				else $("#menuButtonNotes").removeClass("notesAvailable")
			})
			.catch((error) => {
				console.log("Error:", error)
			})
	},

	/*saveAssistance: function (assistance) {
		var csrftoken = getCookie("csrftoken")

		fetch("/FCM/changeAssistance/", {
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=UTF-8",
				"X-CSRFToken": csrftoken,
			},
			body: JSON.stringify({
				action: "assistance",
				changeAssistance: assistance,
			}),
		})
	},*/

	submitRewindConsent: function () {
		if ($("#checkOnce").prop("checked") == false && $("#checkPermanent").prop("checked") == false) {
			alert(gettext("Please tick a permission option first"))
			return
		}
		var consentLevel = 0
		if ($("#checkPermanent").prop("checked") == true) consentLevel = 2
		else if ($("#checkOnce").prop("checked") == true) consentLevel = 1

		IO.castVote(REWIND_CONSENT_VOTE_TOPIC, consentLevel)

		/*fetch("/HLC/processHLCrewindConsent/", {
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=UTF-8",
				"X-CSRFToken": csrftoken,
			},
			body: JSON.stringify({
				action: "rewindConsent",
				consentLevel: String(consentLevel),
				playerNumber: global.pov,
				gameID: global.gameID,
			}),
		})
			.then((response) => response.json())
			.then((result) => {
				// Prepend actions. // Close consent
				$("#dropdown").fadeOut(400)
				if (result.newPermission == 1) {
					$("#checkOnce").attr("disabled", true)
					$("#checkPermanent").attr("disabled", false)
					$("#checkOnce").attr("checked", true)
					$("#checkPermanent").attr("checked", false)
				} else if (result.newPermission == 2) {
					$("#checkOnce").attr("disabled", true)
					$("#checkPermanent").attr("disabled", true)
					$("#checkOnce").attr("checked", false)
					$("#checkPermanent").attr("checked", true)
					$("#submitRewindConsent").hide()
				}
				$("#actions").prepend("<p><b>" + gettext("Permission Changed") + "</b></p>")
			})
			.catch((error) => {
				console.log("Error:", error)
			})*/
	},

	castVote: async function (topic, choice) {
		showLoader()
		let csrftoken = getCookie("csrftoken")

		let postData = {
			action: "castVote", // USED
			topic: topic, // USED
			gameID: global.gameID, // USED
			choice: choice,
		}

		try {
			const response = await fetch("/HLC/castVote/", {
				method: "POST",
				body: JSON.stringify(postData),
				headers: { "X-CSRFToken": csrftoken },
			})
			if (!response.ok) {
				if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
				throw new Error("Network response was not ok")
			}
			const data = await response.json()

			hideLoader()
			if (data.voteChanged === true) {
				if (topic === REWIND_CONSENT_VOTE_TOPIC) {
					$("#dropdown").hide()
					$("#actions").prepend("<p><b>" + gettext("Permission Changed") + "</b></p>")
					if (choice == 1) {
						$("#checkOnce").attr("disabled", true)
						$("#checkPermanent").attr("disabled", false)
						$("#checkOnce").attr("checked", true)
						$("#checkPermanent").attr("checked", false)
					} else if (choice == 2) {
						$("#checkOnce").attr("disabled", true)
						$("#checkPermanent").attr("disabled", true)
						$("#checkOnce").attr("checked", false)
						$("#checkPermanent").attr("checked", true)
						$("#submitRewindConsent").hide()
					}
				} else if (topic === DELETE_VOTE_TOPIC) {
					$("#actions").prepend("<B>" + gettext("Vote Saved") + "<B>")

					global.votedToDelete = true
					global.deleteVotesData = JSON.parse(data.votesData)
					$("#deleteDiv").html("<hr/>Refresh page to view votes")
					if (data.redirect_url) window.location.href = data.redirect_url
				} else if (topic === STATS_EXCLUDE_VOTE_TOPIC) {
					$("#actions").prepend("<B>" + gettext("Vote Saved") + "<B>")
					global.votedToExclude = true
					global.excludeVotesData = JSON.parse(data.votesData)
					$("#excludeDiv").html("<hr/>Refresh page to view votes")
				}
			} else if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
		} catch (error) {
			console.error("Error fetching data:", error)
			if ($("#actions").html().slice(0, 8) !== "<b>Error saving vote</b>".slice(0, 8)) $("#actions").prepend("<b>Error saving vote</b>")
			return false
		}
	},

	/*saveZoom: function (zoomLevel) {
		var csrftoken = getCookie("csrftoken")

		fetch("/FCM/changeAssistance/", {
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=UTF-8",
				"X-CSRFToken": csrftoken,
			},
			body: JSON.stringify({
				action: "zoom",
				zoomLevel: String(zoomLevel),
				playerNumber: global.pov,
				allPlayers: M.trainingGame,
				gameID: global.gameID,
			}),
		})
	},*/

	htmlEscapeGB: function (value) {
		return String(value)
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/=-NEWLINE-=/g, "\n")
	},
}

function htmlEscape(str) {
	return String(str)
		.replace(/(?:\r|\n|\r\n)/g, "=-NEWLINE-=")
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\\/g, "&#92;")
}

function htmlUnescape(value) {
	return String(value)
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/=-NEWLINE-=/g, "\n")
		.replace(/&#92;/g, "\\")
}

if (!String.prototype.hasOwnProperty("addSlashes")) {
	String.prototype.addSlashes = function () {
		return this.replace(/&/g, "&amp;") /* This MUST be the 1st replacement. */
			.replace(/'/g, "&apos;") /* The 4 other predefined entities, required. */
			.replace(/"/g, "&quot;")
			.replace(/\\/g, "\\\\")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\u0000/g, "\\0")
	}
}

function strip(html) {
	let doc = new DOMParser().parseFromString(html, "text/html")
	return doc.body.textContent || ""
}

/* On Kickout phase: 
	0: insert dummy factory?
	1 - res: skip player / move to next phase
	2 - focus: skip player / move to next phase


Bot Actions:
	SET_FOCUS: Force all bots into last positions
	FACTORY_BUILD: Make sure all bots at end, pass
	SELL: Add sell skip for bot players
*/
var Bot = (function () {
	var self = {}
	var BOT = "__$$BOT==__"
	var BOT_NAME = "HcBot"

	self.correctTurnOrderForBots = function (model) {
		// in sell, bots are passed in order
		if (model.gameFlow.phase === PHASE_SELL) return

		var i = 0

		if (model.gameFlow.phase !== PHASE_BUILD_FACTORY) {
			var botIndexes = []
			for (i = model.gameFlow.unalteredTurnOrder.length - 1; i >= 0; i--) {
				if (model.players[model.gameFlow.unalteredTurnOrder[i]].autoplay === true) botIndexes.push(i)
			}
			// Now bot indexes is reverse order of bots, so extract them
			var botPlayers = []
			for (i = 0; i < botIndexes.length; i++) {
				botPlayers.push(model.gameFlow.unalteredTurnOrder.splice(botIndexes[i], 1)[0])
			}
			// Now add them to start of turn order
			for (i = 0; i < botPlayers.length; i++) {
				model.gameFlow.unalteredTurnOrder.unshift(botPlayers[i])
			}
			// Now skip them from turn order
			model.gameFlow.turnOrder = [...model.gameFlow.unalteredTurnOrder]
			for (i = 0; i < model.gameFlow.turnOrder.length; i++) {
				if (model.players[model.gameFlow.turnOrder[0]].autoplay === true) model.gameFlow.turnOrder.shift()
			}
		} else {
			// Remove any bots at start of factory lists
			while (model.players[model.gameFlow.turnOrder[0]].name === "HcBot") {
				model.gameFlow.turnOrder.shift()
			}
		}
	}

	self.actionPlayerKickout = async function (event) {
		var playerToKickName = event.data.playerToKickName
		const playerToKickIndex = M.players.findIndex((object) => {
			return object.name === playerToKickName
		})
		if (global.kickoutRequired === 2) {
			// Voting layer: 3p+ games need a majority vote to kick out,
			// unless my own vote for this target is more than 2 days old.
			if (global.kickoutVoteThreshold > 1 && !hasSoloKickoutRight(playerToKickName)) {
				const result = await IO.kickout()
				if (result && result.voteCast) {
					buildKickoutActions()
					return
				}
			}
			global.kickoutRequired = 0
			var i = 0
			var bot = BOT
			var nextPlayersArr = []
			var skipTheRest = false

			var playerToKickObject = M.players[playerToKickIndex]

			// Action the kick in game
			M.log(Log.KICKOUT, [playerToKickObject.name])

			playerToKickObject.name = BOT_NAME
			playerToKickObject.autoplay = true
			if (playerToKickObject.money > 0) playerToKickObject.money *= -1
			else playerToKickObject.money = -1
			playerToKickObject.gantt = -1

			// Update global.currentPlayers to replace the kickout name with HcBot
			// WHY???????
			if (global.currentPlayers !== undefined) {
				let idx = global.currentPlayers.indexOf(playerToKickName)
				if (idx > -1) {
					global.currentPlayers.splice(idx, 1)
				}
			}
			nextPlayersArr = global.currentPlayers

			// Count non players and end game if only 1 left
			var nbNonPlayers = 0
			_.each(M.players, function (p) {
				if (p.autoplay == true) {
					nbNonPlayers++
				}
			})

			if (nbNonPlayers >= M.players.length - 1) {
				M.gameFlow.phase = PHASE_GAME_END_CHECK

				M.gameEnded = 3

				// Find winner. Sort players by sakes focus, then move highgest money to front
				M.gameFlow.turnOrder = [...M.gameFlow.unalteredTurnOrder]
				var moneyInSalesOrder = []
				for (i = 0; i < M.gameFlow.turnOrder.length; i++) {
					moneyInSalesOrder.push([M.gameFlow.turnOrder[i], M.players[M.gameFlow.turnOrder[i]].money])
				}
				moneyInSalesOrder.sort(function (a, b) {
					return b[1] - a[1]
				})

				for (i = 0; i < M.players.length; i++) {
					M.gameFlow.unalteredTurnOrder[i] = moneyInSalesOrder[i][0]
					M.gameFlow.turnOrder[i] = moneyInSalesOrder[i][0]
				}

				M.log(Log.GAME_END, [M.players[M.gameFlow.unalteredTurnOrder[0]].name, M.gameEnded])
				global.winner = M.players[M.gameFlow.unalteredTurnOrder[0]].name

				IO.saveGameDataFromKickout(M, nextPlayersArr, playerToKickName)
				V.render(-1)
				return
			}

			if (!M.gameFlow.turn === 0) {
				C.endPlayerTurn()
				IO.saveGame(M)
			} else {
				/*if (!Rules.isSimulPhase()) this.model.gameFlow.turnOrder.splice(0, 1);
				else if (this.model.gameFlow.turn === 0) {
					var index = this.model.gameFlow.turnOrder.indexOf(global.pov);
					this.model.gameFlow.turnOrder.splice(index, 1);
				}
				if (this.model.gameFlow.turnOrder.length > 0) {
					this.model.gameFlow.currentPlayer = this.model.gameFlow.turnOrder[0];
					if (MARKET_BOARD_PHASES.includes(this.model.gameFlow.phase)) V.render(-1);
					//else V.render(this.model.gameFlow.turnOrder[0]);*/
				/*if (M.trainingGame) this.startActions();
				}*/
				IO.saveGameDataFromKickout(M, nextPlayersArr, playerToKickName)
				//IO.saveTurnZeroMove(M, playerToKickIndex);
			}
			// Wait for save, then move on
		} // end global.kickoutRequired
	}

	self.actionResign = function (model, playerNumber) {
		var idx = 0
		var player = model.players[playerNumber]
		var resignName = player.name
		model.log(Log.RESIGN, [resignName])
		player.name = BOT_NAME
		player.autoplay = true

		if (player.money > 0) player.money *= -1
		else player.money = -1
		player.gantt = -1

		var i = 0
		var bot = BOT
		var nextPlayer = ""

		// Update global.currentPlayers to replace the kickout name with HcBot
		// WHY???????
		if (global.currentPlayers != undefined) {
			idx = global.currentPlayers.indexOf(resignName)
			if (idx > -1) {
					global.currentPlayers.splice(idx, 1)
				}
		}
		//nextPlayer = global.currentPlayers;

		// Count non players and end game if only 1 left
		var nbNonPlayers = 0
		_.each(M.players, function (p) {
			if (p.autoplay == true) {
				nbNonPlayers++
			}
		})

		if (nbNonPlayers >= M.players.length - 1) {
			M.gameFlow.phase = PHASE_GAME_END_CHECK

			M.gameEnded = 3

			// Find winner. Sort players by sakes focus, then move highgest money to front
			M.gameFlow.turnOrder = [...M.gameFlow.unalteredTurnOrder]
			var moneyInSalesOrder = []
			for (i = 0; i < M.gameFlow.turnOrder.length; i++) {
				moneyInSalesOrder.push([M.gameFlow.turnOrder[i], M.players[M.gameFlow.turnOrder[i]].money])
			}
			moneyInSalesOrder.sort(function (a, b) {
				return b[1] - a[1]
			})

			for (i = 0; i < M.players.length; i++) {
				M.gameFlow.unalteredTurnOrder[i] = moneyInSalesOrder[i][0]
				M.gameFlow.turnOrder[i] = moneyInSalesOrder[i][0]
			}

			M.log(Log.GAME_END, [M.players[M.gameFlow.unalteredTurnOrder[0]].name, M.gameEnded])
			global.winner = M.players[M.gameFlow.unalteredTurnOrder[0]].name

			IO.saveGame(M)
			V.render(-1)
			return
		} else C.endPlayerTurn()

		return true
	}

	return self
})()

var HLCwebSocket
var HLCconnectionPromise = null // Track the in-progress connection
let retryCount = 0
const MAX_RETRIES = 13 // Uses 3 tries per attempt
const BASE_RETRY_DELAY = 2000

async function StartWebSocket() {
	if (HLCwebSocket && HLCwebSocket.readyState === 1) return HLCwebSocket
	if (HLCconnectionPromise) return HLCconnectionPromise

	if (retryCount >= MAX_RETRIES) {
		console.error("Max WebSocket retries reached.")
		document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
		return null
	}

	HLCconnectionPromise = new Promise((resolve) => {
		const connectionTimeout = setTimeout(() => {
			cleanup()
			if (HLCwebSocket) HLCwebSocket.close()
			handleFailure("Connection Timeout")
			resolve(null) // Resolve null to prevent "Uncaught Promise" errors
		}, 4000)

		const cleanup = () => {
			clearTimeout(connectionTimeout)
			HLCconnectionPromise = null
		}

		const handleFailure = (reason) => {
			retryCount++
			console.warn(`WS Attempt ${retryCount} failed: ${reason}`)
			global.liveWS = false

			if (retryCount < MAX_RETRIES) {
				document.getElementById("liveDiv").innerHTML = gettext("Connecting...")
				const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount - 1)
				setTimeout(StartWebSocket, delay)
			} else {
				document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
			}
		}

		try {
			// Logic to prevent multiple native connections
			if (HLCwebSocket && HLCwebSocket.readyState === 0) {
				// Wait for existing native attempt
			} else {
				if (HLCwebSocket) HLCwebSocket.close()
				let wsUri = "wss://wss.s3.sitereview.io/ws/HomeHLCchannel" + String(global.gameID) + "/"
				HLCwebSocket = new WebSocket(wsUri)
			}

			HLCwebSocket.onopen = (evt) => {
				cleanup()
				retryCount = 0
				HLCwebSocketOnOpen(evt)
				resolve(HLCwebSocket)
			}

			HLCwebSocket.onclose = (_evt) => {
				cleanup()
				handleFailure("Socket Closed")
				resolve(null)
			}

			HLCwebSocket.onerror = (_evt) => {
				cleanup()
				handleFailure("Socket Error (Blocked)")
				resolve(null)
			}

			HLCwebSocket.onmessage = (evt) => HLCwebSocketOnInfo(evt)
		} catch (err) {
			cleanup()
			handleFailure(err.message)
			resolve(null)
		}
	})

	return HLCconnectionPromise
}

function HLCwebSocketOnOpen(evt) {
	document.getElementById("liveDiv").innerHTML = gettext("Connected")
	IO.checkForLatestData()
}

function HLCwebSocketOnClose(evt) {
	document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
	setTimeout(StartWebSocket, 2000)
}

function HLCwebSocketOnError(evt) {
	document.getElementById("liveDiv").innerHTML = gettext("Error")
	setTimeout(StartWebSocket, 2000)
}

function HLCwebSocketClose(evt) {
	HLCwebSocket.close()
	// MAYBE DELETE THIS?
	document.getElementById("liveDiv").innerHTML = gettext("Disconnected")
}

async function HLCwebSocketOnInfo(IncomingInfo) {
	if (IncomingInfo.data.slice(0, 16) === "MESSAGEFROMADIN=") {
		alert(IncomingInfo.data.slice(16))
	}

	if (IncomingInfo.data.slice(0, 9) === "NEWCHATTS") {
		if (IncomingInfo.data.slice(9) == global.gameID) {
			IO.refreshChat()
		}
	}

	// UNCOMMENT ONCE RESIGN IS FIXED
	if (global.pov != undefined && M.players[global.pov].name == "HcBot" && global.name !== "BotKickStarter" && M.gameFlow.phase != PHASE_GAME_END_CHECK) {
		$("#actions").html("")
		return
	}
	if (IncomingInfo.data.slice(0, 9) === "NEWDATATS") {
		if (IncomingInfo.data.slice(9, -13) == global.gameID) {
			if (M.gameFlow.phase === PHASE_SET_FOCUS && M.gameFlow.turnOrder.length === 1) {
				//alert(1)
				window.location.reload()
			} else {
				var newTS = parseInt(IncomingInfo.data.slice(-13))
				if (newTS > global.latestUpdate) {
					global.latestUpdate = newTS
					if (M.sandboxMode) {
						$("#newComponentDiv").remove()
					}
					await IO.loadGame(C)

					if (Rules.canPlay()) {
						// Check the browser is capable
						if ("serviceWorker" in navigator && "PushManager" in window) {
							Notification.requestPermission(function (status) {
								const title = "It is your turn in Horseless Carriage"

								const options = {
									body: "" + global.gameName + ": " + M.gameFlow.turn + " - " + PHASES_STR[M.gameFlow.phase],
									//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
									icon: "/static/HLC/images/hc_icon.png",
									tag: "OBGgame",
								}

								var n = new Notification(title, options)
								n.onclick = function (event) {
									//event.preventDefault() // Prevents the browser from focusing the Notification's tab
									//window.open("http://localhost:8000/IND/54/", "_blank")
									// Check if the window client exists
									window.focus()
									n.close()
								}
							})
						}
					}
				} else HLCwebSocket.send("NEWDATATS" + String(global.gameID) + String(global.latestUpdate))
			}
		}
	}
}

async function broadcastGameUpdate(existingPromise = null) {
	try {
		// If we already started connecting in the previous function, use that.
		// Otherwise, start a new check.
		const socket = await (existingPromise || StartWebSocket())

		if (socket.readyState === 1) {
			socket.send("NEWDATATS" + String(global.gameID) + String(global.latestUpdate))
		}
	} catch (err) {
		console.warn("HLC Broadcast failed:", err)
	}
}

/* exported imagePreURL */
var imagePreURL = "/static/HLC/images/"
/* exported soundPreURL */
var soundPreURL = "/static/HLC/Sound/"

function getMyKickoutVote() {
	if (global.kickoutVotesData == undefined) return undefined
	return global.kickoutVotesData[global.name]
}

function hasSoloKickoutRight(targetName) {
	var myVote = getMyKickoutVote()
	if (!myVote || myVote[0] !== targetName) return false
	return new Date().getTime() - myVote[1] > KICKOUT_SOLO_DELAY_MS
}

function canKickoutNow() {
	var target = global.playerToKickName
	var myVote = getMyKickoutVote()
	if (myVote) {
		if (myVote[0] === target) {
			if (new Date().getTime() - myVote[1] > KICKOUT_SOLO_DELAY_MS) return true
		} else if (new Date().getTime() - myVote[1] > KICKOUT_SOLO_DELAY_MS) {
			// My 2 day old vote is for someone else, so clear the requirement for the target
			global.kickoutRequired = 0
			return false
		}
	}
	if (global.kickoutVoteThreshold === 1) return true
	return false
}

function getKickoutVoteCount() {
	var count = 0
	for (var voter in global.kickoutVotesData) {
		var vote = global.kickoutVotesData[voter]
		if (vote[0] === global.playerToKickName) count++
	}
	return count
}

function getKickoutVoters() {
	var names = []
	for (var voter in global.kickoutVotesData) {
		var vote = global.kickoutVotesData[voter]
		if (vote[0] === global.playerToKickName) names.push(voter)
	}
	return names.join(", ")
}

function isLastKickoutVoteRequired() {
	return getKickoutVoteCount() + 1 >= global.kickoutVoteThreshold
}

function updateSoloKickoutCountdown() {
	if ($("#soloKickoutCountdownSpan").length === 0) return
	var myVote = getMyKickoutVote()
	if (!myVote || myVote[0] !== global.playerToKickName) {
		$("#soloKickoutCountdownSpan").html("")
		return
	}
	var remainingMs = Math.max(KICKOUT_SOLO_DELAY_MS - (new Date().getTime() - myVote[1]), 0)
	if (remainingMs <= 0) {
		$("#soloKickoutCountdownSpan").html("")
		if (global.kickoutSoloCountdownIntervalTimer != undefined) clearInterval(global.kickoutSoloCountdownIntervalTimer)
		// Solo kickout right is now available, so rebuild the actions
		buildKickoutActions()
		return
	}
	var totalSeconds = Math.floor(remainingMs / 1000)
	var hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0")
	var minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")
	var seconds = String(totalSeconds % 60).padStart(2, "0")
	$("#soloKickoutCountdownSpan").html(hours + ":" + minutes + ":" + seconds)
}

function buildKickoutActions() {
	var playerToKickName = global.playerToKickName
	$("#actions").empty()
	if (global.kickoutRequired === 1) {
		$("#actions").html(interpolate(gettext("Player <b>%(playerToKickName)s</b> has used all the standard kickout time."), { playerToKickName: playerToKickName }, true))
		$("#actions").append("<br/><br/>")
		$("#actions").append(gettext("Remaining Flex-Time:"))
		$("#actions").append(" ")
		$("#actions").append('<span id="flexiKickoutTimerSpan"></span><br/><br/>')
		$("#actions").append(gettext('For more information see <b><a href="/help/" target="_blank">Help</a></b>'))

		// Calculate remaining flexi-time
		let KickoutFlexiDataArray = global.KickoutFlexiDataArray
		let secondsIn24Hours = 24 * 60 * 60
		let playerSeconds = 0

		// Iterate over the KickoutFlexiDataArray to find the player's entry
		for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
			let entry = KickoutFlexiDataArray[i]

			// Check if the entry is a length-2 array and the first element matches the playerName
			if (Array.isArray(entry) && entry.length === 2 && entry[0] === playerToKickName) {
				playerSeconds = entry[1]
				break
			}
		}

		let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
		global.remainingFlexiSeconds = remainingFlexSecondsBeforeThisMove + global.secondsToNextKickout

		if (global.kickoutFlexiCountdownIntervalTimer != undefined) clearInterval(global.kickoutFlexiCountdownIntervalTimer)
		global.kickoutFlexiCountdownIntervalTimer = setInterval(V.kickoutFlexiTimeFunction, 1000)

		if (global.remainingFlexiSeconds < 0) global.remainingFlexiSeconds = 0
		let hoursToGo = String(Math.floor(global.remainingFlexiSeconds / 60 / 60))
		let minsToGo = String(Math.floor((global.remainingFlexiSeconds % 3600) / 60)).padStart(2, "0")
		let secsToGo = String(Math.floor(global.remainingFlexiSeconds % 60)).padStart(2, "0")

		$("#flexiKickoutTimerSpan").html(" " + hoursToGo + ":" + minsToGo + ":" + secsToGo)
	} else if (global.kickoutRequired === 2) {
		if (canKickoutNow()) {
			if (global.kickoutSoloCountdownIntervalTimer != undefined) clearInterval(global.kickoutSoloCountdownIntervalTimer)
			$("#actions").html(interpolate(gettext("Player <b>%(playerToKickName)s</b> has timed out<BR/>To kick out <B>%(playerToKickName)s</b> press Confirm Kickout<BR/>The game will proceed to the next player/phase/turn<BR/><BR/>Otherwise you can allow <b>%(playerToKickName)s</b> more time - reload the page to initiate kickout again<BR/>"), { playerToKickName: playerToKickName }, true))

			var cancelButtonSpan = $("<BR/><span><button class='actionsLineButton' id='cancelKickoutButton'>" + gettext("Not now - allow more time") + "</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>")
			var ConfirmButtonSpan = $("<span><button class='actionsLineButton' id='confirmKickoutButton'>" + gettext("Confirm Kickout") + "</button></span>")

			$("#actions").append(cancelButtonSpan)
			$("#actions").append(ConfirmButtonSpan)
			$("#cancelKickoutButton").on("click", function () {
				$("#actions").hide()
			})

			//ConfirmButtonSpan.on("click", { playerToKickName: playerToKickName }, Bot.actionPlayerKickout)
			ConfirmButtonSpan.on("click", function () {
				$("#actions").empty()
				$("#actions").html(interpolate(gettext("This will permanently remove <b>%(playerToKickName)s</b> from the game<br/><b>It cannot be undone</b><br/><br/>Try checking the chat in case they have given a reason for any temporary absence<br/>Please consider giving them a short grace period, in case they are just delayed<br/>"), { playerToKickName: playerToKickName }, true))

				var cancelButtonSpan = $("<BR/><span><button class='actionsLineButton' id='cancelKickoutButton'>" + gettext("Not now - allow more time") + "</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>")
				var ConfirmButtonSpan = $("<span><button class='actionsLineButton' id='confirmKickoutButton'>" + gettext("Confirm Kickout") + "</button></span>")

				$("#actions").append(cancelButtonSpan)
				$("#actions").append(ConfirmButtonSpan)
				$("#cancelKickoutButton").on("click", function () {
					$("#actions").hide()
				})

				ConfirmButtonSpan.on("click", { playerToKickName: global.playerToKickName }, Bot.actionPlayerKickout)
			})
		} else if (global.kickoutRequired === 2) {
			$("#actions").html(interpolate(gettext("Player <b>%(playerToKickName)s</b> has timed out<BR/>A vote from the other players is needed to kick out <b>%(playerToKickName)s</b><BR/>"), { playerToKickName: playerToKickName }, true))
			$("#actions").append("<br/><br/>")
			var kickoutVoters = getKickoutVoters()
			if (kickoutVoters === "") kickoutVoters = gettext("None")
			$("#actions").append(gettext("Votes: ") + getKickoutVoteCount() + "/" + global.kickoutVoteThreshold + " (" + kickoutVoters + ")")
			$("#actions").append("<br/>")
			if (!getMyKickoutVote()) {
				if (isLastKickoutVoteRequired()) {
					$("#actions").append(interpolate(gettext("This will permanently remove <b>%(playerToKickName)s</b> from the game<br/><b>It cannot be undone</b><br/><br/>"), { playerToKickName: playerToKickName }, true))
				}
				var voteButtonSpan = $("<span><button class='actionsLineButton' id='voteKickoutButton'>" + gettext("Vote to Kickout ") + playerToKickName + "</button></span>")
				$("#actions").append(voteButtonSpan)
				$("#actions").append("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")
				$("#voteKickoutButton").on("click", { playerToKickName: playerToKickName }, Bot.actionPlayerKickout)
				var cancelButtonSpan = $("<span><button class='actionsLineButton' id='cancelKickoutButton'>" + gettext("Not now - allow more time") + "</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>")
				$("#actions").append(cancelButtonSpan)
				$("#cancelKickoutButton").on("click", function () {
					$("#actions").hide()
				})
			} else {
				$("#actions").append(interpolate(gettext("You have voted to kick out <b>%(playerToKickName)s</b><br/>If the other players do not also vote, you will be able to kick them out directly in <span id='soloKickoutCountdownSpan'></span>"), { playerToKickName: playerToKickName }, true))
				if (global.kickoutSoloCountdownIntervalTimer != undefined) clearInterval(global.kickoutSoloCountdownIntervalTimer)
				global.kickoutSoloCountdownIntervalTimer = setInterval(updateSoloKickoutCountdown, 1000)
				updateSoloKickoutCountdown()
				$("#actions").append("<br/><br/>")
				var cancelButtonSpan = $("<BR/><span><button class='actionsLineButton' id='cancelKickoutButton'>" + gettext("Not now - allow more time") + "</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>")
				$("#actions").append(cancelButtonSpan)
				$("#cancelKickoutButton").on("click", function () {
					$("#actions").hide()
				})
			}
		}
	}
	$("#actions").show()
	V.renderKickoutCountdown()
}

function init() {
	//var M;
	// global.debug = true;
	// global.superuser = true;
	// Used in history to only store time difference from game start
	if (global.now != undefined && global.now > 0) {
		IO.timeOffset = new Date().getTime() - global.now
	}

	if (global.notes != undefined && global.notes != "") $("#menuButtonNotes").addClass("notesAvailable")

	$("#submitRewindConsent").on("click", IO.submitRewindConsent)

	if (global.load != undefined) {
		var loadData = decompressObjectFromDB(global.load)
		M = Model.import(loadData)
		//if (!global.HLCgameSummary) Log.refreshHistory(M)

		///////////////////

		//M.players[1].money = 200;
		/*M.players[0].gantt = 2;
        M.players[1].gantt = 2;
        M.players[2].gantt = 1;
        M.gameFlow.turn = 1;
        M.gameFlow.phase = 1;*/
		//////////////////
	} else {
		M = new Model()
		M.start({ players: global.players })

		if (global.players.includes(global.name)) IO.saveGame(M)
	}

	if (global.HLCgameSummary) {
		initHLCgameSummary()
		return
	}
	/********************************************* */
	// M.trainingGame = true;

	/*********************************** */

	// Training Game
	if (M.trainingGame && global.players.includes(global.name)) {
		global.superuser = true
	}
	V = new View(M)

	C = new Controller(M, V)

	if (global.load != undefined && !global.HLCgameSummary) Log.refreshHistory(M)

	if (global.liveWS) {
		$(".live").show()
		IO.init(C)
		StartWebSocket().catch(() => {
			console.log("WebSocket background task initialized.")
		})
	}

	// Check for no current player here
	if (global.currentPlayers === undefined || global.currentPlayers.length === 0) {
		// If it is factory build phase, with no one to move, it means the last player disconnected
		// So run the code in IO again here. This should save it and move the game on
		if (M.gameFlow.phase === PHASE_BUILD_FACTORY) {
			delete global.fullreset
			M = C.moveToNextPhase()
			IO.saveGame(M)
			C.startActions()
		} else {
			IO.sendDiscordWebhook(`HLC GameID ${global.gameID} - No current player detected: ${global.currentPlayers}`)
			alert("ERROR: No current player\nContact admin on Discord or Email")
		}
	}

	if (M.gameFlow.turn === 0 && global.move != undefined) {
		M.players[global.pov].factory = Factory.import(decompressObjectFromDB(global.move.content))
	}
	if (M.gameFlow.phase === PHASE_BUILD_FACTORY && global.move != undefined) {
		var moveData = decompressObjectFromDB(global.move.content)
		var FDBE = moveData[0]
		var FCIATT = moveData[1]
		var FCNATT = moveData[2]
		var FAC_DATA_RAW = moveData[3]

		if (!Rules.canPlay()) {
			M.players[global.pov].factory = Factory.import(FAC_DATA_RAW)
		} else {
			M.players[global.pov].factory = Factory.import(FDBE)
		}

		M.players[global.pov].factory.factoryComponenetIndexesAddedThisTurn = FCIATT

		global.fullreset = compressObjectToDB(M.export())
	}
	if (M.gameFlow.phase === PHASE_BUILD_FACTORY && global.temporaryMove != undefined) {
		if (global.temporaryMove.type === "NODATASFWET") {
			var temporaryMoveData = decompressObjectFromDB(global.temporaryMove.content)
			M.players[global.pov].factory = Factory.import(temporaryMoveData)
			Rules.removeFCIATTcomponentsFromPlay(M.players[global.pov].factory)
			global.fullreset = compressObjectToDB(M.export())
		}
	}

	// Rules checked in C.startActions. Also if can't play display info in C.startActions
	C.startActions()

	if (global.pov != undefined && global.pov >= 0) {
		global.votedToExclude = global.statsExcludeVotesData[global.name]
		global.votedToDelete = global.deleteVotesData[global.name]
		if (!global.tournamentGame && !M.trainingGame && M.gameFlow.phase !== PHASE_GAME_END_CHECK) {
			let dropdown = $("#dropdown")
			// Exclude stats
			let excludeDiv = $("<div id='excludeDiv'></div>")
			excludeDiv.append("<hr/>")
			excludeDiv.append(gettext("If all players agree, this game can be excluded from the stats<br/>(won't count towards wins/losses)"))
			excludeDiv.append("<br/>")
			let excludeVotes = 0
			for (const player in global.statsExcludeVotesData) {
				if (global.statsExcludeVotesData[player] === true) {
					excludeVotes += 1
				}
			}
			let excludePlayers = "None"
			for (const player in global.statsExcludeVotesData) {
				if (global.statsExcludeVotesData[player] === true) {
					if (excludePlayers === "None") excludePlayers = String(player)
					else excludePlayers += ", " + player
				}
			}
			excludeDiv.append("Votes: " + excludeVotes + " - Players: " + excludePlayers)
			excludeDiv.append("<br/>")
			if (!global.votedToExclude) excludeDiv.append(`<button class="actionsLineButton voteExcludeButton" onClick="IO.castVote('${STATS_EXCLUDE_VOTE_TOPIC}', true)">Vote to Exclude Game from Stats</button>`)
			dropdown.append(excludeDiv)
			// Delete game
			let deleteDiv = $("<div id='deleteDiv'></div>")
			deleteDiv.append("<hr/>")
			deleteDiv.append(gettext("If all players agree, this game will be deleted"))
			deleteDiv.append("<br/>")
			let votes = 0
			for (const player in global.deleteVotesData) {
				// Use const or let for player
				if (global.deleteVotesData[player] === true) {
					votes += 1
				}
			}
			let players = "None"
			for (const player in global.deleteVotesData) {
				// Use const or let for player
				if (global.deleteVotesData[player] === true) {
					if (players === "None") players = String(player)
					else players += ", " + player
				}
			}
			deleteDiv.append("Votes: " + votes + " - Players: " + players)
			deleteDiv.append("<br/>")
			if (!global.votedToDelete) deleteDiv.append(`<button class="actionsLineButton voteDeleteButton" onClick="IO.castVote('${DELETE_VOTE_TOPIC}', true)">Vote to Delete Game</button>`)
			dropdown.append(deleteDiv)
		}
	}

	V.render()
	V.refreshChat()
	if (global.chatNotification === true) {
		V.displayChat()
	}

	if (!global.debug && global.name !== "admin")
		$(document).on("contextmenu", function (e) {
			e.originalEvent.preventDefault()
			e.preventDefault()
			return false
		})

	if (global.name == undefined || global.name === "") {
		$("#actions").empty()
		$("#actions").html(gettext("Please <a href='/register'>REGISTER</a> or <a href='/login'>LOGIN</a> to play a game"))
		$("#actions").show()
	}

	$(document).keydown(function (event) {
		//if (event.altKey && event.which === 82)

		// r = rotate
		if (event.which === 82) {
			// DONT USE - STOPS WORKING IN CHAT / ETC!!!!
			//event.preventDefault();
			if (M.gameFlow.phase === PHASE_BUILD_FACTORY || PHASE_FACTORY_SETUP || M.sandboxMode) {
				if (!$("#bugContent").is(":focus") && !$("#chatMessage").is(":focus") && !$("#notes").is(":focus")) {
					V.rotateComponentR(M.players[global.pov].factory, true)
				}
			}
		}
		// del/backsp = remove last
		if (event.which === 8 || event.which === 46) {
			if (M.gameFlow.phase === PHASE_BUILD_FACTORY || PHASE_FACTORY_SETUP || M.sandboxMode) {
				if (!$("#bugContent").is(":focus") && !$("#chatMessage").is(":focus") && !$("#notes").is(":focus")) {
					C.clickedOnRemoveLastComponent(C.currentPlayer().factory)
				}
			}
		}
	})

	// CHECK FOR KICKOUT FIRSTLY HERE, checks every single time for global.kickout true
	// this is the only place to enter this function
	if (global.kickoutRequired > 0) {
		var currentPlayersArray = global.currentPlayers
		currentPlayersArray = currentPlayersArray.filter(function (a) {
			return a !== "HcBot"
		})
		var playerToKickName = currentPlayersArray[0]
		global.playerToKickName = playerToKickName

		buildKickoutActions()
	}

	$("#loggedInDiv").click(function () {
		if (global.name === "BotKickStarter") {
			global.superuser = true
			global.pov++
			if (global.pov === M.players.length) global.pov = 0

			//M.availableComponents[TIRE] = 0
			//IO.saveGame(M, true)

			V.render()
			C.startActions()
			$("#actions").prepend("P: " + String(global.pov) + " N: " + M.players[global.pov].name)

			/*M.players[2].name = "tlance8";
            IO.saveGame(M, true);*/

			/*  [M.gameFlow.turnOrder[0], M.gameFlow.turnOrder[1]] = [M.gameFlow.turnOrder[1], M.gameFlow.turnOrder[0]];
              [M.gameFlow.unalteredTurnOrder[0], M.gameFlow.unalteredTurnOrder[1]] = [M.gameFlow.unalteredTurnOrder[1], M.gameFlow.unalteredTurnOrder[0]];
              IO.saveGame(M);
             V.render();
             alert("Complete")*/
		}
	})

	if (global.name === "admin" || global.name === "BotKickStarter") {
		// Create the buttons
		let button1 = $("<button>").text("Raw Save")
		let button2 = $("<button>").text("Button 2")

		// Attach the buttons to the div with ID "zoomDiv"
		$("#zoomDiv").append(button1, button2)

		// Add onclick event handlers for the buttons
		button1.on("click", function () {
			IO.saveGame(M, true)
		})

		button2.on("click", function () {
			M.availableComponents[ENGINE]++
		})
	}
}

$(window).on("load", init)
