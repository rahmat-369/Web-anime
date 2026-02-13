/* =====================================
   GLOBAL STATE
===================================== */
const homePage = document.getElementById("homePage");
const listPage = document.getElementById("listPage");
const historyPage = document.getElementById("historyPage");
const profilePage = document.getElementById("profilePage");

const continueContainer = document.getElementById("continueWatching");
const latestContainer = document.getElementById("latestUpdate");
const movieContainer = document.getElementById("movieUpdate");
const donghuaContainer = document.getElementById("donghuaUpdate");

const animeListContainer = document.getElementById("animeList");
const historyContainer = document.getElementById("historyList");

const searchModal = document.getElementById("searchModal");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

const openSearchBtn = document.getElementById("openSearchBtn");
const closeSearchBtn = document.getElementById("closeSearchBtn");

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const openSidebarBtn = document.getElementById("openSidebarBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

const navButtons = document.querySelectorAll(".nav-btn");
const sidebarLinks = document.querySelectorAll(".sidebar-link");

/* =====================================
   PAGE NAVIGATION
===================================== */
function switchPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));

  if (page === "home") {
    homePage.classList.add("active");
  }
  if (page === "list") {
    listPage.classList.add("active");
  }
  if (page === "history") {
    historyPage.classList.add("active");
  }
  if (page === "profile") {
    profilePage.classList.add("active");
  }

  document.querySelectorAll(`[data-page="${page}"]`).forEach(el => {
    el.classList.add("active");
  });

  sidebar.classList.remove("active");
  overlay.classList.remove("active");
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    if (page) switchPage(page);
  });
});

sidebarLinks.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const page = link.dataset.page;
    switchPage(page);
  });
});

/* =====================================
   SIDEBAR
===================================== */
openSidebarBtn.addEventListener("click", () => {
  sidebar.classList.add("active");
  overlay.classList.add("active");
});

closeSidebarBtn.addEventListener("click", () => {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
});

overlay.addEventListener("click", () => {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
});

/* =====================================
   SEARCH MODAL
===================================== */
openSearchBtn.addEventListener("click", () => {
  searchModal.classList.add("active");
  searchInput.focus();
});

closeSearchBtn.addEventListener("click", () => {
  searchModal.classList.remove("active");
});

searchModal.addEventListener("click", (e) => {
  if (e.target === searchModal) {
    searchModal.classList.remove("active");
  }
});

/* =====================================
   RENDER FUNCTIONS
===================================== */

function createBigCard(anime) {
  return `
    <div class="big-card">
      <img src="${anime.thumbnail || anime.image || ''}" alt="${anime.title}">
      <div class="card-info">
        <h3>${anime.title}</h3>
        <p>${anime.episode || "Episode 1"}</p>
      </div>
    </div>
  `;
}

function createAnimeCard(anime) {
  return `
    <div class="anime-card">
      ${anime.episode ? `<div class="episode-badge">${anime.episode}</div>` : ""}
      <img src="${anime.thumbnail || anime.image || ''}" alt="${anime.title}">
      <div class="anime-info">
        <h3>${anime.title}</h3>
        <p>${anime.status || ""}</p>
      </div>
    </div>
  `;
}

function createSearchItem(anime) {
  return `
    <div class="search-item">
      <img src="${anime.thumbnail || anime.image || ''}" alt="${anime.title}">
      <div>
        <h4>${anime.title}</h4>
        <p>${anime.status || ""}</p>
      </div>
    </div>
  `;
}

/* =====================================
   FETCH DATA
===================================== */

async function fetchLatest() {
  try {
    const res = await fetch("/api/latest");
    const data = await res.json();

    renderHome(data);
    renderList(data);
  } catch (err) {
    console.error("Failed fetch latest:", err);
  }
}

function renderHome(data) {
  continueContainer.innerHTML = "";
  latestContainer.innerHTML = "";
  movieContainer.innerHTML = "";
  donghuaContainer.innerHTML = "";

  const firstTwo = data.slice(0, 2);
  firstTwo.forEach(anime => {
    continueContainer.innerHTML += createBigCard(anime);
  });

  data.slice(0, 10).forEach(anime => {
    latestContainer.innerHTML += createAnimeCard(anime);
  });

  data.slice(5, 15).forEach(anime => {
    movieContainer.innerHTML += createAnimeCard(anime);
  });

  data.slice(10, 20).forEach(anime => {
    donghuaContainer.innerHTML += createAnimeCard(anime);
  });
}

function renderList(data) {
  animeListContainer.innerHTML = "";
  data.forEach(anime => {
    animeListContainer.innerHTML += createAnimeCard(anime);
  });
}

/* =====================================
   SEARCH FUNCTION
===================================== */
let searchTimeout;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  const query = searchInput.value.trim();
  if (!query) {
    searchResults.innerHTML = "";
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${query}`);
      const data = await res.json();

      searchResults.innerHTML = "";
      data.forEach(anime => {
        searchResults.innerHTML += createSearchItem(anime);
      });

    } catch (err) {
      console.error("Search error:", err);
    }
  }, 400);
});

/* =====================================
   HISTORY (LOCAL STORAGE)
===================================== */
function loadHistory() {
  const history = JSON.parse(localStorage.getItem("animeHistory")) || [];
  historyContainer.innerHTML = "";

  history.forEach(anime => {
    historyContainer.innerHTML += createAnimeCard(anime);
  });
}

/* =====================================
   INIT
===================================== */
fetchLatest();
loadHistory();