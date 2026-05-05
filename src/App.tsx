import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddIncome from './pages/AddIncome';
import History from './pages/History';
import CalendarPage from './pages/Calendar';
import Calculator from './pages/Calculator';
import Wishlist from './pages/Wishlist';
import ImpulseCheck from './pages/ImpulseCheck';
import SalesRecap from './pages/SalesRecap';
import InvoiceAlbum from './pages/InvoiceAlbum';
import { StarBackground } from './components/CelestialBackground';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);

  if (loading) return <div className="h-screen w-screen flex items-center justify-center text-aether-gold font-bold">Resonating with the elements of the universe...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Router>
      <StarBackground />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/app/income" element={<ProtectedRoute><AddIncome /></ProtectedRoute>} />
        <Route path="/app/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/app/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/app/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
        <Route path="/app/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/app/impulse" element={<ProtectedRoute><ImpulseCheck /></ProtectedRoute>} />
        <Route path="/app/sales-recap" element={<ProtectedRoute><SalesRecap /></ProtectedRoute>} />
        <Route path="/app/invoice-album" element={<ProtectedRoute><InvoiceAlbum /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
