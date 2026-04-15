export function HeaderBar() {
  return (
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
  );
}
