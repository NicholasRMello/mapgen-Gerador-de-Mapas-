/**
 * main.js — Ponto de entrada e orquestrador da aplicação
 *
 * Responsabilidades:
 *  - Inicializar todos os módulos na ordem correta
 *  - Capturar eventos dos controles do header (botões, inputs)
 *  - Gerenciar o drag-and-drop de imagens do usuário
 *  - Orquestrar o ciclo: seed → gerar mapa → renderizar
 *  - Atualizar os painéis de status e debug no HTML
 *
 * Ordem de dependência entre módulos:
 *   Random → MathUtils → AssetLoader + UserAssets → MapGenerator + CorridorBuilder → Renderer + Camera → Main
 */

// -----------------------------------------------
// Estado global da aplicação
// Centraliza tudo que precisa ser compartilhado
// entre módulos sem bibliotecas externas.
// -----------------------------------------------
const AppState = {
  map:      null,   // objeto completo retornado pelo MapGenerator.generate()
  seed:     null,   // seed atual usada para gerar o mapa (string ou número)
  canvas:   null,   // referência ao elemento <canvas id="map-canvas">
  ctx:      null,   // contexto 2D obtido de canvas.getContext('2d')
  _pinMode: false,  // quando true, o próximo clique no canvas insere um pino
};

// Posição do mousedown para diferenciar clique de drag (pan da câmera).
// Se o mouse se mover mais que 5px, o click é ignorado.
let _mouseDownPos = null;

// -----------------------------------------------
// init()
// Função de inicialização chamada uma vez quando o DOM está pronto.
// Configura canvas, módulos, drop zone e event listeners.
// -----------------------------------------------
function init() {
  // Obtém a referência ao elemento canvas do HTML
  AppState.canvas = document.getElementById('map-canvas');

  // Cria o contexto 2D para todas as operações de desenho
  AppState.ctx = AppState.canvas.getContext('2d');

  // Inicializa o Renderer com as referências de canvas e contexto
  Renderer.init(AppState.canvas, AppState.ctx);

  // Inicializa a Camera passando o canvas e a função de redesenho como callback
  // A câmera chamará Renderer.redraw() sempre que o usuário mover ou der zoom
  Camera.init(AppState.canvas, () => Renderer.redraw());

  // Inicializa o módulo de assets do usuário.
  // O callback _renderAssetSidebar é chamado automaticamente toda vez
  // que o usuário adiciona, remove ou altera o tipo de uma imagem.
  UserAssets.init(_renderAssetSidebar);

  // Inicializa o módulo de pinos de anotação.
  // O callback é chamado em add/remove/clear — atualiza a sidebar e o canvas.
  PinManager.init((pins) => {
    _renderPinSidebar(pins);
    Renderer.setPins(pins);
    Renderer.redraw();
  });

  // Configura o sistema de seções retráteis (accordion) da sidebar esquerda
  _initSidebarSections();

  // Configura o botão "Adicionar Pino" (toggle de modo de inserção)
  _initPinMode();

  // Configura o drop zone e o input de arquivo na sidebar esquerda
  _initDropZone();

  // Renderiza as sidebars vazias antes de qualquer upload ou adição
  _renderAssetSidebar([]);
  _renderPinSidebar([]);

  // Configura o fechamento do modal de preview de imagem:
  // clicar no backdrop ou no botão ✕ fecha o modal
  const backdrop   = document.getElementById('img-preview-backdrop');
  const closeBtn   = document.getElementById('img-preview-close');
  if (backdrop) backdrop.addEventListener('click', _closeImagePreview);
  if (closeBtn) closeBtn.addEventListener('click',  _closeImagePreview);

  // Tecla ESC também fecha o modal de preview
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeImagePreview();
  });

  // Carrega todos os PNGs estáticos do AssetLoader (fallback)
  AssetLoader.load().then(() => {
    // Registra os event listeners dos controles do header
    document.getElementById('btn-generate').addEventListener('click', onGenerateClick);
    document.getElementById('btn-clear').addEventListener('click', onClearClick);

    // Detecta cliques no canvas para selecionar salas
    AppState.canvas.addEventListener('click', onCanvasClick);

    // Rastreia a posição do mousedown para diferenciar clique de drag.
    // Se o usuário arrastou o mapa (pan), o click handler será ignorado.
    AppState.canvas.addEventListener('mousedown', (e) => {
      const rect = AppState.canvas.getBoundingClientRect();
      _mouseDownPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });

    // Atualiza o canvas ao redimensionar a janela
    window.addEventListener('resize', onWindowResize);

    // Faz o canvas preencher o contêiner inicialmente
    onWindowResize();

    // Exibe mensagem de boas-vindas no status do header
    _setStatus('Adicione imagens na sidebar e clique em "Gerar Mapa".');
  });
}

