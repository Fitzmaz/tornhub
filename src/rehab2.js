import { createReportTable, insertTopButton, overlayContainer } from './base/dom';
import './base/report.css'

const AddictionPoints = {
  196: 1, // Cannabis
  197: 20, // Ecstasy
  198: 7, // Ketamine
  199: 20, // LSD (19-20)
  200: 10, // Opium (9-10)
  201: 26, // PCP (25-26)
  203: 6, // Shrooms (5-6)
  204: 14, // Speed (13-14)
  205: 13, // Vicodin
  206: 35, // Xanax
}

const ODAddictionPoints = {
  196: 0, // Cannabis
  197: 0, // Ecstasy
  198: 50, // Ketamine
  199: 0, // LSD
  200: 0, // Opium
  201: 0, // PCP
  203: 0, // Shrooms
  204: 0, // Speed
  205: 0, // Vicodin
  206: 100, // Xanax
}

function nextNaturalDecayTime(time) {
  // Fri Dec 25 2020 12:00:00 GMT+0800 (中国标准时间)
  const BaseTime = 1608868800000
  const Day = 1000 * 60 * 60 * 24
  let days = Math.ceil((time - BaseTime) / Day)
  return BaseTime + days * Day
}

function getDateString(timestamp) {
  return new Date(timestamp * 1000).toLocaleString([], { hour12: false })
}

function compareTimestamp(a, b) {
  if (a.timestamp < b.timestamp) return -1
  if (a.timestamp > b.timestamp) return 1
  return 0
}

function calcCandidates(lossPercentage, rehabTimes) {
  const MinPoints = 1
  const MaxPoints = 90
  let candidates = []
  for (let i = MinPoints * rehabTimes; i <= MaxPoints * rehabTimes; i++) {
    let l = Math.floor(i / (lossPercentage - 0.00005))
    let r = Math.ceil(i / (lossPercentage + 0.00005))
    if (l == r) {
      candidates.push({ original: l, loss: i, remaining: l - i })
    }
  }
  return candidates
}

const NaturalDecayLogTitle = "NaturalDecayLogTitle"
function filterDrugLogs(drugLogs, fromTime, toTime) {
  let filtered = drugLogs.filter((log) => {
    //TODO: cat=62则无需过滤Rehab
    if (log.title === 'Rehab') {
      return false
    }
    return fromTime < log.timestamp * 1000 && log.timestamp * 1000 < toTime
  })

  // create natural decay logs
  // 2021.4.20 20:00 GMT+8 例行维护后自然消退改为了20
  const patchTime = 1618920000000
  let naturalDecayTime = nextNaturalDecayTime(fromTime)
  while (naturalDecayTime < toTime) {
    filtered.push({
      log: -1,
      title: NaturalDecayLogTitle,
      timestamp: naturalDecayTime / 1000,
      data: {
        points: naturalDecayTime > patchTime ? 20 : 21
      }
    })
    naturalDecayTime += 1000 * 60 * 60 * 24
  }

  // sort by timestamp
  filtered.sort(compareTimestamp)

  return filtered
}

function createDrugRows(logs, startPoints) {
  let points = startPoints
  return logs.map((log) => {
    let delta
    if (log.title === NaturalDecayLogTitle) {
      delta = - Math.min(points, log.data.points)
    } else {
      if (log.title.indexOf('overdose') >= 0) {
        delta = Math.round(ODAddictionPoints[log.data.item] * 0.5)
      } else {
        delta = Math.round(AddictionPoints[log.data.item] * 0.5)
      }
    }
    points += delta
    return {
      timestamp: log.timestamp,
      delta: delta,
      points: points,
      description: log.title
    }
  })
}

function createTableRows(rehabLogs, drugLogs) {
  let tableRows = []
  // API默认返回按时间倒序，这里需要按时间顺序遍历
  for (let i = rehabLogs.length - 1; i > 0 ; i--) {
    let previousRehab = rehabLogs[i]
    let currentRehab = rehabLogs[i - 1]
    let fromTime = previousRehab.timestamp * 1000
    let toTime = currentRehab.timestamp * 1000

    // api默认返回100条数据，通常Rehab的间隔大于Drug的间隔，
    if (previousRehab.timestamp < drugLogs[drugLogs.length - 1].timestamp) {
      continue
    }

    // 时间间隔内drug的log，可能为空
    let filtered = filterDrugLogs(drugLogs, fromTime, toTime)

    let previousCandidates = calcCandidates(previousRehab.data.addiction / 100, previousRehab.data.rehab_times)
    let currentCandidates = calcCandidates(currentRehab.data.addiction / 100, currentRehab.data.rehab_times)
    let previous, current, drugRows
    for (let i = 0; i < previousCandidates.length; i++) {
      let testRows, points
      if (filtered.length) {
        testRows = createDrugRows(filtered, previousCandidates[i].remaining)
        points = testRows[testRows.length - 1].points
      } else {
        testRows = []
        points = previousCandidates[i].remaining
      }
      let result = currentCandidates.filter(candidate => {
        return candidate.original == points
      })
      if (result.length == 0) continue
      if (result.length > 1) {
        console.debug(`more then 1 results`)
      }
      previous = previousCandidates[i]
      current = result[0]
      drugRows = testRows
      break
    }

    if (tableRows.length == 0) {
      tableRows.push({
        timestamp: previousRehab.timestamp,
        delta: - previous.loss,
        points: previous.remaining,
        description: `Rehab x${previousRehab.data.rehab_times} ${previousRehab.data.addiction}%`
      })
    }

    tableRows = tableRows.concat(drugRows)

    tableRows.push({
      timestamp: currentRehab.timestamp,
      delta: - current.loss,
      points: current.remaining,
      description: `Rehab x${currentRehab.data.rehab_times} ${currentRehab.data.addiction}%`
    })
  }

  // 最近一次Rehab以后的Drug记录
  let fromTime = rehabLogs[0].timestamp * 1000
  let toTime = drugLogs[0].timestamp * 1000 + 1
  let latestDrugLogs = filterDrugLogs(drugLogs, fromTime, toTime)
  let latestDrugRows = createDrugRows(latestDrugLogs, tableRows[tableRows.length - 1].points)
  tableRows = tableRows.concat(latestDrugRows)

  return tableRows
}

async function fetchLogs() {
  let APIKey = localStorage.getItem("APIKey");
  let rehabLogsUrl = `https://api.torn.com/user/?selections=log&log=6005&key=${APIKey}&comment=TornScripts`
  let drugLogsUrl = `https://api.torn.com/user/?selections=log&cat=62&key=${APIKey}&comment=TornScripts`

  const rehabLogs = await fetch(rehabLogsUrl).then(response => response.json())
  const drugLogs = await fetch(drugLogsUrl).then(response => response.json())
  return { rehabLogs, drugLogs }
}

if (window.location.href.indexOf('index.php') >= 0) {
  insertTopButton('drug_history_btn', 'Drug History', () => {
    fetchLogs().then(data => {
      let { rehabLogs, drugLogs } = data
      let tableRows = createTableRows(Object.values(rehabLogs.log), Object.values(drugLogs.log))
      let cols = [
        { title: '日期', field: 'date' },
        { title: "药瘾", field: 'points' },
        { title: '备注', field: 'description' },
      ];
      let rows = tableRows.map(row => {
        return {
          date: getDateString(row.timestamp),
          points: `${row.points} (${row.delta > 0 ? '+' : ''}${row.delta})`,
          description: row.description
        }
      })
      let el = createReportTable(cols, rows, '');
      el.className = 'drug-history';
      overlayContainer(el);
    })
  });
}
