const { ipcRenderer } = require('electron');

// DOM Elements
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const vinyl = document.getElementById('vinyl');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const closeBtn = document.getElementById('closeBtn');

let isPlaying = false;
let currentRawTitle = '';

// Marquee check helper
function updateTextWithMarquee(element, container, text) {
  // Clear styles & content first
  element.classList.remove('marquee');
  element.style.animationDuration = '';
  element.textContent = text;

  // Let browser calculate dimensions
  const scrollWidth = element.scrollWidth;
  const containerWidth = container.clientWidth;

  if (scrollWidth > containerWidth) {
    // Duplicate text for seamless scrolling
    element.innerHTML = `<span>${text}</span><span style="padding-left: 40px;">${text}</span>`;
    element.classList.add('marquee');
    
    // Calculate speed dynamically based on text length (approx 40px per second)
    const speed = Math.max(8, Math.round(scrollWidth / 30));
    element.style.animationDuration = `${speed}s`;
  }
}

// Listen for song updates from main process
ipcRenderer.on('spotify-update', (event, title) => {
  if (title === currentRawTitle) return;
  currentRawTitle = title;

  const titleContainer = document.querySelector('.title-container');
  const artistContainer = document.querySelector('.artist-container');

  const lowerTitle = title.toLowerCase();
  
  // Check if Spotify is paused or offline
  const isPaused = lowerTitle === 'spotify' || 
                   lowerTitle === 'spotify premium' || 
                   lowerTitle === 'spotify free' || 
                   lowerTitle === 'offline';

  if (isPaused) {
    isPlaying = false;
    
    // Update UI
    updateTextWithMarquee(songTitle, titleContainer, 'Paused');
    updateTextWithMarquee(songArtist, artistContainer, 'Spotify is active');
    
    // Vinyl State
    vinyl.classList.remove('playing');
    vinyl.classList.add('paused');

    // Button Icons
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  } else if (!title || title.trim() === '') {
    isPlaying = false;
    
    // Update UI
    updateTextWithMarquee(songTitle, titleContainer, 'Not Running');
    updateTextWithMarquee(songArtist, artistContainer, 'Start Spotify');
    
    // Vinyl State
    vinyl.classList.remove('playing');
    vinyl.classList.remove('paused');

    // Button Icons
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  } else {
    isPlaying = true;
    
    // Parse Artist and Song
    // Formats: "Artist - Song Title" or just "Song Title"
    const parts = title.split(' - ');
    let artist = 'Unknown Artist';
    let song = title;

    if (parts.length >= 2) {
      artist = parts[0].trim();
      song = parts.slice(1).join(' - ').trim();
    }

    // Update UI
    updateTextWithMarquee(songTitle, titleContainer, song);
    updateTextWithMarquee(songArtist, artistContainer, artist);

    // Vinyl State
    vinyl.classList.remove('paused');
    vinyl.classList.add('playing');

    // Button Icons
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  }
});

// Control Events
playPauseBtn.addEventListener('click', () => {
  // Optimistic UI updates
  if (isPlaying) {
    vinyl.classList.remove('playing');
    vinyl.classList.add('paused');
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  } else {
    vinyl.classList.remove('paused');
    vinyl.classList.add('playing');
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  }
  isPlaying = !isPlaying;
  
  ipcRenderer.send('spotify-control', 'playpause');
});

prevBtn.addEventListener('click', () => {
  ipcRenderer.send('spotify-control', 'prev');
});

nextBtn.addEventListener('click', () => {
  ipcRenderer.send('spotify-control', 'next');
});

closeBtn.addEventListener('click', () => {
  ipcRenderer.send('spotify-control', 'close');
});
