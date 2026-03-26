import { usePersonalStore } from './stores/personal.js'

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
  /*res += d.getFullYear() + '/'
  if (d.getMonth() < 9) res += '0' + (d.getMonth() + 1) + '/'
  else res += d.getMonth() + 1 + '/'
  if (d.getDate() < 10) res += '0' + d.getDate() + ' '
  else res += d.getDate() + ' '
  if (d.getHours() < 10) res += '0' + d.getHours() + ':'
  else res += d.getHours() + ':'
  if (d.getMinutes() < 10) res += '0' + d.getMinutes() + ':'
  else res += d.getMinutes() + ':'
  if (d.getSeconds() < 10) res += '0' + d.getSeconds()
  else res += d.getSeconds()*/
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

// NOTE: THE ORDER THE JUNCTIONS ARE IN THE ARRAY IS VERY IMPORTANT
// THIS ALLOWS CORRECT PLACEMENT OF LINE END ICON
// REQUIRES DIFFERENT ORDER FOR DIFFERENT BOARD ORIENTATIONS
export function getJunctionsAtEndOfLine(lineID) {
  const personal = usePersonalStore()

  if (personal.selectedBoard === 0) {
    if (lineID === 0) return [0, 1]
    if (lineID === 1) return [1, 2]
    if (lineID === 2) return [2, 3]
    if (lineID === 3) return [3, 4]
    if (lineID === 4) return [5, 0]
    if (lineID === 5) return [0, 6]
    if (lineID === 6) return [1, 7]
    if (lineID === 7) return [1, 8]
    if (lineID === 8) return [8, 2]
    if (lineID === 9) return [2, 10]
    if (lineID === 10) return [3, 10]
    if (lineID === 11) return [10, 4]
    if (lineID === 12) return [4, 11]
    if (lineID === 13) return [5, 6]
    if (lineID === 14) return [6, 7]
    if (lineID === 15) return [7, 8]
    if (lineID === 16) return [8, 14]
    if (lineID === 17) return [2, 9]
    if (lineID === 18) return [9, 10]
    if (lineID === 19) return [10, 11]
    if (lineID === 20) return [5, 12]
    if (lineID === 21) return [5, 13]
    if (lineID === 22) return [13, 7]
    if (lineID === 23) return [13, 14]
    if (lineID === 24) return [14, 9]
    if (lineID === 25) return [9, 16]
    if (lineID === 26) return [16, 10]
    if (lineID === 27) return [10, 17]
    if (lineID === 28) return [12, 13]
    if (lineID === 29) return [13, 20]
    if (lineID === 30) return [20, 14]
    if (lineID === 31) return [14, 15]
    if (lineID === 32) return [15, 16]
    if (lineID === 33) return [16, 17]
    if (lineID === 34) return [18, 12]
    if (lineID === 35) return [12, 19]
    if (lineID === 36) return [19, 20]
    if (lineID === 37) return [20, 21]
    if (lineID === 38) return [21, 15]
    if (lineID === 39) return [22, 16]
    if (lineID === 40) return [16, 23]
    if (lineID === 41) return [23, 17]
    if (lineID === 42) return [24, 18]
    if (lineID === 43) return [18, 25]
    if (lineID === 44) return [25, 19]
    if (lineID === 45) return [19, 26]
    if (lineID === 46) return [26, 21]
    if (lineID === 47) return [21, 22]
    if (lineID === 48) return [22, 23]
    if (lineID === 49) return [24, 25]
    if (lineID === 50) return [25, 26]
    if (lineID === 51) return [26, 27]
    if (lineID === 52) return [27, 21]
    if (lineID === 53) return [21, 33]
    if (lineID === 54) return [33, 28]
    if (lineID === 55) return [22, 28]
    if (lineID === 56) return [28, 35]
    if (lineID === 57) return [23, 35]
    if (lineID === 58) return [29, 25]
    if (lineID === 59) return [25, 30]
    if (lineID === 60) return [25, 31]
    if (lineID === 61) return [31, 26]
    if (lineID === 62) return [26, 32]
    if (lineID === 63) return [32, 27]
    if (lineID === 64) return [29, 30]
    if (lineID === 65) return [30, 31]
    if (lineID === 66) return [31, 32]
    if (lineID === 67) return [32, 33]
    if (lineID === 68) return [33, 34]
    if (lineID === 69) return [34, 35]
  }
  else if (personal.selectedBoard === 1) {
    if (lineID === 0) return [0, 1]
    if (lineID === 1) return [2, 1]
    if (lineID === 2) return [2, 3]
    if (lineID === 3) return [4, 3]
    if (lineID === 4) return [5, 0]
    if (lineID === 5) return [6, 0]
    if (lineID === 6) return [7, 1]
    if (lineID === 7) return [8, 1]
    if (lineID === 8) return [8, 2]
    if (lineID === 9) return [10, 2]
    if (lineID === 10) return [10, 3]
    if (lineID === 11) return [10, 4]
    if (lineID === 12) return [11, 4]
    if (lineID === 13) return [5, 6]
    if (lineID === 14) return [7, 6]
    if (lineID === 15) return [8, 7]
    if (lineID === 16) return [14, 8]
    if (lineID === 17) return [9, 2]
    if (lineID === 18) return [9, 10]
    if (lineID === 19) return [11, 10]
    if (lineID === 20) return [12, 5]
    if (lineID === 21) return [13, 5]
    if (lineID === 22) return [13, 7]
    if (lineID === 23) return [14, 13]
    if (lineID === 24) return [14, 9]
    if (lineID === 25) return [16, 9]
    if (lineID === 26) return [16, 10]
    if (lineID === 27) return [17, 10]
    if (lineID === 28) return [12, 13]
    if (lineID === 29) return [20, 13]
    if (lineID === 30) return [20, 14]
    if (lineID === 31) return [15, 14]
    if (lineID === 32) return [15, 16]
    if (lineID === 33) return [17, 16]
    if (lineID === 34) return [18, 12]
    if (lineID === 35) return [19, 12]
    if (lineID === 36) return [19, 20]
    if (lineID === 37) return [21, 20]
    if (lineID === 38) return [21, 15]
    if (lineID === 39) return [22, 16]
    if (lineID === 40) return [23, 16]
    if (lineID === 41) return [23, 17]
    if (lineID === 42) return [24, 18]
    if (lineID === 43) return [25, 18]
    if (lineID === 44) return [25, 19]
    if (lineID === 45) return [26, 19]
    if (lineID === 46) return [26, 21]
    if (lineID === 47) return [21, 22]
    if (lineID === 48) return [23, 22]
    if (lineID === 49) return [24, 25]
    if (lineID === 50) return [25, 26]
    if (lineID === 51) return [27, 26]
    if (lineID === 52) return [27, 21]
    if (lineID === 53) return [33, 21]
    if (lineID === 54) return [33, 28]
    if (lineID === 55) return [28, 22]
    if (lineID === 56) return [35, 28]
    if (lineID === 57) return [35, 23]
    if (lineID === 58) return [29, 25]
    if (lineID === 59) return [30, 25]
    if (lineID === 60) return [31, 25]
    if (lineID === 61) return [31, 26]
    if (lineID === 62) return [32, 26]
    if (lineID === 63) return [32, 27]
    if (lineID === 64) return [30, 29]
    if (lineID === 65) return [30, 31]
    if (lineID === 66) return [32, 31]
    if (lineID === 67) return [32, 33]
    if (lineID === 68) return [34, 33]
    if (lineID === 69) return [34, 35]
  }
  // 20th anniverary
  else   if (personal.selectedBoard === 2) {
    if (lineID === 0) return [0, 1]
    if (lineID === 1) return [1, 2]
    if (lineID === 2) return [2, 3]
    if (lineID === 3) return [3, 4]
    if (lineID === 4) return [0, 5]
    if (lineID === 5) return [0, 6]
    if (lineID === 6) return [1, 7]
    if (lineID === 7) return [1, 8]
    if (lineID === 8) return [8, 2]
    if (lineID === 9) return [2, 10]
    if (lineID === 10) return [3, 10]
    if (lineID === 11) return [10, 4]
    if (lineID === 12) return [4, 11]
    if (lineID === 13) return [5, 6]
    if (lineID === 14) return [6, 7]
    if (lineID === 15) return [7, 8]
    if (lineID === 16) return [8, 14]
    if (lineID === 17) return [2, 9]
    if (lineID === 18) return [9, 10]
    if (lineID === 19) return [10, 11]
    if (lineID === 20) return [5, 12]
    if (lineID === 21) return [5, 13]
    if (lineID === 22) return [13, 7]
    if (lineID === 23) return [13, 14]
    if (lineID === 24) return [14, 9]
    if (lineID === 25) return [9, 16]
    if (lineID === 26) return [10, 16]
    if (lineID === 27) return [10, 17]
    if (lineID === 28) return [12, 13]
    if (lineID === 29) return [13, 20]
    if (lineID === 30) return [20, 14]
    if (lineID === 31) return [14, 15]
    if (lineID === 32) return [15, 16]
    if (lineID === 33) return [16, 17]
    if (lineID === 34) return [18, 12]
    if (lineID === 35) return [12, 19]
    if (lineID === 36) return [19, 20]
    if (lineID === 37) return [20, 21]
    if (lineID === 38) return [21, 15]
    if (lineID === 39) return [22, 16]
    if (lineID === 40) return [16, 23]
    if (lineID === 41) return [23, 17]
    if (lineID === 42) return [24, 18]
    if (lineID === 43) return [18, 25]
    if (lineID === 44) return [25, 19]
    if (lineID === 45) return [19, 26]
    if (lineID === 46) return [26, 21]
    if (lineID === 47) return [21, 22]
    if (lineID === 48) return [22, 23]
    if (lineID === 49) return [24, 25]
    if (lineID === 50) return [25, 26]
    if (lineID === 51) return [26, 27]
    if (lineID === 52) return [27, 21]
    if (lineID === 53) return [21, 33]
    if (lineID === 54) return [33, 28]
    if (lineID === 55) return [22, 28]
    if (lineID === 56) return [28, 35]
    if (lineID === 57) return [23, 35]
    if (lineID === 58) return [29, 25]
    if (lineID === 59) return [25, 30]
    if (lineID === 60) return [25, 31]
    if (lineID === 61) return [31, 26]
    if (lineID === 62) return [26, 32]
    if (lineID === 63) return [32, 27]
    if (lineID === 64) return [29, 30]
    if (lineID === 65) return [30, 31]
    if (lineID === 66) return [31, 32]
    if (lineID === 67) return [32, 33]
    if (lineID === 68) return [33, 34]
    if (lineID === 69) return [34, 35]
  }
  alert('no junction found AEOL')
  return 'none'
}

