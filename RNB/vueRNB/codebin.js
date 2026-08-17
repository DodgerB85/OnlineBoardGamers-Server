/*****************************
 * 
 * OLD MAPS
 * 
 * 
 * 
 */
import * as funcs from "../js/RNBfuncs.js"
import * as map from "../js/RNBmap.js"
import * as rf from "../js/RNBreference.js"
import * as model from "../js/RNBmodel.js"
import * as context from "../js/RNBcontext.js"
import * as highlight from "../js/RNBhighlight.js"
import * as loc from "../js/RNBlocation.js"

import { useModelStore } from "../stores/RNBstore.js"

export function setupWaterways4p() {
  funcs.importMapOnly([
    [[0, 0, 0], 0, 55],
    [[0, 1, -1], 0, 56],
    [[0, 2, -2], 0, 80],
    [[0, 3, -3], 0, 81],
    [[0, 4, -4], 0, 83],
    [[1, -1, 0], 0, 50],
    [[1, 0, -1], 0, 51],
    [[1, 1, -2], 2, 16],
    [[1, 2, -3], 0, 53],
    [[1, 3, -4], 0, 54],
    [[1, 4, -5], 0, 83],
    [[2, -2, 0], 0, 64],
    [[2, -1, -1], 0, 52],
    [[2, 0, -2], 1, 14],
    [[2, 1, -3], 5, 15],
    [[2, 2, -4], 0, 21],
    [[2, 3, -5], 0, 85],
    [[2, 4, -6], 0, 63],
    [[3, -3, 0], 0, 64],
    [[4, -3, -1], 0, 64],
    [[3, -2, -1], 0, 50],
    [[5, -4, -1], 0, 70],
    [[6, -5, -1], 0, 71],
    [[7, -5, -2], 0, 74],
    [[6, -4, -2], 0, 73],
    [[3, -1, -2], 4, 5],
    [[4, -1, -3], 0, 7],
    [[4, -2, -2], 3, 7],
    [[5, -2, -3], 2, 14],
    [[5, -3, -2], 0, 57],
    [[6, -3, -3], 0, 62],
    [[7, -4, -3], 0, 59],
    [[8, -5, -3], 0, 67],
    [[9, -5, -4], 0, 83],
    [[10, -6, -4], 0, 84],
    [[6, -2, -4], 0, 80],
    [[5, -1, -4], 0, 81],
    [[5, 0, -5], 0, 81],
    [[3, 0, -3], 0, 67],
    [[3, 1, -4], 0, 69],
    [[4, 0, -4], 0, 51],
    [[3, 2, -5], 0, 81],
    [[4, 1, -5], 0, 86],
    [[3, 4, -7], 0, 62],
    [[4, 3, -7], 0, 60],
    [[3, 3, -6], 0, 70],
    [[4, 2, -6], 0, 66],
    [[5, 1, -6], 0, 82],
    [[5, 2, -7], 0, 86],
    [[6, 2, -8], 0, 80],
    [[7, -3, -4], 0, 62],
    [[8, -4, -4], 0, 54],
    [[9, -4, -5], 0, 53],
    [[10, -5, -5], 0, 52],
    [[10, -4, -6], 0, 51],
    [[7, -2, -5], 1, 8],
    [[8, -3, -5], 4, 5],
    [[9, -3, -6], 5, 2],
    [[10, -3, -7], 1, 5],
    [[6, -1, -5], 0, 50],
    [[6, 0, -6], 0, 51],
    [[7, -1, -6], 0, 2],
    [[7, 0, -7], 0, 1],
    [[6, 1, -7], 2, 0],
    [[7, 1, -8], 5, 3],
    [[8, 1, -9], 5, 21],
    [[7, 2, -9], 0, 59],
    [[8, -2, -6], 0, 73],
    [[8, -1, -7], 0, 72],
    [[8, 0, -8], 0, 64],
    [[9, -2, -7], 0, 80],
    [[9, -1, -8], 0, 81],
    [[9, 0, -9], 0, 83],
    [[9, 1, -10], 0, 86],
    [[10, 0, -10], 0, 85],
    [[10, -2, -8], 0, 86],
    [[11, -3, -8], 0, 80],
    [[11, -4, -7], 1, 2],
    [[12, -5, -7], 5, 13],
    [[11, -5, -6], 2, 12],
    [[11, -6, -5], 3, 21],
    [[11, -7, -4], 0, 81],
    [[12, -7, -5], 0, 83],
    [[13, -7, -6], 0, 84],
    [[12, -6, -6], 0, 67],
    [[13, -6, -7], 0, 86],
    [[13, -5, -8], 0, 84],
    [[12, -4, -8], 0, 82],
    [[10, -1, -9], 0, 63],
    [[11, -1, -10], 0, 62],
    [[12, -2, -10], 0, 60],
    [[13, -3, -10], 0, 59],
    [[13, -4, -9], 0, 57],
    [[11, -2, -9], 0, 70],
    [[12, -3, -9], 0, 70],
  ])
}

