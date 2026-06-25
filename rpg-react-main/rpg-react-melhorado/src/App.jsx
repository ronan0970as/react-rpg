import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }  from './AuthContext';
import { MesaProvider }           from './contexts/MesaContext';

const AuthPage             = lazy(() => import('./pages/Auth'));
const PainelPage           = lazy(() => import('./pages/Painel'));
const StatusPage           = lazy(() => import('./pages/Status'));
const TalentosPage         = lazy(() => import('./pages/Talentos'));
const InventarioPage       = lazy(() => import('./pages/Inventario'));
const MestreDashboard      = lazy(() => import('./pages/MestreDashboard'));
const PersonalizacaoFicha  = lazy(() => import('./pages/PersonalizacaoFicha'));
const ResetPassword        = lazy(() => import('./pages/ResetPassword'));

const PageSpinner = ({ txt = 'Carregando...' }) => (
  <div className="spinner-overlay">
    <div className="spinner-anel" />
    <div className="spinner-txt">{txt}</div>
  </div>
);

function ProtectedRoute({ children, masterOnly = false }) {
  const { session, loading, isMestre } = useAuth();
  if (loading)                 return <PageSpinner txt="Verificando sessão..." />;
  if (!session)                return <Navigate to="/auth" replace />;
  if (masterOnly && !isMestre) return <Navigate to="/painel" replace />;
  return children;
}

function AppRoutes() {
  const { session, loading } = useAuth();
  if (loading) return <PageSpinner />;
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/auth"           element={session ? <Navigate to="/painel" replace /> : <AuthPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/painel"         element={<ProtectedRoute><PainelPage /></ProtectedRoute>} />
        <Route path="/status"         element={<ProtectedRoute><StatusPage /></ProtectedRoute>} />
        <Route path="/talentos"       element={<ProtectedRoute><TalentosPage /></ProtectedRoute>} />
        <Route path="/inventario"     element={<ProtectedRoute><InventarioPage /></ProtectedRoute>} />
        <Route path="/mestre"         element={<ProtectedRoute masterOnly><MestreDashboard /></ProtectedRoute>} />
        <Route path="/personalizar"   element={<ProtectedRoute masterOnly><PersonalizacaoFicha /></ProtectedRoute>} />
        <Route path="*"               element={<Navigate to={session ? '/painel' : '/auth'} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MesaProvider>
          <AppRoutes />
        </MesaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
