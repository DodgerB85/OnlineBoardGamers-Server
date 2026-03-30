function initHLCgameSummary() {
    var allSellingSummaries = [];
    var i = 0;
    var j = 0;

    for (i = 0; i < M.logs.length; i++) {
        if (M.logs[i].action === Log.SALES_SUMMARY) allSellingSummaries.push(M.logs[i].param);
    }

    // Now collect the number of cars / sports / trucks sold by each player, and a grand total

    var totalIncomePerTurn = [];
    for (i = 0; i < M.players.length; i++) totalIncomePerTurn.push([]);

    for (i = 0; i < allSellingSummaries.length; i++) {
        for (j = 0; j < allSellingSummaries[i].length; j++) {
            totalIncomePerTurn[j].push(allSellingSummaries[i][j][3]);
        }
    }
    for (i = 0; i < totalIncomePerTurn.length; i++) totalIncomePerTurn[i].unshift(0);


    // Now sum to make it total money
    var totalMoneyPerTurn = JSON.parse(JSON.stringify(totalIncomePerTurn));

    //alert(JSON.stringify(totalMoneyPerTurn, null, 4));

    for (i = 0; i < totalMoneyPerTurn.length; i++) {
        for (j = 0; j < totalMoneyPerTurn[i].length-1; j++) {
            totalMoneyPerTurn[i][j+1] = totalMoneyPerTurn[i][j] + totalIncomePerTurn[i][j + 1];
        }
    }

    //alert(JSON.stringify(totalMoneyPerTurn, null, 4));

    //alert(JSON.stringify(totalMoneyPerTurn, null, 4));
    var text_turn = gettext("Turn");
    var text_turnIncome = gettext("Turn Income");
    var text_TotalMoney = gettext("Total Money");

    var text_TotalMoneyTitle = gettext("Total Money VS Turn");
    var text_TotalIncomeTitle = gettext("Income On Each Turn");
    

    var xValues = [];
    for (i = 0; i < totalMoneyPerTurn[0].length; i++) xValues.push(i);

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
                    title: {
                        display: true,
                        text: text_TotalMoney,
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
                    text: text_TotalMoneyTitle,
                    color: '#000000',
                    font: {
                        size: 25
                    }
                }
            }

        }

        /* ADD DATA ABOVE LINE POINT
        plugins: [{
            afterDatasetsDraw: function(chart) {
               var ctx = chart.ctx;
               chart.data.datasets.forEach(function(dataset, index) {
                  var datasetMeta = chart.getDatasetMeta(index);
                  if (datasetMeta.hidden) return;
                  datasetMeta.data.forEach(function(point, index) {
                     var value = dataset.data[index],
                         x = point.getCenterPoint().x,
                         y = point.getCenterPoint().y,
                         radius = point._model.radius,
                         fontSize = 14,
                         fontFamily = 'Verdana',
                         fontColor = 'black',
                         fontStyle = 'normal';
                     ctx.save();
                     ctx.textBaseline = 'middle';
                     ctx.textAlign = 'center';
                     ctx.font = fontStyle + ' ' + fontSize + 'px' + ' ' + fontFamily;
                     ctx.fillStyle = fontColor;
                     ctx.fillText(value, x, y - radius - fontSize);
                     ctx.restore();
                  });
               });
            }
         }]
         */

    };

    for (i = 0; i < totalMoneyPerTurn.length; i++) {
        var lineColourNum = getCorrectedColour(M.players[i].colour);
        var lineColour = getPlayerHexColourFromNumber(lineColourNum);

        lineChartData.data.datasets.push({
            data: [...totalMoneyPerTurn[i]],
            borderColor: lineColour,
            fill: false, // fillsunderneath
            lineTension: 0,
            label: M.players[i].name,
        });
    }

    new Chart("gameMoneySummary", lineChartData);

    var gameIncomeSummaryData = {
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
                    title: {
                        display: true,
                        text: text_turnIncome,
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
                    text: text_TotalIncomeTitle,
                    color: '#000000',
                    font: {
                        size: 25
                    }
                }
            }
        }
    };

    for (i = 0; i < totalIncomePerTurn.length; i++) {
        var lineColourNum = getCorrectedColour(M.players[i].colour);
        var lineColour = getPlayerHexColourFromNumber(lineColourNum);

        gameIncomeSummaryData.data.datasets.push({
            data: [...totalIncomePerTurn[i]],
            borderColor: lineColour,
            fill: false, // fillsunderneath
            lineTension: 0,
            label: M.players[i].name,
        });
    }


    new Chart("gameIncomeSummary", gameIncomeSummaryData);

} // end init