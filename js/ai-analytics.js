/**
 * sAIs Presentation - AI & Predictive Analytics Interactive Engine (Slide 10)
 * Visualizes ML Occupancy Forecasting curves, real-time vs historical telemetry,
 * and dynamic customer arrival window recommendations.
 */

(function () {
  'use strict';

  class AIAnalyticsController {
    constructor() {
      this.currentMode = 'weekend'; // 'weekday' | 'weekend' | 'event'

      this.profiles = {
        weekday: {
          title: 'PROFILE: STANDARD WEEKDAY TRAFFIC',
          occupancy: '64% CURRENT',
          peak: 'Peak: 81% @ 18:30',
          recommendation: 'RECOMMENDED ARRIVAL: 13:00 – 15:30 (SMOOTH INGRESS)',
          fleetAllocation: 'Fleet Pre-allocation: 4 AGVs on standby',
          histPath: 'M 40,165 Q 120,175 200,140 T 360,95 T 520,70 T 680,120 T 840,170',
          aiPath:   'M 40,165 Q 120,170 200,135 T 360,90 T 520,65 T 680,115 T 840,170',
          aiArea:   'M 40,165 Q 120,170 200,135 T 360,90 T 520,65 T 680,115 T 840,170 L 840,210 L 40,210 Z',
          optX: 200,
          optW: 160
        },
        weekend: {
          title: 'PROFILE: WEEKEND RETAIL SURGE',
          occupancy: '86% PEAK CONGESTION',
          peak: 'Peak: 96% @ 19:15 [HIGH CAPACITY]',
          recommendation: 'RECOMMENDED ARRIVAL: 10:30 – 13:00 (PRE-PEAK)',
          fleetAllocation: 'Fleet Pre-allocation: 100% AGV fleet dispatched',
          histPath: 'M 40,170 Q 120,150 200,110 T 360,60 T 520,35 T 680,50 T 840,140',
          aiPath:   'M 40,170 Q 120,145 200,105 T 360,55 T 520,30 T 680,45 T 840,140',
          aiArea:   'M 40,170 Q 120,145 200,105 T 360,55 T 520,30 T 680,45 T 840,140 L 840,210 L 40,210 Z',
          optX: 80,
          optW: 130
        },
        event: {
          title: 'PROFILE: SPECIAL PROMOTION / CONCERT EVENT',
          occupancy: '98% CAPACITY SATURATION',
          peak: 'Peak: 100% @ 20:00 [SATURATED]',
          recommendation: 'RECOMMENDED ARRIVAL: BEFORE 17:00 OR USE VIP RESERVATION',
          fleetAllocation: 'Fleet Pre-allocation: Rapid turnover mode + dynamic rate +25%',
          histPath: 'M 40,180 Q 120,160 200,120 T 360,80 T 520,20 T 680,25 T 840,110',
          aiPath:   'M 40,180 Q 120,155 200,115 T 360,70 T 520,15 T 680,20 T 840,110',
          aiArea:   'M 40,180 Q 120,155 200,115 T 360,70 T 520,15 T 680,20 T 840,110 L 840,210 L 40,210 Z',
          optX: 60,
          optW: 180
        }
      };

      this.init();
    }

    init() {
      this.cacheElements();
      if (!this.container) return;

      this.bindEvents();
      this.applyMode('weekend');
    }

    cacheElements() {
      this.container = document.querySelector('section[data-state="slide-10"]');
      if (!this.container) return;

      this.modeButtons = this.container.querySelectorAll('.ai-mode-btn');
      this.titleEl = document.getElementById('ai-chart-title');
      this.occupancyEl = document.getElementById('ai-chart-occupancy');
      this.recommendationEl = document.getElementById('ai-chart-recommendation');
      this.fleetEl = document.getElementById('ai-chart-fleet');

      this.histPathEl = document.getElementById('ai-curve-hist');
      this.aiPathEl = document.getElementById('ai-curve-forecast');
      this.aiAreaEl = document.getElementById('ai-curve-area');
      this.optWindowEl = document.getElementById('ai-opt-window');
    }

    bindEvents() {
      this.modeButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mode = btn.getAttribute('data-mode');
          this.applyMode(mode);
        });
      });
    }

    applyMode(modeKey) {
      if (!this.profiles[modeKey]) return;
      this.currentMode = modeKey;
      const data = this.profiles[modeKey];

      // Update Buttons
      this.modeButtons.forEach((btn) => {
        const m = btn.getAttribute('data-mode');
        btn.classList.toggle('active', m === modeKey);
      });

      // Update Text Readouts
      if (this.titleEl) this.titleEl.textContent = data.title;
      if (this.occupancyEl) this.occupancyEl.textContent = data.occupancy;
      if (this.recommendationEl) this.recommendationEl.textContent = data.recommendation;
      if (this.fleetEl) this.fleetEl.textContent = data.fleetAllocation;

      // Update SVG Curve Paths
      if (this.histPathEl) this.histPathEl.setAttribute('d', data.histPath);
      if (this.aiPathEl) this.aiPathEl.setAttribute('d', data.aiPath);
      if (this.aiAreaEl) this.aiAreaEl.setAttribute('d', data.aiArea);

      // Update Optimal Arrival Window Box
      if (this.optWindowEl) {
        this.optWindowEl.setAttribute('x', data.optX);
        this.optWindowEl.setAttribute('width', data.optW);
      }
    }
  }

  function initAIAnalytics() {
    if (!window._saisAIAnalytics) {
      window._saisAIAnalytics = new AIAnalyticsController();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIAnalytics);
  } else {
    initAIAnalytics();
  }
})();
