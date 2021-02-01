function makeUrl(key, section, fields, userID, from, to) {
  userID = userID || "";
  let selections = fields.join(",");
  let fromTimestamp = new Date(from).getTime() / 1000;
  let toTimestamp = new Date(to).getTime() / 1000;
  let range = (fromTimestamp && toTimestamp) ? `&from=${fromTimestamp}&to=${toTimestamp}` : "";
  let url = `https://api.torn.com/${section}/${userID}?selections=${selections}&key=${key}${range}`;
  return url;
}

let requestHistory = {
  requestTime: {},
  willHitCache(url) {
    let { pathname } = new URL(url);
    let time = this.requestTime[pathname];
    // 30s内请求同一api返回的结果会命中缓存
    return Date.now() - time <= 1000 * 30;
  },
  recordRequestTime(url) {
    let { pathname } = new URL(url);
    this.requestTime[pathname] = Date.now();
  }
}

function fetchAPI(section, fields, userID, from, to) {
  //TODO: stored by icefrog
  let APIKey = localStorage.getItem("APIKey");
  if (APIKey == null) {
    return Promise.reject("APIKey not found");
  }
  let url = makeUrl(APIKey, section, fields, userID, from, to);
  if (requestHistory.willHitCache(url)) {
    return Promise.reject('this request will hit cache');
  }
  requestHistory.recordRequestTime(url);
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          let { code, error } = data.error;
          reject(`API request failed. code: ${code}. reason: ${error}`)
          return;
        }
        resolve(data);
      })
      .catch(err => reject(err));
  });
}

function userEvents(from, to, filter, translator) {
  return new Promise((resolve, reject) => {
    fetchAPI('user', ['events'], null, from, to)
      .then(data => {
        let filteredEvents = [];
        let events = data.events;
        for (const key in events) {
          let eventObject = events[key];
          if (filter && !filter(eventObject)) {
            continue;
          }
          if (translator) {
            filteredEvents.push(translator(eventObject));
          } else {
            filteredEvents.push(eventObject);
          }
        }
        resolve(filteredEvents);
      })
      .catch(err => reject(err));
  });
}

module.exports = { fetchAPI, userEvents };