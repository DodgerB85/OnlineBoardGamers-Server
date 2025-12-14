/**
 * These are functions to do with manipulating or interacting with the map.
 * If they do not need to be directly in the component, it is easier to put them here.
 * This helps to stop the component getting cluttered up with a lot of functions,
 * and keeps the component mainly for the display
 *
 */

import hexlib from './hexlib.js'
import * as rf from './CNSreference'

import { useModelStore } from '../stores/CNSstore.js'
import { usePersonalStore } from '../stores/CNSpersonal'

// Map Vars
const directionVectors = [
  [+1, 0, -1],
  [+1, -1, 0],
  [0, -1, +1],
  [-1, 0, +1],
  [-1, +1, 0],
  [0, +1, -1]
]

// 10 is small, 11 normal, 12 large
export function createTable(size) {
  const store = useModelStore()

  // Table U/D is 1 per row above / below CNS tile. Min 1 each way
  // Table L/R is 0.5 hexes away from centre of CNS-L
  // Min 1.5 L, 2.5 R

  const generateRandomNumbers = () => {
    let tableUp, tableDown, tableLeft, tableRight, result;

    do {
      tableUp = Math.floor(Math.random() * 18) + 1;
      tableDown = Math.floor(Math.random() * 18) + 1;
      tableLeft = (Math.floor(Math.random() * 30) + 3) * 0.5;
      tableRight = (Math.floor(Math.random() * 22) + 5) * 0.5;

      result = (tableUp + tableDown) * (tableLeft + tableRight);
    } while (result < 36 || result > 38);

    return [tableUp, tableDown, tableLeft, tableRight];
  }

  // Generate random numbers
  const tableNumbers = generateRandomNumbers();

  // SMALL 2P TABLE -- Leabes 10 free hexes
  let sizeOffset = size - 10
  let playerCount = store.players.length
  if (playerCount === 4) sizeOffset += 2

  // UD = 6 min 1, LR = 7.5 min 1.5
  /*store.tableUp = Math.floor(Math.random() * 5) + 1
  store.tableDown = 6 - store.tableUp + sizeOffset
  store.tableLeft = Math.floor(Math.random() * 10) / 2 + 1.5;
  store.tableRight = 7.5 - store.tableLeft + sizeOffset*/

  store.tableUp = tableNumbers[0]
  store.tableDown = tableNumbers[1] + sizeOffset
  store.tableLeft = tableNumbers[2];
  store.tableRight = tableNumbers[3] + sizeOffset

}

// 20 is low, 21 is normal, 22 is high
export function createJunk(amount) {
  const store = useModelStore()

  // 2-4
  let requiredJunk = Math.floor(Math.random() * 3) + 2
  // 5-7
  if (amount === 21) requiredJunk = Math.floor(Math.random() * 3) + 5
  // 8 - 10
  if (amount === 22) requiredJunk = Math.floor(Math.random() * 3) + 8;

  while (store.tableJunk.length < requiredJunk) {
    let newQ = Math.floor(Math.random() * 9) - 4;
    let newR = Math.floor(Math.random() * 9) - 4;
    let usable = true

    // Too close check
    if (newQ === 0 || newR === 0 && (Math.abs(newQ + newR) === 1)) usable = false
    else if ((newQ === 1 && newR === -1) || (newQ === -1 && newR === 1)) usable = false

    // table checks
    if (store.tableUp > 0) {
      if (newQ + (newR / 2) > 0 && newQ + (newR / 2) >= store.tableRight) usable = false
      else if (newQ + (newR / 2) < 0 && newQ + (newR / 2) <= -store.tableLeft) usable = false
      else if (newR > 0 && newR > store.tableDown) usable = false
      else if (newR < 0 && newR < -store.tableUp) usable = false
    }
    if (usable) {
      let newS = calculateScoord(newQ, newR)
      store.tableJunk.push([new hexlib.Hex(newQ, newR, newS), Math.floor(Math.random() * 7) + 1])
    }
  }

}

/*function isNeighbour(hexA, hexB) {
  return !!directionVectors.find((dv) => {
    return hexA.q == hexB.q + dv[0] && hexA.r == hexB.r + dv[1] && hexA.s == hexB.s + dv[2]
  })
}*/

// GETTERS

export function hexToPixel(hex) {
  return hexlib.Layout.hexToPixel(hex)
}

export function calculateGridDimensions(forWholeTable) {
  const store = useModelStore()

  if (forWholeTable && store.tableUp !== 0) return [-store.tableUp, store.tableDown, -store.tableLeft, store.tableRight]

  let minR = Infinity
  let maxR = -Infinity

  let maxRight = -Infinity
  let maxLeft = Infinity

  for (const tile of store.hexes) {
    if (tile.hex.q + tile.hex.r / 2 > maxRight) maxRight = tile.hex.q + tile.hex.r / 2
    if (tile.hex.q + tile.hex.r / 2 < maxLeft) maxLeft = tile.hex.q + tile.hex.r / 2

    if (tile.hex.r < minR) {
      minR = tile.hex.r
    }
    if (tile.hex.r > maxR) {
      maxR = tile.hex.r
    }
  }

  return [minR, maxR, maxLeft, maxRight]
}

