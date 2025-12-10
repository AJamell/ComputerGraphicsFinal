import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ballModel from "./models/bouncing_ball.glb";
import { levelThreeBackground, levelTwoBackground, levelOneBackground } from './background/background.js';
import bossAudio from './sounds/boss_type_4.mp3'
import landingSoundFile from './sounds/lava.flac' //sound from https://opengameart.org/content/lava-splash
import fireEffect from './models/fire.glb';
import splatEffect from './images/splat-decal.png';
import splatNormal from './images/splat-decal-normal.jpg';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';

//platform setup
const PLATFORM_SIZE = { radius: 10, height: 1 };

//gui
let score = 0;
let currentLevel = 1;
let isPlaying = false;
let towerRotation = 0;


//background
const background = {levelOneBackground, levelTwoBackground, levelThreeBackground};
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
const renderToneExposure = 1.25;
const sunIntensity = 1.6;
const sunPosition = new THREE.Vector3(10,20,10);
const sunShadowBias = -0.0005;
const normalShadowBias = 0.02;
const shadowMapSize = 4096;
const shadowCameraFar = 100;
const shadowCameraBorderSize = 20;


//scene
let GLOBAL_SCENE;
let GLOBAL_CAMERA;
let GLOBAL_RENDERER;

//materials
const ballDarkBlueSplat = new THREE.MeshBasicMaterial({ color: 0xFFC0CB});
const killfieldMaterial = new THREE.MeshStandardMaterial({ color: 0xAD1F1F });
const solidMaterial = new THREE.MeshStandardMaterial({ color: 0x1F32AD });
const emptyMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

//cameras
const perspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const initialCameraPosition = new THREE.Vector3(20, 2, 0);


//sounds
const audioListener = new THREE.AudioListener(); // listener for the whole scene
const audioLoader = new THREE.AudioLoader();   // loader for all sounds
const backgroundSound = new THREE.Audio(audioListener);
const landingSound = new THREE.Audio(audioListener);
let musicStarted = false;
let soundEffectsEnabled = true; //to mute/unmute landing sound
const backgroundSoundVolume = 0.2;
const landingSoundVolume = 0.1;

//ball
const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFFF00, //yellow
    metalness: 0.3,
    roughness: 0.7
});
const ballTimeScale = 0.4;
const ballTime = 0.5;


//fire + splat
const loader = new THREE.TextureLoader();
const splatTexture = loader.load(splatEffect);
const splatNormalEffect = loader.load(splatNormal);
let fireModel = null;
const splatGeometry = new THREE.PlaneGeometry(3, 3);
const splatMaterial = new THREE.MeshPhongMaterial({
    map: splatTexture,
    normalMap: splatNormalEffect,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    color: ballDarkBlueSplat.color,
});
const fireModelScale = 3.5;
const fireModelOffset = 1.5;
const fireAnimationTimeScale = 5.0;


//platforms
const platformSections = 8;
const radPerSection = (2 * Math.PI) / platformSections;
const towerLevels = 20;
const LEVEL_CONFIGS = {
    1: { empty: 2, solid: 4, killfield: 2 },
    2: { empty: 1, solid: 4, killfield: 3 },
    3: { empty: 1, solid: 2, killfield: 5 }
};
const platformDistance = 12;


//animation
let GLOBAL_MIXERS = [];
let clock = new THREE.Clock();
let MIXER;
let clipAction;
let CLIP;
let animationProgress = 0;
const endAnimationDelim = 0.97;

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
const towerMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color('lightblue')});
const towerMesh = new THREE.Mesh(towerGeometry, towerMaterial);
towerMesh.castShadow = true;
towerMesh.receiveShadow = true;
towerGroup.add(towerMesh);
towerMesh.position.y = 10;
const platforms = [];
let towerYDisplacement = 0;

// basic platforms added to tower
towerGroup.position.x = -7.5;


