import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('canvas-container');
const advancedPanel = document.getElementById('advancedPanel');
const advancedToggle = document.getElementById('advancedToggle');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const viewerShell = document.querySelector('.viewer-shell');
const accordionGroups = document.querySelectorAll('.control-group');
const colorPicker = document.getElementById('colorPicker');
const garmentSwatches = document.getElementById('garmentSwatches');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  alpha: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 3);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.autoRotate = false;
controls.autoRotateSpeed = 1;
controls.enableRotate = true;
controls.enablePan = false;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI - 0.05;

scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);
const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
dirLight2.position.set(-5, 5, -5);
scene.add(dirLight2);

const texCanvas = document.createElement('canvas');
texCanvas.width = 1024;
texCanvas.height = 1024;
const ctx = texCanvas.getContext('2d');

const state = {
  shirtColor: '#ffffff',
  userImage: null,
  designSize: 400,
  designX: 0,
  designY: -50,
  designRotate: 0,
  designOpacity: 1,
  acidWash: 0,
  puffPrint: 0,
  garmentAnim: 'static',
  cameraAnim: 'off',
  baseModelY: 0,
};

const shirtTexture = new THREE.CanvasTexture(texCanvas);
shirtTexture.colorSpace = THREE.SRGBColorSpace;

const garmentMaterials = [];
let modelRoot = null;
const clock = new THREE.Clock();

function setActiveButton(groupSelector, activeSelector) {
  document.querySelectorAll(groupSelector).forEach((button) => {
    button.classList.toggle('active', button.matches(activeSelector));
  });
}

function setGarmentColor(hex) {
  const normalized = hex.toLowerCase();
  state.shirtColor = normalized;
  colorPicker.value = normalized;

  if (garmentSwatches) {
    garmentSwatches.querySelectorAll('.swatch').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.color.toLowerCase() === normalized);
    });
  }

  updateTexture();
}

function applyBackgroundPreset(preset) {
  switch (preset) {
    case 'soft':
      container.style.background = 'linear-gradient(135deg, #d8d8d8 0%, #f4f4f4 55%, #dedede 100%)';
      break;
    case 'warm':
      container.style.background = 'radial-gradient(circle at 20% 20%, #3b2d26 0%, #201917 42%, #120f0f 100%)';
      break;
    case 'clean':
      container.style.background = '#f7f7f7';
      break;
    case 'dark':
    default:
      container.style.background = 'radial-gradient(circle at 18% 34%, #2e2f36 0%, #212227 45%, #151316 100%)';
      break;
  }
}

function updateMaterialFeel() {
  const puff = state.puffPrint / 100;

  garmentMaterials.forEach((material) => {
    material.roughness = 0.82 - puff * 0.25;
    material.metalness = 0.0;
    material.clearcoat = puff * 0.5;
    material.clearcoatRoughness = 0.8 - puff * 0.5;
    material.needsUpdate = true;
  });
}

function drawAcidWashOverlay() {
  const intensity = state.acidWash / 100;
  if (intensity <= 0) return;

  const dotCount = Math.floor(9000 * intensity);
  ctx.fillStyle = `rgba(255,255,255,${0.06 * intensity})`;
  for (let i = 0; i < dotCount; i += 1) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const size = Math.random() * (2 + intensity * 4);
    ctx.fillRect(x, y, size, size);
  }
}

