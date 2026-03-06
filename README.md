# Candy Defense!

An arcade game where stuffed toy animals try to steal your candy by tying it to balloons. Shoot arrows from your turret to pop the balloons before they escape!

**Play now: https://camfowler.github.io/addison-game/**

## How to Play

Defend your candy for 60 seconds. Toy animals fill up balloons at a pump station, grab a piece of candy, attach it to the balloon, and launch it. Pop the balloons to drop the candy back to the ground. If all 10 candies are stolen, you lose.

### Controls

| Input | Action |
|---|---|
| **Click / Tap / Space** | Shoot arrow toward cursor |
| **Mouse** | Aim cursor |
| **Arrow keys** | Move cursor (keyboard aiming) |
| **1-6** | Activate powers (or tap slots on mobile) |
| **Escape** | Pause |

### Powers

| Key | Power | Cooldown | Effect |
|---|---|---|---|
| **1** | Speedy | 15s | Next 5 arrows travel at high speed with a flat trajectory |
| **2** | Flame | 20s | Next arrow leaves a fire trail that lingers for 10 seconds, igniting balloons |
| **3** | Rapid | 25s | Hold shoot to spray arrows rapidly for 10 seconds |
| **4** | Seeker | 15s | Next 10 arrows home in on the nearest balloon |
| **5** | Cluster | 20s | Fires a large arrow that explodes into 8 arrows at the target point |
| **6** | Freeze | 25s | Freezes all airborne balloons. Shoot a frozen balloon to send it falling into others |

### Balloon Types

- **Normal** — standard balloon, 1 hit to pop
- **Big** — double size, takes 3 hits, arrows ricochet off
- **Splitter** — twin-lobed balloon that splits into two when popped (must pop both to save the candy)
- **Water** — pops with a splash that extinguishes nearby fire

### Other Elements

- **Bombs** — float in from the sides and explode into lava drops that pop balloons on contact. Shoot them to detonate early.

## Development

```
npm install
npm run dev
```

Open the local URL printed by Vite.

## Deployment

The game is deployed to GitHub Pages automatically.

1. Commit your changes and push to `main`:
   ```
   git add .
   git commit -m "Your message"
   git push
   ```

2. This triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which:
   - Installs dependencies (`npm ci`)
   - Builds the project (`npm run build` with `BASE_URL=/addison-game/`)
   - Deploys the `dist/` folder to GitHub Pages

3. The site is live at: **https://camfowler.github.io/addison-game/**

You can monitor the deployment at https://github.com/camfowler/addison-game/actions.

### PWA & Caching

The app includes a service worker (via `vite-plugin-pwa`) that precaches assets for offline use and ensures iOS home screen users receive updates within 24 hours of deployment.

## Tech

- TypeScript + HTML5 Canvas
- Vite + vite-plugin-pwa
- Procedural audio via Web Audio API — no asset files
- Mobile support with touch controls and responsive canvas
