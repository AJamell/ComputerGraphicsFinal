import * as THREE from 'three';
import {GLTFLoader} from "three/addons/loaders/GLTFLoader";
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import marioKartDKMap from "../models/dkMountain.glb";
import bowserMap from "../models/bowserMap.glb";
import marioAirport from "../models/marioAirport.glb";

//load glb models
const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
loader.setDRACOLoader(draco);
let currentBackgroundModel = null;

//scale
const levelOneModelScale = 0.01;
const levelOnePosition = new THREE.Vector3(0,-40,-55);
const levelTwoScale = 30;
const levelTwoPosition = new THREE.Vector3(0,-35,200);
const levelThreeModelScale = 2;
const levelThreePosition = new THREE.Vector3(-10,-108,-55);

function removeCurrentModel(scene) {
    if (!currentBackgroundModel) return;
    scene.remove(currentBackgroundModel);
    currentBackgroundModel.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
    currentBackgroundModel = null;
}


export function levelOneBackground(scene, renderer) {
    removeCurrentModel(scene);
    scene.background = new THREE.Color("#87CEFA");
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    loader.load(
        marioKartDKMap,
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(levelOneModelScale, levelOneModelScale,levelOneModelScale);
            model.rotation.y = Math.PI;
            model.position.set(levelOnePosition.x, levelOnePosition.y, levelOnePosition.z);
            model.castShadow = true;
            model.receiveShadow = true;
            scene.add(model);
            currentBackgroundModel = model;
        },
        () => {},
        (err) => console.error("GLB Load Error:", err)
    );
}


export function levelTwoBackground(scene, renderer) {
    removeCurrentModel(scene);
    scene.background = new THREE.Color("skyblue");
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    loader.load(
        marioAirport,
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(levelTwoScale,levelTwoScale,levelTwoScale);
            model.position.set(levelTwoPosition.x, levelTwoPosition.y, levelTwoPosition.z);
            model.castShadow = true;
            model.receiveShadow = true;
            scene.add(model);
            currentBackgroundModel = model;
        },
        () => {},
        (err) => console.error("GLB Load Error:", err)
    );
}


export function levelThreeBackground(scene,renderer) {
    removeCurrentModel(scene);
    scene.background = new THREE.Color("#1A0A0A"); // dark red mist
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.shadowMap.enabled = true;
    loader.load(
        bowserMap,
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(levelThreeModelScale, levelThreeModelScale, levelThreeModelScale);
            model.position.set(levelThreePosition.x, levelThreePosition.y, levelThreePosition.z);
            model.castShadow = true;
            model.receiveShadow = true;
            scene.add(model);
            currentBackgroundModel = model;
        },
        () => {},
        (err) => console.error("GLB Load Error:", err)
    );
}