export function setupTestMap() {
  const store = useModelStore()
  funcs.clearMap(false)
  // ADd hexes
  model.addHexToMap_core([0, 0, 0], 0, rf.MOUNTAIN_RIVER_STRAIGHT)
  store.mapData.zoomData.hexID = 0

  model.addHexToMap_core([1, 0, -1], 0, rf.DESERT_1_UNIRRIGATED)
  model.addHexToMap_core([-1, 1, 0], 5, rf.PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_L)
  model.addHexToMap_core([0, 1, -1], 0, rf.WOODS_RIVER_BRACKETS_WIDE_NARROW)
  model.addHexToMap_core([1, 1, -2], 5, rf.PASTURE_RIVER_STRAIGHT)
  model.addHexToMap_core([-2, 2, 0], 0, rf.SEA_1)
  model.addHexToMap_core([-1, 2, -1], 0, rf.SEA_1)
  model.addHexToMap_core([0, 2, -2], 0, rf.SEA_1)
  model.addHexToMap_core([-2, 3, -1], 0, rf.PASTURE_RIVER_STRAIGHT)
  model.addHexToMap_core([-1, 3, -2], 0, rf.PASTURE_1)
  model.addHexToMap_core([1, 2, -3], 5, rf.PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_L)
  model.addHexToMap_core([0, 3, -3], 0, rf.SEA_1)

  model.setupStartTileForPlayerIndex(0, 8, 0)
  model.setupStartTileForPlayerIndex(1, 8, 1)

  // Add transporters
  model.addTransporterToGame(0, rf.DONKEY, loc.setLandVertexLocation(0, 1), true)
  model.addTransporterToGame(0, rf.RAFT, loc.setRiverLocation(0, 0), true)
  model.addTransporterToGame(0, rf.TRUCK, loc.setLandVertexLocation(0, 8), true)
  model.addTransporterToGame(0, rf.DONKEY, loc.setLandVertexLocation(2, 1), true)
  model.addTransporterToGame(0, rf.DONKEY, loc.setLandVertexLocation(2, 1), true)
  model.addTransporterToGame(0, rf.DONKEY, loc.setLandVertexLocation(3, 7), true)
  //addTransporterToGame(0, rf.DONKEY, loc.setLandVertexLocation(9, 1))
  //addTransporterToGame(0, rf.DONKEY, loc.setLandVertexLocation(0, 1))
  //addTransporterToGame(0, rf.DONKEY, loc.setLandVertexLocation(9, 1))
  model.addTransporterToGame(0, rf.RAFT, loc.setDockedLocation(3, 2, rf.BANK_NONE), true)
  model.addTransporterToGame(0, rf.RAFT, loc.setSeaVertexLocation(6, 11), true)
  model.addTransporterToGame(0, rf.RAFT, loc.setRiverLocation(4, 0), true)

  //addTransporterToGame(0, rf.DONKEY, loc.setTransporterLocation(0))

  for (let k = 0; k < 3; k++) model.addResourceToGame_core(rf.RES_BOARDS, loc.setBucketLocation(0, 0))
  for (let k = 0; k < 2; k++) model.addResourceToGame_core(rf.RES_GOOSE, loc.setBucketLocation(0, 0))

  for (let k = 0; k < 3; k++) model.addResourceToGame_core(rf.RES_IRON, loc.setBucketLocation(1, 0))
  for (let k = 0; k < 3; k++) model.addResourceToGame_core(rf.RES_FUEL, loc.setBucketLocation(1, 0))
  //for (let k = 0; k < 5; k++) addResourceToGame_core(rf.RES_TRUNKS, loc.setBucketLocation(1, 0))
  //for (let k = 0; k < 2; k++) addResourceToGame_core(rf.RES_BOARDS, loc.setBucketLocation(4, 0))
  for (let k = 0; k < 5; k++) model.addResourceToGame_core(rf.RES_BOARDS, loc.setBucketLocation(4, 0))

  for (let k = 0; k < 2; k++) model.addResourceToGame_core(rf.RES_STONE, loc.setBucketLocation(0, 0))

  //for (let k = 0; k < 2; k++) addResourceToGame_core(rf.RES_TRUNKS, loc.setBucketLocation(3, 0))
  //for (let k = 0; k < 3; k++) addResourceToGame_core(rf.RES_STONE, loc.setBucketLocation(3, 0))
  for (let k = 0; k < 2; k++) model.addResourceToGame_core(rf.RES_GOOSE, loc.setBucketLocation(9, 0))

  for (let k = 0; k < 2; k++) model.addResourceToGame_core(rf.RES_FUEL, loc.setBucketLocation(9, 0))
  for (let k = 0; k < 2; k++) model.addResourceToGame_core(rf.RES_GOLD, loc.setBucketLocation(9, 0))

  map.addBuildingToMap_core(rf.BLDG_ROWBOAT_FACTORY, loc.setBucketLocation(4, 0), false, -1)
  for (let k = 0; k < 5; k++) model.addResourceToGame_core(rf.RES_BOARDS, loc.setBucketLocation(1, 0))
  for (let k = 0; k < 5; k++) model.addResourceToGame_core(rf.RES_IRON, loc.setBucketLocation(4, 0))

  //map.addWallToMap(2, 3, 1, false)
  //map.addWallToMap(2, 5, 1, false)
  //map.addWallToMap(9, 6, 1, false)
  //map.addWallToMap(9, 7, 1, false)
  //map.addWallToMap(9, 11, 1, false)
  model.addResourceToGame_core(rf.RES_BOARDS, loc.setBucketLocation(9, 0))
  model.addResourceToGame_core(rf.RES_STONE, loc.setBucketLocation(9, 0))
  model.addResourceToGame_core(rf.RES_TRUNKS, loc.setBucketLocation(9, 0))
  model.addResourceToGame_core(rf.RES_TRUNKS, loc.setBucketLocation(9, 0))
  //map.addWallToMap(3, 6, 1, false)
  model.addResourceToGame_core(rf.RES_STONE, loc.setBucketLocation(3, 1))
  model.addResourceToGame_core(rf.RES_STONE, loc.setBucketLocation(3, 1))
  model.addResourceToGame_core(rf.RES_STONE, loc.setBucketLocation(3, 1))

  model.addResourceToGame_core(rf.RES_BOARDS, loc.setBucketLocation(3, 0))
  model.addResourceToGame_core(rf.RES_STONE, loc.setBucketLocation(3, 1))
  model.addResourceToGame_core(rf.RES_TRUNKS, loc.setBucketLocation(3, 2))

  //map.addBridgeToMap(0, [4, 9], false)

  context.resetContextAndHighlights()
  store.undoPoints.splice(0)
  store.gameflow.turn = 1
  store.gameflow.phase = rf.PHASE_MOVEMENT_TO
  highlight.updateAllHighlightsForTransporterMode()
}

export function setupRescueGeese() {
  const store = useModelStore()
  funcs.clearMap(false)
  let mapData = [
    [[0, 0, 0], 0, 55],
    [[-1, 0, 1], 0, 70],
    [[0, -1, 1], 0, 69],
    [[-1, 1, 0], 0, 54],
    [[1, -1, 0], 0, 75],
    [[1, 0, -1], 0, 70],
    [[0, 1, -1], 0, 55],
    [[2, -1, -1], 0, 56],
    [[2, 0, -2], 0, 55],
    [[1, 1, -2], 0, 60],
    [[3, -1, -2], 0, 85],
    [[3, 0, -3], 0, 81],
    [[2, 1, -3], 0, 80],
    [[4, 0, -4], 0, 70],
    [[4, -1, -3], 0, 58],
    [[3, 1, -4], 0, 59],
    [[5, -1, -4], 0, 80],
    [[5, 0, -5], 0, 80],
    [[4, 1, -5], 0, 80],
    [[6, 0, -6], 1, 8],
  ]
  funcs.importMapOnly(mapData)
  map.addWallToMap_core(-1, 7, 10, 1, false)
  map.addWallToMap_core(-1, 8, 10, 1, false)
  map.addWallToMap_core(-1, 8, 11, 1, false)
  map.addWallToMap_core(-1, 8, 12, 1, false)
  map.addWallToMap_core(-1, 9, 12, 1, false)

  map.addWallToMap_core(-1, 14, 16, 1, false)
  map.addWallToMap_core(-1, 13, 16, 1, false)
  map.addWallToMap_core(-1, 13, 17, 1, false)
  map.addWallToMap_core(-1, 13, 18, 1, false)
  map.addWallToMap_core(-1, 15, 18, 1, false)

  map.addWallToMap_core(-1, 14, 16, 1, false)
  map.addWallToMap_core(-1, 13, 16, 1, false)
  map.addWallToMap_core(-1, 13, 17, 1, false)
  map.addWallToMap_core(-1, 13, 18, 1, false)
  map.addWallToMap_core(-1, 15, 18, 1, false)

  /*model.addTransporterToGame(0, rf.DONKEY, [rf.LOCATION_LAND_VERTEX, 13, 0])
  model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_SEA_VERTEX_VERTEX, 11, 0])
  model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_LAND_VERTEX, 13, 0])
  model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_LAND_VERTEX, 13, 0])
  model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_LAND_VERTEX, 13, 0])*/

  //model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_LAND_VERTEX, 0, 0])

  let histObj = []
  //histObj.push([rf.CUSTOM_SET_MAP, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 7, 10, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 8, 10, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 8, 11, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 8, 12, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 9, 12, 1])

  histObj.push([rf.CUSTOM_ADD_WALL, 14, 16, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 13, 16, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 13, 17, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 13, 18, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 15, 18, 1])

  histObj.push([rf.CUSTOM_ADD_WALL, 14, 16, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 13, 16, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 13, 17, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 13, 18, 1])
  histObj.push([rf.CUSTOM_ADD_WALL, 15, 18, 1])

  //histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_GOOSE, [0, 0]]])
  /*histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_BOARDS, [13, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_BOARDS, [13, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_BOARDS, [13, 0]]])
  histObj.push([rf.CUSTOM_ADD_TRANSPORTER, rf.DONKEY, 0, [rf.LOCATION_LAND_VERTEX, 13, 0]])
  histObj.push([rf.CUSTOM_ADD_TRANSPORTER, rf.RAFT, 0, [rf.LOCATION_SEA_VERTEX, 11, 0]])*/

  model.addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [...histObj])

  model.setupStartTileForPlayerIndex(0, 0, 0)

  context.resetContextAndHighlights()
  store.undoPoints.splice(0)
  store.gameflow.turn = 1
  store.gameflow.phase = rf.PHASE_MOVEMENT_TO
  highlight.updateAllHighlightsForTransporterMode()
}

