import * as THREE from 'three';
// import {GLTFLoader} from "three/addons/loaders/GLTFLoader";
// import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
// import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
// import marioKartDKMap from "../models/mario_kart_8_deluxe_-_gcn_dk_mountain.glb";
// import marioKartHighway from "../models/mario_kart_8_deluxe_-_wii_moonview_highway.glb";






// export function levelOneBackground(scene) {
//     const loader = new GLTFLoader();
//     const draco = new DRACOLoader();
//     draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
//     loader.setDRACOLoader(draco);
//     // Load an HDRI environment
//     const rgbe = new RGBELoader();
//     rgbe.load('/textures/sky.hdr', (hdr) => {
//         hdr.mapping = THREE.EquirectangularReflectionMapping;
//         scene.environment = hdr;
//         scene.background = hdr;  // optional
//     });
//     loader.load(marioKartDKMap, (gltf) => {
//         const model = gltf.scene;
//         model.scale.set(0.01, 0.01, 0.01);
//         scene.add(model);
//     }, (err) => console.error(err));
// }

// export function levelTwoBackground(scene) {
//     const loader = new GLTFLoader();
//     const draco = new DRACOLoader();
//     draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
//     loader.setDRACOLoader(draco);
//
//     const rgbe = new RGBELoader();
//     rgbe.load('/textures/sky.hdr', (hdr) => {
//         hdr.mapping = THREE.EquirectangularReflectionMapping;
//         scene.environment = hdr;
//         scene.background = hdr;
//     });
//
//     loader.load(marioKartHighway, (gltf) => {
//         const model = gltf.scene;
//         model.scale.set(0.01, 0.01, 0.01);
//         scene.add(model);
//     }, (err) => console.error(err));
//     scene.background = new THREE.Color("skyblue"); // fallback
// }


export function levelOneBackground(scene) {
    scene.background = new THREE.Color('orange');
}

export function levelTwoBackground(scene) {
    scene.background = new THREE.Color('green');
}

export function levelThreeBackground(scene) {
    scene.background = new THREE.Color('blue');
}