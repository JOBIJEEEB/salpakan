import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import TopNav from './components/TopNav';
import VantaBackground from './components/VantaBackground';
import ProtectedRoute from './components/ProtectedRoute';
import Onboarding from './pages/Onboarding';
import UsernameSetup from './pages/UsernameSetup';
import Lobbies from './pages/Lobbies';
import ActiveMatch from './pages/ActiveMatch';
import Practice from './pages/Practice';
import Leaderboard from './pages/Leaderboard';
import Account from './pages/Account';
import ResetPassword from './pages/ResetPassword';
import Tutorial from './pages/Tutorial';

const Placeholder = ({ title }) => (
  <div className="page-container">
    <div className="container py-5">
      <div className="glass-panel p-5 mt-4 text-center">
        <h1 className="fw-bold">{title}</h1>
        <p className="text-muted mt-3">Coming Soon</p>
      </div>
    </div>
  </div>
);

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  const isBattlefield = location.pathname.startsWith('/match/');
  const isPractice = location.pathname === '/practice';
  const isRankings = location.pathname === '/leaderboard';
  const isTutorial = location.pathname === '/tutorial';

  const showNav = user && !isBattlefield && !isTutorial;

  return (
    <div className="d-flex flex-column min-vh-100 overflow-hidden">
      <VantaBackground />
      {showNav && <TopNav />}
      <main className="flex-grow-1 d-flex flex-column position-relative overflow-hidden">
        <div key={location.pathname} className="page-transition-container flex-grow-1 d-flex flex-column">
          <Routes location={location}>
            <Route path="/" element={<Onboarding />} />
            <Route path="/about" element={<Placeholder title="About" />} />
            <Route path="/rules" element={<Placeholder title="Rules & Guidelines" />} />
            <Route path="/setup-username" element={<UsernameSetup />} />
            <Route path="/lobbies" element={<ProtectedRoute><Lobbies /></ProtectedRoute>} />
            <Route path="/match/:id" element={<ProtectedRoute><ActiveMatch /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
