/* OrbitCloud UI - Frontend only
   - Menggunakan API endpoint yang sudah ada di project (tanpa ubah backend)
   - Fallback data jika API tidak tersedia
*/

const state = {
  view: "home",
  data: {
    otaku: [],
    nime: [],
    donghua: [],
    all: [],
  },
  continue: [],
  history: [],
  playing: null,
};

const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const STORAGE = {
  CONTINUE: "orbitcloud_continue",
  HISTORY: "orbitcloud_history",
};

function safeJsonParse(v, fallback) {
  try {
    const x = JSON.parse(v);
    return x ?? fallback;
  } catch {
    return fallback;
  }
}

function loadStorage() {
  state.continue = safeJsonParse(localStorage.getItem(STORAGE.CONTINUE), []);
  state.history = safeJsonParse(localStorage.getItem(STORAGE.HISTORY), []);
}

function saveContinue() {
  localStorage.setItem(STORAGE.CONTINUE, JSON.stringify(state.continue.slice(0, 20)));
}

function saveHistory() {
  localStorage.setItem(STORAGE.HISTORY, JSON.stringify(state.history.slice(0, 120)));
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function clampText(str, max = 64) {
  if (!str) return "";
  const s = String(str);
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function normalizeItem(raw, sourceTag = "") {
  // Normalize various possible shapes from API
  const title =
    raw.title ||
    raw.name ||
    raw.judul ||
    raw.anime ||
    raw.anime_title ||
    raw.slug ||
    "Untitled";

  const image =
    raw.image ||
    raw.poster ||
    raw.thumbnail ||
    raw.thumb ||
    raw.cover ||
    raw.img ||
    raw.banner ||
    "";

  const url = raw.url || raw.link || raw.href || raw.stream || raw.embed || "";
  const ep = raw.ep || raw.episode || raw.eps || raw.latest_episode || raw.num_episode || raw.on || "";

  const id =
    raw.id ||
    raw.slug ||
    raw.anime_id ||
    raw.mal_id ||
    raw.kitsu_id ||
    `${sourceTag}:${title}:${image}:${url}`;

  return {
    id: String(id),
    title: String(title),
    image: String(image || ""),
    url: String(url || ""),
    ep: ep === 0 ? "0" : String(ep || ""),
    source: String(sourceTag || raw.source || ""),
    raw,
  };
}

function toCardHTML(item, opts = {}) {
  const { showBadge = false, badgeText = "", showEp = true, epPrefix = "Ep ", onStyle = false } = opts;
  const bg = item.image
    ? `style="background-image:url('${escapeAttr(item.image)}')"`
    : `style="background-image:linear-gradient(135deg, rgba(168,85,247,.35), rgba(34,211,238,.20))"`;

  const badge = showBadge
    ? `<div class="badge ${onStyle ? "badge--on" : ""}">${escapeHtml(badgeText)}</div>`
    : "";

  const sub =
    showEp && item.ep
      ? `<div class="sub"><span class="ep">${escapeHtml(epPrefix + item.ep)}</span></div>`
      : `<div class="sub"></div>`;

  return `
    <article class="card-tile" data-id="${escapeAttr(item.id)}" data-action="open">
      ${badge}
      <div class="thumb" ${bg}></div>
      <div class="info">
        <div class="title">${escapeHtml(item.title)}</div>
        ${sub}
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("`", "&#096;");
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { "accept": "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await r.json();
  // Some endpoints might return html; attempt json parse
  const t = await r.text();
  return safeJsonParse(t, null);
}

function buildFallbackData() {
  const imgA = "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=800&q=60";
  const imgB = "https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=800&q=60";
  const imgC = "https://images.unsplash.com/photo-1526401485004-2aa7f3b7f4bf?auto=format&fit=crop&w=800&q=60";
  const imgD = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=60";
  const imgE = "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=60";
  const imgF = "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=800&q=60";

  const otaku = [
    normalizeItem({ title: "Arne no Jikenbo", image: imgA, ep: "6", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, "otaku"),
    normalizeItem({ title: "Darwin Jihen", image: imgB, ep: "6", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, "otaku"),
    normalizeItem({ title: "Yoroi Shin Den Sam Troopers", image: imgC, ep: "1", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, "otaku"),
  ];

  const nime = [
    normalizeItem({ title: "Mononoke Movie 2: Hinezumi", image: imgD, ep: "", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, "nime"),
    normalizeItem({ title: "Mononoke Movie 1: Karakasa", image: imgE, ep: "", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, "nime"),
    normalizeItem({ title: "Yuusha Party ni Kawaii Ko ga Ita node...", image: imgF, ep: "1", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, "nime"),
  ];

  const donghua = [
    normalizeItem({ title: "Donghua A", image: imgC, ep: "12", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, "donghua"),
    normalizeItem({ title: "Donghua B", image: imgB, ep: "5", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, "donghua"),
    normalizeItem({ title: "Donghua C", image: imgA, ep: "2", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, "donghua"),
  ];

  state.data.otaku = otaku;
  state.data.nime = nime;
  state.data.donghua = donghua;
  state.data.all = uniqBy([...otaku, ...nime, ...donghua], (x) => x.id);
}

async function loadData() {
  // Attempt to use existing API endpoints in repo (if any).
  // We can't be sure shapes, so we normalize defensively.
  // Common patterns:
  // - /api/home
  // - /api/anime
  // - /api/search?q=
  // The backend existing file is /api/index.js, so we try /api first.

  let anyOk = false;

  // Helper to try multiple endpoints and map into categories
  async function tryEndpoint(url, tag) {
    const data = await fetchJson(url);
    if (!data) return null;

    // Detect list arrays in data
    let arr = null;
    if (Array.isArray(data)) arr = data;
    else if (Array.isArray(data.data)) arr = data.data;
    else if (Array.isArray(data.results)) arr = data.results;
    else if (Array.isArray(data.items)) arr = data.items;
    else if (Array.isArray(data.anime)) arr = data.anime;
    else if (Array.isArray(data.list)) arr = data.list;

    if (!arr) {
      // sometimes object of sections
      if (data.otaku || data.nime || data.donghua) {
        return data;
      }
      return null;
    }

    return arr.map((x) => normalizeItem(x, tag));
  }

  try {
    // Prefer home style if exists
    const home = await fetchJson("/api");
    if (home) {
      // If /api returns sections:
      // e.g. { otaku:[], nime:[], donghua:[] } or other keys
      const o = Array.isArray(home.otaku) ? home.otaku.map((x) => normalizeItem(x, "otaku")) : null;
      const n = Array.isArray(home.nime) ? home.nime.map((x) => normalizeItem(x, "nime")) : null;
      const d = Array.isArray(home.donghua) ? home.donghua.map((x) => normalizeItem(x, "donghua")) : null;

      if (o || n || d) {
        state.data.otaku = o || [];
        state.data.nime = n || [];
        state.data.donghua = d || [];
        state.data.all = uniqBy([...state.data.otaku, ...state.data.nime, ...state.data.donghua], (x) => x.id);
        anyOk = true;
      } else if (Array.isArray(home)) {
        const all = home.map((x) => normalizeItem(x, "all"));
        state.data.all = all;
        state.data.otaku = all.slice(0, 9);
        state.data.nime = all.slice(9, 18);
        state.data.donghua = all.slice(18, 27);
        anyOk = true;
      }
    }
  } catch {
    // ignore
  }

  if (!anyOk) {
    // Try common endpoints quietly
    const probes = [
      { url: "/api/home", tag: "home" },
      { url: "/api/anime", tag: "all" },
      { url: "/api/list", tag: "all" },
      { url: "/api/otaku", tag: "otaku" },
      { url: "/api/nime", tag: "nime" },
      { url: "/api/donghua", tag: "donghua" },
    ];

    for (const p of probes) {
      try {
        const v = await tryEndpoint(p.url, p.tag);
        if (!v) continue;

        if (Array.isArray(v)) {
          if (p.tag === "otaku") state.data.otaku = v;
          else if (p.tag === "nime") state.data.nime = v;
          else if (p.tag === "donghua") state.data.donghua = v;
          else state.data.all = v;

          anyOk = true;
        } else if (typeof v === "object") {
          const o = Array.isArray(v.otaku) ? v.otaku.map((x) => normalizeItem(x, "otaku")) : null;
          const n = Array.isArray(v.nime) ? v.nime.map((x) => normalizeItem(x, "nime")) : null;
          const d = Array.isArray(v.donghua) ? v.donghua.map((x) => normalizeItem(x, "donghua")) : null;
          if (o || n || d) {
            state.data.otaku = o || [];
            state.data.nime = n || [];
            state.data.donghua = d || [];
            anyOk = true;
          }
        }
      } catch {
        // ignore
      }
    }

    if (anyOk && (!state.data.all || state.data.all.length === 0)) {
      state.data.all = uniqBy([...state.data.otaku, ...state.data.nime, ...state.data.donghua], (x) => x.id);
    }
  }

  if (!anyOk) buildFallbackData();
}

function renderHome() {
  // Continue watching row (2 items)
  const cont = el("#continueRow");
  const list = state.continue.slice(0, 2);
  if (!list.length) {
    // use fallback from some data
    const fallback = (state.data.all.length ? state.data.all : []).slice(0, 2).map((it, idx) => ({
      ...it,
      ep: it.ep || String(idx + 1),
    }));
    cont.innerHTML = fallback.map((it) => toCardHTML(it, { showEp: true, epPrefix: "Ep " })).join("");
  } else {
    cont.innerHTML = list.map((it) => toCardHTML(it, { showEp: true, epPrefix: "Ep " })).join("");
  }

  // Otaku grid (3)
  const og = el("#otakuGrid");
  const ot = state.data.otaku.slice(0, 3);
  og.innerHTML = ot
    .map((it) => toCardHTML(it, { showBadge: true, badgeText: it.ep ? `ON ${it.ep}` : "Update", onStyle: true, showEp: false }))
    .join("");

  // Nime grid (3)
  const ng = el("#nimeGrid");
  const nm = state.data.nime.slice(0, 3);
  ng.innerHTML = nm
    .map((it) => toCardHTML(it, { showBadge: true, badgeText: it.ep ? "Update" : "Update", onStyle: false, showEp: false }))
    .join("");

  // Donghua grid (3)
  const dg = el("#donghuaGrid");
  const dh = state.data.donghua.slice(0, 3);
  dg.innerHTML = dh
    .map((it) => toCardHTML(it, { showBadge: true, badgeText: it.ep ? `ON ${it.ep}` : "On-G", onStyle: false, showEp: false }))
    .join("");

  wireCardClicks(el("#viewHome"));
}

function renderList() {
  const grid = el("#listGrid");
  const list = state.data.all.slice(0, 40);
  grid.innerHTML = list.map((it) => toCardHTML(it, { showEp: !!it.ep, epPrefix: "Ep " })).join("");
  wireCardClicks(el("#viewList"));
}

function renderHistory() {
  const grid = el("#historyGrid");
  const list = state.history.slice(0, 40);
  if (!list.length) {
    grid.innerHTML = `<div class="muted" style="grid-column:1/-1;padding:6px 2px;">Belum ada history. Coba putar satu episode.</div>`;
    return;
  }
  grid.innerHTML = list.map((it) => toCardHTML(it, { showEp: !!it.ep, epPrefix: "Ep " })).join("");
  wireCardClicks(el("#viewHistory"));
}

function setView(next) {
  state.view = next;
  for (const v of els(".view")) {
    const isActive = v.dataset.view === next;
    v.classList.toggle("view--active", isActive);
  }
  for (const n of els(".navitem")) {
    const isActive = n.dataset.nav === next;
    n.classList.toggle("navitem--active", isActive);
  }

  if (next === "home") renderHome();
  if (next === "list") renderList();
  if (next === "history") renderHistory();
}

function wireNav() {
  els(".navitem").forEach((btn) => {
    btn.addEventListener("click", () => {
      setView(btn.dataset.nav);
      closeSearch();
    });
  });

  el("#btnAvatar").addEventListener("click", () => {
    setView("profile");
    closeSearch();
  });
}

function wireCardClicks(root) {
  if (!root) return;
  els('[data-action="open"]', root).forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const item = findAnyById(id);
      if (!item) return;
      openPlayer(item);
    });
  });
}

function findAnyById(id) {
  const all = [...state.data.all, ...state.continue, ...state.history];
  return all.find((x) => x.id === id) || null;
}

function openPlayer(item) {
  state.playing = item;
  const modal = el("#playerModal");
  el("#playerTitle").textContent = clampText(item.title, 64);
  el("#playerMeta").textContent = item.ep ? `Episode ${item.ep}` : "Episode";
  const frame = el("#playerFrame");
  frame.src = item.url || "about:blank";

  // add to history + continue
  addToHistory(item);
  addToContinue(item);

  modal.setAttribute("aria-hidden", "false");
}

function closePlayer() {
  const modal = el("#playerModal");
  modal.setAttribute("aria-hidden", "true");
  const frame = el("#playerFrame");
  frame.src = "about:blank";
  state.playing = null;
}

function addToHistory(item) {
  const normalized = normalizeItem(item, item.source);
  const stamp = Date.now();
  const it = { ...normalized, _ts: stamp };

  const merged = [it, ...state.history.filter((x) => x.id !== it.id)];
  state.history = merged.slice(0, 120);
  saveHistory();
}

function addToContinue(item) {
  const normalized = normalizeItem(item, item.source);
  const stamp = Date.now();
  const it = { ...normalized, _ts: stamp };

  const merged = [it, ...state.continue.filter((x) => x.id !== it.id)];
  state.continue = merged.slice(0, 20);
  saveContinue();
}

function wirePlayer() {
  els('[data-action="close-player"]').forEach((x) => x.addEventListener("click", closePlayer));

  el("#btnOpenSource").addEventListener("click", () => {
    if (!state.playing) return;
    const url = state.playing.url;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  el("#btnNextEp").addEventListener("click", () => {
    // simplistic: increment ep number if numeric, keep same url
    if (!state.playing) return;
    const cur = state.playing;
    const next = { ...cur };
    const n = parseInt(cur.ep, 10);
    if (!Number.isNaN(n)) next.ep = String(n + 1);
    else next.ep = cur.ep || "1";
    openPlayer(next);
  });
}

function wireProfile() {
  el("#btnClearHistory").addEventListener("click", () => {
    state.history = [];
    saveHistory();
    renderHistory();
    alert("History lokal dihapus.");
  });

  el("#btnResetContinue").addEventListener("click", () => {
    state.continue = [];
    saveContinue();
    renderHome();
    alert("Lanjutkan menonton direset.");
  });
}

function openSearch() {
  const overlay = el("#searchOverlay");
  overlay.setAttribute("aria-hidden", "false");
  el("#searchInput").focus();
  renderSearchHint(true);
}

function closeSearch() {
  const overlay = el("#searchOverlay");
  overlay.setAttribute("aria-hidden", "true");
  el("#searchInput").value = "";
  el("#searchResults").innerHTML = "";
  renderSearchHint(true);
}

function renderSearchHint(show) {
  el("#searchHint").style.display = show ? "block" : "none";
}

function wireSearch() {
  el("#fabSearch").addEventListener("click", () => {
    openSearch();
  });

  el("#searchClose").addEventListener("click", closeSearch);
  el("#searchClear").addEventListener("click", () => {
    el("#searchInput").value = "";
    el("#searchResults").innerHTML = "";
    renderSearchHint(true);
    el("#searchInput").focus();
  });

  // Close by ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const overlay = el("#searchOverlay");
      if (overlay.getAttribute("aria-hidden") === "false") closeSearch();
      const modal = el("#playerModal");
      if (modal.getAttribute("aria-hidden") === "false") closePlayer();
    }
  });

  let t = null;
  el("#searchInput").addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = el("#searchInput").value.trim();
      if (!q) {
        el("#searchResults").innerHTML = "";
        renderSearchHint(true);
        return;
      }
      renderSearch(q);
    }, 180);
  });
}

function renderSearch(q) {
  const results = el("#searchResults");
  const hay = state.data.all.length ? state.data.all : [];
  const s = q.toLowerCase();
  const found = hay.filter((x) => (x.title || "").toLowerCase().includes(s)).slice(0, 24);

  if (!found.length) {
    results.innerHTML = `<div class="muted" style="grid-column:1/-1;padding:6px 2px;">Tidak ditemukan.</div>`;
    renderSearchHint(false);
    return;
  }

  results.innerHTML = found.map((it) => toCardHTML(it, { showEp: !!it.ep, epPrefix: "Ep " })).join("");
  renderSearchHint(false);

  wireCardClicks(el("#searchOverlay"));
}

function wireSeeAll() {
  els('[data-action="see-all"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      // For now, route to List view.
      setView("list");
    });
  });
}

async function init() {
  loadStorage();
  wireNav();
  wirePlayer();
  wireProfile();
  wireSearch();
  wireSeeAll();

  await loadData();

  // Ensure all list is populated
  if (!state.data.all || state.data.all.length === 0) {
    state.data.all = uniqBy([...state.data.otaku, ...state.data.nime, ...state.data.donghua], (x) => x.id);
  }

  // First render
  setView("home");
}

init();