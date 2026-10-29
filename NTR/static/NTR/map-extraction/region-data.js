window.NTR_REGION = {
  "version": 1,
  "id": "kritschen-39-pilot",
  "title": "Kritschen 39 / Bessières 53",
  "description": "Kritschen 39 and selected Bessières markers in locale 53. Penalty dimensions are stored in their own unrotated axes. The reserve anchor is an added placement aid, not a printed mark.",
  "source": {
    "image": "../images/map.jpg",
    "size": [
      5100,
      6600
    ],
    "sha256": "a1f096efb4c05e50c1bb54b6d4bb92f9c1f23294682f51c4dab9b23e3092c437"
  },
  "region": [
    1080,
    1600,
    2010,
    2240
  ],
  "numbered_reference": "reference-numbered.png",
  "locale_ids": [
    "38",
    "39",
    "40",
    "53"
  ],
  "coverage": {
    "symbols": "Twelve penalty glyphs around locale 39 and its capacity; selected locale 53 markers.",
    "geometry": "Draft locale polygon and approach geometry. Approaches carry explicit one/two-piece frontage independently of measured bar thickness. Nine road traces cover the visible pilot rectangle, with shared vertices at nine forks/crossings.",
    "remaining": "Full locale 53 perimeter, final approach fits, landscape and neighbouring locales. Road continuation outside the pilot rectangle is not extracted; crossing connectivity is inferred from continuous ink."
  },
  "features": [
    {
      "id": "locale-39",
      "type": "locale",
      "label": "39 · Kritschen",
      "geometry": {
        "points": [
          [
            1248,
            1725
          ],
          [
            1550,
            1720
          ],
          [
            1177,
            2075
          ]
        ]
      },
      "properties": {
        "locale_id": "39",
        "capacity": 4,
        "note": "Draft inferred polygon; broad approach bars do not meet at corners. Vertices need review."
      },
      "status": "draft"
    },
    {
      "id": "a-39-40",
      "type": "approach",
      "label": "a-39-40",
      "geometry": {
        "points": [
          [
            1268,
            1715
          ],
          [
            1495,
            1715
          ]
        ],
        "stroke_width": 24
      },
      "properties": {
        "locales": [
          "39",
          "40"
        ],
        "width_class": "narrow",
        "note": "Frontage class and fitted endpoints remain draft until checked against the source. Stroke thickness is measured separately from frontage length.",
        "width_units": 1,
        "frontage_review": "draft"
      },
      "status": "draft",
      "source_bounds": [
        1258,
        1698,
        1508,
        1734
      ],
      "crop": "crops/a-39-40.png"
    },
    {
      "id": "a-38-39",
      "type": "approach",
      "label": "a-38-39",
      "geometry": {
        "points": [
          [
            1231,
            1789
          ],
          [
            1231,
            1953
          ]
        ],
        "stroke_width": 24
      },
      "properties": {
        "locales": [
          "38",
          "39"
        ],
        "width_class": "narrow",
        "note": "Frontage class and fitted endpoints remain draft until checked against the source. Stroke thickness is measured separately from frontage length.",
        "width_units": 1,
        "frontage_review": "draft"
      },
      "status": "draft",
      "source_bounds": [
        1210,
        1778,
        1252,
        1965
      ],
      "crop": "crops/a-38-39.png"
    },
    {
      "id": "a-39-53",
      "type": "approach",
      "label": "a-39-53",
      "geometry": {
        "points": [
          [
            1302,
            1961
          ],
          [
            1513,
            1750
          ]
        ],
        "stroke_width": 24
      },
      "properties": {
        "locales": [
          "39",
          "53"
        ],
        "width_class": "wide",
        "note": "Frontage class and fitted endpoints remain draft until checked against the source. Stroke thickness is measured separately from frontage length.",
        "width_units": 2,
        "frontage_review": "draft"
      },
      "status": "draft",
      "source_bounds": [
        1280,
        1730,
        1534,
        1983
      ],
      "crop": "crops/a-39-53.png"
    },
    {
      "id": "p-40-artillery",
      "type": "penalty",
      "label": "Artillery → 40",
      "geometry": {
        "x": 1352.5,
        "y": 1692.0,
        "width": 29,
        "height": 14.5,
        "angle": 0
      },
      "properties": {
        "penalty": "artillery",
        "approach_id": "a-39-40",
        "enters_locale_id": "40",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1337,
        1683,
        1368,
        1701
      ],
      "crop": "crops/p-40-artillery.png"
    },
    {
      "id": "p-40-cavalry",
      "type": "penalty",
      "label": "Cavalry → 40",
      "geometry": {
        "x": 1390.0,
        "y": 1691.5,
        "width": 29,
        "height": 14.5,
        "angle": 0
      },
      "properties": {
        "penalty": "cavalry",
        "approach_id": "a-39-40",
        "enters_locale_id": "40",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1374,
        1682,
        1406,
        1701
      ],
      "crop": "crops/p-40-cavalry.png"
    },
    {
      "id": "p-39-n-obstructed",
      "type": "penalty",
      "label": "Obstructed → 39",
      "geometry": {
        "x": 1352.5,
        "y": 1739.0,
        "width": 37,
        "height": 4.5,
        "angle": -15
      },
      "properties": {
        "penalty": "obstructed",
        "approach_id": "a-39-40",
        "enters_locale_id": "39",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1334,
        1731,
        1371,
        1747
      ],
      "crop": "crops/p-39-n-obstructed.png"
    },
    {
      "id": "p-39-n-artillery",
      "type": "penalty",
      "label": "Artillery → 39",
      "geometry": {
        "x": 1389.0,
        "y": 1740.5,
        "width": 29,
        "height": 14.5,
        "angle": 0
      },
      "properties": {
        "penalty": "artillery",
        "approach_id": "a-39-40",
        "enters_locale_id": "39",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1373,
        1731,
        1405,
        1750
      ],
      "crop": "crops/p-39-n-artillery.png"
    },
    {
      "id": "p-38-obstructed",
      "type": "penalty",
      "label": "Obstructed → 38",
      "geometry": {
        "x": 1215.5,
        "y": 1852.0,
        "width": 37,
        "height": 4.5,
        "angle": 75
      },
      "properties": {
        "penalty": "obstructed",
        "approach_id": "a-38-39",
        "enters_locale_id": "38",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1205,
        1830,
        1226,
        1874
      ],
      "crop": "crops/p-38-obstructed.png"
    },
    {
      "id": "p-38-artillery",
      "type": "penalty",
      "label": "Artillery → 38",
      "geometry": {
        "x": 1214.0,
        "y": 1889.0,
        "width": 29,
        "height": 14.5,
        "angle": 90
      },
      "properties": {
        "penalty": "artillery",
        "approach_id": "a-38-39",
        "enters_locale_id": "38",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1204,
        1874,
        1224,
        1904
      ],
      "crop": "crops/p-38-artillery.png"
    },
    {
      "id": "p-39-w-artillery",
      "type": "penalty",
      "label": "Artillery → 39",
      "geometry": {
        "x": 1264.5,
        "y": 1850.0,
        "width": 29,
        "height": 14.5,
        "angle": 90
      },
      "properties": {
        "penalty": "artillery",
        "approach_id": "a-38-39",
        "enters_locale_id": "39",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1253,
        1833,
        1276,
        1867
      ],
      "crop": "crops/p-39-w-artillery.png"
    },
    {
      "id": "p-39-w-obstructed",
      "type": "penalty",
      "label": "Obstructed → 39",
      "geometry": {
        "x": 1263.0,
        "y": 1890.0,
        "width": 37,
        "height": 4.5,
        "angle": 75
      },
      "properties": {
        "penalty": "obstructed",
        "approach_id": "a-38-39",
        "enters_locale_id": "39",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1252,
        1870,
        1274,
        1910
      ],
      "crop": "crops/p-39-w-obstructed.png"
    },
    {
      "id": "p-39-e-artillery",
      "type": "penalty",
      "label": "Artillery → 39",
      "geometry": {
        "x": 1361.5,
        "y": 1869,
        "width": 29,
        "height": 14.5,
        "angle": -45
      },
      "properties": {
        "penalty": "artillery",
        "approach_id": "a-39-53",
        "enters_locale_id": "39",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1341,
        1851,
        1380,
        1891
      ],
      "crop": "crops/p-39-e-artillery.png"
    },
    {
      "id": "p-39-e-obstructed",
      "type": "penalty",
      "label": "Obstructed → 39",
      "geometry": {
        "x": 1387,
        "y": 1847.5,
        "width": 37,
        "height": 4.5,
        "angle": -60
      },
      "properties": {
        "penalty": "obstructed",
        "approach_id": "a-39-53",
        "enters_locale_id": "39",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1373,
        1827,
        1399,
        1865
      ],
      "crop": "crops/p-39-e-obstructed.png"
    },
    {
      "id": "p-53-artillery",
      "type": "penalty",
      "label": "Artillery → 53",
      "geometry": {
        "x": 1418.5,
        "y": 1883.0,
        "width": 29,
        "height": 14.5,
        "angle": -45
      },
      "properties": {
        "penalty": "artillery",
        "approach_id": "a-39-53",
        "enters_locale_id": "53",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1400,
        1864,
        1437,
        1902
      ],
      "crop": "crops/p-53-artillery.png"
    },
    {
      "id": "p-53-cavalry",
      "type": "penalty",
      "label": "Cavalry → 53",
      "geometry": {
        "x": 1394.5,
        "y": 1904,
        "width": 29,
        "height": 14.5,
        "angle": -45
      },
      "properties": {
        "penalty": "cavalry",
        "approach_id": "a-39-53",
        "enters_locale_id": "53",
        "evidence": "Board image; §4 p. 3 for side association, §11 for effects."
      },
      "status": "reviewed",
      "source_bounds": [
        1378,
        1887,
        1418,
        1928
      ],
      "crop": "crops/p-53-cavalry.png"
    },
    {
      "id": "capacity-39",
      "type": "capacity",
      "label": "Capacity 4 · locale 39",
      "geometry": {
        "x": 1304.0,
        "y": 1847.0,
        "width": 28,
        "height": 28,
        "angle": 0
      },
      "properties": {
        "locale_id": "39",
        "value": 4
      },
      "status": "reviewed",
      "source_bounds": [
        1290,
        1833,
        1318,
        1861
      ],
      "crop": "crops/capacity-39.png"
    },
    {
      "id": "capacity-53",
      "type": "capacity",
      "label": "Capacity 20 · locale 53",
      "geometry": {
        "x": 1600.0,
        "y": 1974.0,
        "width": 30,
        "height": 28,
        "angle": 0
      },
      "properties": {
        "locale_id": "53",
        "value": 20
      },
      "status": "reviewed",
      "source_bounds": [
        1585,
        1960,
        1615,
        1988
      ],
      "crop": "crops/capacity-53.png"
    },
    {
      "id": "hill-53",
      "type": "hill",
      "label": "Hill 287 · locale 53",
      "geometry": {
        "x": 1600.0,
        "y": 1946.0,
        "width": 30,
        "height": 24,
        "angle": 0
      },
      "properties": {
        "locale_id": "53",
        "elevation": 287
      },
      "status": "reviewed",
      "source_bounds": [
        1585,
        1934,
        1615,
        1958
      ],
      "crop": "crops/hill-53.png"
    },
    {
      "id": "objective-53",
      "type": "objective",
      "label": "Blue objective · locale 53",
      "geometry": {
        "x": 1629.5,
        "y": 2007.5,
        "width": 41,
        "height": 41,
        "angle": 0
      },
      "properties": {
        "locale_id": "53",
        "colour": "blue"
      },
      "status": "reviewed",
      "source_bounds": [
        1609,
        1987,
        1650,
        2028
      ],
      "crop": "crops/objective-53.png"
    },
    {
      "id": "setup-bessieres",
      "type": "setup",
      "label": "Bessières · 4 units",
      "geometry": {
        "x": 1744.0,
        "y": 1945.0,
        "width": 62,
        "height": 60,
        "angle": 0
      },
      "properties": {
        "locale_id": "53",
        "side": "French",
        "commander": "Bessières",
        "unit_count": 4,
        "count_evidence": "User clarification: setup bar count equals unit count."
      },
      "status": "reviewed",
      "source_bounds": [
        1713,
        1915,
        1775,
        1975
      ],
      "crop": "crops/setup-bessieres.png"
    },
    {
      "id": "road-main-53",
      "type": "road",
      "label": "Main road · region segment",
      "geometry": {
        "points": [
          [
            1080,
            2117.5
          ],
          [
            1083,
            2117.0
          ],
          [
            1086,
            2116.0
          ],
          [
            1089,
            2116.0
          ],
          [
            1092,
            2115.0
          ],
          [
            1095,
            2115.0
          ],
          [
            1098,
            2114.0
          ],
          [
            1101,
            2113.5
          ],
          [
            1104,
            2113.0
          ],
          [
            1107,
            2112.0
          ],
          [
            1110,
            2112.0
          ],
          [
            1113,
            2111.0
          ],
          [
            1116,
            2110.5
          ],
          [
            1119,
            2110.0
          ],
          [
            1122,
            2109.0
          ],
          [
            1125,
            2108.5
          ],
          [
            1128,
            2108.0
          ],
          [
            1131,
            2107.5
          ],
          [
            1134,
            2107.0
          ],
          [
            1137,
            2106.0
          ],
          [
            1140,
            2106.0
          ],
          [
            1143,
            2105.5
          ],
          [
            1146,
            2104.5
          ],
          [
            1149,
            2104.0
          ],
          [
            1153,
            2103.0
          ],
          [
            1155,
            2103.0
          ],
          [
            1158,
            2102.0
          ],
          [
            1161,
            2101.5
          ],
          [
            1164,
            2101.0
          ],
          [
            1167,
            2100.0
          ],
          [
            1170,
            2100.0
          ],
          [
            1173,
            2099.0
          ],
          [
            1176,
            2098.5
          ],
          [
            1179,
            2098.0
          ],
          [
            1182,
            2097.5
          ],
          [
            1185,
            2097.0
          ],
          [
            1188,
            2096.0
          ],
          [
            1191,
            2096.0
          ],
          [
            1194,
            2095.0
          ],
          [
            1197,
            2094.5
          ],
          [
            1200,
            2093.5
          ],
          [
            1203,
            2093.5
          ],
          [
            1206,
            2092.5
          ],
          [
            1209,
            2092.0
          ],
          [
            1212,
            2091.0
          ],
          [
            1215,
            2091.0
          ],
          [
            1218,
            2090.0
          ],
          [
            1221,
            2089.5
          ],
          [
            1224,
            2089.0
          ],
          [
            1227,
            2088.0
          ],
          [
            1230,
            2088.0
          ],
          [
            1233,
            2087.0
          ],
          [
            1236,
            2087.0
          ],
          [
            1239,
            2086.0
          ],
          [
            1242,
            2085.5
          ],
          [
            1245,
            2084.5
          ],
          [
            1248,
            2084.0
          ],
          [
            1251,
            2083.5
          ],
          [
            1254,
            2083.0
          ],
          [
            1257,
            2082.0
          ],
          [
            1260,
            2082.0
          ],
          [
            1263,
            2081.0
          ],
          [
            1266,
            2080.5
          ],
          [
            1269,
            2080.0
          ],
          [
            1272,
            2079.0
          ],
          [
            1275,
            2078.5
          ],
          [
            1278,
            2078.0
          ],
          [
            1281,
            2077.5
          ],
          [
            1284,
            2077.0
          ],
          [
            1287,
            2076.0
          ],
          [
            1290,
            2075.5
          ],
          [
            1293,
            2075.0
          ],
          [
            1296,
            2074.5
          ],
          [
            1299,
            2074.5
          ],
          [
            1302,
            2074.0
          ],
          [
            1305,
            2074.0
          ],
          [
            1308,
            2074.0
          ],
          [
            1311,
            2074.0
          ],
          [
            1314,
            2074.0
          ],
          [
            1317,
            2074.5
          ],
          [
            1320,
            2075.0
          ],
          [
            1323,
            2076.0
          ],
          [
            1326,
            2077.0
          ],
          [
            1329,
            2078.5
          ],
          [
            1332,
            2081.0
          ],
          [
            1335,
            2083.0
          ],
          [
            1338,
            2087.5
          ],
          [
            1341,
            2090.5
          ],
          [
            1344,
            2094.0
          ],
          [
            1347,
            2096.5
          ],
          [
            1350,
            2098.0
          ],
          [
            1353,
            2099.0
          ],
          [
            1356,
            2099.5
          ],
          [
            1359,
            2100.0
          ],
          [
            1362,
            2100.0
          ],
          [
            1365,
            2100.0
          ],
          [
            1368,
            2099.5
          ],
          [
            1371,
            2099.5
          ],
          [
            1374,
            2099.5
          ],
          [
            1377,
            2098.5
          ],
          [
            1380,
            2098.0
          ],
          [
            1383,
            2098.0
          ],
          [
            1386,
            2097.0
          ],
          [
            1389,
            2096.5
          ],
          [
            1392,
            2095.5
          ],
          [
            1394,
            2095.5
          ],
          [
            1398,
            2094.0
          ],
          [
            1401,
            2093.5
          ],
          [
            1404,
            2093.0
          ],
          [
            1407,
            2092.0
          ],
          [
            1410,
            2091.0
          ],
          [
            1413,
            2090.0
          ],
          [
            1416,
            2089.0
          ],
          [
            1419,
            2088.5
          ],
          [
            1422,
            2087.5
          ],
          [
            1425,
            2086.5
          ],
          [
            1428,
            2085.5
          ],
          [
            1431,
            2085.0
          ],
          [
            1434,
            2084.0
          ],
          [
            1437,
            2083.0
          ],
          [
            1440,
            2082.0
          ],
          [
            1443,
            2081.0
          ],
          [
            1446,
            2080.0
          ],
          [
            1449,
            2079.0
          ],
          [
            1452,
            2078.0
          ],
          [
            1455,
            2077.0
          ],
          [
            1458,
            2076.0
          ],
          [
            1461,
            2075.0
          ],
          [
            1464,
            2074.5
          ],
          [
            1467,
            2074.0
          ],
          [
            1470,
            2073.0
          ],
          [
            1473,
            2072.0
          ],
          [
            1476,
            2071.0
          ],
          [
            1479,
            2071.0
          ],
          [
            1482,
            2069.5
          ],
          [
            1485,
            2069.0
          ],
          [
            1488,
            2068.0
          ],
          [
            1491,
            2067.5
          ],
          [
            1494,
            2067.0
          ],
          [
            1497,
            2066.0
          ],
          [
            1500,
            2065.0
          ],
          [
            1503,
            2064.0
          ],
          [
            1506,
            2063.5
          ],
          [
            1509,
            2062.5
          ],
          [
            1512,
            2061.5
          ],
          [
            1515,
            2061.0
          ],
          [
            1518,
            2060.0
          ],
          [
            1521,
            2059.5
          ],
          [
            1524,
            2059.0
          ],
          [
            1527,
            2057.5
          ],
          [
            1530,
            2057.5
          ],
          [
            1533,
            2056.5
          ],
          [
            1536,
            2055.5
          ],
          [
            1539,
            2055.0
          ],
          [
            1542,
            2054.0
          ],
          [
            1545,
            2053.5
          ],
          [
            1548,
            2053.0
          ],
          [
            1551,
            2052.0
          ],
          [
            1554,
            2051.0
          ],
          [
            1557,
            2050.0
          ],
          [
            1560,
            2050.0
          ],
          [
            1563,
            2049.0
          ],
          [
            1566,
            2048.0
          ],
          [
            1569,
            2047.5
          ],
          [
            1572,
            2046.5
          ],
          [
            1575,
            2046.0
          ],
          [
            1578,
            2045.0
          ],
          [
            1581,
            2044.0
          ],
          [
            1584,
            2043.5
          ],
          [
            1587,
            2043.0
          ],
          [
            1590,
            2042.0
          ],
          [
            1593,
            2041.5
          ],
          [
            1596,
            2040.0
          ],
          [
            1599,
            2040.0
          ],
          [
            1602,
            2039.5
          ],
          [
            1605,
            2037.5
          ],
          [
            1607.5,
            2037.1
          ],
          [
            1611,
            2037.0
          ],
          [
            1614,
            2036.0
          ],
          [
            1617,
            2035.0
          ],
          [
            1620,
            2034.0
          ],
          [
            1623,
            2034.0
          ],
          [
            1626,
            2033.0
          ],
          [
            1629,
            2032.0
          ],
          [
            1632,
            2031.0
          ],
          [
            1635,
            2031.0
          ],
          [
            1638,
            2030.0
          ],
          [
            1641,
            2029.0
          ],
          [
            1644,
            2028.0
          ],
          [
            1647,
            2027.5
          ],
          [
            1650,
            2027.0
          ],
          [
            1653,
            2026.0
          ],
          [
            1656,
            2026.0
          ],
          [
            1659,
            2024.0
          ],
          [
            1662,
            2023.5
          ],
          [
            1665,
            2022.5
          ],
          [
            1668,
            2022.0
          ],
          [
            1671,
            2021.0
          ],
          [
            1674,
            2020.5
          ],
          [
            1677,
            2019.5
          ],
          [
            1680,
            2019.0
          ],
          [
            1683,
            2018.0
          ],
          [
            1686,
            2017.5
          ],
          [
            1689,
            2017.0
          ],
          [
            1692,
            2016.0
          ],
          [
            1695,
            2015.0
          ],
          [
            1698,
            2014.0
          ],
          [
            1701,
            2013.0
          ],
          [
            1704,
            2012.5
          ],
          [
            1707,
            2011.5
          ],
          [
            1710,
            2011.0
          ],
          [
            1713,
            2010.0
          ],
          [
            1716,
            2009.0
          ],
          [
            1719,
            2009.0
          ],
          [
            1722,
            2008.0
          ],
          [
            1725,
            2007.0
          ],
          [
            1728,
            2006.0
          ],
          [
            1731,
            2005.5
          ],
          [
            1734,
            2004.5
          ],
          [
            1737,
            2004.0
          ],
          [
            1740,
            2003.0
          ],
          [
            1743,
            2002.0
          ],
          [
            1746,
            2001.5
          ],
          [
            1749,
            2000.5
          ],
          [
            1752,
            1999.5
          ],
          [
            1755,
            1999.0
          ],
          [
            1758,
            1998.0
          ],
          [
            1761,
            1997.0
          ],
          [
            1764,
            1996.0
          ],
          [
            1767,
            1996.0
          ],
          [
            1770,
            1995.0
          ],
          [
            1773,
            1994.0
          ],
          [
            1776,
            1993.0
          ],
          [
            1779,
            1992.0
          ],
          [
            1782,
            1991.0
          ],
          [
            1785,
            1990.5
          ],
          [
            1788,
            1989.0
          ],
          [
            1791,
            1989.0
          ],
          [
            1794,
            1988.0
          ],
          [
            1797,
            1987.0
          ],
          [
            1800,
            1986.0
          ],
          [
            1803,
            1985.0
          ],
          [
            1806,
            1984.0
          ],
          [
            1809,
            1983.0
          ],
          [
            1812,
            1982.5
          ],
          [
            1815,
            1982.0
          ],
          [
            1818,
            1980.5
          ],
          [
            1821,
            1979.0
          ],
          [
            1824,
            1978.0
          ],
          [
            1827,
            1977.5
          ],
          [
            1829,
            1976.8
          ],
          [
            1833,
            1975.0
          ],
          [
            1836,
            1974.0
          ],
          [
            1839,
            1973.0
          ],
          [
            1842,
            1972.0
          ],
          [
            1845,
            1971.0
          ],
          [
            1848,
            1970.0
          ],
          [
            1851,
            1969.0
          ],
          [
            1854,
            1968.0
          ],
          [
            1857,
            1967.0
          ],
          [
            1860,
            1966.0
          ],
          [
            1863,
            1965.0
          ],
          [
            1866,
            1964.5
          ],
          [
            1869,
            1963.0
          ],
          [
            1872,
            1962.0
          ],
          [
            1875,
            1962.0
          ],
          [
            1878,
            1960.5
          ],
          [
            1881,
            1960.0
          ],
          [
            1884,
            1959.0
          ],
          [
            1887,
            1958.0
          ],
          [
            1890,
            1957.5
          ],
          [
            1893,
            1957.0
          ],
          [
            1896,
            1955.5
          ],
          [
            1899,
            1955.0
          ],
          [
            1902,
            1954.0
          ],
          [
            1905,
            1954.0
          ],
          [
            1908,
            1952.5
          ],
          [
            1911,
            1952.0
          ],
          [
            1914,
            1951.0
          ],
          [
            1917,
            1950.5
          ],
          [
            1920,
            1949.0
          ],
          [
            1923,
            1949.0
          ],
          [
            1926,
            1948.0
          ],
          [
            1929,
            1947.0
          ],
          [
            1932,
            1946.5
          ],
          [
            1935,
            1946.0
          ],
          [
            1938,
            1945.0
          ],
          [
            1941,
            1944.0
          ],
          [
            1944,
            1943.0
          ],
          [
            1947,
            1943.0
          ],
          [
            1950,
            1942.0
          ],
          [
            1953,
            1941.0
          ],
          [
            1956,
            1940.0
          ],
          [
            1959,
            1940.0
          ],
          [
            1962,
            1939.0
          ],
          [
            1965,
            1938.0
          ],
          [
            1968,
            1937.0
          ],
          [
            1971,
            1936.5
          ],
          [
            1974,
            1936.0
          ],
          [
            1977,
            1935.0
          ],
          [
            1980,
            1934.5
          ],
          [
            1983,
            1934.0
          ],
          [
            1986,
            1933.0
          ],
          [
            1989,
            1932.0
          ],
          [
            1992,
            1931.0
          ],
          [
            1995,
            1930.5
          ],
          [
            1998,
            1930.0
          ],
          [
            2001,
            1929.0
          ],
          [
            2004,
            1928.0
          ],
          [
            2007,
            1928.0
          ],
          [
            2010,
            1927.0
          ]
        ],
        "stroke_width": 3.8
      },
      "properties": {
        "road_class": "main",
        "note": "Red-ink centerline measured every three source pixels; segment clipped at region boundary. Network outside region not extracted.",
        "junction_ids": [
          "main-west",
          "main-central",
          "main-diagonal",
          "main-east"
        ],
        "locales": [
          "53"
        ]
      },
      "status": "reviewed",
      "source_bounds": [
        1080,
        1921,
        2010,
        2124
      ],
      "crop": "crops/road-main-53.png"
    },
    {
      "id": "road-local-kritschen",
      "type": "road",
      "label": "Local road · east branch",
      "geometry": {
        "points": [
          [
            1297.5,
            1760
          ],
          [
            1300.0,
            1762
          ],
          [
            1306.5,
            1764
          ],
          [
            1312.0,
            1766
          ],
          [
            1316.5,
            1768
          ],
          [
            1318.0,
            1770
          ],
          [
            1321.0,
            1772
          ],
          [
            1322.0,
            1774
          ],
          [
            1325.0,
            1776
          ],
          [
            1325.0,
            1778
          ],
          [
            1326.5,
            1780
          ],
          [
            1326.5,
            1782
          ],
          [
            1329.5,
            1784
          ],
          [
            1329.5,
            1786
          ],
          [
            1330.0,
            1788
          ],
          [
            1330.0,
            1790
          ],
          [
            1332.5,
            1792
          ],
          [
            1333.0,
            1794
          ],
          [
            1333.0,
            1796
          ],
          [
            1333.0,
            1798
          ],
          [
            1335.0,
            1800
          ],
          [
            1336.0,
            1802
          ],
          [
            1338.0,
            1804
          ],
          [
            1338.0,
            1806
          ],
          [
            1338.0,
            1808
          ],
          [
            1338.0,
            1810
          ],
          [
            1342.0,
            1812
          ],
          [
            1342.0,
            1814
          ],
          [
            1342.0,
            1816
          ],
          [
            1347.5,
            1818
          ],
          [
            1352.5,
            1820
          ],
          [
            1353.0,
            1822
          ],
          [
            1357.0,
            1824
          ],
          [
            1358.0,
            1826
          ],
          [
            1360.5,
            1828
          ],
          [
            1363.0,
            1830
          ],
          [
            1365.5,
            1832
          ],
          [
            1367.5,
            1834
          ],
          [
            1373.0,
            1836
          ],
          [
            1373.0,
            1838
          ],
          [
            1377.5,
            1840
          ],
          [
            1377.5,
            1842
          ],
          [
            1381.5,
            1844
          ],
          [
            1382.5,
            1846
          ],
          [
            1389.0,
            1848
          ],
          [
            1389.0,
            1850
          ],
          [
            1393.0,
            1852
          ],
          [
            1394.5,
            1854
          ],
          [
            1400.5,
            1856
          ],
          [
            1401.0,
            1858
          ],
          [
            1405.0,
            1860
          ],
          [
            1406.0,
            1862
          ],
          [
            1412.5,
            1864
          ],
          [
            1413.0,
            1866
          ],
          [
            1414.5,
            1868
          ],
          [
            1419.0,
            1870
          ],
          [
            1421.0,
            1872
          ],
          [
            1423.5,
            1874
          ],
          [
            1429.0,
            1876
          ],
          [
            1433.8,
            1878
          ],
          [
            1437.0,
            1880
          ],
          [
            1437.0,
            1882
          ],
          [
            1441.0,
            1884
          ],
          [
            1443.5,
            1886
          ],
          [
            1450.5,
            1888
          ],
          [
            1450.5,
            1890
          ],
          [
            1456.2,
            1892
          ],
          [
            1458.5,
            1894
          ],
          [
            1464.0,
            1896
          ],
          [
            1465.0,
            1898
          ],
          [
            1469.0,
            1900
          ],
          [
            1471.5,
            1902
          ],
          [
            1476.5,
            1904
          ],
          [
            1478.0,
            1906
          ],
          [
            1479.2,
            1908
          ],
          [
            1485.5,
            1910
          ],
          [
            1489.5,
            1912
          ],
          [
            1489.5,
            1914
          ],
          [
            1489.5,
            1916
          ],
          [
            1498.0,
            1918
          ],
          [
            1499.7,
            1920
          ],
          [
            1499.7,
            1922
          ],
          [
            1499.7,
            1924
          ],
          [
            1508.5,
            1926
          ],
          [
            1513.0,
            1928
          ],
          [
            1514.0,
            1930
          ],
          [
            1516.0,
            1932
          ],
          [
            1518.0,
            1934
          ],
          [
            1521.5,
            1936
          ],
          [
            1521.5,
            1938
          ],
          [
            1524.0,
            1940
          ],
          [
            1525.0,
            1942
          ],
          [
            1529.0,
            1944
          ],
          [
            1529.0,
            1946
          ],
          [
            1531.5,
            1948
          ],
          [
            1533.0,
            1950
          ],
          [
            1536.0,
            1952
          ],
          [
            1536.5,
            1954
          ],
          [
            1537.5,
            1956
          ],
          [
            1538.0,
            1958
          ],
          [
            1540.5,
            1960
          ],
          [
            1542.0,
            1962
          ],
          [
            1543.0,
            1964
          ],
          [
            1545.0,
            1966
          ],
          [
            1546.0,
            1968
          ],
          [
            1546.0,
            1970
          ],
          [
            1548.5,
            1972
          ],
          [
            1550.0,
            1974
          ],
          [
            1553.0,
            1976
          ],
          [
            1553.0,
            1978
          ],
          [
            1555.5,
            1980
          ],
          [
            1556.5,
            1982
          ],
          [
            1558.0,
            1984
          ],
          [
            1558.5,
            1986
          ],
          [
            1561.0,
            1988
          ],
          [
            1562.5,
            1990
          ],
          [
            1563.5,
            1992
          ],
          [
            1565.5,
            1994
          ],
          [
            1565.5,
            1996
          ],
          [
            1569.0,
            1998
          ],
          [
            1569.0,
            2000
          ],
          [
            1572.0,
            2002
          ],
          [
            1573.5,
            2004
          ],
          [
            1574.0,
            2006
          ],
          [
            1578.0,
            2008
          ],
          [
            1579.0,
            2010
          ],
          [
            1579.0,
            2012
          ],
          [
            1581.5,
            2014
          ],
          [
            1584.5,
            2016
          ],
          [
            1584.5,
            2018
          ],
          [
            1588.3,
            2020
          ],
          [
            1588.5,
            2022
          ],
          [
            1592.5,
            2024
          ],
          [
            1593.5,
            2026
          ],
          [
            1596.1,
            2028
          ],
          [
            1597.5,
            2030
          ],
          [
            1599.0,
            2032
          ],
          [
            1602.5,
            2034
          ],
          [
            1602.5,
            2036
          ],
          [
            1607.5,
            2037.1
          ],
          [
            1607.5,
            2040
          ],
          [
            1609.5,
            2042
          ],
          [
            1611.3,
            2044
          ],
          [
            1613.5,
            2046
          ],
          [
            1616.5,
            2048
          ],
          [
            1617.5,
            2050
          ],
          [
            1619.5,
            2052
          ],
          [
            1621.5,
            2054
          ],
          [
            1625.5,
            2056
          ],
          [
            1625.5,
            2058
          ],
          [
            1628.0,
            2060
          ],
          [
            1629.0,
            2062
          ],
          [
            1633.5,
            2064
          ],
          [
            1634.0,
            2066
          ],
          [
            1636.0,
            2068
          ],
          [
            1641.7,
            2070
          ],
          [
            1644.0,
            2072
          ],
          [
            1645.0,
            2074
          ],
          [
            1649.1,
            2076
          ],
          [
            1650.0,
            2078
          ],
          [
            1654.0,
            2080
          ],
          [
            1654.5,
            2082
          ],
          [
            1661.0,
            2084
          ],
          [
            1661.0,
            2086
          ],
          [
            1667.0,
            2088
          ],
          [
            1668.5,
            2090
          ],
          [
            1673.0,
            2092
          ],
          [
            1677.0,
            2094
          ],
          [
            1681.0,
            2096
          ],
          [
            1685.5,
            2098
          ],
          [
            1693.0,
            2100
          ],
          [
            1693.0,
            2102
          ],
          [
            1698.0,
            2104
          ],
          [
            1704.5,
            2106
          ],
          [
            1704.5,
            2108
          ],
          [
            1716.5,
            2110
          ],
          [
            1721.5,
            2112
          ],
          [
            1728.0,
            2114
          ],
          [
            1733.0,
            2116
          ],
          [
            1736.4,
            2118
          ],
          [
            1736.4,
            2120
          ],
          [
            1744.0,
            2122
          ],
          [
            1744.1,
            2124
          ],
          [
            1751.5,
            2126
          ],
          [
            1751.8,
            2128
          ],
          [
            1755.6,
            2130
          ],
          [
            1759.4,
            2132
          ],
          [
            1766.0,
            2134
          ],
          [
            1771.5,
            2136
          ],
          [
            1774.0,
            2138
          ],
          [
            1779.5,
            2140
          ],
          [
            1781.5,
            2142
          ],
          [
            1787.0,
            2144
          ],
          [
            1789.5,
            2146
          ],
          [
            1792.5,
            2148
          ],
          [
            1794.0,
            2150
          ],
          [
            1797.0,
            2152
          ],
          [
            1798.5,
            2154
          ],
          [
            1802.0,
            2156
          ],
          [
            1802.0,
            2158
          ],
          [
            1805,
            2158
          ],
          [
            1809.0,
            2162
          ],
          [
            1813.0,
            2164
          ],
          [
            1813.0,
            2166
          ],
          [
            1814.2,
            2168
          ],
          [
            1814.2,
            2170
          ],
          [
            1814.2,
            2172
          ],
          [
            1821.0,
            2174
          ],
          [
            1823.0,
            2176
          ],
          [
            1824.0,
            2178
          ],
          [
            1825.0,
            2180
          ],
          [
            1825.0,
            2182
          ],
          [
            1828.5,
            2184
          ],
          [
            1829.5,
            2186
          ],
          [
            1831.0,
            2188
          ],
          [
            1833.0,
            2190
          ],
          [
            1833.0,
            2192
          ],
          [
            1833.0,
            2194
          ],
          [
            1836.0,
            2196
          ],
          [
            1837.5,
            2198
          ],
          [
            1840.5,
            2200
          ],
          [
            1840.5,
            2202
          ],
          [
            1841.0,
            2204
          ],
          [
            1841.0,
            2206
          ],
          [
            1844.5,
            2208
          ],
          [
            1844.5,
            2210
          ],
          [
            1845.0,
            2212
          ],
          [
            1845.0,
            2214
          ],
          [
            1849.0,
            2216
          ],
          [
            1849.0,
            2218
          ],
          [
            1849.0,
            2220
          ],
          [
            1850.5,
            2222
          ],
          [
            1853.5,
            2224
          ],
          [
            1853.5,
            2226
          ],
          [
            1854.0,
            2228
          ],
          [
            1854.0,
            2230
          ],
          [
            1857.5,
            2232
          ],
          [
            1857.5,
            2234
          ],
          [
            1857.5,
            2236
          ],
          [
            1858.0,
            2238
          ],
          [
            1862.0,
            2240
          ]
        ],
        "stroke_width": 1.9
      },
      "properties": {
        "road_class": "local",
        "note": "Brown-ink centerline from Kritschen through the diagonal branch to the south boundary. Shared vertices identify forks and crossings.",
        "junction_ids": [
          "village",
          "village-fork",
          "main-diagonal",
          "southeast"
        ],
        "locales": [
          "39",
          "53"
        ],
        "approach_ids": [
          "a-39-53"
        ]
      },
      "status": "reviewed",
      "source_bounds": [
        1291,
        1754,
        1869,
        2240
      ],
      "crop": "crops/road-local-kritschen.png"
    },
    {
      "id": "road-local-north",
      "type": "road",
      "label": "Local road · northern edge",
      "geometry": {
        "points": [
          [
            1214,
            1600
          ],
          [
            1238,
            1610
          ],
          [
            1265,
            1618
          ],
          [
            1295,
            1624
          ],
          [
            1327,
            1626
          ],
          [
            1358,
            1626
          ],
          [
            1380,
            1622
          ],
          [
            1394,
            1615
          ],
          [
            1409,
            1600
          ]
        ],
        "stroke_width": 1.9
      },
      "properties": {
        "road_class": "local",
        "locales": [
          "40"
        ],
        "approach_ids": [],
        "note": "Manually traced brown-ink centerline; clipped at the pilot boundary. Continuity behind printed marks is inferred.",
        "junction_ids": [
          "north"
        ]
      },
      "status": "reviewed",
      "source_bounds": [
        1208,
        1600,
        1416,
        1633
      ],
      "crop": "crops/road-local-north.png"
    },
    {
      "id": "road-local-kritschen-north",
      "type": "road",
      "label": "Local road · north into Kritschen",
      "geometry": {
        "points": [
          [
            1327,
            1626
          ],
          [
            1320,
            1638
          ],
          [
            1316,
            1654
          ],
          [
            1316,
            1674
          ],
          [
            1312,
            1700
          ],
          [
            1310,
            1720
          ],
          [
            1305,
            1741
          ],
          [
            1297.5,
            1760
          ]
        ],
        "stroke_width": 1.9
      },
      "properties": {
        "road_class": "local",
        "locales": [
          "40",
          "39"
        ],
        "approach_ids": [
          "a-39-40"
        ],
        "note": "Manually traced brown-ink centerline; clipped at the pilot boundary. Continuity behind printed marks is inferred.",
        "junction_ids": [
          "village",
          "north"
        ]
      },
      "status": "reviewed",
      "source_bounds": [
        1291,
        1620,
        1334,
        1767
      ],
      "crop": "crops/road-local-kritschen-north.png"
    },
    {
      "id": "road-local-kritschen-west",
      "type": "road",
      "label": "Local road · west into Kritschen",
      "geometry": {
        "points": [
          [
            1080,
            1781
          ],
          [
            1085,
            1780.2
          ],
          [
            1110,
            1776
          ],
          [
            1140,
            1772
          ],
          [
            1175,
            1768
          ],
          [
            1210,
            1768
          ],
          [
            1240,
            1765
          ],
          [
            1270,
            1762
          ],
          [
            1297.5,
            1760
          ]
        ],
        "stroke_width": 1.9
      },
      "properties": {
        "road_class": "local",
        "locales": [
          "38",
          "39"
        ],
        "approach_ids": [
          "a-38-39"
        ],
        "note": "Manually traced brown-ink centerline; clipped at the pilot boundary. Continuity behind printed marks is inferred.",
        "junction_ids": [
          "village",
          "west-edge"
        ]
      },
      "status": "reviewed",
      "source_bounds": [
        1080,
        1754,
        1304,
        1788
      ],
      "crop": "crops/road-local-kritschen-west.png"
    },
    {
      "id": "road-local-kritschen-south",
      "type": "road",
      "label": "Local road · south from village fork",
      "geometry": {
        "points": [
          [
            1342,
            1816
          ],
          [
            1348,
            1838
          ],
          [
            1351,
            1860
          ],
          [
            1351,
            1886
          ],
          [
            1347,
            1910
          ],
          [
            1345,
            1936
          ],
          [
            1348,
            1956
          ],
          [
            1356,
            1981
          ],
          [
            1367,
            2009
          ],
          [
            1375,
            2034
          ],
          [
            1378,
            2057
          ],
          [
            1384,
            2077
          ],
          [
            1394,
            2095.5
          ],
          [
            1404,
            2111
          ],
          [
            1421,
            2130
          ],
          [
            1438,
            2156
          ],
          [
            1451,
            2184
          ],
          [
            1461,
            2211
          ],
          [
            1475,
            2232
          ],
          [
            1480,
            2240
          ]
        ],
        "stroke_width": 1.9
      },
      "properties": {
        "road_class": "local",
        "locales": [
          "39",
          "53"
        ],
        "approach_ids": [],
        "note": "Manually traced brown-ink centerline; clipped at the pilot boundary. Continuity behind printed marks is inferred.",
        "junction_ids": [
          "village-fork",
          "main-central"
        ]
      },
      "status": "reviewed",
      "source_bounds": [
        1336,
        1810,
        1487,
        2240
      ],
      "crop": "crops/road-local-kritschen-south.png"
    },
    {
      "id": "road-local-east",
      "type": "road",
      "label": "Local road · eastern curve",
      "geometry": {
        "points": [
          [
            1762,
            1600
          ],
          [
            1772,
            1627
          ],
          [
            1780,
            1655
          ],
          [
            1784,
            1684
          ],
          [
            1784,
            1714
          ],
          [
            1781,
            1745
          ],
          [
            1780,
            1774
          ],
          [
            1782,
            1802
          ],
          [
            1788,
            1830
          ],
          [
            1794,
            1855
          ],
          [
            1799,
            1881
          ],
          [
            1805,
            1912
          ],
          [
            1811,
            1941
          ],
          [
            1820,
            1964
          ],
          [
            1829,
            1976.8
          ],
          [
            1840,
            2001
          ],
          [
            1850,
            2025
          ],
          [
            1855,
            2050
          ],
          [
            1855,
            2073
          ],
          [
            1851,
            2095
          ],
          [
            1842,
            2116
          ],
          [
            1832,
            2134
          ],
          [
            1819,
            2149
          ],
          [
            1805,
            2158
          ],
          [
            1782,
            2177
          ],
          [
            1757,
            2193
          ],
          [
            1731,
            2208
          ],
          [
            1704,
            2224
          ],
          [
            1675,
            2240
          ]
        ],
        "stroke_width": 1.9
      },
      "properties": {
        "road_class": "local",
        "locales": [
          "53"
        ],
        "approach_ids": [],
        "note": "Manually traced brown-ink centerline; clipped at the pilot boundary. Continuity behind printed marks is inferred.",
        "junction_ids": [
          "main-east",
          "southeast"
        ]
      },
      "status": "reviewed",
      "source_bounds": [
        1669,
        1600,
        1862,
        2240
      ],
      "crop": "crops/road-local-east.png"
    },
    {
      "id": "road-local-southwest",
      "type": "road",
      "label": "Local road · southwest edge",
      "geometry": {
        "points": [
          [
            1153,
            2103.0
          ],
          [
            1153,
            2114
          ],
          [
            1149,
            2133
          ],
          [
            1147,
            2156
          ],
          [
            1145,
            2179
          ],
          [
            1139,
            2204
          ],
          [
            1132,
            2226
          ],
          [
            1126,
            2240
          ]
        ],
        "stroke_width": 1.9
      },
      "properties": {
        "road_class": "local",
        "locales": [
          "38"
        ],
        "approach_ids": [],
        "note": "Manually traced brown-ink centerline; clipped at the pilot boundary. Continuity behind printed marks is inferred.",
        "junction_ids": [
          "main-west"
        ]
      },
      "status": "reviewed",
      "source_bounds": [
        1120,
        2097,
        1160,
        2240
      ],
      "crop": "crops/road-local-southwest.png"
    },
    {
      "id": "road-local-west-edge",
      "type": "road",
      "label": "Local road · west-edge spur",
      "geometry": {
        "points": [
          [
            1080,
            1772
          ],
          [
            1085,
            1780.2
          ]
        ],
        "stroke_width": 1.9
      },
      "properties": {
        "road_class": "local",
        "locales": [
          "38"
        ],
        "junction_ids": [
          "west-edge"
        ],
        "note": "Short visible brown-road spur entering at the west boundary."
      },
      "status": "reviewed",
      "source_bounds": [
        1080,
        1766,
        1092,
        1787
      ],
      "crop": "crops/road-local-west-edge.png"
    },
    {
      "id": "reserve-39",
      "type": "reserve",
      "label": "Reserve anchor · 39",
      "geometry": {
        "x": 1306,
        "y": 1810,
        "width": 12,
        "height": 12,
        "angle": 0
      },
      "properties": {
        "locale_id": "39",
        "note": "Suggested placement anchor, not a printed symbol."
      },
      "status": "draft"
    }
  ],
  "numbered_reference_source": {
    "file": "NTR/static/NTR/rules/NT_Annotated_Rules_v1.4.pdf",
    "page": 28,
    "embedded_image_object": 199,
    "note": "Native embedded image; used for locale IDs, not yet registered as a source overlay."
  },
  "seed_revision": 3,
  "road_junctions": [
    {
      "id": "village",
      "point": [
        1297.5,
        1760
      ],
      "road_ids": [
        "road-local-kritschen",
        "road-local-kritschen-north",
        "road-local-kritschen-west"
      ],
      "note": "Continuous printed roads; connection inferred at crossings without a printed gap."
    },
    {
      "id": "north",
      "point": [
        1327,
        1626
      ],
      "road_ids": [
        "road-local-north",
        "road-local-kritschen-north"
      ],
      "note": "Continuous printed roads; connection inferred at crossings without a printed gap."
    },
    {
      "id": "village-fork",
      "point": [
        1342,
        1816
      ],
      "road_ids": [
        "road-local-kritschen",
        "road-local-kritschen-south"
      ],
      "note": "Continuous printed roads; connection inferred at crossings without a printed gap."
    },
    {
      "id": "main-west",
      "point": [
        1153,
        2103.0
      ],
      "road_ids": [
        "road-main-53",
        "road-local-southwest"
      ],
      "note": "Continuous printed roads; connection inferred at crossings without a printed gap."
    },
    {
      "id": "main-central",
      "point": [
        1394,
        2095.5
      ],
      "road_ids": [
        "road-main-53",
        "road-local-kritschen-south"
      ],
      "note": "Continuous printed roads; connection inferred at crossings without a printed gap."
    },
    {
      "id": "main-diagonal",
      "point": [
        1607.5,
        2037.1
      ],
      "road_ids": [
        "road-main-53",
        "road-local-kritschen"
      ],
      "note": "Continuous printed roads; connection inferred at crossings without a printed gap."
    },
    {
      "id": "main-east",
      "point": [
        1829,
        1976.8
      ],
      "road_ids": [
        "road-main-53",
        "road-local-east"
      ],
      "note": "Continuous printed roads; connection inferred at crossings without a printed gap."
    },
    {
      "id": "southeast",
      "point": [
        1805,
        2158
      ],
      "road_ids": [
        "road-local-kritschen",
        "road-local-east"
      ],
      "note": "Continuous printed roads; connection inferred at crossings without a printed gap."
    },
    {
      "id": "west-edge",
      "point": [
        1085,
        1780.2
      ],
      "road_ids": [
        "road-local-kritschen-west",
        "road-local-west-edge"
      ],
      "note": "Visible brown-road fork at the west boundary."
    }
  ]
};
