/* 청첩장·관리자 페이지 공용 도구 */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* 기본 청첩장 내용 (data/default-config.json) */
async function loadDefaults() {
  const res = await fetch("data/default-config.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`기본 설정 파일을 읽지 못했습니다 (${res.status})`);
  return res.json();
}

/* 토스트 */
let toastTimer;
function toast(msg, ms = 1800) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

/* 입력칸 자동 높이: 글자 수에 맞춰 늘어남 (rows/min-height 값이 최소 높이) */
function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + (el.offsetHeight - el.clientHeight) + "px";
}
