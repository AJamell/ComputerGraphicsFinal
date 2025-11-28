import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ballModel from "./models/bouncing_ball.glb";
import { levelThreeBackground, levelTwoBackground, levelOneBackground } from './background/background.js';
import bossAudio from './sounds/boss_type_4.mp3'
import landingSoundFile from './sounds/lava.flac' //sound from https://opengameart.org/content/lava-splash
import fireEffect from './models/fire.glb';
import splatEffect from './models/splat.png';

//platform setup
const SHOW_AXES_HELPER = true;
const SHOW_PLATFORMS = true;
const PLATFORM_SIZE = { radius: 10, height: 1 };

//gui
let score = 0;
let currentLevel = 1;
let isPlaying = false;
let towerRotation = 0;


//background
const background = {levelOneBackground, levelTwoBackground, levelThreeBackground};
const sun = new THREE.DirectionalLight(0xffffff, 1.2);

//scene
let GLOBAL_SCENE;
let GLOBAL_CAMERA;
let GLOBAL_RENDERER;


//materials
// const lightBlueTowerSlice = new THREE.MeshStandardMaterial({ color:0x27E0F5 });
// const killFieldTowerSlice = new THREE.MeshStandardMaterial({ color:0xAD1F1F });
// const darkBlueTowerSlice = new THREE.MeshStandardMaterial({ color:0x1F32AD });
const ballLightBlueSplat = new THREE.MeshBasicMaterial({ color:0x27CFF5 });
const ballDarkBlueSplat = new THREE.MeshBasicMaterial({ color:0x1F68AD});

//cameras
const ASPECT_RATIO = window.innerWidth / window.innerHeight;
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
const splatTexture = loader.load(splatEffect)
const platformSections = 8;
const radPerSection = (2 * Math.PI) / platformSections;

//animation
let GLOBAL_MIXERS = [];
let clock = new THREE.Clock();
let MIXER;
let clipAction;
let CLIP;
let animationProgress = 0;

//input
const input = {};
window.addEventListener('keydown', e => {input[e.key] = true;});
window.addEventListener('keyup', e => {input[e.key] = false;});

// platforms
const platformGeometries = generatePlatformGeometries(platformSections);
const platformMaterial = new THREE.MeshStandardMaterial({ color: "blue" });

//tower
const towerHeight = {levelOne: 1000, levelTwo: 1000, levelThree: 1000};
let currSectionIndex = 0;
const towerGroup = new THREE.Group();
const towerGeometry = new THREE.CylinderGeometry(2, 2, towerHeight.levelOne, 32);
const towerMaterial = new THREE.MeshStandardMaterial({color: new THREE.Color('lightblue')});
const towerMesh = new THREE.Mesh(towerGeometry, towerMaterial);
towerMesh.castShadow = true;
towerMesh.receiveShadow = true;
towerGroup.add(towerMesh);
towerMesh.position.y = 10;

// basic platforms added to tower
towerGroup.position.x = -7.5;

