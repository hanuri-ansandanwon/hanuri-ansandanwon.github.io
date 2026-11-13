// 중학 한자어·사자성어 퀴즈 (hanja.html)
// 어휘1~17 회차 → 회차마다 5단계: 1 한자어 1~5 · 2 한자어 6~10 · 3 사자성어 1~5 · 4 사자성어 6~10 · 5 종합 복습(20개)
// 단계마다 먼저 카드로 공부 → 게임(하트 3개·콤보·문제당 20초). 하트가 남은 채로 끝까지 가면 통과, 다음 단계(5단계 뒤에는 다음 회차)가 열려요.
// 진행 기록은 이 휴대폰(브라우저)에만 저장돼요.
// 주소: hanja.html?hoe=5 → 어휘5를 바로 열기(숙제 QR용) · hanja.html?all=1 → 모든 단계 열기(선생님 확인용)
(function () {
  "use strict";
  var DATA = window.HANJA || [];
  var KEY = "hanuri-hanja-v1";
    var STAGES = [
    { kind: "hanja", from: 0, to: 5, name: "한자어 1~5" },
    { kind: "hanja", from: 5, to: 10, name: "한자어 6~10" },
    { kind: "saja", from: 0, to: 5, name: "사자성어 1~5" },
    { kind: "saja", from: 5, to: 10, name: "사자성어 6~10" },
    { kind: "all", name: "종합 복습", sub: "20개 모두 섞어서" }
  ];
  var KIND = { hanja: "한자어", saja: "사자성어" };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ---------- 진행 기록 ----------
  var prog = { stars: {}, best: {}, opened: {} };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved && saved.stars) prog = saved; if (!prog.opened) prog.opened = {}; if (!prog.best) prog.best = {}; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) {} }
  var params = new URLSearchParams(location.search);
  var ALL = params.get("all") === "1";

  function starsOf(n, s) { return ((prog.stars[n] || [])[s]) || 0; }
  function hoeDone(n) { return starsOf(n, 4) > 0; }
  function hoeOpen(n) { return ALL || n === DATA[0].n || prog.opened[n] || hoeDone(n - 1) || stagesPassed(n) > 0; }
  function stageOpen(n, s) { return ALL || s === 0 || starsOf(n, s - 1) > 0; }
  function stagesPassed(n) { var c = 0; for (var s = 0; s < 5; s++) if (starsOf(n, s) > 0) c++; return c; }
  function hoeData(n) { for (var i = 0; i < DATA.length; i++) if (DATA[i].n === n) return DATA[i]; return null; }

  function wordsOf(n, s) {
    var d = hoeData(n), st = STAGES[s];
    if (st.kind === "all") return tag(d.hanja, "hanja", n).concat(tag(d.saja, "saja", n));
    return tag(d[st.kind].slice(st.from, st.to), st.kind, n);
  }
  function tag(list, kind, n) { return list.map(function (w) { var o = {}; for (var k in w) o[k] = w[k]; o.kind = kind; o.n = n; return o; }); }

  // ---------- 화면 ----------
  var st = { n: 0, s: 0, pool: [], card: 0, qs: [], i: 0, right: 0, wrong: [] };
  var SCREENS = ["map", "stages", "study", "quiz", "result"];
  function show(id) {
    if (id !== "quiz") stopTimer(); // 문제 화면을 떠나면 시간을 멈춰요
    SCREENS.forEach(function (x) { $(x).hidden = x !== id; });
    window.scrollTo(0, 0);
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-to]"), function (b) {
    b.addEventListener("click", function () { if (b.getAttribute("data-to") === "stages") openHoe(st.n); });
  });
  $("toMap").addEventListener("click", function () {
    try { history.replaceState(null, "", location.pathname + (ALL ? "?all=1" : "")); } catch (e) {}
    renderMap(); show("map");
  });

  // 1) 회차 지도
  function renderMap() {
    $("title").textContent = "중학 한자어·사자성어";
    document.title = "한우리 중학 한자어·사자성어";
    var total = DATA.length * 5, done = 0;
    DATA.forEach(function (d) { done += stagesPassed(d.n); });
    var t = $("total"); t.textContent = "";
    t.appendChild(el("span", null, "통과한 단계"));
    var bar = el("span", "bar2"), fill = el("span"); fill.style.width = (done / total * 100) + "%"; bar.appendChild(fill); t.appendChild(bar);
    t.appendChild(el("span", null, done + " / " + total));

    var box = $("hoeList"); box.textContent = "";
    var nowMarked = false;
    DATA.forEach(function (d) {
      var open = hoeOpen(d.n), done5 = hoeDone(d.n), p = stagesPassed(d.n);
      var b = el("button", "hoe" + (done5 ? " done" : "")); b.type = "button";
      b.appendChild(document.createTextNode("어휘" + d.n));
      b.appendChild(el("small", null, open ? (done5 ? "완료 ★" : p + " / 5단계") : "🔒 잠김"));
      if (open && !done5 && !nowMarked) { b.classList.add("now"); nowMarked = true; }
      b.disabled = !open;
      b.setAttribute("aria-label", "어휘" + d.n + (open ? ", " + p + "단계 통과" : ", 잠김"));
      b.addEventListener("click", function () { openHoe(d.n, true); });
      box.appendChild(b);
    });
  }

  // 2) 한 회차의 5단계
  function openHoe(n, push) {
    st.n = n;
    $("title").textContent = "어휘" + n + " 한자어·사자성어";
    document.title = "한우리 한자 - 어휘" + n;
    if (push) try { history.replaceState(null, "", "?hoe=" + n + (ALL ? "&all=1" : "")); } catch (e) {}
    $("hoeTitle").textContent = "어휘" + n + " · 5단계";
    var box = $("stageList"); box.textContent = "";
    STAGES.forEach(function (S, s) {
      var open = stageOpen(n, s), stars = starsOf(n, s);
      var b = el("button", "stage"); b.type = "button"; b.disabled = !open;
      b.appendChild(el("span", "no", open ? String(s + 1) : "🔒"));
      var tx = el("span", "tx"); tx.appendChild(el("b", null, (s + 1) + "단계 · " + S.name));
      var bs = ((prog.best[n] || [])[s]) || 0;
      tx.appendChild(el("span", null, (S.sub || "낱말 5개 · 문제 10개") + (bs ? " · 최고 " + bs + "점" : "")));
      b.appendChild(tx);
      b.appendChild(el("span", "st", stars ? "★★★".slice(0, stars) + "☆☆☆".slice(stars) : ""));
      b.addEventListener("click", function () { startStage(s); });
      box.appendChild(b);
    });
    show("stages");
  }

  // 3) 먼저 공부하기
  function startStage(s) {
    st.s = s; st.pool = wordsOf(st.n, s);
    if (STAGES[s].kind === "all") startQuiz(); else startStudy();
  }
  function startStudy() { st.card = 0; renderStudy(); show("study"); }
  function renderStudy() {
    var w = st.pool[st.card];
    $("studyCount").textContent = (st.card + 1) + " / " + st.pool.length;
    $("studyTag").textContent = "어휘" + st.n + " · " + (st.s + 1) + "단계 · " + KIND[w.kind] + " 먼저 공부하기";
    var hc = $("hChars"); hc.textContent = "";
    for (var i = 0; i < w.h.length; i++) {
      var c = el("span", "hch"); c.appendChild(el("b", null, w.h[i])); c.appendChild(el("span", null, w.hun[i] || "")); hc.appendChild(c);
    }
    $("hWord").textContent = w.w;
    $("hMean").textContent = w.m;
    var ex = $("hEx"); ex.textContent = "";
    if (w.ex) { ex.appendChild(document.createTextNode("예) ")); fillSentence(ex, w.ex, false); }
    $("prevStudy").disabled = st.card === 0;
    $("nextStudy").textContent = st.card === st.pool.length - 1 ? "문제 풀러 가기 →" : "다음";
  }
  $("prevStudy").addEventListener("click", function () { if (st.card > 0) { st.card--; renderStudy(); } });
  $("nextStudy").addEventListener("click", function () {
    if (st.card < st.pool.length - 1) { st.card++; renderStudy(); } else startQuiz();
  });
  $("skipStudy").addEventListener("click", function () { startQuiz(); });

  function fillSentence(node, ex, blank) {
    ex.split(/(\[[^\]]*\])/).forEach(function (part) {
      if (/^\[.*\]$/.test(part)) {
        if (blank) node.appendChild(el("span", "gap", "?"));
        else node.appendChild(el("mark", null, part.slice(1, -1)));
      } else if (part) node.appendChild(document.createTextNode(part));
    });
  }

  // 4) 문제 — 하트·콤보·시간 게임
  // 문제 종류: mean 뜻 보고 낱말 고르기 · blank 예문 빈칸 (한자 읽기 문제는 없어요)
  // 하트 3개로 시작, 틀리거나 시간이 다 되면 하트 -1. 하트가 남은 채로 끝까지 가면 통과(남은 하트 = 별).
  // 점수: 정답 100 + 콤보(2연속부터 연속 수×20) + 남은 시간×5
  var HEARTS = 3, SEC = 20;
  function typesFor(w) { return w.ex ? ["mean", "blank"] : ["mean"]; }
  function distractors(w) {
    var same = [], other = [];
    DATA.forEach(function (d) {
      d[w.kind].forEach(function (x) { if (x.w !== w.w) (d.n === w.n ? same : other).push(x.w); });
    });
    return shuffle(same).concat(shuffle(other)).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 3);
  }
  function buildQuestions() {
    var qs = [];
    if (STAGES[st.s].kind === "all") st.pool.forEach(function (w) { qs.push(makeQ(w, shuffle(typesFor(w))[0])); });
    else st.pool.forEach(function (w) { typesFor(w).forEach(function (t) { qs.push(makeQ(w, t)); }); });
    qs = shuffle(qs);
    for (var i = 1; i < qs.length; i++) if (qs[i].word.w === qs[i - 1].word.w) {
      for (var j = i + 1; j < qs.length; j++) if (qs[j].word.w !== qs[i - 1].word.w) { var t = qs[i]; qs[i] = qs[j]; qs[j] = t; break; }
    }
    return qs;
  }
  function makeQ(w, type) { return { word: w, type: type, choices: shuffle(distractors(w).concat([w.w])) }; }

  var timer = { left: SEC, last: 0, id: 0, on: false };
  function startTimer() { stopTimer(); timer.left = SEC; timer.on = true; timer.last = Date.now(); drawTimer(); timer.id = setInterval(tick, 100); }
  function stopTimer() { timer.on = false; clearInterval(timer.id); }
  function tick() {
    if (!timer.on || document.hidden) { timer.last = Date.now(); return; }
    var now = Date.now(); timer.left -= (now - timer.last) / 1000; timer.last = now;
    if (timer.left <= 0) { timer.left = 0; drawTimer(); answer(null, null); return; }
    drawTimer();
  }
  function drawTimer() {
    var t = $("timer"); t.style.width = (timer.left / SEC * 100) + "%";
    t.classList.toggle("hurry", timer.left <= 5);
    $("sec").textContent = Math.ceil(timer.left) + "초";
  }
  function drawHud() {
    var h = $("hearts"); h.textContent = "";
    for (var i = 0; i < HEARTS; i++) h.appendChild(el("span", i < st.hearts ? "hon" : "hoff", "♥"));
    h.setAttribute("aria-label", "하트 " + st.hearts + "개");
    $("pts").textContent = st.score + "점";
  }

  function startQuiz() {
    st.qs = buildQuestions();
    st.i = 0; st.right = 0; st.wrong = []; st.hearts = HEARTS; st.combo = 0; st.maxCombo = 0; st.score = 0;
    drawHud(); renderQ(); show("quiz");
  }
  function renderQ() {
    var q = st.qs[st.i], w = q.word;
    $("qCount").textContent = (st.i + 1) + " / " + st.qs.length;
    $("progress").style.width = (st.i / st.qs.length * 100) + "%";
    var qn = $("question"); qn.textContent = "";
    if (q.type === "blank") { $("ask").textContent = "빈칸에 알맞은 " + KIND[w.kind] + "는?"; fillSentence(qn, w.ex, true); }
    else { $("ask").textContent = "이런 뜻을 가진 " + KIND[w.kind] + "는?"; qn.textContent = w.m; }
    var box = $("choices"); box.textContent = "";
    q.choices.forEach(function (c) {
      var b = el("button", "choice", c); b.type = "button";
      b.addEventListener("click", function () { answer(b, c); });
      box.appendChild(b);
    });
    $("feedback").hidden = true; $("next").hidden = true; $("pop").hidden = true;
    startTimer();
  }
  function answer(btn, c) {
    if (!timer.on) return;
    stopTimer();
    var q = st.qs[st.i], w = q.word, ok = c === w.w, gain = 0;
    Array.prototype.forEach.call($("choices").children, function (b) {
      b.disabled = true;
      if (b.textContent === w.w) b.classList.add("good");
    });
    if (ok) {
      st.right++; st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
      gain = 100 + (st.combo >= 2 ? st.combo * 20 : 0) + Math.ceil(timer.left) * 5;
      st.score += gain;
      var pop = $("pop"); pop.textContent = (st.combo >= 2 ? st.combo + " 콤보! " : "") + "+" + gain;
      pop.hidden = false; pop.classList.remove("go"); void pop.offsetWidth; pop.classList.add("go");
    } else {
      if (btn) btn.classList.add("bad");
      st.combo = 0; st.hearts--; st.wrong.push(q);
      var hb = $("hearts"); hb.classList.remove("shake"); void hb.offsetWidth; hb.classList.add("shake");
    }
    drawHud();
    var fb = $("feedback"); fb.textContent = ""; fb.className = "feedback " + (ok ? "good" : "bad");
    fb.appendChild(el("b", null, ok ? "정답이에요!" : (c == null ? "시간이 다 됐어요! " : "") + "정답은 '" + w.w + "'예요."));
    fb.appendChild(document.createTextNode(w.w + " : " + w.m));
    fb.hidden = false;
    var nx = $("next"); nx.hidden = false;
    var over = st.hearts <= 0, last = st.i === st.qs.length - 1;
    nx.textContent = over ? "결과 보기" : last ? "결과 보기" : "다음 문제";
    nx.focus();
  }
  $("next").addEventListener("click", function () {
    if (st.hearts > 0 && st.i < st.qs.length - 1) { st.i++; renderQ(); } else finish();
  });

  // 5) 결과
  function finish() {
    stopTimer();
    var pass = st.hearts > 0, stars = pass ? st.hearts : 0;
    var best = (prog.best[st.n] || [])[st.s] || 0, newBest = pass && st.score > best;
    if (pass) {
      var arr = prog.stars[st.n] || [0, 0, 0, 0, 0]; arr[st.s] = Math.max(arr[st.s] || 0, stars); prog.stars[st.n] = arr;
      var b = prog.best[st.n] || [0, 0, 0, 0, 0]; b[st.s] = Math.max(b[st.s] || 0, st.score); prog.best[st.n] = b;
      save();
    }
    $("resTitle").textContent = pass ? "단계 통과!" : "하트를 모두 잃었어요";
    var sv = $("stars"); sv.textContent = "";
    for (var i = 0; i < 3; i++) sv.appendChild(el("span", i < stars ? null : "off", "★"));
    $("score").textContent = st.score + "점";
    var info = st.right + " / " + st.qs.length + " 맞힘 · 최고 콤보 " + st.maxCombo;
    if (newBest && best) info += " · 새 최고 점수!";
    $("scoreInfo").textContent = info;
    var msg;
    if (!pass) msg = "틀린 낱말을 다시 공부하고 도전해 봐요! 하트가 남은 채로 끝까지 가면 통과예요.";
    else if (stars === 3) msg = "하트를 하나도 안 잃었어요! 최고예요 👏";
    else msg = "통과! 하트를 지키면 별을 더 받을 수 있어요.";
    $("scoreMsg").textContent = msg;

    var wl = $("wrongList"); wl.textContent = "";
    var seen = {};
    st.wrong.forEach(function (q) {
      if (seen[q.word.w]) return; seen[q.word.w] = 1;
      var li = el("li"); li.appendChild(el("b", null, q.word.w)); li.appendChild(document.createTextNode(" " + q.word.m)); wl.appendChild(li);
    });
    $("wrongBox").hidden = !st.wrong.length;

    var gn = $("goNext"), nextTarget = nextStage();
    gn.hidden = !(pass && nextTarget);
    if (nextTarget) gn.textContent = nextTarget.s === 0 ? "어휘" + nextTarget.n + " 시작하기 →" : "다음 단계로 →";
    if (pass && !nextTarget) $("scoreMsg").textContent = "어휘1~" + DATA[DATA.length - 1].n + "까지 모두 마쳤어요! 정말 대단해요 🎉";
    $("retry").textContent = pass ? "점수 올리기 도전" : "다시 도전";
    show("result");
  }
  function nextStage() {
    if (st.s < 4) return { n: st.n, s: st.s + 1 };
    var idx = DATA.indexOf(hoeData(st.n));
    return idx < DATA.length - 1 ? { n: DATA[idx + 1].n, s: 0 } : null;
  }
  $("goNext").addEventListener("click", function () {
    var t = nextStage(); if (!t) return;
    if (t.n !== st.n) { st.n = t.n; try { history.replaceState(null, "", "?hoe=" + t.n + (ALL ? "&all=1" : "")); } catch (e) {} $("title").textContent = "어휘" + t.n + " 한자어·사자성어"; }
    startStage(t.s);
  });
  $("retry").addEventListener("click", function () { startQuiz(); });
  $("restudy").addEventListener("click", function () {
    st.pool = wordsOf(st.n, st.s);
    // 틀린 낱말을 앞으로
    var wrongW = st.wrong.map(function (q) { return q.word.w; });
    st.pool.sort(function (a, b) { return (wrongW.indexOf(b.w) >= 0) - (wrongW.indexOf(a.w) >= 0); });
    startStudy();
  });

  // ---------- 시작 ----------
  if (!DATA.length) { $("hoeList").textContent = "낱말 자료를 불러오지 못했어요."; return; }
  var h = parseInt(params.get("hoe"), 10);
  if (hoeData(h)) { prog.opened[h] = true; save(); renderMap(); openHoe(h); }
  else { renderMap(); show("map"); }
})();