// -----------------------------------------------
// _initDropZone()
// Configura o drop zone com todos os event listeners
// necessários para arrastar arquivos de imagem do
// computador para o painel de assets.
//
// Suporta duas formas de upload:
//  1. Arrastar arquivos diretamente para o div#drop-zone
//  2. Clicar no div para abrir o seletor de arquivo nativo
// -----------------------------------------------
function _initDropZone() {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (!dropZone || !fileInput) return;

  // ---- Drag & drop via mouse ----

  // Previne o comportamento padrão do browser (abrir o arquivo na aba)
  // e adiciona a classe visual de "arquivo por cima"
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  // Remove o destaque quando o arquivo sai da área sem soltar
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  // Processa os arquivos soltos na zona de drop
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    // Lê os arquivos do evento de drop e envia para o UserAssets
    const files = Array.from(e.dataTransfer.files);
    _processFiles(files);
  });

  // ---- Seleção via clique ----

  // Ao clicar no drop zone, aciona o input[type=file] oculto
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Processa os arquivos selecionados pelo seletor de arquivo
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    _processFiles(files);

    // Limpa o valor do input para permitir selecionar o mesmo arquivo novamente
    fileInput.value = '';
  });
}

// -----------------------------------------------
// _processFiles(files)
// Envia um array de Files para o UserAssets.
// Ignora erros individuais (arquivo inválido) sem travar os demais.
//
// @param {File[]} files
// -----------------------------------------------
function _processFiles(files) {
  files.forEach(file => {
    UserAssets.add(file).catch(err => {
      // Erro silencioso — o aviso já foi logado pelo UserAssets
      console.warn('[main] Arquivo ignorado:', err.message);
    });
  });
}

// -----------------------------------------------
// _renderAssetSidebar(assets)
// Redesenha a lista de cards na sidebar esquerda
// com base no array atual de UserAssets.
//
// Cada card exibe:
//  - Miniatura da imagem
//  - Nome do arquivo (truncado)
//  - Seletor de tipo de sala (any/normal/start/end/boss)
//  - Botão de remover (✕)
//
// Esta função é passada como callback para UserAssets.init()
// e chamada automaticamente sempre que o estado mudar.
//
// @param {UserAsset[]} assets  array atual retornado por UserAssets
// -----------------------------------------------
function _renderAssetSidebar(assets) {
  const list = document.getElementById('user-asset-list');
  if (!list) return;

  // Limpa a lista anterior
  list.innerHTML = '';

  // Sem assets: exibe mensagem de ajuda
  if (assets.length === 0) {
    const hint = document.createElement('p');
    hint.className   = 'ua-empty-hint';
    hint.textContent = 'Nenhuma imagem carregada.\nArraste arquivos para a área acima.';
    list.appendChild(hint);
    return;
  }

  // Cria um card para cada asset carregado
  assets.forEach(asset => {
    // Contêiner do card
    const card = document.createElement('div');
    card.className      = 'ua-card';
    card.dataset.assetId = asset.id;

    // Miniatura da imagem
    const thumb = document.createElement('img');
    thumb.className = 'ua-card-thumb';
    thumb.src       = asset.dataURL;
    thumb.alt       = asset.name;
    // Clicar na miniatura abre o modal de preview ampliado
    thumb.style.cursor = 'zoom-in';
    thumb.addEventListener('click', (e) => {
      e.stopPropagation(); // evita propagar para o card
      _openImagePreview(asset.dataURL);
    });

    // Coluna central com nome e seletor de tipo
    const info = document.createElement('div');
    info.className = 'ua-card-info';

    // Nome do arquivo (truncado via CSS)
    const nameEl = document.createElement('span');
    nameEl.className   = 'ua-card-name';
    nameEl.textContent = asset.name;
    nameEl.title       = asset.name;  // tooltip com nome completo

    // Seletor do tipo de sala — define quais salas podem usar esta imagem
    const typeSelect = document.createElement('select');
    typeSelect.className = 'ua-type-select';

    // Opções de tipo disponíveis
    const typeOptions = [
      { value: 'any',    label: 'Qualquer sala' },
      { value: 'normal', label: 'Normal'        },
      { value: 'start',  label: 'Início'        },
      { value: 'end',    label: 'Final'         },
      { value: 'boss',   label: 'Boss'          },
    ];

    typeOptions.forEach(opt => {
      const option       = document.createElement('option');
      option.value       = opt.value;
      option.textContent = opt.label;
      // Pré-seleciona o tipo atual do asset
      if (opt.value === asset.type) option.selected = true;
      typeSelect.appendChild(option);
    });

    // Ao mudar o tipo, notifica o UserAssets e atualiza o estado
    typeSelect.addEventListener('change', () => {
      UserAssets.setType(asset.id, typeSelect.value);
    });

    // Botão de remover o asset
    const removeBtn  = document.createElement('button');
    removeBtn.className   = 'ua-remove';
    removeBtn.textContent = '✕';
    removeBtn.title       = `Remover "${asset.name}"`;

    removeBtn.addEventListener('click', () => {
      UserAssets.remove(asset.id);
    });

    // Monta o card na ordem: miniatura | info (nome + tipo) | botão ✕
    info.appendChild(nameEl);
    info.appendChild(typeSelect);
    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(removeBtn);
    list.appendChild(card);
  });
}