export function calculateCanvasSize(addingHexes) {
  const store = useModelStore()

  let hexWidth = (store.refSize / 2400) * 130
  const hexHeight = hexWidth * 1.1547 // Calculate the height of each hexagon
  const sideLength = hexWidth / 1.732
  const sidePlusPointy = (hexHeight - sideLength) / 2 + sideLength

  let gridDimensions = calculateGridDimensions(store.topMenuViews.showWholeTable)

  // If you are adding a hex, add space all around the edge to allow space for the new hex options, IE +1 here
  let extraSpaceW = 0
  let extraSpaceH = 0
  if (addingHexes) {
    extraSpaceW = 1.5
    extraSpaceH = 1.66
  }
  if (store.topMenuViews.showWholeTable) {
    extraSpaceH += 0.5
    extraSpaceW = -0.5
    if (store.tableUp === 0) {
      extraSpaceH = 10
      extraSpaceW = 10
    }
  }
  const gridWidth = gridDimensions[3] - gridDimensions[2] + extraSpaceW //+ Math.ceil(gridNumRows / 2);
  const gridHeight = gridDimensions[1] - gridDimensions[0] + extraSpaceH

  // This sets the size of the div.
  // For the width, you simply want the width of the grid, plus room for 1 hex each side
  store.canvasWidth = gridWidth * hexWidth + hexWidth * 1.5 // Add one extra for padding
  store.canvasHeight = (gridHeight + 1) * sidePlusPointy + hexHeight * 0.5
  // As the min dimension of the canvas increaes, the SVGs will get bigger.
  // This variable is used to stop this happening.
  store.canvasSize = Math.min(store.canvasWidth, store.canvasHeight)
}

export function setNeighbours() {
  const store = useModelStore()
  store.context.neighbours.splice(0)

  store.hexes.forEach((t) => {
    store.hexes.forEach((t2) => {
      if (t.id === t2.id) return
      //TODO check if neighbour exists, if yes skip this step
      directionVectors.forEach((dv) => {
        if (
          t.hex.q === t2.hex.q + dv[0] &&
          t.hex.r === t2.hex.r + dv[1] &&
          t.hex.s === t2.hex.s + dv[2]
        ) {
          if (!store.context.neighbours[t.id]) {
            store.context.neighbours[t.id] = []
          }
          store.context.neighbours[t.id].push(t2.id)
        }
      })
    })
  })
  updatePartyZones()
}

export function setPlaceableTiles() {
  const store = useModelStore()

  setNeighbours()

  store.context.placeableTiles.splice(0) // = [];
  store.hexes.forEach((t) => {
    if (store.context.neighbours[t.id] && store.context.neighbours[t.id].length === 6) return

    const currentNeighbourIds = store.context.neighbours[t.id] || []

    directionVectors.forEach((dv) => {
      let newQ = t.hex.q + dv[0]
      let newR = t.hex.r + dv[1]
      if (store.tableUp !== 0) {
        if (newQ + (newR / 2) > 0 && newQ + (newR / 2) >= store.tableRight) return
        if (newQ + (newR / 2) < 0 && newQ + (newR / 2) <= -store.tableLeft) return
        if (newR > 0 && newR > store.tableDown) return
        if (newR < 0 && newR < -store.tableUp) return
      }
      const newHex = new hexlib.Hex(newQ, newR, t.hex.s + dv[2])

      // Don't add table junk hexes to eligible new tiles
      if (store.tableJunk.some(obj => JSON.stringify(obj[0]) === JSON.stringify(newHex))) return

      const neighbour = currentNeighbourIds.find((nId) => {
        const nb = store.hexes.find((nt) => nt.id === nId)

        return (
          nb.hex.q == t.hex.q + dv[0] && nb.hex.r == t.hex.r + dv[1] && nb.hex.s == t.hex.s + dv[2]
        )
      })

      if (
        !neighbour &&
        !store.context.placeableTiles.find(
          (h) => h.q == newHex.q && h.r == newHex.r && h.s == newHex.s
        )
      )
        store.context.placeableTiles.push({ ...newHex, isPendingPlacement: false })
    })
  })
  if (store.context.placeableTiles.length === 0) {
    store.tableUp += 1
    store.tableDown += 1
    store.tableLeft += 1
    store.tableRight += 1
    setPlaceableTiles()
    return
  }
}

function getNeighbours(hex) {
  const store = useModelStore()
  const { q, r, s } = hex

  return directionVectors.reduce((acc, curr) => {
    const n = store.hexes.find((h) => {
      return h.hex.q == curr[0] + q && h.hex.r == curr[1] + r && h.hex.s == curr[2] + s
    })
    if (n) {
      acc.push(n)
    }

    return acc
  }, [])
}

const getPartyEntrances = (partyHexes = []) => {
  return partyHexes.filter((ph) => rf.HEX_PARTY_ROTATABLE.includes(ph.hexRef))
}

// returns old boys links connected to the passed link
const getOldBoysConnection = (links) => {
  const store = useModelStore()

  const foundOldBoys = []

  for (const link of links) {
    const oldBoys = store.oldBoysNetwork.filter(
      (ob) => ob.map((c) => c.id).includes(link[0].id) || ob.map((c) => c.id).includes(link[1].id)
    )

    for (const ob of oldBoys) {
      if (
        !foundOldBoys.find(
          (o) => [o[0].id, o[1].id].includes(ob[0].id) && [o[0].id, o[1].id].includes(ob[1].id)
        )
      ) {
        foundOldBoys.push(ob)
      }
    }
  }

  return foundOldBoys
}

const getHexesFromLinks = (links) => {
  const result = []

  for (const link of links) {
    for (const hex of link) {
      if (!result.find((h) => h.id == hex.id)) {
        result.push(hex)
      }
    }
  }

  return result
}

const getPartiesInNetwork = (links) => {
  const store = useModelStore()
  const hexIds = getHexesFromLinks(links).map((hex) => hex.id)
  return store.context.partyZones.filter((pz) => pz.find((partyTile) => hexIds.includes(partyTile.id)))
}

