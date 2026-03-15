/**
 * main.js — Entry point and application orchestrator
 *
 * Responsibilities:
 *  - Initialize all modules in the correct order
 *  - Capture events from header controls (buttons, inputs)
 *  - Manage drag-and-drop of user images
 *  - Orchestrate the cycle: seed → generate map → render
 *  - Update the status and debug panels in the HTML
 *
 * Module dependency order:
 *   Random → MathUtils → AssetLoader + UserAssets → MapGenerator + CorridorBuilder → Renderer + Camera → Main
 */

// -----------------------------------------------
// Global application state
// Centralizes everything that needs to be shared
// between modules without external libraries.
// -----------------------------------------------
const AppState = {
  map:      null,   // complete object returned by MapGenerator.generate()
  seed:     null,   // current seed used to generate the map (string or number)
  canvas:   null,   // reference to the <canvas id="map-canvas"> element
  ctx:      null,   // 2D context obtained from canvas.getContext('2d')
  _pinMode: false,  // when true, the next click on the canvas inserts a pin
};

// Mousedown position to differentiate a click from a drag (camera pan).
// If the mouse moves more than 5px, the click is ignored.
let _mouseDownPos = null;

// -----------------------------------------------
// init()
// Initialization function called once when the DOM is ready.
// Sets up canvas, modules, drop zone, and event listeners.
// -----------------------------------------------
function init() {
  // Get the reference to the canvas element from the HTML
  AppState.canvas = document.getElementById('map-canvas');

  // Create the 2D context for all drawing operations
  AppState.ctx = AppState.canvas.getContext('2d');

  // Apply saved language preference to the HTML lang attribute
  document.documentElement.lang = I18n.getLang();

  // Translate all static HTML elements based on saved language
  I18n.translateDOM();

  // Initialize the Renderer with canvas and context references
  Renderer.init(AppState.canvas, AppState.ctx);

  // Initialize the Camera passing the canvas and the redraw function as callback
  // The camera will call Renderer.redraw() whenever the user pans or zooms
  Camera.init(AppState.canvas, () => Renderer.redraw());

  // Initialize the user assets module.
  // The _renderAssetSidebar callback is called automatically every time
  // the user adds, removes, or changes the type of an image.
  UserAssets.init(_renderAssetSidebar);

  // Initialize the annotation pins module.
  // The callback is called on add/remove/clear — updates the sidebar and the canvas.
  PinManager.init((pins) => {
    _renderPinSidebar(pins);
    Renderer.setPins(pins);
    Renderer.redraw();
  });

  // Set up the collapsible sections (accordion) system for the left sidebar
  _initSidebarSections();

  // Set up the "Add Pin" button (insertion mode toggle)
  _initPinMode();

  // Set up the drop zone and file input on the left sidebar
  _initDropZone();

  // Render the empty sidebars before any upload or addition
  _renderAssetSidebar([]);
  _renderPinSidebar([]);

  // Set up the image preview modal closing:
  // clicking the backdrop or the close button dismisses the modal
  const backdrop   = document.getElementById('img-preview-backdrop');
  const closeBtn   = document.getElementById('img-preview-close');
  if (backdrop) backdrop.addEventListener('click', _closeImagePreview);
  if (closeBtn) closeBtn.addEventListener('click',  _closeImagePreview);

  // ESC key also closes the preview modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeImagePreview();
  });

  // Load all static PNGs from AssetLoader (fallback)
  AssetLoader.load().then(() => {
    // Register event listeners for the header controls
    document.getElementById('btn-generate').addEventListener('click', onGenerateClick);
    document.getElementById('btn-clear').addEventListener('click', onClearClick);
    document.getElementById('btn-lang').addEventListener('click', onLangToggle);

    // Detect clicks on the canvas to select rooms
    AppState.canvas.addEventListener('click', onCanvasClick);

    // Track the mousedown position to differentiate a click from a drag.
    // If the user dragged the map (pan), the click handler will be ignored.
    AppState.canvas.addEventListener('mousedown', (e) => {
      const rect = AppState.canvas.getBoundingClientRect();
      _mouseDownPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });

    // Update the canvas when the window is resized
    window.addEventListener('resize', onWindowResize);

    // Make the canvas fill the container initially
    onWindowResize();

    // Display a welcome message in the header status
    _setStatus(I18n.t('status.welcome'));
  });
}