// -----------------------------------------------
// onGenerateClick()
// Disparada pelo botão "Gerar Mapa" no header.
// Lê seed e tamanho, gera o mapa e renderiza.
// -----------------------------------------------
function onGenerateClick() {
  // Lê o valor digitado no campo de seed
  const seedInput = document.getElementById('input-seed').value.trim();

  // Se o campo estiver vazio, gera uma seed aleatória legível (ex.: "CAVE-4821")
  const seed = seedInput !== '' ? seedInput : Random.generateSeedString();

  // Atualiza o campo de input com a seed usada (para o usuário ver qual foi usada)
  document.getElementById('input-seed').value = seed;

  // Lê o tamanho de mapa selecionado no dropdown
  const size = document.getElementById('select-size').value;

  // Exibe o overlay de "Gerando mapa..." no canvas durante o processamento
  _setOverlayVisible(true);

  // Usa setTimeout para permitir que o overlay seja renderizado antes do JS bloquear
  // (a geração é síncrona e pesada para mapas grandes)
  setTimeout(() => {
    // Gera o mapa com os parâmetros selecionados.
    // Passa UserAssets para que o gerador use as imagens do usuário
    // ao atribuir visuais às salas proceduralmente.
    AppState.map  = MapGenerator.generate({
      seed,
      size,
      assets:     AssetLoader,   // fallback para PNGs estáticos
      userAssets: UserAssets,    // imagens carregadas pelo usuário
    });
    AppState.seed = seed;

    // Reseta a câmera e centraliza na sala de início do mapa gerado
    Camera.reset();
    const startRoom = AppState.map.rooms.find(r => r.type === 'start');
    if (startRoom) {
      // Encontra o centro da sala de início para centralizar a câmera
      const cx = startRoom.x + startRoom.width  / 2;
      const cy = startRoom.y + startRoom.height / 2;
      Camera.centerOn(cx, cy, AppState.canvas.width, AppState.canvas.height);
    }

    // Renderiza o mapa no canvas
    Renderer.draw(AppState.map);

    // Esconde o overlay de loading
    _setOverlayVisible(false);

    // Monta informação sobre uso de user assets no status
    const userAssetCount = UserAssets.getAll().length;
    const assetInfo      = userAssetCount > 0
      ? ` | ${userAssetCount} imagem(ns) customizada(s)`
      : '';

    // Atualiza o status no header com seed e quantidade de salas geradas
    _setStatus(`Seed: ${seed} | Salas: ${AppState.map.rooms.length} | Corredores: ${AppState.map.corridors.length}${assetInfo}`);

    // Exibe os dados brutos do mapa no painel de debug
    updateDebugPanel({
      seed:        AppState.map.seed,
      size,
      rooms:       AppState.map.rooms.length,
      corridors:   AppState.map.corridors.length,
      mapWidth:    AppState.map.width,
      mapHeight:   AppState.map.height,
      userAssets:  userAssetCount,
    });
  }, 10); // atraso mínimo de 10ms para o browser renderizar o overlay
}

