import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ballModel from "./models/bouncing_ball.glb";
import { levelThreeBackground, levelTwoBackground, levelOneBackground } from './background/background.js';
import bossAudio from './sounds/boss_type_4.mp3'
import landingSoundFile from './sounds/lava.flac' //sound from https://opengameart.org/content/lava-splash
import fireTex from './images/fire.png';
import splatEffect from './models/splat.png';
import { getParticleSystem } from './getParticleSystem.js';


//platform setup
const SHOW_AXES_HELPER = true;
const SHOW_PLATFORMS = true;
const PLATFORM_SIZE = { radius: 10, height: 1 };


//score
let score = 0;


//background
const background = {levelOneBackground, levelTwoBackground, levelThreeBackground};
const sun = new THREE.DirectionalLight(0xffffff, 1.2);


//scene
let GLOBAL_SCENE;
let GLOBAL_CAMERA;
let GLOBAL_RENDERER;
let fireEffect;

//tower
const towerHeight = {levelOne: 1000, levelTwo: 1000, levelThree: 1000};

//materials
// const lightBlueTowerSlice = new THREE.MeshStandardMaterial({ color:0x27E0F5 });
// const killFieldTowerSlice = new THREE.MeshStandardMaterial({ color:0xAD1F1F });
// const darkBlueTowerSlice = new THREE.MeshStandardMaterial({ color:0x1F32AD });
const ballLightBlueSplat = new THREE.MeshBasicMaterial({ color:0x27CFF5 });
const ballDarkBlueSplat = new THREE.MeshBasicMaterial({ color:0x1F68AD});

//camera
const aspect = window.innerWidth / window.innerHeight;
const viewSize = 30;
const orthographicCamera = new THREE.OrthographicCamera(
    -viewSize * aspect / 2, // left
    viewSize * aspect / 2, // right
    viewSize / 2, // top
    -viewSize / 2,// bottom
    0.1,// near
    1000 // far
);
const perspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);


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
const fireTexture = loader.load(fireTex);
const splatTexture = loader.load(splatEffect);


//animation
let clock = new THREE.Clock();
let MIXER;
let clipAction;
let CLIP;

//input
const input = {};
window.addEventListener('keydown', e => {input[e.key] = true;});
window.addEventListener('keyup', e => {input[e.key] = false;});

const platformGeometries = generatePlatformGeometries(8);
const platformMaterial = new THREE.MeshStandardMaterial({ color: "red" });

const towerGroup = new THREE.Group();
const towerGeometry = new THREE.CylinderGeometry(2, 2, towerHeight.levelOne, 32);
const towerMaterial = new THREE.MeshStandardMaterial({color: new THREE.Color().setRGB( 39,224,245)});
const towerMesh = new THREE.Mesh(towerGeometry, towerMaterial);
towerMesh.castShadow = true;
towerMesh.receiveShadow = true;
towerGroup.add(towerMesh);
towerMesh.position.y = 10;

const platformGroup = createPlatformGroup(platformGeometries, platformMaterial, 12);
const platformGroupTwo = createPlatformGroup(platformGeometries, platformMaterial, 24);
const platformGroupThree = createPlatformGroup(platformGeometries, platformMaterial, 36);
platformGroup.children[0].visible = false; //hide one platform to create a gap
towerGroup.add(platformGroup);
towerGroup.add(platformGroupTwo);
towerGroup.add(platformGroupThree);
towerGroup.position.x = -7.5;

