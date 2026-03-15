/**
 * PinManager — manages annotation pins placed on the canvas.
 *
 * Each pin has:
 *   id        {number}   — unique auto-incremented identifier
 *   x         {number}   — X coordinate in world space (world coords)
 *   y         {number}   — Y coordinate in world space (pin tip)
 *   label     {string}   — short label displayed on the canvas above the pin
 *   note      {string}   — long annotation visible only in the sidebar
 *   completed {boolean}  — if true, the pin turns green (obstacle already overcome)
 *
 * IIFE pattern identical to userAssets.js — no bundler, no dependencies.
 */
const PinManager = (() => {

  /* ────────────────────────────────────────────────────────────────────────
     Internal state
  ──────────────────────────────────────────────────────────────────────── */

  /** @type {Array<{id:number, x:number, y:number, label:string, note:string, completed:boolean}>} */
  let _pins = [];

  /** Counter to generate always-increasing unique IDs */
  let _nextId = 0;

  /**
   * Callback registered by main.js; called whenever the pin list
   * changes (add / remove / clear / toggleCompleted).  Receives a shallow copy of the array.
   * @type {Function|null}
   */
  let _onChangeCb = null;

  /* ────────────────────────────────────────────────────────────────────────
     Public API
  ──────────────────────────────────────────────────────────────────────── */

  /**
   * Registers a callback that will be invoked whenever the pin list
   * undergoes a structural change (add / remove / clear / toggleCompleted).
   *
   * @param {function(Array)} onChangeCb - Receives a copy of the pin array.
   */
  function init(onChangeCb) {
    _onChangeCb = typeof onChangeCb === 'function' ? onChangeCb : () => {};
  }

  /**
   * Creates and adds a new pin at the given world coordinates.
   * Fires the change callback.
   *
   * @param {number} x - X coordinate in world space.
   * @param {number} y - Y coordinate in world space (pin tip).
   * @returns {{id, x, y, label, note, completed}} The newly created pin.
   */
  function add(x, y) {
    const id = _nextId++;
    const pin = {
      id,
      x,
      y,
      label:     I18n.t('pin.defaultLabel', id + 1),
      note:      '',
      completed: false,
    };
    _pins.push(pin);
    _notify();
    return pin;
  }

  /**
   * Removes the pin with the given id and fires the callback.
   *
   * @param {number} id - ID of the pin to remove.
   */
  function remove(id) {
    _pins = _pins.filter(p => p.id !== id);
    _notify();
  }

  /**
   * Updates the label and/or note of a pin and fires the change callback.
   * Use this method only from code (not during user typing).
   * For silent updates during typing, use `updateSilent()`.
   *
   * @param {number} id
   * @param {{ label?: string, note?: string }} data
   */
  function update(id, { label, note } = {}) {
    const pin = _pins.find(p => p.id === id);
    if (!pin) return;
    if (label !== undefined) pin.label = label;
    if (note  !== undefined) pin.note  = note;
    _notify();
  }

  /**
   * Updates the label and/or note of a pin WITHOUT firing the callback.
   * Used by typing handlers (input event) to prevent the sidebar DOM
   * from being re-rendered while the user is typing — which would
   * destroy focus on the text field.
   *
   * @param {number} id
   * @param {{ label?: string, note?: string }} data
   */
  function updateSilent(id, { label, note } = {}) {
    const pin = _pins.find(p => p.id === id);
    if (!pin) return;
    if (label !== undefined) pin.label = label;
    if (note  !== undefined) pin.note  = note;
    // _notify() intentionally omitted
  }

  /**
   * Toggles the completed state of a pin.
   * Completed pins turn green on the canvas, indicating that the
   * obstacle/event has already been overcome by the players.
   * Fires the change callback.
   *
   * @param {number} id
   */
  function toggleCompleted(id) {
    const pin = _pins.find(p => p.id === id);
    if (!pin) return;
    pin.completed = !pin.completed;
    _notify();
  }

  /**
   * Returns a shallow copy of the pin array.
   *
   * @returns {Array<{id, x, y, label, note, completed}>}
   */
  function getAll() {
    return [..._pins];
  }

  /**
   * Removes all pins and fires the callback.
   * Called when the map is cleared (onClearClick).
   */
  function clear() {
    _pins = [];
    _notify();
  }

  /* ────────────────────────────────────────────────────────────────────────
     Internal
  ──────────────────────────────────────────────────────────────────────── */

  /**
   * Invokes the registered callback with a shallow copy of the current list.
   * Always passes a copy to prevent accidental mutations by the consumer.
   */
  function _notify() {
    if (_onChangeCb) _onChangeCb([..._pins]);
  }

  /* ────────────────────────────────────────────────────────────────────────
     Exports
  ──────────────────────────────────────────────────────────────────────── */

  return { init, add, remove, update, updateSilent, toggleCompleted, getAll, clear };

})();