// -----------------------------------------------
// onClearClick()
// Disparada pelo botão "Limpar" no header.
// Remove o mapa do estado e limpa o canvas.
// Os assets do usuário NÃO são removidos ao limpar —
// o usuário os gerencia diretamente na sidebar.
// -----------------------------------------------
function onClearClick() {
  // Remove o mapa do estado global
  AppState.map  = null;
  AppState.seed = null;

  // Reseta a câmera para a posição e zoom iniciais
  Camera.reset();

  // Limpa todos os pinos de anotação (posições perdem sentido sem o mapa)
  PinManager.clear();
  Renderer.setPins([]);

  // Redesenha (com mapa nulo, apenas mostra o fundo)
  Renderer.draw(null);

  // Limpa o painel de detalhes da sala
  document.getElementById('room-details').innerHTML = '<p>Clique em uma sala para ver detalhes.</p>';

  // Limpa o painel de debug
  document.getElementById('debug-output').textContent = '';

  // Limpa o campo de seed
  document.getElementById('input-seed').value = '';

  // Restaura a mensagem padrão no status do header
  const userAssetCount = UserAssets.getAll().length;
  _setStatus(userAssetCount > 0
    ? `${userAssetCount} imagem(ns) carregada(s). Clique em "Gerar Mapa".`
    : 'Adicione imagens na sidebar e clique em "Gerar Mapa".'
  );
}

// -----------------------------------------------
// onCanvasClick(event)
// Detecta qual sala foi clicada no canvas.
// Converte coordenadas de tela para coordenadas do mapa
// e verifica hit-test em cada sala.
// -----------------------------------------------
function onCanvasClick(event) {
  // Sem mapa gerado, não há nada para clicar
  if (!AppState.map) return;

  // Calcula a posição do clique relativa ao canvas (não à janela inteira)
  const rect    = AppState.canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;

  // ── Detecção de drag: se o mouse se moveu mais de 5px desde o mousedown,
  // o usuário estava arrastando para mover a câmera — ignorar o click.
  if (_mouseDownPos) {
    const dx = screenX - _mouseDownPos.x;
    const dy = screenY - _mouseDownPos.y;
    if (Math.hypot(dx, dy) > 5) return;
  }

  // Converte coordenadas de tela para coordenadas do mapa
  // levando em conta pan e zoom da câmera
  const worldPos = Camera.screenToWorld(screenX, screenY);

  // ── Prioridade 1: verificar clique em pino existente (sempre, em qualquer modo)
  // O círculo do pino está centrado em (pin.x, pin.y - 12); raio de hit = 10px
  const pins = PinManager.getAll();
  for (const pin of pins) {
    const dist = Math.hypot(worldPos.x - pin.x, worldPos.y - (pin.y - 12));
    if (dist <= 10) {
      // Encontrou um pino: exibe detalhes no painel direito
      _showPinDetails(pin);
      // Expande a seção de pinos e scrolla até o card
      _expandSection('section-pins');
      _scrollToPinCard(pin.id);
      return;
    }
  }

  // ── Prioridade 2: se o modo pino estiver ativo, inserir novo pino
  // Pinos só podem ser colocados em corredores!
  if (AppState._pinMode) {
    if (_isOnCorridor(worldPos)) {
      const pin = PinManager.add(worldPos.x, worldPos.y);
      // Desativa o modo pino automaticamente após colocar
      _deactivatePinMode();
      // Abre a seção de pinos e scrolla até o novo card
      _expandSection('section-pins');
      _scrollToPinCard(pin.id);
    }
    return;
  }

  // ── Prioridade 3: hit-test nas salas do mapa
  const clickedRoom = AppState.map.rooms.find(room =>
    MathUtils.pointInRect(worldPos, room)
  );

  if (clickedRoom) {
    // Exibe os detalhes da sala clicada no painel direito
    _showRoomDetails(clickedRoom);

    // Aciona o highlight visual da sala no canvas
    Renderer.highlightRoom(clickedRoom);
  } else {
    // Clicou em área vazia: limpa a seleção
    document.getElementById('room-details').innerHTML = '<p>Clique em uma sala para ver detalhes.</p>';
    Renderer.highlightRoom(null);
  }
}

