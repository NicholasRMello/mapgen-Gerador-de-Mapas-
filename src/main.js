/**
 * main.js — Ponto de entrada da aplicação
 *
 * Responsabilidades:
 *  - Inicializar todos os módulos na ordem correta
 *  - Capturar eventos dos controles do header
 *  - Orquestrar o ciclo de geração → renderização
 */

// -----------------------------------------------
// Estado global da aplicação
// Centralize aqui tudo que precisa ser compartilhado
// entre módulos sem bibliotecas externas
// -----------------------------------------------
const AppState = {
  map:      null,   // objeto retornado pelo MapGenerator
  seed:     null,   // seed atual (string ou número)
  canvas:   null,   // referência ao elemento <canvas>
  ctx:      null,   // contexto 2D do canvas
  camera:   null,   // instância do Camera
  assets:   null,   // assets carregados pelo AssetLoader
};

// -----------------------------------------------
// init()
// Chamada uma vez quando o DOM está pronto.
// -----------------------------------------------
function init() {
  // TODO: obter referência ao canvas e criar o contexto 2D

  // TODO: chamar AssetLoader.load() e aguardar os PNGs carregarem

  // TODO: instanciar Camera e configurar tamanho inicial

  // TODO: registrar event listeners (botões, resize, cliques no canvas)

  // TODO: chamar Renderer.init(canvas, ctx)

  // TODO: exibir mensagem inicial no status do header
}

// -----------------------------------------------
// onGenerateClick()
// Disparado pelo botão "Gerar Mapa" no header.
// -----------------------------------------------
function onGenerateClick() {
  // TODO: ler seed do input (ou gerar aleatória via Random.seed())

  // TODO: ler tamanho selecionado no <select>

  // TODO: exibir overlay de loading no canvas

  // TODO: chamar MapGenerator.generate(options) e salvar em AppState.map

  // TODO: passar o mapa gerado para Renderer.draw(map)

  // TODO: atualizar o painel de status no header com seed e nº de salas

  // TODO: esconder overlay de loading
}

// -----------------------------------------------
// onClearClick()
// Disparado pelo botão "Limpar".
// -----------------------------------------------
function onClearClick() {
  // TODO: limpar o canvas (ctx.clearRect)

  // TODO: resetar AppState.map para null

  // TODO: limpar painel de detalhes e debug

  // TODO: atualizar status text do header
}

// -----------------------------------------------
// onCanvasClick(event)
// Detecta qual sala foi clicada no canvas.
// -----------------------------------------------
function onCanvasClick(event) {
  // TODO: converter coordenadas do clique para coordenadas de mapa
  //       levando em conta a posição/zoom da câmera

  // TODO: iterar pelas salas do AppState.map para detectar hit

  // TODO: exibir detalhes da sala clicada no #panel-info
}

// -----------------------------------------------
// onWindowResize()
// Redimensiona o canvas quando a janela muda.
// -----------------------------------------------
function onWindowResize() {
  // TODO: atualizar width/height do canvas para preencher #canvas-wrapper

  // TODO: notificar Renderer para re-renderizar o frame atual
}

// -----------------------------------------------
// updateDebugPanel(data)
// Exibe dados internos no #debug-output.
// -----------------------------------------------
function updateDebugPanel(data) {
  // TODO: serializar `data` como JSON formatado

  // TODO: injetar no elemento #debug-output
}

// -----------------------------------------------
// Inicializar quando o DOM estiver pronto
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', init);