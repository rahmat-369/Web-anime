const API_BASE = '/api';

// --- KONFIGURASI MENU BERANDA (ORBIT STYLE) ---
const SECTIONS_CONFIG = [
    {
        title: "LayarOtaku Update",
        type: "latest", // Mengambil data endpoint /latest
        badge: "Ongoing",
        color: "pink"
    },
    {
        title: "Nimegami Update",
        type: "query",
        queries: ["isekai", "magic", "fantasy"],
        badge: "Anime & Movie",
        color: "blue"
    },
    {
        title: "Donghua Terbaru",
        type: "query",
        queries: ["donghua", "throne", "soul", "martial"],
        badge: "Anichin",
        color: "pink"
    },
    {
        title: "Romance & School",
        type: "query",
        queries: ["romance", "school", "love"],
        badge: "Bucin",
        color: "blue"
    }
];

// UTILITY
const getEl = (id) => document.getElementById(id);
const showEl = (id) => getEl(id).classList.remove('hidden');
const hideEl = (id) => getEl(id).classList.add('hidden');
const loader = (active) => active ? showEl('loading') : hideEl('loading');

// --- NAVIGATION & VIEWS ---
function switchView(viewId) {
    ['home-view', 'detail-view', 'watch-view', 'list-view', 'profile-view'].forEach(id => hideEl(id));
    showEl(viewId);
    
    // Update Bottom Nav Active State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    if (viewId === 'home-view') getEl('nav-home').classList.add('active');
    if (viewId === 'list-view') getEl('nav-list').classList.add('active');
    if (viewId === 'profile-view') getEl('nav-profile').classList.add('active');
    // History tab shares Home View logic but filters visibility, handled separately
    if (viewId === 'history-view') getEl('nav-history').classList.add('active');
}

function goHome() {
    switchView('home-view');
    loadHomeData();
}

function goList() {
    switchView('list-view');
}

function showProfile() {
    switchView('profile-view');
}

function showHistoryPage() {
    // Reuse home view but could filter or just scroll to history
    // For this UI, we will just show the home view where History is at the top
    switchView('home-view');
    getEl('nav-home').classList.remove('active');
    getEl('nav-history').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- SEARCH ---
function toggleSearch() {
    const overlay = getEl('search-overlay');
    if (overlay.classList.contains('hidden')) {
        showEl('search-overlay');
        getEl('searchInput').focus();
    } else {
        hideEl('search-overlay');
    }
}

async function handleSearch(manualQuery = null) {
    const query = manualQuery || getEl('searchInput').value;
    if (!query) return;

    toggleSearch(); // Close overlay
    loader(true);
    switchView('home-view'); // Use home container for results
    
    const container = getEl('home-content');
    container.innerHTML = `<div class="section-title"><div class="bar-accent blue"></div><h3>Hasil: ${query}</h3></div>`;

    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        const grid = document.createElement('div');
        grid.className = 'episode-grid'; // Reuse grid style but for posters
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))';
        
        grid.innerHTML = data.map(anime => `
            <div class="anime-card" onclick="loadDetail('${anime.url}')" style="min-width:auto; max-width:none">
                <img src="${anime.image}" class="card-img">
                <div class="badge-ep">${anime.score || '?'}</div>
                <div class="card-overlay">
                    <div class="card-title">${anime.title}</div>
                </div>
            </div>
        `).join('');
        
        container.appendChild(grid);
    } catch (e) {
        console.error(e);
        container.innerHTML += `<p style="text-align:center; margin-top:20px">Gagal mencari.</p>`;
    } finally {
        loader(false);
    }
}

