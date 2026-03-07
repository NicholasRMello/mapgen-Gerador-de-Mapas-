/**
 * corridorBuilder.js — Geração de corredores entre salas
 *
 * Responsabilidades:
 *  - Conectar as salas geradas pelo MapGenerator
 *  - Garantir que todas as salas são alcançáveis (grafo conexo)
 *  - Retornar array de Corridor para o Renderer desenhar
 *
 * Estrutura de um Corridor:
 * {
 *   fromRoomId: number,
 *   toRoomId:   number,
 *   points:     [{x, y}],  // pontos do caminho (L-shape, reto, etc.)
 *   width:      number,     // largura do corredor em px
 * }
 *
 * Algoritmos possíveis para implementar:
 *  - Minimum Spanning Tree (Prim ou Kruskal) — garante conexidade mínima
 *  - Delaunay Triangulation — distribuição mais natural
 *  - BSP (Binary Space Partitioning) — clássico de dungeons
 */

const CorridorBuilder = (() => {

  // ---------------------------------------------------
  // build(rooms)
  // Ponto de entrada — recebe salas e retorna corredores.
  //
  // @param {Room[]} rooms
  // @returns {Corridor[]}
  // ---------------------------------------------------
  function build(rooms) {
    // TODO: chamar _buildGraph(rooms) para calcular arestas candidatas

    // TODO: chamar _minimumSpanningTree(edges) para selecionar
    //       apenas as conexões necessárias para grafo conexo

    // TODO: opcionalmente adicionar arestas extras com _addExtraEdges()
    //       para criar ciclos e dar mais opções ao jogador

    // TODO: para cada aresta selecionada, chamar _buildCorridor()
    //       e montar o array de Corridor

    // TODO: atualizar room.connections em cada sala

    // TODO: retornar array de Corridor
  }

  // ---------------------------------------------------
  // _buildGraph(rooms)
  // Cria uma lista de arestas entre todas as salas
  // com a distância entre elas como peso.
  //
  // @returns {{ fromId, toId, distance }[]}
  // ---------------------------------------------------
  function _buildGraph(rooms) {
    // TODO: para cada par (i, j) de salas, calcular distância
    //       entre seus centros (usar MathUtils.distance)

    // TODO: retornar lista de arestas ordenada por distância
  }

  // ---------------------------------------------------
  // _minimumSpanningTree(edges, rooms)
  // Algoritmo de Kruskal ou Prim para grafo conexo mínimo.
  //
  // @returns {{ fromId, toId }[]}  arestas selecionadas
  // ---------------------------------------------------
  function _minimumSpanningTree(edges, rooms) {
    // TODO: implementar Union-Find ou similar para Kruskal

    // TODO: iterar edges ordenadas, adicionar se não fecha ciclo

    // TODO: retornar arestas do MST
  }

  // ---------------------------------------------------
  // _addExtraEdges(mstEdges, allEdges, rooms)
  // Adiciona algumas arestas extras ao MST para
  // criar caminhos alternativos (dungeons mais interessantes).
  //
  // @returns {{ fromId, toId }[]}
  // ---------------------------------------------------
  function _addExtraEdges(mstEdges, allEdges, rooms) {
    // TODO: filtrar arestas que não estão no MST

    // TODO: adicionar aleatoriamente N% delas ao resultado
    //       (N controlado por dificuldade / tamanho do mapa)
  }

  // ---------------------------------------------------
  // _buildCorridor(roomA, roomB)
  // Gera os pontos do caminho entre duas salas.
  // Suporta corredor em L (dois segmentos) ou reto.
  //
  // @returns {Corridor}
  // ---------------------------------------------------
  function _buildCorridor(roomA, roomB) {
    // TODO: calcular centros de roomA e roomB

    // TODO: decidir se o corredor vai: horizontal→vertical ou vertical→horizontal
    //       (pode ser aleatório ou baseado nas posições relativas)

    // TODO: montar array de points com o ponto de inflexão

    // TODO: definir width do corredor

    // TODO: retornar objeto Corridor
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { build };

})();