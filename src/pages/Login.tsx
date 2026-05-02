import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useEffect } from 'react';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/unauthorized-domain') {
        alert('Cek pengaman galaksi! Domain ini belum diizinkan di Firebase Console > Authentication > Settings > Authorized Domains.');
      } else {
        alert('Gagal menyambung ke rasi bintang: ' + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm p-8 rounded-[2rem] bg-celestial-depth border border-white/10 shadow-2xl z-10 text-center"
      >
        <div className="w-16 h-16 bg-aether-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LogIn className="w-8 h-8 text-aether-gold" />
        </div>
        
        <h2 className="text-2xl font-bold text-star-white mb-2">Selamat Datang Kembali</h2>
        <p className="text-xavier-blue/70 mb-8 text-sm">Amankan tabunganmu dan kelola galaksimu dengan keajaiban.</p>
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-celestial-dark font-bold rounded-2xl hover:bg-star-white transition-colors disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span>Masuk dengan Google</span>
        </button>
        
        <div className="mt-8 pt-8 border-t border-white/5">
          <p className="text-[10px] text-xavier-blue/40 uppercase tracking-widest italic">made by khalisa for myself</p>
        </div>
      </motion.div>
    </div>
  );
}
