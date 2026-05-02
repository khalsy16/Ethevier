import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Calendar, 
  Calculator, 
  Heart, 
  ShieldAlert,
  LogOut,
  Sparkle,
  Menu,
  X
} from 'lucide-react';
import { auth, logout } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: ReactNode }) {
  const [user] = useAuthState(auth);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/app', icon: LayoutDashboard, label: 'Orbit Utama' },
    { to: '/app/income', icon: PlusCircle, label: 'Tabung Bintang' },
    { to: '/app/history', icon: History, label: 'Jejak Kas' },
    { to: '/app/calendar', icon: Calendar, label: 'Almanak' },
    { to: '/app/calculator', icon: Calculator, label: 'Kalkulator' },
    { to: '/app/wishlist', icon: Heart, label: 'Harapan Bintang' },
    { to: '/app/impulse', icon: ShieldAlert, label: 'Perisai Impuls' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-aether-gold flex items-center justify-center shadow-[0_0_15px_rgba(244,208,111,0.4)]">
          <Sparkle className="text-celestial-dark w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-aether-gold leading-tight">Ethevier</h1>
          <p className="text-[10px] text-xavier-blue uppercase tracking-widest font-medium">Pemandu Surgawi</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            onClick={() => setIsMenuOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
              isActive 
                ? "bg-aether-gold/10 text-aether-gold shadow-[inset_0_0_10px_rgba(244,208,111,0.1)]" 
                : "text-xavier-blue/60 hover:text-xavier-blue hover:bg-white/5"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-aether-gold shadow-[0_0_8px_#f4d06f]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        {user && (
          <div className="flex items-center gap-3 mb-6 px-4">
            <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-white/20" />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-star-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-xavier-blue truncate">{user.email}</p>
            </div>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Keluar Akun</span>
        </button>
      </div>
      
      <div className="p-4 text-center">
          <p className="text-[10px] text-xavier-blue/40 italic">dibuat oleh khalisa untuk diri sendiri</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-celestial-dark font-sans relative">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-celestial-depth border-b border-white/10 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-aether-gold flex items-center justify-center">
            <Sparkle className="text-celestial-dark w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-aether-gold uppercase tracking-tighter">Ethevier</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 text-xavier-blue hover:text-star-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-celestial-dark/80 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-celestial-depth border-r border-white/10 z-50 lg:hidden"
            >
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="absolute top-6 right-6 p-2 text-xavier-blue hover:text-star-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-celestial-depth border-r border-white/10 flex-col z-20 shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10 p-4 sm:p-8 lg:p-10 max-w-full overflow-x-hidden">
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
