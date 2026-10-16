/* 관리자 페이지 (admin.html) */
const clone = (o) => JSON.parse(JSON.stringify(o));

function showView(id) {
  ["setupView", "loginView", "deniedView", "appView"].forEach((v) => { $("#" + v).hidden = v !== id; });
}

/* ---------- 인증 ---------- */
async function boot() {
  if (!sb) return showView("setupView");
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return showView("loginView");
  const { data: ok, error } = await sb.rpc("is_admin");
  if (error || !ok) {
    $("#deniedEmail").textContent = session.user.email;
    return showView("deniedView");
  }
  await loadSettings();
  showView("appView");
  renderInfo();
  renderPhotos();
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target.elements;
  $("#loginErr").textContent = "";
  const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
  if (error) { $("#loginErr").textContent = "이메일 또는 비밀번호가 올바르지 않습니다."; return; }
  boot();
});
document.addEventListener("click", async (e) => {
  if (!e.target.closest("[data-logout]")) return;
  if (dirty && !confirm("저장하지 않은 변경사항이 있습니다. 로그아웃할까요?")) return;
  dirty = false;
  await sb.auth.signOut();
  showView("loginView");
});

/* ---------- 탭 ---------- */
$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]"); if (!b) return;
  const tab = b.dataset.tab;
  $$("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
  $$("[id^=tab-]").forEach((p) => { p.hidden = p.id !== "tab-" + tab; });
  $("#savebar").hidden = !(tab === "info" || tab === "photos");
  if (tab === "info") growAll();  // 숨겨져 있던 동안에는 높이를 잴 수 없어서 다시 계산
  if (tab === "rsvp") loadRsvp();
  if (tab === "guestbook") loadGuestbook();
});

/* ---------- 설정 (기본 정보 + 사진) ---------- */
let state = null, dirty = false;

async function loadSettings() {
  const [defaults, { data, error }] = await Promise.all([
    loadDefaults().catch((e) => { console.error(e); return {}; }),
    sb.from("settings").select("data").eq("id", 1).maybeSingle(),
  ]);
  if (error) toast("설정을 불러오지 못했습니다", 2000);
  state = { ...clone(defaults), ...(data?.data || {}) };
}
function setDirty(v) {
  dirty = v;
  const m = $("#saveMsg");
  m.textContent = v ? "저장하지 않은 변경사항이 있습니다" : "저장된 상태입니다";
  m.classList.toggle("dirty", v);
}
async function saveSettings() {
  const btn = $("#saveBtn"); btn.disabled = true;
  const { error } = await sb.from("settings").upsert({ id: 1, data: state, updated_at: new Date().toISOString() });
  btn.disabled = false;
  if (error) { console.error(error); toast("저장 실패: " + error.message, 2000); return false; }
  setDirty(false); toast("저장되었습니다", 2000);
  return true;
}
$("#saveBtn").onclick = saveSettings;
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

const getPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
function setPath(o, p, v) {
  const ks = p.split(".");
  let a = o;
  ks.slice(0, -1).forEach((k, i) => { if (a[k] == null) a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k]; });
  a[ks.at(-1)] = v;
}

const TEMPLATES = {
  transport: () => ({ title: "", desc: "" }),
  "accounts.groom": () => ({ role: "", name: "", bank: "", number: "" }),
  "accounts.bride": () => ({ role: "", name: "", bank: "", number: "" }),
};

