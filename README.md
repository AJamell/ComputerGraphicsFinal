# Helix Jump: 3D Three.js Edition

A arcade-style 3D game built with **Three.js**. Navigate a bouncing ball down a generated tower, rotate the tower to find gaps, and avoid killfield zones.

---

## Game Overview

The objective is simple: reach the bottom of the tower. However, as you progress through the three distinct levels, the platforms become more treacherous, and the game challenges your reflexes.

### Level Environments

1. **Level 1: DK Mountain** – A bright, tropical setting with a clear blue sky.
2. **Level 2: Mario Airport** – A mid-day sun setting with balanced shadows and a bustling runway background.
3. **Level 3: Bowser's Castle** – A high-stakes, dark atmosphere featuring volcanic mists and high-contrast lighting.

---

## How to Play

### Controls

* **Rotate Tower Left:** Press `A`
* **Rotate Tower Right:** Press `D`
* **UI Interaction:** Use the mouse to select levels and navigate the menu.

### Platform Types

* 🟦 **Solid (Blue):** Safe zones. Bouncing here keeps you alive.
* 🟥 **Killfield (Red):** Danger zones. Touching these results in an immediate **Game Over**.
* ⬛ **Empty (Gap):** Your goal. Fall through these to increase your score and descend the tower.

---

## Technical Features

### 1. Level Generation

Every game session is unique. The game uses a **Fisher-Yates Shuffle** to randomize platform layouts based on a level-specific difficulty configuration:

* **Level 1:** More gaps, fewer hazards.
* **Level 3:** Minimal gaps, maximum "killfield" coverage.

### 2. Collision System

The game utilizes a dual-raycasting system to ensure precise landing detection.

* **Left/Right Raycasters:** Determine if the ball is landing on a solid edge or falling through a gap.
* **Animation Sync:** Collisions are processed only when the ball's jump animation reaches its lowest point (`endAnimationDelim`), ensuring visual and logical synchronization.

### 3. Post-Processing & Visuals

* **Pixel Art Style:** Implements `RenderPixelatedPass` for a retro, low-res aesthetic.
* **Dynamic Lighting:** Each level features custom `DirectionalLight` (Sun) intensities and `ACESFilmicToneMapping` to match the background atmosphere.
* **Splat Decals:** Uses `MeshPhongMaterial` with normal maps to create 3D "paint splats" whenever the ball lands.

### 4. Audio Engine

* **Spatial Audio:** Utilizes `THREE.AudioListener` and `THREE.AudioLoader`.
* **Adaptive SFX:** Background music changes based on game state, and landing sounds are triggered dynamically with a mute toggle.

---

## 🚀 Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/AJamell/ComputerGraphicsFinal.git

```

2. **Install dependencies:**
```bash
npm install

```


3. **Build the project:**
```bash
npm run build

```

4. **Run the project:**
```bash
npm run start

```

---

## 📂 Assets & Credits

* **3D Models:** GLB formats for the Bouncing Ball, Fire effects, and Level Maps.
* **Textures:** Splat decals and normal maps for realistic impact visuals.
* **Sound Effects:** Lava splash effects sourced from [OpenGameArt](https://opengameart.org/).


