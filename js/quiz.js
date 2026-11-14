// 한우리 어휘 퀴즈 (quiz.html)
// 주소 끝에 ?level=어휘1 처럼 붙이면 그 단계 화면이 바로 열려요 (QR코드용).
(function () {
  "use strict";
  var V = window.VOCAB || {};
  var LEVELS = Object.keys(V);
  var $ = function (id) { return document.getElementById(id); };
  var SECTIONS = ["levels", "setup", "cards", "quiz", "result"];
  var ROUND = 10;

  var st = { level: null, session: "전체", mode: null, pool: [], qs: [], i: 0, right: 0, wrong: [], card: 0 };

  function show(id) {
    SECTIONS.forEach(function (s) { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function wordsOf(level, session) {
    var out = [];
    (V[level] || []).forEach(function (s) {
      if (session === "전체" || s.session === session) s.words.forEach(function (w) { out.push(Object.assign({ session: s.session, type: s.type }, w)); });
    });
    return out;
  }
  // 예문 "[ ]" 부분을 강조(mark) 또는 빈칸으로 바꿔 넣기
  function fillSentence(node, ex, asGap) {
    ex.split(/(\[[^\]]*\])/).forEach(function (part) {
      if (/^\[.*\]$/.test(part)) {
        if (asGap) node.appendChild(el("span", "gap", "?"));
        else node.appendChild(el("mark", null, part.slice(1, -1)));
      } else if (part) node.appendChild(document.createTextNode(part));
    });
  }
  function answerForm(ex) { var m = ex.match(/\[([^\]]*)\]/); return m ? m[1] : ""; }

  // ---------- 1) 단계 ----------
  function renderLevels() {
    var box = $("levelList"); box.textContent = "";
    LEVELS.forEach(function (lv) {
      var b = el("button", "lv"); b.type = "button";
      b.appendChild(document.createTextNode(lv));
      var n = wordsOf(lv, "전체").length;
      b.appendChild(el("small", null, "낱말 " + n + "개"));
      b.addEventListener("click", function () { pickLevel(lv, true); });
      box.appendChild(b);
    });
  }
  function pickLevel(lv, push) {
    st.level = lv; st.session = "전체";
    $("title").textContent = lv + " 어휘 퀴즈";
    document.title = "한우리 어휘 퀴즈 - " + lv;
    if (push) try { history.replaceState(null, "", "?level=" + encodeURIComponent(lv)); } catch (e) {}
    renderSessions();
    show("setup");
  }
  function renderSessions() {
    var box = $("sessions"); box.textContent = "";
    var list = ["전체"].concat((V[st.level] || []).map(function (s) { return s.session; }));
    list.forEach(function (name) {
      var b = el("button", "chip", name); b.type = "button";
      b.setAttribute("aria-pressed", String(name === st.session));
      b.addEventListener("click", function () { st.session = name; renderSessions(); });
      box.appendChild(b);
    });
  }

  // ---------- 2) 낱말 카드 ----------
  function startCards() {
    st.pool = wordsOf(st.level, st.session); st.card = 0;
    if (!st.pool.length) return;
    renderCard(); show("cards");
  }
  function renderCard() {
    var w = st.pool[st.card];
    $("cardCount").textContent = (st.card + 1) + " / " + st.pool.length;
    $("cardTag").textContent = w.session + " · " + (w.c || w.type) + (w.p ? " · " + w.p : "");
    var f = $("cardFront"); f.textContent = w.w;
    if (w.h) f.appendChild(el("small", null, w.h));
    var b = $("cardBack"); b.textContent = w.m;
    if (w.u) b.appendChild(el("em", null, w.u));
    if (w.ex) { var em = el("em"); em.appendChild(document.createTextNode("예) ")); fillSentence(em, w.ex, false); b.appendChild(em); }
    b.hidden = true; f.hidden = false;
    $("cardHint").textContent = "눌러서 뜻 보기";
    $("prevCard").disabled = st.card === 0;
    $("nextCard").textContent = st.card === st.pool.length - 1 ? "처음부터" : "다음";
  }
  $("flip").addEventListener("click", function () {
    var b = $("cardBack"), f = $("cardFront"), open = b.hidden;
    b.hidden = !open; f.hidden = open;
    $("cardHint").textContent = open ? "다시 눌러서 낱말 보기" : "눌러서 뜻 보기";
  });
  $("prevCard").addEventListener("click", function () { if (st.card > 0) { st.card--; renderCard(); } });
  $("nextCard").addEventListener("click", function () { st.card = (st.card + 1) % st.pool.length; renderCard(); });

  // ---------- 3) 문제 ----------
  function buildQuestions(mode, fromWords) {
    var all = wordsOf(st.level, "전체");
    var base = fromWords || wordsOf(st.level, st.session);
    if (mode === "blank") base = base.filter(function (w) { return w.ex; });
    base = shuffle(base).slice(0, fromWords ? base.length : ROUND);
    return base.map(function (w) {
      // 보기: 같은 차시 낱말을 먼저, 모자라면 같은 단계 다른 차시에서
      var same = all.filter(function (x) { return x.w !== w.w && x.session === w.session && (mode !== "blank" || x.ex); });
      var other = all.filter(function (x) { return x.w !== w.w && x.session !== w.session; });
      var picks = shuffle(same).concat(shuffle(other)).map(function (x) { return x.w; })
        .filter(function (v, i, a) { return a.indexOf(v) === i && v !== w.w; }).slice(0, 3);
      return { word: w, choices: shuffle(picks.concat([w.w])) };
    });
  }
  function startQuiz(mode, fromWords) {
    st.mode = mode;
    st.qs = buildQuestions(mode, fromWords);
    if (!st.qs.length) { alertBox("이 차시에는 빈칸 문제가 없어요. 다른 놀이를 골라 주세요."); return; }
    st.i = 0; st.right = 0; st.wrong = [];
    renderQ(); show("quiz");
  }
  function alertBox(msg) {
    var p = el("p", "feedback bad", msg);
    var setup = $("setup"); setup.appendChild(p);
    setTimeout(function () { p.remove(); }, 2600);
  }
  function renderQ() {
    var q = st.qs[st.i], w = q.word;
    $("qCount").textContent = (st.i + 1) + " / " + st.qs.length;
    $("progress").style.width = (st.i / st.qs.length * 100) + "%";
    var qn = $("question"); qn.textContent = "";
    if (st.mode === "blank") {
      $("ask").textContent = "빈칸에 알맞은 낱말은?";
      fillSentence(qn, w.ex, true);
    } else {
      $("ask").textContent = "이런 뜻을 가진 낱말은?";
      qn.textContent = w.m;
    }
    var box = $("choices"); box.textContent = "";
    q.choices.forEach(function (c) {
      var b = el("button", "choice", c); b.type = "button";
      b.addEventListener("click", function () { answer(b, c); });
      box.appendChild(b);
    });
    $("feedback").hidden = true; $("next").hidden = true;
  }
  function answer(btn, c) {
    var q = st.qs[st.i], w = q.word, ok = c === w.w;
    Array.prototype.forEach.call($("choices").children, function (b) {
      b.disabled = true;
      if (b.textContent === w.w) b.classList.add("good");
    });
    if (!ok) btn.classList.add("bad");
    if (ok) st.right++; else st.wrong.push(w);
    var fb = $("feedback"); fb.textContent = ""; fb.className = "feedback " + (ok ? "good" : "bad");
    fb.appendChild(el("b", null, ok ? "정답이에요! 👏" : "아쉬워요! 정답은 '" + w.w + "'"));
    if (st.mode === "blank") {
      var form = answerForm(w.ex);
      var s = el("span"); fillSentence(s, w.ex, false); fb.appendChild(s);
      if (form !== w.w) fb.appendChild(el("div", null, "문장 속에서는 '" + form + "'(으)로 바뀌어 쓰였어요."));
      fb.appendChild(el("div", null, "뜻: " + w.m));
    } else {
      fb.appendChild(document.createTextNode(w.w + " : " + w.m));
    }
    fb.hidden = false;
    var n = $("next"); n.hidden = false;
    n.textContent = st.i === st.qs.length - 1 ? "결과 보기" : "다음 문제";
    n.focus({ preventScroll: true });
  }
  $("next").addEventListener("click", function () {
    st.i++;
    if (st.i < st.qs.length) renderQ(); else renderResult();
  });
  function renderResult() {
    var total = st.qs.length, r = st.right;
    $("score").textContent = r + " / " + total;
    var rate = r / total;
    $("scoreMsg").textContent = rate === 1 ? "모두 맞혔어요! 최고예요 🎉" : rate >= 0.7 ? "잘했어요! 틀린 낱말만 한 번 더 볼까요?" : "괜찮아요. 낱말 카드로 뜻을 다시 보고 도전해요!";
    var list = $("wrongList"); list.textContent = "";
    st.wrong.forEach(function (w) {
      var li = el("li"); li.appendChild(el("b", null, w.w)); li.appendChild(document.createTextNode(" : " + w.m)); list.appendChild(li);
    });
    $("wrongBox").hidden = !st.wrong.length;
    $("retryWrong").hidden = !st.wrong.length;
    show("result");
  }
  $("retry").addEventListener("click", function () { startQuiz(st.mode); });
  $("retryWrong").addEventListener("click", function () { startQuiz(st.mode, st.wrong.slice()); });

  // ---------- 공통 ----------
  Array.prototype.forEach.call(document.querySelectorAll(".mode"), function (b) {
    b.addEventListener("click", function () {
      var m = b.getAttribute("data-mode");
      if (m === "cards") startCards(); else startQuiz(m);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-back]"), function (b) {
    b.addEventListener("click", function () { renderSessions(); show("setup"); });
  });
  $("toLevels").addEventListener("click", function () {
    $("title").textContent = "한우리 어휘 퀴즈"; document.title = "한우리 어휘 퀴즈";
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
    show("levels");
  });

  renderLevels();
  var want = new URLSearchParams(location.search).get("level");
  if (want && V[want]) pickLevel(want, false); else show("levels");
})();
