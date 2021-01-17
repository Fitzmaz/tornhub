import Vue from 'vue'
import App from './App.vue'
import { insertContainer, insertMenuItem } from '../base/dom'

function mount() {
  let app = document.createElement('div');
  app.id = 'app';
  // insertContainer(app);
  document.body.insertAdjacentElement('afterbegin', app);

  new Vue({
    el: '#app',
    render: h => h(App)
  })
}

insertMenuItem('VueApp', function() {
  mount();
});
// mount();
