type Lang = 'en' | 'pt-BR';

export const I18n = (() => {
  const LANGS: Lang[] = ['en', 'pt-BR'];
  const DEFAULT_LANG: Lang = 'en';
  const STORAGE_KEY = 'mapgen-lang';

  let _lang: Lang = DEFAULT_LANG;

  const _dict: Record<Lang, Record<string, string>> = {
    en: {
      'header.generate': 'Generate Map',
      'header.clear': 'Clear',
      'header.seedPlaceholder': 'Seed (optional)',
      'header.sizeSmall': 'Small',
      'header.sizeMedium': 'Medium',
      'header.sizeLarge': 'Large',
      'header.noMap': 'No map generated.',
      'header.langToggle': 'PT-BR',
      'sidebar.images': 'Images',
      'sidebar.pins': 'Pins',
      'dropzone.text': 'Drag images here<br/>or click to select',
      'pin.addButton': '📍 Add Pin',
      'overlay.generating': 'Generating map...',
      'details.title': 'Details',
      'details.placeholder': 'Click a room to see details.',
      'debug.title': 'Debug',
      'preview.alt': 'Image preview',
      'asset.emptyHint': 'No images loaded.\nDrag files to the area above.',
      'asset.typeAny': 'Any room',
      'asset.typeNormal': 'Normal',
      'asset.typeStart': 'Start',
      'asset.typeEnd': 'End',
      'asset.typeBoss': 'Boss',
      'asset.removeTitle': 'Remove "{0}"',
      'status.welcome': 'Add images in the sidebar and click "Generate Map".',
      'status.withAssets': '{0} image(s) loaded. Click "Generate Map".',
      'status.generated': 'Seed: {0} | Rooms: {1} | Corridors: {2}',
      'status.customAssets': ' | {0} custom image(s)',
      'room.id': 'ID',
      'room.type': 'Type',
      'room.position': 'Position',
      'room.size': 'Size',
      'room.image': 'Image',
      'room.connections': 'Connections',
      'room.noConnections': 'none',
      'room.noImage': '— (fallback color)',
      'room.userImage': '(your image)',
      'pin.emptyHint': 'No pins added.\nClick "Add Pin" then click on the map.',
      'pin.noNote': '(no note)',
      'pin.editTitle': 'Edit pin',
      'pin.trashTitle': 'Delete pin',
      'pin.labelPlaceholder': 'Label...',
      'pin.confirmTitle': 'Confirm edit',
      'pin.discardTitle': 'Discard changes',
      'pin.notePlaceholder': 'Notes (obstacles, events, stories...)',
      'pin.label': 'Pin',
      'pin.position': 'Position',
      'pin.note': 'Note',
      'pin.status': 'Status',
      'pin.completed': 'Completed ✓',
      'pin.pending': 'Pending',
      'pin.markCompleted': 'Mark as completed',
      'pin.unmarkCompleted': 'Unmark completed',
      'pin.defaultLabel': 'Pin {0}',
      'error.notImage': '"{0}" is not an image.',
      'error.decodeFail': 'Failed to decode "{0}".',
      'error.readFail': 'Failed to read file "{0}".',
    },
    'pt-BR': {
      'header.generate': 'Gerar Mapa',
      'header.clear': 'Limpar',
      'header.seedPlaceholder': 'Seed (opcional)',
      'header.sizeSmall': 'Pequeno',
      'header.sizeMedium': 'Médio',
      'header.sizeLarge': 'Grande',
      'header.noMap': 'Nenhum mapa gerado.',
      'header.langToggle': 'EN',
      'sidebar.images': 'Imagens',
      'sidebar.pins': 'Pinos',
      'dropzone.text': 'Arraste imagens aqui<br/>ou clique para selecionar',
      'pin.addButton': '📍 Adicionar Pino',
      'overlay.generating': 'Gerando mapa...',
      'details.title': 'Detalhes',
      'details.placeholder': 'Clique em uma sala para ver detalhes.',
      'debug.title': 'Debug',
      'preview.alt': 'Preview da imagem',
      'asset.emptyHint': 'Nenhuma imagem carregada.\nArraste arquivos para a área acima.',
      'asset.typeAny': 'Qualquer sala',
      'asset.typeNormal': 'Normal',
      'asset.typeStart': 'Início',
      'asset.typeEnd': 'Final',
      'asset.typeBoss': 'Boss',
      'asset.removeTitle': 'Remover "{0}"',
      'status.welcome': 'Adicione imagens na sidebar e clique em "Gerar Mapa".',
      'status.withAssets': '{0} imagem(ns) carregada(s). Clique em "Gerar Mapa".',
      'status.generated': 'Seed: {0} | Salas: {1} | Corredores: {2}',
      'status.customAssets': ' | {0} imagem(ns) customizada(s)',
      'room.id': 'ID',
      'room.type': 'Tipo',
      'room.position': 'Posição',
      'room.size': 'Tamanho',
      'room.image': 'Imagem',
      'room.connections': 'Conexões',
      'room.noConnections': 'nenhuma',
      'room.noImage': '— (cor de fallback)',
      'room.userImage': '(sua imagem)',
      'pin.emptyHint': 'Nenhum pino adicionado.\nClique em "Adicionar Pino" e depois no mapa.',
      'pin.noNote': '(sem anotação)',
      'pin.editTitle': 'Editar pino',
      'pin.trashTitle': 'Excluir pino',
      'pin.labelPlaceholder': 'Rótulo...',
      'pin.confirmTitle': 'Confirmar edição',
      'pin.discardTitle': 'Descartar alterações',
      'pin.notePlaceholder': 'Anotações (obstáculos, eventos, histórias...)',
      'pin.label': 'Pino',
      'pin.position': 'Posição',
      'pin.note': 'Nota',
      'pin.status': 'Status',
      'pin.completed': 'Concluído ✓',
      'pin.pending': 'Pendente',
      'pin.markCompleted': 'Marcar como concluído',
      'pin.unmarkCompleted': 'Desmarcar concluído',
      'pin.defaultLabel': 'Pino {0}',
      'error.notImage': '"{0}" não é uma imagem.',
      'error.decodeFail': 'Falha ao decodificar "{0}".',
      'error.readFail': 'Falha ao ler o arquivo "{0}".',
    },
  };

  function _init() {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && LANGS.includes(saved)) _lang = saved;
  }

  function getLang() {
    return _lang;
  }

  function setLang(lang: Lang) {
    if (!LANGS.includes(lang)) return;
    _lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }

  function toggle() {
    const newLang: Lang = _lang === 'en' ? 'pt-BR' : 'en';
    setLang(newLang);
    return newLang;
  }

  function t(key: string, ...args: Array<string | number>) {
    const dict = _dict[_lang] || _dict[DEFAULT_LANG];
    let str = dict[key];
    if (str === undefined) {
      console.warn(`[I18n] Missing key: "${key}" for lang "${_lang}"`);
      return key;
    }
    args.forEach((val, i) => {
      str = str.replace(new RegExp(`\\{${i}\\}`, 'g'), String(val));
    });
    return str;
  }

  function translateDOM() {
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
      const key = el.dataset.i18nHtml;
      if (key) el.innerHTML = t(key);
    });
    document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (key) el.placeholder = t(key);
    });
    document.querySelectorAll<HTMLImageElement>('[data-i18n-alt]').forEach((el) => {
      const key = el.dataset.i18nAlt;
      if (key) el.alt = t(key);
    });
  }

  _init();

  return { getLang, setLang, toggle, t, translateDOM };
})();
