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