/**
 * Sets up and runs the debug scene for testing platform collisions and raycasting.
 */
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

    const platformConfig = {
        lightBlue: {
            material: new THREE.MeshStandardMaterial({ color: 0x27E0F5 }),
            indices: [0, 3, 6]
        },
        killField: {
            material: new THREE.MeshStandardMaterial({ color: 0xAD1F1F }),
            indices: [1, 4, 7]
        },
        darkBlue: {
            material: new THREE.MeshStandardMaterial({ color: 0x1F32AD }),
            indices: [2, 5]
        }
    };

    for (let i = 0; i < 5; i++) {
        const platformGroup = createPlatformGroup(platformGeometries, platformMaterial, i * -12);
        setMaterialsForPlatform(platformGroup, platformConfig);
        platformGroup.children[0].visible = false; //hide first slice to create gap
        towerGroup.add(platformGroup);
    }


    towerRotation = Math.PI / platformSections; // ensures ball starts centered over a section
    towerGroup.rotation.y = towerRotation;

    camera.position.set(20, 2, 0);
    camera.lookAt(0, 0, 0);
    // console.log('Debug scene initialized.');
    scene.add(towerGroup);
    towerGroup.position.y =  0;

    // setup left and right raycasters 
    const leftRaycaster = new THREE.Raycaster();
    const rightRaycaster = new THREE.Raycaster();
    const downDirection = new THREE.Vector3(0, -1, 0);
    leftRaycaster.ray.direction.copy(downDirection);
    leftRaycaster.ray.origin.set(0, 1, 1); // adjust position
    rightRaycaster.ray.direction.copy(downDirection);
    rightRaycaster.ray.origin.set(0, 1, -1); // adjust position

    // add helpers

    const leftHelper = new THREE.ArrowHelper(leftRaycaster.ray.direction, leftRaycaster.ray.origin, 5, 0xff0000);
    const rightHelper = new THREE.ArrowHelper(rightRaycaster.ray.direction, rightRaycaster.ray.origin, 5, 0x0000ff);
    scene.add(leftHelper);
    scene.add(rightHelper);

    const collisionMeshGroup = createPlatformGroup(platformGeometries, new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }), 0);
    collisionMeshGroup.position.x = -7.5; //slightly above ground to avoid z-fighting
    collisionMeshGroup.visible = false; //hide collision meshes
    scene.add(collisionMeshGroup);
    collisionMeshGroup.rotation.y = towerRotation;

    function animate() {
        requestAnimationFrame(animate);
        if (isPlaying) {
            if (input['a']) {
                towerRotation += 0.07;
                towerRotation %= (2 * Math.PI);
                towerGroup.rotation.y = towerRotation;
                collisionMeshGroup.rotation.y = towerRotation;
            }
            if (input['d']) {
                towerRotation -= 0.07;
                towerRotation %= (2 * Math.PI);
                if (towerRotation < 0) {
                    towerRotation += 2 * Math.PI;
                }
                towerGroup.rotation.y = towerRotation;
                collisionMeshGroup.rotation.y = towerRotation;
            }

            currSectionIndex = Math.floor(towerRotation / radPerSection);
            console.log(`Current Section Index: ${currSectionIndex}`);

            if (clipAction) animationProgress = (clipAction.time % CLIP.duration / CLIP.duration).toFixed(2);

            if (animationProgress >= 0.97) {
                const intersections = findPlatformCollision(currSectionIndex);
            }

            const delta = clock.getDelta();
            if (MIXER) MIXER.update(delta);
            updateScoreUI();
            GLOBAL_MIXERS.forEach(mixer => mixer.update(delta));
            renderer.shadowMap.enabled = true;
            document.getElementById("ballInformation").innerText = `Animation Progress: ${animationProgress}`;
        } else {
            clock.getDelta();
        }

        renderer.render(scene, GLOBAL_CAMERA);
    }
    animate();

    function findPlatformCollision(currentIndex) {
        // get meshes that arent current index from collision group
        const collisionMeshes = collisionMeshGroup.children.filter((_, index) => index !== currentIndex);

        // check left and right raycasters against these meshes
        const leftIntersections = leftRaycaster.intersectObjects(collisionMeshes, true);
        const rightIntersections = rightRaycaster.intersectObjects(collisionMeshes, true);

        return { left: leftIntersections.length, right: rightIntersections.length };
    }
    /**
     * Applies a series of materials to different parts of a platform group
     * @param {*} platFormGroup group of platforms
     * @param {*} materialConfig {materialName: [material, indices: []]}
     */
    function setMaterialsForPlatform(platformGroup, materialConfig) {
        const children = platformGroup.children;
        for (const materialName in materialConfig) {
            const { material, indices } = materialConfig[materialName];
            indices.forEach((index) => {
                if (children[index]) {
                    children[index].material = material;
                    children[index].userData.materialName = materialName;
                }
            });
        }
    }
}

