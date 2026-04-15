import { useEffect } from 'react';
import { initMapgenApp } from './mapgenApp';
import { HeaderBar } from './components/HeaderBar';
import { AssetsPanel } from './components/AssetsPanel';
import { CanvasSection } from './components/CanvasSection';
import { InfoPanel } from './components/InfoPanel';
import { ImagePreviewModal } from './components/ImagePreviewModal';

export default function App() {
  useEffect(() => {
    initMapgenApp();
  }, []);

  return (
    <>
      <HeaderBar />

      <main id="app-main">
        <AssetsPanel />
        <CanvasSection />
        <InfoPanel />
      </main>

      <ImagePreviewModal />
    </>
  );
}
