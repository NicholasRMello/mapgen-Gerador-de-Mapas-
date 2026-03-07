/**
 * renderer.js — Renderização do mapa no Canvas 2D
 *
 * Responsabilidades:
 *  - Desenhar corredores (linhas/retângulos)
 *  - Desenhar salas (PNGs via drawImage)
 *  - Aplicar transformações da câmera (pan + zoom)
 *  - Loop de animação (requestAnimationFrame) se necessário
 *
 * Fluxo de desenho (painter's algorithm — fundo → frente):
 *  1. Limpar canvas
 *  2. Aplicar transformação da câmera
 *  3. Desenhar background / grid
 *  4. Desenhar corredores
 *  5. Desenhar salas (imagens PNG)
 *  6. Desenhar overlays (ícones especiais, highlight de seleção)
 *  7. Restaurar transformação
 */

const Renderer = (() => {

  // Referências ao canvas e contexto
  let _canvas = null;
  let _ctx    = null;

  // Configurações visuais — ajuste ao gosto
  const CONFIG = {
    corridorColor:    '#3a4acc',
    corridorWidth:    16,         // px
    roomBorderColor:  '#5c6bff',
    roomBorderWidth:  2,
    bgColor:          '#0e0f14',
    gridColor:        '#16181f',
    gridCellSize:     40,
    highlightColor:   'rgba(92, 107, 255, 0.4)',
  };

  // ---------------------------------------------------
  // init(canvas, ctx)
  // Configura o renderer com as referências do canvas.
  // ---------------------------------------------------
  function init(canvas, ctx) {
    // TODO: salvar canvas e ctx nas variáveis locais

    // TODO: ajustar canvas.width / canvas.height para o tamanho real
  }

  // ---------------------------------------------------
  // draw(map)
  // Redesenha o mapa completo do zero.
  //
  // @param {object} map  objeto retornado por MapGenerator.generate()
  // ---------------------------------------------------
  function draw(map) {
    // TODO: chamar _clear()

    // TODO: aplicar transformação da câmera (Camera.apply)

    // TODO: chamar _drawBackground()

    // TODO: chamar _drawCorridors(map.corridors)

    // TODO: chamar _drawRooms(map.rooms)

    // TODO: chamar _drawOverlays(map.rooms) para ícones especiais

    // TODO: restaurar transformação (ctx.restore)
  }

  // ---------------------------------------------------
  // _clear()
  // Limpa todo o canvas.
  // ---------------------------------------------------
  function _clear() {
    // TODO: ctx.clearRect(0, 0, canvas.width, canvas.height)

    // TODO: preencher com bgColor
  }

  // ---------------------------------------------------
  // _drawBackground()
  // Desenha o grid de fundo para dar sensação de espaço.
  // ---------------------------------------------------
  function _drawBackground() {
    // TODO: desenhar grid de linhas usando CONFIG.gridCellSize

    // TODO: usar CONFIG.gridColor com opacidade baixa
  }

  // ---------------------------------------------------
  // _drawCorridors(corridors)
  // Desenha todos os corredores como retângulos ou linhas.
  //
  // @param {Corridor[]} corridors
  // ---------------------------------------------------
  function _drawCorridors(corridors) {
    // TODO: para cada corredor, iterar pelos corridor.points

    // TODO: desenhar segmentos de linha ou fillRect entre os pontos

    // TODO: usar CONFIG.corridorColor e CONFIG.corridorWidth

    // TODO: opcionalmente arredondar cantos com arc()
  }

  // ---------------------------------------------------
  // _drawRooms(rooms)
  // Desenha cada sala com seu PNG correspondente.
  //
  // @param {Room[]} rooms
  // ---------------------------------------------------
  function _drawRooms(rooms) {
    // TODO: para cada sala:
    //   - obter imagem via AssetLoader.get(room.assetKey)
    //   - ctx.drawImage(img, room.x, room.y, room.width, room.height)
    //   - desenhar borda com CONFIG.roomBorderColor
    //   - se sala está selecionada, desenhar highlight
  }

  // ---------------------------------------------------
  // _drawOverlays(rooms)
  // Desenha ícones especiais sobre salas específicas
  // (ex.: ícone de início, chefe, tesouro).
  // ---------------------------------------------------
  function _drawOverlays(rooms) {
    // TODO: filtrar salas com type !== 'normal'

    // TODO: para cada sala especial, buscar ícone em AssetLoader.get('icon_...')

    // TODO: desenhar ícone centralizado sobre a sala
    //       (posição: room.x + room.width/2, room.y + room.height/2)
  }

  // ---------------------------------------------------
  // highlightRoom(room)
  // Destaca uma sala específica (ao clicar).
  // Pode ser chamado pelo main.js após detectar clique.
  // ---------------------------------------------------
  function highlightRoom(room) {
    // TODO: desenhar retângulo semi-transparente sobre a sala

    // TODO: opcionalmente redesenhar o mapa inteiro com a sala marcada
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { init, draw, highlightRoom };

})();