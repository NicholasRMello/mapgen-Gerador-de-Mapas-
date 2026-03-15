/**
 * i18n.js — Internationalization module
 *
 * Provides English / Portuguese (BR) translation for all
 * user-facing text in the application.
 *
 * API:
 *   I18n.t(key, ...args)   — translate a key, with {0},{1} interpolation
 *   I18n.translateDOM()     — apply translations to all data-i18n elements
 *   I18n.toggle()           — switch language (en ↔ pt-BR), persist to localStorage
 *   I18n.getLang()          — get current language code
 *   I18n.setLang(lang)      — set language explicitly
 */
const I18n = (() => {

  const LANGS       = ['en', 'pt-BR'];
  const DEFAULT_LANG = 'en';
  const STORAGE_KEY  = 'mapgen-lang';

  let _lang = DEFAULT_LANG;

  // ── Translation dictionaries ──────────────────────────
  const _dict = {
    'en': {
      // Header
      'header.generate':        'Generate Map',
      'header.clear':           'Clear',
      'header.seedPlaceholder': 'Seed (optional)',
      'header.sizeSmall':       'Small',
      'header.sizeMedium':      'Medium',
      'header.sizeLarge':       'Large',
      'header.noMap':           'No map generated.',
      'header.langToggle':      'PT-BR',

      // Left sidebar sections
      'sidebar.images':         'Images',
      'sidebar.pins':           'Pins',

      // Drop zone
      'dropzone.text':          'Drag images here<br/>or click to select',

      // Pin mode button
      'pin.addButton':          '📍 Add Pin',

      // Canvas overlay
      'overlay.generating':     'Generating map...',

      // Right sidebar
      'details.title':          'Details',
      'details.placeholder':    'Click a room to see details.',
      'debug.title':            'Debug',

      // Image preview
      'preview.alt':            'Image preview',

      // Asset sidebar (dynamic)
      'asset.emptyHint':        'No images loaded.\nDrag files to the area above.',
      'asset.typeAny':          'Any room',
      'asset.typeNormal':       'Normal',
      'asset.typeStart':        'Start',
      'asset.typeEnd':          'End',
      'asset.typeBoss':         'Boss',
      'asset.removeTitle':      'Remove "{0}"',

      // Status messages
      'status.welcome':         'Add images in the sidebar and click "Generate Map".',
      'status.withAssets':      '{0} image(s) loaded. Click "Generate Map".',
      'status.generated':       'Seed: {0} | Rooms: {1} | Corridors: {2}',
      'status.customAssets':    ' | {0} custom image(s)',

      // Room details
      'room.id':                'ID',
      'room.type':              'Type',
      'room.position':          'Position',
      'room.size':              'Size',
      'room.image':             'Image',
      'room.connections':       'Connections',
      'room.noConnections':     'none',
      'room.noImage':           '— (fallback color)',
      'room.userImage':         '(your image)',

      // Pin sidebar (dynamic)
      'pin.emptyHint':          'No pins added.\nClick "Add Pin" then click on the map.',
      'pin.noNote':             '(no note)',
      'pin.editTitle':          'Edit pin',
      'pin.trashTitle':         'Delete pin',
      'pin.labelPlaceholder':   'Label...',
      'pin.confirmTitle':       'Confirm edit',
      'pin.discardTitle':       'Discard changes',
      'pin.notePlaceholder':    'Notes (obstacles, events, stories...)',

      // Pin details (right panel)
      'pin.label':              'Pin',
      'pin.position':           'Position',
      'pin.note':               'Note',
      'pin.status':             'Status',
      'pin.completed':          'Completed ✓',
      'pin.pending':            'Pending',
      'pin.markCompleted':      'Mark as completed',
      'pin.unmarkCompleted':    'Unmark completed',

      // Pin default label
      'pin.defaultLabel':       'Pin {0}',

      // User asset errors
      'error.notImage':         '"{0}" is not an image.',
      'error.decodeFail':       'Failed to decode "{0}".',
      'error.readFail':         'Failed to read file "{0}".',
    },

    'pt-BR': {
      // Header
      'header.generate':        'Gerar Mapa',
      'header.clear':           'Limpar',
      'header.seedPlaceholder': 'Seed (opcional)',
      'header.sizeSmall':       'Pequeno',
      'header.sizeMedium':      'Médio',
      'header.sizeLarge':       'Grande',
      'header.noMap':           'Nenhum mapa gerado.',
      'header.langToggle':      'EN',

      // Left sidebar sections
      'sidebar.images':         'Imagens',
      'sidebar.pins':           'Pinos',

      // Drop zone
      'dropzone.text':          'Arraste imagens aqui<br/>ou clique para selecionar',

      // Pin mode button
      'pin.addButton':          '📍 Adicionar Pino',

      // Canvas overlay
      'overlay.generating':     'Gerando mapa...',

      // Right sidebar
      'details.title':          'Detalhes',
      'details.placeholder':    'Clique em uma sala para ver detalhes.',
      'debug.title':            'Debug',

      // Image preview
      'preview.alt':            'Preview da imagem',

      // Asset sidebar (dynamic)
      'asset.emptyHint':        'Nenhuma imagem carregada.\nArraste arquivos para a área acima.',
      'asset.typeAny':          'Qualquer sala',
      'asset.typeNormal':       'Normal',
      'asset.typeStart':        'Início',
      'asset.typeEnd':          'Final',
      'asset.typeBoss':         'Boss',
      'asset.removeTitle':      'Remover "{0}"',

      // Status messages
      'status.welcome':         'Adicione imagens na sidebar e clique em "Gerar Mapa".',
      'status.withAssets':      '{0} imagem(ns) carregada(s). Clique em "Gerar Mapa".',
      'status.generated':       'Seed: {0} | Salas: {1} | Corredores: {2}',
      'status.customAssets':    ' | {0} imagem(ns) customizada(s)',

      // Room details
      'room.id':                'ID',
      'room.type':              'Tipo',
      'room.position':          'Posição',
      'room.size':              'Tamanho',
      'room.image':             'Imagem',
      'room.connections':       'Conexões',
      'room.noConnections':     'nenhuma',
      'room.noImage':           '— (cor de fallback)',
      'room.userImage':         '(sua imagem)',

      // Pin sidebar (dynamic)
      'pin.emptyHint':          'Nenhum pino adicionado.\nClique em "Adicionar Pino" e depois no mapa.',
      'pin.noNote':             '(sem anotação)',
      'pin.editTitle':          'Editar pino',
      'pin.trashTitle':         'Excluir pino',
      'pin.labelPlaceholder':   'Rótulo...',
      'pin.confirmTitle':       'Confirmar edição',
      'pin.discardTitle':       'Descartar alterações',
      'pin.notePlaceholder':    'Anotações (obstáculos, eventos, histórias...)',

      // Pin details (right panel)
      'pin.label':              'Pino',
      'pin.position':           'Posição',
      'pin.note':               'Nota',
      'pin.status':             'Status',
      'pin.completed':          'Concluído ✓',
      'pin.pending':            'Pendente',
      'pin.markCompleted':      'Marcar como concluído',
      'pin.unmarkCompleted':    'Desmarcar concluído',

      // Pin default label
      'pin.defaultLabel':       'Pino {0}',

      // User asset errors
      'error.notImage':         '"{0}" não é uma imagem.',
      'error.decodeFail':       'Falha ao decodificar "{0}".',
      'error.readFail':         'Falha ao ler o arquivo "{0}".',
    },
  };

  // ── Init: load saved preference ───────────────────────
  function _init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGS.includes(saved)) {
      _lang = saved;
    }
  }

  function getLang() {
    return _lang;
  }

  function setLang(lang) {
    if (!LANGS.includes(lang)) return;
    _lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }

  function toggle() {
    const newLang = _lang === 'en' ? 'pt-BR' : 'en';
    setLang(newLang);
    return newLang;
  }

  /**
   * Translate a key with optional {0},{1},... interpolation.
   * @param {string} key
   * @param {...*} args
   * @returns {string}
   */
  function t(key, ...args) {
    const dict = _dict[_lang] || _dict[DEFAULT_LANG];
    let str = dict[key];
    if (str === undefined) {
      console.warn(`[I18n] Missing key: "${key}" for lang "${_lang}"`);
      return key;
    }
    args.forEach((val, i) => {
      str = str.replace(new RegExp(`\\{${i}\\}`, 'g'), val);
    });
    return str;
  }

  /**
   * Translate all static HTML elements with data-i18n attributes.
   *   data-i18n="key"              → textContent
   *   data-i18n-html="key"         → innerHTML
   *   data-i18n-placeholder="key"  → placeholder
   *   data-i18n-alt="key"          → alt
   */
  function translateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
      el.alt = t(el.dataset.i18nAlt);
    });
  }

  _init();

  return { getLang, setLang, toggle, t, translateDOM };

})();
