export function ImagePreviewModal() {
  return (
    <div id="img-preview-modal" className="hidden" aria-hidden="true">
      <div id="img-preview-backdrop" />
      <div id="img-preview-container">
        <button id="img-preview-close" aria-label="close preview">
          ✕
        </button>
        <img id="img-preview-img" src="" alt="Image preview" data-i18n-alt="preview.alt" />
      </div>
    </div>
  );
}
