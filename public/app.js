const API_BASE = '/api'; 

// --- KONFIGURASI GENRE BERANDA (SMART KEYWORDS) ---
const GENRE_CONFIG = [
  { label: "LayarOtaku Update", query: "ongoing", targetId: "layarOtakuList" },
  { label: "Nimegami Update", query: "movie", targetId: "nimegamiList" },
  { label: "Donghua Terbaru", query: "donghua", targetId: "donghuaList" }
];

// --- STORAGE KEY ---
const STORAGE_CONTINUE = "continueWatching";

// ==============================
// UTILITY
// ==============================
function saveContinueWatching(data){
  localStorage.setItem(STORAGE_CONTINUE, JSON.stringify(data));
}

function loadContinueWatching(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_CONTINUE)) || [];
  }catch(err){
    return [];
  }
}

function addContinueWatching(item){
  let current = loadContinueWatching();

  current = current.filter(x => x.link !== item.link);
  current.unshift(item);

  if(current.length > 10){
    current = current.slice(0, 10);
  }

  saveContinueWatching(current);
}

function createCardHTML(item, type="normal"){
  let title = item.title || item.name || "Unknown Title";
  let thumb = item.thumb || item.image || item.poster || "";
  let link = item.link || item.url || "#";
  let ep = item.episode || item.ep || item.on || "";

  if(type === "continue"){
    return `
      <div class="orbit-card" data-link="${link}">
        <img src="${thumb}" alt="${title}">
        <div class="orbit-info">
          <div class="orbit-title">${title}</div>
          <div class="orbit-ep">Ep ${ep || 1}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="orbit-card" data-link="${link}">
      <img src="${thumb}" alt="${title}">
      ${ep ? `<div class="orbit-badge orange">ON ${ep}</div>` : `<div class="orbit-badge">Update</div>`}
      <div class="orbit-info">
        <div class="orbit-title">${title}</div>
      </div>
    </div>
  `;
}

function renderList(targetId, data, type="normal"){
  const container = document.getElementById(targetId);
  if(!container) return;

  container.innerHTML = "";

  if(!data || data.length === 0){
    container.innerHTML = `<p style="color:rgba(255,255,255,.5)">Tidak ada data.</p>`;
    return;
  }

  data.forEach(item => {
    container.innerHTML += createCardHTML(item, type);
  });

  // Click handler (tidak mengubah backend, hanya redirect link)
  container.querySelectorAll(".orbit-card").forEach(card => {
    card.addEventListener("click", () => {
      const link = card.getAttribute("data-link");
      if(link && link !== "#"){
        addContinueWatching({ ...data.find(x => (x.link || x.url) === link), link });
        window.location.href = link;
      }
    });
  });
}

// ==============================
// FETCH API
// ==============================
async function fetchAnime(query){
  try{
    const res = await fetch(`${API_BASE}?search=${encodeURIComponent(query)}`);
    const json = await res.json();
    return json.results || json.data || json || [];
  }catch(err){
    console.error("Fetch error:", err);
    return [];
  }
}

// ==============================
// INIT HOME
// ==============================
async function initHome(){
  // Continue Watching
  const continueData = loadContinueWatching();
  renderList("continueWatching", continueData.slice(0,2), "continue");

  // Section data fetch
  for(const g of GENRE_CONFIG){
    const result = await fetchAnime(g.query);
    renderList(g.targetId, result.slice(0,3), "normal");
  }
}

// ==============================
// SEARCH
// ==============================
function initSearch(){
  const searchInput = document.getElementById("searchInput");
  if(!searchInput) return;

  searchInput.addEventListener("keyup", async (e) => {
    const q = e.target.value.trim();
    if(q.length < 2) return;

    const results = await fetchAnime(q);

    // Override hasil pencarian ke LayarOtakuList agar tetap rapi
    renderList("layarOtakuList", results.slice(0,3), "normal");
  });
}

// ==============================
// BOTTOM NAV (UI ONLY)
// ==============================
function initBottomNav(){
  const navHome = document.getElementById("navHome");
  const navSearch = document.getElementById("navSearch");

  if(navHome){
    navHome.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if(navSearch){
    navSearch.addEventListener("click", () => {
      const searchInput = document.getElementById("searchInput");
      if(searchInput){
        searchInput.focus();
      }
    });
  }
}

// ==============================
// RUN
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  initHome();
  initSearch();
  initBottomNav();
});