/**
 * Handles window resizing to maintain aspect ratio and renderer size.
 */
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    GLOBAL_RENDERER.setSize(width, height);
    GLOBAL_CAMERA.aspect = width / height;
    GLOBAL_CAMERA.updateProjectionMatrix();
});

/**
 * Creates a group of platform meshes from given geometries and material.
 * @param {*} geometries set of geometries for the platforms
 * @param {*} material material for the platforms
 * @param {*} yPosition vertical position of the platforms
 * @returns 
 */
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

/**
 * Creates a single base platform mesh with given radius, height, and color.
 * @param {number} radius radius of the platform
 * @param {number} height height of the platform
 * @param {number} color color of the platform
 * @returns {THREE.Mesh} the created platform mesh
 */
function createPlatform(radius, height, color) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.y = -height / 2;
    return cylinder;
}


/**
 * Loads the background sound for the scene.
 */
function loadBackgroundSound() {
    audioLoader.load(bossAudio, function (buffer) {
        backgroundSound.setBuffer(buffer);
        backgroundSound.setLoop(true);
        backgroundSound.setVolume(0.2);
    });
}


/**
 * Loads the landing sound for the scene.
 */
function loadLandingSound() {
    audioLoader.load(landingSoundFile, function (buffer) {
        landingSound.setBuffer(buffer);
        landingSound.setLoop(false);
        landingSound.setVolume(0.1);
    });
}


/**
 * Plays the landing sound effect if sound effects are enabled and the game is in play.
 */
function playLandingSound() {
    if (soundEffectsEnabled && isPlaying) {
        if (landingSound.isPlaying) {
            landingSound.stop();
        }
        landingSound.play();
    }
}


/**
 * Creates a splat effect at the given position in the scene.
 * @param {*} position position to place the splat
 * @param {*} scene scene to add the splat to
 */
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


/**
 * Creates a fire effect and attaches it to the given parent model.
 * @param {*} parentModel the model to attach the fire effect to
 */
function createFireEffect(parentModel) {
    const glbLoader = new GLTFLoader();
    glbLoader.load(fireEffect, (gltf) => {
        const fireModel = gltf.scene;
        fireModel.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = false;
                child.castShadow = false;
            }
        });
        fireModel.position.y = 1.5;
        fireModel.scale.set(3.0, 3.0, 3.0);
        parentModel.add(fireModel);
        if (gltf.animations && gltf.animations.length > 0) {
            const fireMixer = new THREE.AnimationMixer(fireModel);
            gltf.animations.forEach((clip) => {
                fireMixer.clipAction(clip).play();
            });
            GLOBAL_MIXERS.push(fireMixer);
        }
    });
}


/**
 * Loads and returns the ball model with animations and fire effect.
 * @param {*} scene scene to add the ball to
 */
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
        createFireEffect(model);
        if (gltf.animations && gltf.animations.length > 0) {
            MIXER = new THREE.AnimationMixer(model);
            GLOBAL_MIXERS.push(MIXER);
            gltf.animations.forEach((clip) => {
                const action = MIXER.clipAction(clip);
                action.timeScale = 0.5;
                action.play();
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
        scene.add(model);
    });
}


/**
 * Sets up the basic scene, camera, and renderer.
 * @returns {Object} An object containing the scene, camera, and renderer.
 */
function basicSetup() {
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    GLOBAL_SCENE = scene; //set to black default background
    scene.background = new THREE.Color('lightblue');
    GLOBAL_CAMERA = perspectiveCamera;
    GLOBAL_RENDERER = renderer;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    getBall(scene);
    perspectiveCamera.add(audioListener);
    loadBackgroundSound();
    loadLandingSound();
    return { scene, perspectiveCamera, renderer };
}


/**
 * Sets up lighting for the scene.
 * @param {*} scene the scene to add lights to
 */
function setupLights(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    scene.add(sun);
}


/**
 * Generates platform geometries arranged in a circular pattern.
 * @param {*} count natural number
 * @returns {Array} array of platform geometries
 */
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


/**
 * Updates the score display in the UI.
 */