export function setupMakeMint() {
  const store = useModelStore()
  funcs.clearMap()
  let mapData = [
    [[0, 0, 0], 0, 55],
    [[-1, 0, 1], 0, 56],
    [[-1, -1, 2], 0, 70],
    [[1, -1, 0], 0, 70],
    [[0, -1, 1], 0, 69],
    [[-2, 1, 1], 2, 5],
    [[-2, 0, 2], 0, 3],
    [[-1, 1, 0], 5, 14],
    [[0, 1, -1], 1, 15],
    [[1, 0, -1], 4, 0],
    [[0, -2, 2], 0, 69],
    [[1, -2, 1], 2, 12],
    [[-3, 2, 1], 0, 80],
    [[-2, 2, 0], 0, 81],
    [[-1, 2, -1], 0, 82],
    [[0, 2, -2], 0, 85],
    [[-3, 3, 0], 2, 21],
    [[-2, 3, -1], 5, 20],
    [[-1, 3, -2], 1, 12],
    [[-2, 4, -2], 0, 79],
    [[-3, 4, -1], 0, 78],
  ]
  mapData = [
    [[0, 0, 0], 0, 55],
    [[-1, 0, 1], 0, 56],
    [[-1, -1, 2], 0, 70],
    [[1, -1, 0], 0, 70],
    [[0, -1, 1], 0, 69],
    [[-2, 1, 1], 2, 5],
    [[-2, 0, 2], 0, 3],
    [[-1, 1, 0], 5, 14],
    [[0, 1, -1], 1, 15],
    [[1, 0, -1], 4, 0],
    [[0, -2, 2], 0, 69],
    [[1, -2, 1], 2, 12],
    [[-3, 2, 1], 0, 80],
    [[-2, 2, 0], 0, 81],
    [[-1, 2, -1], 0, 82],
    [[0, 2, -2], 0, 85],
    [[-3, 3, 0], 2, 21],
    [[-2, 3, -1], 5, 20],
    [[-1, 3, -2], 1, 12],
    [[-2, 4, -2], 0, 79],
    [[-3, 4, -1], 0, 78],
    [[1, 1, -2], 2, 1],
  ]
  funcs.importMapOnly(mapData)

  /*	model.addResourceToGame_core(rf.RES_TRUNKS, [rf.LOCATION_LAND_VERTEX, 3, 0])
  model.addResourceToGame_core(rf.RES_TRUNKS, [rf.LOCATION_LAND_VERTEX, 3, 0])
  model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_LAND_VERTEX, 0, 0])
  model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_LAND_VERTEX, 0, 0])
  model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_LAND_VERTEX, 0, 0])
  model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_LAND_VERTEX, 0, 0])
  model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_LAND_VERTEX, 0, 0])
  model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_LAND_VERTEX, 0, 0])
  model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_LAND_VERTEX, 0, 0])
  //model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_LAND_VERTEX, 1, 0])
  //model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_LAND_VERTEX, 1, 0])
  map.addBuildingToMap_core(rf.BLDG_SAWMILL, [rf.LOCATION_LAND_VERTEX, 3, 0], false, -1)
  map.addBuildingToMap_core(rf.BLDG_WOODCUTTER, [rf.LOCATION_LAND_VERTEX, 2, 0], false, -1)

  model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_RIVER, 8, 0])
  model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_BUCKET, 13, 0])*/
  model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_BUCKET, 14, 0], true)
  model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_BUCKET, 14, 0])
  model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_BUCKET, 14, 0])
  model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 14, 0])
  model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 14, 0])
  model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 14, 0])
  model.addResourceToGame_core(rf.RES_COINS, [rf.LOCATION_BUCKET, 18, 0])
  map.addBuildingToMap_core(rf.BLDG_OILRIG, [rf.LOCATION_BUCKET, 15, 0], false, -1)

  let histObj = []
  //histObj.push([rf.CUSTOM_SET_MAP, 0])
  /*histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_TRUNKS, [3, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_TRUNKS, [3, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_STONE, [0, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_STONE, [0, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_STONE, [0, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_STONE, [0, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_STONE, [0, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_STONE, [0, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_STONE, [0, 0]]])
  //histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_GOOSE, [1, 0]]])
  //histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_GOOSE, [1, 0]]])
  histObj.push([rf.CUSTOM_ADD_BUILDING, rf.BLDG_SAWMILL, [3, 0]])
  histObj.push([rf.CUSTOM_ADD_BUILDING, rf.BLDG_WOODCUTTER, [2, 0]])
  histObj.push([rf.CUSTOM_ADD_WALL, 0, 1, 1])
    histObj.push([rf.CUSTOM_ADD_TRANSPORTER, rf.DONKEY, 0, [rf.LOCATION_LAND_VERTEX, 13, 0]])

  histObj.push([rf.CUSTOM_ADD_WALL, 0, 1, 1])*/
  /*histObj.push([rf.CUSTOM_ADD_TRANSPORTER, rf.RAFT, 0, [rf.LOCATION_SEA_VERTEX, 14, 0]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_GOOSE, [14, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_GOOSE, [14, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_BOARDS, [14, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_BOARDS, [14, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_BOARDS, [14, 0]]])
  histObj.push([rf.CUSTOM_ADD_RESOURCE, [rf.RES_COINS, [18, 0]]])
  histObj.push([rf.CUSTOM_ADD_BUILDING, rf.BLDG_OILRIG, [15, 0]])

  model.addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [...histObj])*/

  //model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_SEA_VERTEX, 13, 0])
  //model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_SEA_VERTEX, 13, 0])
  //model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_SEA_VERTEX, 13, 0])
  //model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_SEA_VERTEX, 13, 0])

  model.setupStartTileForPlayerIndex(0, 0, 0)

  context.resetContextAndHighlights()
  store.undoPoints.splice(0)
  store.gameflow.turn = 1
  store.gameflow.phase = rf.PHASE_MOVEMENT_TO
  highlight.updateAllHighlightsForTransporterMode()
}

export function setup1v1() {
  const store = useModelStore()
  funcs.clearMap()

  const mapData = [
    [[0, 0, 0], 0, 59],
    [[-1, 1, 0], 0, 62],
    [[-2, 2, 0], 0, 60],
    [[-3, 3, 0], 0, 55],
    [[1, 0, -1], 0, 64],
    [[0, 1, -1], 0, 73],
    [[-1, 2, -1], 0, 55],
    [[-2, 3, -1], 0, 73],
    [[-3, 4, -1], 0, 68],
    [[1, 1, -2], 0, 56],
    [[0, 2, -2], 0, 72],
    [[-1, 3, -2], 0, 75],
    [[-2, 4, -2], 0, 73],
    [[2, 1, -3], 0, 59],
    [[1, 2, -3], 4, 15],
    [[0, 3, -3], 0, 86],
    [[2, 2, -4], 5, 14],
    [[1, 3, -4], 5, 2],
    [[3, 2, -5], 5, 4],
    [[3, 3, -6], 0, 8],
    [[2, 3, -5], 5, 7],
    [[4, 3, -7], 5, 21],
    [[4, 2, -6], 0, 55],
    [[3, 4, -7], 0, 79],
    [[2, 5, -7], 0, 77],
    [[1, 6, -7], 0, 78],
    [[0, 7, -7], 0, 75],
    [[-1, 8, -7], 0, 79],
    [[2, 4, -6], 1, 6],
    [[1, 4, -5], 2, 7],
    [[-1, 4, -3], 2, 16],
    [[0, 4, -4], 5, 4],
    [[0, 5, -5], 0, 3],
    [[0, 6, -6], 1, 7],
    [[1, 5, -6], 4, 21],
    [[-1, 5, -4], 0, 70],
    [[-2, 5, -3], 0, 60],
    [[-1, 6, -5], 0, 58],
    [[-1, 7, -6], 0, 74],
  ]
  funcs.importMapOnly(mapData)

  model.setupStartTileForPlayerIndex(0, 9, 0)
  model.setupStartTileForPlayerIndex(1, 12, 0)

  //let histObj = []

  //model.addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [...histObj])

  context.resetContextAndHighlights()
  store.undoPoints.splice(0)
  store.gameflow.turn = 1
  store.gameflow.phase = rf.PHASE_MOVEMENT_TO

  highlight.updateAllHighlightsForTransporterMode()
}

/*******************************
 * 
 * END OLD MAPS
 * 
 * 
 * 
 */


