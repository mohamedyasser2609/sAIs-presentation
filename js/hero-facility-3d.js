/**
 * sAIs Presentation - Genuine 3D WebGL Parking Facility Digital Twin
 * Built with Three.js – Procedural geometry, physical lighting, real AGV simulation
 *
 * COORDINATE CONVENTION:
 *   +X = right (Row A bays),  -X = left (Row B / drop-off)
 *   +Z = "south" (front),     -Z = "north" (rear)
 *   +Y = up
 *   Vehicle & robot local forward = +Z  (Three.js convention)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class HeroFacilityWebGL {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    if (this.container._sAIsWebGLInstance) {
      return this.container._sAIsWebGLInstance;
    }
    this.container._sAIsWebGLInstance = this;

    this.options = Object.assign({
      isClosingScene: false,
      enableControls: true
    }, options);

    this.isPaused = false;
    this.animationTime = 0;
    this.cycleDuration = 20;
    this.rafId = null;
    this.prevPos = new THREE.Vector3();

    // Camera presets (clear of pillars, good composition)
    this.cameraPresets = {
      overview: { pos: new THREE.Vector3(28, 22, 22), lookAt: new THREE.Vector3(0, 0, -1) },
      track:   { pos: new THREE.Vector3(12, 10, 14), lookAt: new THREE.Vector3(0, 1, 0) },
      bay:     { pos: new THREE.Vector3(12, 5, 5),  lookAt: new THREE.Vector3(8.5, 0.5, 2.5) }
    };

    this.currentPreset = 'overview';
    this.targetCameraPos = this.cameraPresets.overview.pos.clone();
    this.targetCameraLookAt = this.cameraPresets.overview.lookAt.clone();
    this.cameraLerpSpeed = 0.04;
    this.userInteracted = false;

    try {
      this.initDOM();
      this.initThree();
      this.buildFacility();
      this.buildCars();
      this.buildRobot();
      this.setupEvents();
      this.applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
      this.start();
      console.log(`[sAIs 3D] Mounted #${containerId}`);
    } catch (err) {
      console.error(`[sAIs 3D] Init error #${containerId}:`, err);
    }
  }

  /* ====================================================================
     DOM SHELL
     ==================================================================== */
  initDOM() {
    this.container.innerHTML = `
      <div class="facility-3d-wrapper" style="position:relative;width:100%;height:100%;min-height:520px;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">
        <!-- HUD Header -->
        <div style="position:absolute;top:14px;left:16px;right:16px;z-index:10;display:flex;justify-content:space-between;align-items:center;pointer-events:none;">
          <div style="pointer-events:auto;background:var(--bg-card);border:1px solid var(--border-cyan);padding:5px 12px;border-radius:6px;display:flex;align-items:center;gap:8px;">
            <span class="badge-dot pulse-dot"></span>
            <span style="font-family:var(--font-mono);font-size:0.76rem;font-weight:bold;color:var(--accent-cyan);letter-spacing:0.05em;">
              ${this.options.isClosingScene ? '3D DIGITAL TWIN // FULL FACILITY' : '3D DIGITAL TWIN // LIVE SIMULATION'}
            </span>
          </div>
          <div style="pointer-events:auto;display:flex;gap:6px;">
            <button class="facility-control-btn" id="${this.container.id}-btn-overview">Overview</button>
            <button class="facility-control-btn" id="${this.container.id}-btn-track">Track AGV</button>
            <button class="facility-control-btn" id="${this.container.id}-btn-bay">Bay View</button>
            <button class="facility-control-btn" id="${this.container.id}-btn-pause" style="min-width:60px;">
              <span id="${this.container.id}-pause-text">PAUSE</span>
            </button>
          </div>
        </div>

        <!-- WebGL Canvas -->
        <div id="${this.container.id}-canvas" style="flex:1;width:100%;height:100%;min-height:480px;position:relative;cursor:grab;"></div>

        <!-- HUD Footer -->
        <div class="facility-hud-footer" style="position:absolute;bottom:12px;left:16px;right:16px;z-index:10;pointer-events:none;">
          <div class="hud-stat-item">
            <span class="hud-stat-label">OPERATION</span>
            <span class="hud-stat-value accent-cyan" id="${this.container.id}-hud-phase">STANDBY</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">LIFT STATUS</span>
            <span class="hud-stat-value" id="${this.container.id}-hud-lift" style="color:var(--color-success)">IDLE</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">TARGET BAY</span>
            <span class="hud-stat-value" id="${this.container.id}-hud-bay">A-03 [ALLOCATED]</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">CONTROLS</span>
            <span class="hud-stat-value" style="color:var(--text-muted);font-size:0.72rem;">Drag: Orbit · Scroll: Zoom</span>
          </div>
        </div>
      </div>
    `;
    this.canvasContainer = document.getElementById(`${this.container.id}-canvas`);
    this.hudPhase = document.getElementById(`${this.container.id}-hud-phase`);
    this.hudLift  = document.getElementById(`${this.container.id}-hud-lift`);
    this.hudBay   = document.getElementById(`${this.container.id}-hud-bay`);
    this.pauseBtn = document.getElementById(`${this.container.id}-btn-pause`);
    this.pauseText = document.getElementById(`${this.container.id}-pause-text`);
  }

  /* ====================================================================
     THREE.JS CORE
     ==================================================================== */
  initThree() {
    const w = this.canvasContainer.clientWidth  || this.container.clientWidth  || 680;
    const h = this.canvasContainer.clientHeight || this.container.clientHeight || 520;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0f18, 0.006); // subtle, not oppressive

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    this.camera.position.copy(this.cameraPresets.overview.pos);
    this.currentLookAt = this.cameraPresets.overview.lookAt.clone();
    this.camera.lookAt(this.currentLookAt);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);

    // Apply adaptive pixel ratio from performance manager (caps DPR for large displays)
    const perfMgr = (typeof window !== 'undefined') ? window.saisPerformanceManager : null;
    const dprCap  = perfMgr ? perfMgr.getPixelRatio(perfMgr.currentProfile) : Math.min(window.devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(dprCap);

    // Shadow map — use profile-aware settings; fallback to PCFShadowMap (cheaper than Soft)
    this.renderer.shadowMap.enabled = true;
    const shadowType = perfMgr ? perfMgr.getShadowMapType(perfMgr.currentProfile) : 'PCFShadowMap';
    this.renderer.shadowMap.type = THREE[shadowType] ?? THREE.PCFShadowMap;

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.canvasContainer.appendChild(this.renderer.domElement);

    // Register with performance manager so profile switches update this renderer
    if (perfMgr) perfMgr.registerRenderer(this.renderer);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.target.copy(this.currentLookAt);
    this.controls.addEventListener('start', () => { this.userInteracted = true; });

    // ---------- LIGHTING ----------
    // Hemisphere: bright sky + warm ground fill
    this.hemiLight = new THREE.HemisphereLight(0xf0f4ff, 0x3a3530, 1.2);
    this.scene.add(this.hemiLight);

    // Main directional (sun-like) with shadows
    this.dirLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    this.dirLight.position.set(14, 26, 12);
    this.dirLight.castShadow = true;
    // Shadow map resolution from performance manager — cheaper on external/presentation profiles
    const shadowSize = perfMgr ? perfMgr.getShadowMapSize(perfMgr.currentProfile) : 1024;
    this.dirLight.shadow.mapSize.width  = shadowSize;
    this.dirLight.shadow.mapSize.height = shadowSize;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 70;
    const sd = 24;
    this.dirLight.shadow.camera.left = -sd;
    this.dirLight.shadow.camera.right = sd;
    this.dirLight.shadow.camera.top = sd;
    this.dirLight.shadow.camera.bottom = -sd;
    this.dirLight.shadow.bias = -0.0004;
    this.scene.add(this.dirLight);

    // Ceiling Fluorescent Fixtures (warm white point fill lights)
    const ceilPositions = [
      { x: -6, z: -4 }, { x: -6, z: 4 },
      { x:  0, z: -4 }, { x:  0, z: 4 },
      { x:  6, z: -4 }, { x:  6, z: 4 },
    ];
    ceilPositions.forEach(p => {
      const pl = new THREE.PointLight(0xfff8ee, 22, 18, 1.2);
      pl.position.set(p.x, 7.2, p.z);
      this.scene.add(pl);
    });

    // Subtle cyan accent on the AGV highway
    const accentSpot = new THREE.SpotLight(0x00d4ff, 1.5, 30, Math.PI / 4, 0.7, 1.5);
    accentSpot.position.set(0, 8, 0);
    accentSpot.target.position.set(0, 0, 0);
    this.scene.add(accentSpot);
    this.scene.add(accentSpot.target);
  }

  /* ====================================================================
     FACILITY ENVIRONMENT
     ==================================================================== */
  buildFacility() {
    this.facilityGroup = new THREE.Group();
    this.scene.add(this.facilityGroup);

    // -- Materials --
    this.matFloor = new THREE.MeshStandardMaterial({ color: 0x3a3e48, roughness: 0.82, metalness: 0.05 });
    this.matHighway = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.6, metalness: 0.12 });
    this.matPillar = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.75, metalness: 0.05 });
    this.matWall = new THREE.MeshStandardMaterial({ color: 0x606670, roughness: 0.9, metalness: 0.02 });
    this.matYellowBumper = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45, metalness: 0.1 });
    this.matCeiling = new THREE.MeshStandardMaterial({ color: 0x909498, roughness: 0.95, metalness: 0.0, side: THREE.BackSide });

    const matBayLineCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8 });
    const matBayLineWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    this.matBayLine = matBayLineCyan;
    this.matBayLineWhite = matBayLineWhite;

    // 1. Floor Slab (thick for depth)
    const floorGeo = new THREE.BoxGeometry(36, 0.5, 28);
    this.floorMesh = new THREE.Mesh(floorGeo, this.matFloor);
    this.floorMesh.position.y = -0.25;
    this.floorMesh.receiveShadow = true;
    this.facilityGroup.add(this.floorMesh);

    // Floor markings: parking zone divider lines
    this.addFloorLine(-3, 0, 0.12, 26, matBayLineWhite); // left divider
    this.addFloorLine( 3, 0, 0.12, 26, matBayLineWhite); // right divider

    // 2. Central AGV Highway
    const hwGeo = new THREE.BoxGeometry(6, 0.02, 26);
    this.highwayMesh = new THREE.Mesh(hwGeo, this.matHighway);
    this.highwayMesh.position.set(0, 0.01, 0);
    this.highwayMesh.receiveShadow = true;
    this.facilityGroup.add(this.highwayMesh);

    // Highway dashed center line
    for (let z = -11; z <= 11; z += 2.0) {
      this.addFloorLine(0, z, 0.14, 1.0, matBayLineCyan);
    }

    // 3. Structural Pillars (repositioned to not obstruct main view)
    const pillarPositions = [
      { x: -4, z: -9 }, { x: -4, z: 9 },
      { x:  4, z: -9 }, { x:  4, z: 9 }
    ];
    pillarPositions.forEach(p => this.addPillar(p.x, p.z));

    // 4. Perimeter Walls (3 sides, front open as entrance)
    // Rear wall
    this.addWall(0, -13.5, 36, 3.5, 0.4, 0);
    // Left side wall
    this.addWall(-17.8, 0, 0.4, 3.5, 28, 0);
    // Right side wall
    this.addWall(17.8, 0, 0.4, 3.5, 28, 0);

    // 5. Ceiling Slab (gives sense of indoor enclosure)
    const ceilGeo = new THREE.BoxGeometry(36, 0.35, 28);
    const ceil = new THREE.Mesh(ceilGeo, this.matCeiling);
    ceil.position.y = 8.0;
    this.facilityGroup.add(ceil);

    // 6. Parking Bays
    // Row A (right side): bays along +X edge
    const rowAX = 10;
    const bayZs = [-8, -3.5, 1, 5.5, 10];
    bayZs.forEach((z, i) => {
      const id = `A-0${i + 1}`;
      this.createParkingBay(rowAX, z, id, id === 'A-03');
    });

    // Row B (left side)
    const rowBX = -10;
    this.createParkingBay(rowBX, 8,  'B-01', false);
    this.createParkingBay(rowBX, 3.5, 'B-02', false);

    // 7. Customer Drop-off Station
    this.createHandoverStation(rowBX, -6.5);

    // 8. Entrance Ramp Arrows (front, z > 12)
    this.addFloorArrow(0, 12.5);
  }

  addFloorLine(x, z, width, length, mat) {
    const geo = new THREE.PlaneGeometry(width, length);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.006, z);
    this.facilityGroup.add(m);
  }

  addFloorArrow(x, z) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-0.5, -0.8);
    shape.lineTo(-0.18, -0.8);
    shape.lineTo(-0.18, -1.8);
    shape.lineTo(0.18, -1.8);
    shape.lineTo(0.18, -0.8);
    shape.lineTo(0.5, -0.8);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.007, z);
    this.facilityGroup.add(mesh);
  }

  addPillar(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.4, 0.45, 8, 16);
    const shaft = new THREE.Mesh(shaftGeo, this.matPillar);
    shaft.position.y = 4;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);

    // Hazard band at bottom
    const bandGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.5, 16);
    const band = new THREE.Mesh(bandGeo, this.matYellowBumper);
    band.position.y = 0.25;
    band.castShadow = true;
    group.add(band);

    // Pillar base pad
    const padGeo = new THREE.BoxGeometry(1.3, 0.1, 1.3);
    const pad = new THREE.Mesh(padGeo, this.matPillar);
    pad.position.y = 0.05;
    pad.receiveShadow = true;
    group.add(pad);

    this.facilityGroup.add(group);
  }

  addWall(x, z, w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const wall = new THREE.Mesh(geo, this.matWall);
    wall.position.set(x, h / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.facilityGroup.add(wall);
  }

  createParkingBay(x, z, label, isTarget) {
    const bw = 5.0, bd = 3.0;
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const lineMat = isTarget ? this.matBayLine : this.matBayLineWhite;

    // Bay boundary rectangle (painted lines)
    const edgesGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(bw, bd));
    const lines = new THREE.LineSegments(edgesGeo, lineMat);
    lines.rotation.x = -Math.PI / 2;
    lines.position.y = 0.007;
    group.add(lines);

    // Wheel bumper stop
    const bumpGeo = new THREE.BoxGeometry(0.15, 0.12, 1.6);
    const bump = new THREE.Mesh(bumpGeo, this.matYellowBumper);
    bump.position.set(x > 0 ? 2.1 : -2.1, 0.06, 0);
    bump.castShadow = true;
    group.add(bump);

    // Bay number text (small LED indicator)
    const ledColor = isTarget ? 0x00f0ff
      : (['A-01','A-02','B-01'].includes(label) ? 0xef4444 : 0x10b981);
    const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
    const ledGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(x > 0 ? -2.3 : 2.3, 0.15, 1.2);
    group.add(led);

    if (isTarget) {
      this.targetBayGroup = group;
      this.targetBayLed = led;
      this.targetBayLine = lines;
    }

    this.facilityGroup.add(group);
  }

  createHandoverStation(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Raised platform
    const platGeo = new THREE.BoxGeometry(5.4, 0.12, 3.6);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.5, metalness: 0.15 });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.y = 0.06;
    plat.receiveShadow = true;
    group.add(plat);

    // Gantry scanner posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.3, metalness: 0.7 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 12);

    [[-1.6], [1.6]].forEach(([zOff]) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(2.5, 1.2, zOff);
      post.castShadow = true;
      group.add(post);
    });

    // Laser beam between posts
    const beamGeo = new THREE.CylinderGeometry(0.012, 0.012, 3.2, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.x = Math.PI / 2;
    beam.position.set(2.5, 1.4, 0);
    group.add(beam);

    // "DROP-OFF" sign (small box)
    const signGeo = new THREE.BoxGeometry(2.5, 0.5, 0.08);
    const signMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.4 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.6, -1.7);
    group.add(sign);

    this.facilityGroup.add(group);
  }

  /* ====================================================================
     3D VEHICLE MODELS  (local forward = +Z)
     ==================================================================== */
  buildCars() {
    this.carsGroup = new THREE.Group();
    this.scene.add(this.carsGroup);

    // Parked cars — static, no need to cast shadows (saves draw calls)
    const c1 = this.createCar({ bodyColor: 0x1e3a8a, style: 'sedan', castShadows: false });
    c1.position.set(10, 0, -8);
    c1.rotation.y = Math.PI;
    this.carsGroup.add(c1);

    const c2 = this.createCar({ bodyColor: 0xd1d5db, style: 'suv', castShadows: false });
    c2.position.set(10, 0, -3.5);
    c2.rotation.y = Math.PI;
    this.carsGroup.add(c2);

    const c3 = this.createCar({ bodyColor: 0x334155, style: 'sedan', castShadows: false });
    c3.position.set(-10, 0, 8);
    c3.rotation.y = 0;
    this.carsGroup.add(c3);

    // Transport car — moves during simulation; cast shadows so it looks grounded
    this.transportCar = this.createCar({ bodyColor: 0x94a3b8, style: 'sedan', castShadows: true });
    this.transportCar.position.set(-10, 0, -6.5);
    this.transportCar.rotation.y = 0;
    this.carsGroup.add(this.transportCar);
  }

  createCar({ bodyColor, style, castShadows = true }) {
    // LOCAL AXES:  front = +Z,  rear = -Z,  right = +X,  left = -X
    const car = new THREE.Group();
    const L = style === 'suv' ? 4.6 : 4.4;
    const W = 1.85;
    const H = style === 'suv' ? 1.5 : 1.3;

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.22, metalness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2540, roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.85 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.92 });
    const rimMat  = new THREE.MeshStandardMaterial({ color: 0xc0c0c4, metalness: 0.85, roughness: 0.15 });

    // Lower body
    const lowerGeo = new THREE.BoxGeometry(W, 0.50, L);
    const lower = new THREE.Mesh(lowerGeo, bodyMat);
    lower.position.y = 0.30;
    lower.castShadow = castShadows;
    lower.receiveShadow = true;
    car.add(lower);

    // Cabin
    const cabL = style === 'suv' ? L * 0.6 : L * 0.52;
    const cabH = H * 0.48;
    const cabGeo = new THREE.BoxGeometry(W * 0.90, cabH, cabL);
    const cabin = new THREE.Mesh(cabGeo, glassMat);
    cabin.position.set(0, 0.55 + cabH / 2, -L * 0.04);
    cabin.castShadow = castShadows;
    car.add(cabin);

    // Roof
    const roofGeo = new THREE.BoxGeometry(W * 0.88, 0.06, cabL * 0.94);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, 0.55 + cabH + 0.03, -L * 0.04);
    car.add(roof);

    // Wheels (front = +Z side) — reduced segments for better performance
    const wR = 0.32, wW = 0.2;
    const wGeo = new THREE.CylinderGeometry(wR, wR, wW, 16);  // 20→16
    wGeo.rotateZ(Math.PI / 2);
    const rGeo = new THREE.CylinderGeometry(wR * 0.55, wR * 0.55, wW + 0.01, 10);  // 12→10
    rGeo.rotateZ(Math.PI / 2);

    const axleX = W / 2 - 0.05;
    const axleZf = L / 2 - 0.75;  // front axle
    const axleZr = -(L / 2 - 0.75); // rear axle
    const wY = 0.02;

    [{ x: axleX, z: axleZf }, { x: -axleX, z: axleZf },
     { x: axleX, z: axleZr }, { x: -axleX, z: axleZr }].forEach(p => {
      const wg = new THREE.Group();
      wg.position.set(p.x, wY, p.z);
      wg.add(new THREE.Mesh(wGeo, tireMat));
      wg.add(new THREE.Mesh(rGeo, rimMat));
      car.add(wg);
    });

    // Headlights (front = +Z)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const hlGeo = new THREE.BoxGeometry(0.30, 0.12, 0.08);
    [0.65, -0.65].forEach(x => {
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(x, 0.35, L / 2);
      car.add(hl);
    });

    // Taillights (rear = -Z)
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xdd2222 });
    const tlGeo = new THREE.BoxGeometry(0.30, 0.10, 0.08);
    [0.65, -0.65].forEach(x => {
      const tl = new THREE.Mesh(tlGeo, tlMat);
      tl.position.set(x, 0.38, -L / 2);
      car.add(tl);
    });

    return car;
  }

  /* ====================================================================
     3D ROBOT MODEL  (local forward = +Z)
     ==================================================================== */
  buildRobot() {
    this.robotGroup = new THREE.Group();
    this.scene.add(this.robotGroup);

    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1a2438, roughness: 0.25, metalness: 0.8 });
    const accentMat  = new THREE.MeshStandardMaterial({ color: 0x00e0ff, roughness: 0.15, metalness: 0.6, emissive: 0x00c8ff, emissiveIntensity: 0.35 });
    const cradleMat  = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.65 });
    const sensorMat  = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.1, metalness: 0.9 });

    // Main low-profile chassis  (4.2m x 1.7m x 0.16m)
    const baseGeo = new THREE.BoxGeometry(1.7, 0.14, 4.2);
    const base = new THREE.Mesh(baseGeo, chassisMat);
    base.position.y = 0.10;
    base.castShadow = true;
    base.receiveShadow = true;
    this.robotGroup.add(base);

    // Perimeter glow trim
    const trimGeo = new THREE.BoxGeometry(1.75, 0.025, 4.25);
    const trim = new THREE.Mesh(trimGeo, accentMat);
    trim.position.y = 0.11;
    this.robotGroup.add(trim);

    // Drive wheels (4 corners)
    const dwGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 12);
    dwGeo.rotateZ(Math.PI / 2);
    const dwMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    [{ x: 0.8, z: 1.8 }, { x: -0.8, z: 1.8 }, { x: 0.8, z: -1.8 }, { x: -0.8, z: -1.8 }].forEach(p => {
      const dw = new THREE.Mesh(dwGeo, dwMat);
      dw.position.set(p.x, 0.04, p.z);
      this.robotGroup.add(dw);
    });

    // LiDAR sensor domes (front + rear)
    const lidarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16);
    const frontLidar = new THREE.Mesh(lidarGeo, sensorMat);
    frontLidar.position.set(0, 0.20, 2.0);
    this.robotGroup.add(frontLidar);

    const rearLidar = new THREE.Mesh(lidarGeo, sensorMat);
    rearLidar.position.set(0, 0.20, -2.0);
    this.robotGroup.add(rearLidar);

    // Camera/ultrasonic sensors on sides
    const usGeo = new THREE.BoxGeometry(0.06, 0.06, 0.12);
    [0.85, -0.85].forEach(x => {
      [-1.2, 0, 1.2].forEach(z => {
        const us = new THREE.Mesh(usGeo, sensorMat);
        us.position.set(x, 0.14, z);
        this.robotGroup.add(us);
      });
    });

    // Wheel-cradling / lifting arms (4 units)
    this.cradleArms = [];
    const armPositions = [
      { x: 0.8, z: 1.4 }, { x: -0.8, z: 1.4 },
      { x: 0.8, z: -1.4 }, { x: -0.8, z: -1.4 }
    ];
    armPositions.forEach(p => {
      const arm = new THREE.Group();
      arm.position.set(p.x, 0.12, p.z);

      // Horizontal clamp plate
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.4), cradleMat);
      plate.castShadow = true;
      arm.add(plate);

      // Vertical lifting fork prongs
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.35), cradleMat);
      prong.position.set(0.15, 0.04, 0);
      arm.add(prong);
      const prong2 = prong.clone();
      prong2.position.x = -0.15;
      arm.add(prong2);

      this.robotGroup.add(arm);
      this.cradleArms.push(arm);
    });

    // Starting position: under the transport car at drop-off
    this.robotGroup.position.set(-10, 0, -6.5);
    this.robotGroup.rotation.y = 0;
  }

  /* ====================================================================
     EVENTS
     ==================================================================== */
  setupEvents() {
    // Debounced resize — prevents renderer thrashing on HDMI connect/disconnect
    let _resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => this.onResize(), 150);
    });

    // Pause when tab is hidden, resume when visible (saves GPU on alt-tab)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else if (this._slideIsActive !== false) {
        this.start();
      }
    });

    const bind = (id, preset) => {
      const btn = document.getElementById(`${this.container.id}-btn-${id}`);
      if (btn) btn.addEventListener('click', () => {
        this.userInteracted = false;
        this.setCameraPreset(preset);
      });
    };
    bind('overview', 'overview');
    bind('track', 'track');
    bind('bay', 'bay');

    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        if (this.pauseText) this.pauseText.textContent = this.isPaused ? 'PLAY' : 'PAUSE';
      });
    }

    window.addEventListener('sais-theme-change', (e) => {
      this.applyTheme(e.detail?.theme || 'dark');
    });

    // Listen for profile changes — update renderer pixel ratio on the fly
    window.addEventListener('sais-profile-change', () => {
      const pm = window.saisPerformanceManager;
      if (pm && this.renderer) pm.applyProfile(this.renderer);
    });

    if (typeof Reveal !== 'undefined') {
      const checkActive = (currSlide) => {
        const parent = this.container.closest('section');
        const isPresent = parent === currSlide || (!currSlide && parent && parent.classList.contains('present'));
        this._slideIsActive = isPresent;
        if (isPresent) {
          this.start();
          setTimeout(() => this.onResize(), 60);
        } else {
          this.stop();
        }
      };
      Reveal.on('slidechanged', (ev) => checkActive(ev.currentSlide));
      Reveal.on('ready', (ev) => checkActive(ev.currentSlide));
    }

    setTimeout(() => this.onResize(), 100);
    setTimeout(() => this.onResize(), 500);
  }

  setCameraPreset(preset) {
    if (!this.cameraPresets[preset]) return;
    this.currentPreset = preset;
    this.targetCameraPos.copy(this.cameraPresets[preset].pos);
    this.targetCameraLookAt.copy(this.cameraPresets[preset].lookAt);
  }

  /* ====================================================================
     THEME
     ==================================================================== */
  applyTheme(theme) {
    const dark = theme !== 'light';
    if (dark) {
      this.scene.background = new THREE.Color(0x0c1018);
      this.scene.fog.color.setHex(0x0c1018);
      this.matFloor.color.setHex(0x3a3e48);
      this.matHighway.color.setHex(0x2a2e36);
      this.matPillar.color.setHex(0x8a8f98);
      this.matWall.color.setHex(0x606670);
      this.hemiLight.intensity = 1.2;
      this.dirLight.intensity = 2.2;
      this.renderer.toneMappingExposure = 1.4;
    } else {
      this.scene.background = new THREE.Color(0xeef1f6);
      this.scene.fog.color.setHex(0xeef1f6);
      this.matFloor.color.setHex(0xd0d4dc);
      this.matHighway.color.setHex(0xbfc4cc);
      this.matPillar.color.setHex(0xa8acb4);
      this.matWall.color.setHex(0xc0c4cc);
      this.hemiLight.intensity = 1.6;
      this.dirLight.intensity = 2.8;
      this.renderer.toneMappingExposure = 1.6;
    }
  }

  onResize() {
    if (!this.canvasContainer || !this.renderer || !this.camera) return;
    const w = this.canvasContainer.clientWidth;
    const h = this.canvasContainer.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    // Re-apply pixel ratio cap in case display changed (e.g. HDMI connect/disconnect)
    if (window.saisPerformanceManager) {
      window.saisPerformanceManager.applyProfile(this.renderer);
    }
  }

  /* ====================================================================
     RENDER LOOP — delta-time based (frame-rate independent)
     ==================================================================== */
  start() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this._lastFrameTime = performance.now();
    const loop = (timestamp) => {
      // --- Delta-time calculation ---
      const rawDelta = (timestamp - this._lastFrameTime) / 1000; // seconds
      this._lastFrameTime = timestamp;
      // Cap at 50 ms to avoid animation jumps after tab switch / inactivity
      const delta = Math.min(rawDelta, 0.05);

      this.update(delta);
      this.renderer.render(this.scene, this.camera);

      // Let the performance manager track FPS / draw calls
      if (window.saisPerformanceManager) {
        window.saisPerformanceManager.tick(this.renderer);
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  /* ====================================================================
     ANIMATION UPDATE — CORRECT HEADING FROM VELOCITY
     ==================================================================== */
  update(delta = 0.016) {
    this.controls.update();

    // Camera transition (skip if user is manually orbiting)
    // Frame-rate independent lerp: lerp(speed * 60 * delta) normalises to 60FPS baseline
    const lerpAlpha = Math.min(1, this.cameraLerpSpeed * 60 * delta);
    if (!this.userInteracted) {
      if (this.currentPreset === 'track') {
        this.targetCameraLookAt.copy(this.robotGroup.position);
        this.targetCameraPos.set(
          this.robotGroup.position.x + 8,
          this.robotGroup.position.y + 7,
          this.robotGroup.position.z + 10
        );
      }
      this.camera.position.lerp(this.targetCameraPos, lerpAlpha);
      this.currentLookAt.lerp(this.targetCameraLookAt, lerpAlpha);
      this.controls.target.copy(this.currentLookAt);
    }

    if (this.isPaused) return;

    // --- Animation timeline (delta-time based — frame-rate independent) ---
    this.animationTime = (this.animationTime + delta) % this.cycleDuration;
    const t = this.animationTime / this.cycleDuration;

    // PATH WAYPOINTS (world coords):
    //   Start (Drop-off):  x=-10,  z=-6.5
    //   Highway entry:     x=0,    z=-6.5
    //   Highway turn:      x=0,    z=1
    //   Bay A-03:          x=10,   z=1
    let rx = -10, rz = -6.5;
    let liftH = 0, cradleDeploy = 0;
    let carAttached = false, bayOccupied = false;

    if (t < 0.12) {
      // Phase 1: Cradle deploy & engage (stationary at drop-off)
      rx = -10; rz = -6.5;
      const s = t / 0.12;
      cradleDeploy = Math.min(1, s * 1.3);
      carAttached = true;
      this.setHud('1/6 CRADLE ARM DEPLOYMENT', `ENGAGING (${Math.round(cradleDeploy*100)}%)`, 'A-03 [ALLOCATED]', '');

    } else if (t < 0.20) {
      // Phase 2: Lift vehicle +80mm
      rx = -10; rz = -6.5;
      const s = (t - 0.12) / 0.08;
      cradleDeploy = 1;
      liftH = s * 0.08;
      carAttached = true;
      this.setHud('2/6 MECHANICAL LIFT (\u0394h +80mm)', `+${Math.round(liftH*1000)}mm`, 'A-03 [ALLOCATED]', '');

    } else if (t < 0.42) {
      // Phase 3: Drive from drop-off to highway (along +X at z=-6.5)
      const s = this.easeInOut((t - 0.20) / 0.22);
      rx = -10 + s * 10;  // -10 → 0
      rz = -6.5;
      cradleDeploy = 1; liftH = 0.08; carAttached = true;
      this.setHud('3/6 TRANSIT → AGV HIGHWAY', 'SECURED (+80mm)', 'A-03 [ALLOCATED]', '');

    } else if (t < 0.62) {
      // Phase 4: Drive along highway (along +Z at x=0)
      const s = this.easeInOut((t - 0.42) / 0.20);
      rx = 0;
      rz = -6.5 + s * 7.5;  // -6.5 → 1
      cradleDeploy = 1; liftH = 0.08; carAttached = true;
      this.setHud('4/6 HIGHWAY NAVIGATION', 'LiDAR ACTIVE', 'A-03 [ALLOCATED]', '');

    } else if (t < 0.82) {
      // Phase 5: Turn into bay A-03 (along +X at z=1)
      const s = this.easeInOut((t - 0.62) / 0.20);
      rx = 0 + s * 10;  // 0 → 10
      rz = 1;
      cradleDeploy = 1; liftH = 0.08; carAttached = true;
      this.setHud('5/6 BAY A-03 DOCKING', 'PRECISION INGRESS', 'A-03 [DOCKING]', 'var(--accent-cyan)');

    } else {
      // Phase 6: Lower & release
      const s = (t - 0.82) / 0.18;
      rx = 10; rz = 1;
      cradleDeploy = Math.max(0, 1 - s);
      liftH = Math.max(0, (1 - s) * 0.08);
      carAttached = true;
      bayOccupied = true;
      this.setHud('6/6 VEHICLE STORED', 'DISENGAGED', 'A-03 [OCCUPIED]', 'var(--color-danger)');
    }

    // --- HEADING: compute from displacement ---
    const dx = rx - this.prevPos.x;
    const dz = rz - this.prevPos.z;
    const speed = Math.sqrt(dx * dx + dz * dz);

    let heading = this.robotGroup.rotation.y;
    if (speed > 0.001) {
      heading = Math.atan2(dx, dz);  // atan2(x, z) gives yaw where +Z = 0
    }

    // Apply to robot
    this.robotGroup.position.set(rx, 0, rz);
    this.robotGroup.rotation.y = heading;

    // Apply cradle arms
    this.cradleArms.forEach((arm, i) => {
      const xSign = (i % 2 === 0) ? 1 : -1;
      arm.position.x = xSign * (0.7 + cradleDeploy * 0.18);
    });

    // Apply to transport car
    if (carAttached && this.transportCar) {
      this.transportCar.position.set(rx, liftH, rz);
      this.transportCar.rotation.y = heading;
    }

    // Bay status LED
    if (this.targetBayLed && this.targetBayLine) {
      const col = bayOccupied ? 0xef4444 : 0x00f0ff;
      this.targetBayLed.material.color.setHex(col);
      this.targetBayLine.material.color.setHex(col);
    }

    this.prevPos.set(rx, 0, rz);
  }

  setHud(phase, lift, bay, bayColor) {
    if (this.hudPhase) this.hudPhase.textContent = phase;
    if (this.hudLift)  this.hudLift.textContent = lift;
    if (this.hudBay) {
      this.hudBay.textContent = bay;
      if (bayColor) this.hudBay.style.color = bayColor;
    }
  }

  easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}

/* ======================================================================
   GLOBAL INIT & AUTO-MOUNT
   ====================================================================== */
if (typeof window !== 'undefined') {
  window.initHeroFacilityWebGL = (id, opts) => new HeroFacilityWebGL(id, opts);
  window.initHeroFacility3D = window.initHeroFacilityWebGL;

  function autoMountWebGLFacilities() {
    if (document.getElementById('hero-facility-slide1')) {
      window.heroWebGL1 = new HeroFacilityWebGL('hero-facility-slide1', { isClosingScene: false });
    }
    if (document.getElementById('hero-facility-slide16')) {
      window.heroWebGL16 = new HeroFacilityWebGL('hero-facility-slide16', { isClosingScene: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMountWebGLFacilities);
  } else {
    autoMountWebGLFacilities();
  }
}
