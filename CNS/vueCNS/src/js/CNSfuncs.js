/**
 * shuffle
 * removeItemAll
 * sleepPause
 * getCookie
 * timestampToString
 * htmlUnescape
 * decompressChatData
 * export
 * import
 */

//import * as rf from './CNSreference'
import * as map from './CNSmap'

import seedrandom from 'seedrandom';
import hexlib from './hexlib'

//import { usePersonalStore } from '../stores/TGZpersonal.js'
import { useModelStore } from '../stores/CNSstore.js'

export const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
      //const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export function shuffleSeeded(array, seed = null) {
  let rng;
  let generatedSeed;

  if (seed) {
    rng = seedrandom(seed);
  } else {
    generatedSeed = Math.random().toString(36).substring(2);
    rng = seedrandom(generatedSeed);
  }

  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return {
    shuffled,
    seed: seed ? seed : generatedSeed
  };
}



export function removeItemAll(arr, value) {
  var arrCopy = [...arr]
  var i = 0
  while (i < arr.length) {
    if (arrCopy[i] === value) {
      arrCopy.splice(i, 1)
    } else {
      ++i
    }
  }
  return arrCopy
}

export function sleepPause(miliseconds) {
  var currentTime = new Date().getTime()

  while (currentTime + miliseconds >= new Date().getTime()) {
    // Do Nothing
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// get CSRF for javascript
export function getCookie(name) {
  var cookieValue = null
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';')
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim()
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

export function timestampToString(timestamp) {
  var d = new Date(timestamp)
  var res = ''
  if (d.getDate() < 10) res += '0' + d.getDate() + '/'
  else res += d.getDate() + '/'
  if (d.getMonth() < 9) res += '0' + (d.getMonth() + 1) + '/'
  else res += d.getMonth() + 1 + '/'
  res += d.getFullYear() + ' '
  if (d.getHours() < 10) res += '0' + d.getHours() + ':'
  else res += d.getHours() + ':'
  if (d.getMinutes() < 10) res += '0' + d.getMinutes() + ':'
  else res += d.getMinutes() + ':'
  if (d.getSeconds() < 10) res += '0' + d.getSeconds()
  else res += d.getSeconds()

  return res
}

export function htmlEscape(str) {
  return String(str)
    .replace(/(?:\r|\n|\r\n)/g, 'SNLB')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function htmlUnescape(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/SNLB/g, '\n');
}

export function decompressChatData(data) {
  if (data.length > 0) {
    //var step1 = LZString.decompressFromEncodedURIComponent(data)
    let compressedData = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    // eslint-disable-next-line no-undef
    let decompressedData = pako.ungzip(compressedData, { to: 'string' });
    var chatArray = JSON.parse(decompressedData)
    //var chatArray = JSON.parse(step1)
  } else chatArray = []

  chatArray.push([
    'WelcomeBot',
    0,
    'Welcome to Cannes Online!SNLBSNLBIf you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!'
  ])

  return chatArray
}

export function exportModel(includeContext) {
  const store = useModelStore()
  let tempFinal = []

  // 0 Hexes
  let tempHexes = []
  for (let i = 0; i < store.hexes.length; i++) {
    //[id, hexRef, rotation, q, r, s]
    tempHexes.push([store.hexes[i].id, store.hexes[i].hexRef, store.hexes[i].rotation, store.hexes[i].hex.q, store.hexes[i].hex.r])
  }
  tempFinal.push(tempHexes)
  //temp.push(JSON.parse(JSON.stringify(store.hexes)))

  // 1 Players
  let tempPlayers = []
  for (let i = 0; i < store.players.length; i++) {
    let linksHexRefsOnly = []
    for (let j = 0; j < store.players[i].links.length; j++) {
      linksHexRefsOnly.push([store.players[i].links[j][0].hexRef, store.players[i].links[j][1].hexRef])
    }
    tempPlayers.push([
      store.players[i].name, // 0
      store.players[i].displayName, // 1
      store.players[i].colour, // 2
      store.players[i].score, // 3
      JSON.parse(JSON.stringify(store.players[i].storedResources)),// 4
      JSON.parse(JSON.stringify(store.players[i].seenDiscardHexRefs)),// 5
      JSON.parse(JSON.stringify(linksHexRefsOnly)) // 6
      // Links
      // [ {id, hex, hexref, rotation}, {} ]
    ])
  }
  tempFinal.push(tempPlayers)
  //temp.push(JSON.parse(JSON.stringify(store.players)))

  // 2
  let oldBoysHexRefsOnly = []
  for (let i = 0; i < store.oldBoysNetwork.length; i++) {
    oldBoysHexRefsOnly.push([store.oldBoysNetwork[i][0].hexRef, store.oldBoysNetwork[i][1].hexRef])
  }
  tempFinal.push(JSON.parse(JSON.stringify(oldBoysHexRefsOnly)))
  //temp.push(JSON.parse(JSON.stringify(store.oldBoysNetwork)))

  // 3
  tempFinal.push(JSON.parse(JSON.stringify(store.hexDrawPile)))
  //temp.push(JSON.parse(JSON.stringify(store.hexDrawPile)))

  // 4
  tempFinal.push(JSON.parse(JSON.stringify(store.hexDiscardPile)))
  //temp.push(JSON.parse(JSON.stringify(store.hexDiscardPile)))

  // 5
  tempFinal.push(JSON.parse(JSON.stringify(store.moviePrices)))
  //temp.push(JSON.parse(JSON.stringify(store.moviePrices)))

  // 6
  tempFinal.push([
    store.gameflow.turn, // 0
    store.gameflow.phase, // 1
    JSON.parse(JSON.stringify(store.gameflow.turnOrder)), // 2
    JSON.parse(JSON.stringify(store.gameflow.fullTurnOrder)), // 3
  ])
  //temp.push(JSON.parse(JSON.stringify(store.gameflow)))

  // 7
  tempFinal.push(JSON.parse(JSON.stringify(store.history)))
  //temp.push(JSON.parse(JSON.stringify(store.history)))

  //8
  tempFinal.push(JSON.parse(JSON.stringify(store.ongoingVars.drawnHexes)))
  //temp.push(JSON.parse(JSON.stringify(store.ongoingVars)))

  //9
  if (store.tableUp === 0) tempFinal.push([])
  else tempFinal.push([store.tableUp, store.tableDown, store.tableLeft, store.tableRight])

  //10 
  let tableJunkTemp = []
  for (let i = 0; i < store.tableJunk.length; i++) {
    tableJunkTemp.push(store.tableJunk[i][0].q, store.tableJunk[i][0].r, store.tableJunk[i][1])
  }
  tempFinal.push(JSON.parse(JSON.stringify(tableJunkTemp)))
  //temp.push(JSON.parse(JSON.stringify(store.tableJunk)))

  // 11
  if (store.useExpansion) tempFinal.push([1, store.pirateShipRef])
  else tempFinal.push(0)

  //12
  if (includeContext) tempFinal.push(JSON.parse(JSON.stringify(store.context)))


  let step1 = JSON.stringify(tempFinal)
  //let step2 = LZString.compressToEncodedURIComponent(step1)
  // PAKO
  // eslint-disable-next-line no-undef
  let step2 = pako.gzip(step1);
  let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)));

  return base64Data
}

