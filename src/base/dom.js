function createContainer(title, content) {
  let el = document.createElement('div');
  el.innerHTML = `
    <div class="title-black top-round m-top10">
      <span class="title">${title}</span>
    </div>
    <div class="content bottom-round"></div>
  `;
  el.querySelector('.content').innerHTML = content;
  return el;
}

function insertContainer(el) {
  let contentTitle = document.getElementsByClassName('content-title')[0];
  if (contentTitle) {
    contentTitle.insertAdjacentElement('afterend', el);
  } else {
    document.body.insertAdjacentElement('afterbegin', el);
  }
}

function insertContainerUnique(el) {
  let existence = document.getElementsByClassName(el.className)[0];
  if (!existence) {
    insertContainer(el);
  }
}

function overlayContainer(el) {
  let container = document.createElement('div');
  container.className = 'overlay-container';

  let content = document.createElement('div');
  content.className = 'overlay-content';
  content.appendChild(el);
  container.appendChild(content);

  let close = document.createElement('div');
  close.className = 'overlay-close';
  close.innerText = '关闭';
  close.onclick = function () {
    container.parentElement.removeChild(container);
  }
  container.appendChild(close);

  document.body.insertAdjacentElement('beforeend', container);
}

function insertTopButton(id, title, onClick) {
  if (typeof $ === 'undefined') {
    let button = document.createElement('div')
    button.innerText = title
    button.onclick = onClick
    document.body.insertAdjacentElement('beforeend', button)
    return
  }
  const $top_links = $("#top-page-links-list").children("a");
  if ($top_links.length <= 0 || $(`#${id}`).length) {
    return;
  }
  const button = `<a role="button" style="cursor: pointer" id="${id}" aria-labelledby="events" class="events t-clear h c-pointer m-icon line-h24 right last"><span class="icon-wrap svg-icon-wrap"><span class="link-icon-svg events"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 17"><defs><style>.cls-1{opacity:0.35;}.cls-2{fill:#fff;}.cls-3{fill:#777;}</style></defs><g id="Ð¡Ð»Ð¾Ð¹_2" data-name="Ð¡Ð»Ð¾Ð¹ 2"><g id="icons"><g class="cls-1"><path class="cls-2" d="M8,1a8,8,0,1,0,8,8A8,8,0,0,0,8,1ZM6.47,3.87H9.53l-.77,7.18H7.24ZM8,14.55A1.15,1.15,0,1,1,9.15,13.4,1.14,1.14,0,0,1,8,14.55Z"></path></g><path class="cls-3" d="M8,0a8,8,0,1,0,8,8A8,8,0,0,0,8,0ZM6.47,2.87H9.53l-.77,7.18H7.24ZM8,13.55A1.15,1.15,0,1,1,9.15,12.4,1.14,1.14,0,0,1,8,13.55Z"></path></g></g></svg></span></span><span id="click_view_factions_text">${title}</span></a>`;
  $top_links.last().after(button);
  $(`#${id}`).click(onClick);
}

function insertMenuItem(title, handler) {
  const $menu = $('button.header-menu-icon');
  $menu.on('click', function () {
    setTimeout(addItem, 0);
    function addItem() {
      let aElement = document.createElement('a');
      aElement.href = 'javascript:void(0)';
      aElement.text = title;
      aElement.onclick = handler;

      let liElement = document.createElement('li');
      liElement.className = 'menu-item-link';
      liElement.appendChild(aElement);
      document.body.appendChild(liElement);

      document.querySelector('ul.menu-items').insertAdjacentElement('afterbegin', liElement);
    }
  });
}

function createReportTable(cols, rows, title) {
  function arrayToHtml(array, tag, className) {
    return array.reduce((acc, val, idx) => {
      return `${acc}<${tag} class="${className}">${val}</${tag}>`;
    }, '');
  }
  let titles = cols.map(col => col.title);
  let html = `
		<table class="report-table">
			<thead>
        <tr>
          ${arrayToHtml(titles, 'th', 'report-th')}
				</tr>
			</thead>
			<tbody>
  `;
  rows.forEach(row => {
    let vals = cols.map(col => row[col.field]);
    html += `
      <tr>
        ${arrayToHtml(vals, 'td', 'report-td')}
      </tr>
    `;
  });
  html += "</tbody></table>";

  let containerTitle = typeof title === 'undefined' ? 'Report' : title
  return createContainer(containerTitle, html);
}

module.exports = {
  overlayContainer,
  createContainer,
  insertContainer,
  insertContainerUnique,
  insertTopButton,
  insertMenuItem,
  createReportTable,
};