// -----------------------------------------------
// _initDropZone()
// Sets up the drop zone with all the event listeners
// needed to drag image files from the computer
// into the assets panel.
//
// Supports two upload methods:
//  1. Dragging files directly onto the div#drop-zone
//  2. Clicking the div to open the native file picker
// -----------------------------------------------
function _initDropZone() {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (!dropZone || !fileInput) return;

  // ---- Drag & drop via mouse ----

  // Prevent the browser's default behavior (opening the file in the tab)
  // and add the visual "file hovering" class
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  // Remove the highlight when the file leaves the area without being dropped
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  // Process the files dropped on the drop zone
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    // Read the files from the drop event and send them to UserAssets
    const files = Array.from(e.dataTransfer.files);
    _processFiles(files);
  });

  // ---- Selection via click ----

  // Clicking on the drop zone triggers the hidden input[type=file]
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Process the files selected through the file picker
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    _processFiles(files);

    // Clear the input value to allow selecting the same file again
    fileInput.value = '';
  });
}

// -----------------------------------------------
// _processFiles(files)
// Sends an array of Files to UserAssets.
// Ignores individual errors (invalid file) without blocking the rest.
//
// @param {File[]} files
// -----------------------------------------------
function _processFiles(files) {
  files.forEach(file => {
    UserAssets.add(file).catch(err => {
      // Silent error — the warning was already logged by UserAssets
      console.warn('[main] File ignored:', err.message);
    });
  });
}

