import { fetchAPI } from './base/api';
import storage from './base/storage';

function ajaxComplete(success) {
  $(document).ajaxComplete((event, xhr, settings) => {
    if (xhr.readyState <= 3 || xhr.status != 200) {
      return;
    }
    success(xhr, settings);
  });
}

function decodeBase64(data) {
  if (typeof atob !== "undefined") {
    return atob(data);
  }
  if (typeof Buffer !== "undefined") {
    let buff = new Buffer(data, 'base64');
    return buff.toString('ascii');
  }
  return null;
}

function ui_showPreciseSkill(level) {
  const skill = Number(level).toFixed(4);
  if ($('#racingMainContainer').find('div.skill').size() > 0) {
    $('#racingMainContainer').find('div.skill').text(skill);
  }
}

function ui_showResults(results) {
  for (let i = 0; i < results.length; i++) {
    let { playername, raceTime, bestLap, crashed } = results[i];
    $('#leaderBoard').children('li').each(function () {
      const name = $(this).find('li.name').text().trim();
      if (name == playername) {
        let place = crashed ? '!' : i + 1;
        $(this).find('li.name').html($(this).find('li.name').html().replace(name, `(${place}) ${name}`));
        return false;
      }
    });
  }
}

function ui_showRacingPoints(racingPointsInfo) {
  for (const userID in racingPointsInfo) {
    const { playername, racingPoints } = racingPointsInfo[userID];
    $('#leaderBoard').children('li').each(function () {
      const $name = $(this).find('li.name');
      const name = $name.text().trim();
      if (name.indexOf(playername) >= 0) {
        let newHTML = $name.html().replace(name, `${name} [${racingPoints}]`);
        $name.html(newHTML);
        return false;
      }
    });
  }
}

// 比赛阶段显示名次
function parseRacingData(data) {
  let skillLevel = data['user']['racinglevel'];
  ui_showPreciseSkill(skillLevel);

  if (data.timeData.status < 3) {
    return;
  }
  const carsData = data.raceData.cars;
  const trackIntervals = data.raceData.trackData.intervals.length;
  let results = [];

  for (const playername in carsData) {
    const intervals = decodeBase64(carsData[playername]).split(',');
    let raceTime = 0;
    let bestLap = 9999999999;

    if (intervals.length / trackIntervals == data.laps) {
      for (let i = 0; i < data.laps; i++) {
        let lapTime = 0;
        for (let j = 0; j < trackIntervals; j++) {
          lapTime += Number(intervals[i * trackIntervals + j]);
        }
        bestLap = Math.min(bestLap, lapTime);
        raceTime += Number(lapTime);
      }
      results.push({ playername, raceTime, bestLap, crashed: false });
    } else {
      results.push({ playername, raceTime: 9999999999, crashed: true });
    }
  }
  // sort by raceTime
  function compare(a, b) {
    if (a.raceTime > b.raceTime) return 1;
    if (a.raceTime < b.raceTime) return -1;
    return 0;
  }
  results.sort(compare);

  ui_showResults(results);
}

async function getRacingPoints(userID) {
  const racingPointsCacheKey = 'racingPointsCacheKey';
  const racingPointsCache = storage.get(racingPointsCacheKey) || {};
  const racingPointsInfo = racingPointsCache[userID];
  if (racingPointsInfo && Date.now() - racingPointsInfo.timestamp < 1000 * 60 * 60 * 24) {
    return racingPointsInfo.points;
  }
  const data = await fetchAPI('user', ['personalstats'], userID);
  let { personalstats } = data;
  if (personalstats) {
    let { racingpointsearned } = personalstats;
    racingPointsCache[userID] = {
      points: racingpointsearned,
      timestamp: Date.now()
    };
    storage.set(racingPointsCacheKey, racingPointsCache);
    return racingpointsearned;
  }
}

// 准备阶段显示对手分数
async function parseRacingData2(data) {
  if (data.timeData.status >= 3) {
    return;
  }
  const { carInfo } = data.raceData;
  let result = {};
  for (const key in carInfo) {
    const { userID, playername } = carInfo[key];
    let racingPoints = await getRacingPoints(userID);
    result[userID] = { playername, racingPoints};
  }
  ui_showRacingPoints(result);
}

if (window.location.href.indexOf('loader.php?sid=racing') >= 0) {
  ajaxComplete((xhr) => {
    try {
      const data = JSON.parse(xhr.responseText);
      parseRacingData(data);
      parseRacingData2(data);
    } catch (e) { }
  });
}
