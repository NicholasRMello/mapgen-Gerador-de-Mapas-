/**
 * PinManager — gerencia pinos de anotação colocados no canvas.
 *
 * Cada pino tem:
 *   id        {number}   — identificador único auto-incrementado
 *   x         {number}   — coordenada X no espaço do mundo (world coords)
 *   y         {number}   — coordenada Y no espaço do mundo (a ponta do pino)
 *   label     {string}   — rótulo curto exibido no canvas acima do pino
 *   note      {string}   — anotação longa visível apenas na sidebar
 *   completed {boolean}  — se true, o pino fica verde (obstáculo já superado)
 *
 * Padrão IIFE idêntico ao de userAssets.js — sem bundler, sem dependências.
 */
const PinManager = (() => {

  /* ────────────────────────────────────────────────────────────────────────
     Estado interno
  ──────────────────────────────────────────────────────────────────────── */

  /** @type {Array<{id:number, x:number, y:number, label:string, note:string, completed:boolean}>} */
  let _pins = [];

  /** Contador para gerar IDs únicos sempre crescentes */
  let _nextId = 0;

  /**
   * Callback registrado por main.js; chamado toda vez que a lista de pinos
   * muda (add / remove / clear / toggleCompleted).  Recebe uma cópia rasa do array.
   * @type {Function|null}
   */
  let _onChangeCb = null;

  /* ────────────────────────────────────────────────────────────────────────
     API pública
  ──────────────────────────────────────────────────────────────────────── */

  /**
   * Registra um callback que será invocado sempre que a lista de pinos
   * sofrer uma mudança estrutural (add / remove / clear / toggleCompleted).
   *
   * @param {function(Array)} onChangeCb - Recebe uma cópia do array de pinos.
   */
  function init(onChangeCb) {
    _onChangeCb = typeof onChangeCb === 'function' ? onChangeCb : () => {};
  }

  /**
   * Cria e adiciona um novo pino nas coordenadas de mundo informadas.
   * Dispara o callback de mudança.
   *
   * @param {number} x - Coordenada X no espaço do mundo.
   * @param {number} y - Coordenada Y no espaço do mundo (ponta do pino).
   * @returns {{id, x, y, label, note, completed}} O pino recém-criado.
   */
  function add(x, y) {
    const id = _nextId++;
    const pin = {
      id,
      x,
      y,
      label:     `Pino ${id + 1}`,
      note:      '',
      completed: false,
    };
    _pins.push(pin);
    _notify();
    return pin;
  }

  /**
   * Remove o pino com o id informado e dispara o callback.
   *
   * @param {number} id - ID do pino a remover.
   */
  function remove(id) {
    _pins = _pins.filter(p => p.id !== id);
    _notify();
  }

  /**
   * Atualiza o rótulo e/ou nota de um pino e dispara o callback de mudança.
   * Use este método apenas por código (não durante digitação do usuário).
   * Para atualizações silenciosas durante digitação, use `updateSilent()`.
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
   * Atualiza o rótulo e/ou nota de um pino SEM disparar o callback.
   * Usado pelos handlers de digitação (input event) para evitar que o DOM da
   * sidebar seja re-renderizado enquanto o usuário está digitando — o que
   * destruiria o foco no campo de texto.
   *
   * @param {number} id
   * @param {{ label?: string, note?: string }} data
   */
  function updateSilent(id, { label, note } = {}) {
    const pin = _pins.find(p => p.id === id);
    if (!pin) return;
    if (label !== undefined) pin.label = label;
    if (note  !== undefined) pin.note  = note;
    // _notify() intencionalmente omitido
  }

  /**
   * Alterna o estado de conclusão (completed) de um pino.
   * Pinos concluídos ficam verdes no canvas, indicando que o
   * obstáculo/evento já foi superado pelos jogadores.
   * Dispara o callback de mudança.
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
   * Retorna uma cópia rasa do array de pinos.
   *
   * @returns {Array<{id, x, y, label, note, completed}>}
   */
  function getAll() {
    return [..._pins];
  }

  /**
   * Remove todos os pinos e dispara o callback.
   * Chamado quando o mapa é limpo (onClearClick).
   */
  function clear() {
    _pins = [];
    _notify();
  }

  /* ────────────────────────────────────────────────────────────────────────
     Interno
  ──────────────────────────────────────────────────────────────────────── */

  /**
   * Invoca o callback registrado com uma cópia rasa da lista atual.
   * Sempre passa uma cópia para evitar mutações acidentais pelo consumidor.
   */
  function _notify() {
    if (_onChangeCb) _onChangeCb([..._pins]);
  }

  /* ────────────────────────────────────────────────────────────────────────
     Exportações
  ──────────────────────────────────────────────────────────────────────── */

  return { init, add, remove, update, updateSilent, toggleCompleted, getAll, clear };

})();
