import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NodeDetail from './pages/NodeDetail';
import AlertsFeed from './pages/AlertsFeed';
import IncidentDetail from './pages/IncidentDetail';
import BottomNav from './components/layout/BottomNav';
import RecoveryToast from './components/incident/RecoveryToast';
import { useOrchestrator } from './hooks/useOrchestrator';

function App() {
  useOrchestrator();

  return (
    <BrowserRouter>
      <div className="w-screen h-screen flex flex-col bg-base overflow-hidden">
        {/* ADDED: Global recovery toast notification */}
        <RecoveryToast />
        <main className="flex-1 w-full relative min-h-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/node/:service" element={<NodeDetail />} />
            <Route path="/alerts" element={<AlertsFeed />} />
            <Route path="/incident/:id" element={<IncidentDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;

