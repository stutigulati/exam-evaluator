import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './lib/auth';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import EvaluatePage from './pages/EvaluatePage';
import DashboardPage from './pages/DashboardPage';
import PerformancePage from './pages/PerformancePage';
import BenchmarkPage from './pages/BenchmarkPage';
import RoleWorkspace from './pages/RoleWorkspace';
import './styles/globals.css';
import GogDashboard from './pages/GogDashboard';

// Role hierarchy constants — reused across all route guards
const ALL_STAFF      = ['evaluator', 'admin', 'super_admin', 'gog'];
const ADMIN_AND_UP   = ['admin', 'super_admin', 'gog'];
const SUPER_AND_UP   = ['super_admin', 'gog'];

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 220px)' }}>
            <Routes>
              {/* Public */}
              <Route path="/"      element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* GoG dashboard — gog only */}
              <Route path="/gog/:section?" element={<GogDashboard />} />

              {/* ── Evaluator pages — open to evaluator + admin + super_admin ── */}
              {/* Stand-alone /evaluate shortcut */}
              <Route path="/evaluate" element={
                <ProtectedRoute roles={ALL_STAFF}>
                  <EvaluatePage />
                </ProtectedRoute>
              } />

              {/* Evaluator dashboard (/dashboard) */}
              <Route path="/dashboard" element={
                <ProtectedRoute roles={ALL_STAFF}>
                  <DashboardPage />
                </ProtectedRoute>
              } />

              {/* Performance page */}
              <Route path="/performance" element={
                <ProtectedRoute roles={ALL_STAFF}>
                  <PerformancePage />
                </ProtectedRoute>
              } />

              {/* Benchmark page */}
              <Route path="/benchmark" element={
                <ProtectedRoute roles={ALL_STAFF}>
                  <BenchmarkPage />
                </ProtectedRoute>
              } />

              {/* Evaluator workspace — /evaluator/evaluate must come BEFORE /evaluator/:section */}
              <Route path="/evaluator/evaluate" element={
                <ProtectedRoute roles={ALL_STAFF}>
                  <EvaluatePage />
                </ProtectedRoute>
              } />

              <Route path="/evaluator/:section?" element={
                <ProtectedRoute roles={ALL_STAFF}>
                  <RoleWorkspace role="evaluator" />
                </ProtectedRoute>
              } />

              {/* ── Admin workspace — open to admin + super_admin ── */}
              <Route path="/admin/:section?" element={
                <ProtectedRoute roles={ADMIN_AND_UP}>
                  <RoleWorkspace role="admin" />
                </ProtectedRoute>
              } />

              {/* ── Super Admin workspace — super_admin only ── */}
              <Route path="/super-admin/:section?" element={
                <ProtectedRoute roles={SUPER_AND_UP}>
                  <RoleWorkspace role="super_admin" />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);