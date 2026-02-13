const API_BASE = '/api'; 

const HOME_SECTIONS = [
    { 
        title: "Lanjutkan Menonton", 
        mode: "latest",
        badge: null,
        className: "continue-watch"
    },
    { 
        title: "LayarOtaku Update", 
        queries: ["isekai", "world"],
        badge: "Ongoing",
        badgeClass: "ongoing"
    },
    { 
        title: "Nimegami Update", 
        queries: ["magic", "adventure"],
        badge: "Anime & Movie",
        badgeClass: "movie"
    },
    { 
        title: "Donghua Terbaru", 
        queries: ["donghua", "martial arts"],
        badge: "Anichin",
        badgeClass: "anichin"
    },
    { 
        title: "Action Hits ⚔️", 
        queries: ["jujutsu", "piece", "hunter"] 
    }
];

// UI Control
const show = (id) => document.getElementById(id).classList.remove('hidden');
const hide = (id) => document.getElementById(id).classList.add('hidden');
const loader = (state) => state ? show('loading') : hide('loading');

function toggleSearch() {
    const overlay = document.getElementById('search-overlay');
    overlay.classList.toggle('hidden');
    if(!overlay.classList.contains('hidden')) {
        document.getElementById('searchInput').focus();
    }
}

// Load Home
async function loadLatest() {
    loader(true);
    hide('detail-view');
    hide('watch-view');
    show('home-view');
    
    const homeContainer = document.getElementById('home-view');
    homeContainer.innerHTML = '';

    try {
        for (const section of HOME_SECTIONS) {
            let data = [];
            if (section.mode === 'latest') {
                const res = await fetch(`${API_BASE}/latest`);
                data = await res.json();
                // Limit for "Continue Watch"
                data = data.slice(0, 5);
            } else {
                const promises = section.queries.map(q => 
                    fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => [])
                );
                const results = await Promise.all(promises);
                results.forEach(list => { if(Array.isArray(list)) data = [...data, ...list]; });
                data = removeDuplicates(data, 'url').slice(0, 12);
            }

            if (data.length > 0) {
                renderSection(section, data, homeContainer);
            }
        }
    } catch (err) {
        console.error("Engine Error:", err);
    } finally {
        loader(false);
    }
}

function removeDuplicates(array, key) {
    return [ ...new Map(array.map(item => [item[key], item])).values() ];
}

function renderSection(config, data, container) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = `category-section ${config.className || ''}`;

    const badgeHtml = config.badge ? `<span class="status-badge ${config.badgeClass}">${config.badge}</span>` : '';
    
    const headerHtml = `
        <div class="section-header-flex">
            <div class="section-title-wrap">
                <div class="accent-line"></div>
                <h2>${config.title}</h2>
                ${badgeHtml}
            </div>
            <div class="btn-more" onclick="handleSearch('${config.title.split(' ')[0]}')">Lihat Semua</div>
        </div>
    `;

    const cardsHtml = data.map(anime => {
        const eps = anime.episode || anime.score || '??';
        const isBig = config.className === 'continue-watch';
        
        return `
        <div class="scroll-card" onclick="loadDetail('${anime.url}')">
            <div class="card-thumb">
                <img src="${anime.image}" alt="${anime.title}" loading="lazy">
                <div class="badge-ep">${isBig ? 'Ep ' + eps : 'ON ' + eps}</div>
                <div class="play-overlay">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
            </div>
            <div class="card-title">${anime.title}</div>
        </div>
        `;
    }).join('');

    sectionDiv.innerHTML = headerHtml + `<div class="horizontal-scroll">${cardsHtml}</div>`;
    container.appendChild(sectionDiv);
}

// Search Logic
async function handleSearch(manualQuery = null) {
    const searchInput = document.getElementById('searchInput');
    const query = manualQuery || searchInput.value;
    if (!query) return;

    hide('search-overlay');
    loader(true);
    
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        hide('detail-view');
        hide('watch-view');
        show('home-view');

        const homeContainer = document.getElementById('home-view');
        homeContainer.innerHTML = `
            <div class="category-section" style="padding-top:20px">
                <div class="section-header-flex">
                    <div class="section-title-wrap">
                        <div class="accent-line"></div>
                        <h2>Hasil: "${query}"</h2>
                    </div>
                </div>
                <div class="horizontal-scroll" style="flex-wrap: wrap; overflow: visible;">
                    ${data.map(anime => `
                        <div class="scroll-card" onclick="loadDetail('${anime.url}')" style="margin-bottom:20px">
                            <div class="card-thumb"><img src="${anime.image}"></div>
                            <div class="card-title">${anime.title}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (e) { console.error(e); }
    finally { loader(false); }
}

// Detail & Watch (Sesuai Struktur Backend Anda)
async function loadDetail(url) {
    loader(true);
    try {
        const res = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        hide('home-view');
        hide('watch-view');
        show('detail-view');
        window.scrollTo(0,0);

        document.getElementById('anime-info').innerHTML = `
            <div class="detail-header" style="display:flex; gap:20px; padding:20px; flex-wrap:wrap;">
                <img src="${data.image}" style="width:150px; border-radius:12px; box-shadow:0 10px 20px rgba(0,0,0,0.5)">
                <div style="flex:1; min-width:200px;">
                    <h1 style="font-size:1.5rem; margin-bottom:10px;">${data.title}</h1>
                    <p style="color:var(--text-dim); font-size:0.9rem; line-height:1.6;">${data.description}</p>
                </div>
            </div>
        `;

        const epGrid = document.getElementById('episode-grid');
        epGrid.innerHTML = data.episodes.map(ep => {
            let epNum = ep.title.match(/\d+/);
            return `<div class="ep-box" onclick="loadVideo('${ep.url}')">${epNum ? epNum[0] : 'Ep'}</div>`;
        }).join('');

    } catch (err) { console.error(err); } 
    finally { loader(false); }
}

async function loadVideo(url) {
    loader(true);
    try {
        const res = await fetch(`${API_BASE}/watch?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        hide('detail-view');
        show('watch-view');
        window.scrollTo(0,0);

        document.getElementById('video-title').innerText = data.title;
        const player = document.getElementById('video-player');
        const serverContainer = document.getElementById('server-options');

        if (data.streams.length > 0) {
            player.src = data.streams[0].url;
            serverContainer.innerHTML = data.streams.map((s, i) => `
                <button class="server-tag ep-box ${i === 0 ? 'active' : ''}" 
                        onclick="document.getElementById('video-player').src='${s.url}'">
                    ${s.server}
                </button>
            `).join('');
        }
    } catch (err) { console.error(err); }
    finally { loader(false); }
}

function goHome() { loadLatest(); }
function backToDetail() {
    hide('watch-view');
    show('detail-view');
    document.getElementById('video-player').src = ''; 
}

// Init
document.addEventListener('DOMContentLoaded', loadLatest);