/**
 * sAIs Presentation - Multi-Robot Fleet Coordination Interactive Simulation (Slide 8)
 * Demonstrates Hybrid Fleet Orchestration: Centralized Global Scheduling +
 * Autonomous Local Edge Collision Avoidance across 3 robots.
 */

(function () {
  'use strict';

  class FleetCoordinationController {
    constructor() {
      this.currentScenario = 'normal'; // 'normal' | 'obstacle' | 'priority'
      this.selectedRobot = 'r1';
      this.isSlideActive = false;
      this.animInterval = null;

      this.scenarios = {
        normal: {
          title: 'SCENARIO 1: NORMAL DUAL DISPATCH',
          desc: 'Global scheduler maintains parallel collision-free corridors for R-01 and R-02.',
          centralStatus: 'ALL FLEET NOMINAL // 2 ACTIVE, 1 STANDBY',
          centralColor: 'var(--color-subsystem-fleet)',
          robots: {
            r1: {
              badge: 'ROBOT-01 [INGRESS]',
              color: 'var(--accent-cyan)',
              task: 'Assigned: Bay 104',
              slam: 'SLAM: 99.8% Confidence',
              obs: 'Obstacle: Clear Path',
              obsColor: 'var(--color-success)',
              autonomy: 'Mode: Central Guidance',
              trackX: 180,
              trackY: 235,
              hasObstacle: false
            },
            r2: {
              badge: 'ROBOT-02 [RETRIEVAL]',
              color: 'var(--accent-cyan)',
              task: 'Assigned: Pickup Station 1',
              slam: 'SLAM: 99.5% Confidence',
              obs: 'Obstacle: Corridor Clear',
              obsColor: 'var(--color-success)',
              autonomy: 'Mode: Central Guidance',
              trackX: 290,
              trackY: 260,
              hasObstacle: false
            },
            r3: {
              badge: 'ROBOT-03 [STANDBY]',
              color: 'var(--text-muted)',
              task: 'Docked: Charger Bay C-02',
              slam: 'Battery: 94% [READY]',
              obs: 'State: Base Station Idle',
              obsColor: 'var(--text-secondary)',
              autonomy: 'Mode: Standby Listener',
              trackX: 420,
              trackY: 235,
              hasObstacle: false
            }
          }
        },
        obstacle: {
          title: 'SCENARIO 2: LOCAL DYNAMIC OBSTACLE AVOIDANCE',
          desc: 'Robot-02 detects unplanned obstruction: onboard edge brakes and re-routes without central halt.',
          centralStatus: 'TELEMETRY: R-02 LOCAL SLOWDOWN LOGGED',
          centralColor: 'var(--color-warning)',
          robots: {
            r1: {
              badge: 'ROBOT-01 [INGRESS]',
              color: 'var(--accent-cyan)',
              task: 'Assigned: Bay 104',
              slam: 'SLAM: 99.8% Nominal',
              obs: 'Obstacle: None (Clear)',
              obsColor: 'var(--color-success)',
              autonomy: 'Mode: Route Confirmed',
              trackX: 210,
              trackY: 235,
              hasObstacle: false
            },
            r2: {
              badge: 'ROBOT-02 [LOCAL AVOIDANCE]',
              color: 'var(--color-warning)',
              task: 'Dynamic Detour Active',
              slam: 'Edge LiDAR: Object at 1.4m',
              obs: 'Action: Auto-Braking -> Circumvent',
              obsColor: 'var(--color-danger)',
              autonomy: 'Autonomy: Edge Override Active',
              trackX: 275,
              trackY: 270,
              hasObstacle: true
            },
            r3: {
              badge: 'ROBOT-03 [STANDBY]',
              color: 'var(--text-muted)',
              task: 'Docked: Charger Bay C-02',
              slam: 'Battery: 95% [READY]',
              obs: 'State: Base Station Idle',
              obsColor: 'var(--text-secondary)',
              autonomy: 'Mode: Standby Listener',
              trackX: 420,
              trackY: 235,
              hasObstacle: false
            }
          }
        },
        priority: {
          title: 'SCENARIO 3: HIGH-PRIORITY VIP RETRIEVAL OVERRIDE',
          desc: 'Central dispatcher reprioritizes Robot-03 from charging to emergency express retrieval.',
          centralStatus: 'DISPATCH OVERRIDE: R-03 PREEMPTIVE RETRIEVE',
          centralColor: 'var(--accent-cyan)',
          robots: {
            r1: {
              badge: 'ROBOT-01 [DOCKING]',
              color: 'var(--accent-cyan)',
              task: 'Bay 104: Docking Complete',
              slam: 'SLAM: 100% Locked',
              obs: 'Obstacle: None',
              obsColor: 'var(--color-success)',
              autonomy: 'Mode: Complete',
              trackX: 230,
              trackY: 235,
              hasObstacle: false
            },
            r2: {
              badge: 'ROBOT-02 [RETRIEVAL]',
              color: 'var(--accent-cyan)',
              task: 'En-route Pickup 1',
              slam: 'Corridor Clear',
              obs: 'Obstacle: None',
              obsColor: 'var(--color-success)',
              autonomy: 'Mode: Central Guidance',
              trackX: 320,
              trackY: 260,
              hasObstacle: false
            },
            r3: {
              badge: 'ROBOT-03 [EXPRESS ACTIVE]',
              color: 'var(--accent-cyan)',
              task: 'VIP Express: Bay 208',
              slam: 'Battery: 95% Dispatched',
              obs: 'Priority: Level 1 Preempt',
              obsColor: 'var(--color-success)',
              autonomy: 'Autonomy: Express Corridor',
              trackX: 380,
              trackY: 235,
              hasObstacle: false
            }
          }
        }
      };

      this.init();
    }

    init() {
      this.cacheElements();
      if (!this.container) return;

      this.bindEvents();
      this.applyScenario('normal');

      const slide8 = document.querySelector('section[data-state="slide-8"]');
      if (slide8 && slide8.classList.contains('present')) {
        this.isSlideActive = true;
        this.startPacketAnimation();
      }
    }

    cacheElements() {
      this.container = document.querySelector('section[data-state="slide-8"]');
      if (!this.container) return;

      this.scenarioButtons = this.container.querySelectorAll('.fleet-scenario-btn');
      this.scenarioLabel = document.getElementById('fleet-scenario-label');
      this.centralStatusText = document.getElementById('fleet-central-status');

      // Robot node groups
      this.r1Node = document.getElementById('fleet-node-r1');
      this.r2Node = document.getElementById('fleet-node-r2');
      this.r3Node = document.getElementById('fleet-node-r3');

      // Robot mini icons on track
      this.miniR1 = document.getElementById('fleet-track-r1');
      this.miniR2 = document.getElementById('fleet-track-r2');
      this.miniR3 = document.getElementById('fleet-track-r3');
      this.obstacleMarker = document.getElementById('fleet-obstacle-marker');

      // Data packets
      this.packets = this.container.querySelectorAll('.fleet-data-packet');
    }

    bindEvents() {
      // Scenario buttons
      this.scenarioButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const scenario = btn.getAttribute('data-scenario');
          this.applyScenario(scenario);
        });
      });

      // Click on robot nodes to select & inspect
      [
        { node: this.r1Node, id: 'r1' },
        { node: this.r2Node, id: 'r2' },
        { node: this.r3Node, id: 'r3' }
      ].forEach(({ node, id }) => {
        if (node) {
          node.style.cursor = 'pointer';
          node.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectRobot(id);
          });
        }
      });

      // Synchronize with Reveal.js slides
      if (typeof Reveal !== 'undefined') {
        Reveal.on('slidechanged', (event) => {
          const isSlide8 = event.currentSlide && event.currentSlide.getAttribute('data-state') === 'slide-8';
          if (isSlide8) {
            this.isSlideActive = true;
            this.startPacketAnimation();
          } else {
            this.isSlideActive = false;
            this.stopPacketAnimation();
          }
        });
      }
    }

    applyScenario(scenarioKey) {
      if (!this.scenarios[scenarioKey]) return;
      this.currentScenario = scenarioKey;
      const data = this.scenarios[scenarioKey];

      // 1. Update Buttons
      this.scenarioButtons.forEach((btn) => {
        const s = btn.getAttribute('data-scenario');
        btn.classList.toggle('active', s === scenarioKey);
      });

      // 2. Update Header Label
      if (this.scenarioLabel) {
        this.scenarioLabel.textContent = data.title;
      }

      // 3. Update Central Fleet Manager Status
      if (this.centralStatusText) {
        this.centralStatusText.textContent = data.centralStatus;
        this.centralStatusText.setAttribute('fill', data.centralColor);
      }

      // 4. Update Robot 1 Node
      this.updateRobotNode('r1', data.robots.r1);
      this.updateRobotNode('r2', data.robots.r2);
      this.updateRobotNode('r3', data.robots.r3);

      // 5. Update Mini Corridor Tracks
      if (this.miniR1) this.miniR1.setAttribute('transform', `translate(${data.robots.r1.trackX}, ${data.robots.r1.trackY})`);
      if (this.miniR2) this.miniR2.setAttribute('transform', `translate(${data.robots.r2.trackX}, ${data.robots.r2.trackY})`);
      if (this.miniR3) this.miniR3.setAttribute('transform', `translate(${data.robots.r3.trackX}, ${data.robots.r3.trackY})`);

      // 6. Obstacle Marker Visibility
      if (this.obstacleMarker) {
        this.obstacleMarker.style.opacity = data.robots.r2.hasObstacle ? '1' : '0';
      }
    }

    updateRobotNode(id, info) {
      const titleEl = document.getElementById(`fleet-${id}-title`);
      const taskEl = document.getElementById(`fleet-${id}-task`);
      const slamEl = document.getElementById(`fleet-${id}-slam`);
      const obsEl = document.getElementById(`fleet-${id}-obs`);
      const autEl = document.getElementById(`fleet-${id}-aut`);
      const boxEl = document.getElementById(`fleet-${id}-box`);

      if (titleEl) {
        titleEl.textContent = info.badge;
        titleEl.setAttribute('fill', info.color);
      }
      if (taskEl) taskEl.textContent = `• ${info.task}`;
      if (slamEl) slamEl.textContent = `• ${info.slam}`;
      if (obsEl) {
        obsEl.textContent = `• ${info.obs}`;
        obsEl.setAttribute('fill', info.obsColor);
      }
      if (autEl) autEl.textContent = `• ${info.autonomy}`;

      if (boxEl) {
        boxEl.setAttribute('stroke', info.color);
      }
    }

    selectRobot(id) {
      this.selectedRobot = id;
      ['r1', 'r2', 'r3'].forEach((r) => {
        const box = document.getElementById(`fleet-${r}-box`);
        if (box) {
          box.setAttribute('stroke-width', r === id ? '2.5' : '1.5');
        }
      });
    }

    startPacketAnimation() {
      this.stopPacketAnimation();
      let step = 0;
      this.animInterval = setInterval(() => {
        if (!this.isSlideActive) return;
        step = (step + 1) % 100;
        const progress = step / 100;

        // Telemetry lines from Central (x:260, y:87) to R1 (105, 160), R2 (260, 160), R3 (415, 160)
        const p1 = document.getElementById('fleet-packet-1');
        const p2 = document.getElementById('fleet-packet-2');
        const p3 = document.getElementById('fleet-packet-3');

        if (p1) {
          p1.setAttribute('cx', 260 + (105 - 260) * progress);
          p1.setAttribute('cy', 87 + (160 - 87) * progress);
        }
        if (p2) {
          p2.setAttribute('cx', 260);
          p2.setAttribute('cy', 87 + (160 - 87) * progress);
        }
        if (p3) {
          p3.setAttribute('cx', 260 + (415 - 260) * progress);
          p3.setAttribute('cy', 87 + (160 - 87) * progress);
        }
      }, 35);
    }

    stopPacketAnimation() {
      if (this.animInterval) {
        clearInterval(this.animInterval);
        this.animInterval = null;
      }
    }
  }

  function initFleetCoordination() {
    if (!window._saisFleetCoordination) {
      window._saisFleetCoordination = new FleetCoordinationController();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFleetCoordination);
  } else {
    initFleetCoordination();
  }
})();

