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

const OverdosePoints = {
  196: 0, // Cannabis
  197: 20, // Ecstasy
  198: 50, // Ketamine
  199: 50, // LSD
  200: 0, // Opium
  201: 50, // PCP
  203: 50, // Shrooms
  204: 50, // Speed
  205: 50, // Vicodin
  206: 100, // Xanax
}

// 计算某一时间之后的下次自然恢复时间
function nextNaturalRecoveryTime(time) {
  // BaseTime主要用于取整，可以为任意日期12点整的时间，这里取的是Fri Dec 25 2020 12:00:00 GMT+0800
  const BaseTime = 1608868800000
  const Day = 1000 * 60 * 60 * 24
  let days = Math.ceil((time - BaseTime) / Day)
  return BaseTime + days * Day
}

function formatDateString(timestamp) {
  return new Date(timestamp * 1000).toLocaleString([], { hour12: false })
}

// 按timestamp升序排序的compare function
function compareTimestamp(a, b) {
  if (a.timestamp < b.timestamp) return -1
  if (a.timestamp > b.timestamp) return 1
  return 0
}

// 按timestamp降序排序的compare function
function compareTimestampDesc(a, b) {
  if (a.timestamp < b.timestamp) return 1
  if (a.timestamp > b.timestamp) return -1
  return 0
}

class Rehab {
  constructor(original, loss, remaining) {
    this.original = original
    this.loss = loss
    this.remaining = remaining
  }
}

// 根据解毒百分比和解毒次数计算所有可行解
function calcCandidates(addiction, rehabTimes) {
  const MinPoints = 1
  const MaxPoints = 90
  let rehabPercentage = addiction / 100
  let candidates = []
  for (let i = MinPoints * rehabTimes; i <= MaxPoints * rehabTimes; i++) {
    let l = Math.floor(i / (rehabPercentage - 0.00005))
    let r = Math.ceil(i / (rehabPercentage + 0.00005))
    if (l == r) {
      candidates.push(new Rehab(l, i, l - i))
    }
  }
  return candidates
}

const NaturalRecoveryLogTitle = "Natural Recovery"
function filterDrugLogs(drugLogs, fromTime, toTime) {
  let filtered = drugLogs.filter((log) => {
    //TODO: cat=62则无需过滤Rehab
    if (log.title === 'Rehab') {
      return false
    }
    return fromTime < log.timestamp * 1000 && log.timestamp * 1000 < toTime
  })

  // create natural recovery logs
  // 2021.4.20 20:00 GMT+8 例行维护后自然消退改为了20
  const patchTime = 1618920000000
  let naturalRecoveryTime = nextNaturalRecoveryTime(fromTime)
  while (naturalRecoveryTime < toTime) {
    filtered.push({
      log: -1,
      title: NaturalRecoveryLogTitle,
      timestamp: naturalRecoveryTime / 1000,
      data: {
        points: naturalRecoveryTime > patchTime ? 20 : 21
      }
    })
    naturalRecoveryTime += 1000 * 60 * 60 * 24
  }

  // sort by timestamp
  filtered.sort(compareTimestamp)

  return filtered
}

