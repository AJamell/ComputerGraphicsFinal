import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'

const SHOW_AXES_HELPER = true;
const SHOW_PLATFORMS = true;
const PLATFORM_SIZE = { radius: 10, height: 1 };

function debugScene() {
    const { scene, camera, renderer } = basicSetup();

    setupLights(scene);

    if (SHOW_AXES_HELPER) {
        const axesHelper = new THREE.AxesHelper(10);
        scene.add(axesHelper);
    }

    if (SHOW_PLATFORMS) {
        const platform = createPlatform(PLATFORM_SIZE.radius, PLATFORM_SIZE.height, 0xCCCDC6);
        scene.add(platform);
    }

    camera.position.z = 5;
    camera.position.y = 5;
    const controls = new OrbitControls(camera, renderer.domElement);

    console.log('Debug scene initialized.');

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
        controls.update();
    }

    animate();
}

function createPlatform(radius, height, color) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.y = -height;
    return cylinder;
}

function basicSetup() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    return { scene, camera, renderer };
}

function setupLights(scene) {
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
}

export { debugScene };