const API_BASE = '/api';

// --- CONFIG ---
const HOME_SECTIONS = [
    { title: "LayarOtaku Update", type: "latest", badge: "Ongoing", color: "pink" },
    { title: "Trending Action", type: "query", queries: ["jujutsu", "solo leveling", "kaiju", "wind breaker"], badge: "Hot", color: "blue" },
    { title: "Donghua Server", type: "query", queries: ["donghua", "btth", "soul land", "swallowed"], badge: "Anichin", color: "pink" },
    { title: "Romance Picks", type: "query", queries: ["romance", "harem", "school", "roshidere"], badge: "Love", color: "blue" }
];

// UTILS
const getEl = (id) => document.getElementById(id);
const showEl = (id) => getEl(id)?.classList.remove('hidden');
const hideEl = (id) => getEl(id)?.classList.add('hidden');
const loader = (active) => active ? showEl('loading') : hideEl('loading');

// GLOBAL STATE
let currentAnimeEpisodes = []; 
let currentWatchContext = {};  
let watchTimer = null;         
let trackedSeconds = 0;        

// --- NAVIGATION ---
function switchView(viewId) {
    // Sembunyikan semua view
    ['home-view', 'detail-view', 'watch-view', 'list-view', 'profile-view'].forEach(id => hideEl(id));
    // Tampilkan view target
    showEl(viewId);
    
    // Header logic: Sembunyikan header utama hanya di Watch View
    if (viewId === 'watch-view') {
        hideEl('main-header');
    } else {
        showEl('main-header');
    }
    
    // Bottom Nav Logic
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    if (viewId === 'home-view') getEl('nav-home')?.classList.add('active');
    if (viewId === 'profile-view') getEl('nav-profile')?.classList.add('active');
    
    // Stop timer jika keluar dari watch
    if (viewId !== 'watch-view') stopWatchTimer();
}

function goHome() {
    switchView('home-view');
    loadHomeData();
    checkResumePopup();
}

function goProfile() { switchView('profile-view'); }

// --- HELPER: EPISODE NUMBER EXTRACTOR ---
function extractEpNumber(title) {
    if (!title) return '?';
    let match = title.match(/Episode\s+(\d+)/i);
    if (match) return match[1];
    match = title.match(/(\d+)$/);
    if (match) return match[1];
    match = title.match(/(\d+)/);
    return match ? match[1] : title;
}

// --- SEARCH ---
function toggleSearch() {
    const overlay = getEl('search-overlay');
    overlay.classList.toggle('hidden');
    if (!overlay.classList.contains('hidden')) getEl('searchInput').focus();
}

async function handleSearch(manualQuery = null, isListTab = false) {
    const query = manualQuery || getEl('searchInput').value;
    if (!query) return;

    if(!getEl('search-overlay').classList.contains('hidden')) toggleSearch();
    loader(true);

    // Sekarang hasil pencarian selalu pakai layout List
    const targetView = 'list-view';
    const containerId = 'list-results';
    
    switchView(targetView);
    const container = getEl(containerId);
    
    container.innerHTML = `<div class="section-title"><div class="bar-accent blue"></div><h3>Hasil: "${query}"</h3></div>`;

    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        const grid = document.createElement('div');
        grid.className = 'episode-grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))';
        
        if (!data || data.length === 0) {
            container.innerHTML += '<p style="text-align:center; color:#888;">Tidak ditemukan.</p>';
        } else {
            grid.innerHTML = data.map(anime => `
                <div class="anime-card" onclick="loadDetail('${anime.url}')" style="min-width:auto; max-width:none">
                    <img src="${anime.image}" class="card-img">
                    <div class="badge-ep">${anime.score || 'Ep ?'}</div>
                    <div class="card-overlay">
                        <div class="card-title">${anime.title}</div>
                    </div>
                </div>
            `).join('');
            container.appendChild(grid);
        }
    } catch (e) {
        console.error(e);
        container.innerHTML += '<p style="text-align:center; color:red;">Gagal memuat.</p>';
    } finally {
        loader(false);
    }
}

