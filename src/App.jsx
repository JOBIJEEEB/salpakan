import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import TopNav from './components/TopNav';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalChat from './components/GlobalChat';
import Onboarding from './pages/Onboarding';
import UsernameSetup from './pages/UsernameSetup';
import Lobbies from './pages/Lobbies';
import ActiveMatch from './pages/ActiveMatch';
import VsAI from './pages/VsAI';
import Leaderboard from './pages/Leaderboard';

const Placeholder = ({ title }) => (
  <div className="container py-5">
    <div className="glass-panel p-5 mt-4 text-center">
      <h1 className="fw-bold">{title}</h1>
      <p className="text-muted mt-3">Coming Soon</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100">
          <TopNav />
          <main className="flex-grow-1">
            <Routes>
              {/* Public */}
              <Route path="/" element={<Onboarding />} />
              <Route path="/about" element={<Placeholder title="About" />} />
              <Route path="/rules" element={<Placeholder title="Rules & Guidelines" />} />

              {/* Semi-protected — logged in, username not required yet */}
              <Route path="/setup-username" element={<UsernameSetup />} />

              {/* Protected — require auth + username */}
              <Route path="/lobbies" element={<ProtectedRoute><Lobbies /></ProtectedRoute>} />
              <Route path="/match/:id" element={<ProtectedRoute><ActiveMatch /></ProtectedRoute>} />
              <Route path="/vs-ai" element={<ProtectedRoute><VsAI /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            </Routes>
          </main>

          {/* Global overlays visible everywhere when logged in */}
          <GlobalChat />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
