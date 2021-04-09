import { fetchAPI, userEvents } from './base/api';
import storage from './base/storage';
import { createReportTable, insertTopButton, insertContainer, overlayContainer } from './base/dom';
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
  ext: 20,
  ket: 7,
  lsd: 20, //19-20
  opi: 10, //9-10
  shr: 6, //5-6
  spe: 14, //13-14
  pcp: 26, //25-26
  xan: 35,
  vic: 13,
};
const NaturalDecayPoints = 21;

const RehabRawDataKey = 'RehabRawDataKey';
const RehabDataKey = 'RehabDataKey';
const RehabPersonalStatsKey = 'RehabPersonalStatsKey';

function saveRehabPersonalStats() {
  let statsData = storage.get(RehabPersonalStatsKey) || {};
  let latestTimestamp = Object.keys(statsData).pop();
  // 最近一次travel还未到达目的地
  if (latestTimestamp && latestTimestamp > Date.now() / 1000) {
    console.debug('latest personalstats is not yet staled');
    return;
  }
  fetchAPI('user', ['basic', 'travel', 'personalstats']).then(data => {
    if (data && data.travel && data.travel.destination && data.personalstats) {
      let { destination, timestamp, departed, time_left } = data.travel;
      let { personalstats } = data;
      if (destination !== 'Switzerland') return;
      statsData[timestamp] = personalstats;
      storage.set(RehabPersonalStatsKey, statsData);
    }
  })
}

function overdoseBAPForDrug(drugName) {
  //TODO: 其他drug待明确
  if (drugName === 'xan') {
    return 100;
  } else if (drugName === 'ket') {
    return 50;
  } else {
    return 0;
  }
}

