import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('canvas-container');
const advancedPanel = document.getElementById('advancedPanel');
const advancedToggle = document.getElementById('advancedToggle');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const viewerShell = document.querySelector('.viewer-shell');

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
  garmentSpinSpeed: 0,
};

const shirtTexture = new THREE.CanvasTexture(texCanvas);
shirtTexture.colorSpace = THREE.SRGBColorSpace;

let modelRoot = null;

const spinSpeedMap = {
  off: 0,
  slow: 0.003,
  medium: 0.008,
  fast: 0.015,
};

const cameraSpeedMap = {
  off: 0,
  slow: 0.5,
  medium: 1.2,
  fast: 2.2,
};

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

function updateTexture() {
  ctx.clearRect(0, 0, 1024, 1024);
  ctx.fillStyle = state.shirtColor;
  ctx.fillRect(0, 0, 1024, 1024);

  if (state.userImage) {
    const centerX = 512 + state.designX;
    const centerY = 512 + state.designY;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((state.designRotate * Math.PI) / 180);
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

  shirtTexture.needsUpdate = true;
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

  model.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        map: shirtTexture,
        roughness: 0.8,
        metalness: 0.0,
      });
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

document.getElementById('colorPicker').addEventListener('input', (event) => {
  state.shirtColor = event.target.value;
  updateTexture();
});

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

document.getElementById('bgPreset').addEventListener('change', (event) => {
  applyBackgroundPreset(event.target.value);
});

document.getElementById('garmentSpin').addEventListener('change', (event) => {
  state.garmentSpinSpeed = spinSpeedMap[event.target.value] ?? 0;
});

document.getElementById('cameraAuto').addEventListener('change', (event) => {
  const speed = cameraSpeedMap[event.target.value] ?? 0;
  controls.autoRotate = speed > 0;
  controls.autoRotateSpeed = speed;
});

advancedToggle.addEventListener('click', () => {
  advancedPanel.classList.toggle('is-collapsed');
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

  if (modelRoot && state.garmentSpinSpeed > 0) {
    modelRoot.rotation.y += state.garmentSpinSpeed;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
