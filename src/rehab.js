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

const RehabRawDataKey = 'RehabRawDataKey';
const RehabDataKey = 'RehabDataKey';

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

function onRehabMessage(sessionID, message) {
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

function onAfterRehabMessage(sessionID, message) {
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
  ];
  let data = storage.get(RehabDataKey) || {};
  // fetchDrugsInfo if needed
  let latestSessionID = Object.keys(data).pop();
  if (latestSessionID && typeof data[latestSessionID].xantaken === 'undefined' && new Date().getTime() - data[latestSessionID].rehabDate <= 1000 * 60 * 60) {
    fetchDrugsInfo(latestSessionID);
  }
  // format rehabDate
  let rows = Object.values(data).map(record => {
    let rehabDate = record.rehabDate ? new Date(record.rehabDate).toLocaleString([], { hour12: false }) : '-';
    return Object.assign(record, { rehabDate });
  })
  let el = createReportTable(cols, rows);
  el.className = className;
  insertContainer(el);
}

if (window.location.href.indexOf('index.php?page=rehab') >= 0) {
  let sessionID = new Date().getTime();
  ajaxComplete((responseText) => {
    if (responseText.indexOf('You have lost') >= 0) {
      onRehabMessage(sessionID, responseText);
    } else if (responseText.indexOf('addicted') >= 0) {
      onAfterRehabMessage(sessionID, responseText);
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