const linkIncludesHex = (link, hex) => {
  if ([link[0].id, link[1].id].includes(hex.id)) return true
  return false
}

const getHexByRef = (ref) => {
  const store = useModelStore()
  return store.hexes.find((h) => h.hexRef === ref)
}

const linksIncludeLink = (links, link) => {
  if (
    links.find((al) => {
      return linkIncludesHex(al, link[0]) && linkIncludesHex(al, link[1])
    })
  ) {
    return true
  }

  return false
}

const scanConnections = (links) => {
  const result = {
    hasParty: false,
    hasCannes: false,
    hasPhone: false
  }
  links.forEach((link) => {
    if (
      rf.HEX_PARTY_ROTATABLE.includes(link[0].hexRef) ||
      rf.HEX_PARTY_ROTATABLE.includes(link[1].hexRef)
    )
      result.hasParty = true
    if (rf.CANNES_HEXES.includes(link[0].hexRef) || rf.CANNES_HEXES.includes(link[1].hexRef))
      result.hasCannes = true
    if (rf.HEX_PHONE_TILES.includes(link[0].hexRef) || rf.HEX_PHONE_TILES.includes(link[1].hexRef))
      result.hasPhone = true
  })

  return result
}

const getOldBoysInPlayerNetwork = (player) => {
  const playerLinks = player.links
  const store = useModelStore()
  const directConnections = []
  const partyConnections = []

  const scanOldBoys = (links = [], store = []) => {
    const touched = []
    const connectedOldBoys = getOldBoysConnection(links)

    for (const oldBoyLink of connectedOldBoys) {
      if (
        !store.find(
          (r) =>
            [r[0].id, r[1].id].includes(oldBoyLink[0].id) &&
            [r[0].id, r[1].id].includes(oldBoyLink[1].id)
        )
      ) {
        touched.push(oldBoyLink)
        store.push(oldBoyLink)
      }
    }

    if (touched.length > 0) scanOldBoys(touched, store)
  }

  scanOldBoys(playerLinks, directConnections)

  const tempNetwork = Object.assign([], playerLinks).concat(directConnections)

  const { hasParty, hasCannes } = scanConnections(tempNetwork)

  if (hasCannes) {
    for (const oldBoy of store.oldBoysNetwork) {
      for (const cannesHex of rf.CANNES_HEXES) {
        const ch = getHexByRef(cannesHex)

        if (linkIncludesHex(oldBoy, ch) && !linksIncludeLink(tempNetwork, oldBoy)) {
          const ob = []
          scanOldBoys([oldBoy], ob)
          ob.forEach((o) => {
            tempNetwork.push(o)
            directConnections.push(o)
          })
        }
      }
    }
  }

  if (!hasParty) {
    return directConnections
  }

  for (const party of getPartiesInNetwork(tempNetwork)) {
    const entrances = getPartyEntrances(party)
    for (const entrance of entrances) {
      for (const oldBoy of store.oldBoysNetwork) {
        if (
          linkIncludesHex(oldBoy, entrance) &&
          !tempNetwork.find((tl) => linkIncludesHex(tl, entrance))
        ) {
          const ob = []
          scanOldBoys([oldBoy], ob)
          ob.forEach((o) => {
            tempNetwork.push(o)
            directConnections.push(o)
          })
        }
      }
    }
  }

  return directConnections.concat(partyConnections)
}

