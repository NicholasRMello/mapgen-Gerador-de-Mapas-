import { useEffect } from 'react';
import { initMapgenApp } from './mapgenApp';

export default function App() {
  useEffect(() => {
    initMapgenApp();
  }, []);

  return (
    <>
      <header id="app-header">
        <div className="header-logo">
          <span className="logo-icon" aria-hidden="true">
            ⚔
          </span>
          <div>
            <h1>MapGen</h1>
            <p className="logo-subtitle">RPG Cartography Forge</p>
          </div>
        </div>

        <nav className="header-controls" aria-label="Map controls">
          <button id="btn-generate" data-i18n="header.generate">
            Generate Map
          </button>

          <button id="btn-clear" data-i18n="header.clear">
            Clear
          </button>

          <input
            type="text"
            id="input-seed"
            placeholder="Seed (optional)"
            data-i18n-placeholder="header.seedPlaceholder"
          />

          <select id="select-size" defaultValue="medium">
            <option value="small" data-i18n="header.sizeSmall">
              Small
            </option>
            <option value="medium" data-i18n="header.sizeMedium">
              Medium
            </option>
            <option value="large" data-i18n="header.sizeLarge">
              Large
            </option>
          </select>

          <button id="btn-lang" data-i18n="header.langToggle">
            PT-BR
          </button>
        </nav>

        <div className="header-status">
          <span id="status-text" data-i18n="header.noMap">
            No map generated.
          </span>
        </div>
      </header>

      <main id="app-main">
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

        <section id="canvas-wrapper">
          <canvas id="map-canvas" />
          <div id="canvas-overlay" className="hidden">
            <span data-i18n="overlay.generating">Generating map...</span>
          </div>
        </section>

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
      </main>

      <div id="img-preview-modal" className="hidden" aria-hidden="true">
        <div id="img-preview-backdrop" />
        <div id="img-preview-container">
          <button id="img-preview-close" aria-label="close preview">
            ✕
          </button>
          <img id="img-preview-img" src="" alt="Image preview" data-i18n-alt="preview.alt" />
        </div>
      </div>
    </>
  );
}