export function getLinesAroundJunction(junctionID) {
  if (junctionID === 0) return [0, 4, 5]
  if (junctionID === 1) return [0, 1, 6, 7]
  if (junctionID === 2) return [1, 2, 8, 9, 17]
  if (junctionID === 3) return [2, 3, 10]
  if (junctionID === 4) return [3, 11, 12]
  if (junctionID === 5) return [4, 13, 20, 21]
  if (junctionID === 6) return [5, 13, 14]
  if (junctionID === 7) return [6, 14, 15, 22]
  if (junctionID === 8) return [7, 8, 15, 16]
  if (junctionID === 9) return [17, 18, 24, 25]
  if (junctionID === 10) return [9, 10, 11, 18, 19, 26, 27]
  if (junctionID === 11) return [12, 19]
  if (junctionID === 12) return [20, 28, 34, 35]
  if (junctionID === 13) return [21, 22, 23, 28, 29]
  if (junctionID === 14) return [16, 23, 24, 30, 31]
  if (junctionID === 15) return [31, 32, 38]
  if (junctionID === 16) return [25, 26, 32, 33, 39, 40]
  if (junctionID === 17) return [27, 33, 41]
  if (junctionID === 18) return [34, 42, 43]
  if (junctionID === 19) return [35, 36, 44, 45]
  if (junctionID === 20) return [29, 30, 36, 37]
  if (junctionID === 21) return [37, 38, 46, 47, 52, 53]
  if (junctionID === 22) return [39, 47, 48, 55]
  if (junctionID === 23) return [40, 41, 48, 57]
  if (junctionID === 24) return [42, 49]
  if (junctionID === 25) return [43, 44, 49, 50, 58, 59, 60]
  if (junctionID === 26) return [45, 46, 50, 51, 61, 62]
  if (junctionID === 27) return [51, 52, 63]
  if (junctionID === 28) return [54, 55, 56]
  if (junctionID === 29) return [58, 64]
  if (junctionID === 30) return [59, 64, 65]
  if (junctionID === 31) return [60, 61, 65, 66]
  if (junctionID === 32) return [62, 63, 66, 67]
  if (junctionID === 33) return [53, 54, 67, 68]
  if (junctionID === 34) return [68, 69]
  if (junctionID === 35) return [56, 57, 69]
  alert('No J found GRAJ  ' + String(junctionID))
  return ''
}

