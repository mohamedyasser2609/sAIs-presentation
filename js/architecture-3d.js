/**
 * sAIs Presentation - 3D Multi-Tier System Architecture Interactive Controller (Slide 5)
 * Layered isometric view, clickable tier inspections, and dynamic data-flow telemetry.
 */

(function () {
  'use strict';

  class ArchitectureController {
    constructor() {
      this.activeTier = 'all';
      this.is3D = false;

      this.tierDescriptions = {
        all: {
          title: 'FULL SYSTEM ARCHITECTURE // ALL 3 TIERS ACTIVE',
          badge: 'COMPLETE SYSTEM TOPOLOGY',
          color: 'var(--accent-cyan)',
          metrics: 'Customer App ↔ Central Orchestration Engine ↔ Autonomous AGV Fleet'
        },
        tier1: {
          title: 'TIER 1 // USER & PRESENTATION INTERFACE LAYER',
          badge: 'TIER 1 INSPECTION',
          color: 'var(--color-subsystem-app)',
          metrics: 'Mobile App (Flutter/React Native) · Self-Service Kiosks · Operator Supervision Console'
        },
        tier2: {
          title: 'TIER 2 // CENTRAL MANAGEMENT PLATFORM (ORCHESTRATION & LOGIC)',
          badge: 'TIER 2 INSPECTION',
          color: 'var(--accent-cyan)',
          metrics: 'Parking PMS · Multi-Robot Fleet Dispatcher · AI Predictive Analytics · Future Modular Services'
        },
        tier3: {
          title: 'TIER 3 // PHYSICAL INFRASTRUCTURE & ROBOT EDGE LAYER',
          badge: 'TIER 3 INSPECTION',
          color: 'var(--color-subsystem-fleet)',
          metrics: 'Ultrasonic Bay Sensor Array · Onboard LiDAR SLAM AGVs · Automated EV Charging Infrastructure'
        }
      };

      this.init();
    }

    init() {
      this.cacheElements();
      if (!this.container) return;

      this.bindEvents();
      this.setTier('all');
    }

    cacheElements() {
      this.container = document.querySelector('section[data-state="slide-5"]');
      if (!this.container) return;

      this.tierButtons = this.container.querySelectorAll('.arch-tier-btn');
      this.prevBtn = document.getElementById('arch-prev-btn');
      this.nextBtn = document.getElementById('arch-next-btn');
      this.tierOrder = ['all', 'tier1', 'tier2', 'tier3'];
      this.toggle3DBtn = document.getElementById('arch-3d-toggle-btn');
      this.diagramWrapper = document.getElementById('arch-diagram-wrapper');
      this.tierTitle = document.getElementById('arch-tier-title');
      this.tierMetrics = document.getElementById('arch-tier-metrics');

      this.tier1Group = document.getElementById('arch-group-tier1');
      this.tier2Group = document.getElementById('arch-group-tier2');
      this.tier3Group = document.getElementById('arch-group-tier3');
      this.bus1 = document.getElementById('arch-bus-1');
      this.bus2 = document.getElementById('arch-bus-2');
    }

    bindEvents() {
      // Tier filter buttons
      this.tierButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tier = btn.getAttribute('data-tier');
          this.setTier(tier);
        });
      });

      // Arrow navigation across tiers (Tier 1 <-> Tier 2 <-> Tier 3 <-> All)
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const currIdx = this.tierOrder.indexOf(this.activeTier);
          const nextIdx = (currIdx - 1 + this.tierOrder.length) % this.tierOrder.length;
          this.setTier(this.tierOrder[nextIdx]);
        });
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const currIdx = this.tierOrder.indexOf(this.activeTier);
          const nextIdx = (currIdx + 1) % this.tierOrder.length;
          this.setTier(this.tierOrder[nextIdx]);
        });
      }

      // 3D Perspective Toggle (if present)
      if (this.toggle3DBtn) {
        this.toggle3DBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggle3DView();
        });
      }

      // Clickable tier rectangles directly on the SVG
      [
        { el: this.tier1Group, key: 'tier1' },
        { el: this.tier2Group, key: 'tier2' },
        { el: this.tier3Group, key: 'tier3' }
      ].forEach(({ el, key }) => {
        if (el) {
          el.style.cursor = 'pointer';
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setTier(this.activeTier === key ? 'all' : key);
          });
        }
      });

      // Synchronize with Reveal.js slides
      if (typeof Reveal !== 'undefined') {
        Reveal.on('slidechanged', (event) => {
          const isSlide5 = event.currentSlide && event.currentSlide.getAttribute('data-state') === 'slide-5';
          if (isSlide5) {
            this.setTier('all');
          }
        });
      }
    }

    nextTier() {
      const currIdx = this.tierOrder.indexOf(this.activeTier);
      if (currIdx < this.tierOrder.length - 1) {
        this.setTier(this.tierOrder[currIdx + 1]);
        return true;
      }
      return false;
    }

    prevTier() {
      const currIdx = this.tierOrder.indexOf(this.activeTier);
      if (currIdx > 0) {
        this.setTier(this.tierOrder[currIdx - 1]);
        return true;
      }
      return false;
    }

    setTier(tierKey) {
      if (!this.tierDescriptions[tierKey]) tierKey = 'all';
      this.activeTier = tierKey;
      const data = this.tierDescriptions[tierKey];

      // Update Buttons
      this.tierButtons.forEach((btn) => {
        const t = btn.getAttribute('data-tier');
        btn.classList.toggle('active', t === tierKey);
      });

      // Update Status Header
      if (this.tierTitle) {
        this.tierTitle.textContent = data.title;
        this.tierTitle.style.color = data.color;
      }
      if (this.tierMetrics) {
        this.tierMetrics.textContent = data.metrics;
      }

      // Tier Dimming & Highlighting
      const applyOpacity = (el, isHighlight) => {
        if (!el) return;
        el.style.transition = 'opacity 0.35s ease, filter 0.35s ease';
        if (tierKey === 'all') {
          el.style.opacity = '1';
          el.style.filter = 'none';
        } else if (isHighlight) {
          el.style.opacity = '1';
          el.style.filter = 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.3))';
        } else {
          el.style.opacity = '0.35';
          el.style.filter = 'none';
        }
      };

      applyOpacity(this.tier1Group, tierKey === 'tier1');
      applyOpacity(this.tier2Group, tierKey === 'tier2');
      applyOpacity(this.tier3Group, tierKey === 'tier3');

      if (this.bus1) this.bus1.style.opacity = (tierKey === 'all' || tierKey === 'tier1' || tierKey === 'tier2') ? '1' : '0.2';
      if (this.bus2) this.bus2.style.opacity = (tierKey === 'all' || tierKey === 'tier2' || tierKey === 'tier3') ? '1' : '0.2';
    }

    toggle3DView() {
      this.is3D = !this.is3D;
      if (this.diagramWrapper) {
        this.diagramWrapper.classList.toggle('arch-isometric-view', this.is3D);
      }
      if (this.toggle3DBtn) {
        this.toggle3DBtn.classList.toggle('active', this.is3D);
        this.toggle3DBtn.textContent = this.is3D ? '2D FLAT VIEW' : '3D PERSPECTIVE';
      }
    }
  }

  function initArchitecture() {
    if (!window._saisArchitecture) {
      window._saisArchitecture = new ArchitectureController();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArchitecture);
  } else {
    initArchitecture();
  }
})();

