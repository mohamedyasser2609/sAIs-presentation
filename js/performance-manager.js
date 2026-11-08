/**
 * sAIs Performance Manager
 * Adaptive rendering profiles for Three.js/WebGL across laptop and external displays.
 *
 * Usage:
 *   window.saisPerformanceManager   – access the singleton
 *   Shift+P                         – toggle the on-screen performance monitor
 *   Custom event 'sais-profile-change' { detail: { profile } } – hot-swap profile
 */

(function () {
  'use strict';

  /* ======================================================================
     RENDERING PROFILES
     ====================================================================== */
  const PROFILES = {
    laptop: {
      name: 'Laptop',
      pixelRatio: 1.5,         // cap at 1.5× — avoids costly 2× on HiDPI screens
      shadowMapType: 'PCFSoftShadowMap',
      shadowMapSize: 2048,
      toneMappingExposureDark: 1.4,
      toneMappingExposureLight: 1.6,
    },
    external: {
      name: 'External Display',
      pixelRatio: 1.25,        // 1.25× — good quality, much cheaper on 4K screens
      shadowMapType: 'PCFShadowMap',
      shadowMapSize: 1024,
      toneMappingExposureDark: 1.3,
      toneMappingExposureLight: 1.5,
    },
    presentation: {
      name: 'Presentation Mode',
      pixelRatio: 1.0,         // native 1:1 — maximum performance on 85" 4K displays
      shadowMapType: 'BasicShadowMap',
      shadowMapSize: 512,
      toneMappingExposureDark: 1.2,
      toneMappingExposureLight: 1.4,
    },
  };

  /* ======================================================================
     AUTO-DETECT PROFILE
     ====================================================================== */
  function detectProfile() {
    const dpr      = window.devicePixelRatio || 1;
    const logicalW = window.screen.width     || 1920;
    const logicalH = window.screen.height    || 1080;

    // Windows Display Settings report LOGICAL (scaled) resolution in screen.width/height.
    // Multiply by devicePixelRatio to estimate the physical pixel count.
    // Example: 4K at 150% scaling → logicalW=2560, dpr=1.5 → physW=3840 ✓
    const physW = logicalW * dpr;
    const physH = logicalH * dpr;

    if (physW >= 3840 || physH >= 2160) return 'presentation'; // 4K physical pixels
    if (logicalW >= 2560 || logicalH >= 1440) return 'external'; // QHD or scaled 4K
    if (dpr > 1.5) return 'external';   // 2× HiDPI laptop screen
    return 'laptop';
  }

  /* ======================================================================
     PERFORMANCE MANAGER CLASS
     ====================================================================== */
  class PerformanceManager {
    constructor() {
      this.currentProfile = detectProfile();
      this._registeredRenderers = [];   // { renderer, scene? }
      this._fpsHistory = [];
      this._lastFrameTime = performance.now();
      this._monitorVisible = false;
      this._monitorEl = null;

      this._buildMonitorUI();
      this._attachKeyboard();
      this._listenForProfileChange();

      console.log(`[sAIs Perf] Profile auto-detected: "${this.currentProfile}" (DPR=${window.devicePixelRatio}, screen=${window.screen.width}×${window.screen.height})`);
    }

    /* ------------------------------------------------------------------
       PUBLIC API
       ------------------------------------------------------------------ */

    /** Register a Three.js renderer to be managed by this instance. */
    registerRenderer(renderer) {
      if (!renderer) return;
      if (!this._registeredRenderers.find(r => r === renderer)) {
        this._registeredRenderers.push(renderer);
        this.applyProfile(renderer);
      }
    }

    /** Retrieve the THREE.ShadowMapType constant string for a profile. */
    getShadowMapType(profileKey) {
      return PROFILES[profileKey]?.shadowMapType ?? 'PCFShadowMap';
    }

    /** Retrieve the capped pixel ratio for a profile. */
    getPixelRatio(profileKey) {
      const p = PROFILES[profileKey] ?? PROFILES.laptop;
      return Math.min(window.devicePixelRatio || 1, p.pixelRatio);
    }

    /** Retrieve the shadow map resolution for a profile. */
    getShadowMapSize(profileKey) {
      return PROFILES[profileKey]?.shadowMapSize ?? 1024;
    }

    /** Retrieve tone-mapping exposure for a profile + theme combination. */
    getExposure(profileKey, theme) {
      const p = PROFILES[profileKey] ?? PROFILES.laptop;
      return theme === 'light' ? p.toneMappingExposureLight : p.toneMappingExposureDark;
    }

    /** Apply the current profile settings to a registered renderer. */
    applyProfile(renderer) {
      if (!renderer) return;
      const p = PROFILES[this.currentProfile] ?? PROFILES.laptop;
      const cappedDPR = Math.min(window.devicePixelRatio || 1, p.pixelRatio);
      renderer.setPixelRatio(cappedDPR);

      // Tone mapping exposure CAN be hot-swapped without shader recompile
      const theme = document.documentElement.getAttribute('data-theme') || 'dark';
      renderer.toneMappingExposure = theme === 'light'
        ? p.toneMappingExposureLight
        : p.toneMappingExposureDark;

      // Shadow map type and resolution require a full scene re-init to take effect.
      console.log(
        `[sAIs Perf] Live-applied: profile="${this.currentProfile}", pixelRatio=${cappedDPR.toFixed(2)}, exposure=${renderer.toneMappingExposure.toFixed(2)}`
      );
      console.log(
        `[sAIs Perf] Requires page reload to change: shadowMap=${p.shadowMapType}, shadowSize=${p.shadowMapSize}`
      );
    }

    /** Programmatically switch to a named profile. */
    switchProfile(profileKey) {
      if (!PROFILES[profileKey]) {
        console.warn(`[sAIs Perf] Unknown profile "${profileKey}". Valid: ${Object.keys(PROFILES).join(', ')}`);
        return;
      }
      this.currentProfile = profileKey;
      this._registeredRenderers.forEach(r => this.applyProfile(r));
      this._updateMonitorProfile();
      window.dispatchEvent(new CustomEvent('sais-profile-change', { detail: { profile: profileKey } }));
      console.log(`[sAIs Perf] Switched to profile: "${profileKey}"`);
    }

    /** Call once per frame to update FPS tracking. Pass renderer for draw-call stats. */
    tick(renderer) {
      const now = performance.now();
      const delta = now - this._lastFrameTime;
      this._lastFrameTime = now;

      if (delta > 0) {
        this._fpsHistory.push(1000 / delta);
        if (this._fpsHistory.length > 60) this._fpsHistory.shift();
      }

      // Always reset renderer info counters so the next frame starts clean.
      // If we only reset when the monitor is visible, the first frame after
      // opening the monitor shows an inflated count (sum of all hidden frames).
      if (renderer?.info) renderer.info.reset();

      if (this._monitorVisible && this._monitorEl) {
        this._updateMonitorStats(renderer, delta);
      }
    }

    showMonitor()  { this._monitorVisible = true;  if (this._monitorEl) this._monitorEl.style.display = 'block'; }
    hideMonitor()  { this._monitorVisible = false; if (this._monitorEl) this._monitorEl.style.display = 'none'; }
    toggleMonitor() { this._monitorVisible ? this.hideMonitor() : this.showMonitor(); }

    /* ------------------------------------------------------------------
       PRIVATE: MONITOR UI
       ------------------------------------------------------------------ */
    _buildMonitorUI() {
      if (typeof document === 'undefined') return;
      const el = document.createElement('div');
      el.id = 'sais-perf-monitor';
      el.style.cssText = [
        'position:fixed',
        'bottom:10px',
        'right:10px',
        'z-index:99999',
        'background:rgba(10,15,24,0.90)',
        'border:1px solid #00d4ff',
        'border-radius:6px',
        'padding:10px 14px',
        'font-family:monospace',
        'font-size:12px',
        'color:#e0e4ec',
        'line-height:1.7',
        'display:none',
        'pointer-events:none',
        'min-width:220px',
        'backdrop-filter:blur(4px)',
      ].join(';');

      el.innerHTML = `
        <div style="color:#00d4ff;font-weight:bold;margin-bottom:4px;letter-spacing:0.08em;">⚡ sAIs PERF MONITOR</div>
        <div>FPS: <span id="sais-pm-fps" style="color:#10b981">--</span></div>
        <div>Frame: <span id="sais-pm-frame" style="color:#10b981">-- ms</span></div>
        <div>Draw calls: <span id="sais-pm-draws" style="color:#f59e0b">--</span></div>
        <div>Triangles: <span id="sais-pm-tris" style="color:#f59e0b">--</span></div>
        <div>Pixel ratio: <span id="sais-pm-dpr">--</span></div>
        <div>Profile: <span id="sais-pm-profile" style="color:#00d4ff">--</span></div>
        <div style="margin-top:6px;color:#6b7280;font-size:11px;">Shift+P to hide</div>
      `;

      document.body.appendChild(el);
      this._monitorEl = el;
      this._updateMonitorProfile();
    }

    _updateMonitorStats(renderer, frameDelta) {
      const avgFps = this._fpsHistory.length
        ? (this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length).toFixed(1)
        : '--';

      const fpsEl    = document.getElementById('sais-pm-fps');
      const frameEl  = document.getElementById('sais-pm-frame');
      const drawsEl  = document.getElementById('sais-pm-draws');
      const trisEl   = document.getElementById('sais-pm-tris');
      const dprEl    = document.getElementById('sais-pm-dpr');

      if (fpsEl) {
        fpsEl.textContent = avgFps;
        const fps = parseFloat(avgFps);
        fpsEl.style.color = fps >= 55 ? '#10b981' : fps >= 30 ? '#f59e0b' : '#ef4444';
      }
      if (frameEl)  frameEl.textContent  = frameDelta.toFixed(1) + ' ms';
      if (dprEl)    dprEl.textContent    = (window.devicePixelRatio || 1).toFixed(2) + '× → ' + (renderer ? renderer.getPixelRatio().toFixed(2) : '--') + '×';

      if (renderer && renderer.info) {
        if (drawsEl) drawsEl.textContent = renderer.info.render.calls;
        if (trisEl)  trisEl.textContent  = (renderer.info.render.triangles / 1000).toFixed(1) + 'k';
        // info.reset() is now called unconditionally in tick() — do not reset here
      }
    }

    _updateMonitorProfile() {
      const el = document.getElementById('sais-pm-profile');
      if (el) el.textContent = PROFILES[this.currentProfile]?.name ?? this.currentProfile;
    }

    /* ------------------------------------------------------------------
       PRIVATE: KEYBOARD SHORTCUT (Shift+P)
       ------------------------------------------------------------------ */
    _attachKeyboard() {
      if (typeof document === 'undefined') return;
      document.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.key === 'P') {
          e.preventDefault();
          this.toggleMonitor();
        }
        // Number keys 1-3 to switch profiles (for quick testing during presentation)
        if (e.shiftKey && e.key === '1') this.switchProfile('laptop');
        if (e.shiftKey && e.key === '2') this.switchProfile('external');
        if (e.shiftKey && e.key === '3') this.switchProfile('presentation');
      });
    }

    /* ------------------------------------------------------------------
       PRIVATE: LISTEN FOR PROFILE-CHANGE EVENTS
       ------------------------------------------------------------------ */
    _listenForProfileChange() {
      if (typeof window === 'undefined') return;
      window.addEventListener('sais-profile-change', (e) => {
        const { profile } = e.detail || {};
        if (profile && PROFILES[profile] && profile !== this.currentProfile) {
          this.currentProfile = profile;
          this._registeredRenderers.forEach(r => this.applyProfile(r));
          this._updateMonitorProfile();
        }
      });
    }
  }

  /* ======================================================================
     SINGLETON
     ====================================================================== */
  if (typeof window !== 'undefined') {
    window.saisPerformanceManager = new PerformanceManager();
  }
})();