export function setPlaceableLinks(player, cigars) {
  const store = useModelStore()
  store.context.placeableLinks.splice(0)
  let newLinks = []
  let allLinks = []
  let playerLinks = []
  playerLinks = player.links

  for (let i = 0; i < store.players.length; i++) allLinks = allLinks.concat(store.players[i].links)
  allLinks = allLinks.concat(store.oldBoysNetwork)

  if (playerLinks.length === 0) {
    store.context.neighbours.forEach((t, index) => {
      t.forEach((t2) => {
        // This just constantly returns undefined
        /*const newLinkExists = newLinks.find(
          (i) => (i[0] === index && i[1] === t2) || (i[0] === t2 && i[1] === index)
        )
        alert(newLinkExists)
        if (newLinkExists) {
          return
        }*/

        const linkPlaced = allLinks.find((linkInAllLinks) => {
          const h1 = store.hexes.find(
            (h) => h.hex.q == linkInAllLinks[0].hex.q && h.hex.r === linkInAllLinks[0].hex.r
          )
          const h2 = store.hexes.find(
            (h) => h.hex.q == linkInAllLinks[1].hex.q && h.hex.r === linkInAllLinks[1].hex.r
          )
          if (!h1 && !h2) return

          if ((h1.id === index && h2.id === t2) || (h2.id === index && h1.id === t2)) {
            return true
          }
          return false
        })
        if (linkPlaced) return
        //TODO check if link already exists
        else {
          const coordsA = store.hexes.find((h) => h.id === index)
          const coordsB = store.hexes.find((h) => h.id === t2)
          newLinks.push([
            {
              ...coordsA
            },
            {
              ...coordsB
            }
          ])
        }
      })
    })
    // Now filter out already placed links
  }

  if (playerLinks.length == 5 && !cigars) {
    newLinks = []
    store.context.placeableLinks = []
    store.context.action = rf.ACT_REMOVE_LINK
    setRemovableLinks(player)
    return
  }

  if (playerLinks.length <= 4 || cigars) {
    playerLinks = playerLinks.concat(getOldBoysInPlayerNetwork(player))
    const { hasPhone, hasParty, hasCannes } = scanConnections(playerLinks)
    playerLinks.map((l1) => {
      const n1 = store.context.neighbours[l1[0].id].filter((n) => n !== l1[1].id)
      const n2 = store.context.neighbours[l1[1].id].filter((n) => n !== l1[0].id)

      n1.forEach((l) => {
        const nl = store.hexes.find((h) => h.id == l)

        if (
          !allLinks.find((al) => {
            return (
              (al[0].id === l1[0].id && al[1].id === nl.id) ||
              (al[0].id === nl.id && al[1].id === l1[0].id)
            )
          })
        ) {
          newLinks.push([l1[0], nl])
        }
      })

      n2.forEach((l) => {
        const nl = store.hexes.find((h) => h.id == l)

        if (
          !allLinks.find((al) => {
            return (
              (al[0].id === l1[1].id && al[1].id === nl.id) ||
              (al[0].id === nl.id && al[1].id === l1[1].id)
            )
          })
        ) {
          newLinks.push([l1[1], nl])
        }
      })
    })

    if (hasCannes) {
      rf.CANNES_HEXES.forEach((ch) => {
        const hexes = store.hexes.filter((h) => h.hexRef == ch)
        if (!hexes) return

        const findCN = (hex) => {
          const hexNeighbours = store.context.neighbours[hex.id]

          hexNeighbours.forEach((hn) => {
            if (
              !allLinks.find((al) => {
                return (
                  (al[0].id === hn && al[1].id === hex.id) ||
                  (al[0].id === hex.id && al[1].id === hn)
                )
              })
            ) {
              const neighbour = store.hexes.find((h) => h.id == hn)

              newLinks.push([hex, neighbour])
            }
          })
        }
        hexes.forEach((hex) => findCN(hex))
      })
    }

    if (hasPhone) {
      rf.HEX_PHONE_TILES.forEach((ch) => {
        const hex = store.hexes.find((h) => h.hexRef == ch)
        if (!hex) return
        const phoneNeighbours = getNeighbours(hex.hex)
        phoneNeighbours.forEach((hn) => {
          if (
            !allLinks.find((al) => {
              return (
                (al[0].id === hn.id && al[1].id === hex.id) ||
                (al[0].id === hex.id && al[1].id === hn.id)
              )
            })
          ) {
            newLinks.push([hex, hn])
          }
        })
      })
    }

    if (hasParty) {
      playerLinks.forEach((l) => {
        const h1 = l[0]
        const h2 = l[1]

        if (
          rf.HEX_PARTY_ROTATABLE.includes(h1.hexRef) ||
          rf.HEX_PARTY_ROTATABLE.includes(h2.hexRef)
        ) {
          store.context.partyZones.forEach((pz) => {
            if (pz.find((hex) => h1.id == hex.id || h2.id == hex.id)) {
              pz.forEach((x) => {
                if (rf.HEX_PARTY_ROTATABLE.includes(x.hexRef) && h1.id != x.id && h2.id != x.id) {
                  store.context.neighbours[x.id].forEach((n) => {
                    if (
                      !allLinks.find((al) => {
                        return (
                          (al[0].id === x.id && al[1].id === n) ||
                          (al[0].id === n && al[1].id === x.id)
                        )
                      })
                    ) {
                      newLinks.push([x, store.hexes.find((h) => h.id == n)])
                    }
                  })
                }
              })
            }
          })
        }
      })
    }
  }

  // Now make the array unique, as [A, B] is the same as [B, A].
  // Also make sure the one with -ve first stays in the array
  // First, make the most negative q (then r) first in the A, B pair
  newLinks = newLinks
    .map((subArray) => {
      const [A, B] = subArray

      if (A.hex.q === B.hex.q) {
        return A.hex.r - B.hex.r < 0 ? [B, A] : [A, B]
      } else {
        return A.hex.q - B.hex.q < 0 ? [B, A] : [A, B]
      }
    }) // NB This continues straight in with the .filter
    // Now, remove duplicates
    .filter((subArray, index, self) => {
      const [A, B] = subArray
      const duplicateIndex = self.findIndex(
        (arr, i) =>
          i > index &&
          JSON.stringify(arr[0]) === JSON.stringify(A) &&
          JSON.stringify(arr[1]) === JSON.stringify(B)
      )
      return duplicateIndex === -1
    })

  // Now remove any already placed links from cigars
  /*if (cigars) {
    // Assuming newLinks and allLinks are defined as arrays of length 2 arrays

    // Filter out the length 2 arrays from newLinks that already exist in allLinks
    newLinks = newLinks.filter(link => {
      // Check if the length 2 array exists in allLinks
      return !allLinks.some(existingLink => {
        // Compare each object in the length 2 arrays for equality
        return link[0].id === existingLink[0].id && link[1].id === existingLink[1].id;
      });
    });

    // filteredLinks now contains the length 2 arrays from newLinks that are not present in allLinks
  }*/

  // Now work back, and find if a link is CNS to CNS tile, or PARTY to PARTY, or NON-PARTY to NON-ROTATABLE-PARTY (ie no invites)
  for (let i = newLinks.length - 1; i >= 0; i--) {
    //let removed = false
    // Remove CNS---CNS
    if (rf.CANNES_HEXES.includes(newLinks[i][0].hexRef) && rf.CANNES_HEXES.includes(newLinks[i][1].hexRef)) {
      //removed = true
      newLinks.splice(i, 1)
    }
    // remove PARTY---PARTY
    else if (rf.HEX_PARTY_TILES.includes(newLinks[i][0].hexRef) && rf.HEX_PARTY_TILES.includes(newLinks[i][1].hexRef)) {
      //removed = true
      newLinks.splice(i, 1)
    }
    // remove NON-PARTY---NON-ROTATBLE-PARTY
    else if (!rf.HEX_PARTY_TILES.includes(newLinks[i][0].hexRef) && rf.HEX_PARTY_FIXED.includes(newLinks[i][1].hexRef)) {
      //removed = true
      newLinks.splice(i, 1)
    }
    else if (rf.HEX_PARTY_FIXED.includes(newLinks[i][0].hexRef) && !rf.HEX_PARTY_TILES.includes(newLinks[i][1].hexRef)) {
      //removed = true
      newLinks.splice(i, 1)
    }
    else if (cigars && (rf.HEX_PHONE_TILES.includes(newLinks[i][0].hexRef) || rf.HEX_PHONE_TILES.includes(newLinks[i][1].hexRef))
    ) {
      newLinks.splice(i, 1)
    }
    // So now if either is a party rotatable (party-party already removed) check it is over an invitation
    else if (rf.HEX_PARTY_ROTATABLE.includes(newLinks[i][0].hexRef) || rf.HEX_PARTY_ROTATABLE.includes(newLinks[i][1].hexRef)) {
      // Find the party and non party tile
      let partyTile = newLinks[i][0]
      let otherTile = newLinks[i][1]
      if (rf.HEX_PARTY_ROTATABLE.includes(newLinks[i][1].hexRef)) {
        partyTile = newLinks[i][1]
        otherTile = newLinks[i][0]
      }

      let validPartyTileEsges = findInvitationEdges(partyTile.hexRef, partyTile.rotation)

      let joiningSideFromPartyTile = getJoiningSide(partyTile.hex, otherTile.hex)
      if (!validPartyTileEsges.includes(joiningSideFromPartyTile)) {
        //removed = true
        newLinks.splice(i, 1)
      }
    }

  }

  store.context.placeableLinks = [...newLinks]
}


