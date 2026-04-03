/***** THIS IS A METHOD TO CACHE QRS's to IDS */
//*** SETUP CODE IN App.vue */
// THERE IS AN ISSUE WITH 2 PLAYERS THOUGH
let minCoord = 999
let maxCoord = -999
for (let i = 0; i < results.length; i++) {
    if (results[i].hex.q > maxCoord) maxCoord = results[i].hex.q
    if (results[i].hex.r > maxCoord) maxCoord = results[i].hex.r
    if (results[i].hex.s > maxCoord) maxCoord = results[i].hex.s

    if (results[i].hex.q < minCoord) minCoord = results[i].hex.q
    if (results[i].hex.r < minCoord) minCoord = results[i].hex.r
    if (results[i].hex.s < minCoord) minCoord = results[i].hex.s
}

let arraysize = Math.abs(minCoord) + Math.abs(maxCoord) + 1
let QRSArray = []

// TEMPORARY FIX -- CRASHES AFTER FIRST CITY PLACEMENT
// @kbbr fix this
//if (store.players.length === 2) arraysize *= 2

for (let i = 0; i < arraysize; i++) {
    const layer = []
    //for (let j = 0; j < arraysize; j++) {
    for (let j = 0; j < arraysize; j++) {
        const subLayer = Array(arraysize).fill(-1)
        layer.push(subLayer)
    }
    QRSArray.push(layer)
}

//alert(results.length)

for (let i = 0; i < results.length; i++) {
    let q = results[i].hex.q
    let r = results[i].hex.r
    let s = results[i].hex.s

    if (QRSArray.length - 1 < q + maxCoord) alert("Q error")
    if (QRSArray[q + maxCoord].length - 1 < r + maxCoord) alert("R error")
    if (QRSArray[q + maxCoord][r + maxCoord].length - 1 < s + maxCoord) alert("S error")*/
    /*if (i === 186) {
        alert(q)
        alert(r)
        alert(s)
        alert(maxCoord)
    }*/
    QRSArray[q + maxCoord][r + maxCoord][s + maxCoord] = results[i].id
}


/** THEN USE THIS IN THE FUNCTION map.getIDfromHex */
	// @kbbr fix this!
	const { q, r, s } = hex
	let arraySize = (store.mapData.hexId.length - 1)/2
	return store.mapData.hexId[q+arraySize][r+arraySize][s+arraySize]