// --- HOME LOGIC ---
async function loadHomeData() {
    // Render History from LocalStorage
    renderHistorySection();

    const container = getEl('home-content');
    if (container.childElementCount > 0) return; // Don't reload if already loaded

    loader(true);
    try {
        for (const section of SECTIONS_CONFIG) {
            let data = [];
            
            if (section.type === 'latest') {
                const res = await fetch(`${API_BASE}/latest`);
                data = await res.json();
            } else {
                // Multi query merge
                const promises = section.queries.map(q => 
                    fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => [])
                );
                const results = await Promise.all(promises);
                results.forEach(arr => { if(Array.isArray(arr)) data = [...data, ...arr]; });
                
                // Remove duplicates by URL
                data = [...new Map(data.map(item => [item.url, item])).values()];
            }

            if (data && data.length > 0) {
                renderSection(section, data.slice(0, 10)); // Limit 10 items per section
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        loader(false);
    }
}

function renderSection(config, list) {
    const container = getEl('home-content');
    
    const sectionHtml = document.createElement('div');
    sectionHtml.className = 'category-section';
    sectionHtml.innerHTML = `
        <div class="section-title">
            <div class="bar-accent ${config.color}"></div>
            <h3>${config.title}</h3>
            <span class="badge-soft">${config.badge}</span>
        </div>
        <div class="horizontal-scroll">
            ${list.map(anime => `
                <div class="anime-card" onclick="loadDetail('${anime.url}')">
                    <span class="badge-type">${config.badge === 'Ongoing' ? 'ON' : 'Anime'}</span>
                    <span class="badge-ep">${anime.episode || anime.score || '?'}</span>
                    <img src="${anime.image}" class="card-img" loading="lazy">
                    <div class="card-overlay">
                        <div class="card-title">${anime.title}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.appendChild(sectionHtml);
}

// --- HISTORY LOGIC (LOCALSTORAGE) ---
function saveHistory(anime) {
    let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
    // Remove if exists
    history = history.filter(item => item.url !== anime.url);
    // Add to top
    history.unshift(anime);
    // Limit to 5
    if (history.length > 5) history.pop();
    localStorage.setItem('watchHistory', JSON.stringify(history));
}

function renderHistorySection() {
    const history = JSON.parse(localStorage.getItem('watchHistory')) || [];
    const section = getEl('history-section');
    const listDiv = getEl('history-list');
    
    if (history.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    listDiv.innerHTML = history.map(anime => `
        <div class="anime-card" onclick="loadVideo('${anime.videoUrl}', '${anime.title}', '${anime.url}', '${anime.image}')">
             <span class="badge-type" style="background:var(--accent); border:none; color:white">Lanjut Ep ${anime.epName}</span>
            <img src="${anime.image}" class="card-img">
            <div class="card-overlay">
                <div class="card-title">${anime.title}</div>
            </div>
        </div>
    `).join('');
}

// --- DETAIL ---
let currentAnimeDetail = {}; // Store temp for history

async function loadDetail(url) {
    loader(true);
    switchView('detail-view');
    
    try {
        const res = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        currentAnimeDetail = {
            title: data.title,
            image: data.image,
            url: url // Main anime url
        };

        const infoDiv = getEl('anime-info');
        infoDiv.innerHTML = `
            <div class="detail-hero">
                <img src="${data.image}" class="detail-poster">
                <div class="detail-meta">
                    <h1>${data.title}</h1>
                    <div class="tags">${data.info.genre || 'Anime'}</div>
                    <p class="desc">${data.description}</p>
                </div>
            </div>
        `;

        const epGrid = getEl('episode-grid');
        epGrid.innerHTML = data.episodes.map(ep => {
            // Clean Episode Title
            let shortTitle = ep.title.replace(/Episode/i, '').trim();
            return `<div class="ep-btn" onclick="loadVideo('${ep.url}', '${data.title}', '${url}', '${data.image}', '${shortTitle}')">${shortTitle}</div>`
        }).join('');

    } catch (e) {
        console.error(e);
    } finally {
        loader(false);
    }
}

function backToDetail() {
    // If we have history of what was clicked, we go back, otherwise home
    if(currentAnimeDetail.url) {
        loadDetail(currentAnimeDetail.url);
    } else {
        goHome();
    }
}

// --- WATCH ---
async function loadVideo(url, title, mainUrl, image, epName = '?') {
    loader(true);
    switchView('watch-view');
    getEl('video-title').innerText = title + ' - Ep ' + epName;

    // Save to History
    saveHistory({
        title: title,
        url: mainUrl, // Link ke halaman detail
        videoUrl: url, // Link ke episode ini
        image: image,
        epName: epName
    });

    try {
        const res = await fetch(`${API_BASE}/watch?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        const player = getEl('video-player');
        const serverContainer = getEl('server-options');

        if (data.streams.length > 0) {
            player.src = data.streams[0].url;
            serverContainer.innerHTML = data.streams.map((s, i) => `
                <button class="server-btn ${i === 0 ? 'active' : ''}" onclick="changeServer('${s.url}', this)">${s.server}</button>
            `).join('');
        } else {
            alert("Video tidak ditemukan.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        loader(false);
    }
}

function changeServer(url, btn) {
    getEl('video-player').src = url;
    document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
    loadHomeData();
    
    // Search Enter Key
    getEl('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});