export function getLinkSVGpoints(link, cigar, forHighlight) {
  const store = useModelStore()

  let p = hexToPixel({
    q: link[0].hex.q,
    r: link[0].hex.r,
    s: link[0].hex.s
  })

  let q = hexToPixel({
    q: link[1].hex.q,
    r: link[1].hex.r,
    s: link[1].hex.s
  })

  let modX = 0
  let modY = 0

  let debug = false
  if (debug) {
    alert(`p.x ${p.x} p.y ${p.y} q.x ${q.x} q.y ${q.y}`)
    alert(Math.round((store.refSize / 8 / store.canvasSize) * 600))
  }

  // NOTE: Instead of setting Math.abs() === Math.round
  // The difference is taken instead and checked to be less than 2.
  // Sometimes the rounding made the 2 sides have a difference of 1, and so it didn't display correctly.

  // This works for HORIZONTAL links
  if (p.y === q.y) {
    // Move away from centre
    if (!cigar) {
      p.x -= 35 * store.refSize / 2200 / store.canvasSize * 447
      q.x += 35 * store.refSize / 2200 / store.canvasSize * 447
    }

    modX = 0
    modY = (((20 * store.refSize) / 2400) * 800) / store.canvasSize
    if (cigar) {
      modX *= 2.5
      modY *= 2.5
    }
    if (debug) alert(1)
  }
  // This works for pointing DOWN links
  else if (
    Math.abs(Math.round(p.x) - Math.round(q.x)) -
    Math.round((store.refSize / 8 / store.canvasSize) * 600) <
    2 &&
    Math.round(p.y) > Math.round(q.y)
  ) {
    // Move away form centre
    if (!cigar) {
      p.x -= 50 * 0.33 * store.refSize / 2200 / store.canvasSize * 447
      p.y -= 50 * 0.66 * store.refSize / 2200 / store.canvasSize * 447
      q.x += 50 * 0.33 * store.refSize / 2200 / store.canvasSize * 447
      q.y += 50 * 0.66 * store.refSize / 2200 / store.canvasSize * 447
    }

    //Math.abs(Math.round(q.y) / Math.round(p.y)) - 2 < 2) {
    modX = (((17.5 * store.refSize) / 2400) * 800) / store.canvasSize
    modY = (((-10 * store.refSize) / 2400) * 800) / store.canvasSize
    if (cigar && !forHighlight) {
      modX *= 4.5 // 0.66
      modY *= 4.5 // 0.33
    }
    else if (cigar && forHighlight) {
      modX *= 2 // 0.66
      modY *= 2 // 0.33
    }
    if (debug) alert(2)
  }

  // This works for pointing UP lines
  else if (
    Math.abs(Math.round(p.x) - Math.round(q.x)) -
    Math.round((store.refSize / 8 / store.canvasSize) * 600) <
    2
  ) {
    // Move away form centre
    if (!cigar) {
      p.x -= 50 * 0.33 * store.refSize / 2200 / store.canvasSize * 447
      p.y += 50 * 0.66 * store.refSize / 2200 / store.canvasSize * 447
      q.x += 50 * 0.33 * store.refSize / 2200 / store.canvasSize * 447
      q.y -= 50 * 0.66 * store.refSize / 2200 / store.canvasSize * 447
    }

    //&& Math.round(p.y) < Math.round(q.y)) {
    modY = (((10 * store.refSize) / 2400) * 800) / store.canvasSize
    modX = (((17.5 * store.refSize) / 2400) * 800) / store.canvasSize
    if (cigar && !forHighlight) {
      modX *= 4.5 // 0.66
      modY *= 4.5 // 0.33
    }
    else if (cigar && forHighlight) {
      modX *= 2 // 0.66
      modY *= 2 // 0.33
    }
    if (debug) alert(3)
  }

  // Fine tune all links here
  modX *= 0.5
  modY *= 0.5


  if (forHighlight && !cigar) {
    modX *= 3
    modY *= 3
  }

  return `${p.x + modX}, ${p.y + modY}
          ${q.x + modX}, ${q.y + modY}
          ${q.x - modX}, ${q.y - modY}
          ${p.x - modX}, ${p.y - modY}`
}

