/**
 * corridorBuilder.js — Geração de corredores entre salas
 *
 * Responsabilidades:
 *  - Conectar as salas geradas pelo MapGenerator
 *  - Garantir que todas as salas são alcançáveis (grafo conexo)
 *  - Rotear corredores que NÃO cruzem outras salas
 *  - Retornar array de Corridor para o Renderer desenhar
 *
 * Estrutura de um Corridor:
 * {
 *   fromRoomId: number,
 *   toRoomId:   number,
 *   points:     [{x, y}],  // 3 ou 4 pontos (saída → bends → entrada)
 *   width:      number,
 * }
 *
 * Sistema de saídas por lado:
 *  Cada sala tem 4 lados possíveis: 'right', 'left', 'bottom', 'top'.
 *  Cada lado é ocupado no máximo UMA VEZ (máximo 4 saídas por sala).
 *  O lado preferido é determinado pela direção relativa entre salas.
 *
 * Algoritmo de conexão: Kruskal (Minimum Spanning Tree)
 *  1. Todas as arestas com peso = distância Euclidiana
 *  2. Union-Find para construir MST sem ciclos
 *  3. Arestas extras opcionais (~15%) para criar caminhos alternativos
 *
 * Roteamento com detecção de cruzamento:
 *  Para cada corredor, são testados até N candidatos de roteamento.
 *  O primeiro que não atravessa nenhuma sala é escolhido.
 *  Com posicionamento em grade (mapGenerator), a maioria usa o
 *  candidato primário sem precisar de fallback.
 */