function createDrugRows(logs, startPoints) {
  let points = startPoints
  return logs.map((log) => {
    let delta
    if (log.title === NaturalRecoveryLogTitle) {
      delta = - Math.min(points, log.data.points)
    } else {
      if (log.title.indexOf('overdose') >= 0) {
        delta = Math.round(OverdosePoints[log.data.item] * 0.5)
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

function createNullDrugRows(logs) {
  return logs.map((log) => {
    return {
      timestamp: log.timestamp,
      delta: null,
      points: null,
      description: log.title
    }
  })
}

function createTableRows(rehabLogs, drugLogs) {
  let tableRows = []
  // API默认返回按时间倒序，这里需要按时间顺序遍历
  for (let i = rehabLogs.length - 1; i > 0; i--) {
    let previousRehab = rehabLogs[i]
    let currentRehab = rehabLogs[i - 1]
    let fromTime = previousRehab.timestamp * 1000
    let toTime = currentRehab.timestamp * 1000

    // api默认返回100条数据，通常Rehab的间隔大于Drug的间隔，这里过滤掉早于最后一条Drug日志的Rehab日志，确保两次Rehab日志之间的Drug日志是完整的
    if (previousRehab.timestamp < drugLogs[drugLogs.length - 1].timestamp) {
      continue
    }

    // 两次Rehab之间的Drug日志，可能为空
    let filtered = filterDrugLogs(drugLogs, fromTime, toTime)

    // 计算所有的可行解
    let previousCandidates
    if (previousRehab.data.addiction === 100) {
      // previousRehab为100%全解，此时有无数个解，但计算只需要用到remaining
      previousCandidates = [new Rehab(null, null, 0)]
    } else {
      previousCandidates = calcCandidates(previousRehab.data.addiction, previousRehab.data.rehab_times)
    }
    let currentCandidates = calcCandidates(currentRehab.data.addiction, currentRehab.data.rehab_times)
    let solutions = []
    for (let i = 0; i < previousCandidates.length; i++) {
      for (let j = 0; j < currentCandidates.length; j++) {
        let testRows, points
        if (filtered.length) {
          testRows = createDrugRows(filtered, previousCandidates[i].remaining)
          points = testRows[testRows.length - 1].points
        } else {
          testRows = []
          points = previousCandidates[i].remaining
        }
        if (points == currentCandidates[j].original) {
          solutions.push({
            previous: previousCandidates[i],
            current: currentCandidates[j],
            rows: testRows
          })
        }
      }
    }

    // 如果可行解有多个，尝试增加约束条件
    if (solutions.length > 1) {
      console.log('ambiguous solutions:', solutions, 'for rehab:', currentRehab)
      if (tableRows.length > 0 && tableRows[tableRows.length - 1].points !== null) {
        console.log('trying to disambiguate')
        solutions = solutions.filter(solution => {
          return solution.previous.remaining == tableRows[tableRows.length - 1].points && solution.previous.loss == - tableRows[tableRows.length - 1].delta
        })
      } else {
        console.log('unable to disambiguate')
      }
      if (solutions.length == 1) {
        console.log('succeeded to disambiguate')
      } else {
        console.log('failed to disambiguate')
      }
    }

    if (solutions.length == 1) {
      tableRows = tableRows.concat(solutions[0].rows)
      tableRows.push({
        timestamp: currentRehab.timestamp,
        delta: - solutions[0].current.loss,
        points: solutions[0].current.remaining,
        description: `Rehab x${currentRehab.data.rehab_times} ${currentRehab.data.addiction}%`
      })
    } else {
      tableRows = tableRows.concat(createNullDrugRows(filtered))
      tableRows.push({
        timestamp: currentRehab.timestamp,
        delta: null,
        points: null,
        description: `Rehab x${currentRehab.data.rehab_times} ${currentRehab.data.addiction}%`
      })
    }
  }

  // 最后一次Rehab以后的Drug记录
  let fromTime = rehabLogs[0].timestamp * 1000
  let toTime = Date.now()
  let latestDrugLogs = filterDrugLogs(drugLogs, fromTime, toTime)
  let latestDrugRows
  if (tableRows[tableRows.length - 1].points != null) {
    latestDrugRows = createDrugRows(latestDrugLogs, tableRows[tableRows.length - 1].points)
  } else {
    latestDrugRows = createNullDrugRows(latestDrugLogs)
  }
  tableRows = tableRows.concat(latestDrugRows)

  return tableRows
}

async function fetchAPI(path, params) {
  let APIKey = localStorage.getItem("APIKey")
  if (!APIKey) {
    throw new Error('APIKey is missing')
  }

  params.key = APIKey
  params.comment = 'TornScripts'
  let query = Object.keys(params).map(key => `${key}=${params[key]}`).join('&')
  let url = `https://api.torn.com/${path}?${query}`

  return await fetch(url)
    .then((response) => {
      let statusCode = response.status
      if (statusCode >= 400 && statusCode < 600) {
        throw new Error(`Bad response ${statusCode}`);
      }
      return response;
    })
    .then((response) => response.json())
    .then(data => {
      if (data.error) {
        let { code, error } = data.error;
        throw new Error(`API error ${code} ${error}`)
      }
      return data
    })
    .catch((error) => {
      throw error
    });
}

if (window.location.href.indexOf('index.php') >= 0) {
  insertTopButton('drug_history_btn', 'Drug History', () => {
    (async () => {
      const drugs = await fetchAPI('user', {
        selections: 'log',
        cat: '61'
      }).catch(err => { console.error(err) })

      if (!drugs || !drugs.log) {
        return
      }

      const logs = Object.values(drugs.log).sort(compareTimestampDesc)

      // const drugs = require('./data/drug_log_2587304.json')
      // const logs = drugs.drug

      const LogTypeRehab = 6005
      const rehabLogs = logs.filter(record => record.log === LogTypeRehab)
      const drugLogs = logs.filter(record => record.log !== LogTypeRehab)

      let tableRows = createTableRows(rehabLogs, Object.values(drugLogs))
      let cols = [
        { title: '日期', field: 'date' },
        { title: "药瘾", field: 'points' },
        { title: '备注', field: 'description' },
      ];
      let rows = tableRows.map(row => {
        return {
          date: formatDateString(row.timestamp),
          points: `${row.points} (${row.delta > 0 ? '+' : ''}${row.delta})`,
          description: row.description
        }
      })
      let el = createReportTable(cols, rows, '');
      el.className = 'drug-history';
      overlayContainer(el);
    })()
  })
}
