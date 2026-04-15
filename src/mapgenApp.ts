import { I18n } from './i18n.ts';
import { Random } from './utils/random.ts';
import { MathUtils } from './utils/math.ts';
import { AssetLoader } from './core/assetLoader.ts';
import { UserAssets } from './core/userAssets.ts';
import { PinManager } from './core/pinManager.ts';
import { MapGenerator } from './core/mapGenerator.ts';
import { Renderer } from './render/renderer.ts';
import { Camera } from './render/camera.ts';
import type { GeneratedMap, Pin, Room, UserAsset } from './types.ts';

type AppStateType = {
  map: GeneratedMap | null;
  seed: string | null;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  _pinMode: boolean;
};

const AppState: AppStateType = {
  map: null,
  seed: null,
  canvas: null,
  ctx: null,
  _pinMode: false,
};

let _mouseDownPos: { x: number; y: number } | null = null;
let _initialized = false;

export function initMapgenApp() {
  if (_initialized) return;
  _initialized = true;

  AppState.canvas = document.getElementById('map-canvas') as HTMLCanvasElement | null;
  if (!AppState.canvas) return;
  AppState.ctx = AppState.canvas.getContext('2d');
  if (!AppState.ctx) return;

  document.documentElement.lang = I18n.getLang();
  I18n.translateDOM();

  Renderer.init(AppState.canvas, AppState.ctx);
  Camera.init(AppState.canvas, () => Renderer.redraw());

  UserAssets.init((assets) => _renderAssetSidebar(assets));
  PinManager.init((pins) => {
    _renderPinSidebar(pins);
    Renderer.setPins(pins);
    Renderer.redraw();
  });

  _initSidebarSections();
  _initPinMode();
  _initDropZone();
  _renderAssetSidebar([]);
  _renderPinSidebar([]);

  const backdrop = document.getElementById('img-preview-backdrop');
  const closeBtn = document.getElementById('img-preview-close');
  if (backdrop) backdrop.addEventListener('click', _closeImagePreview);
  if (closeBtn) closeBtn.addEventListener('click', _closeImagePreview);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeImagePreview();
  });

  AssetLoader.load().then(() => {
    (document.getElementById('btn-generate') as HTMLButtonElement).addEventListener('click', onGenerateClick);
    (document.getElementById('btn-clear') as HTMLButtonElement).addEventListener('click', onClearClick);
    (document.getElementById('btn-lang') as HTMLButtonElement).addEventListener('click', onLangToggle);

    AppState.canvas!.addEventListener('click', onCanvasClick);
    AppState.canvas!.addEventListener('mousedown', (e) => {
      const rect = AppState.canvas!.getBoundingClientRect();
      _mouseDownPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });

    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    _setStatus(I18n.t('status.welcome'));
  });
}

function _initDropZone() {
  const dropZone = document.getElementById('drop-zone') as HTMLDivElement | null;
  const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer?.files || []);
    _processFiles(files);
  });

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    _processFiles(files);
    fileInput.value = '';
  });
}

function _processFiles(files: File[]) {
  files.forEach((file) => {
    UserAssets.add(file).catch((err: Error) => {
      console.warn('[main] File ignored:', err.message);
    });
  });
}

