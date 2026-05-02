import { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Coins, CheckCircle2 } from 'lucide-react';

export default function AddIncome() {
  const [user] = useAuthState(auth);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Pendapatan Harian');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'incomes'), {
        amount: parseFloat(amount),
        source,
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      setAmount('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 pb-10 sm:py-10">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-star-white mb-4">Tambahkan ke Galaksimu</h2>
        <p className="text-sm sm:text-base text-xavier-blue/70">Setiap koin adalah percikan yang menerangi masa depanmu.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Form Container */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-celestial-depth/50 border border-white/10 p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] backdrop-blur-xl shadow-2xl order-2 lg:order-1"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Jumlah Rezeki (IDR)</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-bold text-aether-gold">Rp</span>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-16 pr-6 py-4 sm:py-6 bg-white/5 border border-white/10 rounded-2xl text-xl sm:text-2xl font-bold text-star-white focus:outline-none focus:border-aether-gold/50 transition-all placeholder:text-white/10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Sumber / Catatan</label>
              <input 
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Dari mana asal rezeki ini?"
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm sm:text-base text-star-white focus:outline-none focus:border-aether-gold/50 transition-all"
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-aether-gold text-celestial-dark font-black py-4 sm:py-6 rounded-2xl text-lg sm:text-xl shadow-[0_10px_30px_rgba(244,208,111,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
              {loading ? 'Memproses...' : 'Simpan Rezeki'}
            </button>
          </form>
        </motion.div>

        {/* Animation Container */}
        <div className="relative h-[250px] sm:h-[400px] flex items-center justify-center overflow-hidden order-1 lg:order-2">
          <AnimatePresence>
            {!showSuccess ? (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="relative"
              >
                {/* Floating Jar/Sphere representation */}
                <div className="w-64 h-64 rounded-full border-4 border-white/10 flex items-center justify-center relative bg-gradient-to-br from-white/5 to-transparent">
                  <div className="w-full h-full absolute rounded-full overflow-hidden">
                     {/* Liquid effect back */}
                     <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-0 left-0 right-0 h-1/2 bg-aether-gold/20 blur-xl"
                     />
                  </div>
                  <Sparkles className="w-20 h-20 text-aether-gold/30 animate-pulse" />
                </div>
                
                {/* Orbital dots */}
                {[0, 72, 144, 216, 288].map(deg => (
                  <motion.div 
                    key={deg}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10 + Math.random() * 5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 pointer-events-none"
                  >
                    <div 
                      className="w-2 h-2 rounded-full bg-xavier-blue shadow-[0_0_10px_#9bbce0]"
                      style={{ transform: `translateX(150px) rotate(${deg}deg)` }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
                <motion.div 
                   key="success"
                   initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                   animate={{ opacity: 1, scale: 1, rotate: 0 }}
                   exit={{ opacity: 0, scale: 1.5 }}
                   className="flex flex-col items-center gap-6"
                >
                    <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.5)]">
                        <CheckCircle2 className="w-16 h-16 text-white" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-3xl font-bold text-white mb-2">Berhasil Disimpan!</h3>
                        <p className="text-green-400 font-medium tracking-widest uppercase text-sm">Kemakmuran Galaksi +1</p>
                    </div>
                    {/* Coin rain particles */}
                    {Array.from({ length: 15 }).map((_, i) => (
                         <motion.div
                            key={i}
                            initial={{ y: 0, x: 0, opacity: 1 }}
                            animate={{ y: [0, -100 - Math.random() * 200], x: [-50 + Math.random() * 100], opacity: 0 }}
                            transition={{ duration: 1 + Math.random() }}
                            className="absolute bg-aether-gold w-3 h-3 rounded-full"
                         />
                    ))}
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
