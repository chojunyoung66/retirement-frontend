import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store } from './store/store';
import { router } from './router';
import { DiagnosisProvider } from './hooks/useDiagnosis';
import './index.css';

// MSW는 비활성화됨 - 실제 Backend 서버 사용
// MSW를 다시 활성화하려면: const ENABLE_MSW = true로 변경
const ENABLE_MSW = false;

async function initializeApp() {
  if (ENABLE_MSW) {
    const { worker } = await import('./server/worker');
    await worker.start();
  }
}

initializeApp().then(() => {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root element not found');

  createRoot(rootEl).render(
    <StrictMode>
      <Provider store={store}>
        <DiagnosisProvider>
          <RouterProvider router={router} />
        </DiagnosisProvider>
      </Provider>
    </StrictMode>,
  );
});
