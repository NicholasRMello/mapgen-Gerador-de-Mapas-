export function AssetsPanel() {
  return (
    <aside id="panel-assets">
      <div className="sidebar-section">
        <button className="sidebar-section-header active" data-section="section-assets">
          <span className="section-arrow">&#9660;</span>
          <span data-i18n="sidebar.images">Images</span>
        </button>
        <div id="section-assets" className="sidebar-section-content">
          <div id="drop-zone">
            <span className="drop-icon">+</span>
            <span data-i18n-html="dropzone.text">Drag images here or click to select</span>
            <input type="file" id="file-input" accept="image/*" multiple hidden />
          </div>
          <div id="user-asset-list" />
        </div>
      </div>

      <div className="sidebar-section">
        <button className="sidebar-section-header" data-section="section-pins">
          <span className="section-arrow">&#9654;</span>
          <span data-i18n="sidebar.pins">Pins</span>
        </button>
        <div id="section-pins" className="sidebar-section-content collapsed">
          <button id="btn-pin-mode" data-i18n="pin.addButton">
            📍 Add Pin
          </button>
          <div id="pin-list" />
        </div>
      </div>
    </aside>
  );
}
