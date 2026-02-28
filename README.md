# Balloon Pop

An arcade game where balloons float up from the bottom of the screen and you shoot arrows to pop them before they escape off the top.

## How to Play

Balloons rise from the bottom of the screen. Click (or press Space) to launch arrows in an arc toward your cursor. Arrows pierce through multiple balloons, so line up your shots. Some balloons are filled with water — they pop with a splash and the falling water extinguishes any nearby fire.

Triple balloons spawn as tight clusters of three — each one pops individually.

### Controls

| Input | Action |
|---|---|
| **Click** / **Space** | Shoot arrow toward cursor |
| **Mouse** | Aim cursor |
| **Arrow keys** | Move cursor (keyboard aiming) |
| **1** | Speedy Arrows |
| **2** | Flame Trail |
| **3** | Rapid Fire |
| **4** | Seeker Arrows |

### Powers

| Key | Power | Effect |
|---|---|---|
| **1** | Speedy Arrows | Next 5 arrows travel at 3x speed with a flat trajectory |
| **2** | Flame Trail | Next arrow leaves a trail of fire that lingers for 5 seconds. Balloons that touch the fire catch alight and pop after 2 seconds. Water balloons extinguish the fire below them when popped |
| **3** | Rapid Fire | Hold shoot to spray arrows rapidly for 10 seconds. Arrows have reduced accuracy (random spread) |
| **4** | Seeker Arrows | Next 10 arrows are slow homing arrows that steer toward the nearest balloon |

## Running

```
npm install
npm run dev
```

Open the local URL printed by Vite.

## Building

```
npm run build
```

## Tech

- TypeScript
- HTML5 Canvas (800x600)
- Vite
- All audio is procedurally generated via Web Audio API — no asset files