// --- HOME DATA ---
async function loadHomeData() {
    renderHistorySection();
    const container = getEl('home-content');
    if (container.childElementCount > 0) return;

    loader(true);
    try {
        for (const section of HOME_SECTIONS) {
            let data = [];
            if (section.type === 'latest') {
                const res = await fetch(`${API_BASE}/latest`);
                data = await res.json();
            } else {
                const promises = section.queries.map(q => fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`).then(r=>r.json()).catch(()=>[]));
                const results = await Promise.all(promises);
                results.forEach(arr => { if(Array.isArray(arr)) data = [...data, ...arr]; });
                data = [...new Map(data.map(item => [item.url, item])).values()];
            }

            if (data.length > 0) renderSection(section, data.slice(0, 10));
        }
    } catch (e) { console.error(e); } 
    finally { loader(false); }
}

function renderSection(config, list) {
    const container = getEl('home-content');
    const div = document.createElement('div');
    div.innerHTML = `
        <div class="section-title">
            <div class="bar-accent ${config.color}"></div>
            <h3>${config.title}</h3>
            <span class="badge-soft">${config.badge}</span>
        </div>
        <div class="horizontal-scroll">
            ${list.map(anime => `
                <div class="anime-card" onclick="loadDetail('${anime.url}')">
                    <span class="badge-ep">${anime.episode || '?'}</span>
                    <img src="${anime.image}" class="card-img" loading="lazy">
                    <div class="card-overlay">
                        <div class="card-title">${anime.title}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    container.appendChild(div);
}

// --- DETAIL & WATCH LOGIC ---

// mode: 'view' (pindah hal), 'data' (background fetch)
async function loadDetail(url, mode = 'view') {
    if (mode === 'view') {
        loader(true);
        switchView('detail-view');
    }
    
    try {
        const res = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        currentAnimeEpisodes = data.episodes;
        currentWatchContext = {
            title: data.title,
            image: data.image,
            mainUrl: url
        };

        if (mode === 'view') {
            getEl('anime-info').innerHTML = `
                <div class="detail-hero">
                    <img src="${data.image}" class="detail-poster">
                    <h2>${data.title}</h2>
                    <div style="font-size:0.8rem; color:var(--primary); margin-bottom:10px">${data.info.genre || 'Anime'}</div>
                    <p class="desc">${data.description}</p>
                </div>
            `;
            
            getEl('episode-grid').innerHTML = data.episodes.map(ep => {
                const epNum = extractEpNumber(ep.title);
                return `<div class="ep-btn" onclick="startWatchSession('${ep.url}', '${epNum}')">${epNum}</div>`
            }).join('');
        }
        
        return true; 

    } catch (e) { 
        console.error(e);
        if(mode === 'view') alert("Gagal memuat detail anime.");
        return false;
    } 
    finally { 
        if (mode === 'view') loader(false); 
    }
}

function backToDetail() {
    if (currentWatchContext.mainUrl) {
        loadDetail(currentWatchContext.mainUrl, 'view');
    } else {
        goHome();
    }
}

// --- PLAYER ---
function startWatchSession(epUrl, epNum, startTime = 0) {
    trackedSeconds = startTime;
    loadVideo(epUrl, epNum);
}

async function loadVideo(epUrl, epNum) {
    loader(true);
    switchView('watch-view');
    
    getEl('video-title').innerText = `${currentWatchContext.title || 'Anime'} - Ep ${epNum}`;
    getEl('current-ep-badge').innerText = `Ep ${epNum}`;

    // Ensure playlist exists
    if (currentAnimeEpisodes.length === 0 && currentWatchContext.mainUrl) {
        await loadDetail(currentWatchContext.mainUrl, 'data');
    }
    renderWatchPlaylist(epNum);
    
    startWatchTimer(epUrl, epNum);

    try {
        const res = await fetch(`${API_BASE}/watch?url=${encodeURIComponent(epUrl)}`);
        const data = await res.json();
        
        const player = getEl('video-player');
        
        // Filter Mega
        const validStreams = data.streams.filter(s => !s.server.toLowerCase().includes('mega'));

        if (validStreams.length > 0) {
            player.src = validStreams[0].url;
            getEl('server-options').innerHTML = validStreams.map((s, i) => `
                <button class="server-btn ${i === 0 ? 'active' : ''}" 
                    onclick="changeServer('${s.url}', this)">${s.server}</button>
            `).join('');
        } else {
            alert("Maaf, stream tidak tersedia.");
        }
    } catch (e) { console.error(e); } 
    finally { loader(false); }
}

function changeServer(url, btn) {
    getEl('video-player').src = url;
    document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function renderWatchPlaylist(currentEpNum) {
    const container = getEl('watch-episode-list');
    container.innerHTML = currentAnimeEpisodes.map(ep => {
        const num = extractEpNumber(ep.title);
        const isActive = (num == currentEpNum) ? 'active' : ''; 
        return `<div class="ep-btn ${isActive}" onclick="startWatchSession('${ep.url}', '${num}')">${num}</div>`;
    }).join('');
}

// --- HISTORY & RESUME (FIXED) ---
function startWatchTimer(epUrl, epNum) {
    stopWatchTimer();
    saveToHistory(epUrl, epNum, trackedSeconds);
    watchTimer = setInterval(() => {
        trackedSeconds += 10;
        saveToHistory(epUrl, epNum, trackedSeconds);
    }, 10000); 
}

function stopWatchTimer() {
    if (watchTimer) clearInterval(watchTimer);
}

function formatTime(seconds) {
    if(!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0'+s : s}`;
}

function saveToHistory(epUrl, epNum, seconds) {
    if (!currentWatchContext.title) return; 

    let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
    history = history.filter(h => h.mainUrl !== currentWatchContext.mainUrl);
    
    history.unshift({
        title: currentWatchContext.title,
        image: currentWatchContext.image,
        mainUrl: currentWatchContext.mainUrl,
        epUrl: epUrl,
        epNum: epNum,
        seconds: seconds,
        date: new Date().getTime()
    });

    if (history.length > 6) history.pop();
    localStorage.setItem('watchHistory', JSON.stringify(history));
}

function renderHistorySection() {
    const history = JSON.parse(localStorage.getItem('watchHistory')) || [];
    const container = getEl('history-list');
    const section = getEl('history-section');

    if (history.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    container.innerHTML = history.map(h => `
        <div class="anime-card" onclick="resumeVideo('${h.epUrl}', '${h.epNum}', '${h.mainUrl}', '${h.title}', '${h.image}', ${h.seconds})">
            <span class="badge-ep" style="background:#e056fd; font-size:0.75rem;">Lanjut Ep ${h.epNum || '?'}</span>
            <img src="${h.image}" class="card-img">
            <div class="card-overlay">
                <div class="card-title">${h.title}</div>
                <small class="history-progress">🕒 ${formatTime(h.seconds)}</small>
            </div>
        </div>
    `).join('');
}

// FIX UTAMA: Resume tanpa Refresh
async function resumeVideo(epUrl, epNum, mainUrl, title, image, seconds) {
    // 1. Set context secara manual
    currentWatchContext = { title, image, mainUrl };
    
    // 2. Langsung tampilkan loader dan pindah ke view watch (biar user tau ada proses)
    loader(true);
    switchView('watch-view');
    getEl('video-title').innerText = "Memuat data...";
    
    // 3. Fetch list episode di background ('data' mode)
    const success = await loadDetail(mainUrl, 'data');
    
    // 4. Jika sukses, baru putar video. Jika gagal, stop loading.
    if(success) {
        startWatchSession(epUrl, epNum, seconds);
    } else {
        alert("Gagal melanjutkan video. Silakan coba cari anime ini secara manual.");
        goHome();
        loader(false);
    }
}

// --- POPUP RESUME ---
function checkResumePopup() {
    const history = JSON.parse(localStorage.getItem('watchHistory')) || [];
    if (history.length > 0) {
        const last = history[0];
        if ((new Date().getTime() - last.date) < 86400000) {
            getEl('resume-text').innerText = `Lanjut ${last.title} Ep ${last.epNum}?`;
            getEl('resume-toast').dataset.resumeData = JSON.stringify(last);
            
            const toast = getEl('resume-toast');
            toast.classList.remove('hidden');
            setTimeout(() => { toast.classList.add('hidden'); }, 8000);
        }
    }
}

function confirmResume() {
    const raw = getEl('resume-toast').dataset.resumeData;
    if(!raw) return;
    const data = JSON.parse(raw);
    closeResume();
    resumeVideo(data.epUrl, data.epNum, data.mainUrl, data.title, data.image, data.seconds);
}

function closeResume() {
    getEl('resume-toast').classList.add('hidden');
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    goHome();
    getEl('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});