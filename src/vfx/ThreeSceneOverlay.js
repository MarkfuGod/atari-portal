import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FRAME_W = 800;
const FRAME_H = 600;

const THEMES = {
  default: {
    primary: 0x6ef2ff,
    secondary: 0xb845ff,
    accent: 0xffffff,
    showCenter: false,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    armLift: 0,
  },
  MenuScene: {
    primary: 0x72f6ff,
    secondary: 0xff4de1,
    accent: 0xffffff,
    showCenter: true,
    showPanels: false,
    showMonitors: true,
    showBeams: false,
    armLift: 24,
  },
  PacmanScene: {
    primary: 0x4f8dff,
    secondary: 0x72f6ff,
    accent: 0xffeb76,
    showCenter: false,
    showPanels: false,
    showMonitors: false,
    showBeams: false,
    armLift: -6,
  },
  BreakoutScene: {
    primary: 0x72f6ff,
    secondary: 0xff58d8,
    accent: 0xfff3a3,
    showCenter: false,
    showPanels: true,
    showMonitors: false,
    showBeams: false,
    armLift: 6,
  },
  SpaceInvadersScene: {
    primary: 0xff5a62,
    secondary: 0xffaa33,
    accent: 0xffffff,
    showCenter: false,
    showPanels: true,
    showMonitors: false,
    showBeams: false,
    armLift: 0,
  },
  FroggerScene: {
    primary: 0x72f6ff,
    secondary: 0x62ff8e,
    accent: 0xffffff,
    showCenter: false,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    armLift: 22,
  },
  AsteroidsScene: {
    primary: 0xb845ff,
    secondary: 0xff78ff,
    accent: 0xffffff,
    showCenter: false,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    armLift: 18,
  },
  TetrisScene: {
    primary: 0x72f6ff,
    secondary: 0x62ff8e,
    accent: 0xffffff,
    showCenter: false,
    showPanels: true,
    showMonitors: false,
    showBeams: true,
    armLift: 16,
  },
  GameOverScene: {
    primary: 0xff5a62,
    secondary: 0xb845ff,
    accent: 0xffffff,
    showCenter: true,
    showPanels: false,
    showMonitors: false,
    showBeams: false,
    armLift: -10,
  },
  VictoryScene: {
    primary: 0x72f6ff,
    secondary: 0x62ff8e,
    accent: 0xffffff,
    showCenter: true,
    showPanels: false,
    showMonitors: false,
    showBeams: true,
    armLift: 10,
  },
};

function hexToCss(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function makePanelTexture(primary, secondary, kind = 'panel') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const p = hexToCss(primary);
  const s = hexToCss(secondary);

  ctx.fillStyle = 'rgba(5, 10, 18, 0.78)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = `${p}cc`;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.strokeStyle = `${s}66`;
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  for (let y = 22; y < canvas.height - 18; y += 18) {
    ctx.strokeStyle = `${p}22`;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(canvas.width - 20, y);
    ctx.stroke();
  }

  for (let x = 24; x < canvas.width - 20; x += 24) {
    ctx.strokeStyle = `${s}18`;
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x, canvas.height - 18);
    ctx.stroke();
  }

  ctx.font = kind === 'monitor' ? '10px monospace' : '12px monospace';
  if (kind === 'monitor') {
    for (let i = 0; i < 10; i++) {
      const row = `${Math.random() > 0.5 ? '1' : '0'}${String(Math.floor(Math.random() * 999999999)).padStart(9, '0')}`;
      ctx.fillStyle = i % 2 === 0 ? `${p}aa` : `${s}88`;
      ctx.fillText(row, 20, 28 + i * 12);
    }
  } else {
    const labels = ['ENCRYPTED', 'DATA-LINK', 'ACCESS', 'SIGNAL', 'REROUTE', 'BITSTREAM'];
    ctx.fillStyle = `${p}cc`;
    ctx.fillText(labels[Math.floor(Math.random() * labels.length)], 26, 36);
    for (let i = 0; i < 5; i++) {
      const y = 54 + i * 18;
      ctx.strokeStyle = `${s}88`;
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(90 + i * 12, y);
      ctx.lineTo(120 + i * 12, y - 8);
      ctx.lineTo(210, y - 8);
      ctx.stroke();
      ctx.fillStyle = `${p}66`;
      ctx.fillRect(160, y - 12, 40 - i * 4, 6);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeBeamTexture(colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const color = hexToCss(colorHex);
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, `${color}00`);
  gradient.addColorStop(0.15, `${color}88`);
  gradient.addColorStop(0.5, `${color}22`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const center = ctx.createRadialGradient(canvas.width / 2, 120, 10, canvas.width / 2, 160, 120);
  center.addColorStop(0, `${color}aa`);
  center.addColorStop(0.6, `${color}22`);
  center.addColorStop(1, `${color}00`);
  ctx.fillStyle = center;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createScreen(width, height, x, y, rotY, kind, primary, secondary) {
  const group = new THREE.Group();
  group.position.set(x, y, 4);
  group.rotation.y = rotY;
  group.rotation.z = rotY * -0.14;

  const texture = makePanelTexture(primary, secondary, kind);
  const panelMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: kind === 'monitor' ? 0.7 : 0.82,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), panelMat);
  group.add(panel);

  const frameGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, height));
  const frameMat = new THREE.LineBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.35,
  });
  const frame = new THREE.LineSegments(frameGeo, frameMat);
  frame.position.z = 1;
  group.add(frame);

  group.userData = { panelMat, frameMat, kind, baseY: y, baseRotZ: group.rotation.z };
  return group;
}