function renderInfo() {
  const field = (k, label, attrs = "") =>
    `<label class="f"><span>${label}</span><input data-k="${k}" value="${esc(getPath(state, k))}" ${attrs}></label>`;
  const person = (who, title) => `
    <div class="card"><h2>${title}</h2><div class="grid">
      ${field(`${who}.name`, "이름")}
      ${field(`${who}.phone`, "연락처", 'type="tel"')}
      ${field(`${who}.father`, "아버지 성함")}
      ${field(`${who}.fatherPhone`, "아버지 연락처", 'type="tel"')}
      ${field(`${who}.mother`, "어머니 성함")}
      ${field(`${who}.motherPhone`, "어머니 연락처", 'type="tel"')}
      ${field(`${who}.relation`, "관계 (예: 장남, 차녀)")}
    </div></div>`;
  const accList = (side, title) => `
    <div class="card"><h2>${title}<button class="btn sm" data-add="accounts.${side}">+ 계좌 추가</button></h2>
      ${(state.accounts?.[side] || []).map((a, i) => `
        <div class="row-item">
          <div class="grid4">
            <input data-k="accounts.${side}.${i}.role" value="${esc(a.role)}" placeholder="관계 (예: 신랑)">
            <input data-k="accounts.${side}.${i}.name" value="${esc(a.name)}" placeholder="예금주">
            <input data-k="accounts.${side}.${i}.bank" value="${esc(a.bank)}" placeholder="은행">
            <input data-k="accounts.${side}.${i}.number" value="${esc(a.number)}" placeholder="계좌번호" inputmode="numeric">
          </div>
          <div class="row-head"><button class="btn sm danger" data-del="accounts.${side}.${i}">삭제</button></div>
        </div>`).join("") || `<div class="empty">등록된 계좌가 없습니다</div>`}
    </div>`;

  $("#tab-info").innerHTML = `
    ${person("groom", "신랑 측")}
    ${person("bride", "신부 측")}
    <div class="card wide"><h2>예식 정보</h2><div class="grid">
      <label class="f"><span>예식 일시 (한국 시간)</span><input type="datetime-local" id="dateInput" value="${esc(String(state.date ?? "").slice(0, 16))}"></label>
      ${field("venue.tel", "예식장 전화번호", 'type="tel"')}
      ${field("venue.name", "예식장 이름")}
      ${field("venue.hall", "홀 이름 (예: 3층 그랜드볼룸)")}
      <div class="full">${field("venue.address", "주소")}</div>
      <div class="full">${field("venue.mapQuery", "지도 검색어 (지도에서 정확히 찾아지는 이름이나 주소)")}</div>
    </div></div>
    <div class="card wide"><h2>인사말</h2>
      <textarea data-k="greeting" rows="8">${esc(state.greeting)}</textarea>
    </div>
    <div class="card wide"><h2>교통편 안내<button class="btn sm" data-add="transport">+ 항목 추가</button></h2>
      ${(state.transport || []).map((t, i) => `
        <div class="row-item">
          <input data-k="transport.${i}.title" value="${esc(t.title)}" placeholder="제목 (예: 지하철)">
          <textarea data-k="transport.${i}.desc" rows="2" placeholder="안내 내용">${esc(t.desc)}</textarea>
          <div class="row-head"><button class="btn sm danger" data-del="transport.${i}">삭제</button></div>
        </div>`).join("") || `<div class="empty">등록된 안내가 없습니다</div>`}
    </div>
    ${accList("groom", "신랑 측 계좌")}
    ${accList("bride", "신부 측 계좌")}
  `;
  growAll();
}

const growAll = () => $$("#tab-info textarea").forEach(autoGrow);
window.addEventListener("resize", growAll);  // 화면 폭이 바뀌면 줄바꿈이 달라지므로 다시 계산

$("#tab-info").addEventListener("input", (e) => {
  const el = e.target;
  if (el.tagName === "TEXTAREA") autoGrow(el);
  if (el.id === "dateInput") { if (el.value) { state.date = el.value + ":00+09:00"; setDirty(true); } return; }
  if (el.dataset.k) { setPath(state, el.dataset.k, el.value); setDirty(true); }
});
$("#tab-info").addEventListener("click", (e) => {
  const add = e.target.closest("[data-add]");
  if (add) {
    const p = add.dataset.add;
    if (!getPath(state, p)) setPath(state, p, []);
    getPath(state, p).push(TEMPLATES[p]());
    setDirty(true); renderInfo(); return;
  }
  const del = e.target.closest("[data-del]");
  if (del) {
    const ks = del.dataset.del.split("."), idx = Number(ks.pop());
    getPath(state, ks.join(".")).splice(idx, 1);
    setDirty(true); renderInfo();
  }
});