function _renderAssetSidebar(assets: UserAsset[]) {
  const list = document.getElementById('user-asset-list');
  if (!list) return;

  list.innerHTML = '';

  if (assets.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'ua-empty-hint';
    hint.textContent = I18n.t('asset.emptyHint');
    list.appendChild(hint);
    return;
  }

  assets.forEach((asset) => {
    const card = document.createElement('div');
    card.className = 'ua-card';
    card.dataset.assetId = String(asset.id);

    const thumb = document.createElement('img');
    thumb.className = 'ua-card-thumb';
    thumb.src = asset.dataURL;
    thumb.alt = asset.name;
    thumb.style.cursor = 'zoom-in';
    thumb.addEventListener('click', (e) => {
      e.stopPropagation();
      _openImagePreview(asset.dataURL);
    });

    const info = document.createElement('div');
    info.className = 'ua-card-info';

    const nameEl = document.createElement('span');
    nameEl.className = 'ua-card-name';
    nameEl.textContent = asset.name;
    nameEl.title = asset.name;

    const typeSelect = document.createElement('select');
    typeSelect.className = 'ua-type-select';

    const typeOptions: Array<{ value: UserAsset['type']; label: string }> = [
      { value: 'any', label: I18n.t('asset.typeAny') },
      { value: 'normal', label: I18n.t('asset.typeNormal') },
      { value: 'start', label: I18n.t('asset.typeStart') },
      { value: 'end', label: I18n.t('asset.typeEnd') },
      { value: 'boss', label: I18n.t('asset.typeBoss') },
    ];

    typeOptions.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === asset.type) option.selected = true;
      typeSelect.appendChild(option);
    });

    typeSelect.addEventListener('change', () => {
      UserAssets.setType(asset.id, typeSelect.value as UserAsset['type']);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'ua-remove';
    removeBtn.textContent = '✕';
    removeBtn.title = I18n.t('asset.removeTitle', asset.name);
    removeBtn.addEventListener('click', () => UserAssets.remove(asset.id));

    info.appendChild(nameEl);
    info.appendChild(typeSelect);
    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(removeBtn);
    list.appendChild(card);
  });
}

function onGenerateClick() {
  const seedInput = (document.getElementById('input-seed') as HTMLInputElement).value.trim();
  const seed = seedInput !== '' ? seedInput : Random.generateSeedString();
  (document.getElementById('input-seed') as HTMLInputElement).value = seed;

  const size = (document.getElementById('select-size') as HTMLSelectElement).value as 'small' | 'medium' | 'large';

  _setOverlayVisible(true);

  setTimeout(() => {
    AppState.map = MapGenerator.generate({
      seed,
      size,
      assets: AssetLoader,
      userAssets: UserAssets,
    });
    AppState.seed = seed;

    Camera.reset();
    const startRoom = AppState.map.rooms.find((r) => r.type === 'start');
    if (startRoom && AppState.canvas) {
      const cx = startRoom.x + startRoom.width / 2;
      const cy = startRoom.y + startRoom.height / 2;
      Camera.centerOn(cx, cy, AppState.canvas.width, AppState.canvas.height);
    }

    Renderer.draw(AppState.map);
    _setOverlayVisible(false);

    const userAssetCount = UserAssets.getAll().length;
    const assetInfo = userAssetCount > 0 ? I18n.t('status.customAssets', userAssetCount) : '';

    _setStatus(I18n.t('status.generated', seed, AppState.map.rooms.length, AppState.map.corridors.length) + assetInfo);

    updateDebugPanel({
      seed: AppState.map.seed,
      size,
      rooms: AppState.map.rooms.length,
      corridors: AppState.map.corridors.length,
      mapWidth: AppState.map.width,
      mapHeight: AppState.map.height,
      userAssets: userAssetCount,
    });
  }, 10);
}

function onClearClick() {
  AppState.map = null;
  AppState.seed = null;
  Camera.reset();
  PinManager.clear();
  Renderer.setPins([]);
  Renderer.draw(null);

  const details = document.getElementById('room-details');
  if (details) details.innerHTML = `<p>${I18n.t('details.placeholder')}</p>`;

  const debug = document.getElementById('debug-output');
  if (debug) debug.textContent = '';

  (document.getElementById('input-seed') as HTMLInputElement).value = '';

  const userAssetCount = UserAssets.getAll().length;
  _setStatus(userAssetCount > 0 ? I18n.t('status.withAssets', userAssetCount) : I18n.t('status.welcome'));
}

