export function CanvasSection() {
  return (
    <section id="canvas-wrapper">
      <canvas id="map-canvas" />
      <div id="canvas-overlay" className="hidden">
        <span data-i18n="overlay.generating">Generating map...</span>
      </div>
    </section>
  );
}