/* ---------- 사진 ---------- */
function resize(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob((b) => b ? resolve(b) : reject(new Error("변환 실패")), "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("이미지를 읽을 수 없습니다 (JPG/PNG를 사용해 주세요)"));
    img.src = URL.createObjectURL(file);
  });
}
async function upload(file, folder) {
  const blob = await resize(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
}
/* 카카오톡 미리보기용 사진: 항상 같은 주소(og/cover.jpg)에 덮어씀 → index.html의 og:image가 이 주소를 가리킴 */
async function uploadOgImage(file) {
  const blob = await resize(file, 1200);
  const { error } = await sb.storage.from("photos").upload("og/cover.jpg", blob,
    { contentType: "image/jpeg", cacheControl: "60", upsert: true });
  if (error) throw error;
}
async function removeStored(url) {
  const p = url && url.split("/storage/v1/object/public/photos/")[1];
  if (p) await sb.storage.from("photos").remove([decodeURIComponent(p)]);
}
/* 따옴표를 먼저 %27로 바꾼 뒤 이스케이프 (반대 순서면 속성값이 해석될 때 '가 되살아나 CSS가 깨짐) */
const bgUrl = (u) => `background-image:url('${esc(String(u).replace(/'/g, "%27"))}')`;

function renderPhotos() {
  const gal = state.gallery || [];
  $("#tab-photos").innerHTML = `
    <div class="card"><h2>커버 사진 <small>세로(3:4) 사진 추천 · 카카오톡 미리보기 사진으로도 쓰입니다</small></h2>
      <div class="cover-row">
        <div class="cover-prev" style="${state.coverImage ? bgUrl(state.coverImage) : ""}"></div>
        <label class="btn file-btn">사진 변경<input type="file" accept="image/*" id="coverFile"></label>
      </div>
    </div>
    <div class="card"><h2>갤러리 <small>${gal.length}장 · 화살표로 순서 변경</small>
      <label class="btn sm primary file-btn">+ 사진 추가<input type="file" accept="image/*" multiple id="galFile"></label></h2>
      <div class="progress" id="upProgress"></div>
      <div class="photos">${gal.map((u, i) => `
        <div class="photo">
          <div class="img" style="${bgUrl(u)}"><b>${i + 1}</b></div>
          <div class="acts">
            <button data-move="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="앞으로">◀</button>
            <button class="del" data-remove="${i}" aria-label="삭제">✕</button>
            <button data-move="${i}" data-dir="1" ${i === gal.length - 1 ? "disabled" : ""} aria-label="뒤로">▶</button>
          </div>
        </div>`).join("") || `<div class="empty">갤러리 사진이 없습니다</div>`}
      </div>
    </div>
    <p class="empty">사진 변경은 바로 저장됩니다.</p>`;
}

$("#tab-photos").addEventListener("change", async (e) => {
  const input = e.target, prog = $("#upProgress");
  try {
    if (input.id === "coverFile" && input.files[0]) {
      toast("업로드 중...", 2000);
      const old = state.coverImage;
      state.coverImage = await upload(input.files[0], "cover");
      if (await saveSettings()) removeStored(old);
      try { await uploadOgImage(input.files[0]); }
      catch (err) { console.error(err); toast("커버는 바뀌었지만 미리보기 사진 저장에 실패했습니다", 2000); }
      renderPhotos();
    }
    if (input.id === "galFile" && input.files.length) {
      const files = [...input.files];
      state.gallery = state.gallery || [];
      let added = 0;
      try {
        for (let i = 0; i < files.length; i++) {
          prog.textContent = `업로드 중... (${i + 1}/${files.length})`;
          state.gallery.push(await upload(files[i], "gallery"));
          added++;
        }
      } finally {
        // 중간에 실패해도 이미 올라간 사진은 저장해서 목록에서 사라지지 않게
        if (added) { await saveSettings(); renderPhotos(); }
      }
    }
  } catch (err) {
    console.error(err);
    toast("업로드 실패: " + err.message, 2000);
    if (prog) prog.textContent = "";
    input.value = "";  // 같은 파일을 다시 골라도 change 이벤트가 오도록
  }
});
$("#tab-photos").addEventListener("click", async (e) => {
  const mv = e.target.closest("[data-move]");
  if (mv) {
    const i = Number(mv.dataset.move), j = i + Number(mv.dataset.dir), g = state.gallery;
    [g[i], g[j]] = [g[j], g[i]];
    renderPhotos(); await saveSettings(); return;
  }
  const rm = e.target.closest("[data-remove]");
  if (rm) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    const [url] = state.gallery.splice(Number(rm.dataset.remove), 1);
    renderPhotos();
    if (await saveSettings()) removeStored(url);
  }
});

/* ---------- 참석 여부 ---------- */
let rsvps = [], rsvpFilter = "all";
const MEAL = { yes: "식사", no: "식사 안 함", undecided: "식사 미정" };
const SIDE = { groom: "신랑 측", bride: "신부 측" };
const fmtDate = (iso) => new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

