const { ipcRenderer } = require('electron');

// DOM Elements
const widgetContainer = document.getElementById('widgetContainer');
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const coverWrapper = document.getElementById('coverWrapper');
const coverOverlay = document.getElementById('coverOverlay');
const albumArt = document.getElementById('albumArt');
const coverPlaceholder = document.getElementById('coverPlaceholder');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const miniPlayIcon = document.querySelector('.mini-play-icon');
const miniPauseIcon = document.querySelector('.mini-pause-icon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const closeBtn = document.getElementById('closeBtn');
const themeBtn = document.getElementById('themeBtn');
const scaleIndicator = document.getElementById('scaleIndicator');

// Lyrics & Progress DOM Elements
const lyricsPanel = document.getElementById('lyricsPanel');
const lyricsContent = document.getElementById('lyricsContent');
const lyricsBtn = document.getElementById('lyricsBtn');
const transparencyBtn = document.getElementById('transparencyBtn');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');
const lyricLine = document.getElementById('lyricLine');
const lyricLineContainer = document.getElementById('lyricLineContainer');

let isPlaying = false;
let isMiniMode = false;
let currentRawTitle = '';
const artCache = {}; 
let syncedLyricsArray = []; 
let plainLyricsText = ''; 

// 1. Sizing and Scaling Logic
let currentScale = 1.0;
let scaleTimeout;

// Synchronization helper to tell Main process the current settings
function syncSettingsToMain() {
  const isLight = document.body.classList.contains('light-theme');
  ipcRenderer.send('sync-settings', {
    theme: isLight ? 'light' : 'dark',
    transparency: isTransparentMode,
    scale: currentScale,
    lyricsOpen: lyricsOpen
  });
}

function updateScale(scale) {
  currentScale = Math.max(0.6, Math.min(1.5, Math.round(scale * 100) / 100));
  
  document.documentElement.style.setProperty('--scale', currentScale);
  localStorage.setItem('scale', currentScale);
  
  ipcRenderer.send('set-scale', currentScale);
  
  const percentage = Math.round(currentScale * 100);
  scaleIndicator.textContent = `${percentage}%`;
  scaleIndicator.classList.add('visible');
  
  clearTimeout(scaleTimeout);
  scaleTimeout = setTimeout(() => {
    scaleIndicator.classList.remove('visible');
    syncSettingsToMain();
  }, 1000);
}

window.addEventListener('resize', () => {
  if (isMiniMode) return; 

  const scale = window.innerWidth / 350;
  currentScale = Math.round(scale * 100) / 100;
  
  document.documentElement.style.setProperty('--scale', currentScale);
  localStorage.setItem('scale', currentScale);
  
  const percentage = Math.round(currentScale * 100);
  scaleIndicator.textContent = `${percentage}%`;
  scaleIndicator.classList.add('visible');
  
  clearTimeout(scaleTimeout);
  scaleTimeout = setTimeout(() => {
    scaleIndicator.classList.remove('visible');
    syncSettingsToMain(); // Update tray settings
  }, 800);
});

// Parse query parameters for CLI overrides
const urlParams = new URLSearchParams(window.location.search);
const forceMini = urlParams.get('mini') === 'true';
const forceTransparent = urlParams.get('transparent') === 'true';
const forceTheme = urlParams.get('theme'); // 'light' or 'dark'
const forceScale = parseFloat(urlParams.get('scale'));

// Load scale on startup
let savedScale = parseFloat(localStorage.getItem('scale'));
if (urlParams.has('scale') && !isNaN(forceScale)) {
  savedScale = forceScale;
}
if (!isNaN(savedScale)) {
  document.documentElement.style.setProperty('--scale', savedScale);
  currentScale = savedScale;
  setTimeout(() => {
    ipcRenderer.send('set-scale', savedScale);
    syncSettingsToMain();
  }, 50);
} else {
  setTimeout(() => {
    ipcRenderer.send('set-scale', 1.0);
    syncSettingsToMain();
  }, 50);
}

if (forceMini) {
  setTimeout(() => {
    toggleMiniMode();
  }, 100);
}

// 2. Theme Persistence
let savedTheme = localStorage.getItem('theme');
if (urlParams.has('theme')) {
  savedTheme = forceTheme;
}
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
} else {
  document.body.classList.remove('light-theme');
}

themeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  syncSettingsToMain();
});

// 3. Completely Transparent Mode
let isTransparentMode = false;
let savedTransparency = localStorage.getItem('transparency') === 'true';
if (urlParams.has('transparent')) {
  savedTransparency = forceTransparent;
}
if (savedTransparency) {
  isTransparentMode = true;
  widgetContainer.classList.add('pure-transparent');
  lyricsPanel.classList.add('pure-transparent');
  transparencyBtn.classList.add('active');
}

transparencyBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isTransparentMode = !isTransparentMode;
  updateTransparencyMode(isTransparentMode);
});

function updateTransparencyMode(isTransparent) {
  isTransparentMode = isTransparent;
  if (isTransparent) {
    widgetContainer.classList.add('pure-transparent');
    lyricsPanel.classList.add('pure-transparent');
    transparencyBtn.classList.add('active');
  } else {
    widgetContainer.classList.remove('pure-transparent');
    lyricsPanel.classList.remove('pure-transparent');
    transparencyBtn.classList.remove('active');
  }
  localStorage.setItem('transparency', isTransparent);
  syncSettingsToMain();
}

// 4. Mini-Mode Toggle
function toggleMiniMode() {
  isMiniMode = !isMiniMode;
  if (isMiniMode) {
    widgetContainer.classList.add('mini-mode');
    if (lyricsOpen) toggleLyricsPanel(false);
  } else {
    widgetContainer.classList.remove('mini-mode');
  }
  ipcRenderer.send('toggle-mini-mode', isMiniMode);
}

widgetContainer.addEventListener('dblclick', (e) => {
  if (e.target.closest('button') || e.target.closest('.controls') || e.target.closest('.cover-overlay')) {
    return;
  }
  toggleMiniMode();
});

coverWrapper.addEventListener('dblclick', (e) => {
  e.stopPropagation();
  toggleMiniMode();
});

// 5. Playback State Synchronization
function setPlaybackState(playing) {
  isPlaying = playing;
  if (playing) {
    widgetContainer.classList.add('playing');
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    miniPlayIcon.classList.add('hidden');
    miniPauseIcon.classList.remove('hidden');
  } else {
    widgetContainer.classList.remove('playing');
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    miniPlayIcon.classList.remove('hidden');
    miniPauseIcon.classList.add('hidden');
  }
}

coverWrapper.addEventListener('click', (e) => {
  if (e.detail > 1) return; 
  setPlaybackState(!isPlaying);
  ipcRenderer.send('spotify-control', 'playpause');
});

// 6. Marquee Helper
function updateTextWithMarquee(element, container, text) {
  element.classList.remove('marquee');
  element.style.animationDuration = '';
  element.textContent = text;

  const scrollWidth = element.scrollWidth;
  const containerWidth = container.clientWidth;

  if (scrollWidth > containerWidth) {
    element.innerHTML = `<span>${text}</span><span style="padding-left: 40px;">${text}</span>`;
    element.classList.add('marquee');
    const speed = Math.max(8, Math.round(scrollWidth / 25));
    element.style.animationDuration = `${speed}s`;
  }
}

// 7. Progress & Timed Lyrics Sync Logic
let trackDurationMs = 0;
let currentPositionMs = 0;
let progressInterval = null;
let lastLyricIndex = -1;

function updateProgressUI() {
  if (trackDurationMs > 0) {
    const percentage = (currentPositionMs / trackDurationMs) * 100;
    progressBar.style.width = `${percentage}%`;
    timeDisplay.textContent = `${formatTime(currentPositionMs)} / ${formatTime(trackDurationMs)}`;
    
    syncKaraokeLyrics();
  } else {
    progressBar.style.width = '0%';
    timeDisplay.textContent = '0:00 / 0:00';
    lyricLineContainer.classList.remove('active');
  }
}

