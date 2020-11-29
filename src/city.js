import './city.css';
import { formatMoney } from './base/util';
import storage from './base/storage';
import { fetchAPI } from './base/api';

const [seconds, minutes, hours, days] = [1000, 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000];

function getItemIDsOnMap() {
  let items = [];
  for (let el of document.querySelectorAll("#map .leaflet-marker-pane *")) {
    let src = el.getAttribute("src");
    if (src.indexOf("https://www.torn.com/images/items/") > -1) {
      let id = src.split("items/")[1].split("/")[0];
      items.push(id);
      // highlight items
      el.setAttribute("item-id", id);
      el.classList.add("cityItem");
    }
  }
  return items;
}

function getItemList() {
  let itemListStorageKey = "torn.items";
  let itemList = storage.get(itemListStorageKey);
  let expiredIn = 1 * days;
  if (!itemList || !itemList.fetchDate || new Date() - new Date(itemList.fetchDate) >= expiredIn) {
    return new Promise((resolve, reject) => {
      fetchAPI("torn", ["items"])
        .then(data => {
          let itemList = data.items;
          resolve(itemList);
          itemList.fetchDate = new Date().toString();
          storage.set(itemListStorageKey, itemList);
        })
        .catch(err => reject(err));
    });
  }
  return Promise.resolve(itemList);
}

let itemIDs = getItemIDsOnMap();
getItemList().then(itemList => {
  let message = itemIDs.reduce((acc, val, idx) => {
    let { name, market_value } = itemList[val];
    return `${acc}\n${name} (${formatMoney(market_value)})`;
  }, `${itemIDs.length} items on the map:`);
  alert(message);
}).catch(err => alert(err));