function drawUserDesign() {
  if (!state.userImage) return;

  const centerX = 512 + state.designX;
  const centerY = 512 + state.designY;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((state.designRotate * Math.PI) / 180);

  if (state.puffPrint > 0) {
    const puffAlpha = state.puffPrint / 100;
    ctx.shadowColor = `rgba(255,255,255,${0.55 * puffAlpha})`;
    ctx.shadowBlur = 8 + 20 * puffAlpha;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.globalAlpha = state.designOpacity;
  ctx.drawImage(
    state.userImage,
    -state.designSize / 2,
    -state.designSize / 2,
    state.designSize,
    state.designSize,
  );
  ctx.restore();
}

function updateTexture() {
  ctx.clearRect(0, 0, 1024, 1024);
  ctx.fillStyle = state.shirtColor;
  ctx.fillRect(0, 0, 1024, 1024);

  drawAcidWashOverlay();
  drawUserDesign();

  shirtTexture.needsUpdate = true;
  updateMaterialFeel();
}

updateTexture();
applyBackgroundPreset('dark');

const loader = new GLTFLoader();
loader.load('/scene.gltf', (gltf) => {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  model.scale.setScalar(2 / maxDim);
  model.position.sub(center.multiplyScalar(2 / maxDim));
  scene.add(model);
  modelRoot = model;
  state.baseModelY = model.position.y;

  model.traverse((child) => {
    if (child.isMesh) {
      const material = new THREE.MeshPhysicalMaterial({
        map: shirtTexture,
        roughness: 0.82,
        metalness: 0,
        clearcoat: 0,
      });
      child.material = material;
      garmentMaterials.push(material);
    }
  });
});

function bindSlider(id, valueId, handler) {
  const input = document.getElementById(id);
  const valueNode = document.getElementById(valueId);
  input.addEventListener('input', (event) => {
    const value = parseInt(event.target.value, 10);
    valueNode.textContent = value;
    handler(value);
    updateTexture();
  });
}

document.getElementById('upload').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    state.userImage = img;
    updateTexture();
  };
  img.src = URL.createObjectURL(file);
});

colorPicker.addEventListener('input', (event) => {
  setGarmentColor(event.target.value);
});

if (garmentSwatches) {
  garmentSwatches.querySelectorAll('.swatch').forEach((button) => {
    button.addEventListener('click', () => {
      setGarmentColor(button.dataset.color);
    });
  });
}

bindSlider('designSize', 'sizeVal', (value) => {
  state.designSize = value;
});

bindSlider('designX', 'xVal', (value) => {
  state.designX = value;
});

bindSlider('designY', 'yVal', (value) => {
  state.designY = value;
});

bindSlider('designRotate', 'rotateVal', (value) => {
  state.designRotate = value;
});

bindSlider('designOpacity', 'opacityVal', (value) => {
  state.designOpacity = value / 100;
});

bindSlider('acidWash', 'acidVal', (value) => {
  state.acidWash = value;
});

bindSlider('puffPrint', 'puffVal', (value) => {
  state.puffPrint = value;
});

const bgImageUpload = document.getElementById('bgImageUpload');
const bgReset = document.getElementById('bgReset');
const bgPresetGroup = document.getElementById('bgPresetGroup');
const bgGrayStrip = document.getElementById('bgGrayStrip');
let currentBackgroundObjectUrl = null;

function clearBackgroundObjectUrl() {
  if (!currentBackgroundObjectUrl) return;
  URL.revokeObjectURL(currentBackgroundObjectUrl);
  currentBackgroundObjectUrl = null;
}

function setActiveBackgroundThumb(activeSelector) {
  if (!bgPresetGroup) return;
  if (!activeSelector) {
    bgPresetGroup.querySelectorAll('.bg-thumb').forEach((button) => {
      button.classList.remove('is-active');
    });
    return;
  }
  bgPresetGroup.querySelectorAll('.bg-thumb').forEach((button) => {
    button.classList.toggle('is-active', button.matches(activeSelector));
  });
}

function setActiveGrayChip(activeSelector) {
  if (!bgGrayStrip) return;
  if (!activeSelector) {
    bgGrayStrip.querySelectorAll('.gray-chip').forEach((button) => {
      button.classList.remove('is-active');
    });
    return;
  }
  bgGrayStrip.querySelectorAll('.gray-chip').forEach((button) => {
    button.classList.toggle('is-active', button.matches(activeSelector));
  });
}

bgImageUpload.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;

  clearBackgroundObjectUrl();
  const imageUrl = URL.createObjectURL(file);
  currentBackgroundObjectUrl = imageUrl;
  container.style.background = `center / cover no-repeat url("${imageUrl}")`;
  setActiveBackgroundThumb('');
  setActiveGrayChip('');
});

bgReset.addEventListener('click', () => {
  clearBackgroundObjectUrl();
  applyBackgroundPreset('dark');
  setActiveBackgroundThumb('[data-bg-preset="dark"]');
  setActiveGrayChip('');
});