export var LZString = (function () {
  function o(o, r) {
    if (!t[o]) {
      t[o] = {}
      for (var n = 0; n < o.length; n++) t[o][o.charAt(n)] = n
    }
    return t[o][r]
  }
  var r = String.fromCharCode,
    //n = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
    e = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$',
    t = {},
    i = {
      /*compressToBase64: function (o) {
          if (null == o) return ''
          var r = i._compress(o, 6, function (o) {
            return n.charAt(o)
          })
          switch (r.length % 4) {
            default:
            case 0:
              return r
            case 1:
              return r + '==='
            case 2:
              return r + '=='
            case 3:
              return r + '='
          }
        },
        decompressFromBase64: function (r) {
          return null == r
            ? ''
            : '' == r
            ? null
            : i._decompress(r.length, 32, function (e) {
                return o(n, r.charAt(e))
              })
        },
        compressToUTF16: function (o) {
          return null == o
            ? ''
            : i._compress(o, 15, function (o) {
                return r(o + 32)
              }) + ' '
        },
        decompressFromUTF16: function (o) {
          return null == o
            ? ''
            : '' == o
            ? null
            : i._decompress(o.length, 16384, function (r) {
                return o.charCodeAt(r) - 32
              })
        },
        compressToUint8Array: function (o) {
          for (
            var r = i.compress(o), n = new Uint8Array(2 * r.length), e = 0, t = r.length;
            t > e;
            e++
          ) {
            var s = r.charCodeAt(e)
            ;(n[2 * e] = s >>> 8), (n[2 * e + 1] = s % 256)
          }
          return n
        },
        decompressFromUint8Array: function (o) {
          if (null === o || void 0 === o) return i.decompress(o)
          for (var n = new Array(o.length / 2), e = 0, t = n.length; t > e; e++)
            n[e] = 256 * o[2 * e] + o[2 * e + 1]
          var s = []
          return (
            n.forEach(function (o) {
              s.push(r(o))
            }),
            i.decompress(s.join(''))
          )
        },*/
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
        for (;;) {
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
        for (p = 0, c = Math.pow(2, 2), a = 1; a != c; )
          (u = A.val & A.position),
            (A.position >>= 1),
            0 == A.position && ((A.position = n), (A.val = e(A.index++))),
            (p |= (u > 0 ? 1 : 0) * a),
            (a <<= 1)
        switch ((t = p)) {
          case 0:
            for (p = 0, c = Math.pow(2, 8), a = 1; a != c; )
              (u = A.val & A.position),
                (A.position >>= 1),
                0 == A.position && ((A.position = n), (A.val = e(A.index++))),
                (p |= (u > 0 ? 1 : 0) * a),
                (a <<= 1)
            l = r(p)
            break
          case 1:
            for (p = 0, c = Math.pow(2, 16), a = 1; a != c; )
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
        for (f[3] = l, s = l, w.push(l); ; ) {
          if (A.index > o) return ''
          for (p = 0, c = Math.pow(2, m), a = 1; a != c; )
            (u = A.val & A.position),
              (A.position >>= 1),
              0 == A.position && ((A.position = n), (A.val = e(A.index++))),
              (p |= (u > 0 ? 1 : 0) * a),
              (a <<= 1)
          switch ((l = p)) {
            case 0:
              for (p = 0, c = Math.pow(2, 8), a = 1; a != c; )
                (u = A.val & A.position),
                  (A.position >>= 1),
                  0 == A.position && ((A.position = n), (A.val = e(A.index++))),
                  (p |= (u > 0 ? 1 : 0) * a),
                  (a <<= 1)
              ;(f[d++] = r(p)), (l = d - 1), h--
              break
            case 1:
              for (p = 0, c = Math.pow(2, 16), a = 1; a != c; )
                (u = A.val & A.position),
                  (A.position >>= 1),
                  0 == A.position && ((A.position = n), (A.val = e(A.index++))),
                  (p |= (u > 0 ? 1 : 0) * a),
                  (a <<= 1)
              ;(f[d++] = r(p)), (l = d - 1), h--
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