// MAP AREA -- HIGHLIGHT CLICKED -- NON TM
function clickedHighlight(entry) {
  // NON TM STUFF

 else if (store.context.action === rf.ACT_MOVE_TRANSPORTER) {
		store.context.transporterMoveInfo.push(entry)

		let transporterObj = model.getTransporterByID(store.context.transporterMoveInfo[0])
		// Mark it as moved
		transporterObj.movedThisTurn = true
		// Name the useful vars
		const hexToID = hexID
		//const hexTo = store.mapData.hexData.find((h) => h.hexID === hexToID)
		const vertexesTo = vertexBucket
		let vertexTo = vertexesTo[0]
		if (vertexesTo.length > 1) vertexTo = vertexesTo[1]
		//hexTo.hexContents[vertexTo].push(rf.DONKEY)

		// First, remove the transporter from the store.context.transporterMoveInfo[0] info
		//const hexIDfrom = store.context.transporterMoveInfo[0][0]
		//const hexFrom = store.mapData.hexData.find((h) => h.hexID === hexIDfrom)
		//const vertexesfrom = store.context.transporterMoveInfo[0][1]
		//let fromIdx = hexFrom.hexContents[vertexesfrom[0]].indexOf(rf.DONKEY)
		//hexFrom.hexContents[vertexesfrom[0]].splice(fromIdx, 1)

		// UPDATE THE POS FOR THE TRANSPORTER OBJECT
		//let ownerIndex = store.context.transporterMoveInfo[0][3]
		//let transporterId = store.context.transporterMoveInfo[0][4]
		//let transporterObj = store.players[ownerIndex].transporters.find((t) => t.id === transporterId)

		// First, get the side on the new hex into which you are entering
		let oldHex = model.getHexByID(transporterObj.hexID)
		let newHex = model.getHexByID(hexToID)
		let joiningSide = hd.getJoiningSide(newHex.coord, oldHex.coord)
		transporterObj.hexID = hexToID
		transporterObj.vertex = vertexTo
		transporterObj.sideEntered = joiningSide

		// Update all resource on the transporter to indicate they've been moved
		let resourcesOnTransporter = model.resourcesOnTransport(transporterObj.id)
		for (let i = 0; i < resourcesOnTransporter.length; i++) {
			resourcesOnTransporter[i].movedTransporterID = transporterObj.id
		}

		// Update the transporter's raw X and Y to give a smooth transition animation
		store.resetContext()
		return
	}
	if (store.context.action === rf.ACT_PICKUP_RES || store.context.action === rf.ACT_DROP_RES) {
		// You are pickup up a res, but clicking on a hex section. So it must be a raft action. So change the resources vertex
		// OR dropping and clicking a hex action, eg de-rafting
		let res = model.getResourceByID(store.context.resIDbeingMoved)
		let newVertex = vertexBucket[0]
		res.locationType = rf.LOCATION_VERTEX
		res.vertex = newVertex
		res.transporterID = -1
		res.hexID = hexID
		store.resetContext()
		return
	}
}


// THEBOTTOM OF THE clickedTransporter FUNCITON FOR NON TM STUFF
export function clickedTransporter(transporterID) {
    /************************** BELOW HERE ARE NON TRANSPORTER MODE STUFF */

    // First check if we're pickup up a resource
    if (store.context.action === rf.ACT_PICKUP_RES || store.context.action === rf.ACT_DROP_RES) {
      if (store.ALL_TRANSPORTERS.some((t) => t.locationType === rf.LOCATION_TRANSPORTER && t.transporterID === transporterObj.id)) {
        let clientX = event.clientX
        let clientY = event.clientY
        let htmlMessage = "Transporter is<br/>already full<br/>>Max Capacity: 1"
        model.showErrorPopup(clientX, clientY, htmlMessage)
        return
      }
      let resourcesOnTransporter = model.resourcesOnTransport(transporterObj.id)
      let transporterStats = rf.getTransporterStats(transporterObj.type)
      if (resourcesOnTransporter.length >= transporterStats.maxCapacity) {
        let clientX = event.clientX
        let clientY = event.clientY
        let htmlMessage = "Transporter is<br/>already full<br/>Max Capacity: " + transporterStats.maxCapacity
        model.showErrorPopup(clientX, clientY, htmlMessage)
        return
      }

      let resObj = model.getResByID(store.context.resIDbeingMoved)
      resObj.locationType = rf.LOCATION_TRANSPORTER
      resObj.transporterID = transporterObj.id
      resObj.hexID = -1
      resObj.vertex = -1
      store.resetContext()
      return
    }

    // Otherwise, assume you are selecting for a move
    store.resetContext()
    store.clearAllHighlights()
}

// THE BOTTOM OF THE clickedResOnTransporter FUNCITON FOR NON TM STUFF
export function clickedResOnTransporter(transporterID, resourceID) {
    /**** BELOW HERE IS NO TM STUFF */
    if (store.context.action === rf.ACT_DROP_RES) {
      // ASsume it's a resource
      let resObj = model.getResByID(contentObj.id)
      // If it's a river hex, AND there's a raft, AND there's no bridge, then we need to give options
      // First check if all vertexes are connected. If so, just drop it
      let hex = model.getHexByID(props.transporterObjProp.hexID)
      let vertexBucket = hex.joinedVertexesCurrent.find((subArray) => subArray.includes(props.transporterObjProp.vertex)) || []
      if (vertexBucket.length === 6) {
        model.dropResourceOntoHex(resObj.id, props.transporterObjProp.hexID, props.transporterObjProp.vertex)
        return
      }
      // So now it must be on an unbrided river hex
      if (model.isWaterTransporter(props.transporterObjProp.type)) {
        // TODO brackets river
        let highlightArr = []
        for (let i = 0; i < hex.joinedVertexesCurrent.length; i++) {
          highlightArr.push([hex.hexID, hex.joinedVertexesCurrent[i]])
        }
        store.context.hexPiecesToHighlightUnderTransporters = highlightArr
        store.context.resIDbeingMoved = resObj.id
        return
      }

      // So now it is a land transporter dropping into an unbridgeed river hex
      // If there is a water transport, need to higlight hex pieces
      // TODO brackets river
      let waterTransportsOnHex = model.transportersOnHex(transporterObjProp.hexID) // && model.isWaterTransporter(t.type) )//&& t.ownerIndex === controller.currentPlayerIndex())
      if (waterTransportsOnHex.length > 0) {
        let highlightArr = []
        for (let i = 0; i < hex.joinedVertexesCurrent.length; i++) {
          highlightArr.push([hex.hexID, hex.joinedVertexesCurrent[i]])
        }
        store.context.hexPiecesToHighlightUnderTransporters = highlightArr
        store.context.resIDbeingMoved = resObj.id
        return
      }
      model.dropResourceOntoHex(resObj.id, props.transporterObjProp.hexID, props.transporterObjProp.vertex)

      //store.context.action = rf.ACT_NONE
      //store.clearAllHighlights()
    }
}

// THE BOTTOM OF THE CLICKED RES FUNCITON FOR NON TM STUFF
export function clickedRes(event, hexID, resID) {
  // BELOW HERE IS NON TM STUFF

  let joinedVertexes = model.getHexByID(hexID).joinedVertexesCurrent
  let vertexBucket = joinedVertexes.find((subArray) => subArray.includes(resource.vertex))

  // Change it's location
  // TODO fix brackets river
  let validTransporters = store.ALL_TRANSPORTERS.filter((t) => t.ownerIndex === controller.currentPlayerIndex() && t.hexID === hexID && model.isWaterTransporter(t.type))
  // If there are any valid transporters, then use them as a bridge to directlu connect distand land trsporters
  // TODO fix brackets river
  let tempVertexBucket = [...vertexBucket]
  if (validTransporters.length > 0) tempVertexBucket = [0, 1, 2, 3, 4, 5]
  validTransporters = validTransporters.concat(store.ALL_TRANSPORTERS.filter((t) => t.ownerIndex === controller.currentPlayerIndex() && t.hexID === hexID && model.isLandTransporter(t.type) && tempVertexBucket.includes(t.vertex)))

  if (validTransporters.length === 0) {
    
    return
  }
  if (validTransporters.length === 1) {
    // Find out how much stuff is on the transport already.
    // If there's already a transporter, you can't carry anything else
    if (store.ALL_TRANSPORTERS.some((t) => t.locationType === rf.LOCATION_TRANSPORTER && t.transporterID === validTransporters[0].id)) {
      let clientX = event.clientX
      let clientY = event.clientY
      let htmlMessage = "Transporter is<br/>already full<br/>Max Capacity: 1"
      model.showErrorPopup(clientX, clientY, htmlMessage)
      // Now set up for a possible ferry
      if (model.isWaterTransporter(validTransporters[0].type)) {
        let vertexBuckets = getVertexBucketAccessibleByTransporter(validTransporters[0].id, true, true)
        if (vertexBuckets.length > 0) highlight.setupOptionsToDropHexDuringTM(resource.id, -1, validTransporters[0].hexID)
      }

      return
    }
    let resourcesOnTransporter = model.resourcesOnTransport(validTransporters[0].id)
    let transporterStats = rf.getTransporterStats(validTransporters[0].type)
    if (resourcesOnTransporter.length >= transporterStats.maxCapacity) {
      let clientX = event.clientX
      let clientY = event.clientY
      let htmlMessage = "Transporter is<br/>already full<br/>Max Capacity: " + transporterStats.maxCapacity
      model.showErrorPopup(clientX, clientY, htmlMessage)
      // Now set up for a possible ferry
      if (model.isWaterTransporter(validTransporters[0].type)) {
        let vertexBuckets = getVertexBucketAccessibleByTransporter(validTransporters[0].id, true, true)
        if (vertexBuckets.length > 0) highlight.setupOptionsToDropHexDuringTM(resource.id, -1, validTransporters[0].hexID)
      }
      return
    }
    // So now we know there's a single valid transporter. So load if it's a land, or water where everything is bridged
    if (model.isLandTransporter(validTransporters[0].type) || (model.isWaterTransporter(validTransporters[0].type) && vertexBucket.length === 5)) {
      resource.locationType = rf.LOCATION_TRANSPORTER
      resource.transporterID = validTransporters[0].id
      resource.hexID = -1
      resource.vertex = -1
      return
    }
  }

  // Now there are either 2 valid transporters, OR their is a water raft
  store.context.action = rf.ACT_PICKUP_RES
  store.context.resIDbeingMoved = resID
  if (validTransporters.some((t) => model.isWaterTransporter(t.type)) && vertexBucket.length < 5) {
    let hex = model.getHexByID(hexID)
    let highlightArr = []
    for (let i = 0; i < hex.joinedVertexesCurrent.length; i++) {
      highlightArr.push([hex.hexID, hex.joinedVertexesCurrent[i]])
    }
    store.context.hexPiecesToHighlightUnderTransporters = highlightArr
  }
}