function onCanvasClick(event: MouseEvent) {
  if (!AppState.map || !AppState.canvas) return;

  const rect = AppState.canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;

  if (_mouseDownPos) {
    const dx = screenX - _mouseDownPos.x;
    const dy = screenY - _mouseDownPos.y;
    if (Math.hypot(dx, dy) > 5) return;
  }

  const worldPos = Camera.screenToWorld(screenX, screenY);

  const pins = PinManager.getAll();
  for (const pin of pins) {
    const dist = Math.hypot(worldPos.x - pin.x, worldPos.y - (pin.y - 12));
    if (dist <= 10) {
      _showPinDetails(pin);
      _expandSection('section-pins');
      _scrollToPinCard(pin.id);
      return;
    }
  }

  if (AppState._pinMode) {
    if (_isOnCorridor(worldPos)) {
      const pin = PinManager.add(worldPos.x, worldPos.y);
      _deactivatePinMode();
      _expandSection('section-pins');
      _scrollToPinCard(pin.id);
    }
    return;
  }

  const clickedRoom = AppState.map.rooms.find((room) => MathUtils.pointInRect(worldPos, room));

  if (clickedRoom) {
    _showRoomDetails(clickedRoom);
    Renderer.highlightRoom(clickedRoom);
  } else {
    const details = document.getElementById('room-details');
    if (details) details.innerHTML = `<p>${I18n.t('details.placeholder')}</p>`;
    Renderer.highlightRoom(null);
  }
}

function onWindowResize() {
  Renderer.resizeCanvas();
}

function updateDebugPanel(data: unknown) {
  const formatted = JSON.stringify(data, null, 2);
  const el = document.getElementById('debug-output');
  if (el) el.textContent = formatted;
}

function _showRoomDetails(room: Room) {
  let imagemInfo;
  if (room.userAsset) {
    imagemInfo = `${room.userAsset.name} <em>${I18n.t('room.userImage')}</em>`;
  } else if (room.assetKey) {
    imagemInfo = room.assetKey;
  } else {
    imagemInfo = I18n.t('room.noImage');
  }

  const html = `
    <table>
      <tr><td><strong>${I18n.t('room.id')}</strong></td><td>${room.id}</td></tr>
      <tr><td><strong>${I18n.t('room.type')}</strong></td><td>${room.type.toUpperCase()}</td></tr>
      <tr><td><strong>${I18n.t('room.position')}</strong></td><td>x: ${Math.round(room.x)}, y: ${Math.round(room.y)}</td></tr>
      <tr><td><strong>${I18n.t('room.size')}</strong></td><td>${Math.round(room.width)} × ${Math.round(room.height)} px</td></tr>
      <tr><td><strong>${I18n.t('room.image')}</strong></td><td>${imagemInfo}</td></tr>
      <tr><td><strong>${I18n.t('room.connections')}</strong></td><td>${room.connections.join(', ') || I18n.t('room.noConnections')}</td></tr>
    </table>
  `;

  const details = document.getElementById('room-details');
  if (details) details.innerHTML = html;
}

function _setStatus(message: string) {
  const el = document.getElementById('status-text');
  if (el) el.textContent = message;
}

function _setOverlayVisible(visible: boolean) {
  const overlay = document.getElementById('canvas-overlay');
  if (!overlay) return;
  overlay.classList.toggle('hidden', !visible);
}

function onLangToggle() {
  I18n.toggle();
  I18n.translateDOM();

  _renderAssetSidebar(UserAssets.getAll());
  _renderPinSidebar(PinManager.getAll());

  if (AppState.map) {
    const userAssetCount = UserAssets.getAll().length;
    const assetInfo = userAssetCount > 0 ? I18n.t('status.customAssets', userAssetCount) : '';
    _setStatus(I18n.t('status.generated', AppState.seed || '', AppState.map.rooms.length, AppState.map.corridors.length) + assetInfo);
  } else {
    const userAssetCount = UserAssets.getAll().length;
    _setStatus(userAssetCount > 0 ? I18n.t('status.withAssets', userAssetCount) : I18n.t('status.welcome'));
  }

  const details = document.getElementById('room-details');
  if (details) details.innerHTML = `<p>${I18n.t('details.placeholder')}</p>`;
}

function _openImagePreview(dataURL: string) {
  const modal = document.getElementById('img-preview-modal');
  const img = document.getElementById('img-preview-img') as HTMLImageElement | null;
  if (!modal || !img) return;
  img.src = dataURL;
  modal.classList.remove('hidden');
}

function _closeImagePreview() {
  const modal = document.getElementById('img-preview-modal');
  const img = document.getElementById('img-preview-img') as HTMLImageElement | null;
  if (!modal) return;
  modal.classList.add('hidden');
  if (img) img.src = '';
}