const CorridorBuilder = (() => {

  const CORRIDOR_WIDTH = 16;   // largura dos corredores em pixels
  const HALF_W         = CORRIDOR_WIDTH / 2;

  // ---------------------------------------------------
  // build(rooms)
  // Ponto de entrada público.
  //
  // @param {Room[]} rooms  salas geradas pelo MapGenerator
  // @returns {Corridor[]}
  // ---------------------------------------------------
  function build(rooms) {
    if (rooms.length < 2) return [];

    const allEdges  = _buildGraph(rooms);
    const mstEdges  = _minimumSpanningTree(allEdges, rooms);
    const finalEdges = _addExtraEdges(mstEdges, allEdges);

    // Rastreia lados já ocupados por sala: { roomId → Set<side> }
    const usedSides = {};
    rooms.forEach(r => { usedSides[r.id] = new Set(); });

    return finalEdges.map(edge => {
      const roomA = rooms.find(r => r.id === edge.fromId);
      const roomB = rooms.find(r => r.id === edge.toId);

      if (!roomA.connections.includes(roomB.id)) roomA.connections.push(roomB.id);
      if (!roomB.connections.includes(roomA.id)) roomB.connections.push(roomA.id);

      // Passa todas as salas para verificação de cruzamento
      return _buildCorridor(roomA, roomB, usedSides, rooms);
    });
  }

  // ---------------------------------------------------
  // _buildGraph(rooms)
  // Gera todas as arestas possíveis ordenadas por distância crescente.
  //
  // @returns {{ fromId, toId, distance }[]}
  // ---------------------------------------------------
  function _buildGraph(rooms) {
    const edges = [];
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        edges.push({
          fromId:   rooms[i].id,
          toId:     rooms[j].id,
          distance: MathUtils.distance(
            MathUtils.rectCenter(rooms[i]),
            MathUtils.rectCenter(rooms[j])
          ),
        });
      }
    }
    edges.sort((a, b) => a.distance - b.distance);
    return edges;
  }

  // ---------------------------------------------------
  // _minimumSpanningTree(edges, rooms)
  // Kruskal com Union-Find — garante grafo conexo mínimo.
  //
  // @returns {{ fromId, toId }[]}
  // ---------------------------------------------------
  function _minimumSpanningTree(edges, rooms) {
    const parent = {};
    rooms.forEach(r => { parent[r.id] = r.id; });

    function find(id) {
      if (parent[id] !== id) parent[id] = find(parent[id]);
      return parent[id];
    }

    function union(a, b) {
      const ra = find(a), rb = find(b);
      if (ra === rb) return false;
      parent[ra] = rb;
      return true;
    }

    const mst = [];
    edges.forEach(e => { if (union(e.fromId, e.toId)) mst.push(e); });
    return mst;
  }

  // ---------------------------------------------------
  // _addExtraEdges(mstEdges, allEdges)
  // Adiciona ~15% de arestas extras para criar ciclos alternativos.
  //
  // @returns {{ fromId, toId }[]}
  // ---------------------------------------------------
  function _addExtraEdges(mstEdges, allEdges) {
    const mstSet = new Set(
      mstEdges.map(e => `${Math.min(e.fromId, e.toId)}-${Math.max(e.fromId, e.toId)}`)
    );

    const extras = allEdges
      .filter(e => !mstSet.has(`${Math.min(e.fromId, e.toId)}-${Math.max(e.fromId, e.toId)}`))
      .filter(() => Random.next() < 0.15);

    return [...mstEdges, ...extras.map(e => ({ fromId: e.fromId, toId: e.toId }))];
  }

  // ---------------------------------------------------
  // _chooseSide(room, targetCenter, usedSides)
  // Escolhe qual lado de `room` usar para a saída do corredor,
  // levando em conta a direção relativa e os lados já ocupados.
  //
  // Ordem de preferência (baseada no ângulo do vetor A→B):
  //  B à direita  → ['right', 'top', 'bottom', 'left']
  //  B à esquerda → ['left',  'top', 'bottom', 'right']
  //  B abaixo     → ['bottom','right','left',  'top'  ]
  //  B acima      → ['top',   'right','left',  'bottom']
  //
  // @param {Room} room
  // @param {{x,y}} targetCenter
  // @param {object} usedSides  { roomId → Set<string> }
  // @returns {string}
  // ---------------------------------------------------
  function _chooseSide(room, targetCenter, usedSides) {
    const center = MathUtils.rectCenter(room);
    const dx     = targetCenter.x - center.x;
    const dy     = targetCenter.y - center.y;

    const preferred = Math.abs(dx) >= Math.abs(dy)
      ? (dx >= 0 ? ['right','top','bottom','left'] : ['left','top','bottom','right'])
      : (dy >= 0 ? ['bottom','right','left','top'] : ['top','right','left','bottom']);

    const chosen = preferred.find(s => !usedSides[room.id].has(s)) || preferred[0];
    usedSides[room.id].add(chosen);
    return chosen;
  }

  // ---------------------------------------------------
  // _getExitPoint(room, side)
  // Calcula o ponto no centro da borda escolhida da sala.
  //
  //   right  → (x+w,      cy,   axis='h')
  //   left   → (x,        cy,   axis='h')
  //   bottom → (cx,       y+h,  axis='v')
  //   top    → (cx,       y,    axis='v')
  //
  // @returns {{x, y, axis: 'h'|'v'}}
  // ---------------------------------------------------
  function _getExitPoint(room, side) {
    const cx = room.x + room.width  / 2;
    const cy = room.y + room.height / 2;
    switch (side) {
      case 'right':  return { x: room.x + room.width,  y: cy,              axis: 'h' };
      case 'left':   return { x: room.x,               y: cy,              axis: 'h' };
      case 'bottom': return { x: cx,                   y: room.y + room.height, axis: 'v' };
      case 'top':    return { x: cx,                   y: room.y,          axis: 'v' };
    }
  }

  // ---------------------------------------------------
  // _segmentCrossesRoom(p1, p2, room)
  // Verifica se o segmento retilíneo p1→p2 (horizontal ou vertical)
  // cruza o retângulo `room`, considerando a espessura do corredor.
  //
  // O retângulo da sala é expandido por HALF_W para simular a espessura.
  //
  // @param {{x,y}} p1
  // @param {{x,y}} p2
  // @param {Room}  room
  // @returns {boolean}
  // ---------------------------------------------------
  function _segmentCrossesRoom(p1, p2, room) {
    // Expande os limites da sala pela metade da largura do corredor
    const rx1 = room.x          - HALF_W;
    const ry1 = room.y          - HALF_W;
    const rx2 = room.x + room.width  + HALF_W;
    const ry2 = room.y + room.height + HALF_W;

    if (p1.y === p2.y) {
      // Segmento HORIZONTAL na altura y = p1.y
      const y  = p1.y;
      const x1 = Math.min(p1.x, p2.x);
      const x2 = Math.max(p1.x, p2.x);
      return (y > ry1 && y < ry2 && x2 > rx1 && x1 < rx2);
    } else {
      // Segmento VERTICAL na posição x = p1.x
      const x  = p1.x;
      const y1 = Math.min(p1.y, p2.y);
      const y2 = Math.max(p1.y, p2.y);
      return (x > rx1 && x < rx2 && y2 > ry1 && y1 < ry2);
    }
  }

  // ---------------------------------------------------
  // _pathIsBlocked(points, rooms)
  // Verifica se algum segmento do caminho cruza uma sala da lista.
  //
  // @param {{x,y}[]} points  pontos consecutivos do caminho
  // @param {Room[]}  rooms   salas a verificar (já exclui A e B)
  // @returns {boolean}
  // ---------------------------------------------------
  function _pathIsBlocked(points, rooms) {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // Segmentos degenerados (ponto igual) são sempre livres
      if (p1.x === p2.x && p1.y === p2.y) continue;

      for (const room of rooms) {
        if (_segmentCrossesRoom(p1, p2, room)) return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------
  // _buildCorridor(roomA, roomB, usedSides, allRooms)
  // Constrói o corredor entre duas salas tentando rotas
  // que não cruzem outras salas.
  //
  // Lógica de roteamento por eixo:
  //
  //  H→H (ambos laterais):  S-shape com split vertical em midX
  //    candidatos: centro, perto de A, perto de B, fora à esq, fora à dir
  //
  //  V→V (ambos verticais): S-shape com split horizontal em midY
  //    candidatos: centro, perto de A, perto de B, fora acima, fora abaixo
  //
  //  H→V ou V→H:            L-shape com cotovelo em (exitB.x, exitA.y)
  //                          ou (exitA.x, exitB.y)                         (2 opções)
  //
  // Para cada candidato, verifica cruzamento com outras salas.
  // Retorna o primeiro candidato limpo, ou o primário como fallback.
  //
  // @param {Room}   roomA
  // @param {Room}   roomB
  // @param {object} usedSides  { roomId → Set<string> }
  // @param {Room[]} allRooms   usada para testes de cruzamento
  // @returns {Corridor}
  // ---------------------------------------------------
  function _buildCorridor(roomA, roomB, usedSides, allRooms) {
    const centerA = MathUtils.rectCenter(roomA);
    const centerB = MathUtils.rectCenter(roomB);

    const sideA = _chooseSide(roomA, centerB, usedSides);
    const sideB = _chooseSide(roomB, centerA, usedSides);

    const exitA = _getExitPoint(roomA, sideA);
    const exitB = _getExitPoint(roomB, sideB);

    // Salas a verificar: todas menos A e B (o corredor PODE tocar A e B)
    const others = allRooms.filter(r => r.id !== roomA.id && r.id !== roomB.id);

    // ---- Gera candidatos de roteamento ----
    const candidates = [];

    if (exitA.axis === exitB.axis) {
      if (exitA.axis === 'h') {
        // H→H: S-shape, split no eixo X
        // Testa 5 valores de midX: centro, próximo de A, próximo de B, exterior esq/dir
        const midCenter = (exitA.x + exitB.x) / 2;
        const left  = Math.min(exitA.x, exitB.x) - 80;
        const right = Math.max(exitA.x, exitB.x) + 80;

        [midCenter,
         exitA.x + (exitB.x - exitA.x) * 0.25,
         exitA.x + (exitB.x - exitA.x) * 0.75,
         left,
         right,
        ].forEach(midX => {
          candidates.push([
            { x: exitA.x, y: exitA.y },
            { x: midX,    y: exitA.y },
            { x: midX,    y: exitB.y },
            { x: exitB.x, y: exitB.y },
          ]);
        });

      } else {
        // V→V: S-shape, split no eixo Y
        const midCenter = (exitA.y + exitB.y) / 2;
        const top    = Math.min(exitA.y, exitB.y) - 80;
        const bottom = Math.max(exitA.y, exitB.y) + 80;

        [midCenter,
         exitA.y + (exitB.y - exitA.y) * 0.25,
         exitA.y + (exitB.y - exitA.y) * 0.75,
         top,
         bottom,
        ].forEach(midY => {
          candidates.push([
            { x: exitA.x, y: exitA.y },
            { x: exitA.x, y: midY    },
            { x: exitB.x, y: midY    },
            { x: exitB.x, y: exitB.y },
          ]);
        });
      }

    } else {
      // L-shape: eixos diferentes — apenas 2 orientações possíveis
      if (exitA.axis === 'h') {
        // A sai horizontal: cotovelo em (exitB.x, exitA.y)
        candidates.push([
          { x: exitA.x, y: exitA.y },
          { x: exitB.x, y: exitA.y },
          { x: exitB.x, y: exitB.y },
        ]);
        // Alternativa: contorna pelo Y de B primeiro (extra bend)
        const midX = (exitA.x + exitB.x) / 2;
        candidates.push([
          { x: exitA.x, y: exitA.y },
          { x: midX,    y: exitA.y },
          { x: midX,    y: exitB.y },
          { x: exitB.x, y: exitB.y },
        ]);
      } else {
        // A sai vertical: cotovelo em (exitA.x, exitB.y)
        candidates.push([
          { x: exitA.x, y: exitA.y },
          { x: exitA.x, y: exitB.y },
          { x: exitB.x, y: exitB.y },
        ]);
        // Alternativa: contorna pelo X de B primeiro (extra bend)
        const midY = (exitA.y + exitB.y) / 2;
        candidates.push([
          { x: exitA.x, y: exitA.y },
          { x: exitA.x, y: midY    },
          { x: exitB.x, y: midY    },
          { x: exitB.x, y: exitB.y },
        ]);
      }
    }

    // ---- Escolhe o primeiro candidato que não cruza salas ----
    let chosen = candidates[0]; // fallback: primeiro candidato (nunca undefined)

    for (const pts of candidates) {
      if (!_pathIsBlocked(pts, others)) {
        chosen = pts;
        break;
      }
    }

    return {
      fromRoomId: roomA.id,
      toRoomId:   roomB.id,
      points:     chosen,
      width:      CORRIDOR_WIDTH,
    };
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { build };

})();