// -----------------------------------------------
// onWindowResize()
// Redimensiona o canvas quando a janela muda de tamanho.
// -----------------------------------------------
function onWindowResize() {
  Renderer.resizeCanvas();
}

// -----------------------------------------------
// updateDebugPanel(data)
// Exibe dados internos formatados no painel #debug-output.
//
// @param {object} data  qualquer objeto serializável
// -----------------------------------------------
function updateDebugPanel(data) {
  const formatted = JSON.stringify(data, null, 2);
  document.getElementById('debug-output').textContent = formatted;
}

// -----------------------------------------------
// _showRoomDetails(room)
// Exibe as propriedades de uma sala no painel #room-details.
// Inclui informação sobre a imagem (user asset ou asset estático).
//
// @param {Room} room
// -----------------------------------------------
function _showRoomDetails(room) {
  // Determina qual imagem está sendo usada para esta sala
  let imagemInfo;
  if (room.userAsset) {
    imagemInfo = `${room.userAsset.name} <em>(sua imagem)</em>`;
  } else if (room.assetKey) {
    imagemInfo = room.assetKey;
  } else {
    imagemInfo = '— (cor de fallback)';
  }

  const html = `
    <table>
      <tr><td><strong>ID</strong></td><td>${room.id}</td></tr>
      <tr><td><strong>Tipo</strong></td><td>${room.type.toUpperCase()}</td></tr>
      <tr><td><strong>Posição</strong></td><td>x: ${Math.round(room.x)}, y: ${Math.round(room.y)}</td></tr>
      <tr><td><strong>Tamanho</strong></td><td>${Math.round(room.width)} × ${Math.round(room.height)} px</td></tr>
      <tr><td><strong>Imagem</strong></td><td>${imagemInfo}</td></tr>
      <tr><td><strong>Conexões</strong></td><td>${room.connections.join(', ') || 'nenhuma'}</td></tr>
    </table>
  `;

  document.getElementById('room-details').innerHTML = html;
}

// -----------------------------------------------
// _setStatus(message)
// Atualiza o texto de status no header da aplicação.
// -----------------------------------------------
function _setStatus(message) {
  const el = document.getElementById('status-text');
  if (el) el.textContent = message;
}

