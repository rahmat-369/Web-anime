const API_BASE = '/api'; 

// --- KONFIGURASI GENRE BERANDA (SMART KEYWORDS) ---
// Kita menggunakan array 'queries' untuk menggabungkan banyak hasil pencarian
// agar list menjadi penuh dan tidak hanya berisi 1 item.
const HOME_SECTIONS = [
    { 
        title: "Sedang Hangat 🔥", 
        mode: "latest" // Mode khusus untuk mengambil update terbaru
    },
    { 
        title: "Isekai & Fantasy 🌀", 
        queries: ["isekai", "reincarnation", "world", "maou"] 
    },
    { 
        title: "Action Hits ⚔️", 
        queries: ["kimetsu", "jujutsu", "piece", "bleach", "hunter", "shingeki"] 
    },
    { 
        title: "Romance & Drama ❤️", 
        queries: ["love", "kanojo", "romance", "heroine", "uso"] 
    },
    { 
        title: "School Life 🏫", 
        queries: ["school", "gakuen", "classroom", "seishun"] 
    },
];

// --- UTILITAS UI ---
const show = (id) => document.getElementById(id).classList.remove('hidden');
const hide = (id) => document.getElementById(id).classList.add('hidden');

function loader(showLoader = true) {
    const loading = document.getElementById('loading');
    if (showLoader) loading.classList.remove('hidden');
    else loading.classList.add('hidden');
}

// --- RENDER SECTION BERANDA (Horizontal Scroll) ---
function renderHomeSection(container, title, data) {
    if (!data || data.length === 0) return;

    const sectionDiv = document.createElement('section');
    sectionDiv.className = 'category-section';

    const headerHtml = `
        <div class="header-flex">
            <div class="section-header">
                <div class="bar-accent"></div>
                <h3>${title}</h3>
            </div>
        </div>
    `;

    const cardsHtml = data.map(anime => {
        // Normalisasi data
        const eps = anime.episode || anime.score || '?'; 
        const displayTitle = anime.title.length > 35 ? anime.title.substring(0, 35) + '...' : anime.title;
        
        return `
        <div class="scroll-card" onclick="loadDetail('${anime.url}')">
            <div class="scroll-card-img">
                <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                <div class="ep-badge">Ep ${eps}</div>
            </div>
            <div class="scroll-card-title">${displayTitle}</div>
        </div>
        `;
    }).join('');

    sectionDiv.innerHTML = headerHtml + `<div class="horizontal-scroll">${cardsHtml}</div>`;
    container.appendChild(sectionDiv);
}

// --- PENCARIAN (Grid View) ---
async function handleSearch(manualQuery = null) {
    const searchInput = document.getElementById('searchInput');
    const query = manualQuery || searchInput.value.trim();
    if (!query) return;

    loader(true);
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        hide('detail-view');
        hide('watch-view');
        show('home-view');

        const homeView = document.getElementById('home-view');
        homeView.innerHTML = `
            <section class="category-section">
                <div class="header-flex">
                    <div class="section-header">
                        <div class="bar-accent"></div>
                        <h3>Hasil Pencarian: "${query}"</h3>
                    </div>
                </div>
                <div class="anime-grid">
                    ${data.map(anime => `
                        <div class="qa-btn" onclick="loadDetail('${anime.url}')">
                            <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                            <div class="qa-title">${anime.title}</div>
                            <div class="qa-meta">${anime.episode || anime.score || ''}</div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    } catch (err) {
        console.error(err);
    } finally {
        loader(false);
    }
}

// --- LOAD BERANDA (SEMUA SECTION) ---
async function loadLatest() {
    loader(true);
    const homeView = document.getElementById('home-view');
    homeView.innerHTML = '';

    try {
        for (const section of HOME_SECTIONS) {
            let sectionData = [];

            if (section.mode === 'latest') {
                const res = await fetch(`${API_BASE}/latest`);
                sectionData = await res.json();
            } else if (section.queries && section.queries.length > 0) {
                // Gabungkan hasil dari beberapa query
                let combined = [];
                for (const q of section.queries) {
                    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
                    const data = await res.json();
                    combined = combined.concat(data);
                }

                // Remove duplikat berdasarkan url
                const uniqueMap = new Map();
                combined.forEach(item => {
                    if (item && item.url) uniqueMap.set(item.url, item);
                });

                sectionData = Array.from(uniqueMap.values()).slice(0, 15);
            }

            renderHomeSection(homeView, section.title, sectionData);
        }
    } catch (err) {
        console.error(err);
    } finally {
        loader(false);
    }
}

// --- DETAIL ANIME ---
async function loadDetail(url) {
    loader(true);
    try {
        const res = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        hide('home-view');
        hide('watch-view');
        show('detail-view');

        document.getElementById('anime-info').innerHTML = `
            <div class="detail-header">
                <img src="${data.image}" class="detail-poster">
                <div class="detail-text">
                    <h1>${data.title}</h1>
                    <div class="detail-meta">
                        <span>${data.info.genre || 'Anime'}</span> • <span>${data.info.status || 'Ongoing'}</span>
                    </div>
                    <p class="desc">${data.description || 'Tidak ada deskripsi.'}</p>
                </div>
            </div>
        `;

        const epGrid = document.getElementById('episode-grid');
        epGrid.innerHTML = data.episodes.map(ep => {
            let epNum = ep.title.match(/Episode\s+(\d+)/i);
            let displayTitle = epNum ? epNum[1] : ep.title.replace('Episode', '').trim();
            if(displayTitle.length > 5) displayTitle = 'Ep'; 

            return `<div class="ep-box" onclick="loadVideo('${ep.url}')">${displayTitle}</div>`;
        }).join('');

    } catch (err) {
        console.error(err);
    } finally {
        loader(false);
    }
}

// --- NONTON VIDEO ---
async function loadVideo(url) {
    loader(true);
    try {
        const res = await fetch(`${API_BASE}/watch?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        hide('detail-view');
        show('watch-view');

        document.getElementById('video-title').innerText = data.title;
        
        const player = document.getElementById('video-player');
        const serverContainer = document.getElementById('server-options');

        if (data.streams.length > 0) {
            player.src = data.streams[0].url;
            
            serverContainer.innerHTML = data.streams.map((stream, index) => `
                <button class="server-tag ${index === 0 ? 'active' : ''}" 
                    onclick="changeServer('${stream.url}', this)">
                     ${stream.server}
                </button>
            `).join('');
        } else {
            alert('Maaf, stream belum tersedia untuk episode ini.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        loader(false);
    }
}

function changeServer(url, btn) {
    document.getElementById('video-player').src = url;
    document.querySelectorAll('.server-tag').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// Navigasi
function goHome() { loadLatest(); }
function backToDetail() {
    hide('watch-view');
    show('detail-view');
    document.getElementById('video-player').src = ''; 
}

// Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Init
document.addEventListener('DOMContentLoaded', loadLatest);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});