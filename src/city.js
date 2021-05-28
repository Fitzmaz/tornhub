import './city.css';
import { formatMoney } from './base/util';
import storage from './base/storage';
import { fetchAPI } from './base/api';
import { addTable } from './vue/store';

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
  let expiredIn = 7 * days;
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

function getTCTDate(now) {
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;
  let day = now.getUTCDate();
  function zeroPadding(number, length) {
    let result = String(number);
    while (result.length < length) {
      result = '0' + result;
    }
    return result;
  }
  return `${year}-${zeroPadding(month, 2)}-${zeroPadding(day, 2)}`;
}

function recordItems(newItems) {
  let now = new Date();
  let date = getTCTDate(now);
  let cityFinds = storage.get(storage.Keys.CityFinds) || {};
  let data = cityFinds[date];
  if (typeof data !== 'undefined') {
    // 今日数据已记录
    return;
  }
  cityFinds[date] = { items: newItems, time: now.getTime() };
  storage.set(storage.Keys.CityFinds, cityFinds);
}
function loadTableDataAsync() {
  getItemList().then(itemList => {
    let rows = [];
    let cityFinds = storage.get(storage.Keys.CityFinds) || {};
    for (const key in cityFinds) {
      let { items, time } = cityFinds[key];
      let date = new Date(time).toLocaleString([], { hour12: false });
      // 计算总价值
      let value = items.reduce((acc, val, idx) => {
        let { name, market_value } = itemList[val];
        return acc + Number(market_value);
      }, 0);

      rows.push({ date, count: items.length, value: formatMoney(value) })
    }

    addTable({
      title: 'cityFinds',
      cols: [
        {
          title: "日期",
          field: "date",
        },
        {
          title: "个数",
          field: "count",
        },
        {
          title: "总价值",
          field: "value",
        },
      ],
      rows,
    });
  }).catch(err => alert(err));
}

function alertFinds() {
  let itemIDs = getItemIDsOnMap();
  recordItems(itemIDs);

  if (itemIDs.length <= 0) {
    alert("0 item on the map");
    return;
  }
  getItemList().then(itemList => {
    let message = itemIDs.reduce((acc, val, idx) => {
      let { name, market_value } = itemList[val];
      return `${acc}\n${name} (${formatMoney(market_value)})`;
    }, `${itemIDs.length} items on the map:`);
    alert(message);
  }).catch(err => alert(err));
}

alertFinds();
loadTableDataAsync();
