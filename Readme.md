# MapGen — Procedural Map Generator

Esqueleto de projeto para geração procedural de mapas com Canvas 2D e assets PNG.

---

## Estrutura de Pastas

```
mapgen/
│
├── index.html                  ← Página principal (header + canvas + sidebars)
├── css/
│   └── style.css               ← Tema visual (variáveis CSS, layout)
│
├── assets/
│   ├── rooms/                  ← PNGs de salas (cave.png, dungeon.png, etc.)
│   ├── tiles/                  ← PNGs de tiles de chão/parede
│   └── ui/                     ← Ícones especiais (start.png, boss.png, etc.)
│
└── src/
    ├── main.js                 ← Ponto de entrada: init, eventos, orquestração
    │
    ├── core/
    │   ├── assetLoader.js      ← Carrega PNGs e popula a sidebar
    │   ├── mapGenerator.js     ← Gera salas posicionadas sem sobreposição
    │   └── corridorBuilder.js  ← Conecta salas com corredores (MST + extras)
    │
    ├── render/
    │   ├── renderer.js         ← Desenha tudo no Canvas 2D
    │   └── camera.js           ← Pan e zoom com mouse/touch
    │
    └── utils/
        ├── random.js           ← PRNG seedável (Mulberry32 ou similar)
        └── math.js             ← Geometria: distância, overlap, clamp, lerp
```

---

## Como usar com XAMPP

1. Copie a pasta `mapgen/` para `C:/xampp/htdocs/mapgen/`
2. Inicie o Apache no painel do XAMPP
3. Acesse `http://localhost/mapgen/` no navegador

---

## Fluxo de dados

```
AssetLoader.load()
    ↓
MapGenerator.generate(options)
    ↓ usa Random + MathUtils
    ↓ chama CorridorBuilder.build(rooms)
    ↓
Renderer.draw(map)
    ↓ usa Camera para transformação
    ↓ usa AssetLoader.get(key) para PNGs
```

---

## Ordem de implementação sugerida

1. `utils/random.js`       → base de tudo
2. `utils/math.js`         → funções geométricas
3. `core/assetLoader.js`   → carregar seus PNGs
4. `core/mapGenerator.js`  → posicionar salas
5. `core/corridorBuilder.js` → conectar salas
6. `render/camera.js`      → pan/zoom
7. `render/renderer.js`    → desenhar no canvas
8. `src/main.js`           → ligar tudo

---

## Adicionando seus PNGs

Coloque os arquivos em `assets/rooms/`, `assets/tiles/` ou `assets/ui/`
e registre-os no array `ASSET_MANIFEST` dentro de `assetLoader.js`.