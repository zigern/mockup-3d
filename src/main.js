import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#191611');

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 3);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

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

let shirtColor = '#ffffff';
let userImage = null;
let designSize = 400;
let designX = 0;
let designY = -50;

const shirtTexture = new THREE.CanvasTexture(texCanvas);
shirtTexture.colorSpace = THREE.SRGBColorSpace;

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

updateTexture();

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
      child.material = new THREE.MeshStandardMaterial({
        map: shirtTexture,
        roughness: 0.8,
        metalness: 0.0,
      });
    }
  });
});

document.getElementById('upload').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    userImage = img;
    updateTexture();
  };
  img.src = URL.createObjectURL(file);
});

document.getElementById('colorPicker').addEventListener('input', (event) => {
  shirtColor = event.target.value;
  updateTexture();
});

document.getElementById('designSize').addEventListener('input', (event) => {
  designSize = parseInt(event.target.value, 10);
  document.getElementById('sizeVal').textContent = designSize;
  updateTexture();
});

document.getElementById('designX').addEventListener('input', (event) => {
  designX = parseInt(event.target.value, 10);
  document.getElementById('xVal').textContent = designX;
  updateTexture();
});

document.getElementById('designY').addEventListener('input', (event) => {
  designY = parseInt(event.target.value, 10);
  document.getElementById('yVal').textContent = designY;
  updateTexture();
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
  controls.update();
  renderer.render(scene, camera);
}

animate();
