import { I18n } from '../i18n.ts';
import type { Pin } from '../types.ts';

export const PinManager = (() => {
  let _pins: Pin[] = [];
  let _nextId = 0;
  let _onChangeCb: (pins: Pin[]) => void = () => {};

  function init(onChangeCb: (pins: Pin[]) => void) {
    _onChangeCb = typeof onChangeCb === 'function' ? onChangeCb : () => {};
  }

  function add(x: number, y: number) {
    const id = _nextId++;
    const pin: Pin = {
      id,
      x,
      y,
      label: I18n.t('pin.defaultLabel', id + 1),
      note: '',
      completed: false,
    };
    _pins.push(pin);
    _notify();
    return pin;
  }

  function remove(id: number) {
    _pins = _pins.filter((p) => p.id !== id);
    _notify();
  }

  function update(id: number, { label, note }: { label?: string; note?: string } = {}) {
    const pin = _pins.find((p) => p.id === id);
    if (!pin) return;
    if (label !== undefined) pin.label = label;
    if (note !== undefined) pin.note = note;
    _notify();
  }

  function updateSilent(id: number, { label, note }: { label?: string; note?: string } = {}) {
    const pin = _pins.find((p) => p.id === id);
    if (!pin) return;
    if (label !== undefined) pin.label = label;
    if (note !== undefined) pin.note = note;
  }

  function toggleCompleted(id: number) {
    const pin = _pins.find((p) => p.id === id);
    if (!pin) return;
    pin.completed = !pin.completed;
    _notify();
  }

  function getAll() {
    return [..._pins];
  }

  function clear() {
    _pins = [];
    _notify();
  }

  function _notify() {
    _onChangeCb([..._pins]);
  }

  return { init, add, remove, update, updateSilent, toggleCompleted, getAll, clear };
})();
