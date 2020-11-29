import { fetchAPI } from './base/api';
import storage from './base/storage';
import { createContainer, insertContainer } from './base/dom';
import { timeFormatter, startCountDown } from './base/timer';

const DidFetchAPIKey = "DidFetchAPIKey";
const DrugCDTimeKey = "DrugCDKey";
const MedCDTimeKey = "MedCDKey";
const BoosterCDTimeKey = "BoosterCDKey";

function updateCooldowns(currentTime, handler) {
  let didFetchAPI = storage.get(DidFetchAPIKey);
  let drugCDTime = storage.get(DrugCDTimeKey);
  let medCDTime = storage.get(MedCDTimeKey);
  let boosterCDTime = storage.get(BoosterCDTimeKey);
  if (didFetchAPI) {
    handler(drugCDTime, medCDTime, boosterCDTime);
    return;
  }
  fetchAPI("user", ["cooldowns"])
    .then(data => {
      let { cooldowns } = data;
      let { drug, medical, booster } = cooldowns;
      //TODO: 没有cd时
      if (drug) {
        drugCDTime = currentTime + drug * 1000;
        storage.set(DrugCDTimeKey, drugCDTime);
      }
      if (medical) {
        medCDTime = currentTime + medical * 1000;
        storage.set(MedCDTimeKey, medCDTime);
      }
      if (booster) {
        boosterCDTime = currentTime + booster * 1000;
        storage.set(BoosterCDTimeKey, boosterCDTime);
      }
      storage.set(DidFetchAPIKey, true);
      handler(drugCDTime, medCDTime, boosterCDTime);
    })
    .catch(err => {
      console.error(err);
    });
}

function showCooldowns() {
  let drugCDLabelClass = 'drug-cd-label';
  let medCDLabelClass = 'med-cd-label';
  let boosterCDLabelClass = 'booster-cd-label';
  let html = `
    <table>
      <tbody>
        <tr>
          <td>Drug CD</td>
          <td class="${drugCDLabelClass}">-</td>
        </tr>
        <tr>
          <td>Med CD</td>
          <td class="${medCDLabelClass}">-</td>
        </tr>
        <tr>
          <td>Booster CD</td>
          <td class="${boosterCDLabelClass}">-</td>
        </tr>
      </tbody>
    </table>`;
  let el = createContainer('Cooldowns', html);
  insertContainer(el);
  let currentTime = new Date().getTime();
  updateCooldowns(currentTime, (drugCDTime, medCDTime, boosterCDTime) => {
    // start countdown
    countdown(drugCDLabelClass, drugCDTime);
    countdown(medCDLabelClass, medCDTime);
    countdown(boosterCDLabelClass, boosterCDTime);
    function countdown(labelClass, countdownTime) {
      let label = document.getElementsByClassName(labelClass)[0];
      startCountDown(countdownTime - currentTime, 1000, time => {
        label.textContent = timeFormatter(time);
      });
    }
  });
}

if (window.location.href.indexOf('item.php') >= 0) {
  // 访问过item页面，需要重新请求API
  storage.remove(DidFetchAPIKey);
}
if (window.location.href.indexOf('travelagency.php') >= 0) {
  showCooldowns();
}
