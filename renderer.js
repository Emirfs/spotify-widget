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

// New DOM Elements (Lyrics & Progress)
const lyricsPanel = document.getElementById('lyricsPanel');
const lyricsContent = document.getElementById('lyricsContent');
const lyricsBtn = document.getElementById('lyricsBtn');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');

let isPlaying = false;
let isMiniMode = false;
let currentRawTitle = '';
const artCache = {}; // Cache to prevent API spamming

// 1. Sizing and Scaling Logic
let currentScale = 1.0;
let scaleTimeout;

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
  }, 800);
});

// Load scale on startup
const savedScale = parseFloat(localStorage.getItem('scale'));
if (!isNaN(savedScale)) {
  document.documentElement.style.setProperty('--scale', savedScale);
  currentScale = savedScale;
  setTimeout(() => {
    ipcRenderer.send('set-scale', savedScale);
  }, 50);
} else {
  setTimeout(() => {
    ipcRenderer.send('set-scale', 1.0), 50;
  });
}

// 2. Theme Persistence
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
}

themeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// 3. Mini-Mode Toggle
function toggleMiniMode() {
  isMiniMode = !isMiniMode;
  if (isMiniMode) {
    widgetContainer.classList.add('mini-mode');
    // Hide lyrics when entering mini-mode
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

// 4. Playback State Synchronization
function setPlaybackState(playing) {
  isPlaying = playing;
  if (playing) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    miniPlayIcon.classList.add('hidden');
    miniPauseIcon.classList.remove('hidden');
  } else {
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

// 5. Marquee Helper
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

// 6. Progress Tracking Logic
let trackDurationMs = 0;
let currentPositionMs = 0;
let progressInterval = null;

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateProgressUI() {
  if (trackDurationMs > 0) {
    const percentage = (currentPositionMs / trackDurationMs) * 100;
    progressBar.style.width = `${percentage}%`;
    timeDisplay.textContent = `${formatTime(currentPositionMs)} / ${formatTime(trackDurationMs)}`;
  } else {
    progressBar.style.width = '0%';
    timeDisplay.textContent = '0:00 / 0:00';
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

// 7. Dynamic Color Adaptation (Dominant color extraction)
albumArt.crossOrigin = "anonymous"; // Enable CORS for canvas reading

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
    
    // Boost brightness if extracted color is too dark
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

// 8. Album Art & Duration Fetching Logic (iTunes API + Deezer Fallback)
async function fetchAlbumArtAndDuration(artist, song) {
  const cacheKey = `${artist.toLowerCase()} - ${song.toLowerCase()}`;
  if (artCache[cacheKey]) {
    return artCache[cacheKey];
  }

  const query = `${artist} ${song}`;
  
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=1&entity=song`;
    const res = await fetch(itunesUrl);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const artUrl = result.artworkUrl100.replace('100x100bb.jpg', '300x300bb.jpg');
      const durationMs = result.trackTimeMillis;
      const item = { artUrl, durationMs };
      artCache[cacheKey] = item;
      return item;
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
      const item = { artUrl, durationMs };
      artCache[cacheKey] = item;
      return item;
    }
  } catch (err) {
    console.error("Deezer API error:", err);
  }

  return null;
}

async function updateTrackMetadata(artist, song) {
  albumArt.style.opacity = 0; 
  resetAccentColor();
  
  if (!artist || !song) {
    albumArt.src = '';
    trackDurationMs = 0;
    currentPositionMs = 0;
    updateProgressUI();
    return;
  }

  const item = await fetchAlbumArtAndDuration(artist, song);
  if (item) {
    albumArt.src = item.artUrl;
    trackDurationMs = item.durationMs;
    currentPositionMs = 0;
    updateProgressUI();
    startProgressTimer();
  } else {
    albumArt.src = ''; 
    trackDurationMs = 0;
    currentPositionMs = 0;
    updateProgressUI();
  }
}

// 9. Lyrics Panel Logic
let lyricsOpen = false;

function toggleLyricsPanel(open) {
  lyricsOpen = open;
  if (lyricsOpen) {
    document.body.classList.add('with-lyrics');
    lyricsBtn.classList.add('active');
    fetchAndDisplayLyrics();
  } else {
    document.body.classList.remove('with-lyrics');
    lyricsBtn.classList.remove('active');
  }
  
  // Resize Electron window bounds accordingly
  ipcRenderer.send('set-lyrics-height', { open: lyricsOpen, scale: currentScale });
}

lyricsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleLyricsPanel(!lyricsOpen);
});

async function fetchAndDisplayLyrics() {
  const titleText = songTitle.textContent || '';
  const artistText = songArtist.textContent || '';
  
  if (titleText === 'Loading...' || titleText === 'Paused' || titleText === 'Not Running' || titleText === 'Spotify is active') {
    lyricsContent.innerHTML = '<div style="opacity: 0.6; margin-top: 40px;">No music detected.</div>';
    return;
  }
  
  lyricsContent.innerHTML = '<div style="opacity: 0.6; margin-top: 40px;">Loading lyrics...</div>';
  
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artistText)}/${encodeURIComponent(titleText)}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.lyrics) {
      lyricsContent.textContent = data.lyrics;
      lyricsContent.scrollTop = 0; // Reset scroll position to top
    } else {
      lyricsContent.innerHTML = '<div style="opacity: 0.6; margin-top: 40px;">Lyrics not found.</div>';
    }
  } catch (err) {
    console.error("Lyrics API fetch error:", err);
    lyricsContent.innerHTML = '<div style="opacity: 0.6; margin-top: 40px;">Error loading lyrics.</div>';
  }
}

// 10. Listen for song updates from the main process
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
    updateTrackMetadata(null, null); 
  } else if (!title || title.trim() === '') {
    setPlaybackState(false);
    updateTextWithMarquee(songTitle, titleContainer, 'Not Running');
    updateTextWithMarquee(songArtist, artistContainer, 'Start Spotify');
    updateTrackMetadata(null, null);
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
    
    // Fetch Cover art, Duration & Start Timer
    await updateTrackMetadata(artist, song);

    // Auto-update lyrics panel if currently visible
    if (lyricsOpen) {
      fetchAndDisplayLyrics();
    }
  }
});

// 11. Wide controls events
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
