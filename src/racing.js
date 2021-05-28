import { userEvents, fetchAPI } from './base/api';
import storage from './base/storage';
import { createContainer, insertContainer, insertTopButton, createReportTable } from './base/dom';
import './base/report.css';

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

function updateRacingRecords(currentSkillLevel) {
  let racingRecords = storage.get(storage.Keys.RacingRecords) || [];
  let racingRecordsIndex = storage.get(storage.Keys.RacingRecordsIndex) || {};
  let racingRecordsQueryDate = storage.get(storage.Keys.RacingRecordsQueryDate);
  // 当前skillLevel已被记录
  let latestRecord = racingRecords[racingRecords.length - 1];
  if (latestRecord && latestRecord.skillLevel === currentSkillLevel) {
    return;
  }
  function filter(eventObject) {
    return eventObject.event.indexOf('raceID') != -1;
  }
  function serializer(eventObject) {
    // 原始event示例："You finished <b>2nd</b> in the Withdrawal race. Your best lap was 01:54.03. [<a href = "http://www.torn.com/loader.php?sid=racing&tab=log&raceID=4911475">View</a>]"
    let regexp = /.*<b>(\w+)<\/b>.* (\w+) race.*raceID=(\d+)/g;
    let match = regexp.exec(eventObject.event);
    if (!match) return {};
    let position = match[1];
    let trackName = match[2];
    let raceID = match[3];
    return { position, trackName, raceID };
  }
  // from应为上次查询时间，to应为当前时间
  let now = Date.now();
  let yesterday = new Date(now - 1000 * 60 * 60 * 24);
  let from = racingRecordsQueryDate || yesterday;
  userEvents(from, now, filter, serializer).then(records => {
    if (!records.length) {
      console.error('something went wrong');
      return;
    }
    // 遍历records，添加新的record
    records.forEach(record => {
      let raceID = record.raceID;
      if (typeof racingRecordsIndex[raceID] !== 'undefined') {
        return;
      }
      racingRecords.push(record);
      racingRecordsIndex[raceID] = racingRecords.length - 1;
    });
    // 记录当前skillLevel
    racingRecords[racingRecords.length - 1].skillLevel = currentSkillLevel;
    // 存储更新后的racingRecords和racingRecordsIndex
    storage.set(storage.Keys.RacingRecords, racingRecords);
    storage.set(storage.Keys.RacingRecordsIndex, racingRecordsIndex);
    storage.set(storage.Keys.RacingRecordsQueryDate, now);
  });
}

function resetRacingRecords() {
  storage.remove(storage.Keys.RacingRecords);
  storage.remove(storage.Keys.RacingRecordsIndex);
  storage.remove(storage.Keys.RacingRecordsQueryDate);
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

function ui_addRacingReportButton() {
  insertTopButton('racing_report_btn', 'Report', () => {
    let tableClassName = 'racing-report';
    let reportElement = document.getElementsByClassName(tableClassName)[0];
    if (reportElement) {
      reportElement.remove();
    } else {
      showTable(tableClassName);
    }
  });
}

function showTable(className) {
  let racingRecords = storage.get(storage.Keys.RacingRecords);
  let cols = [
    {
      title: 'RaceID',
      field: 'raceID',
    },
    {
      title: 'TrackName',
      field: 'trackName',
    },
    {
      title: 'Position',
      field: 'position',
    },
    {
      title: 'SkillLevel',
      field: 'skillLevel',
    },
  ];
  let rows = racingRecords.map((record) => {
    let link = `<a href = "http://www.torn.com/loader.php?sid=racing&tab=log&raceID=${record.raceID}">${record.raceID}</a>`;
    let { trackName, position } = record;
    let skillLevel = record.skillLevel ? Number(record.skillLevel).toFixed(4) : '-';
    return { raceID: link, trackName, position, skillLevel };
  });
  let el = createReportTable(cols, rows);
  el.className = className;
  insertContainer(el);
}

// 比赛阶段显示名次
function parseRacingData(data) {
  let skillLevel = data['user']['racinglevel'];
  updateRacingRecords(skillLevel);
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
  const racingPointsCache = storage.get(storage.Keys.RacingPointsCache) || {};
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
    storage.set(storage.Keys.RacingPointsCache, racingPointsCache);
    return racingpointsearned;
  }
}

// 准备阶段显示对手分数
async function parseRacingData2(data) {
  // if (data.timeData.status >= 3) {
  //   return;
  // }
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
      ui_addRacingReportButton();
    } catch (e) { }
  });
}
