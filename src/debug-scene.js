import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ballModel from "./models/bouncing_ball.glb";
import { levelThreeBackground, levelTwoBackground, levelOneBackground } from './background/background.js';
import bossAudio from './sounds/boss_type_4.mp3'
import landingSoundFile from './sounds/lava.flac' //sound from https://opengameart.org/content/lava-splash
//import fireTex from './models/fireEffect.png';
import splatEffect from './models/splat.png';

//platform setup
const SHOW_AXES_HELPER = true;
const SHOW_PLATFORMS = true;
const PLATFORM_SIZE = { radius: 10, height: 1 };

//background
const background = {levelOneBackground, levelTwoBackground, levelThreeBackground};
let GLOBAL_SCENE;

//sounds
const audioListener = new THREE.AudioListener(); // listener for the whole scene
const audioLoader = new THREE.AudioLoader();   // loader for all sounds
const backgroundSound = new THREE.Audio(audioListener);
const landingSound = new THREE.Audio(audioListener);
let musicStarted = false;
let soundEffectsEnabled = true; //to mute/unmute landing sound

//ball
const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    metalness: 0.3,
    roughness: 0.7
});

//fire + splat
const loader = new THREE.TextureLoader();
//const fireTexture = loader.load(fireTex);
const splatTexture = loader.load(splatEffect);

//animation
let clock = new THREE.Clock();
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
    camera.position.z = 20;
    camera.position.y = 10;
    const controls = new OrbitControls(camera, renderer.domElement);
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

function loadBackgroundSound() {
    audioLoader.load(bossAudio, function (buffer) {
        backgroundSound.setBuffer(buffer);
        backgroundSound.setLoop(true);
        backgroundSound.setVolume(0.2);
    });
}

function loadLandingSound() {
    audioLoader.load(landingSoundFile, function (buffer) {
        landingSound.setBuffer(buffer);
        landingSound.setLoop(false);
        landingSound.setVolume(0.1);
    });
}


function playLandingSound() {
    if (soundEffectsEnabled) {
        if (landingSound.isPlaying) {
            landingSound.stop();
        }
        landingSound.play();
    }
}



// function createFireBurst(position, scene) {
//     const material = new THREE.SpriteMaterial({
//         map: fireTexture,
//         transparent: true,
//         opacity: 1
//     });
//     const sprite = new THREE.Sprite(material);
//     sprite.scale.set(2, 2, 2);
//     sprite.position.copy(position);
//     scene.add(sprite);
//     let life = 0.2;
//     const interval = setInterval(() => {
//         life -= 0.01;
//         sprite.material.opacity = life * 5;
//         sprite.scale.multiplyScalar(1.07);
//         if (life <= 0) {
//             clearInterval(interval);
//             scene.remove(sprite);
//         }
//     }, 16);
// }

function createSplat(position, scene) {
    const geometry = new THREE.PlaneGeometry(3, 3);
    const randomColor = new THREE.Color(Math.random(), Math.random(), Math.random());
    const material = new THREE.MeshBasicMaterial({
        map: splatTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        color: randomColor
    });
    const splat = new THREE.Mesh(geometry, material);
    splat.position.set(position.x, 0.01, position.z);
    splat.rotation.x = -Math.PI / 2; // make it flat
    splat.rotation.z = Math.random() * Math.PI * 2; // random spin each time
    scene.add(splat);
    setTimeout(() => scene.remove(splat), 5000); // optional fade out
}

function getBall(scene) {
    const glbLoader = new GLTFLoader();
    glbLoader.load(ballModel, (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.material = ballMaterial;
            }
        });
        if (gltf.animations && gltf.animations.length > 0) {
            MIXER = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = MIXER.clipAction(clip);
                action.play(); //for scene clips its Sphere|SphereAction
                // action.getMixer().addEventListener('loop', () => {
                //     createFireBurst(model.position, scene);
                // });
                action.getMixer().addEventListener("loop", () => {
                    const pos = model.position.clone();
                    createSplat(pos, scene);
                    playLandingSound();
                });
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
    camera.add(audioListener);
    loadBackgroundSound();
    loadLandingSound();
    return { scene, camera, renderer};
}

function setupLights(scene) {
    const ambientLight = new THREE.AmbientLight(0x404040,1.2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    const sun = new THREE.DirectionalLight(0xffffff, 4);
    sun.position.set(10, 20, 10);
    scene.add(sun);
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

// sounds
window.addEventListener("DOMContentLoaded", () => {
    //background music
    document.getElementById("Music").addEventListener("click", () => {
        if (!musicStarted) {
            backgroundSound.play();
            musicStarted = true;
        } else {
            if (backgroundSound.isPlaying) backgroundSound.pause();
            else backgroundSound.play();
        }
    });

    //sound effects
    document.getElementById("Sound").addEventListener("click", () => {
        soundEffectsEnabled = !soundEffectsEnabled;
        if (!soundEffectsEnabled && landingSound.isPlaying) {
            landingSound.stop();
        }
    });
})


// function generatePlatformGeometries(count) {
//     const geometries = [];
//     const thetaLength = (2 * Math.PI) / count;
//     let currentAngle = 0;
//
//     const extrudeSettings = {
//         steps: 1,
//         depth: PLATFORM_SIZE.height,
//         bevelEnabled: false,
//         curveSegments: 64,
//     };
//
//     for (let i = 0; i < count; i++) {
//         // Create a shape that is a slice of a circle
//         const shape = new THREE.Shape();
//         shape.absarc(0, 0, PLATFORM_SIZE.radius, currentAngle, currentAngle + thetaLength, false);
//         shape.lineTo(0, 0);
//         shape.closePath();
//
//         // Extrude the shape
//         const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
//         // Rotate so extrusion goes upward
//         geometry.rotateX(Math.PI / 2);
//         geometries.push(geometry);
//         currentAngle += thetaLength;
//     }
//
//     return geometries;
// }

export { debugScene };