// -----------------------------------------------
// _renderAssetSidebar(assets)
// Redraws the list of cards on the left sidebar
// based on the current UserAssets array.
//
// Each card displays:
//  - Image thumbnail
//  - File name (truncated)
//  - Room type selector (any/normal/start/end/boss)
//  - Remove button (x)
//
// This function is passed as a callback to UserAssets.init()
// and called automatically whenever the state changes.
//
// @param {UserAsset[]} assets  current array returned by UserAssets
// -----------------------------------------------
function _renderAssetSidebar(assets) {
  const list = document.getElementById('user-asset-list');
  if (!list) return;

  // Clear the previous list
  list.innerHTML = '';

  // No assets: display a help message
  if (assets.length === 0) {
    const hint = document.createElement('p');
    hint.className   = 'ua-empty-hint';
    hint.textContent = I18n.t('asset.emptyHint');
    list.appendChild(hint);
    return;
  }

  // Create a card for each loaded asset
  assets.forEach(asset => {
    // Card container
    const card = document.createElement('div');
    card.className      = 'ua-card';
    card.dataset.assetId = asset.id;

    // Image thumbnail
    const thumb = document.createElement('img');
    thumb.className = 'ua-card-thumb';
    thumb.src       = asset.dataURL;
    thumb.alt       = asset.name;
    // Clicking the thumbnail opens the enlarged preview modal
    thumb.style.cursor = 'zoom-in';
    thumb.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent propagation to the card
      _openImagePreview(asset.dataURL);
    });

    // Center column with name and type selector
    const info = document.createElement('div');
    info.className = 'ua-card-info';

    // File name (truncated via CSS)
    const nameEl = document.createElement('span');
    nameEl.className   = 'ua-card-name';
    nameEl.textContent = asset.name;
    nameEl.title       = asset.name;  // tooltip with full name

    // Room type selector — defines which rooms can use this image
    const typeSelect = document.createElement('select');
    typeSelect.className = 'ua-type-select';

    // Available type options
    const typeOptions = [
      { value: 'any',    label: I18n.t('asset.typeAny')    },
      { value: 'normal', label: I18n.t('asset.typeNormal') },
      { value: 'start',  label: I18n.t('asset.typeStart')  },
      { value: 'end',    label: I18n.t('asset.typeEnd')    },
      { value: 'boss',   label: I18n.t('asset.typeBoss')   },
    ];

    typeOptions.forEach(opt => {
      const option       = document.createElement('option');
      option.value       = opt.value;
      option.textContent = opt.label;
      // Pre-select the current type of the asset
      if (opt.value === asset.type) option.selected = true;
      typeSelect.appendChild(option);
    });

    // When the type changes, notify UserAssets and update the state
    typeSelect.addEventListener('change', () => {
      UserAssets.setType(asset.id, typeSelect.value);
    });

    // Button to remove the asset
    const removeBtn  = document.createElement('button');
    removeBtn.className   = 'ua-remove';
    removeBtn.textContent = '✕';
    removeBtn.title       = I18n.t('asset.removeTitle', asset.name);

    removeBtn.addEventListener('click', () => {
      UserAssets.remove(asset.id);
    });

    // Assemble the card in order: thumbnail | info (name + type) | remove button
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
// Triggered by the "Generate Map" button in the header.
// Reads seed and size, generates the map, and renders it.
// -----------------------------------------------
function onGenerateClick() {
  // Read the value entered in the seed field
  const seedInput = document.getElementById('input-seed').value.trim();

  // If the field is empty, generate a readable random seed (e.g., "CAVE-4821")
  const seed = seedInput !== '' ? seedInput : Random.generateSeedString();

  // Update the input field with the seed used (so the user sees which one was used)
  document.getElementById('input-seed').value = seed;

  // Read the map size selected in the dropdown
  const size = document.getElementById('select-size').value;

  // Show the "Generating map..." overlay on the canvas during processing
  _setOverlayVisible(true);

  // Use setTimeout to allow the overlay to render before JS blocks
  // (generation is synchronous and heavy for large maps)
  setTimeout(() => {
    // Generate the map with the selected parameters.
    // Pass UserAssets so the generator uses the user's images
    // when procedurally assigning visuals to rooms.
    AppState.map  = MapGenerator.generate({
      seed,
      size,
      assets:     AssetLoader,   // fallback for static PNGs
      userAssets: UserAssets,    // images uploaded by the user
    });
    AppState.seed = seed;

    // Reset the camera and center on the starting room of the generated map
    Camera.reset();
    const startRoom = AppState.map.rooms.find(r => r.type === 'start');
    if (startRoom) {
      // Find the center of the starting room to center the camera
      const cx = startRoom.x + startRoom.width  / 2;
      const cy = startRoom.y + startRoom.height / 2;
      Camera.centerOn(cx, cy, AppState.canvas.width, AppState.canvas.height);
    }

    // Render the map on the canvas
    Renderer.draw(AppState.map);

    // Hide the loading overlay
    _setOverlayVisible(false);

    // Build information about user asset usage for the status
    const userAssetCount = UserAssets.getAll().length;
    const assetInfo      = userAssetCount > 0
      ? I18n.t('status.customAssets', userAssetCount)
      : '';

    // Update the header status with seed and number of generated rooms
    _setStatus(I18n.t('status.generated', seed, AppState.map.rooms.length, AppState.map.corridors.length) + assetInfo);

    // Display the raw map data in the debug panel
    updateDebugPanel({
      seed:        AppState.map.seed,
      size,
      rooms:       AppState.map.rooms.length,
      corridors:   AppState.map.corridors.length,
      mapWidth:    AppState.map.width,
      mapHeight:   AppState.map.height,
      userAssets:  userAssetCount,
    });
  }, 10); // minimum 10ms delay to let the browser render the overlay
}

// -----------------------------------------------
// onClearClick()
// Triggered by the "Clear" button in the header.
// Removes the map from state and clears the canvas.
// User assets are NOT removed on clear —
// the user manages them directly in the sidebar.
// -----------------------------------------------
function onClearClick() {
  // Remove the map from global state
  AppState.map  = null;
  AppState.seed = null;

  // Reset the camera to its initial position and zoom
  Camera.reset();

  // Clear all annotation pins (positions lose meaning without the map)
  PinManager.clear();
  Renderer.setPins([]);

  // Redraw (with a null map, only the background is shown)
  Renderer.draw(null);

  // Clear the room details panel
  document.getElementById('room-details').innerHTML = `<p>${I18n.t('details.placeholder')}</p>`;

  // Clear the debug panel
  document.getElementById('debug-output').textContent = '';

  // Clear the seed field
  document.getElementById('input-seed').value = '';

  // Restore the default message in the header status
  const userAssetCount = UserAssets.getAll().length;
  _setStatus(userAssetCount > 0
    ? I18n.t('status.withAssets', userAssetCount)
    : I18n.t('status.welcome')
  );
}

// -----------------------------------------------
// onCanvasClick(event)
// Detects which room was clicked on the canvas.
// Converts screen coordinates to map coordinates
// and performs hit-testing on each room.
// -----------------------------------------------
function onCanvasClick(event) {
  // No generated map, nothing to click
  if (!AppState.map) return;

  // Calculate the click position relative to the canvas (not the entire window)
  const rect    = AppState.canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;

  // -- Drag detection: if the mouse moved more than 5px since mousedown,
  // the user was dragging to pan the camera — ignore the click.
  if (_mouseDownPos) {
    const dx = screenX - _mouseDownPos.x;
    const dy = screenY - _mouseDownPos.y;
    if (Math.hypot(dx, dy) > 5) return;
  }

  // Convert screen coordinates to map coordinates
  // taking into account camera pan and zoom
  const worldPos = Camera.screenToWorld(screenX, screenY);

  // -- Priority 1: check click on an existing pin (always, in any mode)
  // The pin circle is centered at (pin.x, pin.y - 12); hit radius = 10px
  const pins = PinManager.getAll();
  for (const pin of pins) {
    const dist = Math.hypot(worldPos.x - pin.x, worldPos.y - (pin.y - 12));
    if (dist <= 10) {
      // Found a pin: display details in the right panel
      _showPinDetails(pin);
      // Expand the pins section and scroll to the card
      _expandSection('section-pins');
      _scrollToPinCard(pin.id);
      return;
    }
  }

  // -- Priority 2: if pin mode is active, insert a new pin
  // Pins can only be placed on corridors!
  if (AppState._pinMode) {
    if (_isOnCorridor(worldPos)) {
      const pin = PinManager.add(worldPos.x, worldPos.y);
      // Automatically deactivate pin mode after placing
      _deactivatePinMode();
      // Open the pins section and scroll to the new card
      _expandSection('section-pins');
      _scrollToPinCard(pin.id);
    }
    return;
  }

  // -- Priority 3: hit-test on the map rooms
  const clickedRoom = AppState.map.rooms.find(room =>
    MathUtils.pointInRect(worldPos, room)
  );

  if (clickedRoom) {
    // Display the clicked room's details in the right panel
    _showRoomDetails(clickedRoom);

    // Trigger the visual highlight of the room on the canvas
    Renderer.highlightRoom(clickedRoom);
  } else {
    // Clicked on empty area: clear the selection
    document.getElementById('room-details').innerHTML = `<p>${I18n.t('details.placeholder')}</p>`;
    Renderer.highlightRoom(null);
  }
}

// -----------------------------------------------
// onWindowResize()
// Resizes the canvas when the window changes size.
// -----------------------------------------------
function onWindowResize() {
  Renderer.resizeCanvas();
}

// -----------------------------------------------
// updateDebugPanel(data)
// Displays formatted internal data in the #debug-output panel.
//
// @param {object} data  any serializable object
// -----------------------------------------------
function updateDebugPanel(data) {
  const formatted = JSON.stringify(data, null, 2);
  document.getElementById('debug-output').textContent = formatted;
}

// -----------------------------------------------
// _showRoomDetails(room)
// Displays a room's properties in the #room-details panel.
// Includes information about the image (user asset or static asset).
//
// @param {Room} room
// -----------------------------------------------
function _showRoomDetails(room) {
  // Determine which image is being used for this room
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

  document.getElementById('room-details').innerHTML = html;
}

// -----------------------------------------------
// _setStatus(message)
// Updates the status text in the application header.
// -----------------------------------------------
function _setStatus(message) {
  const el = document.getElementById('status-text');
  if (el) el.textContent = message;
}

// -----------------------------------------------
// _setOverlayVisible(visible)
// Shows or hides the "Generating map..." overlay on the canvas.
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
// onLangToggle()
// Switches the UI language between English and Portuguese.
// Re-translates all static DOM and re-renders dynamic content.
// -----------------------------------------------
function onLangToggle() {
  I18n.toggle();
  I18n.translateDOM();

  // Re-render dynamic sidebars with new language
  _renderAssetSidebar(UserAssets.getAll());
  _renderPinSidebar(PinManager.getAll());

  // Update status text based on current app state
  if (AppState.map) {
    const userAssetCount = UserAssets.getAll().length;
    const assetInfo = userAssetCount > 0
      ? I18n.t('status.customAssets', userAssetCount)
      : '';
    _setStatus(
      I18n.t('status.generated',
        AppState.seed,
        AppState.map.rooms.length,
        AppState.map.corridors.length
      ) + assetInfo
    );
  } else {
    const userAssetCount = UserAssets.getAll().length;
    _setStatus(userAssetCount > 0
      ? I18n.t('status.withAssets', userAssetCount)
      : I18n.t('status.welcome')
    );
  }

  // Reset right panel to placeholder (no tracking of selected entity)
  document.getElementById('room-details').innerHTML =
    `<p>${I18n.t('details.placeholder')}</p>`;
}

// -----------------------------------------------
// _openImagePreview(dataURL)
// Opens the enlarged image preview modal for an asset.
// Displayed when clicking the thumbnail of a .ua-card in the sidebar.
//
// @param {string} dataURL  base64 data URL of the image
// -----------------------------------------------
function _openImagePreview(dataURL) {
  const modal = document.getElementById('img-preview-modal');
  const img   = document.getElementById('img-preview-img');
  if (!modal || !img) return;

  // Set the image and show the modal by removing the .hidden class
  img.src = dataURL;
  modal.classList.remove('hidden');
}

// -----------------------------------------------
// _closeImagePreview()
// Closes the preview modal and clears the displayed image.
// Called when clicking the backdrop, the close button, or pressing ESC.
// -----------------------------------------------
function _closeImagePreview() {
  const modal = document.getElementById('img-preview-modal');
  const img   = document.getElementById('img-preview-img');
  if (!modal) return;

  modal.classList.add('hidden');
  if (img) img.src = ''; // release the reference to facilitate garbage collection
}

// -----------------------------------------------
// _initSidebarSections()
// Sets up the collapsible sections (accordion) system for the sidebar.
// Each .sidebar-section-header button collapses/expands its content.
// Multiple sections can be open simultaneously.
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
        // Expand: remove .collapsed and mark the header as active
        content.classList.remove('collapsed');
        header.classList.add('active');
        // Update the arrow to down-pointing (open)
        const arrow = header.querySelector('.section-arrow');
        if (arrow) arrow.innerHTML = '&#9660;';
      } else {
        // Collapse: add .collapsed and unmark the header
        content.classList.add('collapsed');
        header.classList.remove('active');
        // Update the arrow to right-pointing (closed)
        const arrow = header.querySelector('.section-arrow');
        if (arrow) arrow.innerHTML = '&#9654;';
      }
    });
  });
}