function syncKaraokeLyrics() {
  if (syncedLyricsArray.length === 0) {
    lyricLineContainer.classList.remove('active');
    return;
  }

  let activeLine = "";
  let activeIndex = -1;

  for (let i = 0; i < syncedLyricsArray.length; i++) {
    if (currentPositionMs >= syncedLyricsArray[i].timeMs) {
      activeLine = syncedLyricsArray[i].text;
      activeIndex = i;
    } else {
      break;
    }
  }

  if (activeLine) {
    lyricLineContainer.classList.add('active');
    
    if (lyricLine.textContent !== activeLine) {
      lyricLine.style.opacity = 0;
      setTimeout(() => {
        lyricLine.textContent = activeLine;
        lyricLine.style.opacity = 1;
      }, 120);
    }

    if (lyricsOpen && activeIndex !== lastLyricIndex) {
      lastLyricIndex = activeIndex;
      const paragraphs = lyricsContent.querySelectorAll('p');
      paragraphs.forEach(p => p.classList.remove('active'));
      
      const activeParagraph = lyricsContent.querySelector(`p[data-index="${activeIndex}"]`);
      if (activeParagraph) {
        activeParagraph.classList.add('active');
        activeParagraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } else {
    lyricLineContainer.classList.remove('active');
  }
}

function startProgressTimer() {
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (isPlaying && trackDurationMs > 0) {
      currentPositionMs = Math.min(trackDurationMs, currentPositionMs + 1000);
      updateProgressUI();
    }
  }, 1000);
}

// 8. Dynamic Color Adaptation
albumArt.crossOrigin = "anonymous"; 

albumArt.onload = () => {
  albumArt.style.opacity = 1;
  
  try {
    const color = getDominantColor(albumArt);
    if (color) {
      document.documentElement.style.setProperty('--accent-color', `rgb(${color.r}, ${color.g}, ${color.b})`);
      document.documentElement.style.setProperty('--shadow-glow', `rgba(${color.r}, ${color.g}, ${color.b}, 0.22)`);
    } else {
      resetAccentColor();
    }
  } catch (err) {
    console.warn("Failed to extract color:", err.message);
    resetAccentColor();
  }
};

function getDominantColor(imgEl) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 5;
  canvas.height = 5;
  
  try {
    ctx.drawImage(imgEl, 0, 0, 5, 5);
    const imgData = ctx.getImageData(0, 0, 5, 5).data;
    
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      r += imgData[i];
      g += imgData[i+1];
      b += imgData[i+2];
      count++;
    }
    
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness < 40) {
      r = Math.min(255, r + 60);
      g = Math.min(255, g + 60);
      b = Math.min(255, b + 60);
    }
    
    return { r, g, b };
  } catch (e) {
    return null;
  }
}

function resetAccentColor() {
  document.documentElement.style.setProperty('--accent-color', '#1DB954');
  document.documentElement.style.setProperty('--shadow-glow', 'rgba(29, 185, 84, 0.12)');
}

// 9. Query Cleaning Helper (Strips Remasters, Live, brackets, parenthesized suffixes)
function cleanSongAndArtist(artist, song) {
  let cleanSong = song
    .replace(/\(.*?\)/g, '') 
    .replace(/\[.*?\]/g, '') 
    .replace(/\s-\s(?:\d{4}\s+)?Remastered.*$/i, '')
    .replace(/\s-\sLive.*$/i, '')
    .replace(/\s-\sRadio\s+Edit.*$/i, '')
    .replace(/\s-\sSingle\s+Version.*$/i, '')
    .replace(/\s-\sStereo.*$/i, '')
    .replace(/\s-\sMono.*$/i, '')
    .replace(/\s-\sMix.*$/i, '')
    .trim();
    
  if (!cleanSong) cleanSong = song; 
  
  return {
    cleanArtist: artist.trim(),
    cleanSong: cleanSong
  };
}

