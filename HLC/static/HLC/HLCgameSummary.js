function initHLCgameSummary() {
    var allSellingSummaries = [];
    var i = 0;
    var j = 0;
    var k = 0;

    for (i = 0; i < M.logs.length; i++) {
        if (M.logs[i].action === Log.SALES_SUMMARY) allSellingSummaries.push(M.logs[i].param);
    }

    // Now collect the number of cars / sports / trucks sold by each player, and a grand total
    // totalIncomePerTurn[player][turn], vehiclesSoldPerTurn[player][vehicleType][turn]
    var totalIncomePerTurn = [];
    var vehiclesSoldPerTurn = [];
    for (i = 0; i < M.players.length; i++) {
        totalIncomePerTurn.push([]);
        vehiclesSoldPerTurn.push([[], [], []]);
    }

    for (i = 0; i < allSellingSummaries.length; i++) {
        for (j = 0; j < allSellingSummaries[i].length; j++) {
            totalIncomePerTurn[j].push(allSellingSummaries[i][j][3]);

            // Each player's summary entry is 3 dealerships of [amount sold, price per vehicle] pairs (cars, trucks, sports), then the total income
            for (k = 0; k < 3; k++) {
                var soldThisTurn = 0;
                for (var dealershipIndex = 0; dealershipIndex < allSellingSummaries[i][j].length - 1; dealershipIndex++) {
                    soldThisTurn += allSellingSummaries[i][j][dealershipIndex][k][0];
                }
                vehiclesSoldPerTurn[j][k].push(soldThisTurn);
            }
        }
    }

    // Turn 0 has no selling phase
    for (i = 0; i < M.players.length; i++) {
        totalIncomePerTurn[i].unshift(0);
        for (j = 0; j < vehiclesSoldPerTurn[i].length; j++) vehiclesSoldPerTurn[i][j].unshift(0);
    }

    // Now sum to make it total money
    var totalMoneyPerTurn = JSON.parse(JSON.stringify(totalIncomePerTurn));

    for (i = 0; i < totalMoneyPerTurn.length; i++) {
        for (j = 0; j < totalMoneyPerTurn[i].length - 1; j++) {
            totalMoneyPerTurn[i][j + 1] = totalMoneyPerTurn[i][j] + totalIncomePerTurn[i][j + 1];
        }
    }

    // And sum the vehicles sold to make the cumulative lines
    var vehiclesSoldCumulative = [];
    for (i = 0; i < vehiclesSoldPerTurn.length; i++) {
        vehiclesSoldCumulative.push([]);
        for (j = 0; j < vehiclesSoldPerTurn[i].length; j++) {
            vehiclesSoldCumulative[i].push([]);
            var soldSoFar = 0;
            for (k = 0; k < vehiclesSoldPerTurn[i][j].length; k++) {
                soldSoFar += vehiclesSoldPerTurn[i][j][k];
                vehiclesSoldCumulative[i][j].push(soldSoFar);
            }
        }
    }

    // The innovation level of each tech track on each turn. A track only has a level while it is off the board,
    // so the other turns are left empty for the line to break
    var innovationPerTrack = [];
    for (i = 0; i < TTnamesFromColour.length; i++) innovationPerTrack.push([null]);

    for (i = 0; i < M.logs.length; i++) {
        if (M.logs[i].action !== Log.ADVANCE_EXPECTATIONS || M.logs[i].param == undefined) continue;
        var innovationLevels = M.logs[i].param[2];
        if (!Array.isArray(innovationLevels)) continue;
        for (j = 0; j < innovationPerTrack.length; j++) innovationPerTrack[j].push(null);
        for (j = 0; j < innovationLevels.length; j++) {
            var trackColour = innovationLevels[j][1];
            if (innovationPerTrack[trackColour] == undefined) continue;
            innovationPerTrack[trackColour][innovationPerTrack[trackColour].length - 1] = innovationLevels[j][0];
        }
    }

    var text_turn = gettext("Turn");
    var text_turnIncome = gettext("Turn Income");
    var text_TotalMoney = gettext("Total Money");

    var text_TotalMoneyTitle = gettext("Total Money VS Turn");
    var text_TotalIncomeTitle = gettext("Income On Each Turn");

    var xValues = [];
    for (i = 0; i < totalMoneyPerTurn[0].length; i++) xValues.push(i);

    function playerSeries(dataPerPlayer) {
        var series = [];
        for (var playerIndex = 0; playerIndex < dataPerPlayer.length; playerIndex++) {
            series.push({
                label: M.players[playerIndex].name,
                colour: getPlayerHexColourFromNumber(getCorrectedColour(M.players[playerIndex].colour)),
                data: [...dataPerPlayer[playerIndex]],
            });
        }
        return series;
    }

    function addLineChart(canvasID, chartTitle, yAxisLabel, series) {
        var lineChartData = {
            type: "line",
            data: {
                labels: xValues,
                datasets: []
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: text_turn,
                            font: {
                                // family: 'Comic Sans MS',
                                size: 20,
                                weight: 'bold',
                                lineHeight: 1.2,
                            },
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                        },
                        title: {
                            display: true,
                            text: yAxisLabel,
                            font: {
                                //family: 'Comic Sans MS',
                                size: 20,
                                weight: 'bold',
                                lineHeight: 1.2,
                            },
                        }
                    },

                },
                plugins: {
                    legend: {
                        labels: {
                            //usePointStyle: true,
                            boxHeight: 2,
                        },
                    },
                    subtitle: {
                        display: true,
                        text: chartTitle,
                        color: '#000000',
                        font: {
                            size: 25
                        }
                    }
                }

            }
        };

        for (var seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
            lineChartData.data.datasets.push({
                data: series[seriesIndex].data,
                borderColor: series[seriesIndex].colour,
                fill: false, // fillsunderneath
                lineTension: 0,
                label: series[seriesIndex].label,
            });
        }

        new Chart(canvasID, lineChartData);
    }

    addLineChart("gameMoneySummary", text_TotalMoneyTitle, text_TotalMoney, playerSeries(totalMoneyPerTurn));

    addLineChart("gameIncomeSummary", text_TotalIncomeTitle, text_turnIncome, playerSeries(totalIncomePerTurn));

    var vehicleNames = [gettext("Cars"), gettext("Trucks"), gettext("Sports Cars")];
    var vehicleCanvasNames = ["Cars", "Trucks", "Sports"];

    for (i = 0; i < vehicleNames.length; i++) {
        var soldPerTurn = [];
        var soldCumulative = [];
        for (j = 0; j < M.players.length; j++) {
            soldPerTurn.push(vehiclesSoldPerTurn[j][i]);
            soldCumulative.push(vehiclesSoldCumulative[j][i]);
        }

        addLineChart(
            "game" + vehicleCanvasNames[i] + "SoldSummary",
            interpolate(gettext("%(vehicle)s Sold Per Turn"), { vehicle: vehicleNames[i] }, true),
            interpolate(gettext("%(vehicle)s Sold"), { vehicle: vehicleNames[i] }, true),
            playerSeries(soldPerTurn)
        );

        addLineChart(
            "game" + vehicleCanvasNames[i] + "CumulativeSummary",
            interpolate(gettext("Cumulative %(vehicle)s Sold"), { vehicle: vehicleNames[i] }, true),
            interpolate(gettext("%(vehicle)s Sold"), { vehicle: vehicleNames[i] }, true),
            playerSeries(soldCumulative)
        );
    }

    var innovationSeries = [];
    for (i = 0; i < innovationPerTrack.length; i++) {
        innovationSeries.push({
            label: TTnamesFromColour[i],
            colour: getPlayerHexColourFromNumber(i),
            data: innovationPerTrack[i],
        });
    }

    addLineChart("gameInnovationSummary", gettext("Innovation Levels"), gettext("Innovation Level"), innovationSeries);

} // end init
