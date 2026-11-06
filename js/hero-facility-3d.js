/**
 * sAIs Presentation - Genuine 3D WebGL Parking Facility Digital Twin
 * Built with Three.js (Procedural 3D Geometry, Physical Lighting & Dynamic AGV Simulation)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class HeroFacilityWebGL {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.options = Object.assign({
      isClosingScene: false,
      cameraPreset: 'overview',
      enableControls: true
    }, options);

    this.isPaused = false;
    this.animationTime = 0;
    this.cycleDuration = 22; // 22 seconds for full realistic engineering cycle
    this.rafId = null;

    // Camera preset targets
    this.cameraPresets = {
      overview: { pos: new THREE.Vector3(22, 18, 25), lookAt: new THREE.Vector3(0, 1.2, 0) },
      track: { pos: new THREE.Vector3(12, 10, 14), lookAt: new THREE.Vector3(0, 1, 0) },
      bay: { pos: new THREE.Vector3(14, 7, 6), lookAt: new THREE.Vector3(7, 1, 0) },
      dropoff: { pos: new THREE.Vector3(-8, 7, -6), lookAt: new THREE.Vector3(-7, 1, -6) }
    };

    this.currentPreset = 'overview';
    this.targetCameraPos = this.cameraPresets.overview.pos.clone();
    this.targetCameraLookAt = this.cameraPresets.overview.lookAt.clone();
    this.cameraLerpSpeed = 0.05;

    try {
      this.initDOM();
      this.initThree();
      this.buildFacility();
      this.buildCars();
      this.buildRobot();
      this.setupEvents();
      this.applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
      this.start();
      console.log(`[sAIs 3D WebGL] Scene mounted successfully into #${containerId}`);
    } catch (err) {
      console.error(`[sAIs 3D WebGL] Initialization error in #${containerId}:`, err);
    }
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="facility-3d-wrapper" style="position: relative; width: 100%; height: 100%; min-height: 520px; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;">
        <!-- Telemetry Header HUD -->
        <div class="facility-hud-header" style="position: absolute; top: 14px; left: 16px; right: 16px; z-index: 10; display: flex; justify-content: space-between; align-items: center; pointer-events: none;">
          <div class="facility-hud-badge" style="pointer-events: auto; background: var(--bg-card); border: 1px solid var(--border-cyan); padding: 5px 12px; border-radius: 6px; display: flex; align-items: center; gap: 8px;">
            <span class="badge-dot pulse-dot"></span>
            <span style="font-family: var(--font-mono); font-size: 0.76rem; font-weight: bold; color: var(--accent-cyan); letter-spacing: 0.05em;">
              ${this.options.isClosingScene ? '3D DIGITAL TWIN // FULL FACILITY' : '3D DIGITAL TWIN // WEBGL SIMULATION'}
            </span>
          </div>

          <div class="facility-hud-controls" style="pointer-events: auto; display: flex; gap: 6px;">
            <button class="facility-control-btn" id="${this.container.id}-btn-overview" title="Overview 3/4 Camera">Overview</button>
            <button class="facility-control-btn" id="${this.container.id}-btn-track" title="Track Moving Robot">Track AGV</button>
            <button class="facility-control-btn" id="${this.container.id}-btn-bay" title="Focus Target Bay">Bay View</button>
            <button class="facility-control-btn" id="${this.container.id}-btn-pause" title="Pause / Resume" style="min-width: 60px;">
              <span id="${this.container.id}-pause-text">PAUSE</span>
            </button>
          </div>
        </div>

        <!-- WebGL Canvas Container -->
        <div id="${this.container.id}-canvas-container" style="flex: 1; width: 100%; height: 100%; position: relative; cursor: grab;"></div>

        <!-- Telemetry HUD Bottom Bar -->
        <div class="facility-hud-footer" style="position: absolute; bottom: 12px; left: 16px; right: 16px; z-index: 10; pointer-events: none;">
          <div class="hud-stat-item">
            <span class="hud-stat-label">OPERATION</span>
            <span class="hud-stat-value accent-cyan" id="${this.container.id}-hud-phase">VEHICLE INGESTION &amp; LIFT</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">LIFT MECHANISM</span>
            <span class="hud-stat-value" id="${this.container.id}-hud-lift" style="color: var(--color-success);">CRADLES ENGAGED (+80mm)</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">TARGET BAY</span>
            <span class="hud-stat-value" id="${this.container.id}-hud-bay">BAY A-03 [ALLOCATED]</span>
          </div>
          <div class="hud-stat-item">
            <span class="hud-stat-label">INTERACTION</span>
            <span class="hud-stat-value" style="color: var(--text-muted); font-size: 0.72rem;">Drag: Orbit | Scroll: Zoom</span>
          </div>
        </div>
      </div>
    `;

    this.canvasContainer = document.getElementById(`${this.container.id}-canvas-container`);
    this.hudPhase = document.getElementById(`${this.container.id}-hud-phase`);
    this.hudLift = document.getElementById(`${this.container.id}-hud-lift`);
    this.hudBay = document.getElementById(`${this.container.id}-hud-bay`);
    this.pauseBtn = document.getElementById(`${this.container.id}-btn-pause`);
    this.pauseText = document.getElementById(`${this.container.id}-pause-text`);
  }

  initThree() {
    const width = this.canvasContainer.clientWidth || 720;
    const height = this.canvasContainer.clientHeight || 480;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0f18, 0.012);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    this.camera.position.copy(this.cameraPresets.overview.pos);
    this.currentLookAt = this.cameraPresets.overview.lookAt.clone();
    this.camera.lookAt(this.currentLookAt);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.canvasContainer.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08; // prevent going below ground
    this.controls.minDistance = 6;
    this.controls.maxDistance = 55;
    this.controls.target.copy(this.currentLookAt);

    // 5. Lighting Setup
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x080c14, 0.7);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this.dirLight.position.set(16, 28, 18);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 80;
    const d = 22;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Architectural soft point lights for facility depth
    this.accentLight1 = new THREE.PointLight(0x00f0ff, 1.5, 20);
    this.accentLight1.position.set(0, 5, 0);
    this.scene.add(this.accentLight1);

    this.accentLight2 = new THREE.PointLight(0x00e5ff, 1.0, 15);
    this.accentLight2.position.set(-8, 4, -6); // Drop-off zone illumination
    this.scene.add(this.accentLight2);
  }

  buildFacility() {
    this.facilityGroup = new THREE.Group();
    this.scene.add(this.facilityGroup);

    // Material definitions (Industrial concrete & technical surfaces)
    this.matFloor = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.85,
      metalness: 0.08
    });

    this.matHighway = new THREE.MeshStandardMaterial({
      color: 0x0c1018,
      roughness: 0.65,
      metalness: 0.15
    });

    this.matBayLine = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
    this.matBayLineWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    this.matYellowBumper = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    this.matPillar = new THREE.MeshStandardMaterial({ color: 0x1a2333, roughness: 0.7 });

    // 1. Concrete Ground Slab
    const floorGeo = new THREE.BoxGeometry(36, 0.6, 26);
    this.floorMesh = new THREE.Mesh(floorGeo, this.matFloor);
    this.floorMesh.position.y = -0.3;
    this.floorMesh.receiveShadow = true;
    this.facilityGroup.add(this.floorMesh);

    // 2. Central AGV Highway Floor Strip
    const highwayGeo = new THREE.PlaneGeometry(5.2, 24);
    this.highwayMesh = new THREE.Mesh(highwayGeo, this.matHighway);
    this.highwayMesh.rotation.x = -Math.PI / 2;
    this.highwayMesh.position.set(0, 0.005, 0);
    this.highwayMesh.receiveShadow = true;
    this.facilityGroup.add(this.highwayMesh);

    // Highway Dashed Guidance Centerline
    for (let z = -10.5; z <= 10.5; z += 1.8) {
      const dashGeo = new THREE.PlaneGeometry(0.18, 0.9);
      const dash = new THREE.Mesh(dashGeo, this.matBayLine);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.008, z);
      this.facilityGroup.add(dash);
    }

    // 3. Structural Concrete Columns with Safety Hazard Bands
    const pillarPositions = [
      { x: -5.5, z: -6 },
      { x: -5.5, z: 6 },
      { x: 5.5, z: -6 },
      { x: 5.5, z: 6 }
    ];

    pillarPositions.forEach(pos => {
      const colGroup = new THREE.Group();
      colGroup.position.set(pos.x, 0, pos.z);

      // Main pillar shaft
      const colGeo = new THREE.BoxGeometry(1.0, 8, 1.0);
      const col = new THREE.Mesh(colGeo, this.matPillar);
      col.position.y = 4;
      col.castShadow = true;
      col.receiveShadow = true;
      colGroup.add(col);

      // Chamfered hazard base
      const baseGeo = new THREE.BoxGeometry(1.3, 0.6, 1.3);
      const base = new THREE.Mesh(baseGeo, this.matYellowBumper);
      base.position.y = 0.3;
      base.castShadow = true;
      colGroup.add(base);

      this.facilityGroup.add(colGroup);
    });

    // 4. Perimeter Low Concrete Boundary Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x161d2a, roughness: 0.9 });
    const rearWallGeo = new THREE.BoxGeometry(36, 1.2, 0.4);
    const rearWall = new THREE.Mesh(rearWallGeo, wallMat);
    rearWall.position.set(0, 0.6, -12.8);
    rearWall.castShadow = true;
    rearWall.receiveShadow = true;
    this.facilityGroup.add(rearWall);

    const frontWall = rearWall.clone();
    frontWall.position.z = 12.8;
    this.facilityGroup.add(frontWall);

    // 5. Dedicated Parking Bays
    this.bays = [];

    // Right Row (Row A): Bays A-01, A-02, A-03, A-04
    const rowAX = 8.5;
    const bayZCoords = [-7.5, -2.5, 2.5, 7.5];

    bayZCoords.forEach((z, index) => {
      const bayId = `A-0${index + 1}`;
      const isTargetBay = (bayId === 'A-03');
      this.createParkingBay(rowAX, z, bayId, isTargetBay);
    });

    // Left Row (Row B & Handover Zones)
    const rowBX = -8.5;
    // B-01 (Occupied)
    this.createParkingBay(rowBX, 7.5, 'B-01', false);
    // B-02 (Available)
    this.createParkingBay(rowBX, 2.5, 'B-02', false);

    // Drop-off Handover Zone (at rowBX, z: -6.5)
    this.createHandoverStation(rowBX, -6.0, 'CUSTOMER DROP-OFF BAY', true);
  }

  createParkingBay(x, z, label, isTarget) {
    const bayWidth = 4.8;
    const bayDepth = 2.6;

    const bayGroup = new THREE.Group();
    bayGroup.position.set(x, 0, z);

    // Painted Boundary Lines
    const lineMat = isTarget ? this.matBayLine : this.matBayLineWhite;
    const borderGeo = new THREE.PlaneGeometry(bayWidth, bayDepth);
    const borderEdges = new THREE.EdgesGeometry(borderGeo);
    const line = new THREE.LineSegments(borderEdges, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.009;
    bayGroup.add(line);

    // Physical Wheel Bumper Stop (rubberized curb)
    const bumperGeo = new THREE.BoxGeometry(0.18, 0.12, 1.8);
    const bumper = new THREE.Mesh(bumperGeo, this.matYellowBumper);
    bumper.position.set(x > 0 ? 2.0 : -2.0, 0.06, 0);
    bumper.castShadow = true;
    bayGroup.add(bumper);

    // Bay Status LED Light
    const ledMat = new THREE.MeshBasicMaterial({
      color: isTarget ? 0x00f0ff : (label === 'A-01' || label === 'A-02' || label === 'B-01' ? 0xef4444 : 0x10b981)
    });
    const ledGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12);
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(x > 0 ? -2.2 : 2.2, 0.04, 1.1);
    bayGroup.add(led);

    if (isTarget) {
      this.targetBayGroup = bayGroup;
      this.targetBayLed = led;
      this.targetBayLine = line;
    }

    this.facilityGroup.add(bayGroup);
  }

  createHandoverStation(x, z, title, isDropOff) {
    const stationGroup = new THREE.Group();
    stationGroup.position.set(x, 0, z);

    // Handover Platform Outline
    const platGeo = new THREE.BoxGeometry(5.2, 0.08, 3.2);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x0f1b2b, roughness: 0.5, metalness: 0.2 });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.y = 0.04;
    plat.receiveShadow = true;
    stationGroup.add(plat);

    // Scanner Optical Barrier Posts (Front & Back)
    const postMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.3, metalness: 0.8 });
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 16);

    const post1 = new THREE.Mesh(postGeo, postMat);
    post1.position.set(2.4, 1.1, -1.4);
    post1.castShadow = true;
    stationGroup.add(post1);

    const post2 = new THREE.Mesh(postGeo, postMat);
    post2.position.set(2.4, 1.1, 1.4);
    post2.castShadow = true;
    stationGroup.add(post2);

    // Laser optical sensor guide beam
    const beamGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.8, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.x = Math.PI / 2;
    beam.position.set(2.4, 1.2, 0);
    stationGroup.add(beam);

    this.facilityGroup.add(stationGroup);
  }

  buildCars() {
    this.carsGroup = new THREE.Group();
    this.scene.add(this.carsGroup);

    // Parked Car 1: Midnight Blue Metallic Sedan (Bay A-01)
    const car1 = this.createCarMesh({ bodyColor: 0x1e3a8a, style: 'sedan' });
    car1.position.set(8.5, 0.38, -7.5);
    car1.rotation.y = -Math.PI / 2;
    this.carsGroup.add(car1);

    // Parked Car 2: Ceramic White SUV (Bay A-02)
    const car2 = this.createCarMesh({ bodyColor: 0xd1d5db, style: 'suv' });
    car2.position.set(8.5, 0.44, -2.5);
    car2.rotation.y = -Math.PI / 2;
    this.carsGroup.add(car2);

    // Parked Car 3: Charcoal Crossover (Bay B-01)
    const car3 = this.createCarMesh({ bodyColor: 0x334155, style: 'sedan' });
    car3.position.set(-8.5, 0.38, 7.5);
    car3.rotation.y = Math.PI / 2;
    this.carsGroup.add(car3);

    // Active Car 4: Titanium Silver EV Sedan (Drop-off Zone, Transported by Robot!)
    this.transportCar = this.createCarMesh({ bodyColor: 0x94a3b8, style: 'sedan' });
    this.transportCar.position.set(-8.5, 0.38, -6.0);
    this.transportCar.rotation.y = Math.PI / 2;
    this.carsGroup.add(this.transportCar);
  }

  createCarMesh({ bodyColor, style }) {
    const car = new THREE.Group();

    const carLength = style === 'suv' ? 4.5 : 4.4;
    const carWidth = 1.9;
    const carHeight = style === 'suv' ? 1.45 : 1.25;

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.25,
      metalness: 0.65
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9
    });

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8, roughness: 0.2 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Lower Chassis
    const lowerGeo = new THREE.BoxGeometry(carLength, 0.55, carWidth);
    const lowerMesh = new THREE.Mesh(lowerGeo, bodyMat);
    lowerMesh.position.y = 0.27;
    lowerMesh.castShadow = true;
    lowerMesh.receiveShadow = true;
    car.add(lowerMesh);

    // Cabin Greenhouse
    const cabinLength = style === 'suv' ? 2.8 : 2.4;
    const cabinGeo = new THREE.BoxGeometry(cabinLength, carHeight * 0.55, carWidth * 0.88);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.position.set(-0.15, 0.68, 0);
    cabinMesh.castShadow = true;
    car.add(cabinMesh);

    // Roof Panel
    const roofGeo = new THREE.BoxGeometry(cabinLength * 0.95, 0.05, carWidth * 0.86);
    const roofMesh = new THREE.Mesh(roofGeo, bodyMat);
    roofMesh.position.set(-0.15, 0.68 + (carHeight * 0.55 / 2) + 0.025, 0);
    car.add(roofMesh);

    // 4 Wheels
    const wheelRadius = 0.34;
    const wheelWidth = 0.22;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    wheelGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelWidth + 0.01, 12);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelOffsets = [
      { x: -1.35, z: 0.9 },
      { x: -1.35, z: -0.9 },
      { x: 1.35, z: 0.9 },
      { x: 1.35, z: -0.9 }
    ];

    wheelOffsets.forEach(pos => {
      const wGroup = new THREE.Group();
      wGroup.position.set(pos.x, 0, pos.z);

      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.castShadow = true;
      wGroup.add(tire);

      const rim = new THREE.Mesh(rimGeo, rimMat);
      wGroup.add(rim);

      car.add(wGroup);
    });

    // Headlights (Front is +X)
    const headGeo = new THREE.BoxGeometry(0.08, 0.12, 0.35);
    const head1 = new THREE.Mesh(headGeo, lightMat);
    head1.position.set(carLength / 2, 0.35, 0.65);
    car.add(head1);

    const head2 = head1.clone();
    head2.position.z = -0.65;
    car.add(head2);

    // Taillights (Rear is -X)
    const tailGeo = new THREE.BoxGeometry(0.08, 0.12, 0.35);
    const tail1 = new THREE.Mesh(tailGeo, tailMat);
    tail1.position.set(-carLength / 2, 0.38, 0.65);
    car.add(tail1);

    const tail2 = tail1.clone();
    tail2.position.z = -0.65;
    car.add(tail2);

    return car;
  }

  buildRobot() {
    this.robotGroup = new THREE.Group();
    this.scene.add(this.robotGroup);

    // Materials
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0b1322,
      roughness: 0.3,
      metalness: 0.8
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.2,
      metalness: 0.5,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.25
    });

    const cradleMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.4,
      metalness: 0.6
    });

    // 1. Low-Profile Main Chassis (Height: 0.16m, Length: 4.1m, Width: 1.65m)
    const baseGeo = new THREE.BoxGeometry(4.1, 0.14, 1.65);
    const baseMesh = new THREE.Mesh(baseGeo, chassisMat);
    baseMesh.position.y = 0.12;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.robotGroup.add(baseMesh);

    // Cyan Safety Perimeter Glow Line
    const trimGeo = new THREE.BoxGeometry(4.15, 0.03, 1.7);
    const trimMesh = new THREE.Mesh(trimGeo, accentMat);
    trimMesh.position.y = 0.13;
    this.robotGroup.add(trimMesh);

    // 2. Front & Rear LiDAR Sensor Domes
    const lidarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
    const lidarMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.1, metalness: 0.9 });

    const frontLidar = new THREE.Mesh(lidarGeo, lidarMat);
    frontLidar.position.set(1.9, 0.22, 0);
    this.robotGroup.add(frontLidar);

    const rearLidar = new THREE.Mesh(lidarGeo, lidarMat);
    rearLidar.position.set(-1.9, 0.22, 0);
    this.robotGroup.add(rearLidar);

    // 3. Four Mechanical Wheel-Cradling / Lifting Arms
    this.cradleArms = [];
    const cradlePositions = [
      { x: 1.35, z: 0.85 },
      { x: 1.35, z: -0.85 },
      { x: -1.35, z: 0.85 },
      { x: -1.35, z: -0.85 }
    ];

    cradlePositions.forEach(pos => {
      const armGroup = new THREE.Group();
      armGroup.position.set(pos.x, 0.14, pos.z * 0.7); // slides outward to cradle tire

      // Telescopic clamp bar
      const barGeo = new THREE.BoxGeometry(0.4, 0.06, 0.45);
      const barMesh = new THREE.Mesh(barGeo, cradleMat);
      barMesh.castShadow = true;
      armGroup.add(barMesh);

      this.robotGroup.add(armGroup);
      this.cradleArms.push(armGroup);
    });

    // Start position: in dropoff zone right under car
    this.robotGroup.position.set(-8.5, 0, -6.0);
    this.robotGroup.rotation.y = Math.PI / 2;
  }

  setupEvents() {
    // Window Resize
    window.addEventListener('resize', () => this.onResize());

    // Camera preset buttons
    const btnOverview = document.getElementById(`${this.container.id}-btn-overview`);
    const btnTrack = document.getElementById(`${this.container.id}-btn-track`);
    const btnBay = document.getElementById(`${this.container.id}-btn-bay`);

    if (btnOverview) btnOverview.addEventListener('click', () => this.setCameraPreset('overview'));
    if (btnTrack) btnTrack.addEventListener('click', () => this.setCameraPreset('track'));
    if (btnBay) btnBay.addEventListener('click', () => this.setCameraPreset('bay'));

    // Pause / Resume Button
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        if (this.pauseText) {
          this.pauseText.textContent = this.isPaused ? 'PLAY' : 'PAUSE';
        }
      });
    }

    // Theme Change Listener
    window.addEventListener('sais-theme-change', (e) => {
      this.applyTheme(e.detail && e.detail.theme ? e.detail.theme : 'dark');
    });

    // Reveal Slide Changed: pause loop when off-screen
    if (typeof Reveal !== 'undefined') {
      Reveal.on('slidechanged', (event) => {
        const parentSection = this.container.closest('section');
        if (parentSection === event.currentSlide) {
          this.start();
        } else {
          this.stop();
        }
      });
    }
  }

  setCameraPreset(preset) {
    if (this.cameraPresets[preset]) {
      this.currentPreset = preset;
      this.targetCameraPos.copy(this.cameraPresets[preset].pos);
      this.targetCameraLookAt.copy(this.cameraPresets[preset].lookAt);
    }
  }

  applyTheme(theme) {
    const isDark = (theme !== 'light');
    if (isDark) {
      this.scene.background = new THREE.Color(0x07090e);
      this.scene.fog.color.setHex(0x07090e);
      this.matFloor.color.setHex(0x111622);
      this.matHighway.color.setHex(0x0a0e17);
      this.hemiLight.color.setHex(0xddeeff);
      this.hemiLight.groundColor.setHex(0x080c14);
      this.hemiLight.intensity = 0.7;
      this.dirLight.intensity = 1.4;
    } else {
      // Light Mode: Clean Engineering Blueprint Concrete
      this.scene.background = new THREE.Color(0xf1f5f9);
      this.scene.fog.color.setHex(0xf1f5f9);
      this.matFloor.color.setHex(0xe2e8f0);
      this.matHighway.color.setHex(0xcbd5e1);
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0x94a3b8);
      this.hemiLight.intensity = 0.9;
      this.dirLight.intensity = 1.6;
    }
  }

  onResize() {
    if (!this.canvasContainer || !this.renderer || !this.camera) return;
    const width = this.canvasContainer.clientWidth;
    const height = this.canvasContainer.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  start() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const animate = () => {
      this.update();
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  update() {
    this.controls.update();

    // 1. Smooth Camera Transition towards target presets
    if (this.currentPreset === 'track') {
      // Follow the moving robot in real-time
      this.targetCameraLookAt.copy(this.robotGroup.position);
      this.targetCameraPos.set(
        this.robotGroup.position.x + 10,
        this.robotGroup.position.y + 9,
        this.robotGroup.position.z + 12
      );
    }

    this.camera.position.lerp(this.targetCameraPos, this.cameraLerpSpeed);
    this.currentLookAt.lerp(this.targetCameraLookAt, this.cameraLerpSpeed);
    this.controls.target.copy(this.currentLookAt);

    if (this.isPaused) return;

    // 2. Realistic 7-Phase Engineering Autonomous Transport Cycle
    this.animationTime = (this.animationTime + 0.016) % this.cycleDuration;
    const t = this.animationTime / this.cycleDuration; // 0.0 to 1.0

    // Coordinates:
    // Dropoff Bay: x: -8.5, z: -6.0
    // Highway Entrance: x: 0, z: -6.0
    // Highway Target Junction: x: 0, z: 2.5
    // Target Bay A-03: x: 8.5, z: 2.5
    let rx = -8.5, rz = -6.0, ryRot = Math.PI / 2;
    let liftHeight = 0;
    let cradleDeploy = 0; // 0 to 1
    let isCarAttached = false;
    let bayStatusText = 'BAY A-03 [ALLOCATED]';
    let bayOccupied = false;

    if (t < 0.15) {
      // PHASE 1: Cradling Engagement & Alignment (0 to 3.3s)
      rx = -8.5;
      rz = -6.0;
      ryRot = Math.PI / 2;
      const subT = t / 0.15;
      cradleDeploy = Math.min(1, subT * 1.5);
      liftHeight = 0;
      isCarAttached = true;

      if (this.hudPhase) this.hudPhase.textContent = '1/6 ALIGNING & DEPLOYING CRADLE ARMS';
      if (this.hudLift) this.hudLift.textContent = `ARMS ENGAGING (${Math.round(cradleDeploy * 100)}%)`;
    } else if (t < 0.25) {
      // PHASE 2: Mechanical Lift (Delta-h +80mm) (3.3s to 5.5s)
      rx = -8.5;
      rz = -6.0;
      ryRot = Math.PI / 2;
      cradleDeploy = 1;
      const subT = (t - 0.15) / 0.1;
      liftHeight = subT * 0.08; // 80mm lift
      isCarAttached = true;

      if (this.hudPhase) this.hudPhase.textContent = '2/6 MECHANICAL LIFT (\u0394h +80mm)';
      if (this.hudLift) this.hudLift.textContent = `LIFTING TIRES: +${Math.round(liftHeight * 1000)}mm`;
    } else if (t < 0.45) {
      // PHASE 3: Transfer to Central Highway Corridor (5.5s to 9.9s)
      const subT = (t - 0.25) / 0.2;
      rx = -8.5 + subT * 8.5; // moving from -8.5 to 0
      rz = -6.0;
      ryRot = Math.PI / 2;
      liftHeight = 0.08;
      cradleDeploy = 1;
      isCarAttached = true;

      if (this.hudPhase) this.hudPhase.textContent = '3/6 TRANSIT \u2192 SEGREGATED AGV HIGHWAY';
      if (this.hudLift) this.hudLift.textContent = 'SECURED & LIFTED (+80mm)';
    } else if (t < 0.65) {
      // PHASE 4: Navigating Down Highway Corridor (9.9s to 14.3s)
      const subT = (t - 0.45) / 0.2;
      rx = 0;
      rz = -6.0 + subT * 8.5; // moving from -6.0 to +2.5
      ryRot = 0; // aligned along Z corridor
      liftHeight = 0.08;
      cradleDeploy = 1;
      isCarAttached = true;

      if (this.hudPhase) this.hudPhase.textContent = '4/6 HIGHWAY CORRIDOR NAVIGATION';
      if (this.hudLift) this.hudLift.textContent = 'LIDAR COLLISION AVOIDANCE ACTIVE';
    } else if (t < 0.85) {
      // PHASE 5: Turning & Docking into Bay A-03 (14.3s to 18.7s)
      const subT = (t - 0.65) / 0.2;
      rx = 0 + subT * 8.5; // moving from 0 to 8.5
      rz = 2.5;
      ryRot = -Math.PI / 2;
      liftHeight = 0.08;
      cradleDeploy = 1;
      isCarAttached = true;

      if (this.hudPhase) this.hudPhase.textContent = '5/6 DOCKING INTO BAY A-03';
      if (this.hudLift) this.hudLift.textContent = 'PRECISION BAY INGRESS';
    } else {
      // PHASE 6: Lowering Vehicle, Disengaging & Locking Slot (18.7s to 22.0s)
      const subT = (t - 0.85) / 0.15;
      rx = 8.5;
      rz = 2.5;
      ryRot = -Math.PI / 2;
      liftHeight = Math.max(0, (1 - subT) * 0.08);
      cradleDeploy = Math.max(0, 1 - subT);
      isCarAttached = true;
      bayOccupied = true;
      bayStatusText = 'BAY A-03 [OCCUPIED &bull; STORED]';

      if (this.hudPhase) this.hudPhase.textContent = '6/6 VEHICLE STORED &bull; BAY LOCKED';
      if (this.hudLift) this.hudLift.textContent = 'DISENGAGED &bull; AGV STANDBY';
    }

    // Apply Position & Rotation to Robot
    this.robotGroup.position.set(rx, 0, rz);
    this.robotGroup.rotation.y = ryRot;

    // Apply Cradling Arms deployment
    this.cradleArms.forEach((arm, i) => {
      const zSign = (i % 2 === 0) ? 1 : -1;
      arm.position.z = zSign * (0.65 + cradleDeploy * 0.28);
    });

    // Apply Vehicle Position & Lift
    if (isCarAttached && this.transportCar) {
      this.transportCar.position.set(rx, 0.38 + liftHeight, rz);
      this.transportCar.rotation.y = ryRot;
    }

    // Dynamic Bay Status Indication
    if (this.targetBayLed && this.targetBayLine) {
      if (bayOccupied) {
        this.targetBayLed.material.color.setHex(0xef4444); // red
        this.targetBayLine.material.color.setHex(0xef4444);
        if (this.hudBay) {
          this.hudBay.textContent = bayStatusText;
          this.hudBay.style.color = 'var(--color-danger)';
        }
      } else {
        this.targetBayLed.material.color.setHex(0x00f0ff); // cyan
        this.targetBayLine.material.color.setHex(0x00f0ff);
        if (this.hudBay) {
          this.hudBay.textContent = bayStatusText;
          this.hudBay.style.color = 'var(--accent-cyan)';
        }
      }
    }
  }
}

// Global initialization entry point
if (typeof window !== 'undefined') {
  window.initHeroFacilityWebGL = function(id, options) {
    return new HeroFacilityWebGL(id, options);
  };
  window.initHeroFacility3D = window.initHeroFacilityWebGL;

  // Auto-mounting logic for Presentation Slide 1 & 16
  function autoMountWebGLFacilities() {
    if (document.getElementById('hero-facility-slide1') && !window.heroWebGL1) {
      window.heroWebGL1 = new HeroFacilityWebGL('hero-facility-slide1', { isClosingScene: false });
    }
    if (document.getElementById('hero-facility-slide16') && !window.heroWebGL16) {
      window.heroWebGL16 = new HeroFacilityWebGL('hero-facility-slide16', { isClosingScene: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMountWebGLFacilities);
  } else {
    autoMountWebGLFacilities();
  }
}
