import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InstallPrompt, OfflineIndicator } from './components/System';
import { Dashboard } from './pages/Dashboard';
import { NewAnalysis } from './pages/NewAnalysis';
import { AnalysisHub } from './pages/AnalysisHub';
import { Companies } from './pages/Companies';
import { CompanyProfile } from './pages/CompanyProfile';
import { EvidencePage } from './pages/EvidencePage';
import { SobolView } from './pages/SobolView';
import { FermiView } from './pages/FermiView';
import { RecommendationView } from './pages/RecommendationView';
import { PilotTracker } from './pages/PilotTracker';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <InstallPrompt />
      <OfflineIndicator />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="analyze/new" element={<NewAnalysis />} />
          <Route path="analyze/:id" element={<AnalysisHub />} />
          <Route path="companies" element={<Companies />} />
          <Route path="companies/:id" element={<CompanyProfile />} />
          <Route path="evidence" element={<EvidencePage />} />
          <Route path="sobol/:id" element={<SobolView />} />
          <Route path="fermi/:id" element={<FermiView />} />
          <Route path="recommendation/:id" element={<RecommendationView />} />
          <Route path="pilot/:id" element={<PilotTracker />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
