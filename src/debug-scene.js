import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ballModel from "./models/bouncing_ball.glb";
import { levelThreeBackground, levelTwoBackground, levelOneBackground } from './background/background.js';

const SHOW_AXES_HELPER = true;
const SHOW_PLATFORMS = true;
const PLATFORM_SIZE = { radius: 10, height: 1 };
const background = {levelOneBackground, levelTwoBackground, levelThreeBackground};
let clock = new THREE.Clock();
let GLOBAL_SCENE;
let MIXER;

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
        const delta = clock.getDelta();
        if (MIXER) MIXER.update(delta);
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

function getBall(scene) {
    const glbLoader = new GLTFLoader();
    glbLoader.load(ballModel, (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.material.color.set(0xff0000);
                child.material.metalness = 0.3;
                child.material.roughness = 0.7;
            }
        });
        if (gltf.animations && gltf.animations.length > 0) {
            MIXER = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = MIXER.clipAction(clip);
                action.play(); //for scene clips its Sphere|SphereAction
            });
        }
        scene.add(model);
    });
}

function basicSetup() {
    const scene = new THREE.Scene();
    GLOBAL_SCENE = scene; //set to black default background
    background.levelOneBackground(scene);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    getBall(scene);
    return { scene, camera, renderer};
}

function setupLights(scene) {
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
}

//Level selection different backgrounds
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("LevelOne").addEventListener("click", () => {
        background.levelOneBackground(GLOBAL_SCENE);
    });

    document.getElementById("LevelTwo").addEventListener("click", () => {
        background.levelTwoBackground(GLOBAL_SCENE);
    });

    document.getElementById("LevelThree").addEventListener("click", () => {
        background.levelThreeBackground(GLOBAL_SCENE);
    });
});

export { debugScene };