import { useEffect } from 'react';
import { AppLayout, PhotoGrid, PhotoViewer } from './components';
import { usePhotoStore } from './stores';
import { photoFlows } from './utils';
import './App.css';

function App() {
  const viewMode = usePhotoStore((state) => state.viewMode);

  useEffect(() => {
    // Initialize database on app start
    const initApp = async () => {
      try {
        await photoFlows.reloadPhotos();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initApp();
  }, []);

  return (
    <AppLayout>
      {viewMode === 'grid' && <PhotoGrid />}
      {viewMode === 'detail' && <PhotoViewer />}
    </AppLayout>
  );
}

export default App;
