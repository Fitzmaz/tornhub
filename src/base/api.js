function makeUrl(key, section, fields, userID, from, to) {
  userID = userID || "";
  let selections = fields.join(",");
  let fromTimestamp = new Date(from).getTime() / 1000;
  let toTimestamp = new Date(to).getTime() / 1000;
  let range = (fromTimestamp && toTimestamp) ? `&from=${fromTimestamp}&to=${toTimestamp}` : "";
  let url = `https://api.torn.com/${section}/${userID}?selections=${selections}&key=${key}${range}`;
  return url;
}

function fetchAPI(section, fields, userID, from, to) {
  //TODO: stored by icefrog
  let APIKey = localStorage.getItem("APIKey");
  if (APIKey == null) {
    return Promise.reject("APIKey not found");
  }
  let url = makeUrl(APIKey, section, fields, userID, from, to);
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