export function importModel(input, includeContext) {
  // Remove ghosts
  const store = useModelStore()
  let ghostDivs = document.getElementsByClassName('ghostDiv')
  let ghostImgs = document.getElementsByClassName('ghostImg')
  for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = 'none'
  for (let i = 0; i < ghostImgs.length; i++) ghostImgs[i].style.display = 'none'
  store.topMenuViews.currentGhostIndex = -1

  if (input === '' || input == undefined) return

  //var step1 = LZString.decompressFromEncodedURIComponent(input)
  let compressedData = Uint8Array.from(atob(input), c => c.charCodeAt(0));
  // eslint-disable-next-line no-undef
  let decompressedData = pako.ungzip(compressedData, { to: 'string' });
  let inputModel = JSON.parse(decompressedData)

  // 0 hexes
  store.hexes.splice(0)
  for (let i = 0; i < inputModel[0].length; i++) {
    store.hexes.push({
      id: inputModel[0][i][0],
      hexRef: inputModel[0][i][1], 
      rotation: inputModel[0][i][2],
      hex: new hexlib.Hex(inputModel[0][i][3], inputModel[0][i][4], map.calculateScoord(inputModel[0][i][3], inputModel[0][i][4])) 
    })
  }
  //Object.assign(store.hexes, inputModel[1])

  // 1 players
  let replacing = false
  if (store.players.length > 0) replacing = true
  for (let i = 0; i < inputModel[1].length; i++) {
    if (replacing) {
      store.players[i].name = inputModel[1][i][0]
      store.players[i].displayName = inputModel[1][i][1]
      store.players[i].colour = inputModel[1][i][2]
      store.players[i].score = inputModel[1][i][3]

      store.players[i].storedResources = inputModel[1][i][4]
      store.players[i].seenDiscardHexRefs = inputModel[1][i][5]
      store.players[i].links = []
      for (let j=0;j<inputModel[1][i][6].length;j++) {
        store.players[i].links.push([map.reconstructHexDataFromHexRef(inputModel[1][i][6][j][0]), map.reconstructHexDataFromHexRef(inputModel[1][i][6][j][1])])
      }
    } else {
      let tempLinks = []
      for (let j=0;j<inputModel[1][i][6].length;j++) {
        tempLinks.push([map.reconstructHexDataFromHexRef(inputModel[1][i][6][j][0]), map.reconstructHexDataFromHexRef(inputModel[1][i][6][j][1])])
      }     
      store.players.push({
        name: inputModel[1][i][0],
        displayName: inputModel[1][i][1],
        colour: inputModel[1][i][2],
        score: inputModel[1][i][3],

        storedResources: inputModel[1][i][4],
        seenDiscardHexRefs: inputModel[1][i][5],
        links: JSON.parse(JSON.stringify(tempLinks))
      })
    }
  }
  //store.players.splice(0)
  //Object.assign(store.players, inputModel[0])

  // 2 oldBoysNetwork
  store.oldBoysNetwork.splice(0)
  for (let i=0;i<inputModel[2].length;i++) {
    store.oldBoysNetwork.push([map.reconstructHexDataFromHexRef(inputModel[2][i][0]), map.reconstructHexDataFromHexRef(inputModel[2][i][1])])
  }  
  //Object.assign(store.oldBoysNetwork, inputModel[2])


  // 3 hexDrawPile
  store.hexDrawPile.splice(0)
  store.hexDrawPile.push(...inputModel[3])

  // 4 hexDiscardPile
  //Object.assign(store.coords, inputModel[4])
  store.hexDiscardPile.splice(0)
  store.hexDiscardPile.push(...inputModel[4])

  // 5 moviePrices
  store.moviePrices.splice(0)
  store.moviePrices.push(...inputModel[5])

  // 6 gameflow
  store.gameflow.turn = inputModel[6][0]
  store.gameflow.phase = inputModel[6][1]
  store.gameflow.turnOrder = inputModel[6][2]
  store.gameflow.fullTurnOrder = inputModel[6][3]
  //Object.assign(store.gameflow, inputModel[6])

  // 7 history
  /*store.history.splice(0)
  Object.assign(store.history, inputModel[7])*/
  store.history.splice(0)
  store.history.push(...inputModel[7])

  //8
  store.ongoingVars.drawnHexes.splice(0)
  store.ongoingVars.drawnHexes = inputModel[8]

  // 9 
  if (inputModel[9].length > 0) {
    store.tableUp = inputModel[9][0]
    store.tableDown = inputModel[9][1]
    store.tableLeft = inputModel[9][2]
    store.tableRight = inputModel[9][3]
  }

  // 10 
  store.tableJunk.splice(0)
  for (let i=0;i<inputModel[10].length;i+=3) {
    store.tableJunk.push([{
      q: inputModel[10][i],
      r: inputModel[10][i+1],
      s: map.calculateScoord(inputModel[10][i], inputModel[10][i+1])
    }, inputModel[10][i+2]])

  }

  // 11
  if (inputModel[11][0] === 1) {
    store.useExpansion = true
    store.pirateShipRef = inputModel[11][1]
  }

  store.resetContext()
  map.calculateCanvasSize(false)

  // 12 IF INCLUDE CONTEXT
  if (includeContext || inputModel.length === 13) {
    Object.assign(store.context, inputModel[12])
  }
}