// -----------------------------------------------
// _expandSection(sectionId)
// Programmatically expands a sidebar section.
// If the section is already open, does nothing.
//
// @param {string} sectionId  data-section value / content element id
// -----------------------------------------------
function _expandSection(sectionId) {
  const content = document.getElementById(sectionId);
  if (!content) return;

  // Only needs to act if currently collapsed
  if (content.classList.contains('collapsed')) {
    const header = document.querySelector(`.sidebar-section-header[data-section="${sectionId}"]`);
    if (header) header.click();
  }
}

// -----------------------------------------------
// _initPinMode()
// Sets up the #btn-pin-mode button to toggle the
// pin insertion mode on the canvas.
//
// When active:
//  - AppState._pinMode = true
//  - Button receives the .active class (visual highlight)
//  - Canvas receives the .pin-mode class (crosshair cursor via CSS)
// -----------------------------------------------
function _initPinMode() {
  const btn = document.getElementById('btn-pin-mode');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Toggle pin mode state
    AppState._pinMode = !AppState._pinMode;

    // Sync the visual classes with the new state
    btn.classList.toggle('active', AppState._pinMode);
    AppState.canvas.classList.toggle('pin-mode', AppState._pinMode);
  });
}

// -----------------------------------------------
// _renderPinSidebar(pins)
// Redraws the list of pin cards in the "Pins" section of the sidebar.
// Passed as a callback to PinManager.init() and called on
// add / remove / clear / toggleCompleted.
//
// Each card has two modes:
//  - VIEW (default): label + note as text, edit and delete buttons
//  - EDIT: label input + note textarea, confirm and discard buttons
//
// The option to mark as completed does NOT appear here —
// it only exists in the details panel of the right sidebar.
//
// @param {Array<{id, x, y, label, note, completed}>} pins
// -----------------------------------------------
function _renderPinSidebar(pins) {
  const list = document.getElementById('pin-list');
  if (!list) return;

  list.innerHTML = '';

  // No pins: display a guidance message
  if (pins.length === 0) {
    const hint = document.createElement('p');
    hint.className   = 'pin-empty-hint';
    hint.textContent = I18n.t('pin.emptyHint');
    list.appendChild(hint);
    return;
  }

  pins.forEach(pin => {
    // Card container
    const card = document.createElement('div');
    card.className       = 'pin-card' + (pin.completed ? ' completed' : '');
    card.dataset.pinId   = pin.id;

    // ════════════════════════════════════════════
    // VIEW MODE — visible by default
    // ════════════════════════════════════════════
    const viewDiv = document.createElement('div');
    viewDiv.className = 'pin-view';

    // Header: icon + label text + edit button + delete button
    const viewHeader = document.createElement('div');
    viewHeader.className = 'pin-card-header';

    const viewIcon = document.createElement('span');
    viewIcon.textContent = '📍';

    // Pin label as text (non-editable)
    const labelText = document.createElement('span');
    labelText.className   = 'pin-label-text';
    labelText.textContent = pin.label;

    // Edit button — switches to edit mode
    const editBtn = document.createElement('button');
    editBtn.className   = 'pin-edit-btn';
    editBtn.textContent = '✏️';
    editBtn.title       = I18n.t('pin.editTitle');

    // Delete button — permanently removes the pin
    const trashBtn = document.createElement('button');
    trashBtn.className   = 'pin-trash-btn';
    trashBtn.textContent = '🗑️';
    trashBtn.title       = I18n.t('pin.trashTitle');

    viewHeader.appendChild(viewIcon);
    viewHeader.appendChild(labelText);
    viewHeader.appendChild(editBtn);
    viewHeader.appendChild(trashBtn);

    // Annotation text (read-only)
    const notePreview = document.createElement('p');
    notePreview.className   = 'pin-note-preview';
    notePreview.textContent = pin.note || I18n.t('pin.noNote');

    viewDiv.appendChild(viewHeader);
    viewDiv.appendChild(notePreview);

    // ════════════════════════════════════════════
    // EDIT MODE — hidden by default
    // ════════════════════════════════════════════
    const editDiv = document.createElement('div');
    editDiv.className     = 'pin-edit-mode';
    editDiv.style.display = 'none';

    // Header: icon + label input + confirm button + discard button
    const editHeader = document.createElement('div');
    editHeader.className = 'pin-card-header';

    const editIcon = document.createElement('span');
    editIcon.textContent = '📍';

    // Label input — editable during edit mode
    const labelInput = document.createElement('input');
    labelInput.type        = 'text';
    labelInput.className   = 'pin-label-input';
    labelInput.value       = pin.label;
    labelInput.placeholder = I18n.t('pin.labelPlaceholder');

    // Confirm button — saves the text changes
    const confirmBtn = document.createElement('button');
    confirmBtn.className   = 'pin-confirm-btn';
    confirmBtn.textContent = '✓';
    confirmBtn.title       = I18n.t('pin.confirmTitle');

    // Discard button — cancels and reverts the changes
    const discardBtn = document.createElement('button');
    discardBtn.className   = 'pin-discard-btn';
    discardBtn.textContent = '🗑️';
    discardBtn.title       = I18n.t('pin.discardTitle');

    editHeader.appendChild(editIcon);
    editHeader.appendChild(labelInput);
    editHeader.appendChild(confirmBtn);
    editHeader.appendChild(discardBtn);

    // Note textarea — editable during edit mode
    const noteArea = document.createElement('textarea');
    noteArea.className   = 'pin-note-input';
    noteArea.value       = pin.note;
    noteArea.placeholder = I18n.t('pin.notePlaceholder');
    noteArea.rows        = 3;

    editDiv.appendChild(editHeader);
    editDiv.appendChild(noteArea);

    // ════════════════════════════════════════════
    // EVENT HANDLERS
    // ════════════════════════════════════════════

    // Enter edit mode
    editBtn.addEventListener('click', () => {
      // Populate inputs with the pin's current values
      labelInput.value = pin.label;
      noteArea.value   = pin.note;
      // Toggle visibility
      viewDiv.style.display = 'none';
      editDiv.style.display = '';
      labelInput.focus();
    });

    // Confirm edit — save the text and return to view mode
    confirmBtn.addEventListener('click', () => {
      // Save the changes silently (without a full re-render)
      PinManager.updateSilent(pin.id, {
        label: labelInput.value,
        note:  noteArea.value,
      });
      // Update the text in the view directly (without re-render)
      labelText.textContent   = labelInput.value;
      notePreview.textContent = noteArea.value || I18n.t('pin.noNote');
      // Return to view mode
      viewDiv.style.display = '';
      editDiv.style.display = 'none';
      // Redraw the canvas to reflect the updated label
      Renderer.redraw();
    });

    // Discard edit — revert the inputs and return to view mode
    discardBtn.addEventListener('click', () => {
      // Revert to the original values
      labelInput.value = pin.label;
      noteArea.value   = pin.note;
      // Return to view mode
      viewDiv.style.display = '';
      editDiv.style.display = 'none';
    });

    // Delete pin permanently
    trashBtn.addEventListener('click', () => {
      PinManager.remove(pin.id);  // triggers _notify → re-render sidebar + canvas
    });

    // Assemble the card with both modes
    card.appendChild(viewDiv);
    card.appendChild(editDiv);
    list.appendChild(card);
  });
}