export function getHexPoints(forHighlight) {
  const store = useModelStore()

  let hexSideLength = store.refSize // Adjust this value based on the desired hex size in pixels
  if (forHighlight) hexSideLength += 400
  const canvasSize = store.canvasSize // Adjust this value based on the size of the container

  // FLAT POINTS
  /*const flatPoints = [
    [0.5, 0],
    [0.25, -0.435],
    [-0.25, -0.435],
    [-0.5, 0],
    [-0.25, 0.435],
    [0.25, 0.435]
  ];*/

  let pointyPoints = [
    [0.433, 0.25],
    [0.434, -0.251721],
    [0, -0.501721],
    [-0.433, -0.25],
    [-0.434, 0.251721],
    [-0.001, 0.501721]
  ]

  const absolutePoints = pointyPoints.map(
    ([x, y]) =>
      `${((x * hexSideLength) / canvasSize) * 100},${((y * hexSideLength) / canvasSize) * 100}`
  )

  return absolutePoints.join(' ')
}

export function getEdgePointsForPartyZone(partyZone) {
  const store = useModelStore()

  let hexSideLength = store.refSize // Adjust this value based on the desired hex size in pixels
  const canvasSize = store.canvasSize // Adjust this value based on the size of the container

  let pointyPoints = [
    [0.433, 0.25],
    [0.434, -0.251721],
    [0, -0.501721],
    [-0.433, -0.25],
    [-0.434, 0.251721],
    [-0.001, 0.501721]
  ]

  const absolutePoints = pointyPoints.map(
    ([x, y]) => [
      ((x * hexSideLength) / canvasSize) * 100,
      ((y * hexSideLength) / canvasSize) * 100
    ]
  );

  let allHexPoints = []
  // Calculate the shift points for each hex in hexRefs
  for (let i = 0; i < partyZone.length; i++) {
    let newHexPoints = JSON.parse(JSON.stringify(absolutePoints))
    let individulHex = hexToPixel(partyZone[i].hex)
    let shift = [parseFloat(individulHex.x.toFixed(1)), parseFloat(individulHex.y.toFixed(1))]
    for (let j = 0; j < newHexPoints.length; j++) {
      newHexPoints[j][0] += shift[0]
      newHexPoints[j][1] += shift[1]
    }
    allHexPoints = allHexPoints.concat(`${newHexPoints[0][0]}, ${newHexPoints[0][1]}
    ${newHexPoints[1][0]}, ${newHexPoints[1][1]}
    ${newHexPoints[2][0]}, ${newHexPoints[2][1]}
    ${newHexPoints[3][0]}, ${newHexPoints[3][1]}
    ${newHexPoints[4][0]}, ${newHexPoints[4][1]}
    ${newHexPoints[5][0]}, ${newHexPoints[5][1]}`)
  }


  return [...allHexPoints]
}

