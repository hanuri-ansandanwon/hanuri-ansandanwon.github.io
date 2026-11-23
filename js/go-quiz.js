// 어휘 퀴즈·중학 한자어는 hanuri-ansandanwon.github.io/quiz/ 로 옮겼어요. 옛 주소로 오면 새 주소로 보내요 (?level= 등 그대로)
(function () {
  var page = /hanja\.html$/.test(location.pathname) ? "hanja.html" : "";
  location.replace("/quiz/" + page + location.search + location.hash);
})();