// -----------------------------------------------
// _setOverlayVisible(visible)
// Exibe ou esconde o overlay de "Gerando mapa..." no canvas.
// -----------------------------------------------
function _setOverlayVisible(visible) {
  const overlay = document.getElementById('canvas-overlay');
  if (!overlay) return;

  if (visible) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

// -----------------------------------------------
// _openImagePreview(dataURL)
// Abre o modal de preview ampliado da imagem de asset.
// Exibido ao clicar no thumbnail de um .ua-card na sidebar.
//
// @param {string} dataURL  base64 data URL da imagem
// -----------------------------------------------
function _openImagePreview(dataURL) {
  const modal = document.getElementById('img-preview-modal');
  const img   = document.getElementById('img-preview-img');
  if (!modal || !img) return;

  // Define a imagem e exibe o modal removendo a classe .hidden
  img.src = dataURL;
  modal.classList.remove('hidden');
}

// -----------------------------------------------
// _closeImagePreview()
// Fecha o modal de preview e limpa a imagem exibida.
// Chamada ao clicar no backdrop, no botão ✕ ou ao pressionar ESC.
// -----------------------------------------------
function _closeImagePreview() {
  const modal = document.getElementById('img-preview-modal');
  const img   = document.getElementById('img-preview-img');
  if (!modal) return;

  modal.classList.add('hidden');
  if (img) img.src = ''; // libera a referência para facilitar garbage collection
}

// -----------------------------------------------
// _initSidebarSections()
// Configura o sistema de seções retráteis (accordion) da sidebar.
// Cada botão .sidebar-section-header colapsa/expande seu conteúdo.
// Múltiplas seções podem estar abertas simultaneamente.
// -----------------------------------------------
function _initSidebarSections() {
  const headers = document.querySelectorAll('.sidebar-section-header');

  headers.forEach(header => {
    header.addEventListener('click', () => {
      const sectionId = header.dataset.section;
      const content   = document.getElementById(sectionId);
      if (!content) return;

      const isCollapsed = content.classList.contains('collapsed');

      if (isCollapsed) {
        // Expandir: remove .collapsed e marca o header como ativo
        content.classList.remove('collapsed');
        header.classList.add('active');
        // Atualiza a seta para ▼ (aberto)
        const arrow = header.querySelector('.section-arrow');
        if (arrow) arrow.innerHTML = '&#9660;';
      } else {
        // Colapsar: adiciona .collapsed e desmarca o header
        content.classList.add('collapsed');
        header.classList.remove('active');
        // Atualiza a seta para ▶ (fechado)
        const arrow = header.querySelector('.section-arrow');
        if (arrow) arrow.innerHTML = '&#9654;';
      }
    });
  });
}

// -----------------------------------------------
// _expandSection(sectionId)
// Expande programaticamente uma seção da sidebar.
// Se a seção já estiver aberta, não faz nada.
//
// @param {string} sectionId  valor data-section / id do conteúdo
// -----------------------------------------------
function _expandSection(sectionId) {
  const content = document.getElementById(sectionId);
  if (!content) return;

  // Só precisa agir se estiver colapsado
  if (content.classList.contains('collapsed')) {
    const header = document.querySelector(`.sidebar-section-header[data-section="${sectionId}"]`);
    if (header) header.click();
  }
}

// -----------------------------------------------
// _initPinMode()
// Configura o botão #btn-pin-mode para alternar o modo de
// inserção de pinos no canvas.
//
// Quando ativo:
//  - AppState._pinMode = true
//  - Botão recebe classe .active (destaque visual)
//  - Canvas recebe classe .pin-mode (cursor crosshair via CSS)
// -----------------------------------------------
function _initPinMode() {
  const btn = document.getElementById('btn-pin-mode');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Alterna o estado do modo pino
    AppState._pinMode = !AppState._pinMode;

    // Sincroniza as classes visuais com o novo estado
    btn.classList.toggle('active', AppState._pinMode);
    AppState.canvas.classList.toggle('pin-mode', AppState._pinMode);
  });
}

