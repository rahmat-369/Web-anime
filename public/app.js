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
        queries: ["school", "gakuen", "classroom", "high school"] 
    },
    { 
        title: "Magic & Adventure ✨", 
        queries: ["magic", "adventure", "dragon", "dungeon"] 
    },
    { 
        title: "Comedy & Chill 😂", 
        queries: ["comedy", "slice of life", "bocchi", "spy"] 
    }
];

// Utility
const show = (id) => document.getElementById(id).classList.remove('hidden');
const hide = (id) => document.getElementById(id).classList.add('hidden');
const loader = (state) => state ? show('loading') : hide('loading');

// --- LOAD DATA HOME (MULTI QUERY & MERGE) ---
async function loadLatest() {
    loader(true);
    hide('detail-view');
    hide('watch-view');
    show('home-view');
    
    const homeContainer = document.getElementById('home-view');
    homeContainer.innerHTML = ''; // Reset konten

    try {
        // Loop setiap section yang ada di konfigurasi
        for (const section of HOME_SECTIONS) {
            let combinedData = [];

            if (section.mode === 'latest') {
                // Fetch Endpoint Latest (Khusus Trending)
                try {
                    const res = await fetch(`${API_BASE}/latest`);
                    combinedData = await res.json();
                } catch (e) { console.error("Gagal load latest", e); }
            } else {
                // Fetch Multi-Query (Gabungkan hasil dari beberapa kata kunci)
                // Kita gunakan Promise.all agar semua request berjalan bersamaan (cepat)
                const promises = section.queries.map(q => 
                    fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`)
                        .then(res => res.json())
                        .catch(() => [])
                );

                const results = await Promise.all(promises);
                
                // Gabungkan semua array hasil pencarian menjadi satu array besar
                results.forEach(list => {
                    if(Array.isArray(list)) combinedData = [...combinedData, ...list];
                });

                // Hapus Duplikat (Karena mungkin 1 anime muncul di 2 kata kunci berbeda)
                combinedData = removeDuplicates(combinedData, 'url');
            }

            // Render hanya jika ada data
            // Jika data kurang dari 5, kita duplikasi agar tampilan tetap penuh (Visual Hack)
            if (combinedData && combinedData.length > 0) {
                // Jika item kurang dari 6, duplikasi list tersebut agar scroll horizontal terlihat bagus
                if (combinedData.length < 6) {
                    combinedData = [...combinedData, ...combinedData, ...combinedData]; 
                }
                
                // Limit maksimal 15 item agar tidak terlalu berat loading gambarnya
                renderSection(section.title, combinedData.slice(0, 15), homeContainer);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        loader(false);
    }
}

// Fungsi Helper Hapus Duplikat
function removeDuplicates(array, key) {
    return [ ...new Map(array.map(item => [item[key], item])).values() ];
}

// Fungsi Render Satu Section (Horizontal Scroll)
function renderSection(title, data, container) {
    // Buat elemen section
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'category-section';

    // Tentukan kata kunci pencarian untuk tombol "Lainnya"
    // Ambil kata kunci pertama dari array atau judul
    const searchKeyword = title.split(' ')[0];

    // Buat Header (Judul + Tombol More)
    const headerHtml = `
        <div class="header-flex">
            <div class="section-header">
                <div class="bar-accent"></div>
                <h2>${title}</h2>
            </div>
            <a href="#" class="more-link" onclick="handleSearch('${searchKeyword}')">Lainnya</a>
        </div>
    `;

    // Buat Container Scroll Horizontal
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
    const query = manualQuery || searchInput.value;
    
    if (!query) return loadLatest();
    
    if(manualQuery) searchInput.value = manualQuery;

    loader(true);
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        hide('detail-view');
        hide('watch-view');
        show('home-view');

        const homeContainer = document.getElementById('home-view');
        homeContainer.innerHTML = ''; 

        const resultSection = document.createElement('div');
        resultSection.className = 'search-results-container';
        
        resultSection.innerHTML = `
            <div class="section-header mt-large">
                <div class="bar-accent"></div>
                <h2>Hasil Pencarian: "${query}"</h2>
            </div>
            <div class="anime-grid">
                ${data.map(anime => `
                    <div class="scroll-card" onclick="loadDetail('${anime.url}')" style="min-width: auto; max-width: none;">
                        <div class="scroll-card-img">
                            <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                            <div class="ep-badge">Ep ${anime.score || '?'}</div>
                        </div>
                        <h3 class="scroll-card-title">${anime.title}</h3>
                    </div>
                `).join('')}
            </div>
        `;
        
        homeContainer.appendChild(resultSection);

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
