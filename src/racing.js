import { userEvents } from './base/api';
import storage from './base/storage';
import { createContainer } from './base/dom';
import './racing.css';

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

function formatTimeMsec(msec) {
  function pad(num, size) {
    return ('000000000' + num).substr(-size);
  }
  const hours = Math.floor((msec % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((msec % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((msec % (1000 * 60)) / 1000);
  const mseconds = Math.floor(msec % 1000);
  return (hours > 0 ? hours + ":" : '') + (hours > 0 || minutes > 0 ? pad(minutes, 2) + ":" : '') + pad(seconds, 2) + "." + pad(mseconds, 3);
}

const racingRecordsKey = 'racingRecordsKey';
const racingRecordsIndexKey = 'racingRecordsIndexKey';
const racingRecordsQueryDateKey = 'racingRecordsQueryDateKey';

function updateRacingRecords(currentSkillLevel) {
  let racingRecords = storage.get(racingRecordsKey) || [];
  let racingRecordsIndex = storage.get(racingRecordsIndexKey) || {};
  let racingRecordsQueryDate = storage.get(racingRecordsQueryDateKey);
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
    storage.set(racingRecordsKey, racingRecords);
    storage.set(racingRecordsIndexKey, racingRecordsIndex);
    storage.set(racingRecordsQueryDateKey, now);
  });
}

function resetRacingRecords() {
  storage.remove(racingRecordsKey);
  storage.remove(racingRecordsIndexKey);
  storage.remove(racingRecordsQueryDateKey);
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
        const best = bestLap ? formatTimeMsec(bestLap * 1000) : null;
        $(this).find('li.name').html($(this).find('li.name').html().replace(name, `(${place}) ${name}` + (best ? ` (${best})` : '')));
        return false;
      }
    });
  }
}

function ui_addRacingReportButton() {
  const $top_links = $("#top-page-links-list").children("a");
  if ($top_links.length <= 0 || $("#racing_report_btn").length) {
    return;
  }
  const racingReportButton = '<a role="button" style="cursor: pointer" id="racing_report_btn" aria-labelledby="events" class=" events t-clear h c-pointer  m-icon line-h24 right last"><span class="icon-wrap svg-icon-wrap"><span class="link-icon-svg events "><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 17"><defs><style>.cls-1{opacity:0.35;}.cls-2{fill:#fff;}.cls-3{fill:#777;}</style></defs><g id="Ð¡Ð»Ð¾Ð¹_2" data-name="Ð¡Ð»Ð¾Ð¹ 2"><g id="icons"><g class="cls-1"><path class="cls-2" d="M8,1a8,8,0,1,0,8,8A8,8,0,0,0,8,1ZM6.47,3.87H9.53l-.77,7.18H7.24ZM8,14.55A1.15,1.15,0,1,1,9.15,13.4,1.14,1.14,0,0,1,8,14.55Z"></path></g><path class="cls-3" d="M8,0a8,8,0,1,0,8,8A8,8,0,0,0,8,0ZM6.47,2.87H9.53l-.77,7.18H7.24ZM8,13.55A1.15,1.15,0,1,1,9.15,12.4,1.14,1.14,0,0,1,8,13.55Z"></path></g></g></svg></span></span><span id="click_view_factions_text">Report</span></a>';
  $top_links.last().after(racingReportButton);
  $("#racing_report_btn").click(function () {
    let reportElement = document.getElementsByClassName('racing-report')[0];
    if (reportElement) {
      reportElement.remove();
    } else {
      showTable();
    }
  });
}

function showTable() {
  let racingRecords = storage.get(racingRecordsKey);
  let html = `
		<table>
			<thead>
				<tr>
					<th>RaceID</th>
					<th>TrackName</th>
					<th>Position</th>
					<th>SkillLevel</th>
				</tr>
			</thead>
			<tbody>
  `;
  racingRecords.forEach(record => {
    let skillLevel = record.skillLevel ? Number(record.skillLevel).toFixed(4) : '-';
    html += `
      <tr>
        <td>
          <a href = "http://www.torn.com/loader.php?sid=racing&tab=log&raceID=${record.raceID}">${record.raceID}</a>
        </td>
        <td>${record.trackName}</td>
        <td>${record.position}</td>
        <td>${skillLevel}</td>
      </tr>
    `;
  });
  html += "</tbody></table>";

  let el = createContainer('Report', html);
  el.className = 'racing-report';
  document.getElementsByClassName('content-title')[0].insertAdjacentElement('afterend', el);
}

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

if (window.location.href.indexOf('loader.php?sid=racing') >= 0) {
  ajaxComplete((xhr) => {
    try {
      parseRacingData(JSON.parse(xhr.responseText));
      ui_addRacingReportButton();
    } catch (e) { }
  });
}