function updateScoreUI() {
    const userScore = document.getElementById("score");
    if (userScore) userScore.innerText = `Score: ${score}`;
}


/**
 * Selects the current level and updates the UI accordingly.
 * @param {*} level the level to select
 */
function selectLevel(level) {
    currentLevel = level;
    ['LevelOne', 'LevelTwo', 'LevelThree'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('selected');
        }
    });
    const selectedBtn = document.getElementById(`Level${level === 1 ? 'One' : level === 2 ? 'Two' : 'Three'}`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
}


/**
 * Applies the setup for the specified level.
 * @param {*} level the level to set up
 */
function applyLevelSetup(level) {
    if (level === 1) {
        GLOBAL_CAMERA = perspectiveCamera;
        const targetPoint = new THREE.Vector3(0, 10, 0);
        GLOBAL_CAMERA.position.set(20, 15, 20);
        GLOBAL_CAMERA.lookAt(targetPoint);
        background.levelOneBackground(GLOBAL_SCENE, GLOBAL_RENDERER);
        sun.intensity = 0.8;
        towerMesh.geometry = new THREE.CylinderGeometry(2, 2, towerHeight.levelOne, 32);

    } else if (level === 2) {
        GLOBAL_CAMERA = perspectiveCamera;
        const targetPoint = new THREE.Vector3(-7.5, 10, 0); // Tower position
        GLOBAL_CAMERA.position.set(30, 50, -20);
        GLOBAL_CAMERA.lookAt(targetPoint);
        GLOBAL_CAMERA.updateProjectionMatrix();
        background.levelTwoBackground(GLOBAL_SCENE,GLOBAL_RENDERER);
        sun.intensity = 1.2;
        towerMesh.geometry = new THREE.CylinderGeometry(2, 2, towerHeight.levelTwo, 32);

    } else if (level === 3) {
        GLOBAL_CAMERA = perspectiveCamera;
        const targetPoint = new THREE.Vector3(0, 30, -30);
        GLOBAL_CAMERA.position.set(10, 50, 55);
        GLOBAL_CAMERA.lookAt(targetPoint);
        //GLOBAL_CAMERA.zoom = 0.25;
        GLOBAL_CAMERA.updateProjectionMatrix();
        background.levelThreeBackground(GLOBAL_SCENE,GLOBAL_RENDERER);
        sun.intensity = 4;
        towerMesh.geometry = new THREE.CylinderGeometry(2, 2, towerHeight.levelThree, 32);
    }
}


//GUI
window.addEventListener("DOMContentLoaded", () => {

    document.getElementById("playButton").addEventListener("click", () => { // 👈 CHANGED ID from "play" to "playButton"
        if (!isPlaying) {
            applyLevelSetup(currentLevel);
            isPlaying = true;

            if (!musicStarted) {
                backgroundSound.play();
                musicStarted = true;
            }
            document.getElementById("titleOverlay").classList.add('hidden');
            document.getElementById("playButton").style.display = 'none';
        }
    })

    document.getElementById("reset").addEventListener("click", () => {
        window.location.reload();
    })

    document.getElementById("LevelOne").addEventListener("click", () => {
        selectLevel(1);
    });

    document.getElementById("LevelTwo").addEventListener("click", () => {
        selectLevel(2);
    });

    document.getElementById("LevelThree").addEventListener("click", () => {
        selectLevel(3);
    });

    //background music
    document.getElementById("Music").addEventListener("click", () => {
        if (!musicStarted) {
            backgroundSound.play();
            musicStarted = true;
        } else {
            if (backgroundSound.isPlaying) {
                backgroundSound.pause();
            } else if (isPlaying) {
                backgroundSound.play();
            }
        }
    });

    //sound effects
    document.getElementById("Sound").addEventListener("click", () => {
        soundEffectsEnabled = !soundEffectsEnabled;
        if (!soundEffectsEnabled && landingSound.isPlaying) {
            landingSound.stop();
        }
    });
    selectLevel(currentLevel);
})

export { debugScene };