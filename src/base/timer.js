function timeFormatter(time) {
  let hours = Math.floor((time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  let minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((time % (1000 * 60)) / 1000);
  let mseconds = Math.floor(time % 1000);
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  let formatted = hours + ":" + minutes + ":" + seconds;
  console.log(formatted);
  return formatted;
}

function startCountDown(duration, step, handler) {
  var timer = duration;
  setInterval(fire, 1000);
  fire();
  function fire() {
    handler(timer);
    timer = timer - step;
    if (timer < 0) {
      //TODO: 结束倒计时
      timer = duration;
    }
  }
}

module.exports = {
  timeFormatter,
  startCountDown,
};