export function setRemovableLinks(player) {
  const store = useModelStore()
  let playerLinks = player.links
  const removable = []

  const oldBoysNetworks = getOldBoysInPlayerNetwork(player)

  const filterHangingOldBoys = (oldBoys) => {

    // NEW FUNCTION
    const scan = (oldBoy) => {
      const h1 = oldBoy[0]
      const h2 = oldBoy[1]

      if (
        playerLinks.find((pl) => linkIncludesHex(pl, h1)) &&
        playerLinks.find((pl) => linkIncludesHex(pl, h2))
      ) {
        return true
      }

      // if entering a party AND party has another link it's not hanging

      const network = []

      const scanObNetwork = (oldBoy) => {
        network.push(oldBoy)
        const rest = oldBoys.filter((i) => i != oldBoy)
        const h1 = oldBoy[0]
        const h2 = oldBoy[1]

        const nextLink = rest.filter(
          (x) =>
            ((rf.HEX_PARTY_ROTATABLE.includes(h1.hexRef) ||
              rf.HEX_PARTY_ROTATABLE.includes(h2.hexRef)) &&
              (rf.HEX_PARTY_ROTATABLE.includes(x[0].hexRef) ||
                rf.HEX_PARTY_ROTATABLE.includes(x[1].hexRef)) &&
              store.context.partyZones.find(
                (pz) =>
                  pz.find((p) => p.id == h1.id || p.id == h2.id) &&
                  pz.find((p) => p.id == x[0].id || p.id == x[1].id)
              )) ||
            x[0].id == h1.id ||
            x[1].id == h2.id ||
            x[0].id == h2.id ||
            x[1].id == h1.id ||
            ((rf.CANNES_HEXES.includes(h1.hexRef) || rf.CANNES_HEXES.includes(h2.hexRef)) &&
              (rf.CANNES_HEXES.includes(x[0].hexRef) || rf.CANNES_HEXES.includes(x[1].hexRef))) ||
            ((rf.HEX_PHONE_TILES.includes(h1.hexRef) || rf.HEX_PHONE_TILES.includes(h2.hexRef)) &&
              (rf.HEX_PHONE_TILES.includes(x[0].hexRef) ||
                rf.HEX_PHONE_TILES.includes(x[1].hexRef)))
        )

        nextLink.forEach((nl) => {
          if (!linksIncludeLink(network, nl)) {
            scanObNetwork(nl)
          }
        })
      }

      scanObNetwork(oldBoy)

      const connectedLinks = playerLinks.reduce((prev, curr) => {
        // if connected through party or cannes tiles
        const { hasCannes, hasParty } = scanConnections([curr])
        let connectedPartyEntrances = []
        let parties = getPartiesInNetwork([curr])

        if (hasParty && parties.length > 0) {
          connectedPartyEntrances = parties[0].filter((pt) =>
            rf.HEX_PARTY_ROTATABLE.includes(pt.hexRef)
          )
        }

        network.forEach((ob) => {
          /* 27 APR
          // 10 apr*/
          if (linksIncludeLink(prev, curr)) {
            return
          }
          /*
          if (linkIncludesHex(ob, curr[0]) || linkIncludesHex(ob, curr[1])) {
            prev.push(curr)
            //10-4
            return
          }

          if (
            (hasParty && connectedPartyEntrances.map((pe) => pe.hexRef).includes(ob[0].hexRef)) ||
            connectedPartyEntrances.includes(ob[1].hexRef)
          ) {
            prev.push(curr)
            // 10-4
            return
          }

          if (
            (hasCannes && rf.CANNES_HEXES.includes(ob[1].hexRef) ||
              (hasCannes && rf.CANNES_HEXES.includes(ob[0].hexRef)))
          ) {
            prev.push(curr)
            //10-4
            return
          }*/
          if (linkIncludesHex(ob, curr[0]) || linkIncludesHex(ob, curr[1])) {
            prev.push(curr)
            return
          }

          if (
            (hasParty && connectedPartyEntrances.map((pe) => pe.hexRef).includes(ob[0].hexRef)) ||
            connectedPartyEntrances.map((pe) => pe.hexRef).includes(ob[1].hexRef)
          ) {
            prev.push(curr)
            return
          }

          if (
            (hasCannes && rf.CANNES_HEXES.includes(ob[1].hexRef) ||
              (hasCannes && rf.CANNES_HEXES.includes(ob[0].hexRef)))
          ) {
            prev.push(curr)
            return
          }
        })

        return prev
      }, [])

      if (connectedLinks.length > 1) {
        return true
      }

      return false
    } // END scan

    return oldBoys.filter((o) => scan(o))
  } // END filterHangingOldBoys

  // remove old boys that are connected only from one side (aka hanging)
  const oldBoysConnectingPlayerLinks = filterHangingOldBoys(oldBoysNetworks)

  playerLinks = playerLinks.concat(oldBoysConnectingPlayerLinks)

  //store.historyHelpers.linksToHighlight = playerLinks
  //return
  playerLinks.forEach((l) => {
    const rest = playerLinks.filter((x) => x != l)

    const checkedLinks = []

    function checkConnection(link) {
      checkedLinks.push(link)
      const h1 = link[0]
      const h2 = link[1]
      const hexLinks = rest.filter(
        (x) =>
          ((rf.HEX_PARTY_ROTATABLE.includes(h1.hexRef) ||
            rf.HEX_PARTY_ROTATABLE.includes(h2.hexRef)) &&
            (rf.HEX_PARTY_ROTATABLE.includes(x[0].hexRef) ||
              rf.HEX_PARTY_ROTATABLE.includes(x[1].hexRef)) &&
            store.context.partyZones.find(
              (pz) =>
                pz.find((p) => p.id == h1.id || p.id == h2.id) &&
                pz.find((p) => p.id == x[0].id || p.id == x[1].id)
            )) ||
          x[0].id == h1.id ||
          x[1].id == h2.id ||
          x[0].id == h2.id ||
          x[1].id == h1.id ||
          ((rf.CANNES_HEXES.includes(h1.hexRef) || rf.CANNES_HEXES.includes(h2.hexRef)) &&
            (rf.CANNES_HEXES.includes(x[0].hexRef) || rf.CANNES_HEXES.includes(x[1].hexRef))) ||
          ((rf.HEX_PHONE_TILES.includes(h1.hexRef) || rf.HEX_PHONE_TILES.includes(h2.hexRef)) &&
            (rf.HEX_PHONE_TILES.includes(x[0].hexRef) || rf.HEX_PHONE_TILES.includes(x[1].hexRef)))
      )
      hexLinks.forEach((hl) => {
        if (!checkedLinks.find((cl) => cl == hl)) checkConnection(hl)
      })
    }

    checkConnection(rest[0])

    if (checkedLinks.length === rest.length) removable.push(l)
  })
  store.context.removableLinks = removable
}


export function findInvitationEdges(hexRef, rotation) {
  if (!rf.HEX_PARTY_ROTATABLE.includes(hexRef)) return []
  if (hexRef === rf.HEX_PARTY_0_A) return [rotation]
  if (hexRef === rf.HEX_PARTY_0_B) return [rotation]
  if (hexRef === rf.HEX_PARTY_01) return [rotation, (rotation + 1) % 6]
  if (hexRef === rf.HEX_PARTY_02_A) return [rotation, (rotation + 2) % 6]
  if (hexRef === rf.HEX_PARTY_02_B) return [rotation, (rotation + 2) % 6]
  if (hexRef === rf.HEX_PARTY_03_A) return [rotation, (rotation + 3) % 6]
  if (hexRef === rf.HEX_PARTY_03_B) return [rotation, (rotation + 3) % 6]
  if (hexRef === rf.HEX_PARTY_05) return [rotation, (rotation + 5) % 6]
}