function _initSidebarSections() {
  const headers = document.querySelectorAll<HTMLButtonElement>('.sidebar-section-header');

  headers.forEach((header) => {
    header.addEventListener('click', () => {
      const sectionId = header.dataset.section;
      if (!sectionId) return;
      const content = document.getElementById(sectionId);
      if (!content) return;

      const isCollapsed = content.classList.contains('collapsed');
      if (isCollapsed) {
        content.classList.remove('collapsed');
        header.classList.add('active');
        const arrow = header.querySelector('.section-arrow');
        if (arrow) arrow.innerHTML = '&#9660;';
      } else {
        content.classList.add('collapsed');
        header.classList.remove('active');
        const arrow = header.querySelector('.section-arrow');
        if (arrow) arrow.innerHTML = '&#9654;';
      }
    });
  });
}

function _expandSection(sectionId: string) {
  const content = document.getElementById(sectionId);
  if (!content) return;
  if (content.classList.contains('collapsed')) {
    const header = document.querySelector<HTMLButtonElement>(`.sidebar-section-header[data-section="${sectionId}"]`);
    if (header) header.click();
  }
}

function _initPinMode() {
  const btn = document.getElementById('btn-pin-mode');
  if (!btn || !AppState.canvas) return;

  btn.addEventListener('click', () => {
    AppState._pinMode = !AppState._pinMode;
    btn.classList.toggle('active', AppState._pinMode);
    AppState.canvas!.classList.toggle('pin-mode', AppState._pinMode);
  });
}

function _renderPinSidebar(pins: Pin[]) {
  const list = document.getElementById('pin-list');
  if (!list) return;
  list.innerHTML = '';

  if (pins.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'pin-empty-hint';
    hint.textContent = I18n.t('pin.emptyHint');
    list.appendChild(hint);
    return;
  }

  pins.forEach((pin) => {
    const card = document.createElement('div');
    card.className = `pin-card${pin.completed ? ' completed' : ''}`;
    card.dataset.pinId = String(pin.id);

    const viewDiv = document.createElement('div');
    viewDiv.className = 'pin-view';

    const viewHeader = document.createElement('div');
    viewHeader.className = 'pin-card-header';

    const viewIcon = document.createElement('span');
    viewIcon.textContent = '📍';

    const labelText = document.createElement('span');
    labelText.className = 'pin-label-text';
    labelText.textContent = pin.label;

    const editBtn = document.createElement('button');
    editBtn.className = 'pin-edit-btn';
    editBtn.textContent = '✏️';
    editBtn.title = I18n.t('pin.editTitle');

    const trashBtn = document.createElement('button');
    trashBtn.className = 'pin-trash-btn';
    trashBtn.textContent = '🗑️';
    trashBtn.title = I18n.t('pin.trashTitle');

    viewHeader.appendChild(viewIcon);
    viewHeader.appendChild(labelText);
    viewHeader.appendChild(editBtn);
    viewHeader.appendChild(trashBtn);

    const notePreview = document.createElement('p');
    notePreview.className = 'pin-note-preview';
    notePreview.textContent = pin.note || I18n.t('pin.noNote');

    viewDiv.appendChild(viewHeader);
    viewDiv.appendChild(notePreview);

    const editDiv = document.createElement('div');
    editDiv.className = 'pin-edit-mode';
    editDiv.style.display = 'none';

    const editHeader = document.createElement('div');
    editHeader.className = 'pin-card-header';

    const editIcon = document.createElement('span');
    editIcon.textContent = '📍';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'pin-label-input';
    labelInput.value = pin.label;
    labelInput.placeholder = I18n.t('pin.labelPlaceholder');

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'pin-confirm-btn';
    confirmBtn.textContent = '✓';
    confirmBtn.title = I18n.t('pin.confirmTitle');

    const discardBtn = document.createElement('button');
    discardBtn.className = 'pin-discard-btn';
    discardBtn.textContent = '🗑️';
    discardBtn.title = I18n.t('pin.discardTitle');

    editHeader.appendChild(editIcon);
    editHeader.appendChild(labelInput);
    editHeader.appendChild(confirmBtn);
    editHeader.appendChild(discardBtn);

    const noteArea = document.createElement('textarea');
    noteArea.className = 'pin-note-input';
    noteArea.value = pin.note;
    noteArea.placeholder = I18n.t('pin.notePlaceholder');
    noteArea.rows = 3;

    editDiv.appendChild(editHeader);
    editDiv.appendChild(noteArea);

    editBtn.addEventListener('click', () => {
      labelInput.value = pin.label;
      noteArea.value = pin.note;
      viewDiv.style.display = 'none';
      editDiv.style.display = '';
      labelInput.focus();
    });

    confirmBtn.addEventListener('click', () => {
      PinManager.updateSilent(pin.id, {
        label: labelInput.value,
        note: noteArea.value,
      });
      labelText.textContent = labelInput.value;
      notePreview.textContent = noteArea.value || I18n.t('pin.noNote');
      viewDiv.style.display = '';
      editDiv.style.display = 'none';
      Renderer.redraw();
    });

    discardBtn.addEventListener('click', () => {
      labelInput.value = pin.label;
      noteArea.value = pin.note;
      viewDiv.style.display = '';
      editDiv.style.display = 'none';
    });

    trashBtn.addEventListener('click', () => PinManager.remove(pin.id));

    card.appendChild(viewDiv);
    card.appendChild(editDiv);
    list.appendChild(card);
  });
}