if (bgPresetGroup) {
  bgPresetGroup.querySelectorAll('.bg-thumb').forEach((button) => {
    button.addEventListener('click', () => {
      clearBackgroundObjectUrl();
      const preset = button.dataset.bgPreset;
      const image = button.dataset.bgImage;

      if (preset) {
        applyBackgroundPreset(preset);
      } else if (image) {
        container.style.background = `center / cover no-repeat url("${image}")`;
      }

      setActiveGrayChip('');
      setActiveBackgroundThumb(
        button.dataset.bgPreset
          ? `[data-bg-preset="${button.dataset.bgPreset}"]`
          : `[data-bg-image="${button.dataset.bgImage}"]`,
      );
    });
  });
}

if (bgGrayStrip) {
  bgGrayStrip.querySelectorAll('.gray-chip').forEach((button) => {
    button.addEventListener('click', () => {
      clearBackgroundObjectUrl();
      container.style.background = button.dataset.bgColor;
      setActiveBackgroundThumb('');
      setActiveGrayChip(`[data-bg-color="${button.dataset.bgColor}"]`);
    });
  });
}

document.querySelectorAll('[data-garment-anim]').forEach((button) => {
  button.addEventListener('click', () => {
    state.garmentAnim = button.dataset.garmentAnim;
    setActiveButton('#garmentAnimGroup .pill', `[data-garment-anim="${state.garmentAnim}"]`);
  });
});

document.querySelectorAll('[data-camera-anim]').forEach((button) => {
  button.addEventListener('click', () => {
    state.cameraAnim = button.dataset.cameraAnim;
    setActiveButton('#cameraAnimGroup .icon-btn', `[data-camera-anim="${state.cameraAnim}"]`);

    if (state.cameraAnim === 'off') {
      controls.autoRotate = false;
      camera.position.set(0, 0, 3);
    }
  });
});

advancedToggle.addEventListener('click', () => {
  advancedPanel.classList.toggle('is-collapsed');
});

accordionGroups.forEach((group) => {
  group.addEventListener('toggle', () => {
    if (!group.open) return;
    accordionGroups.forEach((other) => {
      if (other !== group) other.open = false;
    });
  });
});

fullscreenBtn.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) {
      await viewerShell.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    // no-op
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  renderer.render(scene, camera);
  const link = document.createElement('a');
  link.download = 'mockup.png';
  link.href = renderer.domElement.toDataURL('image/png');
  link.click();
});

function applyGarmentAnimation(elapsed) {
  if (!modelRoot) return;

  switch (state.garmentAnim) {
    case 'walk': {
      modelRoot.rotation.y = Math.sin(elapsed * 1.6) * 0.45;
      modelRoot.position.y = state.baseModelY + Math.sin(elapsed * 3.2) * 0.03;
      break;
    }
    case 'waves': {
      modelRoot.rotation.y = Math.sin(elapsed * 1.2) * 0.22;
      modelRoot.rotation.x = Math.sin(elapsed * 0.8) * 0.06;
      modelRoot.position.y = state.baseModelY + Math.sin(elapsed * 1.5) * 0.02;
      break;
    }
    case 'knit': {
      modelRoot.rotation.y += 0.006;
      modelRoot.rotation.x = Math.sin(elapsed * 2) * 0.03;
      break;
    }
    case 'static':
    default: {
      modelRoot.position.y += (state.baseModelY - modelRoot.position.y) * 0.08;
      break;
    }
  }
}

function applyCameraAnimation(elapsed) {
  if (state.cameraAnim === 'orbit') {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.3;
  } else if (state.cameraAnim === 'focus') {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    camera.position.z = 3 + Math.sin(elapsed * 1.5) * 0.2;
  } else {
    controls.autoRotate = false;
  }
}

function resizeRenderer() {
  const width = Math.max(container.clientWidth, 320);
  const height = Math.max(container.clientHeight, 420);

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);
resizeRenderer();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  applyGarmentAnimation(elapsed);
  applyCameraAnimation(elapsed);

  controls.update();
  renderer.render(scene, camera);
}

animate();
