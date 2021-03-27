import { fetchAPI, userEvents } from './base/api';
import storage from './base/storage';
import { createReportTable, insertTopButton, insertContainer } from './base/dom';
import './base/report.css'

/*
<form name='docrime2' action='crimes.php?step=docrime4' method='post' class="special btn-wrap silver m-top10">
<input type='hidden' name='nervetake' value=''>
<input type='hidden' name='crime' value='warehouse'>
<div id="try_again" class="btn">
<button class="torn-btn">TRY AGAIN</button>
</div>
</form>
*/
function createCrime(name) {
  let form = document.createElement('form')
  form.name = 'docrime2'
  form.action = 'crimes.php?step=docrime4'
  form.method = 'post'
  form.className = 'special btn-wrap silver m-top10'
  form.innerHTML = `
<input type='hidden' name='nervetake' value=''>
<input type='hidden' name='crime' value='${name}'>
<div id="try_again" class="btn">
<button class="torn-btn">${name}</button>
</div>`
  return form
}
if (window.location.href.indexOf('crimes.php') >= 0) {
  let container = document.createElement('div')
  container.style = 'display:flex;flex-direction:row;'
  container.append(createCrime('warehouse'))
  insertContainer(container);
}
