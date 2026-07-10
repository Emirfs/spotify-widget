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

let isPlaying = false;
let isMiniMode = false;
let currentRawTitle = '';
const artCache = {}; // Cache to prevent API spamming

// 1. Interactive Scaling Logic (Size adjustments)
let currentScale = 1.0;
let scaleTimeout;

function updateScale(scale) {
  // Bounded scale limits: 0.6x (tiny) to 1.5x (large)
  currentScale = Math.max(0.6, Math.min(1.5, Math.round(scale * 100) / 100));
  
  // Set CSS custom property on root element
  document.documentElement.style.setProperty('--scale', currentScale);
  localStorage.setItem('scale', currentScale);
  
  // Tell main process to adjust electron window dimensions and coordinates
  ipcRenderer.send('set-scale', currentScale);
  
  // Visual Feedback overlay
  const percentage = Math.round(currentScale * 100);
  scaleIndicator.textContent = `${percentage}%`;
  scaleIndicator.classList.add('visible');
  
  clearTimeout(scaleTimeout);
  scaleTimeout = setTimeout(() => {
    scaleIndicator.classList.remove('visible');
  }, 1000);
}

// Initialize scale from localStorage on load
const savedScale = parseFloat(localStorage.getItem('scale'));
if (!isNaN(savedScale)) {
  // Let the DOM initialize, then update scale
  setTimeout(() => updateScale(savedScale), 50);
} else {
  // Send default scale to main process on start
  setTimeout(() => ipcRenderer.send('set-scale', 1.0), 50);
}

// Zoom with Ctrl + Mouse Wheel (or trackpad pinch-to-zoom)
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    const step = 0.05;
    updateScale(currentScale + (direction * step));
  }
}, { passive: false });

// Zoom with Ctrl + Keyboards (Ctrl +, Ctrl -, Ctrl 0)
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey) {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      updateScale(currentScale + 0.05);
    } else if (e.key === '-') {
      e.preventDefault();
      updateScale(currentScale - 0.05);
    } else if (e.key === '0') {
      e.preventDefault();
      updateScale(1.0);
    }
  }
});

// 2. Theme Persistence & Application
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
}

themeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// 3. Mini-Mode Toggle Logic (Double-Click)
function toggleMiniMode() {
  isMiniMode = !isMiniMode;
  if (isMiniMode) {
    widgetContainer.classList.add('mini-mode');
  } else {
    widgetContainer.classList.remove('mini-mode');
  }
}

// Double click container (excluding controls) to toggle mini-mode
widgetContainer.addEventListener('dblclick', (e) => {
  if (e.target.closest('button') || e.target.closest('.controls') || e.target.closest('.cover-overlay')) {
    return;
  }
  toggleMiniMode();
});

// Double click cover to toggle mini-mode
coverWrapper.addEventListener('dblclick', (e) => {
  e.stopPropagation();
  toggleMiniMode();
});

// 4. Playback State Synchronization (Icons)
function setPlaybackState(playing) {
  isPlaying = playing;
  if (playing) {
    // Main button icons
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    
    // Mini overlay icons
    miniPlayIcon.classList.add('hidden');
    miniPauseIcon.classList.remove('hidden');
  } else {
    // Main button icons
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    
    // Mini overlay icons
    miniPlayIcon.classList.remove('hidden');
    miniPauseIcon.classList.add('hidden');
  }
}

// 5. Clicking the cover toggles play/pause
coverWrapper.addEventListener('click', (e) => {
  if (e.detail > 1) return; 
  setPlaybackState(!isPlaying);
  ipcRenderer.send('spotify-control', 'playpause');
});

// 6. Marquee text scrolling helper
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

// 7. Album Art Fetching Logic (iTunes API + Deezer Fallback)
async function fetchAlbumArt(artist, song) {
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
      const artUrl = data.results[0].artworkUrl100.replace('100x100bb.jpg', '300x300bb.jpg');
      artCache[cacheKey] = artUrl;
      return artUrl;
    }
  } catch (err) {
    console.error("iTunes API error:", err);
  }

  try {
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(deezerUrl);
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const artUrl = data.data[0].album.cover_medium;
      artCache[cacheKey] = artUrl;
      return artUrl;
    }
  } catch (err) {
    console.error("Deezer API error:", err);
  }

  return null;
}

// Set image source with smooth fade-in
albumArt.onload = () => {
  albumArt.style.opacity = 1;
};

async function updateAlbumArt(artist, song) {
  albumArt.style.opacity = 0; 
  
  if (!artist || !song) {
    albumArt.src = '';
    return;
  }

  const artUrl = await fetchAlbumArt(artist, song);
  if (artUrl) {
    albumArt.src = artUrl;
  } else {
    albumArt.src = ''; 
  }
}

// 8. Listen for song updates from the main process
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
    updateAlbumArt(null, null); 
  } else if (!title || title.trim() === '') {
    setPlaybackState(false);
    updateTextWithMarquee(songTitle, titleContainer, 'Not Running');
    updateTextWithMarquee(songArtist, artistContainer, 'Start Spotify');
    updateAlbumArt(null, null);
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
    
    updateAlbumArt(artist, song);
  }
});

// 9. Wide controls events
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
