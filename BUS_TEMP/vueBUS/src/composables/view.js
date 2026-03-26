import { useModelStore } from '../stores/model.js'
import { usePersonalStore } from '../stores/personal.js'

export function getBuildingPos(junctionID, buildingSlot, outline) {
  const model = useModelStore()
  const personal = usePersonalStore()

  if (personal.selectedBoard === 0) {
    // Get pos for actual junctions
    if (buildingSlot === -1) {
      let shift = 0
      if (outline) shift = (model.refSize * -20) / 400
      if (junctionID === 0) return [shift + (model.refSize * 212) / 400, shift + (model.refSize * 315) / 400]
      if (junctionID === 1) return [shift + (model.refSize * 132) / 400, shift + (model.refSize * 899) / 400]
      if (junctionID === 2) return [shift + (model.refSize * 306) / 400, shift + (model.refSize * 1728) / 400]
      if (junctionID === 3) return [shift + (model.refSize * 164) / 400, shift + (model.refSize * 2333) / 400]
      if (junctionID === 4) return [shift + (model.refSize * 345) / 400, shift + (model.refSize * 2830) / 400]
      if (junctionID === 5) return [shift + (model.refSize * 820) / 400, shift + (model.refSize * 293) / 400]
      if (junctionID === 6) return [shift + (model.refSize * 537) / 400, shift + (model.refSize * 569) / 400]
      if (junctionID === 7) return [shift + (model.refSize * 568) / 400, shift + (model.refSize * 1005) / 400]
      if (junctionID === 8) return [shift + (model.refSize * 673) / 400, shift + (model.refSize * 1428) / 400]
      if (junctionID === 9) return [shift + (model.refSize * 811) / 400, shift + (model.refSize * 1903) / 400]
      if (junctionID === 10) return [shift + (model.refSize * 728) / 400, shift + (model.refSize * 2411) / 400]
      if (junctionID === 11) return [shift + (model.refSize * 932) / 400, shift + (model.refSize * 2904) / 400]
      if (junctionID === 12) return [shift + (model.refSize * 1259) / 400, shift + (model.refSize * 506) / 400]
      if (junctionID === 13) return [shift + (model.refSize * 1069) / 400, shift + (model.refSize * 871) / 400]
      if (junctionID === 14) return [shift + (model.refSize * 1090) / 400, shift + (model.refSize * 1586) / 400]
      if (junctionID === 15) return [shift + (model.refSize * 1301) / 400, shift + (model.refSize * 1998) / 400]
      if (junctionID === 16) return [shift + (model.refSize * 1235) / 400, shift + (model.refSize * 2379) / 400]
      if (junctionID === 17) return [shift + (model.refSize * 1286) / 400, shift + (model.refSize * 2817) / 400]
      if (junctionID === 18) return [shift + (model.refSize * 1747) / 400, shift + (model.refSize * 327) / 400]
      if (junctionID === 19) return [shift + (model.refSize * 1709) / 400, shift + (model.refSize * 779) / 400]
      if (junctionID === 20) return [shift + (model.refSize * 1474) / 400, shift + (model.refSize * 1212) / 400]
      if (junctionID === 21) return [shift + (model.refSize * 1793) / 400, shift + (model.refSize * 1671) / 400]
      if (junctionID === 22) return [shift + (model.refSize * 1722) / 400, shift + (model.refSize * 2192) / 400]
      if (junctionID === 23) return [shift + (model.refSize * 1780) / 400, shift + (model.refSize * 2654) / 400]
      if (junctionID === 24) return [shift + (model.refSize * 2205) / 400, shift + (model.refSize * 164) / 400]
      if (junctionID === 25) return [shift + (model.refSize * 2198) / 400, shift + (model.refSize * 556) / 400]
      if (junctionID === 26) return [shift + (model.refSize * 2045) / 400, shift + (model.refSize * 1163) / 400]
      if (junctionID === 27) return [shift + (model.refSize * 2283) / 400, shift + (model.refSize * 1510) / 400]
      if (junctionID === 28) return [shift + (model.refSize * 2134) / 400, shift + (model.refSize * 2238) / 400]
      if (junctionID === 29) return [shift + (model.refSize * 2477) / 400, shift + (model.refSize * 228) / 400]
      if (junctionID === 30) return [shift + (model.refSize * 2679) / 400, shift + (model.refSize * 571) / 400]
      if (junctionID === 31) return [shift + (model.refSize * 2545) / 400, shift + (model.refSize * 1006) / 400]
      if (junctionID === 32) return [shift + (model.refSize * 2695) / 400, shift + (model.refSize * 1435) / 400]
      if (junctionID === 33) return [shift + (model.refSize * 2272) / 400, shift + (model.refSize * 1907) / 400]
      if (junctionID === 34) return [shift + (model.refSize * 2599) / 400, shift + (model.refSize * 2327) / 400]
      if (junctionID === 35) return [shift + (model.refSize * 2198) / 400, shift + (model.refSize * 2751) / 400]

      return [100, 100]
    }

    // Get pos for buildings, or highlight outline
    let shift = 0
    if (outline) shift = (model.refSize * -20) / 400
    if (junctionID === 0) return [shift + (model.refSize * 101) / 400, shift + (model.refSize * 208) / 400]
    if (junctionID === 1) return [shift + (model.refSize * 239) / 400, shift + (model.refSize * 810) / 400]
    if (junctionID === 2 && buildingSlot === 2) return [shift + (model.refSize * 180) / 400, shift + (model.refSize * 1809) / 400]
    if (junctionID === 2 && buildingSlot === 3) return [shift + (model.refSize * 478) / 400, shift + (model.refSize * 1716) / 400]
    if (junctionID === 3) return [shift + (model.refSize * 275) / 400, shift + (model.refSize * 2250) / 400]
    if (junctionID === 4) return [shift + (model.refSize * 251) / 400, shift + (model.refSize * 2948) / 400]
    if (junctionID === 5) return [shift + (model.refSize * 739) / 400, shift + (model.refSize * 162) / 400]
    if (junctionID === 6) return [shift + (model.refSize * 525) / 400, shift + (model.refSize * 415) / 400]
    if (junctionID === 7 && buildingSlot === 2) return [shift + (model.refSize * 468) / 400, shift + (model.refSize * 1094) / 400]
    if (junctionID === 7 && buildingSlot === 3) return [shift + (model.refSize * 657) / 400, shift + (model.refSize * 877) / 400]
    if (junctionID === 8) return [shift + (model.refSize * 643) / 400, shift + (model.refSize * 1579) / 400]
    if (junctionID === 9 && buildingSlot === 1) return [shift + (model.refSize * 781) / 400, shift + (model.refSize * 1766) / 400]
    if (junctionID === 9 && buildingSlot === 3) return [shift + (model.refSize * 691) / 400, shift + (model.refSize * 1983) / 400]
    // 10
    if (junctionID === 11) return [shift + (model.refSize * 784) / 400, shift + (model.refSize * 2810) / 400]
    if (junctionID === 12) return [shift + (model.refSize * 1257) / 400, shift + (model.refSize * 363) / 400]
    if (junctionID === 13) return [shift + (model.refSize * 988) / 400, shift + (model.refSize * 1017) / 400]
    if (junctionID === 14 && buildingSlot === 0) return [shift + (model.refSize * 980) / 400, shift + (model.refSize * 1456) / 400]
    if (junctionID === 14 && buildingSlot === 1) return [shift + (model.refSize * 1067) / 400, shift + (model.refSize * 1760) / 400]
    if (junctionID === 15 && buildingSlot === 0) return [shift + (model.refSize * 1168) / 400, shift + (model.refSize * 2044) / 400]
    if (junctionID === 15 && buildingSlot === 1) return [shift + (model.refSize * 1387) / 400, shift + (model.refSize * 2102) / 400]
    if (junctionID === 16 && buildingSlot === 1) return [shift + (model.refSize * 1139) / 400, shift + (model.refSize * 2500) / 400]
    if (junctionID === 16 && buildingSlot === 3) return [shift + (model.refSize * 1326) / 400, shift + (model.refSize * 2515) / 400]
    if (junctionID === 17) return [shift + (model.refSize * 1385) / 400, shift + (model.refSize * 2934) / 400]
    if (junctionID === 18) return [shift + (model.refSize * 1639) / 400, shift + (model.refSize * 486) / 400]
    if (junctionID === 19 && buildingSlot === 1) return [shift + (model.refSize * 1572) / 400, shift + (model.refSize * 818) / 400]
    if (junctionID === 19 && buildingSlot === 3) return [shift + (model.refSize * 1680) / 400, shift + (model.refSize * 630) / 400]
    if (junctionID === 20 && buildingSlot === 0) return [shift + (model.refSize * 1334) / 400, shift + (model.refSize * 1217) / 400]
    if (junctionID === 20 && buildingSlot === 1) return [shift + (model.refSize * 1624) / 400, shift + (model.refSize * 1217) / 400]
    if (junctionID === 21 && buildingSlot === 0) return [shift + (model.refSize * 1776) / 400, shift + (model.refSize * 1486) / 400]
    if (junctionID === 21 && buildingSlot === 1) return [shift + (model.refSize * 1874) / 400, shift + (model.refSize * 1829) / 400]
    if (junctionID === 22 && buildingSlot === 2) return [shift + (model.refSize * 1841) / 400, shift + (model.refSize * 2314) / 400]
    if (junctionID === 22 && buildingSlot === 3) return [shift + (model.refSize * 1604) / 400, shift + (model.refSize * 2097) / 400]
    if (junctionID === 23) return [shift + (model.refSize * 1775) / 400, shift + (model.refSize * 2828) / 400]
    if (junctionID === 24) return [shift + (model.refSize * 2338) / 400, shift + (model.refSize * 169) / 400]
    // 25
    if (junctionID === 26 && buildingSlot === 1) return [shift + (model.refSize * 1918) / 400, shift + (model.refSize * 1176) / 400]
    if (junctionID === 26 && buildingSlot === 3) return [shift + (model.refSize * 2005) / 400, shift + (model.refSize * 990) / 400]
    if (junctionID === 27 && buildingSlot === 2) return [shift + (model.refSize * 2215) / 400, shift + (model.refSize * 1652) / 400]
    if (junctionID === 27 && buildingSlot === 3) return [shift + (model.refSize * 2127) / 400, shift + (model.refSize * 1469) / 400]
    if (junctionID === 28) return [shift + (model.refSize * 2280) / 400, shift + (model.refSize * 2264) / 400]
    if (junctionID === 29) return [shift + (model.refSize * 2609) / 400, shift + (model.refSize * 217) / 400]
    if (junctionID === 30) return [shift + (model.refSize * 2539) / 400, shift + (model.refSize * 690) / 400]
    if (junctionID === 31 && buildingSlot === 2) return [shift + (model.refSize * 2675) / 400, shift + (model.refSize * 1022) / 400]
    if (junctionID === 31 && buildingSlot === 3) return [shift + (model.refSize * 2480) / 400, shift + (model.refSize * 1156) / 400]
    if (junctionID === 32) return [shift + (model.refSize * 2729) / 400, shift + (model.refSize * 1608) / 400]
    if (junctionID === 33) return [shift + (model.refSize * 2114) / 400, shift + (model.refSize * 1957) / 400]
    if (junctionID === 34) return [shift + (model.refSize * 2677) / 400, shift + (model.refSize * 2457) / 400]
    if (junctionID === 35) return [shift + (model.refSize * 2078) / 400, shift + (model.refSize * 2621) / 400]
  }

  // USING ORIGINAL BOARD
  else if (personal.selectedBoard === 1) {
    // Get pos for actual junctions
    if (buildingSlot === -1) {
      let shift = 0
      if (outline) shift = (model.refSize * -15) / 400
      if (junctionID === 0)
        return [shift + (model.refSize * 196) / 400, shift + (model.refSize * 2783) / 400]
      if (junctionID === 1)
        return [shift + (model.refSize * 778) / 400, shift + (model.refSize * 2884) / 400]
      if (junctionID === 2)
        return [shift + (model.refSize * 1567) / 400, shift + (model.refSize * 2718) / 400]
      if (junctionID === 3)
        return [shift + (model.refSize * 2154) / 400, shift + (model.refSize * 2859) / 400]
      if (junctionID === 4)
        return [shift + (model.refSize * 2591) / 400, shift + (model.refSize * 2793) / 400]
      if (junctionID === 5)
        return [shift + (model.refSize * 209) / 400, shift + (model.refSize * 2112) / 400]
      if (junctionID === 6)
        return [shift + (model.refSize * 507) / 400, shift + (model.refSize * 2463) / 400]
      if (junctionID === 7)
        return [shift + (model.refSize * 854) / 400, shift + (model.refSize * 2374) / 400]
      if (junctionID === 8)
        return [shift + (model.refSize * 1307) / 400, shift + (model.refSize * 2316) / 400]
      if (junctionID === 9)
        return [shift + (model.refSize * 1771) / 400, shift + (model.refSize * 2161) / 400]
      if (junctionID === 10)
        return [shift + (model.refSize * 2187) / 400, shift + (model.refSize * 2327) / 400]
      if (junctionID === 11)
        return [shift + (model.refSize * 2686) / 400, shift + (model.refSize * 2144) / 400]
      if (junctionID === 12)
        return [shift + (model.refSize * 438) / 400, shift + (model.refSize * 1648) / 400]
      if (junctionID === 13)
        return [shift + (model.refSize * 747) / 400, shift + (model.refSize * 1911) / 400]
      if (junctionID === 14)
        return [shift + (model.refSize * 1496) / 400, shift + (model.refSize * 1898) / 400]
      if (junctionID === 15)
        return [shift + (model.refSize * 1844) / 400, shift + (model.refSize * 1719) / 400]
      if (junctionID === 16)
        return [shift + (model.refSize * 2195) / 400, shift + (model.refSize * 1760) / 400]
      if (junctionID === 17)
        return [shift + (model.refSize * 2576) / 400, shift + (model.refSize * 1728) / 400]
      if (junctionID === 18)
        return [shift + (model.refSize * 258) / 400, shift + (model.refSize * 1124) / 400]
      if (junctionID === 19)
        return [shift + (model.refSize * 738) / 400, shift + (model.refSize * 1218) / 400]
      if (junctionID === 20)
        return [shift + (model.refSize * 1094) / 400, shift + (model.refSize * 1462) / 400]
      if (junctionID === 21)
        return [shift + (model.refSize * 1543) / 400, shift + (model.refSize * 1144) / 400]
      if (junctionID === 22)
        return [shift + (model.refSize * 2049) / 400, shift + (model.refSize * 1248) / 400]
      if (junctionID === 23)
        return [shift + (model.refSize * 2464) / 400, shift + (model.refSize * 1192) / 400]
      if (junctionID === 24)
        return [shift + (model.refSize * 150) / 400, shift + (model.refSize * 655) / 400]
      if (junctionID === 25)
        return [shift + (model.refSize * 532) / 400, shift + (model.refSize * 680) / 400]
      if (junctionID === 26)
        return [shift + (model.refSize * 1062) / 400, shift + (model.refSize * 836) / 400]
      if (junctionID === 27)
        return [shift + (model.refSize * 1420) / 400, shift + (model.refSize * 621) / 400]
      if (junctionID === 28)
        return [shift + (model.refSize * 2072) / 400, shift + (model.refSize * 795) / 400]
      if (junctionID === 29)
        return [shift + (model.refSize * 194) / 400, shift + (model.refSize * 353) / 400]
      if (junctionID === 30)
        return [shift + (model.refSize * 536) / 400, shift + (model.refSize * 139) / 400]
      if (junctionID === 31)
        return [shift + (model.refSize * 925) / 400, shift + (model.refSize * 317) / 400]
      if (junctionID === 32)
        return [shift + (model.refSize * 1367) / 400, shift + (model.refSize * 179) / 400]
      if (junctionID === 33)
        return [shift + (model.refSize * 1787) / 400, shift + (model.refSize * 630) / 400]
      if (junctionID === 34)
        return [shift + (model.refSize * 2234) / 400, shift + (model.refSize * 314) / 400]
      if (junctionID === 35)
        return [shift + (model.refSize * 2575) / 400, shift + (model.refSize * 752) / 400]

      return [100, 100]
    }

    // Get pos for buildings, or highlight outline
    let shift = 0
    if (outline) shift = (model.refSize * -12) / 400
    if (junctionID === 0)
      return [shift + (model.refSize * 249) / 400, shift + (model.refSize * 2913) / 400, -10]
    if (junctionID === 1)
      return [shift + (model.refSize * 846) / 400, shift + (model.refSize * 2986) / 400, 10]
    if (junctionID === 2 && buildingSlot === 2)
      return [shift + (model.refSize * 1640) / 400, shift + (model.refSize * 2836) / 400, -15]
    if (junctionID === 2 && buildingSlot === 3)
      return [shift + (model.refSize * 1482) / 400, shift + (model.refSize * 2838) / 400, 14]
    if (junctionID === 3)
      return [shift + (model.refSize * 2242) / 400, shift + (model.refSize * 2950) / 400, 14]
    if (junctionID === 4)
      return [shift + (model.refSize * 2706) / 400, shift + (model.refSize * 2710) / 400, -13]
    if (junctionID === 5)
      return [shift + (model.refSize * 360) / 400, shift + (model.refSize * 2164) / 400, 42]
    if (junctionID === 6)
      return [shift + (model.refSize * 398) / 400, shift + (model.refSize * 2479) / 400, 42]
    if (junctionID === 7 && buildingSlot === 2)
      return [shift + (model.refSize * 964) / 400, shift + (model.refSize * 2475) / 400, -16]
    if (junctionID === 7 && buildingSlot === 3)
      return [shift + (model.refSize * 776) / 400, shift + (model.refSize * 2490) / 400, 15]
    if (junctionID === 8)
      return [shift + (model.refSize * 1282) / 400, shift + (model.refSize * 2461) / 400, -40]
    if (junctionID === 9 && buildingSlot === 1)
      return [shift + (model.refSize * 1648) / 400, shift + (model.refSize * 2203) / 400, -37]
    if (junctionID === 9 && buildingSlot === 3)
      return [shift + (model.refSize * 1821) / 400, shift + (model.refSize * 2293) / 400, -18]
    // 10
    if (junctionID === 11)
      return [shift + (model.refSize * 2601) / 400, shift + (model.refSize * 2289) / 400, 45]
    if (junctionID === 12)
      return [shift + (model.refSize * 316) / 400, shift + (model.refSize * 1690) / 400, -28]
    if (junctionID === 13)
      return [shift + (model.refSize * 862) / 400, shift + (model.refSize * 2004) / 400, 18]
    if (junctionID === 14 && buildingSlot === 0)
      return [shift + (model.refSize * 1516) / 400, shift + (model.refSize * 1783) / 400, 43]
    if (junctionID === 14 && buildingSlot === 1)
      return [shift + (model.refSize * 1645) / 400, shift + (model.refSize * 1923) / 400, 25]
    if (junctionID === 15 && buildingSlot === 0)
      return [shift + (model.refSize * 1732) / 400, shift + (model.refSize * 1681) / 400, 28]
    if (junctionID === 15 && buildingSlot === 1)
      return [shift + (model.refSize * 1951) / 400, shift + (model.refSize * 1632) / 400, -8]
    if (junctionID === 16 && buildingSlot === 1)
      return [shift + (model.refSize * 2320) / 400, shift + (model.refSize * 1851) / 400, 0]
    if (junctionID === 16 && buildingSlot === 3)
      return [shift + (model.refSize * 2398) / 400, shift + (model.refSize * 1662) / 400, 0]
    if (junctionID === 17)
      return [shift + (model.refSize * 2658) / 400, shift + (model.refSize * 1846) / 400, -35]
    if (junctionID === 18)
      return [shift + (model.refSize * 243) / 400, shift + (model.refSize * 1246) / 400, 17]
    if (junctionID === 19 && buildingSlot === 1)
      return [shift + (model.refSize * 743) / 400, shift + (model.refSize * 1353) / 400, -35]
    if (junctionID === 19 && buildingSlot === 3)
      return [shift + (model.refSize * 624) / 400, shift + (model.refSize * 1228) / 400, -35]
    if (junctionID === 20 && buildingSlot === 0)
      return [shift + (model.refSize * 1140) / 400, shift + (model.refSize * 1346) / 400, 37]
    if (junctionID === 20 && buildingSlot === 1)
      return [shift + (model.refSize * 1245) / 400, shift + (model.refSize * 1462) / 400, 37]
    if (junctionID === 21 && buildingSlot === 0)
      return [shift + (model.refSize * 1532) / 400, shift + (model.refSize * 1282) / 400, 30]
    if (junctionID === 21 && buildingSlot === 1)
      return [shift + (model.refSize * 1722) / 400, shift + (model.refSize * 1269) / 400, -12]
    if (junctionID === 22 && buildingSlot === 2)
      return [shift + (model.refSize * 2161) / 400, shift + (model.refSize * 1148) / 400, -7]
    if (junctionID === 22 && buildingSlot === 3)
      return [shift + (model.refSize * 2176) / 400, shift + (model.refSize * 1322) / 400, 5]
    if (junctionID === 23)
      return [shift + (model.refSize * 2597) / 400, shift + (model.refSize * 1152) / 400, -17]
    if (junctionID === 24)
      return [shift + (model.refSize * 206) / 400, shift + (model.refSize * 568) / 400, -8]
    // 25
    if (junctionID === 26 && buildingSlot === 1)
      return [shift + (model.refSize * 933) / 400, shift + (model.refSize * 718) / 400, -18]
    if (junctionID === 26 && buildingSlot === 3)
      return [shift + (model.refSize * 887) / 400, shift + (model.refSize * 897) / 400, -18]
    if (junctionID === 27 && buildingSlot === 2)
      return [shift + (model.refSize * 1527) / 400, shift + (model.refSize * 522) / 400, 12]
    if (junctionID === 27 && buildingSlot === 3)
      return [shift + (model.refSize * 1548) / 400, shift + (model.refSize * 671) / 400, 12]
    if (junctionID === 28)
      return [shift + (model.refSize * 2196) / 400, shift + (model.refSize * 718) / 400, 1]
    if (junctionID === 29)
      return [shift + (model.refSize * 338) / 400, shift + (model.refSize * 379) / 400, 44]
    if (junctionID === 30)
      return [shift + (model.refSize * 670) / 400, shift + (model.refSize * 73) / 400, -26]
    if (junctionID === 31 && buildingSlot === 2)
      return [shift + (model.refSize * 1017) / 400, shift + (model.refSize * 207) / 400, 14]
    if (junctionID === 31 && buildingSlot === 3)
      return [shift + (model.refSize * 1056) / 400, shift + (model.refSize * 387) / 400, 10]
    if (junctionID === 32)
      return [shift + (model.refSize * 1515) / 400, shift + (model.refSize * 191) / 400, 43]
    if (junctionID === 33)
      return [shift + (model.refSize * 1838) / 400, shift + (model.refSize * 755) / 400, -27]
    if (junctionID === 34)
      return [shift + (model.refSize * 2131) / 400, shift + (model.refSize * 277) / 400, 35]
    if (junctionID === 35)
      return [shift + (model.refSize * 2642) / 400, shift + (model.refSize * 647) / 400, 40]
  } else if (personal.selectedBoard === 2) {
    // Get pos for actual junctions
    if (buildingSlot === -1) {
      let shift = 0
      if (outline) shift = (model.refSize * -20) / 400
      if (junctionID === 0)
        return [shift + (model.refSize * 299) / 400, shift + (model.refSize * 474) / 400]
      if (junctionID === 1)
        return [shift + (model.refSize * 203) / 400, shift + (model.refSize * 1033) / 400]
      if (junctionID === 2)
        return [shift + (model.refSize * 358) / 400, shift + (model.refSize * 1808) / 400]
      if (junctionID === 3)
        return [shift + (model.refSize * 205) / 400, shift + (model.refSize * 2375) / 400]
      if (junctionID === 4)
        return [shift + (model.refSize * 345) / 400, shift + (model.refSize * 2833) / 400]
      if (junctionID === 5)
        return [shift + (model.refSize * 895) / 400, shift + (model.refSize * 490) / 400]
      if (junctionID === 6)
        return [shift + (model.refSize * 585) / 400, shift + (model.refSize * 767) / 400]
      if (junctionID === 7)
        return [shift + (model.refSize * 668) / 400, shift + (model.refSize * 1150) / 400]
      if (junctionID === 8)
        return [shift + (model.refSize * 697) / 400, shift + (model.refSize * 1536) / 400]
      if (junctionID === 9)
        return [shift + (model.refSize * 843) / 400, shift + (model.refSize * 1992) / 400]
      if (junctionID === 10)
        return [shift + (model.refSize * 696) / 400, shift + (model.refSize * 2409) / 400]
      if (junctionID === 11)
        return [shift + (model.refSize * 866) / 400, shift + (model.refSize * 2921) / 400]
      if (junctionID === 12)
        return [shift + (model.refSize * 1297) / 400, shift + (model.refSize * 711) / 400]
      if (junctionID === 13)
        return [shift + (model.refSize * 1067) / 400, shift + (model.refSize * 1016) / 400]
      if (junctionID === 14)
        return [shift + (model.refSize * 1085) / 400, shift + (model.refSize * 1740) / 400]
      if (junctionID === 15)
        return [shift + (model.refSize * 1266) / 400, shift + (model.refSize * 2069) / 400]
      if (junctionID === 16)
        return [shift + (model.refSize * 1222) / 400, shift + (model.refSize * 2424) / 400]
      if (junctionID === 17)
        return [shift + (model.refSize * 1223) / 400, shift + (model.refSize * 2834) / 400]
      if (junctionID === 18)
        return [shift + (model.refSize * 1737) / 400, shift + (model.refSize * 560) / 400]
      if (junctionID === 19)
        return [shift + (model.refSize * 1661) / 400, shift + (model.refSize * 996) / 400]
      if (junctionID === 20)
        return [shift + (model.refSize * 1454) / 400, shift + (model.refSize * 1357) / 400]
      if (junctionID === 21)
        return [shift + (model.refSize * 1725) / 400, shift + (model.refSize * 1780) / 400]
      if (junctionID === 22)
        return [shift + (model.refSize * 1650) / 400, shift + (model.refSize * 2284) / 400]
      if (junctionID === 23)
        return [shift + (model.refSize * 1678) / 400, shift + (model.refSize * 2704) / 400]
      if (junctionID === 24)
        return [shift + (model.refSize * 2171) / 400, shift + (model.refSize * 424) / 400]
      if (junctionID === 25)
        return [shift + (model.refSize * 2143) / 400, shift + (model.refSize * 786) / 400]
      if (junctionID === 26)
        return [shift + (model.refSize * 2006) / 400, shift + (model.refSize * 1327) / 400]
      if (junctionID === 27)
        return [shift + (model.refSize * 2172) / 400, shift + (model.refSize * 1697) / 400]
      if (junctionID === 28)
        return [shift + (model.refSize * 2034) / 400, shift + (model.refSize * 2330) / 400]
      if (junctionID === 29)
        return [shift + (model.refSize * 2425) / 400, shift + (model.refSize * 484) / 400]
      if (junctionID === 30)
        return [shift + (model.refSize * 2616) / 400, shift + (model.refSize * 814) / 400]
      if (junctionID === 31)
        return [shift + (model.refSize * 2454) / 400, shift + (model.refSize * 1193) / 400]
      if (junctionID === 32)
        return [shift + (model.refSize * 2561) / 400, shift + (model.refSize * 1619) / 400]
      if (junctionID === 33)
        return [shift + (model.refSize * 2177) / 400, shift + (model.refSize * 2037) / 400]
      if (junctionID === 34)
        return [shift + (model.refSize * 2476) / 400, shift + (model.refSize * 2443) / 400]
      if (junctionID === 35)
        return [shift + (model.refSize * 2080) / 400, shift + (model.refSize * 2816) / 400]

      return [100, 100]
    }

    // Get pos for buildings, or highlight outline
    let shift = 0
    if (outline) shift = (model.refSize * -20) / 400
    if (junctionID === 0)
      return [shift + (model.refSize * 234) / 400, shift + (model.refSize * 398) / 400]
    if (junctionID === 1)
      return [shift + (model.refSize * 335) / 400, shift + (model.refSize * 959) / 400]
    if (junctionID === 2 && buildingSlot === 2)
      return [shift + (model.refSize * 243) / 400, shift + (model.refSize * 1879) / 400]
    if (junctionID === 2 && buildingSlot === 3)
      return [shift + (model.refSize * 247) / 400, shift + (model.refSize * 1741) / 400]
    if (junctionID === 3)
      return [shift + (model.refSize * 351) / 400, shift + (model.refSize * 2288) / 400]
    if (junctionID === 4)
      return [shift + (model.refSize * 284) / 400, shift + (model.refSize * 2935) / 400]
    if (junctionID === 5)
      return [shift + (model.refSize * 905) / 400, shift + (model.refSize * 380) / 400]
    if (junctionID === 6)
      return [shift + (model.refSize * 589) / 400, shift + (model.refSize * 629) / 400]
    if (junctionID === 7 && buildingSlot === 2)
      return [shift + (model.refSize * 578) / 400, shift + (model.refSize * 1251) / 400]
    if (junctionID === 7 && buildingSlot === 3)
      return [shift + (model.refSize * 754) / 400, shift + (model.refSize * 1026) / 400]
    if (junctionID === 8)
      return [shift + (model.refSize * 564) / 400, shift + (model.refSize * 1545) / 400]
    if (junctionID === 9 && buildingSlot === 1)
      return [shift + (model.refSize * 828) / 400, shift + (model.refSize * 1873) / 400]
    if (junctionID === 9 && buildingSlot === 3)
      return [shift + (model.refSize * 722) / 400, shift + (model.refSize * 2061) / 400]
    // 10
    if (junctionID === 11)
      return [shift + (model.refSize * 730) / 400, shift + (model.refSize * 2804) / 400]
    if (junctionID === 12)
      return [shift + (model.refSize * 1300) / 400, shift + (model.refSize * 594) / 400]
    if (junctionID === 13)
      return [shift + (model.refSize * 979) / 400, shift + (model.refSize * 1182) / 400]
    if (junctionID === 14 && buildingSlot === 0)
      return [shift + (model.refSize * 991) / 400, shift + (model.refSize * 1583) / 400]
    if (junctionID === 14 && buildingSlot === 1)
      return [shift + (model.refSize * 1073) / 400, shift + (model.refSize * 1931) / 400]
    if (junctionID === 15 && buildingSlot === 0)
      return [shift + (model.refSize * 1155) / 400, shift + (model.refSize * 2170) / 400]
    if (junctionID === 15 && buildingSlot === 1)
      return [shift + (model.refSize * 1390) / 400, shift + (model.refSize * 2164) / 400]
    if (junctionID === 16 && buildingSlot === 1)
      return [shift + (model.refSize * 1116) / 400, shift + (model.refSize * 2539) / 400]
    if (junctionID === 16 && buildingSlot === 3)
      return [shift + (model.refSize * 1315) / 400, shift + (model.refSize * 2614) / 400]
    if (junctionID === 17)
      return [shift + (model.refSize * 1318) / 400, shift + (model.refSize * 2948) / 400]
    if (junctionID === 18)
      return [shift + (model.refSize * 1730) / 400, shift + (model.refSize * 455) / 400]
    if (junctionID === 19 && buildingSlot === 1)
      return [shift + (model.refSize * 1541) / 400, shift + (model.refSize * 1031) / 400]
    if (junctionID === 19 && buildingSlot === 3)
      return [shift + (model.refSize * 1681) / 400, shift + (model.refSize * 878) / 400]
    if (junctionID === 20 && buildingSlot === 0)
      return [shift + (model.refSize * 1307) / 400, shift + (model.refSize * 1376) / 400]
    if (junctionID === 20 && buildingSlot === 1)
      return [shift + (model.refSize * 1611) / 400, shift + (model.refSize * 1364) / 400]
    if (junctionID === 21 && buildingSlot === 0)
      return [shift + (model.refSize * 1729) / 400, shift + (model.refSize * 1597) / 400]
    if (junctionID === 21 && buildingSlot === 1)
      return [shift + (model.refSize * 1807) / 400, shift + (model.refSize * 1955) / 400]
    if (junctionID === 22 && buildingSlot === 2)
      return [shift + (model.refSize * 1771) / 400, shift + (model.refSize * 2413) / 400]
    if (junctionID === 22 && buildingSlot === 3)
      return [shift + (model.refSize * 1556) / 400, shift + (model.refSize * 2206) / 400]
    if (junctionID === 23)
      return [shift + (model.refSize * 1690) / 400, shift + (model.refSize * 2844) / 400]
    if (junctionID === 24)
      return [shift + (model.refSize * 2178) / 400, shift + (model.refSize * 312) / 400]
    // 25
    if (junctionID === 26 && buildingSlot === 1)
      return [shift + (model.refSize * 1865) / 400, shift + (model.refSize * 1351) / 400]
    if (junctionID === 26 && buildingSlot === 3)
      return [shift + (model.refSize * 1952) / 400, shift + (model.refSize * 1131) / 400]
    if (junctionID === 27 && buildingSlot === 2)
      return [shift + (model.refSize * 2182) / 400, shift + (model.refSize * 1827) / 400]
    if (junctionID === 27 && buildingSlot === 3)
      return [shift + (model.refSize * 2032) / 400, shift + (model.refSize * 1634) / 400]
    if (junctionID === 28)
      return [shift + (model.refSize * 2157) / 400, shift + (model.refSize * 2366) / 400]
    if (junctionID === 29)
      return [shift + (model.refSize * 2513) / 400, shift + (model.refSize * 401) / 400]
    if (junctionID === 30)
      return [shift + (model.refSize * 2472) / 400, shift + (model.refSize * 924) / 400]
    if (junctionID === 31 && buildingSlot === 2)
      return [shift + (model.refSize * 2580) / 400, shift + (model.refSize * 1214) / 400]
    if (junctionID === 31 && buildingSlot === 3)
      return [shift + (model.refSize * 2394) / 400, shift + (model.refSize * 1339) / 400]
    if (junctionID === 32)
      return [shift + (model.refSize * 2643) / 400, shift + (model.refSize * 1744) / 400]
    if (junctionID === 33)
      return [shift + (model.refSize * 2040) / 400, shift + (model.refSize * 2085) / 400]
    if (junctionID === 34)
      return [shift + (model.refSize * 2565) / 400, shift + (model.refSize * 2547) / 400]
    if (junctionID === 35)
      return [shift + (model.refSize * 1970) / 400, shift + (model.refSize * 2685) / 400]
  }

  alert('JID: ' + String(junctionID))
  alert('BSl:' + String(buildingSlot))
  return [0, 0]
}