// This is a lovely function, but the display philosophy got changed, so it is no longer used

// THIS MAY WELL BE REDUNDANT = ESPECIALLY IF WE MOVE TO STORING STUFF AS PER @VRAID'S SPECS
// ALSO, I'LL PROBABLY MOVE TO A DIFFERENT DISPLAY SCHEME,
// IE INSTEAD OF DISPLAYING ON HEX BUCKETS, HAVE A "RES PILE", "BUILDING AREA" and "TRANS AREA"
export function balanceHexContents(hex) {
 
  // Step 1: Update joinedVertexesCurrent based on builtBridges
  let joinedVertexesCurrent = JSON.parse(JSON.stringify(hex.joinedVertexesCurrent)) // Deep copy
  const vertexToBucket = {}
  for (let bucketIdx = 0; bucketIdx < joinedVertexesCurrent.length; bucketIdx++) {
    for (let v of joinedVertexesCurrent[bucketIdx]) {
      vertexToBucket[v] = bucketIdx
    }
  }

  for (let bridge of hex.builtBridges) {
    const [v1, v2] = bridge
    if (v1 in vertexToBucket && v2 in vertexToBucket) {
      const bucket1 = vertexToBucket[v1]
      const bucket2 = vertexToBucket[v2]
      if (bucket1 !== bucket2) {
        // Merge bucket2 into bucket1
        joinedVertexesCurrent[bucket1] = joinedVertexesCurrent[bucket1].concat(joinedVertexesCurrent[bucket2])
        joinedVertexesCurrent[bucket1] = [...new Set(joinedVertexesCurrent[bucket1])].sort((a, b) => a - b)
        joinedVertexesCurrent[bucket2] = []
        // Update vertexToBucket
        for (let v of joinedVertexesCurrent[bucket1]) {
          vertexToBucket[v] = bucket1
        }
      }
    }
  }

  // Remove empty buckets
  joinedVertexesCurrent = joinedVertexesCurrent.filter((bucket) => bucket.length > 0)
  hex.joinedVertexesCurrent = joinedVertexesCurrent

  // Step 2: Initialize new hexContents
  const newHexContents = Array(6)
    .fill()
    .map(() => [])

  // Step 3: Balance each bucket
  for (let bucket of joinedVertexesCurrent) {
    // Collect items from hexContents in this bucket
    let buildings = []
    let transporters = []
    let resources = []
    for (let v of bucket) {
      for (let item of hex.hexContents[v]) {
        if (rf.ALL_BUILDINGS.includes(item[0])) {
          buildings.push(item)
        } else if (rf.ALL_TRANSPORTERS.includes(item[0])) {
          transporters.push(item)
        } else if (rf.ALL_RES.includes(item[0])) {
          resources.push(item)
        }
      }
    }

    // Determine ends and internals
    const availableVertexes = bucket.sort((a, b) => a - b)
    let ends = availableVertexes.length <= 1 ? [] : [availableVertexes[0], availableVertexes[availableVertexes.length - 1]]
    let internals = availableVertexes.filter((v) => !ends.includes(v))

    // Initialize vertexToItems for this bucket
    let vertexToItems = {}
    for (let v of availableVertexes) {
      vertexToItems[v] = []
    }

    // Place building (at most 1)
    if (buildings.length > 0) {
      let prefer = [3, 2, 4] // Changed order to match requirement: 3, 2, 4
      let chosen = null
      for (let p of prefer) {
        if (internals.includes(p)) {
          chosen = p
          break
        }
      }
      if (chosen === null && internals.length > 0) {
        chosen = internals[0]
      }
      if (chosen === null) {
        chosen = availableVertexes[0] // Fallback to first vertex
      }
      vertexToItems[chosen].push(...buildings)
    }

    // Place transporters (max 2 per vertex, avoid building if possible, prefer internals)
    let transporterCounts = availableVertexes.reduce((acc, v) => ({ ...acc, [v]: 0 }), {})
    let preferVertexes = internals.concat(ends) // Prefer internals
    if (transporters.length > 2 * availableVertexes.length) {
      // Split evenly, ignore max
      let perVertex = Math.floor(transporters.length / availableVertexes.length)
      let extras = transporters.length % availableVertexes.length
      let tIdx = 0
      for (let v of preferVertexes) {
        let count = perVertex + (extras > 0 ? 1 : 0)
        extras--
        for (let k = 0; k < count && tIdx < transporters.length; k++) {
          vertexToItems[v].push(transporters[tIdx])
          tIdx++
        }
      }
    } else {
      // Place with max 2, avoid building vertex
      for (let t of transporters) {
        let chosen = null
        // Prefer empty internals
        for (let v of internals) {
          if (transporterCounts[v] < 2 && vertexToItems[v].length === 0) {
            chosen = v
            break
          }
        }
        // Then non-empty internals
        if (chosen === null) {
          for (let v of internals) {
            if (transporterCounts[v] < 2) {
              chosen = v
              break
            }
          }
        }
        // Then empty ends
        if (chosen === null) {
          for (let v of ends) {
            if (transporterCounts[v] < 2 && vertexToItems[v].length === 0) {
              chosen = v
              break
            }
          }
        }
        // Then non-empty ends
        if (chosen === null) {
          for (let v of ends) {
            if (transporterCounts[v] < 2) {
              chosen = v
              break
            }
          }
        }
        // Fallback
        if (chosen === null) {
          chosen = preferVertexes[0]
        }
        vertexToItems[chosen].push(t)
        transporterCounts[chosen]++
      }
    }

    // Place resources (max 3 per vertex, prefer empty, then with transporters, avoid buildings)
    let remainingVertexes = availableVertexes.filter((v) => vertexToItems[v].length === 0)
    if (remainingVertexes.length === 0 || resources.length > 3 * remainingVertexes.length) {
      remainingVertexes = availableVertexes.filter((v) => vertexToItems[v].every((item) => !rf.ALL_BUILDINGS.includes(item[0])))
    }
    if (remainingVertexes.length > 0) {
      let perVertex = Math.floor(resources.length / remainingVertexes.length)
      let extras = resources.length % remainingVertexes.length
      let rIdx = 0
      for (let v of remainingVertexes) {
        let count = perVertex + (extras > 0 ? 1 : 0)
        extras--
        for (let k = 0; k < count && rIdx < resources.length; k++) {
          vertexToItems[v].push(resources[rIdx])
          rIdx++
        }
      }
    }

    // Update newHexContents
    for (let v of availableVertexes) {
      newHexContents[v] = vertexToItems[v]
    }
  }

  // Step 4: Update hex.hexContents
  hex.hexContents = newHexContents

  return hex
}