// -----------------------------------------------
// _scrollToPinCard(id)
// Scrolls the sidebar to the indicated pin's card and
// applies a temporary highlight for 1.5 seconds.
//
// @param {number} id  Pin ID (PinManager)
// -----------------------------------------------
function _scrollToPinCard(id) {
  const card = document.querySelector(`.pin-card[data-pin-id="${id}"]`);
  if (!card) return;

  // Smoothly scroll until the card is visible in the sidebar
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Apply the .selected class for temporary visual highlight
  card.classList.add('selected');
  setTimeout(() => card.classList.remove('selected'), 1500);
}

// -----------------------------------------------
// _isOnCorridor(worldPos)
// Checks whether a point in world coordinates lies
// within any corridor segment of the current map.
// Used to restrict pin placement to corridors only.
//
// @param {{x:number, y:number}} worldPos
// @returns {boolean}
// -----------------------------------------------
function _isOnCorridor(worldPos) {
  if (!AppState.map || !AppState.map.corridors) return false;

  // Hit margin slightly larger than half the visual corridor width
  // to make clicking easier (default corridorWidth = 16px -> halfW = 10px)
  const HALF_W = 10;

  for (const corridor of AppState.map.corridors) {
    const pts = corridor.points;
    if (!pts || pts.length < 2) continue;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];

      // AABB (bounding box) of the segment expanded by the margin
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
// Deactivates the pin insertion mode.
// Called automatically after placing a pin,
// or manually when clicking the toggle button again.
// -----------------------------------------------
function _deactivatePinMode() {
  AppState._pinMode = false;
  const btn = document.getElementById('btn-pin-mode');
  if (btn) btn.classList.remove('active');
  AppState.canvas.classList.remove('pin-mode');
}

// -----------------------------------------------
// _showPinDetails(pin)
// Displays a pin's properties in the #room-details panel
// (right sidebar). Includes a button to mark/unmark
// the pin as completed.
//
// @param {{id, x, y, label, note, completed}} pin
// -----------------------------------------------
function _showPinDetails(pin) {
  const statusText = pin.completed ? I18n.t('pin.completed') : I18n.t('pin.pending');
  const btnLabel   = pin.completed ? I18n.t('pin.unmarkCompleted') : I18n.t('pin.markCompleted');
  const btnClass   = pin.completed ? 'pin-status-btn completed' : 'pin-status-btn';

  const noteHtml = pin.note
    ? pin.note.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
    : '—';

  const html = `
    <table>
      <tr><td><strong>${I18n.t('pin.label')}</strong></td><td>${pin.label}</td></tr>
      <tr><td><strong>${I18n.t('pin.position')}</strong></td><td>x: ${Math.round(pin.x)}, y: ${Math.round(pin.y)}</td></tr>
      <tr><td><strong>${I18n.t('pin.note')}</strong></td><td>${noteHtml}</td></tr>
      <tr><td><strong>${I18n.t('pin.status')}</strong></td><td>${statusText}</td></tr>
    </table>
    <button class="${btnClass}" data-pin-id="${pin.id}">${btnLabel}</button>
  `;

  document.getElementById('room-details').innerHTML = html;

  // Register the listener on the newly created status button
  const statusBtn = document.querySelector('.pin-status-btn');
  if (statusBtn) {
    statusBtn.addEventListener('click', () => {
      PinManager.toggleCompleted(pin.id);
      // Update the panel with the pin's new state
      const updatedPin = PinManager.getAll().find(p => p.id === pin.id);
      if (updatedPin) _showPinDetails(updatedPin);
    });
  }
}

// -----------------------------------------------
// Initialize when the DOM is fully loaded
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', init);