export function updatePartyZones() {
  const store = useModelStore()

  store.context.partyZones = []

  function scanPartyZone(h, pz) {
    if (!rf.HEX_PARTY_TILES.includes(h.hexRef)) {
      return // not really a party hex
    }

    if (pz.find((ph) => ph == h.id)) {
      return // hex is already in a party zone
    }

    if (store.context.partyZones.find((pz) => pz.find((i) => i.id == h.id))) {
      return
    }

    pz.push(h)

    const neighbours = store.context.neighbours[h.id]

    neighbours.forEach((n) => {
      const nHex = store.hexes.find((i) => i.id == n)
      if (rf.HEX_PARTY_TILES.includes(nHex.hexRef) && !pz.find((i) => i.id == nHex.id)) {
        scanPartyZone(nHex, pz)
      }
    })
  }

  store.hexes.forEach((hex) => {
    if (rf.HEX_PARTY_TILES.includes(hex.hexRef)) {
      const partyZone = []
      scanPartyZone(hex, partyZone)
      if (partyZone.length > 0) {
        store.context.partyZones.push(partyZone)
      }
    }
  })
}


function getJoiningSide(fromHex, toHex) {
  if (fromHex.r === toHex.r) {
    if (fromHex.q < toHex.q) return 3
    else return 0
  } else if (fromHex.s === toHex.s) {
    if (fromHex.q < toHex.q) return 2
    else return 5
  } else if (fromHex.q === toHex.q) {
    if (fromHex.r < toHex.r) return 4
    else return 1
  }

  return -1
}

export function getAnyHexPlacementError(tile, hexRef, rotation) {
  // If not adding a paty tile, there won't be an error
  if (!rf.HEX_PARTY_TILES.includes(hexRef)) return false

  let newInvitationEdges = findInvitationEdges(hexRef, rotation)

  // Now find the neighbours
  let neighbours = getNeighbours(tile)
  let errorNum = 0

  neighbours.forEach((neighbour) => {
    if (rf.HEX_PARTY_TILES.includes(neighbour.hexRef)) {
      // First find the side of the new hex that joins it to the neighbour
      let joiningSide = getJoiningSide(tile, neighbour.hex)

      // If an invite is over the join to a party tile, it is invalid
      if (newInvitationEdges.includes(joiningSide)) {
        if (rf.HEX_PARTY_TILES.includes(neighbour.hexRef)) {
          errorNum = 1
          return
        }
      }

      // Now check the OLD tile - check you're not blocking an invite with a party tile
      let oldHexSide = (joiningSide + 3) % 6
      let oldInvitationEdges = findInvitationEdges(neighbour.hexRef, neighbour.rotation)
      if (oldInvitationEdges.includes(oldHexSide)) {
        errorNum = 2
        return
      }
    }
  })

  return errorNum > 0
}

export function getHexesInNetwork(player, refsOnly) {
  const store = useModelStore()

  const playerLinks = player.links.concat(getOldBoysInPlayerNetwork(player))

  let hexes = playerLinks.reduce((prev, curr) => {
    const h1 = curr[0]
    const h2 = curr[1]
    const h1Exists = prev.find((i) => i.id == h1.id)
    const h2Exists = prev.find((i) => i.id == h2.id)

    if (!h1Exists) prev.push(h1)
    if (!h2Exists) prev.push(h2)
    if (rf.HEX_PARTY_ROTATABLE.includes(h1.hexRef) || rf.HEX_PARTY_ROTATABLE.includes(h2.hexRef)) {
      const partyTiles = store.context.partyZones.find((pz) => {
        return pz.find((x) => x.id === h1.id || x.id == h2.id)
      })

      if (partyTiles != undefined && partyTiles.length > 0)
        partyTiles.forEach((pt) => {
          if (prev.find((h) => h.id === pt.id)) {
            return
          }

          prev.push(pt)
        })
    }

    return prev
  }, [])
  if (!refsOnly) return hexes
  let hexRefs = []
  for (let i = 0; i < hexes.length; i++) {
    hexRefs.push(hexes[i].hexRef)
  }
  return hexRefs
}

export function calculateScoord(q, r) {
  return (-q - r)
}

export function reconstructHexDataFromQR(q, r, forLink) {
  const store = useModelStore()
  let hexData = {}
  let hex = new hexlib.Hex(q, r, calculateScoord(q, r))

  const index = store.hexes.findIndex((item) => item.hex.q === hex.q && item.hex.r === hex.r && item.hex.s === hex.s);
  let id = store.hexes[index].id
  let rotation = store.hexes[index].rotation
  let hexRef = store.hexes[index].hexRef

  if (forLink) {
    hexData.hex = hex
    hexData.id = id
    hexData.rotation = rotation
    hexData.hexRef = hexRef
    return hexData
  }
}

export function reconstructHexDataFromHexRef(hexRef) {
  const store = useModelStore()

  const index = store.hexes.findIndex((item) => item.hexRef === hexRef);

  let hexData = {}
  let hex = new hexlib.Hex(store.hexes[index].hex.q, store.hexes[index].hex.r, calculateScoord(store.hexes[index].hex.q, store.hexes[index].hex.r))
  let id = store.hexes[index].id
  let rotation = store.hexes[index].rotation

  hexData.hex = hex
  hexData.id = id
  hexData.rotation = rotation
  hexData.hexRef = hexRef
  return hexData
}

export function reconstructHexFromHexRef(hexRef) {
  const store = useModelStore()
  const index = store.hexes.findIndex((item) => item.hexRef === hexRef);
  return store.hexes[index].hex
}
export function reconstructHexRotationFromHexRef(hexRef) {
  const store = useModelStore()
  const index = store.hexes.findIndex((item) => item.hexRef === hexRef);
  return store.hexes[index].rotation
}