/** KEEP THIS!!!!!!!!!! This makes road POLYGON points, whereas we need path */
// Create the road svg points
// These are made assuming a rotation of 0
// Points are made along edges or vertices
// If the hex is rotated, then the edge / vertex used is picked from the array according to the rotation
// The STARTING points are limited, calculated once, and then rotated around to the correct side at the end of the function
// NB ROAD points are built on pointy top, and therefore need to use MID_POINTS_POINTY etc, as the whole thing is simply rotated to flat top later
export function getRoadsSVGpoints(hex, hexSide, roadGfxSideArr, hasRoad, idxOfRoadInArray, forZoomPanel) {
	const store = useModelStore()

	// These are the 25% / 75% markers to start a road next to a river
	const topMiddleOfSide0 = forZoomPanel ? [99.923, -405.173] : [99.923 * store.RATIO, -405.173 * store.RATIO]
	const bottomMiddleOfSide0 = forZoomPanel ? [299.769, -289.455] : [299.769 * store.RATIO, -289.455 * store.RATIO]

	if (!hasRoad) return ""

	let startingX = 0
	let startingY = 0
	let midX = 0
	let midY = 0
	let endingX = 0
	let endingY = 0

	const joinedVertices = model.hexVertexBucketsInitial(hex.hexID)

	const riverSides = util.indexArray(6).filter((i) => hex.sideRiverIds[i] >= 0)

	const points = getPointyPoints(forZoomPanel)
	const vertexesPointyArr = points[0]
	const midPointsArr = points[1]

	// If the tile has no river, it will always be edge to center
	if (riverSides.length === 0 && !rf.BRACKETS_RIVERS.includes(hex.riverType)) {
		startingX = midPointsArr[0][0]
		startingY = midPointsArr[0][1]
		endingX = 0
		endingY = 0
	}
	// Rivers have to do each side seperately
	else if (riverSides.length > 0 || rf.BRACKETS_RIVERS.includes(hex.riverType)) {
		/** STARTING POSITIONS */
		// If it's not a river side, start in the middle
		if (!riverSides.includes(hexSide)) {
			startingX = midPointsArr[0][0]
			startingY = midPointsArr[0][1]
		}
		// If there's a river, it will always start 25% or 75% along the side
		else {
			startingX = topMiddleOfSide0[0]
			startingY = topMiddleOfSide0[1]
			if (idxOfRoadInArray === 1) {
				startingX = bottomMiddleOfSide0[0]
				startingY = bottomMiddleOfSide0[1]
			}
		}
		/** ENDING POSITIONS */
		// The ending points are fixed PER TILE ROTATION
		// AND depend where you are relative to the river
		// Calculating the end points does get a bit complicated, and needs to be done for every hex (but only for rotation 0, then adapted for rotation)
		if (hex.riverType === rf.RIVER_SINGLE_STRAIGHT) {
			// Find out if we're above or below the river
			const vertexBucketIndex = joinedVertices.findIndex((subArray) => subArray.includes(hexSide))
			let topOfRiver = false
			if (vertexBucketIndex === 1 && !riverSides.includes(hexSide)) topOfRiver = true
			if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) topOfRiver = true
			if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) topOfRiver = true

			let baseVertex = 1
			baseVertex = (baseVertex + hex.rotation) % 6

			if (topOfRiver) {
				endingX = -vertexesPointyArr[baseVertex][0] * 0.2
				endingY = -vertexesPointyArr[baseVertex][1] * 0.2
			} else {
				endingX = vertexesPointyArr[baseVertex][0] * 0.2
				endingY = vertexesPointyArr[baseVertex][1] * 0.2
			}
		} else if (hex.riverType === rf.RIVER_SHARP_U) {
			// Find out if we're in the big or small bucket
			const vertexBucketIndex = joinedVertices.findIndex((subArray) => subArray.includes(hexSide))
			let smallArea = false
			let doubleBend = false
			if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) smallArea = true
			else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) smallArea = true
			else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) doubleBend = true
			else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) doubleBend = true

			// Inside the small U
			if (smallArea) {
				let baseVertex = 5
				baseVertex = (baseVertex + hex.rotation) % 6
				endingX = vertexesPointyArr[baseVertex][0] * 0.2
				endingY = vertexesPointyArr[baseVertex][1] * 0.2
			}
			// Just ouside the river
			else if (doubleBend) {
				let midPos = 0
				if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) midPos = 3
				midPos = (midPos + hex.rotation) % 6
				midX = midPointsArr[midPos][0] * 0.8
				midY = midPointsArr[midPos][1] * 0.8
			}
			// Not on a river side OR having done a single bend to mid point
			if (!smallArea) {
				let baseVertex = 2
				baseVertex = (baseVertex + hex.rotation) % 6
				endingX = vertexesPointyArr[baseVertex][0] * 0.3
				endingY = vertexesPointyArr[baseVertex][1] * 0.3
			}
		} else if (hex.riverType === rf.RIVER_SHARP_U_PLUS_STRAIGHT) {
			// Find out if we're in the big or small bucket
			const vertexBucketIndex = joinedVertices.findIndex((subArray) => subArray.includes(hexSide))
			let smallArea = false
			let edgeBigArea = false
			let edgeMediumArea = false
			let bigArea = false
			let mediumArea = false
			if (vertexBucketIndex === 2 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) smallArea = true
			else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) smallArea = true
			else if (vertexBucketIndex === 2 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) edgeBigArea = true
			else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) edgeMediumArea = true
			else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) edgeBigArea = true
			else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) edgeMediumArea = true
			else if (joinedVertices[vertexBucketIndex].length === 3 && !riverSides.includes(hexSide)) bigArea = true
			else if (joinedVertices[vertexBucketIndex].length === 2 && !riverSides.includes(hexSide)) mediumArea = true

			if (smallArea) {
				let baseVertex = 5
				baseVertex = (baseVertex + hex.rotation) % 6
				endingX = vertexesPointyArr[baseVertex][0] * 0.5
				endingY = vertexesPointyArr[baseVertex][1] * 0.5
			} else if (edgeBigArea || bigArea) {
				let baseVertex = 1
				baseVertex = (baseVertex + hex.rotation) % 6
				endingX = vertexesPointyArr[baseVertex][0] * 0.5
				endingY = vertexesPointyArr[baseVertex][1] * 0.5
			} else if (edgeMediumArea || mediumArea) {
				let baseMidPoint = 3
				baseMidPoint = (baseMidPoint + hex.rotation) % 6
				endingX = midPointsArr[baseMidPoint][0] * 0.5
				endingY = midPointsArr[baseMidPoint][1] * 0.5
			}
		} else if (hex.riverType === rf.RIVER_BRACKETS_WIDE_NARROW) {
			// Find out if we're in the big or small bucket
			const vertexBucketIndex = joinedVertices.findIndex((subArray) => subArray.includes(hexSide))
			let smallArea = false
			let edgeBigHourglass = false
			let endBigHourglass = false
			let edgeMediumArea = false

			// Deal with non river sides first
			if (!riverSides.includes(hexSide)) {
				if (vertexBucketIndex === 0) {
					let endingVertex = 0
					endingVertex = (endingVertex + hex.rotation) % 6
					endingX = midPointsArr[endingVertex][0] * 0.1
					endingY = midPointsArr[endingVertex][1] * 0.1
				} else if (vertexBucketIndex === 1) {
					let baseVertex = 2
					baseVertex = (baseVertex + hex.rotation) % 6
					endingX = midPointsArr[baseVertex][0] * 0.4
					endingY = midPointsArr[baseVertex][1] * 0.4
				}
			}
			// Now handle river sides
			else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0 /*&& !joinedVertices[vertexBucketIndex].includes(hexSide+1 % 6)*/ && hex.vertexBucketIdsInitial[hexSide] !== hex.vertexBucketIdsInitial[(hexSide + 5) % 6]) endBigHourglass = true
			else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1 && hex.roadGfx[hexSide].length === 2 && hex.roadGfx[(hexSide + 1) % 6].length === 1 && hex.roadGfx[(hexSide + 5) % 6].length === 1) edgeMediumArea = true
			else if (vertexBucketIndex === 2 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) smallArea = true
			else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) smallArea = true
			else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) edgeBigHourglass = true
			else if (vertexBucketIndex === 2 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) edgeBigHourglass = true
			else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) endBigHourglass = true
			else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) edgeMediumArea = true

			if (smallArea) {
				let baseVertex = 5
				baseVertex = (baseVertex + hex.rotation) % 6
				endingX = vertexesPointyArr[baseVertex][0] * 0.5
				endingY = vertexesPointyArr[baseVertex][1] * 0.5
			} else if (edgeBigHourglass) {
				let baseVertex = 1
				if (idxOfRoadInArray === 1) baseVertex = 0
				baseVertex = (baseVertex + hex.rotation) % 6
				midX = vertexesPointyArr[baseVertex][0] * 0.5
				midY = vertexesPointyArr[baseVertex][1] * 0.5
				let endingVertex = 0
				endingVertex = (endingVertex + hex.rotation) % 6
				endingX = midPointsArr[endingVertex][0] * 0.1
				endingY = midPointsArr[endingVertex][1] * 0.1
			} else if (endBigHourglass) {
				let baseVertex = 4
				baseVertex = (baseVertex + hex.rotation) % 6
				endingX = vertexesPointyArr[baseVertex][0] * 0.5
				endingY = vertexesPointyArr[baseVertex][1] * 0.5
			} else if (edgeMediumArea) {
				let baseVertex = 2
				baseVertex = (baseVertex + hex.rotation) % 6
				endingX = midPointsArr[baseVertex][0] * 0.4
				endingY = midPointsArr[baseVertex][1] * 0.4
			}
		}
	}

	// Hard code for debug
	/*startingX = 0
  startingY = middleOfTopY
  endingX = 0
  endingY = -100*/

	// Mathematically rotate the points  60 * side position
	let angleRadians = (hexSide * 60 * Math.PI) / 180

	const rotatedStartingX = startingX * Math.cos(angleRadians) - startingY * Math.sin(angleRadians)
	const rotatedStartingY = startingX * Math.sin(angleRadians) + startingY * Math.cos(angleRadians)

	if (midX === 0 && midY === 0) return `${rotatedStartingX},${rotatedStartingY} ${endingX},${endingY}` //return `${rotatedStartingX},${rotatedStartingY} ${endingX},${endingY}`
	return `${rotatedStartingX},${rotatedStartingY} ${midX},${midY} ${endingX},${endingY} ${midX},${midY}`
}


