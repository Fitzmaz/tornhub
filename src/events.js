import { userEvents } from './base/api';
import storage from './base/storage';
import { createContainer, insertContainer } from './base/dom';

const attackedRecordsKey = 'attackedRecordsKey';

function updateattackedRecords() {
  let attackedRecords = {};
  function filter(eventObject) {
    return eventObject.event.indexOf('attacked you but') != -1;
  }
  function serializer(eventObject) {
    // 原始event示例：<a href = "http://www.torn.com/profiles.php?XID=2616269">ElPocasTrancas</a> attacked you but lost [<a href = "http://www.torn.com/loader.php?sid=attackLog&ID=ea66fbecabeac69c43434af19c6d61eb">view</a>]
    //TODO: Someone attacked you [<a href = "http://www.torn.com/loader.php?sid=attackLog&ID=64df7e9eec7bd6a074cf22520d431986">view</a>]
    let regexp = /.*XID=(\d+)">(\w+)<\/a> attacked you but (\w+) /g;
    let match = regexp.exec(eventObject.event);
    if (!match) return {};;
    let userID = match[1];
    let userName = match[2];
    let result = match[3];
    return { userID, userName, result };
  }
  let now = Date.now();
  let yesterday = new Date(now - 1000 * 60 * 60 * 24 * 30);
  let from = yesterday;
  userEvents(from, now, filter, serializer).then(records => {
    if (!records.length) {
      console.log('no data');
      return;
    }
    // 遍历records，添加新的record
    records.forEach(record => {
      let userID = record.userID;
      let saved = attackedRecords[userID] || {};
      saved.userID = userID;
      saved.userName = record.userName;
      if (record.result === 'lost') {
        saved.losses = saved.losses ? saved.losses + 1 : 1;
      } else if (record.result === 'stalemated') {
        saved.stalemates = saved.stalemates ? saved.stalemates + 1 : 1;
      } else if (record.result === 'escaped') {
        saved.escapes = saved.escapes ? saved.escapes + 1 : 1;
      }
      attackedRecords[userID] = saved;
    });
    storage.set(attackedRecordsKey, attackedRecords);
    ui_showTable();
  });
}

function ui_showTable() {
  let attackedRecords = storage.get(attackedRecordsKey);
  let html = `
		<table>
			<thead>
				<tr>
					<th>UserName</th>
					<th>Losses</th>
					<th>Stalemates</th>
					<th>Escapes</th>
				</tr>
			</thead>
			<tbody>
  `;
  for (const key in attackedRecords) {
    let record = attackedRecords[key];
    let { userID, userName } = record;
    let losses = record.losses || 0;
    let stalemates = record.stalemates || 0;
    let escapes = record.escapes || 0;
    html += `
      <tr>
        <td>
          <a href = "https://www.torn.com/profiles.php?XID=${userID}">${userName}</a>
        </td>
        <td>${losses}</td>
        <td>${stalemates}</td>
        <td>${escapes}</td>
      </tr>
    `;
  }
  html += "</tbody></table>";

  let el = createContainer('Report', html);
  insertContainer(el);
}

if (window.location.href.indexOf('events.php') >= 0) {
  updateattackedRecords();
}