function naturalDecayTimes(fromDate, toDate) {
  // Fri Dec 25 2020 12:00:00 GMT+0800 (中国标准时间)
  const BaseTime = 1608868800000;
  const Day = 1000 * 60 * 60 * 24;
  let fromDays = Math.floor((new Date(fromDate).getTime() - BaseTime) / Day);
  let toDays = Math.floor((new Date(toDate).getTime() - BaseTime) / Day);
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

已确认：
At 70-89 rehabs 1 rehab = 60 addiction points
90+91+92=169
At 93-96 rehabs 1 rehab = 55 addiction points
97+98=109
*/
function pointsPerRehab(totalRehabTimes) {
  if (totalRehabTimes <= 0) {
    //TODO: 待确认
    return 0;
  } else if (totalRehabTimes < 70) {
    //TODO: 待确认
    return 0;
  } else if (totalRehabTimes < 91) {
    return 60;
  } else if (totalRehabTimes < 121) {
    return 54.5;
  } else if (totalRehabTimes < 151) {
    return 50;
  } else if (totalRehabTimes < 190) {
    //TODO: 待确认边界值，168-190之间
    return 46.2;
  } else {
    //TODO: 待确认
    return 0;
  }
}
function calcRehabPoints(before, after) {
  let points = 0;
  for (let i = before; i < after; i++) {
    points += pointsPerRehab(i);
  }
  return points;
}

function calcPointsBeforeRehab(rehabPoints, lossPercentage) {
  // 解毒百分比取整到小数点后两位，例如66.30%
  return Math.round(((rehabPoints / (lossPercentage - 0.00005) + rehabPoints / (lossPercentage + 0.00005)) / 2));
}

function estimatedRehabPoints(rehabs) {
  return 250000/(2857 + 12.85 * rehabs)
}

function calcEstimationCandidates(lossPercentage, rehabTimes, totalRehabTimes) {
  const estimated = estimatedRehabPoints(totalRehabTimes) * rehabTimes
  const error = estimated * 0.1
  let candidates = []
  for (let i = Math.floor(estimated - error); i <= Math.ceil(estimated + error); i++) {
    let l = Math.floor(i / (lossPercentage - 0.00005))
    let r = Math.ceil(i / (lossPercentage + 0.00005))
    if ( l == r ) {
      candidates.push({ original: l, loss: i, remaining: l - i })
    }
  }
  return candidates
}

function showEstimation(lossPercentage, rehabTimes, totalRehabTimes) {
  let cols = [
    { title: '毒瘾(AP)', field: 'original' },
    { title: "解毒(AP)", field: 'loss' },
    { title: '剩余(AP)', field: 'remaining' },
  ];
  let rows = calcEstimationCandidates(lossPercentage, rehabTimes, totalRehabTimes)
  let el = createReportTable(cols, rows);
  el.className = 'rehab-estimation';
  overlayContainer(el);
}

function estimate(rehabInfo) {
  fetchAPI('user', ['personalstats']).then(data => {
    let { personalstats } = data
    if (!personalstats) return
    let lossPercentage = Number(rehabInfo.addictionLoss.split("%")[0]) / 100
    let rehabTimes = Number(rehabInfo.rehabTimes)
    let totalRehabTimes = personalstats.rehabs
    showEstimation(lossPercentage, rehabTimes, totalRehabTimes)
  });
}

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

/*
这里假定OD后会立即去瑞士解毒，因此2次解毒之间最多只有1次OD，只需要查询从上次解毒到现在为止user.events包含overdose的所有事件，匹配最后一条事件的drugName。
OD事件消息例子：
You take some Xanax and down a glass of water. A headache is followed by nausea and vomiting. You must have overdosed!
You snort one bump of Ketamine for each nostril. You overdose.
 */
function checkOverdoseDrugName(sessionID, fromDate, toDate) {
  const UnknownDrugName = 'unknown';
  function filter(eventObject) {
    return eventObject.event.indexOf('overdose') != -1;
  }
  function serializer(eventObject) {
    let drugNames = Object.keys(AddictionPoints);
    let expString = `${drugNames.join('|')}`;
    let regexp = new RegExp(expString, 'i');
    let match = regexp.exec(eventObject.event);
    let overdoseDrugName;
    if (match) {
      overdoseDrugName = match[0].toLowerCase();
    } else {
      overdoseDrugName = UnknownDrugName;
    }
    return { overdoseDrugName, event: eventObject.event };
  }
  userEvents(fromDate, toDate, filter, serializer)
    .then(records => {
      if (!records.length) {
        console.debug('userEvents() result in 0 record');
        return;
      }
      // 最后一条记录（最后一次OD event）的drugName
      let lastRecord = records.pop();
      let { overdoseDrugName, event } = lastRecord;
      if (overdoseDrugName === UnknownDrugName) {
        console.debug(`overdoseDrugName is unknown, event: ${event}`);
        return;
      }
      console.info(`overdoseDrugName: ${overdoseDrugName}`);
      saveRehabData(sessionID, { overdoseDrugName });
    })
    .catch(err => {
      console.error(err);
    });
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

let gSession = {
  sessionID: null,
  startSession() {
    this.sessionID = new Date().getTime();
  },
  stopSession() {
    this.sessionID = null;
  },
};

function onRehabMessage(message) {
  gSession.startSession();
  let sessionID = gSession.sessionID;
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
  estimate(rehabInfo)
}

function onAfterRehabMessage(message) {
  let sessionID = gSession.sessionID;
  if (sessionID == null) {
    console.debug('sessionID is null');
    return;
  }
  gSession.stopSession();
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
    { title: 'xan个数', field: 'xantaken' },
    { title: 'ecs个数', field: 'exttaken' },
    { title: 'OD次数', field: 'overdosed' },
    { title: '嗑药增加AP', field: 'drugPoints' },
    { title: 'OD增加AP', field: 'overdosePoints' },
    { title: '自然消退AP', field: 'decayPoints' },
    { title: 'AP变化量', field: 'deltaPoints' },
    { title: '*解毒减AP', field: 'rehabPoints' },
    { title: '*当前剩余AP', field: 'remainingPoints' },
  ];
  let data = storage.get(RehabDataKey) || {};
  // checkOverdoseDrugName if needed
  Object.keys(data).forEach((sessionID, index, array) => {
    if (index <= 0) {
      return;
    }
    let lastRecord = data[array[index - 1]];
    let record = data[sessionID];
    if (record.overdoseDrugName) {
      return;
    }
    let odTimes = record.overdosed - lastRecord.overdosed;
    if (odTimes == 0) {
      return;
    }
    if (odTimes > 1) {
      console.error(`两次解毒之间OD次数大于1，当前sessionID: ${sessionID}`);
      return;
    }
    checkOverdoseDrugName(sessionID, lastRecord.rehabDate, record.rehabDate);
  });
  // 新数据的personalstats单独存储，填充data数据
  let personalstatsData = storage.get(RehabPersonalStatsKey) || {};
  Object.keys(personalstatsData).forEach((timestamp, index, array) => {
    let personalstats = personalstatsData[timestamp];
    if (index < array.length - 1) {
      let next = array[index + 1];
      let filtered = Object.values(data).filter((record) => {
        return timestamp < record.rehabDate / 1000 && record.rehabDate / 1000 < next;
      });
      fill(filtered, personalstats);
    } else {
      let filtered = Object.values(data).filter((record) => {
        return timestamp < record.rehabDate / 1000;
      });
      fill(filtered, personalstats);
    }
    function fill(filteredRecords, personalstats) {
      let accRehabTimes = 0;
      filteredRecords.forEach((record) => {
        accRehabTimes += Number(record.rehabTimes);
        let { rehabs, overdosed, cantaken, exttaken, kettaken, lsdtaken, opitaken, shrtaken, spetaken, pcptaken, xantaken, victaken } = personalstats;
        let drugsInfo = {
          totalRehabTimes: rehabs + accRehabTimes,
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
        };
        Object.assign(record, drugsInfo);
        console.info(`filled record: ${record}`)
      });
    }
  });
  // 根据data生成表格数据
  let rows = Object.values(data).map((record, index, dataArray) => {
    let addictionLoss = record.addictionLoss;
    let drugPoints;
    let overdosePoints;
    let decayPoints;
    let deltaPoints;
    let rehabPoints;
    let remainingPoints;
    if (index > 0) {
      let lastRecord = dataArray[index - 1];
      drugPoints = Object.keys(AddictionPoints).reduce((acc, val, idx) => {
        let ap = Math.ceil(0.5 * AddictionPoints[val]); // faction perk - 50% ap
        let key = `${val}taken`;
        let drugsTaken = record[key] - lastRecord[key];
        let addictions = drugsTaken * ap;
        return acc + addictions;
      }, 0);
      if (record.overdosed - lastRecord.overdosed > 0) {
        let { overdoseDrugName } = record;
        let overdoseDrugBAP = (overdoseDrugName && AddictionPoints[overdoseDrugName]) || 0;
        // drugPoints是根据*taken的差量计算的，如果OD了，要减去OD药物的AP
        drugPoints -= Math.ceil(0.5 * overdoseDrugBAP);
        overdosePoints = 0.5 * overdoseBAPForDrug(overdoseDrugName);
      } else {
        overdosePoints = 0;
      }
      decayPoints = naturalDecayTimes(lastRecord.rehabDate, record.rehabDate) * NaturalDecayPoints;
      deltaPoints = drugPoints + overdosePoints - decayPoints;

      // 这次解毒后的剩余points
      let calResult = calPoints(record);
      rehabPoints = calResult.pointsBeforeRehab - calResult.pointsRemaining;
      remainingPoints = calResult.pointsRemaining;
      let estimatedLoss = formatLoss(rehabPoints / (rehabPoints + remainingPoints));
      // override addictionLoss
      if (addictionLoss !== estimatedLoss) {
        addictionLoss = `${addictionLoss}(${estimatedLoss})`;
      }
      // 上次解毒后到这次解毒前points的变化量
      // deltaPoints = calPoints(record).pointsBeforeRehab - calPoints(lastRecord).pointsRemaining;
      function calPoints(record) {
        //TODO: 在总格数91-120阶段观察到有取整现象，解1格AP减55，解2格AP减109
        let rehabPoints = Math.round(calcRehabPoints(lastRecord.totalRehabTimes, record.totalRehabTimes));
        let lossPercentage = Number(record.addictionLoss.split("%")[0]) / 100;
        let pointsBeforeRehab = calcPointsBeforeRehab(rehabPoints, lossPercentage);
        let pointsRemaining = pointsBeforeRehab - rehabPoints;
        // if (record.addictionLoss !== formatLoss(rehabPoints / pointsBeforeRehab)) {
        //   // 解多格时出现rehabPoints比期望的值少1点的情况，原因暂未明确
        //   rehabPoints = rehabPoints - 1;
        //   pointsBeforeRehab = calcPointsBeforeRehab(rehabPoints, lossPercentage);
        //   pointsRemaining = pointsBeforeRehab - rehabPoints;
        // }
        return { pointsBeforeRehab, pointsRemaining };
      }
      function formatLoss(numberValue) {
        if (numberValue > 1 || numberValue < 0) {
          return 'invalid';
        }
        // 精确到小数点后两位
        let stringValue = (numberValue * 100).toFixed(2);
        // 移除末尾的'0'
        return Number(stringValue).toString() + '%';
      }
    }

    let rehabDate = record.rehabDate ? new Date(record.rehabDate).toLocaleString([], { hour12: false }) : '-';
    return Object.assign(Object.assign({}, record), { rehabDate, addictionLoss, drugPoints, overdosePoints, decayPoints, deltaPoints, rehabPoints, remainingPoints });
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
  saveRehabPersonalStats();
}