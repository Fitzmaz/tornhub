import { insertContainerUnique } from './base/dom'
import storage from './base/storage'

function ajaxComplete(success) {
  $(document).ajaxComplete((event, xhr, settings) => {
    if (xhr.readyState <= 3 || xhr.status != 200) {
      return;
    }
    success(xhr, settings);
  });
}

const RecentCrimesKey = 'RecentCrimesKey'

/*
<form name='docrime2' action='crimes.php?step=docrime4' method='post' class="special btn-wrap silver m-top10">
<input type='hidden' name='nervetake' value=''>
<input type='hidden' name='crime' value='warehouse'>
<div id="try_again" class="btn">
<button class="torn-btn">TRY AGAIN</button>
</div>
</form>
*/
function createCrime(name, action) {
  let form = document.createElement('form')
  form.name = 'crimes'
  form.method = 'post'
  form.action = action
  form.className = 'special btn-wrap silver m-top10'
  form.innerHTML = `
<input type='hidden' name='nervetake' value=''>
<input type='hidden' name='crime' value='${name}'>
<div id="try_again" class="btn">
<button class="torn-btn">${name}</button>
</div>`
  return form
}

function getCrimeName(item) {
  let crimeName
  for (const input of item.querySelectorAll('input')) {
    if (input.getAttribute('name') !== 'crime') continue
    crimeName = input.getAttribute('value')
  }
  return crimeName
}

function addButtons() {
  let crimes = storage.get(RecentCrimesKey) || []

  //
  if (crimes.length > 0) {
    let container = document.createElement('div')
    container.style = 'display:flex;flex-direction:row;'
    container.className = 'quick-crime'
    for (const crime of crimes) {
      container.append(createCrime(crime.name, crime.action))
    }
    insertContainerUnique(container)
  }

  // setup only once
  let form = document.querySelector('.specials-cont-wrap > form')
  if (!form || form.getAttribute('quick-crime-setup')) return
  form.setAttribute('quick-crime-setup', true)

  // skip step=docrime
  let action = form.getAttribute('action')
  let step = action.split('step=')[1]
  if (step === 'docrime') return

  document.querySelectorAll('.item').forEach(item => {
    let crimeName = getCrimeName(item)
    item.onclick = function () {
      let newCrimes = []
      for (const crime of crimes) {
        if (crime.name != crimeName) {
          newCrimes.push(crime)
        }
        if (newCrimes.length >= 2) {
          break
        }
      }
      newCrimes.splice(0, 0, { name: crimeName, action })
      storage.set(RecentCrimesKey, newCrimes)
    }
  })
}

if (window.location.href.indexOf('crimes.php') >= 0) {
  ajaxComplete((responseText) => {
    addButtons();
  });
  addButtons();
}
