/**
 * sAIs Presentation - Signature 3D Hero Parking Facility Simulation
 * High-performance, theme-adaptive isometric digital twin for Slides 1 & 16.
 */

class HeroFacility3D {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.options = Object.assign({
      isClosingScene: false,
      autoRotate: true,
      interactiveTilt: true
    }, options);

    this.isPaused = false;
    this.animationProgress = 0; // 0 to 1 cycle
    this.animationSpeed = 0.0022; // smooth, realistic transport pace
    this.rafId = null;

    this.tiltX = 0;
    this.tiltY = 0;
    this.targetTiltX = 0;
    this.targetTiltY = 0;

    this.init();
  }

  init() {
    this.render();
    this.setupEvents();

    const parentSection = this.container.closest('section');
    const isCurrentSlide = typeof Reveal !== 'undefined' && Reveal.getCurrentSlide && Reveal.getCurrentSlide() === parentSection;
    if (!parentSection || isCurrentSlide || (typeof Reveal === 'undefined')) {
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  render() {
    const isClosing = this.options.isClosingScene;
    const hudBadge = isClosing ? 'FACILITY DIGITAL TWIN // FULL FACILITY SUMMARY' : 'FACILITY DIGITAL TWIN // LIVE SIMULATION';

    const fleetStat = isClosing ? 'SYNCHRONIZED (4/4 AGVs)' : 'ONLINE (4 AGVs)';
    const taskStat = isClosing ? 'ALL BAYS OPTIMIZED &bull; ACTIVE' : 'TRANSFER VEHICLE &rarr; BAY A-03';
    const meshStat = isClosing ? '8ms [PEER MESH OPTIMAL]' : '12ms [LATENCY OPTIMAL]';
    const capacityStat = isClosing ? '+35% DENSITY REALIZED' : '62.5% [5/8 SLOTS]';

    this.container.innerHTML = `
      <div class="facility-3d-wrapper" id="${this.container.id}-wrapper">
        <!-- Telemetry Header HUD -->
        <div class="facility-hud-header">
          <div class="facility-hud-badge">
            <span class="badge-dot pulse-dot"></span>
            <span class="hud-status-text">${hudBadge}</span>
          </div>
          <div class="facility-hud-controls">
            <button class="facility-control-btn" id="${this.container.id}-pause-btn" title="Pause / Resume Simulation" aria-label="Toggle simulation animation">
              <span class="facility-btn-icon">&#10074;&#10074;</span>
              <span class="facility-btn-label">PAUSE</span>
            </button>
            <button class="facility-control-btn" id="${this.container.id}-reset-btn" title="Reset View Angle" aria-label="Reset perspective">
              <span>&#8634;</span>
            </button>
          </div>
        </div>

        <!-- 3D Perspective Stage -->
        <div class="facility-stage" id="${this.container.id}-stage">
          <div class="facility-ground-plane" id="${this.container.id}-plane">
            
            <!-- Floor Grid & Guidance Lines -->
            <svg class="facility-svg-plane" viewBox="0 0 640 420" width="100%" height="100%">
              <defs>
                <pattern id="isoGrid-${this.container.id}" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M 28 0 L 0 0 0 28" fill="none" class="svg-theme-grid-line" stroke="rgba(0, 240, 255, 0.08)" stroke-width="1"/>
                </pattern>
                <linearGradient id="laserGlow-${this.container.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--accent-cyan)" stop-opacity="0.8"/>
                  <stop offset="100%" stop-color="var(--accent-teal)" stop-opacity="0"/>
                </linearGradient>
              </defs>

              <!-- Concrete Floor Base with Theme Shading -->
              <rect x="10" y="10" width="620" height="400" rx="12" class="svg-theme-canvas" fill="#090e18" stroke="var(--border-subtle)" stroke-width="1.5"/>
              <rect x="10" y="10" width="620" height="400" rx="12" fill="url(#isoGrid-${this.container.id})"/>

              <!-- Central AGV Transit Highway (segregated from pedestrians) -->
              <rect x="180" y="25" width="130" height="370" fill="rgba(0, 240, 255, 0.025)" stroke="var(--border-subtle)" stroke-dasharray="4 4"/>
              <path d="M 245 25 L 245 395" stroke="var(--accent-cyan)" stroke-width="2" stroke-dasharray="8 8" class="svg-data-path"/>
              <text x="195" y="210" fill="var(--text-muted)" font-family="monospace" font-size="10" transform="rotate(-90 195,210)" letter-spacing="2">SEGREGATED AGV HIGHWAY</text>

              <!-- Left Side: Handover Drop-off Zone & Pickup Zone -->
              <g transform="translate(30, 35)">
                <!-- Drop-Off Bay 1 -->
                <rect x="0" y="0" width="135" height="110" rx="8" class="svg-theme-node-bg" fill="#0f192b" stroke="var(--accent-cyan)" stroke-width="1.8"/>
                <text x="12" y="24" fill="var(--accent-cyan)" font-family="monospace" font-size="11" font-weight="bold">DROP-OFF BAY 1</text>
                <text x="12" y="42" class="svg-theme-node-subtext" fill="#cbd5e1" font-size="9.5">Gantry Scanner: ACTIVE</text>
                <text x="12" y="58" class="svg-theme-node-subtext" fill="#cbd5e1" font-size="9.5">Customer Handover Zone</text>
                <!-- Scanner Optical Barrier Line -->
                <line x1="10" y1="72" x2="125" y2="72" stroke="var(--accent-cyan)" stroke-width="2" stroke-dasharray="3 3"/>
                <circle cx="20" cy="90" r="4" fill="var(--color-success)"/>
                <text x="32" y="93" fill="var(--color-success)" font-family="monospace" font-size="9" font-weight="bold">READY FOR INGESTION</text>
              </g>

              <g transform="translate(30, 160)">
                <!-- Drop-Off Bay 2 -->
                <rect x="0" y="0" width="135" height="95" rx="8" class="svg-theme-node-bg" fill="#0f192b" stroke="var(--border-subtle)" stroke-width="1.2"/>
                <text x="12" y="22" class="svg-theme-node-subtext" fill="#94a3b8" font-family="monospace" font-size="10.5" font-weight="bold">DROP-OFF BAY 2</text>
                <text x="12" y="40" class="svg-theme-node-subtext" fill="#64748b" font-size="9">Standby Buffer</text>
                <circle cx="20" cy="72" r="4" fill="var(--color-success)"/>
                <text x="32" y="75" fill="var(--color-success)" font-family="monospace" font-size="8.5">STANDBY AVAILABLE</text>
              </g>

              <g transform="translate(30, 270)">
                <!-- Retrieval Pickup Station -->
                <rect x="0" y="0" width="135" height="110" rx="8" class="svg-theme-node-bg" fill="#0f192b" stroke="var(--color-subsystem-app)" stroke-width="1.8"/>
                <text x="12" y="24" fill="var(--color-subsystem-app)" font-family="monospace" font-size="11" font-weight="bold">PICKUP STATION P-1</text>
                <text x="12" y="42" class="svg-theme-node-subtext" fill="#cbd5e1" font-size="9.5">Contactless Retrieval Zone</text>
                <rect x="10" y="55" width="115" height="42" rx="4" fill="rgba(16, 185, 129, 0.08)" stroke="var(--color-subsystem-app)" stroke-dasharray="3 3"/>
                <text x="20" y="74" fill="var(--color-subsystem-app)" font-family="monospace" font-size="9" font-weight="bold">DISPATCH READY</text>
                <text x="20" y="88" fill="var(--text-muted)" font-size="8">Customer Gate Pass Area</text>
              </g>

              <!-- Right Side: Multi-Row Storage Bays -->
              <!-- ROW A -->
              <g transform="translate(330, 35)">
                <!-- Bay A-01: Occupied -->
                <rect x="0" y="0" width="135" height="75" rx="6" class="svg-theme-node-bg" stroke="var(--color-danger)" stroke-width="1.5"/>
                <circle cx="15" cy="18" r="4.5" fill="var(--color-danger)"/>
                <text x="26" y="21" fill="var(--color-danger)" font-family="monospace" font-size="10" font-weight="bold">BAY A-01 [OCCUPIED]</text>
                <rect x="15" y="32" width="105" height="32" rx="4" class="svg-theme-canvas" stroke="var(--border-subtle)"/>
                <text x="24" y="52" class="svg-theme-node-subtext" font-size="9">Sedan &bull; Slot Locked</text>
              </g>

              <g transform="translate(330, 120)">
                <!-- Bay A-02: Occupied -->
                <rect x="0" y="0" width="135" height="75" rx="6" class="svg-theme-node-bg" stroke="var(--color-danger)" stroke-width="1.5"/>
                <circle cx="15" cy="18" r="4.5" fill="var(--color-danger)"/>
                <text x="26" y="21" fill="var(--color-danger)" font-family="monospace" font-size="10" font-weight="bold">BAY A-02 [OCCUPIED]</text>
                <rect x="15" y="32" width="105" height="32" rx="4" class="svg-theme-canvas" stroke="var(--border-subtle)"/>
                <text x="24" y="52" class="svg-theme-node-subtext" font-size="9">SUV &bull; Slot Locked</text>
              </g>

              <g transform="translate(330, 205)">
                <!-- Bay A-03: Dynamic Target Allocation Bay! -->
                <rect x="0" y="0" width="135" height="85" rx="6" class="svg-theme-node-bg" id="${this.container.id}-target-bay" stroke="var(--accent-cyan)" stroke-width="2"/>
                <circle cx="15" cy="18" r="4.5" id="${this.container.id}-target-led" fill="var(--accent-cyan)" class="pulse-dot"/>
                <text x="26" y="21" id="${this.container.id}-target-text" fill="var(--accent-cyan)" font-family="monospace" font-size="10" font-weight="bold">BAY A-03 [ALLOCATED]</text>
                <rect x="12" y="30" width="111" height="45" rx="4" fill="rgba(0, 240, 255, 0.05)" stroke="var(--accent-cyan)" stroke-dasharray="3 3"/>
                <text x="20" y="50" id="${this.container.id}-target-sub" fill="var(--accent-cyan)" font-family="monospace" font-size="9">ROBOT INGESTION ETA: NOW</text>
                <text x="20" y="65" fill="var(--text-muted)" font-size="8.5">Assigned: EV Mid-size</text>
              </g>

              <g transform="translate(330, 305)">
                <!-- Bay A-04: Available -->
                <rect x="0" y="0" width="135" height="75" rx="6" class="svg-theme-node-bg" stroke="var(--color-success)" stroke-width="1.5"/>
                <circle cx="15" cy="18" r="4.5" fill="var(--color-success)"/>
                <text x="26" y="21" fill="var(--color-success)" font-family="monospace" font-size="10" font-weight="bold">BAY A-04 [AVAILABLE]</text>
                <rect x="15" y="32" width="105" height="32" rx="4" fill="rgba(16, 185, 129, 0.04)" stroke="var(--color-success)" stroke-dasharray="2 2"/>
                <text x="28" y="52" fill="var(--color-success)" font-size="9">Bay Cleared &bull; Ready</text>
              </g>

              <!-- ROW B (Far Right Column) -->
              <g transform="translate(485, 35)">
                <!-- Bay B-01: Available -->
                <rect x="0" y="0" width="135" height="75" rx="6" class="svg-theme-node-bg" stroke="var(--color-success)" stroke-width="1.5"/>
                <circle cx="15" cy="18" r="4.5" fill="var(--color-success)"/>
                <text x="26" y="21" fill="var(--color-success)" font-family="monospace" font-size="10" font-weight="bold">BAY B-01 [AVAILABLE]</text>
                <rect x="15" y="32" width="105" height="32" rx="4" fill="rgba(16, 185, 129, 0.04)" stroke="var(--color-success)" stroke-dasharray="2 2"/>
                <text x="28" y="52" fill="var(--color-success)" font-size="9">Compact &bull; Ready</text>
              </g>

              <g transform="translate(485, 120)">
                <!-- Bay B-02: VIP Reserved -->
                <rect x="0" y="0" width="135" height="75" rx="6" class="svg-theme-node-bg" stroke="var(--color-warning)" stroke-width="1.8"/>
                <circle cx="15" cy="18" r="4.5" fill="var(--color-warning)"/>
                <text x="26" y="21" fill="var(--color-warning)" font-family="monospace" font-size="10" font-weight="bold">BAY B-02 [VIP HOLD]</text>
                <rect x="15" y="32" width="105" height="32" rx="4" fill="rgba(245, 158, 11, 0.06)" stroke="var(--color-warning)" stroke-dasharray="3 3"/>
                <text x="24" y="52" fill="var(--color-warning)" font-family="monospace" font-size="8.5">ETA 19:45 Priority</text>
              </g>

              <g transform="translate(485, 205)">
                <!-- Bay B-03: Occupied -->
                <rect x="0" y="0" width="135" height="75" rx="6" class="svg-theme-node-bg" stroke="var(--color-danger)" stroke-width="1.5"/>
                <circle cx="15" cy="18" r="4.5" fill="var(--color-danger)"/>
                <text x="26" y="21" fill="var(--color-danger)" font-family="monospace" font-size="10" font-weight="bold">BAY B-03 [OCCUPIED]</text>
                <rect x="15" y="32" width="105" height="32" rx="4" class="svg-theme-canvas" stroke="var(--border-subtle)"/>
                <text x="24" y="52" class="svg-theme-node-subtext" font-size="9">Crossover &bull; Locked</text>
              </g>

              <g transform="translate(485, 305)">
                <!-- Bay B-04: Available -->
                <rect x="0" y="0" width="135" height="75" rx="6" class="svg-theme-node-bg" stroke="var(--color-success)" stroke-width="1.5"/>
                <circle cx="15" cy="18" r="4.5" fill="var(--color-success)"/>
                <text x="26" y="21" fill="var(--color-success)" font-family="monospace" font-size="10" font-weight="bold">BAY B-04 [AVAILABLE]</text>
                <rect x="15" y="32" width="105" height="32" rx="4" fill="rgba(16, 185, 129, 0.04)" stroke="var(--color-success)" stroke-dasharray="2 2"/>
                <text x="28" y="52" fill="var(--color-success)" font-size="9">Full-size &bull; Ready</text>
              </g>

              <!-- Structural Pillars with Hazard Markings -->
              <g transform="translate(160, 130)">
                <circle cx="0" cy="0" r="10" class="svg-theme-node-bg" fill="#131b2e" stroke="var(--border-light)" stroke-width="2"/>
                <rect x="-8" y="-4" width="16" height="8" fill="var(--color-warning)" opacity="0.8"/>
              </g>
              <g transform="translate(160, 270)">
                <circle cx="0" cy="0" r="10" class="svg-theme-node-bg" fill="#131b2e" stroke="var(--border-light)" stroke-width="2"/>
                <rect x="-8" y="-4" width="16" height="8" fill="var(--color-warning)" opacity="0.8"/>
              </g>
              <g transform="translate(320, 130)">
                <circle cx="0" cy="0" r="10" class="svg-theme-node-bg" fill="#131b2e" stroke="var(--border-light)" stroke-width="2"/>
                <rect x="-8" y="-4" width="16" height="8" fill="var(--color-warning)" opacity="0.8"/>
              </g>
              <g transform="translate(320, 270)">
                <circle cx="0" cy="0" r="10" class="svg-theme-node-bg" fill="#131b2e" stroke="var(--border-light)" stroke-width="2"/>
                <rect x="-8" y="-4" width="16" height="8" fill="var(--color-warning)" opacity="0.8"/>
              </g>

              <!-- Dynamic Animated Robot 01 Vehicle Unit -->
              <g id="${this.container.id}-robot-unit">
                <!-- Vehicle Silhouette Under Transport -->
                <g id="${this.container.id}-car-body">
                  <path d="M 15 50 Q 30 20 65 15 L 125 15 Q 160 20 175 42 L 185 55 L 5 55 Z" 
                        class="svg-theme-vehicle-body" fill="var(--svg-car-body)" stroke="var(--svg-car-stroke)" stroke-width="1.5"/>
                  <path d="M 68 20 L 122 20 L 140 42 L 55 42 Z" fill="rgba(0, 240, 255, 0.2)" stroke="var(--accent-cyan)" stroke-width="0.8"/>
                  <circle cx="40" cy="55" r="14" fill="#090d16" stroke="var(--text-muted)" stroke-width="3"/>
                  <circle cx="150" cy="55" r="14" fill="#090d16" stroke="var(--text-muted)" stroke-width="3"/>
                </g>

                <!-- Low-profile Robotic Valet AGV Beneath Vehicle -->
                <rect x="10" y="60" width="170" height="18" rx="4" class="svg-theme-node-bg" fill="#0b172d" stroke="var(--accent-cyan)" stroke-width="2"/>
                <!-- Clamping tire cradles -->
                <rect x="22" y="55" width="36" height="8" rx="2" fill="var(--accent-cyan)"/>
                <rect x="132" y="55" width="36" height="8" rx="2" fill="var(--accent-cyan)"/>

                <!-- Active LiDAR Scan Waves (Front & Rear) -->
                <path d="M 180 69 L 215 55 M 180 69 L 222 69 M 180 69 L 215 83" stroke="var(--accent-cyan)" stroke-width="1.5" class="svg-sweep-line"/>
                <circle cx="180" cy="69" r="3.5" fill="var(--accent-cyan)"/>
                
                <text x="25" y="73" fill="var(--accent-cyan)" font-family="monospace" font-size="8.5" font-weight="bold">sAIs-AGV // ROBOT-01</text>
              </g>

            </svg>
          </div>
        </div>

        <!-- Telemetry HUD Bottom Bar -->
        <div class="facility-hud-footer">
          <div class="hud-stat-item">
            <span class="hud-stat-label">FLEET STATUS</span>
            <span class="hud-stat-value" id="${this.container.id}-hud-fleet">${fleetStat}</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">TASK DISPATCH</span>
            <span class="hud-stat-value accent-cyan" id="${this.container.id}-hud-task">${taskStat}</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">LOCAL MESH</span>
            <span class="hud-stat-value" style="color: var(--color-success)">${meshStat}</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">CAPACITY</span>
            <span class="hud-stat-value">${capacityStat}</span>
          </div>
        </div>
      </div>
    `;

    this.robotUnit = document.getElementById(`${this.container.id}-robot-unit`);
    this.targetBay = document.getElementById(`${this.container.id}-target-bay`);
    this.targetLed = document.getElementById(`${this.container.id}-target-led`);
    this.targetText = document.getElementById(`${this.container.id}-target-text`);
    this.targetSub = document.getElementById(`${this.container.id}-target-sub`);
    this.hudTask = document.getElementById(`${this.container.id}-hud-task`);
    this.pauseBtn = document.getElementById(`${this.container.id}-pause-btn`);
    this.resetBtn = document.getElementById(`${this.container.id}-reset-btn`);
    this.stage = document.getElementById(`${this.container.id}-stage`);
  }

  setupEvents() {
    // Pause/Resume button
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePause();
      });
    }

    // Reset view button
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetPerspective();
      });
    }

    // Interactive mouse perspective tracking
    if (this.options.interactiveTilt && this.stage) {
      this.container.addEventListener('mousemove', (e) => {
        const rect = this.container.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
        const normY = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
        this.targetTiltX = -normY * 16; // tilt up/down
        this.targetTiltY = normX * 18;  // tilt left/right
      });

      this.container.addEventListener('mouseleave', () => {
        this.targetTiltX = 0;
        this.targetTiltY = 0;
      });
    }

    // Reveal.js Slide Change Listener: only animate when parent slide is active
    if (typeof Reveal !== 'undefined') {
      Reveal.on('slidechanged', (event) => {
        const parentSection = this.container.closest('section');
        if (parentSection === event.currentSlide) {
          if (!this.rafId && !this.isPaused) {
            this.startLoop();
          }
        } else {
          this.stopLoop();
        }
      });
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.pauseBtn) {
      const icon = this.pauseBtn.querySelector('.facility-btn-icon');
      const label = this.pauseBtn.querySelector('.facility-btn-label');
      if (this.isPaused) {
        if (icon) icon.innerHTML = '&#9654;';
        if (label) label.textContent = 'PLAY';
        this.stopLoop();
      } else {
        if (icon) icon.innerHTML = '&#10074;&#10074;';
        if (label) label.textContent = 'PAUSE';
        this.startLoop();
      }
    }
  }

  resetPerspective() {
    this.targetTiltX = 0;
    this.targetTiltY = 0;
    this.tiltX = 0;
    this.tiltY = 0;
    if (this.stage) {
      this.stage.style.transform = `rotateX(42deg) rotateZ(-30deg) translateZ(0)`;
    }
  }

  startLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const loop = () => {
      this.update();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  update() {
    // 1. Smooth 3D tilt interpolation
    this.tiltX += (this.targetTiltX - this.tiltX) * 0.08;
    this.tiltY += (this.targetTiltY - this.tiltY) * 0.08;
    if (this.stage) {
      this.stage.style.transform = `rotateX(${42 + this.tiltX}deg) rotateZ(${-30 + this.tiltY}deg) translateZ(0)`;
    }

    if (this.isPaused) return;

    // 2. Transport Path Progression
    this.animationProgress += this.animationSpeed;
    if (this.animationProgress > 1) {
      this.animationProgress = 0; // seamless cycle
    }

    const t = this.animationProgress;

    // Route coordinates:
    // Stage 1 (0.00 to 0.35): Egress from Drop-off Bay (x: 20 to 160, y: 70 to 70)
    // Stage 2 (0.35 to 0.65): Navigate down Highway (x: 160 to 160, y: 70 to 220)
    // Stage 3 (0.65 to 0.90): Ingress into Bay A-03 (x: 160 to 310, y: 220 to 220)
    // Stage 4 (0.90 to 1.00): Vehicle Secured & Bay Lock Confirmation (Hold in Bay A-03)
    let rx = 20, ry = 65, rotation = 0;

    if (t < 0.35) {
      const st = t / 0.35;
      rx = 20 + st * 140;
      ry = 65;
      rotation = 0;
      this.updateBayState(false);
    } else if (t < 0.65) {
      const st = (t - 0.35) / 0.3;
      rx = 160;
      ry = 65 + st * 155;
      rotation = 90;
      this.updateBayState(false);
    } else if (t < 0.88) {
      const st = (t - 0.65) / 0.23;
      rx = 160 + st * 150;
      ry = 220;
      rotation = 0;
      this.updateBayState(false);
    } else {
      // Parked in Bay A-03
      rx = 310;
      ry = 220;
      rotation = 0;
      this.updateBayState(true);
    }

    if (this.robotUnit) {
      this.robotUnit.setAttribute('transform', `translate(${rx}, ${ry}) rotate(${rotation}, 95, 60)`);
    }
  }

  updateBayState(isParked) {
    if (isParked) {
      if (this.targetBay) this.targetBay.setAttribute('stroke', 'var(--color-danger)');
      if (this.targetLed) {
        this.targetLed.setAttribute('fill', 'var(--color-danger)');
        this.targetLed.classList.remove('pulse-dot');
      }
      if (this.targetText) {
        this.targetText.setAttribute('fill', 'var(--color-danger)');
        this.targetText.textContent = 'BAY A-03 [OCCUPIED]';
      }
      if (this.targetSub) {
        this.targetSub.textContent = 'Vehicle Stored & Locked';
        this.targetSub.setAttribute('fill', 'var(--color-danger)');
      }
      if (this.hudTask) {
        this.hudTask.textContent = 'TASK COMPLETED: VEHICLE PARKED IN A-03';
        this.hudTask.style.color = 'var(--color-success)';
      }
    } else {
      if (this.targetBay) this.targetBay.setAttribute('stroke', 'var(--accent-cyan)');
      if (this.targetLed) {
        this.targetLed.setAttribute('fill', 'var(--accent-cyan)');
        this.targetLed.classList.add('pulse-dot');
      }
      if (this.targetText) {
        this.targetText.setAttribute('fill', 'var(--accent-cyan)');
        this.targetText.textContent = 'BAY A-03 [ALLOCATED]';
      }
      if (this.targetSub) {
        this.targetSub.textContent = 'ROBOT INGESTION ETA: NOW';
        this.targetSub.setAttribute('fill', 'var(--accent-cyan)');
      }
      if (this.hudTask) {
        this.hudTask.textContent = 'TRANSFER VEHICLE \u2192 BAY A-03';
        this.hudTask.style.color = 'var(--accent-cyan)';
      }
    }
  }
}

// Global initialization helper for Slide 1 & Slide 16
window.initHeroFacility3D = function(id, options) {
  return new HeroFacility3D(id, options);
};
