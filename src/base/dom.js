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
  console.log(process.env.NODE_ENV);
  document.getElementsByClassName('content-title')[0].insertAdjacentElement('afterend', el);
  // document.body.insertAdjacentElement('afterbegin', el);
}

module.exports = {
  createContainer,
  insertContainer,
};