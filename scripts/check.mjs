// 올리기 전 점검 (GitHub Actions가 main에 올릴 때마다 자동으로 돌려요. 내 컴퓨터에서 꼭 돌릴 필요는 없어요)
// 1) 각 페이지에 꼭 있어야 하는 화면 요소  2) 페이지가 부르는 파일이 실제로 있는지  3) 외부 라이브러리 주소
// 4) js/ · data/ 스크립트 문법  5) 과정 목록(data/catalog.js)  6) 활동리포트 표지 그림  7) 엑셀 양식 파일  8) 어휘 퀴즈 낱말(data/vocab.js)
import { readFileSync, existsSync, readdirSync } from "node:fs";
import vm from "node:vm";

const PAGES = {
  "index.html": ["tab-plan", "tab-homework", "tab-feedback", "f-plan", "f-homework", "f-feedback", "forms"],
  "plan.html": ["file", "classes", "catalogList", "viewer"],
  "homework.html": ["fileRoster", "fileHw", "hwEdit","blankXlsx", "list", "savePdf", "savePng", "saveXlsx", "saveStatus", "viewer"],
  "quiz.html": ["levels", "levelList", "setup", "sessions", "cards", "flip", "quiz", "choices", "next", "result", "score"],
  "hanja.html": ["lock", "lockForm", "pw", "map", "hoeList", "stages", "stageList", "study", "quiz", "choices", "next", "result", "score"],
  "feedback.html": ["cls", "stage", "report", "common", "chips", "student", "checks", "memo", "gen", "alt", "text", "png", "copy", "all", "preview"],
};
const FORMS = ["반 명단 엑셀 (이름으로 적기).xlsx", "반 명단 엑셀 (팀 이름으로 적기).xlsx", "숙제 엑셀 (빈칸).xlsx", "한우리_수업도우미_사용안내.pptx", "한우리_수업도우미.html", "수업도우미_이럴땐이렇게.pdf"];
const errors = [];

for (const [file, ids] of Object.entries(PAGES)) {
  if (!existsSync(file)) { errors.push(`${file} 이 없어요.`); continue; }
  const html = readFileSync(file, "utf8");
  for (const id of ids) if (!html.includes(`id="${id}"`)) errors.push(`${file}: 화면 요소 #${id} 가 없어요.`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${file}: <title> 이 없어요.`);
  if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) errors.push(`${file}: 페이지 안에 스크립트를 직접 쓰지 말고 js/ 폴더 파일로 빼 주세요.`);
  for (const [, src] of html.matchAll(/<(?:script[^>]*\bsrc|link[^>]*\bhref)="([^"]+)"/g)) {
    if (/^https:\/\//.test(src)) {
      if (!/^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)(\/|$)/.test(src)) errors.push(`${file}: 알 수 없는 외부 주소: ${src}`);
    } else if (!existsSync(src.split("?")[0])) errors.push(`${file}: 부르는 파일이 없어요: ${src}`);
  }
}

// 스크립트 문법
for (const dir of ["js", "data"]) {
  for (const f of readdirSync(dir).filter(f => f.endsWith(".js"))) {
    try { new vm.Script(readFileSync(`${dir}/${f}`, "utf8"), { filename: `${dir}/${f}` }); }
    catch (e) { errors.push(`${dir}/${f}: 문법 오류: ${e.message}`); }
  }
}

// data/*.js 는 window.CATALOG / window.REPORTS 를 채우는 파일이에요
function loadData(path, key) {
  try { const window = {}; vm.runInNewContext(readFileSync(path, "utf8"), { window }); return window[key]; }
  catch (e) { errors.push(`${path} 를 읽지 못했어요: ${e.message}`); return null; }
}
const catalog = loadData("data/catalog.js", "CATALOG");
if (catalog) {
  if (!Array.isArray(catalog.courses) || !catalog.courses.length) errors.push("data/catalog.js: 과정 목록이 비어 있어요.");
  else console.log(`과정 목록: ${catalog.year}년 ${catalog.month}월, ${catalog.courses.length}개 과정`);
}
const reports = loadData("data/reports.js", "REPORTS");
if (reports) {
  const missing = new Set();
  for (const r of Object.values(reports)) for (const s of r.sessions || []) {
    const p = s.coverId ? `covers/a_${s.coverId}.jpg` : (s.cover ? `covers/${s.cover}` : "");
    if (p && !existsSync(p)) missing.add(p);
  }
  if (missing.size) errors.push(`표지 그림이 없어요: ${[...missing].slice(0, 5).join(", ")}${missing.size > 5 ? " 외 " + (missing.size - 5) + "개" : ""}`);
  else console.log(`피드백 활동리포트 ${Object.keys(reports).length}개, 표지 그림 모두 있음`);
}

// data/vocab.js: 어휘 퀴즈 낱말 (월호 → 단계 → 차시 → 낱말). 빈칸 예문에는 [정답]이 한 번 있어야 해요
const vocab = loadData("data/vocab.js", "VOCAB");
if (vocab) {
  let n = 0;
  for (const [mon, m] of Object.entries(vocab)) {
    if (!/^\d{4}-\d{2}$/.test(mon) || !m.label || !m.levels) { errors.push(`data/vocab.js: 월호 '${mon}'는 "2027-01": { label, levels } 모양이어야 해요.`); continue; }
    for (const [lv, sessions] of Object.entries(m.levels)) for (const s of sessions) for (const w of s.words) {
      n++;
      if (!w.w || !w.m) errors.push(`data/vocab.js: ${m.label} ${lv} ${s.session}에 낱말이나 뜻이 빈 칸이 있어요.`);
      if (w.ex && (w.ex.match(/\[[^\]]+\]/g) || []).length !== 1) errors.push(`data/vocab.js: ${m.label} ${lv} ${s.session} '${w.w}' 예문에 [정답]이 한 번만 있어야 해요.`);
    }
  }
  const months = Object.keys(vocab).sort();
  if (months.length > 2) errors.push(`data/vocab.js: 어휘 퀴즈는 최근 2개 월호만 올려요. 가장 오래된 월호(${months.slice(0, months.length - 2).join(", ")})를 지워 주세요.`);
  console.log(`어휘 퀴즈: ${months.length}개 월호, 낱말 ${n}개`);
}

// data/hanja.enc.js: 중학 한자어·사자성어 (비밀번호로 잠긴 낱말)
{
  const t = readFileSync("data/hanja.enc.js", "utf8");
  if (!/window\.HANJA_LOCK\s*=\s*\{\s*"salt":\s*"[^"]+",\s*"iv":\s*"[^"]+",\s*"it":\s*\d+,\s*"data":\s*"[A-Za-z0-9+/=]{100,}"\s*\}/.test(t)) errors.push("data/hanja.enc.js: 잠긴 낱말 자료 모양이 맞지 않아요.");
}

for (const f of FORMS) if (!existsSync("forms/" + f)) errors.push(`엑셀 양식이 없어요: forms/${f}`);

if (errors.length) { console.error("점검 실패:\n- " + errors.join("\n- ")); process.exit(1); }
console.log("점검 통과");
