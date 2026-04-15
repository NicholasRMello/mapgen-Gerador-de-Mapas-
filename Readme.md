# MapGen — Procedural Map Generator

A browser-based procedural dungeon map generator built with React + TypeScript and HTML5 Canvas 2D. Create random dungeon maps for tabletop RPGs, game design prototyping, or creative inspiration.

## Features

- **Procedural map generation** — Generates unique dungeon layouts with rooms and corridors using seeded randomness
- **Seed system** — Share seeds to reproduce the exact same map
- **Custom images** — Drag & drop your own room images to personalize the map
- **Annotation pins** — Place pins on corridors with notes for RPG storytelling (obstacles, events, encounters)
- **Pan & zoom** — Navigate the map with mouse drag and scroll wheel
- **Room details** — Click any room to see its properties (type, size, connections)
- **Multilingual** — Toggle between English and Portuguese (PT-BR)

## How to Run (Local)

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the local URL shown in the terminal.

## Build for Production

```bash
npm run build
```

The generated files will be in `dist/`.

## How to Use

1. Optionally drag and drop images into the left sidebar to use as room textures
2. Enter a seed or leave blank for a random one
3. Choose map size (Small / Medium / Large) and click **Generate Map**
4. Pan the map by dragging, zoom with the scroll wheel
5. Click on rooms to see details in the right panel
6. Use the **Add Pin** button to place annotation markers on corridors
7. Toggle language with the **PT-BR / EN** button in the top bar

## Live Demo

Available at: `https://nicholasrmello.github.io/mapgen-Gerador-de-Mapas-/`
