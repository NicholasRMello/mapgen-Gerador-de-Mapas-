/**
 * userAssets.js — User-uploaded image management
 *
 * Responsibilities:
 *  - Receive image files via drag-and-drop or file selection
 *  - Maintain a local (in-memory) cache of loaded images
 *  - Allow the user to set the type of each image
 *    (any | normal | start | end | boss)
 *  - Provide images to the MapGenerator sorted by room type
 *
 * UserAsset structure:
 * {
 *   id:      number,   // unique auto-incremented identifier
 *   name:    string,   // original file name
 *   dataURL: string,   // base64-encoded image (for persistence and display)
 *   img:     HTMLImageElement,
 *   type:    string,   // 'any' | 'normal' | 'start' | 'end' | 'boss'
 * }
 *
 * Fallback chain in MapGenerator:
 *   getByType(roomType) → exact match → 'any' → [] (generator uses colored fallback)
 */

const UserAssets = (() => {

  // Internal array of user assets
  // Modified only by this module's functions
  let _assets = [];

  // Auto-incremented counter for unique IDs
  let _nextId = 0;

  // Callback function called whenever the _assets state changes
  // Used by main.js to re-render the sidebar
  let _onChangeCb = null;

  // ---------------------------------------------------
  // init(onChangeCallback)
  // Registers the callback function that will be called
  // whenever assets are added, removed, or have their
  // type changed.
  //
  // @param {Function} onChangeCallback  receives the current asset array
  // ---------------------------------------------------
  function init(onChangeCallback) {
    _onChangeCb = typeof onChangeCallback === 'function'
      ? onChangeCallback
      : function () {};
  }

  // ---------------------------------------------------
  // add(file)
  // Reads an image file via FileReader, creates an
  // HTMLImageElement, and stores it in the internal cache.
  //
  // The default type is 'any': the image can be used for
  // any room type until the user changes it.
  //
  // @param {File} file  image file (image/*)
  // @returns {Promise<UserAsset>}  resolves with the created asset
  // ---------------------------------------------------
  function add(file) {
    return new Promise((resolve, reject) => {

      // Reject files that are not images
      if (!file.type.startsWith('image/')) {
        console.warn(`[UserAssets] File ignored (not an image): "${file.name}"`);
        reject(new Error(I18n.t('error.notImage', file.name)));
        return;
      }

      // Read the file as a Data URL (base64) for display in the sidebar
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataURL = e.target.result;

        // Create the image element for use on the canvas (drawImage)
        const img = new Image();

        img.onload = () => {
          // Build the asset object with all required properties
          const asset = {
            id:      _nextId++,
            name:    file.name,
            dataURL,
            img,
            type:    'any',   // default type: can be used for any room
          };

          _assets.push(asset);

          // Notify main.js to re-render the sidebar
          _notify();

          resolve(asset);
        };

        img.onerror = () => {
          console.warn(`[UserAssets] Could not decode image: "${file.name}"`);
          reject(new Error(I18n.t('error.decodeFail', file.name)));
        };

        // Start loading the image from Base64
        img.src = dataURL;
      };

      reader.onerror = () => {
        reject(new Error(I18n.t('error.readFail', file.name)));
      };

      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------
  // remove(id)
  // Removes an asset from the cache by its ID.
  // Notifies the callback after removal.
  //
  // @param {number} id  unique identifier of the asset
  // ---------------------------------------------------
  function remove(id) {
    // Filter out the asset with the given ID, keeping all others
    _assets = _assets.filter(a => a.id !== id);
    _notify();
  }

  // ---------------------------------------------------
  // setType(id, type)
  // Changes the type of an existing asset.
  // The type controls which rooms can use this image.
  //
  // Does NOT fire _notify() intentionally: the selector
  // in the sidebar already reflects the new state
  // immediately through the DOM 'change' event itself.
  // Re-rendering the entire list would destroy focus on
  // the element and cause unnecessary flickering.
  //
  // @param {number} id    unique identifier of the asset
  // @param {string} type  'any' | 'normal' | 'start' | 'end' | 'boss'
  // ---------------------------------------------------
  function setType(id, type) {
    const asset = _assets.find(a => a.id === id);
    if (!asset) return;

    // Only mutate the internal data — the sidebar already shows the correct value
    asset.type = type;
  }

  // ---------------------------------------------------
  // getByType(type)
  // Returns assets whose type matches the requested one.
  //
  // Fallback logic:
  //  1. Search for assets with type === roomType (exact match)
  //  2. If none found, return assets with type === 'any'
  //  3. If none, return an empty array (generator uses colored fallback)
  //
  // This ensures that "Any" images fill gaps when there
  // is no specific image for that room type.
  //
  // @param {string} type  requested room type
  // @returns {UserAsset[]}
  // ---------------------------------------------------
  function getByType(type) {
    // Search by exact type match
    const exact = _assets.filter(a => a.type === type);
    if (exact.length > 0) return exact;

    // Fallback: return images marked as "Any"
    return _assets.filter(a => a.type === 'any');
  }

  // ---------------------------------------------------
  // getAll()
  // Returns a copy of all loaded assets.
  // Used by the sidebar to render the cards.
  //
  // @returns {UserAsset[]}
  // ---------------------------------------------------
  function getAll() {
    return [..._assets];
  }

  // ---------------------------------------------------
  // hasAny()
  // Indicates whether at least one asset is loaded.
  // Used by MapGenerator to decide between
  // user assets and AssetLoader.
  //
  // @returns {boolean}
  // ---------------------------------------------------
  function hasAny() {
    return _assets.length > 0;
  }

  // ---------------------------------------------------
  // clear()
  // Removes all assets and notifies the callback.
  // ---------------------------------------------------
  function clear() {
    _assets = [];
    _notify();
  }

  // ---------------------------------------------------
  // _notify()
  // Calls the registered callback with the current array.
  // Internal function — not exposed in the public API.
  // ---------------------------------------------------
  function _notify() {
    if (_onChangeCb) _onChangeCb([..._assets]);
  }

  // ---------------------------------------------------
  // Public API
  // ---------------------------------------------------
  return { init, add, remove, setType, getByType, getAll, hasAny, clear };

})();
