import { fetchAPI } from './base/api';
import storage from './base/storage';
import { createReportTable, insertTopButton, insertContainer } from './base/dom';
import './base/report.css'

function ajaxComplete(success) {
  $(document).ajaxComplete((event, xhr, settings) => {
    if (xhr.readyState <= 3 || xhr.status != 200) {
      return;
    }
    success(xhr.responseText);
  });
}

const AddictionPoints = {
  can: 1,
  // ext,
  ket: 7,
  // lsd,
  // opi,
  // shr,
  // spe,
  // pcp,
  xan: 35,
  // vic,
};
const OverdosePoints = 100;
const NaturalDecayPoints = 21;

function naturalDecayTimes(fromDate, toDate) {
  // Fri Dec 25 2020 12:00:00 GMT+0800 (中国标准时间)
  const BaseTime = 1608868800000;
  const Day = 1000 * 60 * 60 * 24;
  let fromDays = Math.floor((new Date(fromDate).getTime() - BaseTime) / Day);
  let toDays = Math.floor((new Date(toDate).getTime() - BaseTime) / Day);
  console.log(toDays - fromDays);
  return toDays - fromDays;
}

/*
At 70 rehabs 1 rehab = 60 addiction points
At 112 rehabs 1 rehab = 55 addiction points
At 142 rehabs 1 rehab = 50 addiction points
At 168 rehabs 1 rehab ~ 46.2 addiction points?
At 190 rehabs 1 rehab ~ 42.75 addiction points?
At 241 rehabs 1 rehab ~ 40 addiction points?
At 283 rehabs 1 rehab = 35 addiction points
At 287 rehabs 1 rehab = 33 addiction points
At 356 rehabs 1 rehab ~ 31.6 addiction points
At 360 - 454 rehabs 1 rehab ~ 30 addiction points
At 529 rehabs 1 rehab = 24 addiction points
At 543 rehabs 1 rehab = 24 addiction points
At 655 rehabs 1 rehab = 24 addiction points
At 701 rehabs 1 rehab = 20 addiction points (sticking out)
At 731 rehabs 1 rehab = 24 addiction points (sticking out)
At 735 rehabs 1 rehab = 24 addiction points (sticking out)
At 854-1013 rehabs 1 rehab = 20 addiction points
At 1077 rehabs 1 rehab ~ 18.83 addiction points?
At 1965 rehabs 1 rehab = 15 addiction points?
At 6586 rehabs 1 rehab ~ 2.4 or ~ 2.6 addiction points?
At 10097 rehabs 1 rehab ~ 1.452 addiction points?
At 11140 rehabs 1 rehab ~ 1.282 addiction points?
At 24107 rehabs 1 rehab = 1.0 addiction points?
*/
function pointsPerRehab(totalRehabTimes) {
  if (totalRehabTimes >= 70 && totalRehabTimes < 112) {
    return 60;
  } else {
    // TODO:
    return 0;
  }
}

function calcPointsBeforeRehab(rehabPoints, lossPercentage) {
  // 解毒百分比取整到小数点后两位，例如66.30%
  return Math.round(((rehabPoints / (lossPercentage - 0.00005) + rehabPoints / (lossPercentage + 0.00005)) / 2));
}

const RehabRawDataKey = 'RehabRawDataKey';
const RehabDataKey = 'RehabDataKey';
let gSessionID;

function saveData(key, sessionID, dataObject) {
  let data = storage.get(key) || {};
  data[sessionID] = Object.assign(data[sessionID] || {}, dataObject);
  console.debug(key, JSON.stringify(data));
  storage.set(key, data);
}

function saveRehabRawData(sessionID, dataObject) {
  saveData(RehabRawDataKey, sessionID, dataObject);
}

function saveRehabData(sessionID, dataObject) {
  saveData(RehabDataKey, sessionID, dataObject);
}

function fetchDrugsInfo(sessionID) {
  fetchAPI('user', ['personalstats']).then(data => {
    let { personalstats } = data;
    let { rehabs, rehabcost, overdosed, cantaken, exttaken, kettaken, lsdtaken, opitaken, shrtaken, spetaken, pcptaken, xantaken, victaken } = personalstats;
    let drugsInfo = {
      totalRehabTimes: rehabs,
      totalRehabCost: rehabcost,
      overdosed,
      cantaken,
      exttaken,
      kettaken,
      lsdtaken,
      opitaken,
      shrtaken,
      spetaken,
      pcptaken,
      xantaken,
      victaken,
    }
    console.debug(JSON.stringify(drugsInfo));
    saveRehabData(sessionID, drugsInfo);
  });
}

