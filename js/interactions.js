// Interactive Presentation Controls & Shortcut Listeners for sAIs

document.addEventListener('DOMContentLoaded', () => {
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
    <div style="background: #0d1424; border: 1px solid #00f0ff; border-radius: 12px; padding: 28px; max-width: 500px; width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.8); font-family: 'Inter', sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
        <div style="font-weight: 700; color: #00f0ff; font-family: monospace; font-size: 1rem;">// PRESENTATION SHORTCUTS</div>
        <div style="color: #94a3b8; font-size: 0.8rem; cursor: pointer;" onclick="document.getElementById('deck-help-modal').style.display='none'">[ESC / CLOSE]</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 10px; font-size: 0.82rem;">
        <div style="font-family: monospace; color: #00f0ff;">[RIGHT] / [SPACE]</div><div style="color: #cbd5e1;">Next slide</div>
        <div style="font-family: monospace; color: #00f0ff;">[LEFT]</div><div style="color: #cbd5e1;">Previous slide</div>
        <div style="font-family: monospace; color: #00f0ff;">[F]</div><div style="color: #cbd5e1;">Toggle Fullscreen</div>
        <div style="font-family: monospace; color: #00f0ff;">[O] / [ESC]</div><div style="color: #cbd5e1;">Slide Overview Grid</div>
        <div style="font-family: monospace; color: #00f0ff;">[B] / [.]</div><div style="color: #cbd5e1;">Pause / Black Screen</div>
        <div style="font-family: monospace; color: #00f0ff;">[?]</div><div style="color: #cbd5e1;">Toggle this shortcut guide</div>
      </div>
      <div style="margin-top: 18px; text-align: center;">
        <button onclick="document.getElementById('deck-help-modal').style.display='none'" style="background: #00f0ff; color: #000; border: none; font-weight: bold; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
          GOT IT
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(helpOverlay);

  // Keydown shortcut router
  document.addEventListener('keydown', (e) => {
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
