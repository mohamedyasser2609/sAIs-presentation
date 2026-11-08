/**
 * sAIs Presentation - 3D Digital Twin Viewer for HL Robotics PARKIE (Slide 13)
 * Loads and renders the Parkie.glb model with Three.js, OrbitControls,
 * dynamic industrial studio lighting, camera presets, and Reveal.js lifecycle management.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ParkieModelViewer {
  constructor(containerId = 'parkie-3d-viewport') {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    if (this.container._parkieViewerInstance) {
      return this.container._parkieViewerInstance;
    }
    this.container._parkieViewerInstance = this;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.parkieGroup = null;
    this.rafId = null;
    this.isSlideActive = false;
    this.autoRotate = true;

    // Camera target positions
    this.cameraPresets = {
      default: {
        pos: new THREE.Vector3(3.6, 2.2, 3.8),
        target: new THREE.Vector3(0, 0.15, 0)
      },
      top: {
        pos: new THREE.Vector3(0.01, 5.2, 0.01),
        target: new THREE.Vector3(0, 0.1, 0)
      },
      profile: {
        pos: new THREE.Vector3(0.01, 0.8, 4.4),
        target: new THREE.Vector3(0, 0.15, 0)
      },
      mechanism: {
        pos: new THREE.Vector3(2.4, 1.2, 1.6),
        target: new THREE.Vector3(0.6, 0.1, 0.3)
      }
    };

    this.targetCameraPos = this.cameraPresets.default.pos.clone();
    this.targetCameraLookAt = this.cameraPresets.default.target.clone();
    this.isTransitioningCamera = false;

    this.init();
  }

  init() {
    this.initScene();
    this.initRenderer();
    this.initCamera();
    this.initControls();
    this.initLighting();
    this.initEnvironment();
    this.initUI();
    this.loadModel();
    this.bindEvents();

    // Check if slide is active initially
    const parentSlide = this.container.closest('section');
    if (parentSlide && parentSlide.classList.contains('present')) {
      this.isSlideActive = true;
      this.start();
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    // Default transparent / dark background
    this.scene.background = null;
  }

  initRenderer() {
    const width = this.container.clientWidth || 640;
    const height = this.container.clientHeight || 480;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(width, height);
    const pixelRatio = window.sAIsPerfManager
      ? window.sAIsPerfManager.getProfile().pixelRatio
      : Math.min(window.devicePixelRatio || 1, 1.75);

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.borderRadius = '10px';

    this.container.appendChild(this.renderer.domElement);
  }

  initCamera() {
    const width = this.container.clientWidth || 640;
    const height = this.container.clientHeight || 480;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    this.camera.position.copy(this.cameraPresets.default.pos);
    this.camera.lookAt(this.cameraPresets.default.target);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(this.cameraPresets.default.target);

    // Limit pitch angle so camera stays above floor
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 8.5;

    // Auto rotate
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 1.2;

    this.controls.addEventListener('start', () => {
      this.isTransitioningCamera = false;
    });
  }

  initLighting() {
    // Hemispheric ambient light (cooler sky, darker ground)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.7);
    this.scene.add(hemiLight);

    // Main Key Directional Light (Industrial white flood)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    const d = 3.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);
    this.keyLight = keyLight;

    // Fill Light (Subtle cyan reflection on metallic surfaces)
    const fillLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
    fillLight.position.set(-5, 4, -4);
    this.scene.add(fillLight);

    // Front soft light
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
    frontLight.position.set(0, 3, 6);
    this.scene.add(frontLight);

    // Subtle ground chassis neon accent (cyber-industrial telemetry glow)
    const chassisGlow = new THREE.PointLight(0x00f0ff, 1.5, 3.5);
    chassisGlow.position.set(0, 0.08, 0);
    this.scene.add(chassisGlow);
    this.chassisGlow = chassisGlow;
  }

  initEnvironment() {
    // Tech Blueprint circular ground grid
    const gridHelper = new THREE.PolarGridHelper(3.2, 16, 8, 32, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = 0.002;
    this.scene.add(gridHelper);
    this.gridHelper = gridHelper;

    // Soft Shadow receiver plane
    const shadowGeo = new THREE.PlaneGeometry(8, 8);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.35
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
    this.shadowPlane = shadowPlane;
  }

  initUI() {
    // Loading indicator overlay inside container
    this.loaderOverlay = document.createElement('div');
    this.loaderOverlay.id = 'parkie-loading-overlay';
    this.loaderOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(7, 11, 20, 0.75);
      backdrop-filter: blur(4px);
      border-radius: 10px;
      z-index: 10;
      font-family: var(--font-mono, monospace);
      color: var(--accent-cyan, #00f0ff);
      transition: opacity 0.4s ease;
    `;
    this.loaderOverlay.innerHTML = `
      <div style="width: 38px; height: 38px; border: 3px solid rgba(0, 240, 255, 0.2); border-top-color: var(--accent-cyan, #00f0ff); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <div style="margin-top: 12px; font-size: 0.82rem; font-weight: bold; letter-spacing: 0.06em;">INITIALIZING PARKIE 3D TWIN...</div>
    `;

    // Ensure container has position relative
    this.container.style.position = 'relative';
    this.container.appendChild(this.loaderOverlay);
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      './Parkie.glb',
      (gltf) => {
        this.parkieGroup = gltf.scene;

        // Calculate bounding box and center precisely
        const box = new THREE.Box3().setFromObject(this.parkieGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Shift so center is at (0, Y_base, 0)
        this.parkieGroup.position.x = -center.x;
        this.parkieGroup.position.z = -center.z;
        this.parkieGroup.position.y = -box.min.y; // Sit flat on ground at Y = 0

        // Traverse meshes to enable shadows & polish materials
        this.parkieGroup.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // If plinth base is present, give it a sleek metallic dark finish
            if (child.name === 'Display plinth') {
              if (child.material) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x0a101d,
                  metalness: 0.8,
                  roughness: 0.35
                });
              }
            }

            // Enhance pearl white shell gloss
            if (child.material && child.material.name === 'PARKIE pearl white shell') {
              child.material.metalness = 0.35;
              child.material.roughness = 0.18;
            }
          }
        });

        this.scene.add(this.parkieGroup);

        // Hide loading indicator smoothly
        if (this.loaderOverlay) {
          this.loaderOverlay.style.opacity = '0';
          setTimeout(() => {
            if (this.loaderOverlay && this.loaderOverlay.parentNode) {
              this.loaderOverlay.parentNode.removeChild(this.loaderOverlay);
              this.loaderOverlay = null;
            }
          }, 400);
        }

        // Render initial frame
        this.render();
      },
      (xhr) => {
        // Progress tracking if needed
      },
      (error) => {
        console.error('[Parkie 3D] Failed to load Parkie.glb:', error);
        if (this.loaderOverlay) {
          this.loaderOverlay.innerHTML = `
            <div style="color: #ef4444; font-size: 0.85rem; font-weight: bold;">
              FAILED TO LOAD PARKIE 3D MODEL
            </div>
            <div style="color: var(--text-muted, #94a3b8); font-size: 0.72rem; margin-top: 4px;">
              ${error.message || 'Check Parkie.glb file availability.'}
            </div>
          `;
        }
      }
    );
  }

  setCameraPreset(presetKey) {
    if (!this.cameraPresets[presetKey]) return;
    const preset = this.cameraPresets[presetKey];

    this.targetCameraPos.copy(preset.pos);
    this.targetCameraLookAt.copy(preset.target);
    this.isTransitioningCamera = true;
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    if (this.controls) {
      this.controls.autoRotate = this.autoRotate;
    }
    return this.autoRotate;
  }

  bindEvents() {
    // Reveal.js Slide Lifecycle: Render only when Parkie 3D slide is visible
    if (typeof Reveal !== 'undefined') {
      Reveal.on('slidechanged', (event) => {
        const isCurrentSlide = event.currentSlide && event.currentSlide.contains(this.container);
        if (isCurrentSlide) {
          this.isSlideActive = true;
          this.onResize();
          this.start();
        } else {
          this.isSlideActive = false;
          this.stop();
        }
      });
    }

    // Theme change listener
    window.addEventListener('sais-theme-change', (e) => {
      const theme = e.detail && e.detail.theme;
      this.updateTheme(theme);
    });

    // Window resize handler
    window.addEventListener('resize', () => {
      this.onResize();
    });

    // Bind interactive viewpoint buttons
    const btnDefault = document.getElementById('parkie-cam-default');
    const btnTop = document.getElementById('parkie-cam-top');
    const btnProfile = document.getElementById('parkie-cam-profile');
    const btnMech = document.getElementById('parkie-cam-mech');
    const btnRotate = document.getElementById('parkie-toggle-rotate');

    const updateActiveButton = (activeBtn) => {
      [btnDefault, btnTop, btnProfile, btnMech].forEach((b) => {
        if (b) b.classList.remove('active');
      });
      if (activeBtn) activeBtn.classList.add('active');
    };

    if (btnDefault) {
      btnDefault.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setCameraPreset('default');
        updateActiveButton(btnDefault);
      });
    }
    if (btnTop) {
      btnTop.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setCameraPreset('top');
        updateActiveButton(btnTop);
      });
    }
    if (btnProfile) {
      btnProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setCameraPreset('profile');
        updateActiveButton(btnProfile);
      });
    }
    if (btnMech) {
      btnMech.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setCameraPreset('mechanism');
        updateActiveButton(btnMech);
      });
    }
    if (btnRotate) {
      btnRotate.addEventListener('click', (e) => {
        e.stopPropagation();
        const active = this.toggleAutoRotate();
        btnRotate.classList.toggle('active', active);
        btnRotate.textContent = active ? 'ROTATION: ON' : 'ROTATION: OFF';
      });
    }
  }

  updateTheme(theme) {
    const isDark = theme !== 'light';
    if (this.gridHelper) {
      this.gridHelper.visible = true;
    }
    if (this.shadowPlane) {
      this.shadowPlane.material.opacity = isDark ? 0.4 : 0.2;
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  start() {
    if (this.rafId) return;
    const animate = () => {
      if (!this.isSlideActive) {
        this.rafId = null;
        return;
      }

      this.rafId = requestAnimationFrame(animate);

      // Smooth camera interpolation
      if (this.isTransitioningCamera) {
        this.camera.position.lerp(this.targetCameraPos, 0.06);
        this.controls.target.lerp(this.targetCameraLookAt, 0.06);

        if (this.camera.position.distanceTo(this.targetCameraPos) < 0.05) {
          this.isTransitioningCamera = false;
        }
      }

      if (this.controls) {
        this.controls.update();
      }

      this.render();
    };

    this.rafId = requestAnimationFrame(animate);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Global initialization function
export function initParkie3D(containerId = 'parkie-3d-viewport') {
  return new ParkieModelViewer(containerId);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initParkie3D());
} else {
  initParkie3D();
}

