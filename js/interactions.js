// Interactive Presentation Controls, Theme Engine & Shortcut Listeners for sAIs

// Theme Management System
const THEME_STORAGE_KEY = 'sais-presentation-theme';

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return 'dark'; // Dark mode default as specified
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  const iconSpan = document.getElementById('theme-toggle-icon-container');
  const labelSpan = document.getElementById('theme-toggle-label');

  if (iconSpan && labelSpan) {
    if (theme === 'dark') {
      // Show Sun icon (prompt to switch to Light)
      iconSpan.innerHTML = `
        <svg class="theme-toggle-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
      labelSpan.textContent = 'LIGHT [T]';
      toggleBtn.setAttribute('title', 'Switch to Engineering Blueprint (Light Mode) [T]');
      toggleBtn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      // Show Moon icon (prompt to switch to Dark)
      iconSpan.innerHTML = `
        <svg class="theme-toggle-icon" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
      labelSpan.textContent = 'DARK [T]';
      toggleBtn.setAttribute('title', 'Switch to Industrial Tech (Dark Mode) [T]');
      toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  // Trigger custom event for 3D canvases and SVGs to re-render colors if needed
  window.dispatchEvent(new CustomEvent('sais-theme-change', { detail: { theme } }));
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme state
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  // Bind click listener to theme toggle button
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTheme();
    });
  }

  // Create shortcut help modal in DOM
  const helpOverlay = document.createElement('div');
  helpOverlay.id = 'deck-help-modal';
  helpOverlay.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(7, 9, 14, 0.88);
    backdrop-filter: blur(8px);
    z-index: 9999;
    align-items: center;
    justify-content: center;
  `;

  helpOverlay.innerHTML = `
    <div style="background: var(--bg-card); border: 1.5px solid var(--accent-cyan); border-radius: 12px; padding: 28px; max-width: 520px; width: 90%; box-shadow: var(--shadow-card); font-family: 'Inter', sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
        <div style="font-weight: 700; color: var(--accent-cyan); font-family: monospace; font-size: 1.05rem;">// PRESENTATION SHORTCUTS</div>
        <div style="color: var(--text-muted); font-size: 0.82rem; cursor: pointer;" onclick="document.getElementById('deck-help-modal').style.display='none'">[ESC / CLOSE]</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; font-size: 0.86rem;">
        <div style="font-family: monospace; color: var(--accent-cyan); font-weight: bold;">[RIGHT] / [SPACE]</div><div style="color: var(--text-primary);">Next slide</div>
        <div style="font-family: monospace; color: var(--accent-cyan); font-weight: bold;">[LEFT]</div><div style="color: var(--text-primary);">Previous slide</div>
        <div style="font-family: monospace; color: var(--accent-cyan); font-weight: bold;">[T]</div><div style="color: var(--text-primary);">Toggle Dark / Light Mode</div>
        <div style="font-family: monospace; color: var(--accent-cyan); font-weight: bold;">[F]</div><div style="color: var(--text-primary);">Toggle Fullscreen</div>
        <div style="font-family: monospace; color: var(--accent-cyan); font-weight: bold;">[O] / [ESC]</div><div style="color: var(--text-primary);">Slide Overview Grid</div>
        <div style="font-family: monospace; color: var(--accent-cyan); font-weight: bold;">[B] / [.]</div><div style="color: var(--text-primary);">Pause / Blank Screen</div>
        <div style="font-family: monospace; color: var(--accent-cyan); font-weight: bold;">[?]</div><div style="color: var(--text-primary);">Toggle this shortcut guide</div>
      </div>
      <div style="margin-top: 22px; text-align: center;">
        <button onclick="document.getElementById('deck-help-modal').style.display='none'" style="background: var(--accent-cyan); color: #000; border: none; font-weight: bold; padding: 9px 22px; border-radius: 6px; cursor: pointer; font-size: 0.82rem;">
          GOT IT
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(helpOverlay);

  // Global keydown shortcut router
  document.addEventListener('keydown', (e) => {
    // Prevent interfering if an input field is active
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // 'T' or 't' to toggle theme
    if (e.key === 't' || e.key === 'T') {
      toggleTheme();
    }

    // 'F' or 'f' to toggle Fullscreen mode
    if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn(`Fullscreen toggle error: ${err.message}`);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    // '?' to toggle help modal
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      helpOverlay.style.display = helpOverlay.style.display === 'flex' ? 'none' : 'flex';
    }

    // Escape closes modal if open
    if (e.key === 'Escape' && helpOverlay.style.display === 'flex') {
      helpOverlay.style.display = 'none';
      e.stopPropagation();
    }
  });
});