export function getLineSVGpoints(lineID, index, raw) {
  const model = useModelStore()
  const personal = usePersonalStore()

  if (personal.selectedBoard === 0) {
    // If highlighting, get index and +1
    if (index === 10) {
      index = model.lines[lineID].length
    }

    let lineWidth = (model.refSize * 25) / 400

    let coords = []
    if (lineID === 0) coords = [460, 245, 865, 175]
    if (lineID === 1) coords = [1060, 196, 1720, 333]
    if (lineID === 2) coords = [1875, 330, 2310, 220]
    if (lineID === 3) coords = [2490, 241, 2816, 354]
    if (lineID === 4) coords = [352, 780, 359, 361]
    if (lineID === 5) coords = [439, 336, 585, 509]
    if (lineID === 6) coords = [1000, 281, 1060, 532]
    if (lineID === 7) coords = [1039, 264, 1429, 654]
    if (lineID === 8) coords = [1539, 653, 1727, 434]
    if (lineID === 9) coords = [1899, 396, 2381, 716]
    if (lineID === 10) coords = [2425, 324, 2465, 671]
    if (lineID === 11) coords = [2547, 701, 2808, 460]
    if (lineID === 12) coords = [2917, 497, 2967, 881]
    if (lineID === 13) coords = [417, 798, 561, 647]
    if (lineID === 14) coords = [734, 589, 975, 606]
    if (lineID === 15) coords = [1169, 638, 1397, 700]
    if (lineID === 16) coords = [1537, 823, 1634, 1059]
    if (lineID === 17) coords = [1848, 447, 1949, 788]
    if (lineID === 18) coords = [2057, 858, 2366, 800]
    if (lineID === 19) coords = [2590, 823, 2878, 938]
    if (lineID === 20) coords = [401, 943, 551, 1231]
    if (lineID === 21) coords = [463, 917, 840, 1081]
    if (lineID === 22) coords = [951, 1026, 1033, 722]
    if (lineID === 23) coords = [1053, 1117, 1519, 1128]
    if (lineID === 24) coords = [1727, 1070, 1884, 934]
    if (lineID === 25) coords = [2059, 951, 2363, 1216]
    if (lineID === 26) coords = [2430, 1191, 2455, 909]
    if (lineID === 27) coords = [2567, 881, 2823, 1250]
    if (lineID === 28) coords = [648, 1260, 834, 1160]
    if (lineID === 29) coords = [1015, 1210, 1216, 1446]
    if (lineID === 30) coords = [1347, 1439, 1560, 1215]
    if (lineID === 31) coords = [1751, 1190, 1975, 1303]
    if (lineID === 32) coords = [2162, 1332, 2331, 1303]
    if (lineID === 33) coords = [2568, 1298, 2788, 1323]
    if (lineID === 34) coords = [414, 1698, 513, 1418]
    if (lineID === 35) coords = [637, 1398, 795, 1652]
    if (lineID === 36) coords = [931, 1699, 1167, 1581]
    if (lineID === 37) coords = [1382, 1593, 1631, 1766]
    if (lineID === 38) coords = [1770, 1751, 1985, 1437]
    if (lineID === 39) coords = [2273, 1680, 2382, 1391]
    if (lineID === 40) coords = [2512, 1411, 2672, 1726]
    if (lineID === 41) coords = [2740, 1728, 2838, 1441]
    if (lineID === 42) coords = [235, 2185, 336, 1895]
    if (lineID === 43) coords = [451, 1877, 582, 2141]
    if (lineID === 44) coords = [656, 2141, 786, 1863]
    if (lineID === 45) coords = [926, 1829, 1131, 2011]
    if (lineID === 46) coords = [1320, 2039, 1608, 1895]
    if (lineID === 47) coords = [1846, 1822, 2142, 1785]
    if (lineID === 48) coords = [2373, 1782, 2615, 1812]
    if (lineID === 49) coords = [306, 2256, 496, 2246]
    if (lineID === 50) coords = [769, 2208, 1060, 2140]
    if (lineID === 51) coords = [1330, 2156, 1483, 2256]
    if (lineID === 52) coords = [1605, 2196, 1682, 1955]
    if (lineID === 53) coords = [1789, 1951, 1927, 2233]
    if (lineID === 54) coords = [2052, 2289, 2208, 2213]
    if (lineID === 55) coords = [2279, 1875, 2304, 2097]
    if (lineID === 56) coords = [2410, 2198, 2689, 2234]
    if (lineID === 57) coords = [2749, 1913, 2803, 2146]
    if (lineID === 58) coords = [348, 2468, 517, 2318]
    if (lineID === 59) coords = [635, 2361, 644, 2619]
    if (lineID === 60) coords = [754, 2335, 976, 2515]
    if (lineID === 61) coords = [1089, 2490, 1178, 2213]
    if (lineID === 62) coords = [1291, 2213, 1453, 2629]
    if (lineID === 63) coords = [1512, 2636, 1553, 2428]
    if (lineID === 64) coords = [381, 2587, 552, 2693]
    if (lineID === 65) coords = [728, 2708, 968, 2630]
    if (lineID === 66) coords = [1195, 2637, 1390, 2707]
    if (lineID === 67) coords = [1583, 2656, 1894, 2388]
    if (lineID === 68) coords = [2052, 2398, 2322, 2597]
    if (lineID === 69) coords = [2444, 2580, 2724, 2315]

    let x1 = (model.refSize * coords[0]) / 400
    let y1 = (model.refSize * coords[1]) / 400
    let x2 = (model.refSize * coords[2]) / 400
    let y2 = (model.refSize * coords[3]) / 400

    let deltaY = Math.abs(y1 - y2)
    let deltaX = Math.abs(x1 - x2)
    /*let deltaY = y1 - y2
    let deltaX = x1 - x2*/

    let topPercent = deltaX / (deltaX + deltaY)
    let leftPercent = deltaY / (deltaX + deltaY)

    // find the min
    let trigFactor = Math.min(topPercent, leftPercent)
    lineWidth = lineWidth + trigFactor * 1.41 * lineWidth

    // If not 0 line, shift the x1 and x2
    if (index === 2) index = -1
    else if (index === 3) index = 2
    else if (index === 4) index = -2

    // pointing up lines
    if (y1 > y2) {
      x1 = index * lineWidth * leftPercent + x1
      y1 = index * lineWidth * topPercent + y1
      x2 = index * lineWidth * leftPercent + x2
      y2 = index * lineWidth * topPercent + y2
    }
    // pointing down lines
    else {
      //index = Math.abs(index)
      x1 = -(index * lineWidth * leftPercent) + x1
      y1 = index * lineWidth * topPercent + y1
      x2 = -(index * lineWidth * leftPercent) + x2
      y2 = index * lineWidth * topPercent + y2
    }
    // END not a 0 line

    let shearX = 1
    if (y2 > y1) shearX = -1

    /*// find the min
    let trigFactor = Math.min(topPercent, leftPercent)
    lineWidth = lineWidth + (trigFactor * 1.41 * lineWidth)*/

    let x11 = shearX * (lineWidth * leftPercent) + x1
    let y11 = lineWidth * topPercent + y1

    let x22 = shearX * (lineWidth * leftPercent) + x2
    let y22 = lineWidth * topPercent + y2

    //return "460,278 465,290, 870,210 865,203"

    if (raw) return [x1, y1, x11, y11, x2, y2, x22, y22]
    return (
      '' +
      String(x1) +
      ',' +
      String(y1) +
      ' ' +
      String(x11) +
      ',' +
      String(y11) +
      ' ' +
      String(x22) +
      ',' +
      String(y22) +
      ' ' +
      String(x2) +
      ',' +
      String(y2) +
      ' '
    )
  } else if (personal.selectedBoard === 1) {
    // If highlighting, get index and +1
    if (index === 10) {
      index = model.lines[lineID].length
    }

    let lineWidth = (model.refSize * 25) / 400 * 2

    let coords = []
    if (lineID === 0) coords = [2892, 323, 2983, 799]
    if (lineID === 1) coords = [2802, 1528, 2944, 932]
    if (lineID === 2) coords = [2840, 1748, 2959, 2171]
    if (lineID === 3) coords = [2811, 2629, 2916, 2294]
    if (lineID === 4) coords = [2241, 266, 2787, 248]
    if (lineID === 5) coords = [2552, 538, 2805, 289]
    if (lineID === 6) coords = [2491, 942, 2864, 856]
    if (lineID === 7) coords = [2431, 1299, 2878, 911]
    if (lineID === 8) coords = [2422, 1390, 2735, 1571]
    if (lineID === 9) coords = [2432, 2177, 2746, 1678]
    if (lineID === 10) coords = [2516, 2236, 2902, 2215]
    if (lineID === 11) coords = [2485, 2334, 2777, 2628]
    if (lineID === 12) coords = [2262, 2756, 2705, 2686]
    if (lineID === 13) coords = [2259, 326, 2499, 527]
    if (lineID === 14) coords = [2431, 928, 2501, 618]
    if (lineID === 15) coords = [2376, 1289, 2414, 1027]
    if (lineID === 16) coords = [2005, 1530, 2317, 1388]
    if (lineID === 17) coords = [2297, 1785, 2691, 1642]
    if (lineID === 18) coords = [2276, 1894, 2374, 2148]
    if (lineID === 19) coords = [2202, 2738, 2320, 2388]
    if (lineID === 20) coords = [1772, 460, 2090, 305]
    if (lineID === 21) coords = [1984, 756, 2118, 362]
    if (lineID === 22) coords = [2048, 820, 2383, 930]
    if (lineID === 23) coords = [1944, 1491, 1961, 923]
    if (lineID === 24) coords = [2001, 1591, 2210, 1771]
    if (lineID === 25) coords = [1870, 2210, 2178, 1862]
    if (lineID === 26) coords = [1904, 2261, 2262, 2244]
    if (lineID === 27) coords = [1854, 2630, 2257, 2338]
    if (lineID === 28) coords = [1761, 525, 1941, 760]
    if (lineID === 29) coords = [1567, 1131, 1907, 857]
    if (lineID === 30) coords = [1591, 1207, 1891, 1487]
    if (lineID === 31) coords = [1782, 1861, 1914, 1615]
    if (lineID === 32) coords = [1786, 1956, 1830, 2197]
    if (lineID === 33) coords = [1788, 2632, 1812, 2365]
    if (lineID === 34) coords = [1282, 363, 1639, 467]
    if (lineID === 35) coords = [1307, 762, 1649, 530]
    if (lineID === 36) coords = [1327, 838, 1501, 1102]
    if (lineID === 37) coords = [1231, 1559, 1453, 1240]
    if (lineID === 38) coords = [1282, 1629, 1706, 1863]
    if (lineID === 39) coords = [1378, 2133, 1756, 2245]
    if (lineID === 40) coords = [1313, 2526, 1757, 2304]
    if (lineID === 41) coords = [1361, 2575, 1739, 2665]
    if (lineID === 42) coords = [783, 216, 1124, 323]
    if (lineID === 43) coords = [855, 528, 1114, 389]
    if (lineID === 44) coords = [865, 626, 1216, 758]
    if (lineID === 45) coords = [958, 1070, 1224, 827]
    if (lineID === 46) coords = [953, 1187, 1180, 1535]
    if (lineID === 47) coords = [1243, 1684, 1312, 2048]
    if (lineID === 48) coords = [1254, 2507, 1289, 2180]
    if (lineID === 49) coords = [735, 262, 751, 440]
    if (lineID === 50) coords = [816, 725, 915, 1051]
    if (lineID === 51) coords = [689, 1483, 849, 1199]
    if (lineID === 52) coords = [755, 1519, 1127, 1582]
    if (lineID === 53) coords = [747, 1817, 1128, 1641]
    if (lineID === 54) coords = [737, 1901, 863, 2134]
    if (lineID === 55) coords = [912, 2156, 1243, 2119]
    if (lineID === 56) coords = [817, 2616, 846, 2229]
    if (lineID === 57) coords = [876, 2645, 1194, 2562]
    if (lineID === 58) coords = [465, 287, 642, 461]
    if (lineID === 59) coords = [260, 604, 597, 587]
    if (lineID === 60) coords = [421, 959, 639, 703]
    if (lineID === 61) coords = [455, 1022, 826, 1084]
    if (lineID === 62) coords = [322, 1395, 809, 1146]
    if (lineID === 63) coords = [348, 1444, 632, 1497]
    if (lineID === 64) coords = [204, 580, 358, 319]
    if (lineID === 65) coords = [226, 668, 370, 948]
    if (lineID === 66) coords = [240, 1390, 346, 1081]
    if (lineID === 67) coords = [311, 1489, 682, 1809]
    if (lineID === 68) coords = [389, 2238, 645, 1909]
    if (lineID === 69) coords = [408, 2312, 781, 2623]

    let x1 = (model.refSize * coords[0]) / 400
    let y1 = (model.refSize * coords[1]) / 400
    let x2 = (model.refSize * coords[2]) / 400
    let y2 = (model.refSize * coords[3]) / 400

    let deltaY = Math.abs(y1 - y2)
    let deltaX = Math.abs(x1 - x2)
    /*let deltaY = y1 - y2
    let deltaX = x1 - x2*/

    let topPercent = deltaX / (deltaX + deltaY)
    let leftPercent = deltaY / (deltaX + deltaY)

    // find the min
    let trigFactor = Math.min(topPercent, leftPercent)
    lineWidth = lineWidth + trigFactor * 1.41 * lineWidth

    // If not 0 line, shift the x1 and x2
    if (index === 2) index = -1
    else if (index === 3) index = 2
    else if (index === 4) index = -2

    // pointing up lines
    if (y1 > y2) {
      x1 = index * lineWidth * leftPercent + x1
      y1 = index * lineWidth * topPercent + y1
      x2 = index * lineWidth * leftPercent + x2
      y2 = index * lineWidth * topPercent + y2
    }
    // pointing down lines
    else {
      //index = Math.abs(index)
      x1 = -(index * lineWidth * leftPercent) + x1
      y1 = index * lineWidth * topPercent + y1
      x2 = -(index * lineWidth * leftPercent) + x2
      y2 = index * lineWidth * topPercent + y2
    }
    // END not a 0 line

    let shearX = 1
    if (y2 > y1) shearX = -1

    /*// find the min
    let trigFactor = Math.min(topPercent, leftPercent)
    lineWidth = lineWidth + (trigFactor * 1.41 * lineWidth)*/

    let x11 = shearX * (lineWidth * leftPercent) + x1
    let y11 = lineWidth * topPercent + y1

    let x22 = shearX * (lineWidth * leftPercent) + x2
    let y22 = lineWidth * topPercent + y2

    //return "460,278 465,290, 870,210 865,203"

    if (raw) return [x1, y1, x11, y11, x2, y2, x22, y22]
    return (
      '' +
      String(x1) +
      ',' +
      String(y1) +
      ' ' +
      String(x11) +
      ',' +
      String(y11) +
      ' ' +
      String(x22) +
      ',' +
      String(y22) +
      ' ' +
      String(x2) +
      ',' +
      String(y2) +
      ' '
    )
  } else if (personal.selectedBoard === 2) {
    // If highlighting, get index and +1
    if (index === 10) {
      index = model.lines[lineID].length
    }

    let lineWidth = (model.refSize * 33) / 400

    let coords = []
    if (lineID === 0) coords = [598, 332, 1038, 259]
    if (lineID === 1) coords = [1210, 272, 1784, 387]
    if (lineID === 2) coords = [1938, 384, 2337, 284]
    if (lineID === 3) coords = [2512, 271, 2845, 371]
    if (lineID === 4) coords = [552, 437, 567, 870]
    if (lineID === 5) coords = [608, 403, 794, 583]
    if (lineID === 6) coords = [1146, 385, 1220, 653]
    if (lineID === 7) coords = [1198, 341, 1553, 693]
    if (lineID === 8) coords = [1638, 711, 1808, 472]
    if (lineID === 9) coords = [1963, 454, 2357, 672]
    if (lineID === 10) coords = [2463, 336, 2486, 626]
    if (lineID === 11) coords = [2579, 656, 2836, 440]
    if (lineID === 12) coords = [2937, 501, 2991, 847]
    if (lineID === 13) coords = [600, 879, 767, 692]
    if (lineID === 14) coords = [904, 641, 1148, 694]
    if (lineID === 15) coords = [1287, 718, 1523, 749]
    if (lineID === 16) coords = [1653, 819, 1776, 1047]
    if (lineID === 17) coords = [1920, 515, 2034, 817]
    if (lineID === 18) coords = [2134, 864, 2337, 793]
    if (lineID === 19) coords = [2623, 793, 2919, 893]
    if (lineID === 20) coords = [615, 1031, 756, 1283]
    if (lineID === 21) coords = [643, 971, 1003, 1084]
    if (lineID === 22) coords = [1085, 1061, 1176, 800]
    if (lineID === 23) coords = [1192, 1114, 1680, 1128]
    if (lineID === 24) coords = [1868, 1074, 1997, 938]
    if (lineID === 25) coords = [2128, 953, 2429, 1195]
    if (lineID === 26) coords = [2497, 902, 2507, 1194]
    if (lineID === 27) coords = [2609, 894, 2862, 1207]
    if (lineID === 28) coords = [815, 1296, 1013, 1156]
    if (lineID === 29) coords = [1153, 1187, 1370, 1430]
    if (lineID === 30) coords = [1488, 1432, 1727, 1203]
    if (lineID === 31) coords = [1896, 1177, 2074, 1272]
    if (lineID === 32) coords = [2224, 1294, 2416, 1263]
    if (lineID === 33) coords = [2573, 1254, 2829, 1267]
    if (lineID === 34) coords = [626, 1725, 728, 1427]
    if (lineID === 35) coords = [839, 1408, 1024, 1652]
    if (lineID === 36) coords = [1116, 1674, 1335, 1547]
    if (lineID === 37) coords = [1523, 1560, 1773, 1715]
    if (lineID === 38) coords = [1889, 1689, 2062, 1410]
    if (lineID === 39) coords = [2353, 1636, 2448, 1344]
    if (lineID === 40) coords = [2552, 1336, 2747, 1670]
    if (lineID === 41) coords = [2779, 1667, 2864, 1362]
    if (lineID === 42) coords = [491, 2162, 582, 1870]
    if (lineID === 43) coords = [679, 1849, 797, 2072]
    if (lineID === 44) coords = [886, 2069, 1010, 1784]
    if (lineID === 45) coords = [1127, 1770, 1355, 1998]
    if (lineID === 46) coords = [1440, 2007, 1739, 1831]
    if (lineID === 47) coords = [1945, 1754, 2261, 1704]
    if (lineID === 48) coords = [2421, 1698, 2707, 1732]
    if (lineID === 49) coords = [542, 2217, 714, 2200]
    if (lineID === 50) coords = [992, 2147, 1292, 2068]
    if (lineID === 51) coords = [1478, 2082, 1708, 2191]
    if (lineID === 52) coords = [1761, 2163, 1814, 1892]
    if (lineID === 53) coords = [1922, 1878, 2081, 2172]
    if (lineID === 54) coords = [2153, 2192, 2335, 2100]
    if (lineID === 55) coords = [2375, 1778, 2404, 2026]
    if (lineID === 56) coords = [2474, 2084, 2797, 2116]
    if (lineID === 57) coords = [2808, 1809, 2884, 2072]
    if (lineID === 58) coords = [573, 2429, 732, 2284]
    if (lineID === 59) coords = [874, 2346, 890, 2608]
    if (lineID === 60) coords = [983, 2282, 1205, 2449]
    if (lineID === 61) coords = [1264, 2442, 1348, 2137]
    if (lineID === 62) coords = [1452, 2144, 1659, 2549]
    if (lineID === 63) coords = [1690, 2541, 1734, 2298]
    if (lineID === 64) coords = [617, 2506, 825, 2628]
    if (lineID === 65) coords = [938, 2635, 1189, 2526]
    if (lineID === 66) coords = [1343, 2521, 1616, 2603]
    if (lineID === 67) coords = [1750, 2557, 2029, 2280]
    if (lineID === 68) coords = [2176, 2274, 2464, 2487]
    if (lineID === 69) coords = [2545, 2480, 2818, 2187]

    let x1 = (model.refSize * coords[0]) / 400
    let y1 = (model.refSize * coords[1]) / 400
    let x2 = (model.refSize * coords[2]) / 400
    let y2 = (model.refSize * coords[3]) / 400

    let deltaY = Math.abs(y1 - y2)
    let deltaX = Math.abs(x1 - x2)

    let topPercent = deltaX / (deltaX + deltaY)
    let leftPercent = deltaY / (deltaX + deltaY)

    // find the min
    let trigFactor = Math.min(topPercent, leftPercent)
    lineWidth = lineWidth + trigFactor * 1.41 * lineWidth

    // If not 0 line, shift the x1 and x2
    if (index === 2) index = -1
    else if (index === 3) index = 2
    else if (index === 4) index = -2

    // pointing up lines
    if (y1 > y2) {
      x1 = index * lineWidth * leftPercent + x1
      y1 = index * lineWidth * topPercent + y1
      x2 = index * lineWidth * leftPercent + x2
      y2 = index * lineWidth * topPercent + y2
    }
    // pointing down lines
    else {
      //index = Math.abs(index)
      x1 = -(index * lineWidth * leftPercent) + x1
      y1 = index * lineWidth * topPercent + y1
      x2 = -(index * lineWidth * leftPercent) + x2
      y2 = index * lineWidth * topPercent + y2
    }
    // END not a 0 line

    let shearX = 1
    if (y2 > y1) shearX = -1

    let x11 = shearX * (lineWidth * leftPercent) + x1
    let y11 = lineWidth * topPercent + y1

    let x22 = shearX * (lineWidth * leftPercent) + x2
    let y22 = lineWidth * topPercent + y2

    if (raw) return [x1, y1, x11, y11, x2, y2, x22, y22]
    return (
      '' +
      String(x1) +
      ',' +
      String(y1) +
      ' ' +
      String(x11) +
      ',' +
      String(y11) +
      ' ' +
      String(x22) +
      ',' +
      String(y22) +
      ' ' +
      String(x2) +
      ',' +
      String(y2) +
      ' '
    )
  }
}
