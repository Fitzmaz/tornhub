// ==UserScript==
// @name         Torn: Show PQ
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Show PQ of weapons on item market
// @author       Microdust [2587304]
// @match        https://www.torn.com/imarket.php
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  if (window.location.href.indexOf("imarket.php") < 0) {
    return;
  }

  $(document).ajaxComplete((event, xhr, settings) => {
    if (xhr.readyState <= 3 || xhr.status != 200) {
      return;
    }
    if (xhr.responseText.indexOf("item") < 0) {
      return;
    }
    // console.log(xhr.responseText);
    let dmg, acc;
    try {
      const data = JSON.parse(xhr.responseText);
      for (const o of data.extras) {
        if (o.title === "Damage") {
          console.log(`dmg: ${o.value}`);
          dmg = o.value;
        } else if (o.title === "Accuracy") {
          console.log(`acc: ${o.value}`);
          acc = o.value;
        }
      }
    } catch (e) { }
    for (const div of document.querySelectorAll('div.details-wrap')) {
      if (div.style.display !== "none") {
        let els = div.querySelector('ul.list-wrap').children;
        els[els.length - 2].innerHTML = `<div class="title">PQ:</div>
<div class="desc bonus-decrease">
<i class="bonus-attachment-item-rarity-bonus"></i> <span class="t-overflow label-value">${getProxiQual(dmg, acc)}</span></div>
<div class="clear"></div>`;
      }
    }
  });

  function getProxiQual(dmg, acc) {
    let damage = parseFloat(dmg), accuracy = parseFloat(acc);
    let ProxiQual = accuracy / 100 * (1 + Math.log((((Math.exp((damage - 0.005) / 19 + 2) - 13) + (Math.exp((damage + 0.005) / 19 + 2) - 13)) / 2).toFixed(0))) * 10;
    return ProxiQual.toFixed(2);
  }
})();

// let data = {
//   "itemName": "ArmaLite M-15A4",
//   "itemType": "Weapon",
//   "itemID": 399,
//   "armoryID": 7297514110,
//   "itemInfo": "Made from the latest composites, this lightweight but powerful rifle is perfect for the experienced shooter.",
//   "itemCost": "$20,000,000",
//   "itemSell": "$15,000,000",
//   "itemValue": "$16,116,878",
//   "itemCirculation": "31,125",
//   "itemRareIcon": "common-rarity",
//   "itemRareTitle": "<p>Common<\/p> 31,125 total in circulation",
//   "itemInfoContent": "\n            <div class='m-bottom10'>\n                <span class=\"bold\">The ArmaLite M-15A4<\/span> is a  Rifle Weapon.\n            <\/div>\n            Made from the latest composites, this lightweight but powerful rifle is perfect for the experienced shooter.\n            ",
//   "glow": "",
//   "extras": [
//     { "type": "text", "title": "Damage", "icon": "bonus-attachment-item-damage-bonus", "value": "69.93", "descColor": "bonus-decrease", "descTitle": "-1.51", "cl": "t-left" },
//     { "type": "text", "title": "Accuracy", "icon": "bonus-attachment-item-accuracy-bonus", "value": "57.24", "descColor": "bonus-increase", "descTitle": "+26.45", "cl": "t-right" },
//     { "type": "text", "title": "Rate of Fire", "icon": "bonus-attachment-item-rof-bonus", "value": "3-5", "cl": "t-left" },
//     { "type": "text", "title": "Stealth", "icon": "bonus-attachment-item-stealth-bonus", "value": "3.0", "descColor": "bonus-increase", "descTitle": "+1.70", "cl": "t-right" },
//     { "type": "text", "title": "Caliber", "icon": "bonus-attachment-item-ammo-bonus", "value": "5.56mm Rifle Round", "cl": "t-left" },
//     { "type": "text", "title": "Ammo", "icon": "bonus-attachment-item-clip-bonus", "value": " <span>3 x 15 (4834)<\/span>", "cl": "t-right" },
//     { "type": "text", "title": "Quality", "icon": "bonus-attachment-item-rarity-bonus", "value": "4.30%", "descColor": "bonus-decrease", "descTitle": "-30.75%", "cl": "t-left" }
//   ]
// }