/** TEMP WORKIN PATH BUT HOURGLASSS SHAPE */
// Create the road SVG paths
// These are made assuming a rotation of 0
// Points are made along edges or vertices
// If the hex is rotated, then the edge / vertex used is picked from the array according to the rotation
// The STARTING points are limited, calculated once, and then rotated around to the correct side at the end of the function
// NB ROAD points are built on pointy top, and therefore need to use MID_POINTS_POINTY etc, as the whole thing is simply rotated to flat top later
export function getRoadsSVGpaths(hex, hexSide, roadGfxSideArr, hasRoad, idxOfRoadInArray, forZoomPanel) {
  const store = useModelStore()

  // Adjustable road width (scaled by RATIO for consistency)
  const roadWidth = 40 * (forZoomPanel ? 1 : store.RATIO)
  const halfWidth = roadWidth / 2

  // These are the 25% / 75% markers to start a road next to a river
  const topMiddleOfSide0 = forZoomPanel ? [99.923, -405.173] : [99.923 * store.RATIO, -405.173 * store.RATIO]
  const bottomMiddleOfSide0 = forZoomPanel ? [299.769, -289.455] : [299.769 * store.RATIO, -289.455 * store.RATIO]

  if (!hasRoad) return { roadPath: "", centerPath: "" }

  let startingX = 0
  let startingY = 0
  let midX = 0
  let midY = 0
  let endingX = 0
  let endingY = 0

  const joinedVertices = model.hexVertexBucketsInitial(hex.hexID)

  const riverSides = util.indexArray(6).filter((i) => hex.sideRiverIds[i] >= 0)

  const points = getPointyPoints(forZoomPanel)
  const vertexesPointyArr = points[0]
  const midPointsArr = points[1]

  // If the tile has no river, it will always be edge to center
  if (riverSides.length === 0 && !rf.BRACKETS_RIVERS.includes(hex.riverType)) {
    startingX = midPointsArr[0][0]
    startingY = midPointsArr[0][1]
    endingX = 0
    endingY = 0
  }
  // Rivers have to do each side seperately
  else if (riverSides.length > 0 || rf.BRACKETS_RIVERS.includes(hex.riverType)) {
    /** STARTING POSITIONS */
    // If it's not a river side, start in the middle
    if (!riverSides.includes(hexSide)) {
      startingX = midPointsArr[0][0]
      startingY = midPointsArr[0][1]
    }
    // If there's a river, it will always start 25% or 75% along the side
    else {
      startingX = topMiddleOfSide0[0]
      startingY = topMiddleOfSide0[1]
      if (idxOfRoadInArray === 1) {
        startingX = bottomMiddleOfSide0[0]
        startingY = bottomMiddleOfSide0[1]
      }
    }
    /** ENDING POSITIONS */
    // The ending points are fixed PER TILE ROTATION
    // AND depend where you are relative to the river
    // Calculating the end points does get a bit complicated, and needs to be done for every hex (but only for rotation 0, then adapted for rotation)
    if (hex.riverType === rf.RIVER_SINGLE_STRAIGHT) {
      // Find out if we're above or below the river
      const vertexBucketIndex = joinedVertices.findIndex((subArray) => subArray.includes(hexSide))
      let topOfRiver = false
      if (vertexBucketIndex === 1 && !riverSides.includes(hexSide)) topOfRiver = true
      if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) topOfRiver = true
      if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) topOfRiver = true

      let baseVertex = 1
      baseVertex = (baseVertex + hex.rotation) % 6

      if (topOfRiver) {
        endingX = -vertexesPointyArr[baseVertex][0] * 0.2
        endingY = -vertexesPointyArr[baseVertex][1] * 0.2
      } else {
        endingX = vertexesPointyArr[baseVertex][0] * 0.2
        endingY = vertexesPointyArr[baseVertex][1] * 0.2
      }
    } else if (hex.riverType === rf.RIVER_SHARP_U) {
      // Find out if we're in the big or small bucket
      const vertexBucketIndex = joinedVertices.findIndex((subArray) => subArray.includes(hexSide))
      let smallArea = false
      let doubleBend = false
      if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) smallArea = true
      else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) smallArea = true
      else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) doubleBend = true
      else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) doubleBend = true

      // Inside the small U
      if (smallArea) {
        let baseVertex = 5
        baseVertex = (baseVertex + hex.rotation) % 6
        endingX = vertexesPointyArr[baseVertex][0] * 0.2
        endingY = vertexesPointyArr[baseVertex][1] * 0.2
      }
      // Just ouside the river
      else if (doubleBend) {
        let midPos = 0
        if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) midPos = 3
        midPos = (midPos + hex.rotation) % 6
        midX = midPointsArr[midPos][0] * 0.8
        midY = midPointsArr[midPos][1] * 0.8
      }
      // Not on a river side OR having done a single bend to mid point
      if (!smallArea) {
        let baseVertex = 2
        baseVertex = (baseVertex + hex.rotation) % 6
        endingX = vertexesPointyArr[baseVertex][0] * 0.3
        endingY = vertexesPointyArr[baseVertex][1] * 0.3
      }
    } else if (hex.riverType === rf.RIVER_SHARP_U_PLUS_STRAIGHT) {
      // Find out if we're in the big or small bucket
      const vertexBucketIndex = joinedVertices.findIndex((subArray) => subArray.includes(hexSide))
      let smallArea = false
      let edgeBigArea = false
      let edgeMediumArea = false
      let bigArea = false
      let mediumArea = false
      if (vertexBucketIndex === 2 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) smallArea = true
      else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) smallArea = true
      else if (vertexBucketIndex === 2 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) edgeBigArea = true
      else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) edgeMediumArea = true
      else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) edgeBigArea = true
      else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) edgeMediumArea = true
      else if (joinedVertices[vertexBucketIndex].length === 3 && !riverSides.includes(hexSide)) bigArea = true
      else if (joinedVertices[vertexBucketIndex].length === 2 && !riverSides.includes(hexSide)) mediumArea = true

      if (smallArea) {
        let baseVertex = 5
        baseVertex = (baseVertex + hex.rotation) % 6
        endingX = vertexesPointyArr[baseVertex][0] * 0.5
        endingY = vertexesPointyArr[baseVertex][1] * 0.5
      } else if (edgeBigArea || bigArea) {
        let baseVertex = 1
        baseVertex = (baseVertex + hex.rotation) % 6
        endingX = vertexesPointyArr[baseVertex][0] * 0.5
        endingY = vertexesPointyArr[baseVertex][1] * 0.5
      } else if (edgeMediumArea || mediumArea) {
        let baseMidPoint = 3
        baseMidPoint = (baseMidPoint + hex.rotation) % 6
        endingX = midPointsArr[baseMidPoint][0] * 0.5
        endingY = midPointsArr[baseMidPoint][1] * 0.5
      }
    } else if (hex.riverType === rf.RIVER_BRACKETS_WIDE_NARROW) {
      // Find out if we're in the big or small bucket
      const vertexBucketIndex = joinedVertices.findIndex((subArray) => subArray.includes(hexSide))
      let smallArea = false
      let edgeBigHourglass = false
      let endBigHourglass = false
      let edgeMediumArea = false

      // Deal with non river sides first
      if (!riverSides.includes(hexSide)) {
        if (vertexBucketIndex === 0) {
          let endingVertex = 0
          endingVertex = (endingVertex + hex.rotation) % 6
          endingX = midPointsArr[endingVertex][0] * 0.1
          endingY = midPointsArr[endingVertex][1] * 0.1
        } else if (vertexBucketIndex === 1) {
          let baseVertex = 2
          baseVertex = (baseVertex + hex.rotation) % 6
          endingX = midPointsArr[baseVertex][0] * 0.4
          endingY = midPointsArr[baseVertex][1] * 0.4
        }
      }
      // Now handle river sides
      else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0 /*&& !joinedVertices[vertexBucketIndex].includes(hexSide+1 % 6)*/ && hex.vertexBucketIdsInitial[hexSide] !== hex.vertexBucketIdsInitial[(hexSide + 5) % 6]) endBigHourglass = true
      else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1 && hex.roadGfx[hexSide].length === 2 && hex.roadGfx[(hexSide + 1) % 6].length === 1 && hex.roadGfx[(hexSide + 5) % 6].length === 1) edgeMediumArea = true
      else if (vertexBucketIndex === 2 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) smallArea = true
      else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) smallArea = true
      else if (vertexBucketIndex === 0 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) edgeBigHourglass = true
      else if (vertexBucketIndex === 2 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) edgeBigHourglass = true
      else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 1) endBigHourglass = true
      else if (vertexBucketIndex === 1 && riverSides.includes(hexSide) && idxOfRoadInArray === 0) edgeMediumArea = true

      if (smallArea) {
        let baseVertex = 5
        baseVertex = (baseVertex + hex.rotation) % 6
        endingX = vertexesPointyArr[baseVertex][0] * 0.5
        endingY = vertexesPointyArr[baseVertex][1] * 0.5
      } else if (edgeBigHourglass) {
        let baseVertex = 1
        if (idxOfRoadInArray === 1) baseVertex = 0
        baseVertex = (baseVertex + hex.rotation) % 6
        midX = vertexesPointyArr[baseVertex][0] * 0.5
        midY = vertexesPointyArr[baseVertex][1] * 0.5
        let endingVertex = 0
        endingVertex = (endingVertex + hex.rotation) % 6
        endingX = midPointsArr[endingVertex][0] * 0.1
        endingY = midPointsArr[endingVertex][1] * 0.1
      } else if (endBigHourglass) {
        let baseVertex = 4
        baseVertex = (baseVertex + hex.rotation) % 6
        endingX = vertexesPointyArr[baseVertex][0] * 0.5
        endingY = vertexesPointyArr[baseVertex][1] * 0.5
      } else if (edgeMediumArea) {
        let baseVertex = 2
        baseVertex = (baseVertex + hex.rotation) % 6
        endingX = midPointsArr[baseVertex][0] * 0.4
        endingY = midPointsArr[baseVertex][1] * 0.4
      }
    }
  }

  // Mathematically rotate the points  60 * side position
  let angleRadians = (hexSide * 60 * Math.PI) / 180
  const cosAngle = Math.cos(angleRadians)
  const sinAngle = Math.sin(angleRadians)

  const rotatedStartingX = startingX * cosAngle - startingY * sinAngle
  const rotatedStartingY = startingX * sinAngle + startingY * cosAngle

  // Note: midX/Y and endingX/Y are already adjusted for hex.rotation via index selection,
  // so they do not need explicit rotation here (unlike startingX/Y)

  // Centerline path (matches original polygon points exactly)
  let centerPath = `M ${rotatedStartingX} ${rotatedStartingY} L ${endingX} ${endingY}`
  if (midX !== 0 || midY !== 0) {
    // For bends: start -> mid -> end (original repeats mid at end, but for path line, no need; use Z if closing needed)
    centerPath = `M ${rotatedStartingX} ${rotatedStartingY} L ${midX} ${midY} L ${endingX} ${endingY}`
    // Future curves: Replace L with C, e.g., `C ${midX} ${midY} ${midX} ${midY} ${endingX} ${endingY}` for smooth bend
  }

  // Road path: Filled shape by offsetting centerline perpendicularly (segment-wise for accuracy)
  let roadPath = ""
  const centerlinePoints = midX !== 0 || midY !== 0
    ? [[rotatedStartingX, rotatedStartingY], [midX, midY], [endingX, endingY]]
    : [[rotatedStartingX, rotatedStartingY], [endingX, endingY]]

  // Function to compute perpendicular offset points for a segment
  function offsetSegment(p1, p2, offset) {
    const dx = p2[0] - p1[0]
    const dy = p2[1] - p1[1]
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length === 0) return { left: p1, right: p1 } // Degenerate case
    const nx = -dy / length * offset
    const ny = dx / length * offset
    const left = [p1[0] + nx, p1[1] + ny]
    const right = [p1[0] - nx, p1[1] - ny]
    return { left, right }
  }

  // Build offset points for each side (left and right parallel to centerline)
  const leftOffsets = []
  const rightOffsets = []
  for (let i = 0; i < centerlinePoints.length - 1; i++) {
    const segLeft = offsetSegment(centerlinePoints[i], centerlinePoints[i + 1], halfWidth)
    leftOffsets.push(segLeft.left)
    rightOffsets.push(segLeft.right)
    // For multi-segment, the end of one segment connects to start of next (miter joints approximated by averaging)
    if (i < centerlinePoints.length - 2) {
      const nextSegLeft = offsetSegment(centerlinePoints[i + 1], centerlinePoints[i + 2], halfWidth)
      // Simple average for joint (can be improved with miter for sharp angles)
      const jointX = (segLeft.left[0] + nextSegLeft.left[0]) / 2
      const jointY = (segLeft.left[1] + nextSegLeft.left[1]) / 2
      leftOffsets.push([jointX, jointY])
      const rightJointX = (segLeft.right[0] + nextSegLeft.right[0]) / 2
      const rightJointY = (segLeft.right[1] + nextSegLeft.right[1]) / 2
      rightOffsets.push([rightJointX, rightJointY])
    }
  }

  // Close the shape: last offsets connect back to first
  const lastLeft = offsetSegment(centerlinePoints[centerlinePoints.length - 1], centerlinePoints[0], halfWidth).left
  const lastRight = offsetSegment(centerlinePoints[centerlinePoints.length - 1], centerlinePoints[0], halfWidth).right
  leftOffsets.push(lastLeft)
  rightOffsets.push(lastRight)

  // Note: For single segment (no mid), this simplifies to a parallelogram; for bends, it approximates rounded/mitered joints

  // Build the closed path: left side forward, right side backward, close
  roadPath = `M ${leftOffsets[0][0]} ${leftOffsets[0][1]} `
  for (let i = 1; i < leftOffsets.length; i++) {
    roadPath += `L ${leftOffsets[i][0]} ${leftOffsets[i][1]} `
  }
  for (let i = rightOffsets.length - 1; i >= 0; i--) {
    roadPath += `L ${rightOffsets[i][0]} ${rightOffsets[i][1]} `
  }
  roadPath += `Z`

  return [ roadPath, centerPath ]
}

////////////////////////////////

