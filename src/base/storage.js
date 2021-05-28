function get(key) {
  let value = localStorage.getItem(key);
  if (value != null) {
    return JSON.parse(value);
  }
  return null;
}

function set(key, value) {
  return localStorage.setItem(key, JSON.stringify(value));
}

function remove(key) {
  return localStorage.removeItem(key);
}

const Keys = {
  CityFinds: "StorageKeyCityFinds",
  RacingRecords: "racingRecordsKey",
  RacingRecordsIndex: "racingRecordsIndexKey",
  RacingRecordsQueryDate: "racingRecordsQueryDateKey",
  RacingPointsCache: "racingPointsCacheKey",
}

module.exports = { get, set, remove, Keys };