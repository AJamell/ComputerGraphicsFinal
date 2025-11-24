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

export function levelOneBackground(scene, camera, renderer, controls) {
    removeCurrentModel(scene);
    scene.background = new THREE.Color("#87CEFA");
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    loader.load(
        marioKartDKMap,
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(0.01, 0.01, 0.01);
            model.position.set(0, -40, -55);
            model.castShadow = true;
            model.receiveShadow = true;
            scene.add(model);
            currentBackgroundModel = model;
            controls.enabled = false;
            camera.position.set(5, 60, -43);
            camera.lookAt(model.position.x, model.position.y, model.position.z);
            controls.target.set(model.position.x, model.position.y, model.position.z);
            controls.update();
        },
        () => {},
        (err) => console.error("GLB Load Error:", err)
    );
}

export function levelTwoBackground(scene, camera, renderer, controls) {
    removeCurrentModel(scene);
    scene.background = new THREE.Color("skyblue");
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    loader.load(
        marioAirport,
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(30, 30, 30);
            model.position.set(0, -35, 200);
            model.castShadow = true;
            model.receiveShadow = true;
            scene.add(model);
            currentBackgroundModel = model;
            controls.enabled = false;
            camera.position.set(200, 100, 200);
            const targetPoint = new THREE.Vector3(0, 0, 0);
            camera.lookAt(targetPoint);
            controls.target.copy(targetPoint);
            controls.update();
        },
        () => {},
        (err) => console.error("GLB Load Error:", err)
    );
}

export function levelThreeBackground(scene, camera, renderer, controls) {
    removeCurrentModel(scene);
    scene.background = new THREE.Color("#1A0A0A"); // dark red mist
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    loader.load(
        bowserMap,
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(2, 2, 2);
            model.position.set(0, -108, -30);
            model.castShadow = true;
            model.receiveShadow = true;
            scene.add(model);
            currentBackgroundModel = model;
            controls.enabled = false;
            camera.position.set(0, -100, 0);
            const targetPoint = new THREE.Vector3(0, 10, 0);
            camera.lookAt(targetPoint);
            controls.target.copy(targetPoint);
            controls.update();
        },
        () => {},
        (err) => console.error("GLB Load Error:", err)
    );
}