// setup left and right raycasters
const leftRaycaster = new THREE.Raycaster();
const rightRaycaster = new THREE.Raycaster();
const downDirection = new THREE.Vector3(0, -1, 0);
leftRaycaster.ray.direction.copy(downDirection);
leftRaycaster.ray.origin.set(0, 1, 1); // adjust position
rightRaycaster.ray.direction.copy(downDirection);
rightRaycaster.ray.origin.set(0, 1, -1); // adjust position

//platform collision meshes
const collisionMeshGroup = createPlatformGroup(platformGeometries, new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }), 0);
collisionMeshGroup.position.x = -7.5; //slightly above ground to avoid z-fighting
collisionMeshGroup.visible = false; //hide collision meshes
towerRotation = Math.PI / platformSections; // ensures ball starts centered over a section
collisionMeshGroup.rotation.y = towerRotation;

//shaders
const pixelSize = 1.5;

/**
 * Sets up and runs the debug scene for testing platform collisions and raycasting.
 */
function helixJump() {
    const { scene, perspectiveCamera: camera, renderer } = basicSetup();
    const composer = new EffectComposer(renderer);
    const renderPixelatedPass = new RenderPixelatedPass(pixelSize, scene, perspectiveCamera);
    composer.addPass(renderPixelatedPass);
    setupLights(scene);
    generateLevel()
    scene.add(collisionMeshGroup);
    towerGroup.rotation.y = towerRotation;
    camera.position.set(initialCameraPosition.x, initialCameraPosition.y, initialCameraPosition.z);
    camera.lookAt(0, 0, 0);
    scene.add(towerGroup);
    towerGroup.position.y =  0;
    function animate() {
        requestAnimationFrame(animate);
        // convert from ms → seconds
        const deltaTime = clock.getDelta();
        if (isPlaying) {
            // tower rotation using deltaTime for consistent speed
            const rotationSpeed = 4.0; // radians per second
            if (input['a']) {
                towerRotation += rotationSpeed * deltaTime;
                towerRotation %= (2 * Math.PI);
                towerGroup.rotation.y = towerRotation;
                collisionMeshGroup.rotation.y = towerRotation;
            }

            if (input['d']) {
                towerRotation -= rotationSpeed * deltaTime;
                towerRotation %= (2 * Math.PI);
                if (towerRotation < 0) towerRotation += 2 * Math.PI;
                towerGroup.rotation.y = towerRotation;
                collisionMeshGroup.rotation.y = towerRotation;
            }
            currSectionIndex = Math.floor(towerRotation / radPerSection);
            if (clipAction) {
                animationProgress = (
                    (clipAction.time % CLIP.duration) / CLIP.duration
                ).toFixed(2);
            }
            if (animationProgress >= endAnimationDelim) {
                processCollision();
            }
            // mixer now uses deltaTime passed in
            if (MIXER) MIXER.update(deltaTime);
            GLOBAL_MIXERS.forEach(m => m.update(deltaTime));
            updateScoreUI();
            renderer.shadowMap.enabled = true;
            document.getElementById("ballInformation").innerText =
                `Animation Progress: ${animationProgress}`;
        }
        composer.render();
    }
    animate();
}
function processCollision() {
    const currentPlatform = platforms[towerYDisplacement / platformDistance];
    if (!currentPlatform) return;
    const intersections = findPlatformCollision(currSectionIndex);
    const currSectionIsEmpty = currentPlatform.children[currSectionIndex].userData.materialName.toLowerCase() === "empty";
    let interactionType = "";
    let interactionIndex = currSectionIndex;
    if ((intersections.left === 0 &&
        intersections.right === 0) || !currSectionIsEmpty) {
        interactionIndex = currSectionIndex;
    } else if (intersections.left > 0) {
        interactionIndex = (currSectionIndex + 1) % platformSections;
    } else if (intersections.right > 0) {
        interactionIndex = (currSectionIndex - 1 + platformSections) % platformSections;
    } else {
        return;
    }
    interactionType = currentPlatform.children[interactionIndex].userData.materialName;

    switch (interactionType.toLowerCase()) {
    case "killfield":
        isPlaying = false;
        if (clipAction) clipAction.stop();
        endGame(score);
        break;
    case "solid":
        fireModel.visible = false;
        ballMaterial.color.set(255,255,0) //yellow
        clipAction.play();
        setTimeout(() => {
            currentPlatform.children[interactionIndex].userData.materialName = "killfield";
            currentPlatform.children[interactionIndex].material = killfieldMaterial;
        }, 75);
        break;
    case "empty":
        score++;
        liftObject(towerGroup);
        break;
    }
}

