/**
 * sAIs Presentation - Robotic Vehicle Handling Interactive Simulation (Slide 7)
 * Implements interactive 6-stage vehicle handling sequence, mechanical lift,
 * sensor alignment visualization, and automatic presentation lifecycle control.
 */

(function () {
  'use strict';

  class RoboticHandlingController {
    constructor() {
      this.currentStep = 1;
      this.totalSteps = 6;
      this.autoPlay = true;
      this.timer = null;
      this.stepDuration = 3400; // ms per stage in auto-play
      this.isSlideActive = false;

      this.stepData = [
        {
          step: 1,
          name: 'STEP 01: TASK ASSIGNMENT & STATION APPROACH',
          lift: '0mm [GROUND]',
          cradle: 'RETRACTED',
          status: 'NAVIGATING TO DROP-OFF',
          statusColor: 'var(--accent-cyan)',
          carY: 42,
          robotX: 15,
          cradleScaleX: 0.85,
          cradleScaleY: 1.0,
          sensorRays: 0,
          liftIndicator: 0,
          lidarWaves: 0
        },
        {
          step: 2,
          name: 'STEP 02: UNDER-CHASSIS POSITIONING',
          lift: '0mm [GROUND]',
          cradle: 'READY',
          status: 'CENTERED UNDER WHEELBASE',
          statusColor: 'var(--color-info)',
          carY: 42,
          robotX: 80,
          cradleScaleX: 0.9,
          cradleScaleY: 1.0,
          sensorRays: 0,
          liftIndicator: 0,
          lidarWaves: 0
        },
        {
          step: 3,
          name: 'STEP 03: OPTICAL WHEEL ALIGNMENT & SENSING',
          lift: '0mm [GROUND]',
          cradle: 'EXTENDING',
          status: 'OPTICAL SENSORS ACTIVE',
          statusColor: 'var(--accent-cyan)',
          carY: 42,
          robotX: 80,
          cradleScaleX: 1.08,
          cradleScaleY: 1.0,
          sensorRays: 1,
          liftIndicator: 0,
          lidarWaves: 0
        },
        {
          step: 4,
          name: 'STEP 04: MECHANICAL LIFT (+60mm ELEVATION)',
          lift: '+60mm [LOCKED]',
          cradle: 'LOCKED // FOUR-TIRE SUPPORT',
          status: 'TIRES FULLY ELEVATED',
          statusColor: 'var(--color-success)',
          carY: 27, // 15px elevation representing +60mm lift
          robotX: 80,
          cradleScaleX: 1.0,
          cradleScaleY: 1.25,
          sensorRays: 0,
          liftIndicator: 1,
          lidarWaves: 0
        },
        {
          step: 5,
          name: 'STEP 05: COLLISION-FREE FACILITY TRANSIT',
          lift: '+60mm [SECURED]',
          cradle: 'CLAMPED',
          status: 'AUTONOMOUS TRANSIT (1.2 m/s)',
          statusColor: 'var(--color-subsystem-fleet)',
          carY: 27,
          robotX: 80,
          cradleScaleX: 1.0,
          cradleScaleY: 1.25,
          sensorRays: 0,
          liftIndicator: 1,
          lidarWaves: 1
        },
        {
          step: 6,
          name: 'STEP 06: BAY RELEASE & TELEMETRY CONFIRMATION',
          lift: '0mm [LOWERED]',
          cradle: 'DISENGAGED',
          status: 'STORED // TASK CONFIRMED',
          statusColor: 'var(--color-success)',
          carY: 42,
          robotX: 80,
          cradleScaleX: 0.85,
          cradleScaleY: 1.0,
          sensorRays: 0,
          liftIndicator: 0,
          lidarWaves: 0
        }
      ];

      this.init();
    }

    init() {
      this.cacheElements();
      if (!this.container) return;

      this.bindEvents();
      this.setStep(1);

      // Check if Slide 7 is already active on load
      const slide7 = document.querySelector('section[data-state="slide-7"]');
      if (slide7 && slide7.classList.contains('present')) {
        this.isSlideActive = true;
        this.startAutoPlay();
      }
    }

    cacheElements() {
      this.container = document.querySelector('section[data-state="slide-7"]');
      if (!this.container) return;

      this.stepCards = this.container.querySelectorAll('.step-card-item');
      this.stepButtons = this.container.querySelectorAll('.handling-step-btn');
      this.playBtn = document.getElementById('handling-play-btn');
      this.stepLabel = document.getElementById('handling-step-label');

      // SVG animated elements
      this.carGroup = document.getElementById('handling-vehicle-group');
      this.robotGroup = document.getElementById('handling-robot-group');
      this.frontCradle = document.getElementById('handling-front-cradle');
      this.rearCradle = document.getElementById('handling-rear-cradle');
      this.sensorRays = document.getElementById('handling-sensor-rays');
      this.liftIndicator = document.getElementById('handling-lift-indicator');
      this.lidarWaves = document.getElementById('handling-lidar-waves');

      // Telemetry readouts
      this.telLift = document.getElementById('handling-tel-lift');
      this.telCradle = document.getElementById('handling-tel-cradle');
      this.telStatus = document.getElementById('handling-tel-status');
    }

    bindEvents() {
      // Step buttons [1]-[6]
      this.stepButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const step = parseInt(btn.getAttribute('data-step'), 10);
          this.pauseAutoPlay();
          this.setStep(step);
        });
      });

      // Clickable step cards on the left
      this.stepCards.forEach((card) => {
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          const step = parseInt(card.getAttribute('data-step'), 10);
          this.pauseAutoPlay();
          this.setStep(step);
        });
      });

      // Play/Pause button
      if (this.playBtn) {
        this.playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.autoPlay) {
            this.pauseAutoPlay();
          } else {
            this.startAutoPlay();
          }
        });
      }

      // Synchronize with Reveal.js slides
      if (typeof Reveal !== 'undefined') {
        Reveal.on('slidechanged', (event) => {
          const isSlide7 = event.currentSlide && event.currentSlide.getAttribute('data-state') === 'slide-7';
          if (isSlide7) {
            this.isSlideActive = true;
            this.startAutoPlay();
          } else {
            this.isSlideActive = false;
            this.stopTimer();
          }
        });
      }
    }

    setStep(stepNum) {
      if (stepNum < 1 || stepNum > this.totalSteps) return;
      this.currentStep = stepNum;
      const data = this.stepData[stepNum - 1];

      // 1. Update Buttons
      this.stepButtons.forEach((btn) => {
        const bStep = parseInt(btn.getAttribute('data-step'), 10);
        btn.classList.toggle('active', bStep === stepNum);
      });

      // 2. Highlight corresponding Card on the left
      this.stepCards.forEach((card) => {
        const cStep = parseInt(card.getAttribute('data-step'), 10);
        card.classList.toggle('active-step', cStep === stepNum);
      });

      // 3. Update Header Step Label
      if (this.stepLabel) {
        this.stepLabel.textContent = data.name;
      }

      // 4. Update Telemetry Display
      if (this.telLift) this.telLift.textContent = data.lift;
      if (this.telCradle) this.telCradle.textContent = data.cradle;
      if (this.telStatus) {
        this.telStatus.textContent = data.status;
        this.telStatus.style.color = data.statusColor;
      }

      // 5. Animate Vehicle & Robot SVG Groups
      if (this.carGroup) {
        this.carGroup.setAttribute('transform', `translate(60, ${data.carY})`);
      }

      if (this.robotGroup) {
        this.robotGroup.setAttribute('transform', `translate(${data.robotX}, 208)`);
      }

      // 6. Animate Clamping Arms / Cradles
      const cradleTransform = `scale(${data.cradleScaleX}, ${data.cradleScaleY})`;
      if (this.frontCradle) {
        this.frontCradle.style.transformOrigin = '60px 0px';
        this.frontCradle.style.transform = cradleTransform;
      }
      if (this.rearCradle) {
        this.rearCradle.style.transformOrigin = '280px 0px';
        this.rearCradle.style.transform = cradleTransform;
      }

      // 7. Toggle Auxiliary Sensor & Indicator Overlays
      if (this.sensorRays) {
        this.sensorRays.style.opacity = data.sensorRays;
      }

      if (this.liftIndicator) {
        this.liftIndicator.style.opacity = data.liftIndicator;
      }

      if (this.lidarWaves) {
        this.lidarWaves.style.opacity = data.lidarWaves;
      }
    }

    nextStep() {
      let next = this.currentStep + 1;
      if (next > this.totalSteps) next = 1;
      this.setStep(next);
    }

    startAutoPlay() {
      this.autoPlay = true;
      if (this.playBtn) {
        this.playBtn.textContent = 'PAUSE';
        this.playBtn.classList.add('playing');
      }
      this.stopTimer();
      this.timer = setInterval(() => {
        if (this.isSlideActive) {
          this.nextStep();
        }
      }, this.stepDuration);
    }

    pauseAutoPlay() {
      this.autoPlay = false;
      if (this.playBtn) {
        this.playBtn.textContent = 'AUTO';
        this.playBtn.classList.remove('playing');
      }
      this.stopTimer();
    }

    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
  }

  // Initialize once DOM is ready
  function initRoboticHandling() {
    if (!window._saisRoboticHandling) {
      window._saisRoboticHandling = new RoboticHandlingController();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRoboticHandling);
  } else {
    initRoboticHandling();
  }
})();