/*export var LZString = (function () {
  function o(o, r) {
    if (!t[o]) {
      t[o] = {}
      for (var n = 0; n < o.length; n++) t[o][o.charAt(n)] = n
    }
    return t[o][r]
  }
  var r = String.fromCharCode,
    e = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$',
    t = {},
    i = {

      compressToEncodedURIComponent: function (o) {
        return null == o
          ? ''
          : i._compress(o, 6, function (o) {
            return e.charAt(o)
          })
      },
      decompressFromEncodedURIComponent: function (r) {
        return null == r
          ? ''
          : '' == r
            ? null
            : ((r = r.replace(/ /g, '+')),
              i._decompress(r.length, 32, function (n) {
                return o(e, r.charAt(n))
              }))
      },
      compress: function (o) {
        return i._compress(o, 16, function (o) {
          return r(o)
        })
      },
      _compress: function (o, r, n) {
        if (null == o) return ''
        var e,
          t,
          i,
          s = {},
          p = {},
          u = '',
          c = '',
          a = '',
          l = 2,
          f = 3,
          h = 2,
          d = [],
          m = 0,
          v = 0
        for (i = 0; i < o.length; i += 1)
          if (
            ((u = o.charAt(i)),
              Object.prototype.hasOwnProperty.call(s, u) || ((s[u] = f++), (p[u] = !0)),
              (c = a + u),
              Object.prototype.hasOwnProperty.call(s, c))
          )
            a = c
          else {
            if (Object.prototype.hasOwnProperty.call(p, a)) {
              if (a.charCodeAt(0) < 256) {
                for (e = 0; h > e; e++)
                  (m <<= 1), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++
                for (t = a.charCodeAt(0), e = 0; 8 > e; e++)
                  (m = (m << 1) | (1 & t)),
                    v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++,
                    (t >>= 1)
              } else {
                for (t = 1, e = 0; h > e; e++)
                  (m = (m << 1) | t), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t = 0)
                for (t = a.charCodeAt(0), e = 0; 16 > e; e++)
                  (m = (m << 1) | (1 & t)),
                    v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++,
                    (t >>= 1)
              }
              l--, 0 == l && ((l = Math.pow(2, h)), h++), delete p[a]
            } else
              for (t = s[a], e = 0; h > e; e++)
                (m = (m << 1) | (1 & t)),
                  v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++,
                  (t >>= 1)
            l--, 0 == l && ((l = Math.pow(2, h)), h++), (s[c] = f++), (a = String(u))
          }
        if ('' !== a) {
          if (Object.prototype.hasOwnProperty.call(p, a)) {
            if (a.charCodeAt(0) < 256) {
              for (e = 0; h > e; e++) (m <<= 1), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++
              for (t = a.charCodeAt(0), e = 0; 8 > e; e++)
                (m = (m << 1) | (1 & t)),
                  v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++,
                  (t >>= 1)
            } else {
              for (t = 1, e = 0; h > e; e++)
                (m = (m << 1) | t), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t = 0)
              for (t = a.charCodeAt(0), e = 0; 16 > e; e++)
                (m = (m << 1) | (1 & t)),
                  v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++,
                  (t >>= 1)
            }
            l--, 0 == l && ((l = Math.pow(2, h)), h++), delete p[a]
          } else
            for (t = s[a], e = 0; h > e; e++)
              (m = (m << 1) | (1 & t)),
                v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++,
                (t >>= 1)
          l--, 0 == l && ((l = Math.pow(2, h)), h++)
        }
        for (t = 2, e = 0; h > e; e++)
          (m = (m << 1) | (1 & t)), v == r - 1 ? ((v = 0), d.push(n(m)), (m = 0)) : v++, (t >>= 1)
        for (; ;) {
          if (((m <<= 1), v == r - 1)) {
            d.push(n(m))
            break
          }
          v++
        }
        return d.join('')
      },
      decompress: function (o) {
        return null == o
          ? ''
          : '' == o
            ? null
            : i._decompress(o.length, 32768, function (r) {
              return o.charCodeAt(r)
            })
      },
      _decompress: function (o, n, e) {
        var t,
          i,
          s,
          p,
          u,
          c,
          a,
          l,
          f = [],
          h = 4,
          d = 4,
          m = 3,
          v = '',
          w = [],
          A = { val: e(0), position: n, index: 1 }
        for (i = 0; 3 > i; i += 1) f[i] = i
        for (p = 0, c = Math.pow(2, 2), a = 1; a != c;)
          (u = A.val & A.position),
            (A.position >>= 1),
            0 == A.position && ((A.position = n), (A.val = e(A.index++))),
            (p |= (u > 0 ? 1 : 0) * a),
            (a <<= 1)
        switch ((t = p)) {
          case 0:
            for (p = 0, c = Math.pow(2, 8), a = 1; a != c;)
              (u = A.val & A.position),
                (A.position >>= 1),
                0 == A.position && ((A.position = n), (A.val = e(A.index++))),
                (p |= (u > 0 ? 1 : 0) * a),
                (a <<= 1)
            l = r(p)
            break
          case 1:
            for (p = 0, c = Math.pow(2, 16), a = 1; a != c;)
              (u = A.val & A.position),
                (A.position >>= 1),
                0 == A.position && ((A.position = n), (A.val = e(A.index++))),
                (p |= (u > 0 ? 1 : 0) * a),
                (a <<= 1)
            l = r(p)
            break
          case 2:
            return ''
        }
        for (f[3] = l, s = l, w.push(l); ;) {
          if (A.index > o) return ''
          for (p = 0, c = Math.pow(2, m), a = 1; a != c;)
            (u = A.val & A.position),
              (A.position >>= 1),
              0 == A.position && ((A.position = n), (A.val = e(A.index++))),
              (p |= (u > 0 ? 1 : 0) * a),
              (a <<= 1)
          switch ((l = p)) {
            case 0:
              for (p = 0, c = Math.pow(2, 8), a = 1; a != c;)
                (u = A.val & A.position),
                  (A.position >>= 1),
                  0 == A.position && ((A.position = n), (A.val = e(A.index++))),
                  (p |= (u > 0 ? 1 : 0) * a),
                  (a <<= 1)
                  ; (f[d++] = r(p)), (l = d - 1), h--
              break
            case 1:
              for (p = 0, c = Math.pow(2, 16), a = 1; a != c;)
                (u = A.val & A.position),
                  (A.position >>= 1),
                  0 == A.position && ((A.position = n), (A.val = e(A.index++))),
                  (p |= (u > 0 ? 1 : 0) * a),
                  (a <<= 1)
                  ; (f[d++] = r(p)), (l = d - 1), h--
              break
            case 2:
              return w.join('')
          }
          if ((0 == h && ((h = Math.pow(2, m)), m++), f[l])) v = f[l]
          else {
            if (l !== d) return null
            v = s + s.charAt(0)
          }
          w.push(v), (f[d++] = s + v.charAt(0)), h--, (s = v), 0 == h && ((h = Math.pow(2, m)), m++)
        }
      }
    }
  return i
})()
var define
var module
'function' == typeof define && define.amd
  ? define(function () {
    return LZString
  })
  : 'undefined' != typeof module && null != module && (module.exports = LZString)
  */



