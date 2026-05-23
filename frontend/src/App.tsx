import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AgentBuilder from './pages/AgentBuilder';
import Execute from './pages/Execute';
import Traces from './pages/Traces';
import Settings from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Private */}
        <Route path="/*" element={
          <PrivateRoute>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="agents/new"           element={<AgentBuilder />} />
                <Route path="agents/:id/edit"      element={<AgentBuilder />} />
                <Route path="agents/:id/execute"   element={<Execute />} />
                <Route path="traces"               element={<Traces />} />
                <Route path="settings"             element={<Settings />} />
              </Routes>
            </div>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
