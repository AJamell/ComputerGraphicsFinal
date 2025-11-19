import * as THREE from 'three';
import {GLTFLoader} from "three/addons/loaders/GLTFLoader";
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import marioKartDKMap from "../models/dkMountain.glb";
import marioKartHighway from "../models/cityMapMario.glb";
import bowserMap from "../models/bowserMap.glb";

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
loader.setDRACOLoader(draco);
const rgbe = new RGBELoader();
let currentBackgroundModel = null;


function removeCurrentModel(scene) {
    if (currentBackgroundModel) {
        scene.remove(currentBackgroundModel);
        currentBackgroundModel.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        currentBackgroundModel = null;
    }
}




export function levelOneBackground(scene) {
    removeCurrentModel(scene);

    rgbe.load('/textures/sky.hdr', (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdr;
        scene.background = hdr;
    });

    loader.load(marioKartDKMap, (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.01, 0.01, 0.01);
        scene.add(model);
        currentBackgroundModel = model;
    }, (err) => console.error(err));
}

export function levelTwoBackground(scene) {
    removeCurrentModel(scene);

    rgbe.load('/textures/sky.hdr', (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdr;
        scene.background = hdr;
    });
    loader.load(marioKartHighway, (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.01, 0.01, 0.01);
        scene.add(model);
        currentBackgroundModel = model;
    }, (err) => console.error(err));
    scene.background = new THREE.Color("skyblue"); // fallback
}

export function levelThreeBackground(scene) {
    removeCurrentModel(scene);

    rgbe.load('/textures/sky.hdr', (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdr;
        scene.background = hdr;
    });

    loader.load(bowserMap, (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.4,0.4, 0.4);
        scene.add(model);
        currentBackgroundModel = model;
    }, (err) => console.error(err));
    scene.background = new THREE.Color("red"); // fallback
}