// -----------------------------------------------
// _renderPinSidebar(pins)
// Redesenha a lista de cards de pinos na seção "Pinos" da sidebar.
// Passada como callback para PinManager.init() e chamada em
// add / remove / clear / toggleCompleted.
//
// Cada card tem dois modos:
//  - VISUALIZAÇÃO (padrão): label + nota como texto, botões editar e excluir
//  - EDIÇÃO: label input + nota textarea, botões confirmar e descartar
//
// A opção de marcar como concluído NÃO aparece aqui —
// ela existe apenas no painel de detalhes da sidebar direita.
//
// @param {Array<{id, x, y, label, note, completed}>} pins
// -----------------------------------------------
function _renderPinSidebar(pins) {
  const list = document.getElementById('pin-list');
  if (!list) return;

  list.innerHTML = '';

  // Sem pinos: exibe mensagem orientativa
  if (pins.length === 0) {
    const hint = document.createElement('p');
    hint.className   = 'pin-empty-hint';
    hint.textContent = 'Nenhum pino adicionado.\nClique em "Adicionar Pino" e depois no mapa.';
    list.appendChild(hint);
    return;
  }

  pins.forEach(pin => {
    // Card container
    const card = document.createElement('div');
    card.className       = 'pin-card' + (pin.completed ? ' completed' : '');
    card.dataset.pinId   = pin.id;

    // ════════════════════════════════════════════
    // MODO VISUALIZAÇÃO — visível por padrão
    // ════════════════════════════════════════════
    const viewDiv = document.createElement('div');
    viewDiv.className = 'pin-view';

    // Header: ícone + rótulo em texto + botão editar + botão excluir
    const viewHeader = document.createElement('div');
    viewHeader.className = 'pin-card-header';

    const viewIcon = document.createElement('span');
    viewIcon.textContent = '📍';

    // Rótulo do pino como texto (não editável)
    const labelText = document.createElement('span');
    labelText.className   = 'pin-label-text';
    labelText.textContent = pin.label;

    // Botão editar (✏️) — alterna para modo edição
    const editBtn = document.createElement('button');
    editBtn.className   = 'pin-edit-btn';
    editBtn.textContent = '✏️';
    editBtn.title       = 'Editar pino';

    // Botão excluir (🗑️) — remove o pino permanentemente
    const trashBtn = document.createElement('button');
    trashBtn.className   = 'pin-trash-btn';
    trashBtn.textContent = '🗑️';
    trashBtn.title       = 'Excluir pino';

    viewHeader.appendChild(viewIcon);
    viewHeader.appendChild(labelText);
    viewHeader.appendChild(editBtn);
    viewHeader.appendChild(trashBtn);

    // Texto da anotação (somente leitura)
    const notePreview = document.createElement('p');
    notePreview.className   = 'pin-note-preview';
    notePreview.textContent = pin.note || '(sem anotação)';

    viewDiv.appendChild(viewHeader);
    viewDiv.appendChild(notePreview);

    // ════════════════════════════════════════════
    // MODO EDIÇÃO — oculto por padrão
    // ════════════════════════════════════════════
    const editDiv = document.createElement('div');
    editDiv.className     = 'pin-edit-mode';
    editDiv.style.display = 'none';

    // Header: ícone + input de rótulo + botão confirmar + botão descartar
    const editHeader = document.createElement('div');
    editHeader.className = 'pin-card-header';

    const editIcon = document.createElement('span');
    editIcon.textContent = '📍';

    // Input do rótulo — editável durante o modo edição
    const labelInput = document.createElement('input');
    labelInput.type        = 'text';
    labelInput.className   = 'pin-label-input';
    labelInput.value       = pin.label;
    labelInput.placeholder = 'Rótulo...';

    // Botão confirmar (✓) — salva as alterações de texto
    const confirmBtn = document.createElement('button');
    confirmBtn.className   = 'pin-confirm-btn';
    confirmBtn.textContent = '✓';
    confirmBtn.title       = 'Confirmar edição';

    // Botão descartar (🗑️) — cancela e reverte as alterações
    const discardBtn = document.createElement('button');
    discardBtn.className   = 'pin-discard-btn';
    discardBtn.textContent = '🗑️';
    discardBtn.title       = 'Descartar alterações';

    editHeader.appendChild(editIcon);
    editHeader.appendChild(labelInput);
    editHeader.appendChild(confirmBtn);
    editHeader.appendChild(discardBtn);

    // Textarea de anotação — editável durante o modo edição
    const noteArea = document.createElement('textarea');
    noteArea.className   = 'pin-note-input';
    noteArea.value       = pin.note;
    noteArea.placeholder = 'Anotações (obstáculos, eventos, histórias...)';
    noteArea.rows        = 3;

    editDiv.appendChild(editHeader);
    editDiv.appendChild(noteArea);

    // ════════════════════════════════════════════
    // EVENT HANDLERS
    // ════════════════════════════════════════════

    // ✏️ Entrar no modo edição
    editBtn.addEventListener('click', () => {
      // Preenche os inputs com os valores atuais do pino
      labelInput.value = pin.label;
      noteArea.value   = pin.note;
      // Alterna visibilidade
      viewDiv.style.display = 'none';
      editDiv.style.display = '';
      labelInput.focus();
    });

    // ✓ Confirmar edição — salva o texto e volta ao modo visualização
    confirmBtn.addEventListener('click', () => {
      // Salva as alterações silenciosamente (sem re-render completo)
      PinManager.updateSilent(pin.id, {
        label: labelInput.value,
        note:  noteArea.value,
      });
      // Atualiza o texto na view diretamente (sem re-render)
      labelText.textContent   = labelInput.value;
      notePreview.textContent = noteArea.value || '(sem anotação)';
      // Volta ao modo visualização
      viewDiv.style.display = '';
      editDiv.style.display = 'none';
      // Redesenha o canvas para refletir o rótulo atualizado
      Renderer.redraw();
    });

    // 🗑️ Descartar edição — reverte os inputs e volta ao modo visualização
    discardBtn.addEventListener('click', () => {
      // Reverte para os valores originais
      labelInput.value = pin.label;
      noteArea.value   = pin.note;
      // Volta ao modo visualização
      viewDiv.style.display = '';
      editDiv.style.display = 'none';
    });

    // 🗑️ Excluir pino permanentemente
    trashBtn.addEventListener('click', () => {
      PinManager.remove(pin.id);  // dispara _notify → re-render sidebar + canvas
    });

    // Monta o card com ambos os modos
    card.appendChild(viewDiv);
    card.appendChild(editDiv);
    list.appendChild(card);
  });
}