function debugScene() {
    const { scene, perspectiveCamera: camera, renderer } = basicSetup();
    setupLights(scene);
    if (SHOW_AXES_HELPER) {
        const axesHelper = new THREE.AxesHelper(10);
        scene.add(axesHelper);
    }
    if (SHOW_PLATFORMS) {
        const platform = createPlatform(PLATFORM_SIZE.radius, PLATFORM_SIZE.height, 0xCCCDC6);
        scene.add(platform);
    }
    camera.position.set(0, 15, 50);
    camera.lookAt(-7.5, 10, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    console.log('Debug scene initialized.');
    scene.add(towerGroup);

    function animate() {
        if (input['a']) {
            towerGroup.rotation.y += 0.07;
            towerGroup.rotation.y %= (2 * Math.PI);
            if (towerGroup.rotation.y < 0) {
                towerGroup.rotation.y += 2 * Math.PI;
            }
            console.log(towerGroup.rotation.y % (2 * Math.PI));
        }
        if (input['d']) {
            towerGroup.rotation.y -= 0.07;
            towerGroup.rotation.y %= (2 * Math.PI);
            if (towerGroup.rotation.y < 0) {
                towerGroup.rotation.y += 2 * Math.PI;
            }
            console.log(towerGroup.rotation.y % (2 * Math.PI));
        }
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        updateScoreUI();
        if (fireEffect && fireEffect.update) {
            fireEffect.update(delta);
        }
        if (MIXER) MIXER.update(delta);
        renderer.shadowMap.enabled = true;
        renderer.render(scene, camera);
        controls.update();
        document.getElementById("ballInformation").innerText = `Animation Progress: ${clipAction ? (clipAction.time % CLIP.duration / CLIP.duration).toFixed(2) : 'N/A'}`;
    }
    animate();
}

function createPlatformGroup(geometries, material, yPosition = PLATFORM_SIZE.height * 2) {
    const platformGroupNormal = new THREE.Group();
    geometries.forEach((geometry) => {
        const platformMesh = new THREE.Mesh(geometry, material);
        platformMesh.position.y = yPosition;
        platformMesh.castShadow = true;
        platformMesh.receiveShadow = true;
        platformGroupNormal.add(platformMesh);
    });
    return platformGroupNormal;
}

function createPlatform(radius, height, color) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.y = -height / 2;
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

function createSplat(position, scene) {
    const geometry = new THREE.PlaneGeometry(3, 3);
    const ballColors = [ballLightBlueSplat.color, ballDarkBlueSplat.color]
    const material = new THREE.MeshBasicMaterial({
        map: splatTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        color: ballColors[Math.floor(Math.random() * ballColors.length)],
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
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        fireEffect = getParticleSystem({
            GLOBAL_CAMERA,
            emitter: model,
            parent: scene,
            rate: 10,
            texture: './images/fire.png',
        });
        if (gltf.animations && gltf.animations.length > 0) {
            MIXER = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = MIXER.clipAction(clip);
                action.play(); //for scene clips its Sphere|SphereAction
                clipAction = action;
                CLIP = action.getClip();
                if (MIXER) {
                    MIXER.addEventListener("loop", () => {
                        const pos = model.position.clone();
                        createSplat(pos, scene);
                        playLandingSound();
                        score++;
                    });
                }
            });
        }
        console.log(MIXER);
        scene.add(model);
    });
}


function basicSetup() {
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer();
    GLOBAL_SCENE = scene; //set to black default background
    GLOBAL_CAMERA = perspectiveCamera;
    GLOBAL_RENDERER = renderer;
    renderer.shadowMap.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    getBall(scene);
    perspectiveCamera.add(audioListener);
    loadBackgroundSound();
    loadLandingSound();
    return { scene, perspectiveCamera, renderer };
}

function setupLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
}

function generatePlatformGeometries(count) {
    const geometries = [];
    const thetaLength = (2 * Math.PI) / count;
    let currentAngle = 0;

    const extrudeSettings = {
        steps: 1,
        depth: PLATFORM_SIZE.height,
        bevelEnabled: false,
        curveSegments: 64,
    };

    for (let i = 0; i < count; i++) {
        // Create a shape that is a slice of a circle
        const shape = new THREE.Shape();
        shape.absarc(0, 0, PLATFORM_SIZE.radius, currentAngle, currentAngle + thetaLength, false);
        shape.lineTo(0, 0);
        shape.closePath();
        // Extrude the shape
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // Rotate so extrusion goes upward
        geometry.rotateX(Math.PI / 2);
        geometries.push(geometry);
        currentAngle += thetaLength;
    }
    return geometries;
}



// -- gui section --
function updateScoreUI() {
    const userScore = document.getElementById("score");
    if (userScore) userScore.innerText = `Score: ${score}`;
}

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

//levels
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("LevelOne").addEventListener("click", () => {
        background.levelOneBackground(GLOBAL_SCENE,GLOBAL_CAMERA, GLOBAL_RENDERER);
        sun.intensity = 0.8;
        towerGeometry.height = towerHeight.levelOne;
        GLOBAL_CAMERA = perspectiveCamera;
    });

    document.getElementById("LevelTwo").addEventListener("click", () => {
        background.levelTwoBackground(GLOBAL_SCENE,GLOBAL_CAMERA, GLOBAL_RENDERER);
        sun.intensity = 1.2;
        towerGeometry.height = towerHeight.levelTwo;
        GLOBAL_CAMERA = orthographicCamera;
    });

    document.getElementById("LevelThree").addEventListener("click", () => {
        background.levelThreeBackground(GLOBAL_SCENE,GLOBAL_CAMERA,GLOBAL_RENDERER);
        sun.intensity = 4;
        towerGeometry.height = towerHeight.levelThree;
        GLOBAL_CAMERA = orthographicCamera;
    });
})


export { debugScene };