function _scrollToPinCard(id: number) {
  const card = document.querySelector<HTMLElement>(`.pin-card[data-pin-id="${id}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  card.classList.add('selected');
  setTimeout(() => card.classList.remove('selected'), 1500);
}

function _isOnCorridor(worldPos: { x: number; y: number }) {
  if (!AppState.map || !AppState.map.corridors) return false;
  const HALF_W = 10;

  for (const corridor of AppState.map.corridors) {
    const pts = corridor.points;
    if (!pts || pts.length < 2) continue;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];

      const minX = Math.min(a.x, b.x) - HALF_W;
      const maxX = Math.max(a.x, b.x) + HALF_W;
      const minY = Math.min(a.y, b.y) - HALF_W;
      const maxY = Math.max(a.y, b.y) + HALF_W;

      if (worldPos.x >= minX && worldPos.x <= maxX && worldPos.y >= minY && worldPos.y <= maxY) return true;
    }
  }

  return false;
}

function _deactivatePinMode() {
  AppState._pinMode = false;
  const btn = document.getElementById('btn-pin-mode');
  if (btn) btn.classList.remove('active');
  AppState.canvas?.classList.remove('pin-mode');
}

function _showPinDetails(pin: Pin) {
  const statusText = pin.completed ? I18n.t('pin.completed') : I18n.t('pin.pending');
  const btnLabel = pin.completed ? I18n.t('pin.unmarkCompleted') : I18n.t('pin.markCompleted');
  const btnClass = pin.completed ? 'pin-status-btn completed' : 'pin-status-btn';

  const noteHtml = pin.note ? pin.note.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') : '—';

  const html = `
    <table>
      <tr><td><strong>${I18n.t('pin.label')}</strong></td><td>${pin.label}</td></tr>
      <tr><td><strong>${I18n.t('pin.position')}</strong></td><td>x: ${Math.round(pin.x)}, y: ${Math.round(pin.y)}</td></tr>
      <tr><td><strong>${I18n.t('pin.note')}</strong></td><td>${noteHtml}</td></tr>
      <tr><td><strong>${I18n.t('pin.status')}</strong></td><td>${statusText}</td></tr>
    </table>
    <button class="${btnClass}" data-pin-id="${pin.id}">${btnLabel}</button>
  `;

  const details = document.getElementById('room-details');
  if (!details) return;

  details.innerHTML = html;

  const statusBtn = document.querySelector('.pin-status-btn');
  if (statusBtn) {
    statusBtn.addEventListener('click', () => {
      PinManager.toggleCompleted(pin.id);
      const updatedPin = PinManager.getAll().find((p) => p.id === pin.id);
      if (updatedPin) _showPinDetails(updatedPin);
    });
  }
}