// -----------------------------------------------
// _scrollToPinCard(id)
// Rola a sidebar até o card do pino indicado e
// aplica um destaque temporário de 1.5s.
//
// @param {number} id  ID do pino (PinManager)
// -----------------------------------------------
function _scrollToPinCard(id) {
  const card = document.querySelector(`.pin-card[data-pin-id="${id}"]`);
  if (!card) return;

  // Rola suavemente até o card ficar visível na sidebar
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Aplica a classe .selected para o destaque visual temporário
  card.classList.add('selected');
  setTimeout(() => card.classList.remove('selected'), 1500);
}

// -----------------------------------------------
// _isOnCorridor(worldPos)
// Verifica se um ponto em coordenadas de mundo está
// dentro de algum segmento de corredor do mapa atual.
// Usado para restringir a colocação de pinos apenas
// sobre corredores.
//
// @param {{x:number, y:number}} worldPos
// @returns {boolean}
// -----------------------------------------------
function _isOnCorridor(worldPos) {
  if (!AppState.map || !AppState.map.corridors) return false;

  // Margem de hit um pouco maior que a metade visual do corredor
  // para facilitar o clique (corridorWidth padrão = 16px → halfW = 10px)
  const HALF_W = 10;

  for (const corridor of AppState.map.corridors) {
    const pts = corridor.points;
    if (!pts || pts.length < 2) continue;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];

      // AABB (bounding box) do segmento expandida pela margem
      const minX = Math.min(a.x, b.x) - HALF_W;
      const maxX = Math.max(a.x, b.x) + HALF_W;
      const minY = Math.min(a.y, b.y) - HALF_W;
      const maxY = Math.max(a.y, b.y) + HALF_W;

      if (worldPos.x >= minX && worldPos.x <= maxX &&
          worldPos.y >= minY && worldPos.y <= maxY) {
        return true;
      }
    }
  }
  return false;
}

// -----------------------------------------------
// _deactivatePinMode()
// Desativa o modo de inserção de pinos.
// Chamada automaticamente após colocar um pino,
// ou manualmente ao clicar o botão toggle novamente.
// -----------------------------------------------
function _deactivatePinMode() {
  AppState._pinMode = false;
  const btn = document.getElementById('btn-pin-mode');
  if (btn) btn.classList.remove('active');
  AppState.canvas.classList.remove('pin-mode');
}

// -----------------------------------------------
// _showPinDetails(pin)
// Exibe as propriedades de um pino no painel #room-details
// (sidebar direita). Inclui um botão para marcar/desmarcar
// o pino como concluído.
//
// @param {{id, x, y, label, note, completed}} pin
// -----------------------------------------------
function _showPinDetails(pin) {
  const statusText = pin.completed ? 'Concluído ✓' : 'Pendente';
  const btnLabel   = pin.completed ? 'Desmarcar concluído' : 'Marcar como concluído';
  const btnClass   = pin.completed ? 'pin-status-btn completed' : 'pin-status-btn';

  const noteHtml = pin.note
    ? pin.note.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
    : '—';

  const html = `
    <table>
      <tr><td><strong>Pino</strong></td><td>${pin.label}</td></tr>
      <tr><td><strong>Posição</strong></td><td>x: ${Math.round(pin.x)}, y: ${Math.round(pin.y)}</td></tr>
      <tr><td><strong>Nota</strong></td><td>${noteHtml}</td></tr>
      <tr><td><strong>Status</strong></td><td>${statusText}</td></tr>
    </table>
    <button class="${btnClass}" data-pin-id="${pin.id}">${btnLabel}</button>
  `;

  document.getElementById('room-details').innerHTML = html;

  // Registra o listener no botão de status recém-criado
  const statusBtn = document.querySelector('.pin-status-btn');
  if (statusBtn) {
    statusBtn.addEventListener('click', () => {
      PinManager.toggleCompleted(pin.id);
      // Atualiza o painel com o novo estado do pino
      const updatedPin = PinManager.getAll().find(p => p.id === pin.id);
      if (updatedPin) _showPinDetails(updatedPin);
    });
  }
}

// -----------------------------------------------
// Inicializar quando o DOM estiver completamente carregado
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', init);