function findPlatformCollision(currentIndex) {
    const collisionMeshes = collisionMeshGroup.children.filter((_, index) => index !== currentIndex);
    const leftIntersections = leftRaycaster.intersectObjects(collisionMeshes, true);
    const rightIntersections = rightRaycaster.intersectObjects(collisionMeshes, true);
    return { left: leftIntersections.length, right: rightIntersections.length };
}

/**
 * Applies a series of materials to different parts of a platform group
 * @param platformGroup
 * @param {*} materialConfig {materialName: [material, indices: []]}
 */
function setMaterialsForPlatform(platformGroup, materialConfig) {
    const children = platformGroup.children;
    const indicesList = Object.values(materialConfig).flatMap(config => config.indices);
    if (indicesList.length !== children.length) return;
    for (const materialName in materialConfig) {
        const { material, indices } = materialConfig[materialName];
        indices.forEach((index) => {
            if (children[index]) {
                children[index].material = material;
                children[index].userData.materialName = materialName;
                if (materialName.toLowerCase() === "empty") {
                    children[index].visible = false;
                }
            }
        });
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
 * Loads the background sound for the scene.
 */
function loadBackgroundSound() {
    audioLoader.load(bossAudio, function (buffer) {
        backgroundSound.setBuffer(buffer);
        backgroundSound.setLoop(true);
        backgroundSound.setVolume(backgroundSoundVolume);
    });
}


/**
 * Loads the landing sound for the scene.
 */
function loadLandingSound() {
    audioLoader.load(landingSoundFile, function (buffer) {
        landingSound.setBuffer(buffer);
        landingSound.setLoop(false);
        landingSound.setVolume(landingSoundVolume);
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
 * Creates a splat effect and attaches it to a platform slice.
 * @param ballWorldPosition - balls position
 * @param {THREE.Group} platformGroup - The platform group to attach the splat to
 * @param {number} sectionIndex - The index of the platform section
 */
function createSplatOnPlatform(ballWorldPosition, platformGroup, sectionIndex) {
    const splat = new THREE.Mesh(splatGeometry, splatMaterial);
    splat.castShadow = false;
    splat.receiveShadow = false;
    splat.renderOrder = 1;
    const targetSlice = platformGroup.children[sectionIndex];
    const localPosition = targetSlice.worldToLocal(ballWorldPosition.clone());
    splat.position.set(localPosition.x, localPosition.y + 0.20, localPosition.z + 0.55);
    splat.rotation.x = -Math.PI / 2;
    splat.rotation.z = Math.random() * Math.PI * 2;
    targetSlice.add(splat);
    setTimeout(() => {
        if (targetSlice && splat.parent === targetSlice) {
            targetSlice.remove(splat);
        }
    }, 3000);
}



/**
 * Creates a fire effect and attaches it to the given parent model.
 * @param {*} parentModel the model to attach the fire effect to
 */
function createFireEffect(parentModel) {
    const glbLoader = new GLTFLoader();
    glbLoader.load(fireEffect, (gltf) => {
        fireModel = gltf.scene;
        fireModel.visible = false;
        fireModel.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = false;
                child.castShadow = false;
            }
        });
        fireModel.position.y = fireModelOffset;
        fireModel.scale.set(fireModelScale, fireModelScale, fireModelScale);
        parentModel.add(fireModel);
        if (gltf.animations && gltf.animations.length > 0) {
            const fireMixer = new THREE.AnimationMixer(fireModel);
            gltf.animations.forEach((clip) => {
                const action = fireMixer.clipAction(clip);
                action.timeScale = fireAnimationTimeScale;
                action.play();
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
                action.timeScale = ballTimeScale;
                action.time = ballTime;
                action.play();
                clipAction = action;
                CLIP = action.getClip();
                if (MIXER) {
                    MIXER.addEventListener("loop", () => {
                        const ballWorldPos = model.position.clone();
                        const currentPlatformIndex = Math.floor(towerYDisplacement / platformDistance);
                        const currentPlatform = platforms[currentPlatformIndex];
                        if (currentPlatform) {
                            createSplatOnPlatform(ballWorldPos, currentPlatform, currSectionIndex);
                        }
                        playLandingSound();
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
    renderer.toneMappingExposure = renderToneExposure;
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
    const ambientLight = new THREE.AmbientLight(0xffffff, sunIntensity);
    scene.add(ambientLight);
    sun.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
    sun.castShadow = true;
    sun.shadow.bias = sunShadowBias;
    sun.shadow.normalBias = normalShadowBias;
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sun.shadow.camera.far = shadowCameraFar;
    sun.shadow.camera.left = -shadowCameraBorderSize;
    sun.shadow.camera.right = shadowCameraBorderSize;
    sun.shadow.camera.top = shadowCameraBorderSize;
    sun.shadow.camera.bottom = -shadowCameraBorderSize;
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

let liftInProgress = false;
// Callbacks you can set from outside
let onLiftStart = () => {
    fireModel.visible = true;
    ballMaterial.color.set(255,0,0) //red
    clipAction.stop();
};
let onLiftEnd = () => {processCollision();};


/**
 * Lifts an object 12 units upward with acceleration.
 * @param {*} mesh Mesh to lift
 * @return {Promise} resolves when lift is complete
 */
function liftObject(mesh) {
    if (liftInProgress) return Promise.resolve();
    liftInProgress = true;
    onLiftStart();
    let velocity = 30;
    const startY = mesh.position.y;
    const targetY = startY + platformDistance;
    towerYDisplacement += platformDistance;
    let lastTime = performance.now();
    const gameWon = score === towerLevels;
    return new Promise(resolve => {
        function animate() {
            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;
            mesh.position.y += velocity * delta;
            if (mesh.position.y >= targetY) {
                mesh.position.y = targetY;
                liftInProgress = false;
                if (gameWon) {
                    endGame(score);
                    resolve();
                    return;
                }
                onLiftEnd();
                resolve();
                return;
            }
            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    });
}

/**
 * Clears all existing platform sections from the scene.
 */
function clearPlatforms() {
    platforms.forEach(platformGroup => {
        towerGroup.remove(platformGroup);
    });
    platforms.length = 0;
    collisionMeshGroup.children.length = 0;
}


/**
 * Generates the platform groups and collision meshes for the current level.
 */
function generateLevel() {
    clearPlatforms();

    // What this function is doing is looping through the five levels, gets the indices which is 8 since 8 slices
    // then randomizes using something called fisher yates shuffle
    // then gets the current config for the game level then assigns the indices to the materials
    // splice(0, config.empty) removes the first 2 items from indices and returns them
    // then it creates the platform group and sets the materials for the platform group

    for (let i = 0; i < towerLevels; i++) {
        const indices = [...Array(platformSections).keys()];
        for (let j = indices.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [indices[j], indices[k]] = [indices[k], indices[j]];
        }
        const config = LEVEL_CONFIGS[currentLevel];
        const platformConfig = {
            empty: { material: emptyMaterial, indices: indices.splice(0, config.empty) },
            solid: { material: solidMaterial, indices: indices.splice(0, config.solid) },
            killfield: { material: killfieldMaterial, indices: indices.splice(0, config.killfield) }
        };
        const platformGroup = createPlatformGroup(platformGeometries, platformMaterial, i * -platformDistance);
        setMaterialsForPlatform(platformGroup, platformConfig);
        towerGroup.add(platformGroup);
        platforms.push(platformGroup);
    }
    collisionMeshGroup.rotation.y = towerRotation;
}


function resetGame() {
    score = 0;
    isPlaying = false;
    towerYDisplacement = 0;
    liftInProgress = false;
    ballMaterial.color.set(255,255,0)

    towerRotation = Math.PI / platformSections;
    towerGroup.rotation.y = towerRotation;
    collisionMeshGroup.rotation.y = towerRotation;
    towerGroup.position.y = 0;

    if (clipAction) {
        clipAction.stop();
        clipAction.time = ballTime;
    }
    if (fireModel) {
        fireModel.visible = false;
    }
    if (backgroundSound.isPlaying) {
        backgroundSound.stop();
    }
    musicStarted = false;
    updateScoreUI();
    document.getElementById("ballInformation").innerText = `Animation Progress: N/A`;
}

/**
 * Updates the score display in the UI.
 */
function updateScoreUI() {
    const userScore = document.getElementById("score");
    if (userScore) userScore.innerText = `Score: ${score}`;
}

/**
 * Diplays the end game overlay with the final score.
 * */
function endGame(points) {
    isPlaying = false;
    if (clipAction) clipAction.stop();
    document.getElementById("endGameOverlay").style.display = "flex";
    document.getElementById("finalScore").textContent = "Score: " + points;
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
        sun.intensity = sunIntensity;
        towerMesh.geometry = new THREE.CylinderGeometry(2, 2, towerHeight.levelOne, 32);

    } else if (level === 2) {
        GLOBAL_CAMERA = perspectiveCamera;
        const targetPoint = new THREE.Vector3(0, 10, 0); // Tower position
        GLOBAL_CAMERA.position.set(15, 15, -30);
        GLOBAL_CAMERA.lookAt(targetPoint);
        GLOBAL_CAMERA.updateProjectionMatrix();
        background.levelTwoBackground(GLOBAL_SCENE,GLOBAL_RENDERER);
        sun.intensity = sunIntensity - 0.2;
        towerMesh.geometry = new THREE.CylinderGeometry(2, 2, towerHeight.levelTwo, 32);

    } else if (level === 3) {
        GLOBAL_CAMERA = perspectiveCamera;
        const targetPoint = new THREE.Vector3(0, 10, 0);
        GLOBAL_CAMERA.position.set(20, 15, 20);
        GLOBAL_CAMERA.lookAt(targetPoint);
        GLOBAL_CAMERA.updateProjectionMatrix();
        background.levelThreeBackground(GLOBAL_SCENE,GLOBAL_RENDERER);
        sun.intensity = sunIntensity + 3;
        towerMesh.geometry = new THREE.CylinderGeometry(2, 2, towerHeight.levelThree, 32);
    }
}


//GUI
window.addEventListener("DOMContentLoaded", () => {
    helixJump();
    document.getElementById("playButton").addEventListener("click", () => {
        if (!isPlaying) {
            resetGame();
            applyLevelSetup(currentLevel);
            generateLevel();
            isPlaying = true;
            if (clipAction) {
                clipAction.play();
            }
            if (!musicStarted) {
                backgroundSound.play();
                musicStarted = true;
            }
            document.getElementById("titleOverlay").classList.add('hidden');
        }
    })

    document.getElementById("returnMenu").addEventListener("click", () => {
        document.getElementById("endGameOverlay").style.display = "none";
        document.getElementById("titleOverlay").classList.remove('hidden');
        document.getElementById("playButton").style.display = 'block';
        resetGame();
        clearPlatforms();
    });

    document.getElementById("playAgainButton").addEventListener("click", () => {
        document.getElementById("endGameOverlay").style.display = "none";
        resetGame();
        generateLevel();
        applyLevelSetup(currentLevel);
        isPlaying = true;
        if (clipAction) {
            clipAction.play();
        }
        if (!musicStarted) {
            backgroundSound.play();
            musicStarted = true;
        }
    });

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