function createBeam(x, y, rotation, color) {
  const texture = makeBeamTexture(color);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(220, 460), material);
  mesh.position.set(x, y, 2);
  mesh.rotation.z = rotation;
  mesh.userData = { material };
  return mesh;
}

function createCenterRig(primary, secondary) {
  const group = new THREE.Group();
  group.position.set(0, 0, 8);

  const torusMat = new THREE.MeshBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.6,
  });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(76, 3, 12, 64), torusMat);
  torus.position.y = 18;
  group.add(torus);

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(54, 2, 10, 48), new THREE.MeshBasicMaterial({
    color: secondary,
    transparent: true,
    opacity: 0.42,
  }));
  innerRing.position.y = 18;
  innerRing.rotation.x = 0.8;
  group.add(innerRing);

  const triPoints = [
    new THREE.Vector3(-22, -16, 0),
    new THREE.Vector3(0, 42, 0),
    new THREE.Vector3(22, -16, 0),
    new THREE.Vector3(-22, -16, 0),
  ];
  const triGeo = new THREE.BufferGeometry().setFromPoints(triPoints);
  const tri = new THREE.Line(triGeo, new THREE.LineBasicMaterial({
    color: primary,
    transparent: true,
    opacity: 0.9,
  }));
  tri.position.y = 18;
  group.add(tri);

  const barGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-12, 2, 0),
    new THREE.Vector3(12, 2, 0),
  ]);
  const bar = new THREE.Line(barGeo, new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  }));
  bar.position.y = 18;
  group.add(bar);

  group.userData = { torusMat, torus, innerRing };
  return group;
}

const ARM_SCALE = 380;

function applyNeonOverlay(model, primary, secondary) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    const orig = child.material;
    child.material = new THREE.MeshStandardMaterial({
      map: orig.map || null,
      normalMap: orig.normalMap || null,
      metalnessMap: orig.metalnessMap || null,
      roughnessMap: orig.roughnessMap || null,
      metalness: 0.85,
      roughness: 0.25,
      emissive: new THREE.Color(primary),
      emissiveIntensity: 0.45,
      envMapIntensity: 0.6,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
    });
    child.material.needsUpdate = true;
  });
}

function recolorArm(model, primary, secondary) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    if (child.material.emissive) {
      child.material.emissive.setHex(primary);
      child.material.emissiveIntensity = 0.45;
    }
  });
}

