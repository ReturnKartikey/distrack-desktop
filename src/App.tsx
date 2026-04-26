import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Classification from './pages/Classification';
import Insights from './pages/Insights';
import FocusMode from './pages/FocusMode';
import Auth from './pages/Auth';
import Settings from './pages/Settings';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="classification" element={<Classification />} />
          <Route path="insights" element={<Insights />} />
          <Route path="focus" element={<FocusMode />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
