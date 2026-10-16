/* 청첩장 (index.html) */
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_MS = 86400000, KST_MS = 9 * 3600000;

/* 아이콘: 이미지 파일을 쓰려면 경로를 적으세요 (예: "images/icons/phone.png").
   비워두면 아래 기본 SVG 아이콘이 나옵니다. */
const ICON_FILES = { phone: "", sms: "" };
const ICON_SVG = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  sms: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
};
const icon = (name) => ICON_FILES[name]
  ? `<img src="${esc(ICON_FILES[name])}" alt="">`
  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_SVG[name]}</svg>`;

/* 저장된 설정 불러오기: 기본값(JSON)과 관리자 저장값을 동시에 요청 */
async function loadSaved() {
  if (!sb) return {};
  try {
    // 3초 안에 응답이 없으면 기본값으로 먼저 보여줍니다 (빈 화면 방지)
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000));
    const { data, error } = await Promise.race([
      sb.from("settings").select("data").eq("id", 1).maybeSingle(),
      timeout,
    ]);
    if (error) throw error;
    return data?.data || {};
  } catch (e) {
    console.warn("저장된 설정을 불러오지 못해 기본값을 사용합니다", e);
    return {};
  }
}
async function loadConfig() {
  const [defaults, saved] = await Promise.all([
    loadDefaults().catch((e) => { console.error(e); return {}; }),
    loadSaved(),
  ]);
  return { ...defaults, ...saved };
}

/* 복사 */
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove();
  }
  toast("복사되었습니다");
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-copy]");
  if (btn) copy(btn.dataset.copy);
});

/* 입력칸 자동 높이, 폼을 비우면 원래 크기로 */
document.addEventListener("input", (e) => { if (e.target.matches(".form textarea")) autoGrow(e.target); });
document.addEventListener("reset", (e) => {
  e.target.querySelectorAll("textarea").forEach((t) => { t.style.height = ""; });
}, true);

function render(C) {
  if (!C.groom || !C.bride || !C.venue || !C.date) {
    $("#app").innerHTML = `<section><p class="muted">청첩장 정보를 불러오지 못했습니다.<br>잠시 후 다시 열어주세요.</p></section>`;
    return;
  }
  const g = C.groom, b = C.bride;
  const wedding = new Date(C.date);
  // 한국 시간 기준으로 날짜 정보 추출
  const kst = new Date(wedding.getTime() + KST_MS);
  const Y = kst.getUTCFullYear(), M = kst.getUTCMonth() + 1, D = kst.getUTCDate();
  const H = kst.getUTCHours(), MIN = kst.getUTCMinutes(), DOW = kst.getUTCDay();
  const timeText = `${H < 12 ? "오전" : "오후"} ${H % 12 || 12}시${MIN ? ` ${MIN}분` : ""}`;
  const dateText = `${Y}년 ${M}월 ${D}일 ${DAYS[DOW]}요일 ${timeText}`;
  const q = encodeURIComponent(C.venue.mapQuery || C.venue.address);
  document.title = `${g.name} ♥ ${b.name} 결혼합니다`;

  function calendarHTML() {
    const first = new Date(Date.UTC(Y, M - 1, 1)).getUTCDay();
    const last = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    let cells = DAYS.map((d, i) => `<div class="h ${i === 0 ? "sun" : i === 6 ? "sat" : ""}">${d}</div>`).join("");
    cells += "<div></div>".repeat(first);
    for (let d = 1; d <= last; d++) {
      const dow = (first + d - 1) % 7;
      const cls = d === D ? "day-on" : dow === 0 ? "sun" : dow === 6 ? "sat" : "";
      cells += `<div class="${cls}">${d}</div>`;
    }
    return `<div class="calendar"><div class="month">${Y}. ${String(M).padStart(2, "0")}</div><div class="cal-grid">${cells}</div></div>`;
  }

  function accountGroup(title, list) {
    if (!list?.length) return "";
    return `<details class="acc-group"><summary>${title}</summary>${list.map((a) => `
      <div class="acc-row"><div><small>${esc(a.role)} ${esc(a.name)}</small>${esc(a.bank)} ${esc(a.number)}</div>
      <button data-copy="${esc(a.bank)} ${esc(a.number)}">복사</button></div>`).join("")}</details>`;
  }

  const seg = (name, opts) => `<div class="seg">${opts.map(([v, l], i) =>
    `<label><input type="radio" name="${name}" value="${v}" ${i === 0 ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>`;
  const offline = !sb ? `<p class="notice">준비 중입니다.</p>` : "";

  $("#app").innerHTML = `
  <section class="cover">
    <div class="cover-photo">
      ${C.coverImage ? `<img src="${esc(C.coverImage)}" alt="웨딩 사진" onerror="this.remove()">` : ""}
      <div class="ph">Our Wedding Day</div>
    </div>
    <div class="cover-names reveal">${esc(g.name)}<span>&</span>${esc(b.name)}</div>
    <div class="cover-date reveal">${dateText}<br>${esc(C.venue.name)} ${esc(C.venue.hall)}</div>
  </section>

  <section class="greeting">
    <div class="eyebrow reveal">Invitation</div>
    <h2 class="reveal">소중한 분들을 초대합니다</h2>
    <p class="reveal">${esc(C.greeting)}</p>
    <div class="parents reveal">
      <div>${esc(g.father)} · ${esc(g.mother)}<small>의 ${esc(g.relation)}</small><b>${esc(g.name)}</b></div>
      <div>${esc(b.father)} · ${esc(b.mother)}<small>의 ${esc(b.relation)}</small><b>${esc(b.name)}</b></div>
    </div>
    <button class="contact-btn reveal" id="openContact">연락하기</button>
  </section>

  <section>
    <div class="eyebrow reveal">Wedding Day</div>
    <h2 class="reveal">예식 일시</h2>
    <p class="when-text reveal">${dateText}</p>
    <div class="reveal">${calendarHTML()}</div>
    <div class="dday reveal" id="dday"></div>
  </section>

  ${C.gallery?.length ? `<section>
    <div class="eyebrow reveal">Gallery</div>
    <h2 class="reveal">우리의 순간</h2>
    <div class="gallery reveal">${C.gallery.map((src, i) =>
      `<button aria-label="사진 ${i + 1} 크게 보기"><img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()"></button>`).join("")}
    </div>
  </section>` : ""}

  <section>
    <div class="eyebrow reveal">Location</div>
    <h2 class="reveal">오시는 길</h2>
    <div class="venue-name reveal">${esc(C.venue.name)} ${esc(C.venue.hall)}</div>
    <div class="venue-addr reveal">${esc(C.venue.address)}${C.venue.tel ? `<br>Tel. <a href="tel:${esc(C.venue.tel)}">${esc(C.venue.tel)}</a>` : ""}</div>
    <iframe class="map reveal" loading="lazy" title="예식장 지도"
      src="https://maps.google.com/maps?q=${q}&z=16&output=embed"></iframe>
    <div class="map-links reveal">
      <a href="https://map.naver.com/p/search/${q}" target="_blank" rel="noopener">네이버지도</a>
      <a href="https://map.kakao.com/link/search/${q}" target="_blank" rel="noopener">카카오맵</a>
      <button class="copy-addr" data-copy="${esc(C.venue.address)}">주소 복사</button>
    </div>
    <dl class="transport reveal">${(C.transport || []).map((t) => `<dt>${esc(t.title)}</dt><dd>${esc(t.desc)}</dd>`).join("")}</dl>
  </section>

  <section>
    <div class="eyebrow reveal">RSVP</div>
    <h2 class="reveal">참석 여부 전달</h2>
    <p class="muted lead reveal">원활한 예식 준비를 위해<br>참석 여부를 미리 알려주시면 감사하겠습니다.</p>
    <form class="form reveal" id="rsvpForm">
      ${seg("side", [["groom", "신랑 측"], ["bride", "신부 측"]])}
      ${seg("attend", [["true", "참석할게요"], ["false", "참석이 어려워요"]])}
      <input name="name" placeholder="성함" required maxlength="20" autocomplete="name">
      <input name="phone4" placeholder="연락처 뒷자리 4자리 (선택)" maxlength="4" inputmode="numeric" pattern="[0-9]{0,4}">
      <div id="attendFields" class="form">
        <label class="lbl" for="rsvpCount">참석 인원 (본인 포함)</label>
        <select name="count" id="rsvpCount">${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">${i + 1}명</option>`).join("")}</select>
        <label class="lbl">식사 여부</label>
        ${seg("meal", [["yes", "식사해요"], ["no", "안 해요"], ["undecided", "미정"]])}
      </div>
      <textarea name="note" placeholder="전하실 말씀 (선택)" maxlength="200"></textarea>
      <button class="submit" ${sb ? "" : "disabled"}>참석 여부 전달하기</button>
      ${offline}
    </form>
  </section>

  <section>
    <div class="eyebrow reveal">Gift</div>
    <h2 class="reveal">마음 전하실 곳</h2>
    <p class="muted lead reveal">참석이 어려우신 분들을 위해 기재했습니다.<br>너그러운 마음으로 양해 부탁드립니다.</p>
    <div class="accounts reveal">
      ${accountGroup("신랑 측 계좌번호", C.accounts?.groom)}
      ${accountGroup("신부 측 계좌번호", C.accounts?.bride)}
    </div>
  </section>

  <section>
    <div class="eyebrow reveal">Guestbook</div>
    <h2 class="reveal">축하 메시지</h2>
    <form class="form reveal" id="gbForm">
      <input name="name" placeholder="성함" required maxlength="20" autocomplete="name">
      <textarea name="message" placeholder="두 사람에게 축하의 한마디를 남겨주세요" required maxlength="500"></textarea>
      <button class="submit" ${sb ? "" : "disabled"}>남기기</button>
      ${offline}
    </form>
    <ul class="gb-list" id="gbList"></ul>
    <button class="more" id="gbMore" hidden>더보기</button>
  </section>

  <section>
    <div class="share reveal">
      <button id="shareBtn">청첩장 공유하기</button>
      <button class="ghost" id="copyLink">링크 복사</button>
    </div>
  </section>
  <footer>${esc(g.name)} & ${esc(b.name)}</footer>
  `;

  /* D-day 카운트다운: "며칠 남았는지"는 시간 차이가 아니라 한국 날짜 기준으로 셉니다 */
  const couple = `<em>${esc(g.name)} ♥ ${esc(b.name)}</em>`;
  const kstDay = (t) => Math.floor((t + KST_MS) / DAY_MS);
  (function tick() {
    const now = Date.now(), diff = wedding - now;
    const days = kstDay(wedding.getTime()) - kstDay(now);
    const el = $("#dday");
    if (diff <= 0) {
      el.innerHTML = days === 0 ? `오늘은 ${couple}의 결혼식 날입니다` : `${couple}가 함께한 지 <em>${-days}일</em>`;
      return;
    }
    const d = Math.floor(diff / DAY_MS), h = Math.floor(diff / 3600000) % 24,
          m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
    el.innerHTML = `<div class="dday-boxes">${[[d, "DAYS"], [h, "HOUR"], [m, "MIN"], [s, "SEC"]]
      .map(([v, l]) => `<div><b>${v}</b><small>${l}</small></div>`).join("")}</div>
      ${days === 0 ? `오늘은 ${couple}의 결혼식 날입니다` : `${esc(g.name)} ♥ ${esc(b.name)}의 결혼식이 <em>${days}일</em> 남았습니다`}`;
    setTimeout(tick, 1000);
  })();

  /* 스크롤 등장 애니메이션 */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); }
  }), { threshold: 0.15 });
  $$(".reveal").forEach((el) => io.observe(el));

  /* 공유: 문구 없이 링크만 전달 → 카카오톡에서 미리보기 카드만 보임
     (?나 # 뒤의 꼬리는 떼어서 항상 같은 주소로 → 미리보기도 항상 같게) */
  const shareUrl = location.origin + location.pathname;
  $("#copyLink").onclick = () => copy(shareUrl);
  $("#shareBtn").onclick = async () => {
    if (navigator.share) {
      try { await navigator.share({ url: shareUrl }); } catch {}
    } else copy(shareUrl);
  };

  /* 연락하기 */
  const contacts = [
    ["신랑", g.name, g.phone], ["신랑 아버지", g.father, g.fatherPhone], ["신랑 어머니", g.mother, g.motherPhone],
    ["신부", b.name, b.phone], ["신부 아버지", b.father, b.fatherPhone], ["신부 어머니", b.mother, b.motherPhone],
  ].filter((c) => c[2]);
  const modal = $("#contactModal");
  $(".modal-card", modal).innerHTML = `<h3>연락하기</h3>${contacts.map(([r, n, p]) => {
    const tel = p.replace(/[^0-9]/g, "");
    return `<div class="contact-row"><span><small>${esc(r)}</small>${esc(n)}</span>
      <span class="contact-icons">
        <a href="tel:${tel}" aria-label="${esc(n)}에게 전화">${icon("phone")}</a>
        <a href="sms:${tel}" aria-label="${esc(n)}에게 문자">${icon("sms")}</a>
      </span></div>`;
  }).join("")}<button class="modal-close">닫기</button>`;
  $("#openContact").onclick = () => modal.classList.add("open");
  modal.onclick = (e) => { if (e.target === modal || e.target.classList.contains("modal-close")) modal.classList.remove("open"); };

  setupGallery();
  setupRsvp();
  setupGuestbook();
}

/* 갤러리 라이트박스 (스와이프 지원) */
function setupGallery() {
  const gal = $(".gallery"); if (!gal) return;
  const lb = $("#lightbox"), lbImg = $("img", lb);
  const shots = () => $$(".gallery img").map((i) => i.getAttribute("src"));
  let cur = 0;
  function show(i) {
    const list = shots(); if (!list.length) return;
    cur = (i + list.length) % list.length;
    lbImg.src = list[cur];
    $(".lb-count", lb).textContent = `${cur + 1} / ${list.length}`;
  }
  gal.addEventListener("click", (e) => {
    const btn = e.target.closest("button"); if (!btn || !$("img", btn)) return;
    show(shots().indexOf($("img", btn).getAttribute("src")));
    lb.classList.add("open"); document.body.style.overflow = "hidden";
  });
  function closeLb() { lb.classList.remove("open"); document.body.style.overflow = ""; }
  $(".lb-close", lb).onclick = closeLb;
  $(".lb-prev", lb).onclick = () => show(cur - 1);
  $(".lb-next", lb).onclick = () => show(cur + 1);
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  let sx = 0;
  lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });
}

/* 참석 여부 */
function setupRsvp() {
  const form = $("#rsvpForm");
  const sync = () => { $("#attendFields").hidden = form.attend.value !== "true"; };
  form.addEventListener("change", sync); sync();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!sb) return;
    const attend = form.attend.value === "true";
    const btn = $(".submit", form); btn.disabled = true;
    const { error } = await sb.from("rsvp").insert({
      side: form.side.value,
      name: form.elements.name.value.trim(),
      phone4: form.phone4.value.trim() || null,
      attend,
      count: attend ? Number(form.count.value) : 0,
      meal: attend ? form.meal.value : null,
      note: form.note.value.trim() || null,
    });
    btn.disabled = false;
    if (error) { console.error(error); toast("전송에 실패했어요. 다시 시도해 주세요"); return; }
    form.reset(); sync();
    toast("참석 여부가 전달되었습니다. 감사합니다!");
  });
}

/* 방명록 */
function setupGuestbook() {
  const list = $("#gbList"), more = $("#gbMore"), PAGE = 10;
  let offset = 0;
  const fmt = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}.${d.getDate()}`; };
  async function load(reset) {
    if (!sb) return;
    if (reset) { offset = 0; list.innerHTML = ""; }
    const { data, error } = await sb.from("guestbook").select("id,name,message,created_at")
      .order("created_at", { ascending: false }).range(offset, offset + PAGE - 1);
    if (error) { console.error(error); return; }
    list.insertAdjacentHTML("beforeend", data.map((r) =>
      `<li><div class="who"><b>${esc(r.name)}</b><span>${fmt(r.created_at)}</span></div><p>${esc(r.message)}</p></li>`).join(""));
    offset += data.length;
    more.hidden = data.length < PAGE;
  }
  more.onclick = () => load(false);
  load(true);

  const form = $("#gbForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!sb) return;
    const btn = $(".submit", form); btn.disabled = true;
    const { error } = await sb.from("guestbook").insert({ name: form.elements.name.value.trim(), message: form.message.value.trim() });
    btn.disabled = false;
    if (error) { console.error(error); toast("등록에 실패했어요. 다시 시도해 주세요"); return; }
    form.reset(); toast("축하 메시지가 등록되었습니다");
    load(true);
  });
}

loadConfig().then(render);