// 10. Album Art, Duration & Synced Lyrics Fetching (LRCLIB + iTunes + Deezer)
async function fetchTrackData(artist, song) {
  const cacheKey = `${artist.toLowerCase()} - ${song.toLowerCase()}`;
  if (artCache[cacheKey]) {
    return artCache[cacheKey];
  }

  const artworkPromise = fetchArtworkAndDurationFromCDNs(artist, song);
  const lyricsPromise = fetchLyricsFromLRCLIB(artist, song);
  
  const [artworkData, lyricsData] = await Promise.all([artworkPromise, lyricsPromise]);

  const item = {
    artUrl: artworkData ? artworkData.artUrl : '',
    durationMs: artworkData ? artworkData.durationMs : 0,
    syncedLyrics: lyricsData ? lyricsData.syncedLyrics : '',
    plainLyrics: lyricsData ? lyricsData.plainLyrics : ''
  };

  artCache[cacheKey] = item;
  return item;
}

async function fetchArtworkAndDurationFromCDNs(artist, song) {
  const { cleanArtist, cleanSong } = cleanSongAndArtist(artist, song);
  const query = `${cleanArtist} ${cleanSong}`;
  
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=1&entity=song`;
    const res = await fetch(itunesUrl);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const artUrl = result.artworkUrl100.replace('100x100bb.jpg', '300x300bb.jpg');
      const durationMs = result.trackTimeMillis;
      return { artUrl, durationMs };
    }
  } catch (err) {
    console.error("iTunes API error:", err);
  }

  try {
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(deezerUrl);
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const result = data.data[0];
      const artUrl = result.album.cover_medium;
      const durationMs = result.duration * 1000;
      return { artUrl, durationMs };
    }
  } catch (err) {
    console.error("Deezer API error:", err);
  }

  return null;
}

async function fetchLyricsFromLRCLIB(artist, song) {
  const { cleanArtist, cleanSong } = cleanSongAndArtist(artist, song);
  
  try {
    const url = `https://lrclib.net/api/get?artist=${encodeURIComponent(cleanArtist)}&track=${encodeURIComponent(cleanSong)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return {
        syncedLyrics: data.syncedLyrics || '',
        plainLyrics: data.plainLyrics || ''
      };
    }
  } catch (err) {
    console.error("LRCLIB API error:", err);
  }
  return null;
}

// LRC Timestamps Parser
function parseLRC(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;
  
  for (const line of lines) {
    timeRegex.lastIndex = 0;
    const matches = [];
    let match;
    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const msStr = match[3] || '00';
      let ms = parseInt(msStr, 10);
      if (msStr.length === 2) {
        ms *= 10;
      }
      const timeMs = (min * 60 + sec) * 1000 + ms;
      matches.push(timeMs);
    }
    
    const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
    for (const timeMs of matches) {
      parsed.push({ timeMs, text });
    }
  }
  
  return parsed.sort((a, b) => a.timeMs - b.timeMs);
}

async function updateTrackMetadata(artist, song) {
  albumArt.style.opacity = 0; 
  resetAccentColor();
  syncedLyricsArray = [];
  plainLyricsText = '';
  lastLyricIndex = -1;
  lyricLine.textContent = '';
  lyricLineContainer.classList.remove('active');
  
  if (!artist || !song) {
    albumArt.src = '';
    trackDurationMs = 0;
    currentPositionMs = 0;
    updateProgressUI();
    return;
  }

  const item = await fetchTrackData(artist, song);
  if (item) {
    albumArt.src = item.artUrl;
    trackDurationMs = item.durationMs;
    currentPositionMs = 0;
    
    plainLyricsText = item.plainLyrics;
    if (item.syncedLyrics) {
      syncedLyricsArray = parseLRC(item.syncedLyrics);
    }
    
    updateProgressUI();
    startProgressTimer();
  } else {
    albumArt.src = ''; 
    trackDurationMs = 0;
    currentPositionMs = 0;
    updateProgressUI();
  }
}

// 11. Lyrics Panel Toggle and Content Renderer
let lyricsOpen = false;

function toggleLyricsPanel(open) {
  lyricsOpen = open;
  if (lyricsOpen) {
    document.body.classList.add('with-lyrics');
    lyricsBtn.classList.add('active');
    renderLyricsPanelContent();
  } else {
    document.body.classList.remove('with-lyrics');
    lyricsBtn.classList.remove('active');
  }
  ipcRenderer.send('set-lyrics-height', { open: lyricsOpen, scale: currentScale });
  syncSettingsToMain();
}

lyricsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleLyricsPanel(!lyricsOpen);
});

function renderLyricsPanelContent() {
  const titleText = songTitle.textContent || '';
  
  if (titleText === 'Loading...' || titleText === 'Paused' || titleText === 'Not Running' || titleText === 'Spotify is active') {
    lyricsContent.innerHTML = '<div style="opacity: 0.6; margin-top: 40px;">No music detected.</div>';
    return;
  }

  if (syncedLyricsArray.length > 0) {
    lyricsContent.innerHTML = '';
    syncedLyricsArray.forEach((line, index) => {
      const p = document.createElement('p');
      p.textContent = line.text || '...';
      p.setAttribute('data-index', index);
      if (index === lastLyricIndex) {
        p.classList.add('active');
      }
      lyricsContent.appendChild(p);
    });
    const activeParagraph = lyricsContent.querySelector(`p[data-index="${lastLyricIndex}"]`);
    if (activeParagraph) {
      setTimeout(() => {
        activeParagraph.scrollIntoView({ behavior: 'auto', block: 'center' });
      }, 50);
    }
  } 
  else if (plainLyricsText) {
    lyricsContent.textContent = plainLyricsText;
    lyricsContent.scrollTop = 0;
  } 
  else {
    lyricsContent.innerHTML = '<div style="opacity: 0.6; margin-top: 40px;">Lyrics not found.</div>';
  }
}

// 12. IPC Settings Synchronization Listeners (from Main Process)
ipcRenderer.on('change-theme', (event, theme) => {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  localStorage.setItem('theme', theme);
  syncSettingsToMain();
});

ipcRenderer.on('change-transparency', (event, isTransparent) => {
  updateTransparencyMode(isTransparent);
});

ipcRenderer.on('change-scale', (event, scale) => {
  updateScale(scale);
});

ipcRenderer.on('change-lyrics', (event, open) => {
  toggleLyricsPanel(open);
});

// 13. Listen for song updates from the main process
ipcRenderer.on('spotify-update', async (event, title) => {
  if (title === currentRawTitle) return;
  currentRawTitle = title;

  const titleContainer = document.querySelector('.title-container');
  const artistContainer = document.querySelector('.artist-container');
  const lowerTitle = title.toLowerCase();
  
  const isPaused = lowerTitle === 'spotify' || 
                   lowerTitle === 'spotify premium' || 
                   lowerTitle === 'spotify free' || 
                   lowerTitle === 'offline';

  if (isPaused) {
    setPlaybackState(false);
    updateTextWithMarquee(songTitle, titleContainer, 'Paused');
    updateTextWithMarquee(songArtist, artistContainer, 'Spotify is active');
    await updateTrackMetadata(null, null); 
  } else if (!title || title.trim() === '') {
    setPlaybackState(false);
    updateTextWithMarquee(songTitle, titleContainer, 'Not Running');
    updateTextWithMarquee(songArtist, artistContainer, 'Start Spotify');
    await updateTrackMetadata(null, null);
  } else {
    setPlaybackState(true);
    
    const parts = title.split(' - ');
    let artist = 'Unknown Artist';
    let song = title;

    if (parts.length >= 2) {
      artist = parts[0].trim();
      song = parts.slice(1).join(' - ').trim();
    }

    updateTextWithMarquee(songTitle, titleContainer, song);
    updateTextWithMarquee(songArtist, artistContainer, artist);
    
    await updateTrackMetadata(artist, song);

    if (lyricsOpen) {
      renderLyricsPanelContent();
    }
  }
});

// 14. Wide controls events
playPauseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setPlaybackState(!isPlaying);
  ipcRenderer.send('spotify-control', 'playpause');
});

prevBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  ipcRenderer.send('spotify-control', 'prev');
});

nextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  ipcRenderer.send('spotify-control', 'next');
});

closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  ipcRenderer.send('spotify-control', 'close');
});
