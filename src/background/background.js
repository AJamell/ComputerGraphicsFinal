import * as THREE from 'three';

export function levelOneBackground(scene) {
    scene.background = new THREE.Color('orange');
}

export function levelTwoBackground(scene) {
    scene.background = new THREE.Color('green');
}

export function levelThreeBackground(scene) {
    scene.background = new THREE.Color('blue');
}