const { ipcRenderer } = require('electron');

// DOM Elements
const widgetContainer = document.getElementById('widgetContainer');
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const vinyl = document.getElementById('vinyl');
const vinylOverlay = document.getElementById('vinylOverlay');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const miniPlayIcon = document.querySelector('.mini-play-icon');
const miniPauseIcon = document.querySelector('.mini-pause-icon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const closeBtn = document.getElementById('closeBtn');
const themeBtn = document.getElementById('themeBtn');

let isPlaying = false;
let isMiniMode = false;
let currentRawTitle = '';

// 1. Theme Persistence & Application
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
}

themeBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent dblclick or other container events
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// 2. Mini-Mode Toggle Logic (Double-Click)
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
  if (e.target.closest('button') || e.target.closest('.controls') || e.target.closest('.vinyl-overlay')) {
    return;
  }
  toggleMiniMode();
});

// Double click vinyl to toggle mini-mode
vinyl.addEventListener('dblclick', (e) => {
  e.stopPropagation();
  toggleMiniMode();
});

// 3. Playback State Synchronization (Icons and Vinyl rotation)
function setPlaybackState(playing) {
  isPlaying = playing;
  if (playing) {
    vinyl.classList.remove('paused');
    vinyl.classList.add('playing');
    
    // Main button icons
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    
    // Mini overlay icons
    miniPlayIcon.classList.add('hidden');
    miniPauseIcon.classList.remove('hidden');
  } else {
    vinyl.classList.remove('playing');
    vinyl.classList.add('paused');
    
    // Main button icons
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    
    // Mini overlay icons
    miniPlayIcon.classList.remove('hidden');
    miniPauseIcon.classList.add('hidden');
  }
}

// 4. Clicking the vinyl toggles play/pause (convenient in both modes)
vinyl.addEventListener('click', (e) => {
  // Prevent click when double clicking
  if (e.detail > 1) return; 
  setPlaybackState(!isPlaying);
  ipcRenderer.send('spotify-control', 'playpause');
});

// 5. Marquee text scrolling helper
function updateTextWithMarquee(element, container, text) {
  element.classList.remove('marquee');
  element.style.animationDuration = '';
  element.textContent = text;

  const scrollWidth = element.scrollWidth;
  const containerWidth = container.clientWidth;

  if (scrollWidth > containerWidth) {
    element.innerHTML = `<span>${text}</span><span style="padding-left: 40px;">${text}</span>`;
    element.classList.add('marquee');
    const speed = Math.max(8, Math.round(scrollWidth / 25)); // Slightly faster marquee
    element.style.animationDuration = `${speed}s`;
  }
}

// 6. Listen for song updates from the main process
ipcRenderer.on('spotify-update', (event, title) => {
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
    
    // Vinyl paused state style
    vinyl.classList.add('paused');
  } else if (!title || title.trim() === '') {
    setPlaybackState(false);
    updateTextWithMarquee(songTitle, titleContainer, 'Not Running');
    updateTextWithMarquee(songArtist, artistContainer, 'Start Spotify');
    
    // Vinyl completely stopped
    vinyl.classList.remove('playing');
    vinyl.classList.remove('paused');
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
  }
});

// 7. Wide controls events
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
