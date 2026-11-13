// 중학 한자어·사자성어 퀴즈 (hanja.html)
// 어휘1~17 회차 → 회차마다 5단계: 1 한자어 1~5 · 2 한자어 6~10 · 3 사자성어 1~5 · 4 사자성어 6~10 · 5 종합 복습(20개)
// 단계마다 먼저 카드로 공부 → 문제(4지선다). 80% 넘게 맞히면 통과, 다음 단계(5단계 뒤에는 다음 회차)가 열려요.
// 진행 기록은 이 휴대폰(브라우저)에만 저장돼요.
// 주소: hanja.html?hoe=5 → 어휘5를 바로 열기(숙제 QR용) · hanja.html?all=1 → 모든 단계 열기(선생님 확인용)
(function () {
  "use strict";
  var DATA = window.HANJA || [];
  var KEY = "hanuri-hanja-v1";
  var PASS = 0.8;
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
  var prog = { stars: {}, opened: {} };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved && saved.stars) prog = saved; if (!prog.opened) prog.opened = {}; } catch (e) {}
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
      tx.appendChild(el("span", null, S.sub || "낱말 5개 · 문제 10개"));
      b.appendChild(tx);
      b.appendChild(el("span", "st", stars ? "★★★".slice(0, stars) + "☆☆☆".slice(stars) : ""));
      b.addEventListener("click", function () { startStage(s); });
      box.appendChild(b);
    });
    show("stages");
  }

  // 3) 먼저 공부하기
  function startStage(s) {
    st.s = s; st.retryWrong = false; st.pool = wordsOf(st.n, s);
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

  // 4) 문제
  // 문제 종류: mean 뜻 보고 낱말 고르기 · blank 예문 빈칸 · hanja 한자 보고 읽기
  function typesFor(w) { var t = ["mean", "hanja"]; if (w.ex) t.push("blank"); return t; }
  function distractors(w, type) {
    var same = [], other = [];
    DATA.forEach(function (d) {
      d[w.kind].forEach(function (x) {
        if (x.w === w.w) return;
        if (type === "hanja" && x.w.length !== w.w.length && w.kind === "hanja") return;
        (d.n === w.n ? same : other).push(x.w);
      });
    });
    return shuffle(same).concat(shuffle(other)).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 3);
  }
  function buildQuestions() {
    var qs = [];
    if (STAGES[st.s].kind === "all") {
      st.pool.forEach(function (w) { qs.push(makeQ(w, shuffle(typesFor(w))[0])); });
    } else {
      st.pool.forEach(function (w) { shuffle(typesFor(w)).slice(0, 2).forEach(function (t) { qs.push(makeQ(w, t)); }); });
    }
    qs = shuffle(qs);
    // 같은 낱말이 바로 이어 나오지 않게
    for (var i = 1; i < qs.length; i++) if (qs[i].word.w === qs[i - 1].word.w) {
      for (var j = i + 1; j < qs.length; j++) if (qs[j].word.w !== qs[i - 1].word.w) { var t = qs[i]; qs[i] = qs[j]; qs[j] = t; break; }
    }
    return qs;
  }
  function makeQ(w, type) { return { word: w, type: type, choices: shuffle(distractors(w, type).concat([w.w])) }; }

  function startQuiz(onlyWrong) {
    st.qs = onlyWrong ? onlyWrong : buildQuestions();
    st.i = 0; st.right = 0; st.wrong = [];
    renderQ(); show("quiz");
  }
  function renderQ() {
    var q = st.qs[st.i], w = q.word;
    $("qCount").textContent = (st.i + 1) + " / " + st.qs.length;
    $("progress").style.width = (st.i / st.qs.length * 100) + "%";
    var qn = $("question"); qn.textContent = ""; qn.classList.remove("big");
    if (q.type === "blank") { $("ask").textContent = "빈칸에 알맞은 " + KIND[w.kind] + "는?"; fillSentence(qn, w.ex, true); }
    else if (q.type === "hanja") { $("ask").textContent = "이 한자는 어떻게 읽을까요?"; qn.textContent = w.h; qn.classList.add("big"); }
    else { $("ask").textContent = "이런 뜻을 가진 " + KIND[w.kind] + "는?"; qn.textContent = w.m; }
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
    if (ok) st.right++; else { btn.classList.add("bad"); st.wrong.push(q); }
    var fb = $("feedback"); fb.textContent = ""; fb.className = "feedback " + (ok ? "good" : "bad");
    fb.appendChild(el("b", null, ok ? "정답이에요!" : "정답은 '" + w.w + "'예요."));
    fb.appendChild(document.createTextNode(w.w + "(" + w.h + ") : " + w.m));
    fb.appendChild(el("small", null, w.hun.join(" · ")));
    fb.hidden = false;
    var nx = $("next"); nx.hidden = false;
    nx.textContent = st.i === st.qs.length - 1 ? "결과 보기" : "다음 문제";
    nx.focus();
  }
  $("next").addEventListener("click", function () {
    if (st.i < st.qs.length - 1) { st.i++; renderQ(); } else finish();
  });

  // 5) 결과
  function finish() {
    var total = st.qs.length, rate = st.right / total, pass = rate >= PASS;
    var stars = rate === 1 ? 3 : rate >= 0.9 ? 2 : pass ? 1 : 0;
    var isRetryWrong = st.retryWrong;
    if (pass && !isRetryWrong) {
      var arr = prog.stars[st.n] || [0, 0, 0, 0, 0];
      arr[st.s] = Math.max(arr[st.s] || 0, stars);
      prog.stars[st.n] = arr; save();
    }
    var sv = $("stars"); sv.textContent = "";
    for (var i = 0; i < 3; i++) sv.appendChild(el("span", i < stars ? null : "off", "★"));
    $("score").textContent = st.right + " / " + total;
    var need = Math.ceil(total * PASS);
    var msg;
    if (!pass) msg = need + "개 이상 맞히면 통과예요. 틀린 낱말을 다시 공부하고 도전해 봐요!";
    else if (stars === 3) msg = "모두 맞혔어요! 최고예요 👏";
    else msg = "통과! 틀린 낱말만 한 번 더 보고 가요.";
    $("scoreMsg").textContent = msg;

    var wl = $("wrongList"); wl.textContent = "";
    var seen = {};
    st.wrong.forEach(function (q) {
      if (seen[q.word.w]) return; seen[q.word.w] = 1;
      var li = el("li"); li.appendChild(el("b", null, q.word.w + "(" + q.word.h + ")")); li.appendChild(document.createTextNode(" " + q.word.m)); wl.appendChild(li);
    });
    $("wrongBox").hidden = !st.wrong.length;

    var gn = $("goNext"), nextTarget = nextStage();
    gn.hidden = !(pass && nextTarget);
    if (nextTarget) gn.textContent = nextTarget.s === 0 ? "어휘" + nextTarget.n + " 시작하기 →" : "다음 단계로 →";
    if (pass && !nextTarget) $("scoreMsg").textContent = "어휘1~" + DATA[DATA.length - 1].n + "까지 모두 마쳤어요! 정말 대단해요 🎉";
    $("retry").textContent = st.wrong.length && pass ? "틀린 것만 다시" : "문제 다시 풀기";
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
    st.retryWrong = false;
    startStage(t.s);
  });
  $("retry").addEventListener("click", function () {
    var passed = st.right / st.qs.length >= PASS;
    if (st.wrong.length && passed) {
      st.retryWrong = true;
      startQuiz(shuffle(st.wrong.map(function (q) { return makeQ(q.word, q.type); })));
    } else { st.retryWrong = false; startQuiz(); }
  });
  $("restudy").addEventListener("click", function () {
    st.retryWrong = false; st.pool = wordsOf(st.n, st.s);
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
