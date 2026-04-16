import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- SETUP ---
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1a2e');

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 3);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

// --- ILUMINAÇÃO ---
scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);
const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
dirLight2.position.set(-5, 5, -5);
scene.add(dirLight2);

// --- CANVAS 2D ---
const texCanvas = document.createElement('canvas');
texCanvas.width = 1024;
texCanvas.height = 1024;
const ctx = texCanvas.getContext('2d');

let shirtColor = '#ffffff';
let userImage = null;
let designSize = 400;
let designX = 0;
let designY = -50;

function updateTexture() {
  ctx.fillStyle = shirtColor;
  ctx.fillRect(0, 0, 1024, 1024);

  if (userImage) {
    const cx = 512 + designX - designSize / 2;
    const cy = 512 + designY - designSize / 2;
    ctx.drawImage(userImage, cx, cy, designSize, designSize);
  }

  shirtTexture.needsUpdate = true;
}

const shirtTexture = new THREE.CanvasTexture(texCanvas);
shirtTexture.colorSpace = THREE.SRGBColorSpace;
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 1024, 1024);

// --- MODELO ---
let shirtMeshes = [];
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

  model.traverse((child) => {
    if (child.isMesh) {
      shirtMeshes.push(child);
      child.material = new THREE.MeshStandardMaterial({
        map: shirtTexture,
        roughness: 0.8,
        metalness: 0.0,
      });
    }
  });
});

// --- CONTROLOS ---
document.getElementById('upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => { userImage = img; updateTexture(); };
  img.src = URL.createObjectURL(file);
});

document.getElementById('colorPicker').addEventListener('input', (e) => {
  shirtColor = e.target.value;
  updateTexture();
});

document.getElementById('designSize').addEventListener('input', (e) => {
  designSize = parseInt(e.target.value);
  document.getElementById('sizeVal').textContent = designSize;
  updateTexture();
});

document.getElementById('designX').addEventListener('input', (e) => {
  designX = parseInt(e.target.value);
  document.getElementById('xVal').textContent = designX;
  updateTexture();
});

document.getElementById('designY').addEventListener('input', (e) => {
  designY = parseInt(e.target.value);
  document.getElementById('yVal').textContent = designY;
  updateTexture();
});

// --- EXPORT ---
document.getElementById('exportBtn').addEventListener('click', () => {
  renderer.render(scene, camera);
  const link = document.createElement('a');
  link.download = 'mockup.png';
  link.href = renderer.domElement.toDataURL('image/png');
  link.click();
});

// --- RESIZE ---
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, window.innerHeight);
});

// --- LOOP ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();