async function loadRsvp() {
  $("#tab-rsvp").innerHTML = `<div class="empty">불러오는 중...</div>`;
  const { data, error } = await sb.from("rsvp").select("*").order("created_at", { ascending: false });
  if (error) { $("#tab-rsvp").innerHTML = `<div class="empty">불러오기 실패: ${esc(error.message)}</div>`; return; }
  rsvps = data; renderRsvp();
}
function renderRsvp() {
  const sum = (arr) => arr.reduce((s, r) => s + (r.count || 0), 0);
  const yes = rsvps.filter((r) => r.attend);
  const bySide = (s) => yes.filter((r) => r.side === s);
  const meal = yes.filter((r) => r.meal === "yes");
  const list = rsvps.filter((r) =>
    rsvpFilter === "all" ? true : rsvpFilter === "no" ? !r.attend : r.attend && r.side === rsvpFilter);

  $("#tab-rsvp").innerHTML = `
    <div class="stats">
      <div class="stat"><small>총 참석 인원</small><b>${sum(yes)}<em>명</em></b><div class="sub">응답 ${rsvps.length}건 · 불참 ${rsvps.length - yes.length}건</div></div>
      <div class="stat"><small>신랑 측</small><b>${sum(bySide("groom"))}<em>명</em></b><div class="sub">${bySide("groom").length}건</div></div>
      <div class="stat"><small>신부 측</small><b>${sum(bySide("bride"))}<em>명</em></b><div class="sub">${bySide("bride").length}건</div></div>
      <div class="stat"><small>식사 인원</small><b>${sum(meal)}<em>명</em></b><div class="sub">미정 ${sum(yes.filter((r) => r.meal === "undecided"))}명</div></div>
    </div>
    <div class="card">
      <h2>응답 목록
        <span class="btn-group">
          <button class="btn sm" id="rsvpReload">새로고침</button>
          <button class="btn sm" id="rsvpCsv">엑셀(CSV) 받기</button>
        </span>
      </h2>
      <div class="filters">
        ${[["all", "전체"], ["groom", "신랑 측 참석"], ["bride", "신부 측 참석"], ["no", "불참"]].map(([v, l]) =>
          `<button data-filter="${v}" class="${rsvpFilter === v ? "on" : ""}">${l}</button>`).join("")}
      </div>
      <ul class="list">${list.map((r) => `
        <li><div class="body">
          <div class="top">
            <b>${esc(r.name)}</b>${r.phone4 ? `<span class="meta">(${esc(r.phone4)})</span>` : ""}
            <span class="tag ${r.side}">${SIDE[r.side]}</span>
            ${r.attend ? `<span class="tag">${r.count}명</span><span class="tag">${MEAL[r.meal] || "-"}</span>` : `<span class="tag no">불참</span>`}
          </div>
          ${r.note ? `<p>${esc(r.note)}</p>` : ""}
          <div class="meta">${fmtDate(r.created_at)}</div>
        </div><button class="btn sm danger" data-rsvp-del="${r.id}">삭제</button></li>`).join("") || `<div class="empty">응답이 없습니다</div>`}
      </ul>
    </div>`;
}
$("#tab-rsvp").addEventListener("click", async (e) => {
  const f = e.target.closest("[data-filter]");
  if (f) { rsvpFilter = f.dataset.filter; renderRsvp(); return; }
  if (e.target.id === "rsvpReload") return loadRsvp();
  if (e.target.id === "rsvpCsv") return downloadCsv();
  const d = e.target.closest("[data-rsvp-del]");
  if (d && confirm("이 응답을 삭제할까요?")) {
    const { error } = await sb.from("rsvp").delete().eq("id", d.dataset.rsvpDel);
    if (error) return toast("삭제 실패: " + error.message, 2000);
    rsvps = rsvps.filter((r) => String(r.id) !== d.dataset.rsvpDel);
    renderRsvp(); toast("삭제되었습니다", 2000);
  }
});
function downloadCsv() {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["구분", "성함", "연락처 뒷자리", "참석", "인원", "식사", "메시지", "등록일시"]].concat(
    rsvps.map((r) => [SIDE[r.side], r.name, r.phone4, r.attend ? "참석" : "불참", r.attend ? r.count : 0,
      r.attend ? MEAL[r.meal] || "" : "", r.note, new Date(r.created_at).toLocaleString("ko-KR")]));
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");  // BOM: 엑셀에서 한글 깨짐 방지
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `참석여부_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);  // 바로 해제하면 일부 브라우저에서 다운로드가 취소됨
}

/* ---------- 방명록 ---------- */
async function loadGuestbook() {
  const el = $("#tab-guestbook");
  el.innerHTML = `<div class="empty">불러오는 중...</div>`;
  const { data, error } = await sb.from("guestbook").select("*").order("created_at", { ascending: false });
  if (error) { el.innerHTML = `<div class="empty">불러오기 실패: ${esc(error.message)}</div>`; return; }
  el.innerHTML = `
    <div class="card"><h2>방명록 <small>${data.length}개</small><button class="btn sm" id="gbReload">새로고침</button></h2>
      <ul class="list">${data.map((r) => `
        <li><div class="body">
          <div class="top"><b>${esc(r.name)}</b><span class="meta">${fmtDate(r.created_at)}</span></div>
          <p>${esc(r.message)}</p>
        </div><button class="btn sm danger" data-gb-del="${r.id}">삭제</button></li>`).join("") || `<div class="empty">아직 메시지가 없습니다</div>`}
      </ul>
    </div>`;
}
$("#tab-guestbook").addEventListener("click", async (e) => {
  if (e.target.id === "gbReload") return loadGuestbook();
  const d = e.target.closest("[data-gb-del]");
  if (d && confirm("이 메시지를 삭제할까요?")) {
    const { error } = await sb.from("guestbook").delete().eq("id", d.dataset.gbDel);
    if (error) return toast("삭제 실패: " + error.message, 2000);
    toast("삭제되었습니다", 2000); loadGuestbook();
  }
});

boot();