const ThreeSceneOverlay = {
  _ready: false,
  _sceneName: 'MenuScene',
  _armsLoaded: false,

  init(vw, vh, pr) {
    if (this._ready) return;
    this._ready = true;
    this._pr = pr;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(vw, vh);
    this.renderer.setPixelRatio(pr);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.domElement.id = 'three-overlay';
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const fov = 45;
    const aspect = vw / vh;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 1, 4000);
    this.camera.position.set(0, 0, 900);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0x93a8ff, 0.6));
    this.keyLight = new THREE.DirectionalLight(0x72f6ff, 1.8);
    this.keyLight.position.set(200, 300, 400);
    this.scene.add(this.keyLight);
    this.fillLight = new THREE.PointLight(0xff4de1, 1.0, 1200);
    this.fillLight.position.set(-200, -150, 300);
    this.scene.add(this.fillLight);
    this.rimLight = new THREE.PointLight(0xb845ff, 0.6, 800);
    this.rimLight.position.set(0, 200, -200);
    this.scene.add(this.rimLight);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.armLeft = new THREE.Group();
    this.armRight = new THREE.Group();
    this.armLeft.visible = false;
    this.armRight.visible = false;
    this.root.add(this.armLeft, this.armRight);

    this._loadArms();

    this.cornerMonitors = new THREE.Group();
    this.cornerMonitors.add(
      createScreen(112, 100, -FRAME_W / 2 - 84, 220, -0.16, 'monitor', THEMES.MenuScene.primary, THEMES.MenuScene.secondary),
      createScreen(112, 100, FRAME_W / 2 + 84, 220, 0.16, 'monitor', THEMES.MenuScene.primary, THEMES.MenuScene.secondary),
      createScreen(112, 100, -FRAME_W / 2 - 84, -218, -0.12, 'monitor', THEMES.MenuScene.primary, THEMES.MenuScene.secondary),
      createScreen(112, 100, FRAME_W / 2 + 84, -218, 0.12, 'monitor', THEMES.MenuScene.primary, THEMES.MenuScene.secondary),
    );
    this.root.add(this.cornerMonitors);

    this.sidePanels = new THREE.Group();
    this.sidePanels.add(
      createScreen(120, 148, -FRAME_W / 2 + 38, -158, -0.28, 'panel', THEMES.default.primary, THEMES.default.secondary),
      createScreen(120, 148, FRAME_W / 2 - 38, -158, 0.28, 'panel', THEMES.default.primary, THEMES.default.secondary),
    );
    this.root.add(this.sidePanels);

    this.leftBeam = createBeam(-250, 160, 0.58, THEMES.FroggerScene.primary);
    this.rightBeam = createBeam(250, 160, -0.58, THEMES.FroggerScene.primary);
    this.root.add(this.leftBeam, this.rightBeam);

    this.centerRig = createCenterRig(THEMES.MenuScene.primary, THEMES.MenuScene.secondary);
    this.root.add(this.centerRig);

    this._applyTheme(this._sceneName);
  },

  _loadArms() {
    const loader = new GLTFLoader();
    loader.load('assets/robotic_arm.glb', (gltf) => {
      const armModel = gltf.scene;
      armModel.scale.setScalar(ARM_SCALE);

      const box = new THREE.Box3().setFromObject(armModel);
      const center = box.getCenter(new THREE.Vector3());

      const leftClone = armModel.clone(true);
      leftClone.position.set(
        -(FRAME_W / 2 + 130) - center.x,
        60 - center.y,
        40
      );
      leftClone.rotation.set(0, 0, 0.65);
      applyNeonOverlay(leftClone, THEMES.MenuScene.primary, THEMES.MenuScene.secondary);
      this.armLeft.add(leftClone);

      const rightClone = armModel.clone(true);
      rightClone.scale.x *= -1;
      rightClone.position.set(
        (FRAME_W / 2 + 130) + center.x,
        60 - center.y,
        40
      );
      rightClone.rotation.set(0, 0, -0.65);
      applyNeonOverlay(rightClone, THEMES.MenuScene.primary, THEMES.MenuScene.secondary);
      this.armRight.add(rightClone);

      this.armLeft.visible = true;
      this.armRight.visible = true;
      this._armsLoaded = true;

      this._applyTheme(this._sceneName);
    });
  },

  setScene(sceneName) {
    if (!this._ready) return;
    this._sceneName = sceneName || 'MenuScene';
    this._applyTheme(this._sceneName);
  },

  _applyTheme(sceneName) {
    const theme = THEMES[sceneName] || THEMES.default;
    this._theme = theme;

    if (this._armsLoaded) {
      recolorArm(this.armLeft, theme.primary, theme.secondary);
      recolorArm(this.armRight, theme.primary, theme.secondary);
    }

    this.keyLight.color.setHex(theme.primary);
    this.fillLight.color.setHex(theme.secondary);
    this.rimLight.color.setHex(theme.secondary);

    const screens = [...this.cornerMonitors.children, ...this.sidePanels.children];
    screens.forEach((screen) => {
      const { panelMat, frameMat, kind } = screen.userData;
      if (panelMat.map) panelMat.map.dispose();
      panelMat.map = makePanelTexture(theme.primary, theme.secondary, kind);
      frameMat.color.setHex(theme.primary);
      panelMat.needsUpdate = true;
    });

    [this.leftBeam, this.rightBeam].forEach((beam) => {
      const { material } = beam.userData;
      if (material.map) material.map.dispose();
      material.map = makeBeamTexture(theme.primary);
      material.needsUpdate = true;
    });

    const { torusMat } = this.centerRig.userData;
    torusMat.color.setHex(theme.primary);
    this.centerRig.children[1].material.color.setHex(theme.secondary);
    this.centerRig.children[2].material.color.setHex(theme.primary);

    this.centerRig.visible = theme.showCenter;
    this.sidePanels.visible = theme.showPanels;
    this.cornerMonitors.visible = theme.showMonitors;
    this.leftBeam.visible = theme.showBeams;
    this.rightBeam.visible = theme.showBeams;
  },

  update(time, audioReactive) {
    if (!this._ready) return;

    const ar = audioReactive;
    const energy = ar && ar._connected ? ar.energy : 0.12;
    const beat = ar && ar._connected ? ar.beatIntensity : 0;
    const theme = this._theme || THEMES.default;

    if (this._armsLoaded) {
      const phase = time * 0.6;

      const leftModel = this.armLeft.children[0];
      const rightModel = this.armRight.children[0];

      if (leftModel) {
        leftModel.rotation.z = 0.65 + Math.sin(phase) * 0.12 + beat * 0.08;
        leftModel.position.y = (60 + theme.armLift) + Math.sin(phase * 0.7) * 12;
      }
      if (rightModel) {
        rightModel.rotation.z = -0.65 - Math.sin(phase + 1.2) * 0.12 - beat * 0.08;
        rightModel.position.y = (60 + theme.armLift) + Math.sin(phase * 0.7 + 1.5) * 12;
      }
    }

    this.cornerMonitors.children.forEach((screen, idx) => {
      screen.position.y = screen.userData.baseY + Math.sin(time * 0.9 + idx) * 8;
      screen.rotation.z = screen.userData.baseRotZ + Math.sin(time * 0.5 + idx) * 0.02;
      screen.children[0].material.opacity = 0.54 + energy * 0.24;
    });

    this.sidePanels.children.forEach((screen, idx) => {
      screen.position.y = -158 + Math.sin(time * 0.8 + idx * 2.0) * 8;
      screen.children[0].material.opacity = 0.58 + energy * 0.3;
    });

    [this.leftBeam, this.rightBeam].forEach((beam, idx) => {
      beam.material.opacity = 0.08 + energy * 0.18 + Math.sin(time * 1.4 + idx) * 0.03;
      beam.scale.y = 1 + energy * 0.2;
    });

    this.centerRig.rotation.z = time * 0.18;
    this.centerRig.userData.innerRing.rotation.z = -time * 0.32;
    this.centerRig.scale.setScalar(1 + beat * 0.1);

    this.renderer.render(this.scene, this.camera);
  },

  resize(vw, vh, pr) {
    if (!this._ready) return;
    this._pr = pr;
    this.renderer.setSize(vw, vh);
    this.camera.aspect = vw / vh;
    this.camera.updateProjectionMatrix();
  },
};

export default ThreeSceneOverlay;
