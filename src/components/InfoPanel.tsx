export function InfoPanel() {
  return (
    <aside id="panel-info">
      <h2 data-i18n="details.title">Details</h2>
      <div id="room-details">
        <p data-i18n="details.placeholder">Click a room to see details.</p>
      </div>
      <hr />
      <div id="debug-panel">
        <h3 data-i18n="debug.title">Debug</h3>
        <pre id="debug-output" />
      </div>
    </aside>
  );
}