function onRehabMessage(message) {
  gSessionID = new Date().getTime();
  let sessionID = gSessionID;
  console.debug(`rehab session: ${sessionID}`);
  saveRehabRawData(sessionID, { rehabMessage: message });
  let regexp = />(.*?)<\/span>/g;
  let matches = [];
  let match;
  while ((match = regexp.exec(message)) !== null) {
    matches.push(match[1]);
  }
  let rehabInfo = {
    addictionLoss: matches[0],
    rehabTimes: matches[1],
    rehabCost: matches[2],
    rehabDate: new Date().getTime(),
  }
  console.debug(JSON.stringify(rehabInfo));
  saveRehabData(sessionID, rehabInfo);
  fetchDrugsInfo(sessionID);
}

function onAfterRehabMessage(message) {
  let sessionID = gSessionID;
  console.debug(`after rehab session: ${sessionID}`);
  saveRehabRawData(sessionID, { afterRehabMessage: message });
  try {
    var messageObject = JSON.parse(message);
  } catch (e) { }
  if (typeof messageObject === 'undefined') {
    console.error(`invalid message: ${message}`);
    return;
  }
  let { addicted, text, money, max } = messageObject;
  console.debug(addicted, text, money, max);
  saveRehabData(sessionID, { addicted, timesToFullyRehab: max });
}

function showReport(className) {
  let cols = [
    { title: '解毒日期', field: 'rehabDate' },
    { title: "解毒百分比", field: 'addictionLoss' },
    { title: '解毒格数', field: 'rehabTimes' },
    { title: '剩余格数', field: 'timesToFullyRehab' },
    { title: '总解毒格数', field: 'totalRehabTimes' },
    { title: 'xanan个数', field: 'xantaken' },
    { title: 'OD次数', field: 'overdosed' },
    { title: '当前剩余AP', field: 'remainingPoints' },
    { title: '嗑药增加AP', field: 'drugPoints' },
    { title: '自然消退AP', field: 'decayPoints' },
    { title: 'AP变化量', field: 'deltaPoints' },
  ];
  let data = storage.get(RehabDataKey) || {};
  // fetchDrugsInfo if needed
  let latestSessionID = Object.keys(data).pop();
  if (latestSessionID && typeof data[latestSessionID].xantaken === 'undefined' && new Date().getTime() - data[latestSessionID].rehabDate <= 1000 * 60 * 60) {
    fetchDrugsInfo(latestSessionID);
  }
  // format rehabDate
  let rows = Object.values(data).map((record, index, dataArray) => {
    let drugPoints;
    let decayPoints;
    let remainingPoints;
    let deltaPoints;
    if (index > 0) {
      let lastRecord = dataArray[index - 1];
      drugPoints = Object.keys(AddictionPoints).reduce((acc, val, idx) => {
        let ap = Math.ceil(0.5 * AddictionPoints[val]); // faction perk - 50% ap
        let key = `${val}taken`;
        let drugsTaken = record[key] - lastRecord[key];
        let addictions = drugsTaken * ap;
        return acc + addictions;
      }, 0);
      decayPoints = naturalDecayTimes(lastRecord.rehabDate, record.rehabDate) * NaturalDecayPoints;

      // 上次解毒后到这次解毒前points的变化量
      remainingPoints = calPoints(record).pointsRemaining;
      deltaPoints = calPoints(record).pointsBeforeRehab - calPoints(lastRecord).pointsRemaining;
      function calPoints(record) {
        let rehabPoints = pointsPerRehab(record.totalRehabTimes) * record.rehabTimes;
        let lossPercentage = Number(record.addictionLoss.split("%")[0]) / 100;
        let pointsBeforeRehab = calcPointsBeforeRehab(rehabPoints, lossPercentage);
        let pointsRemaining = pointsBeforeRehab - rehabPoints;
        return { pointsBeforeRehab, pointsRemaining };
      }
    }

    let rehabDate = record.rehabDate ? new Date(record.rehabDate).toLocaleString([], { hour12: false }) : '-';
    return Object.assign(record, { rehabDate, drugPoints, decayPoints, remainingPoints, deltaPoints });
  })
  let el = createReportTable(cols, rows);
  el.className = className;
  insertContainer(el);
}

if (window.location.href.indexOf('index.php?page=rehab') >= 0) {
  ajaxComplete((responseText) => {
    if (responseText.indexOf('You have lost') >= 0) {
      onRehabMessage(responseText);
    } else if (responseText.indexOf('addicted') >= 0) {
      onAfterRehabMessage(responseText);
    }
  });
}
if (window.location.href.indexOf('index.php') >= 0) {
  insertTopButton('rehab_report_btn', 'Report', () => {
    let tableClassName = 'rehab-report';
    let reportElement = document.getElementsByClassName(tableClassName)[0];
    if (reportElement) {
      reportElement.remove();
    } else {
      showReport(tableClassName);
    }
  });
}