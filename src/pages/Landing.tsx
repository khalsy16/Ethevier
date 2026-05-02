import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { FallingStars } from '../components/CelestialBackground';

const quotes = [
  "Keuangan adalah perjalanan, bukan hanya tujuan.",
  "Tabunganmu adalah bintang di galaksimu sendiri.",
  "Langkah kecil setiap hari, lompatan besar untuk harapanmu.",
  "Bermimpilah setinggi langit, menabunglah dengan bijak, hiduplah dengan indah."
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6">
      <FallingStars />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-2xl z-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xavier-blue text-sm mb-8">
          <Sparkles className="w-4 h-4 text-aether-gold" />
          <span>Kelola keajaibanmu, tumbuhkan masa depanmu</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-star-white tracking-tight">
          Ethevier
        </h1>
        
        <p className="text-lg md:text-xl text-xavier-blue/80 mb-10 leading-relaxed italic">
          "Galaksi di mana rezekimu bertemu dengan impianmu."
        </p>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-aether-gold text-celestial-dark font-bold rounded-2xl flex items-center gap-3 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(238,188,102,0.4)]"
          >
            Bersinar Sekarang <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full z-10">
        {quotes.map((quote, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + idx * 0.1 }}
            className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <p className="text-sm text-star-white/70 italic">&ldquo;{quote}&rdquo;</p>
          </motion.div>
        ))}
      </div>

      <footer className="absolute bottom-8 text-xavier-blue/30 text-xs italic">
        made by khalisa for myself
      </footer>
    </div>
  );
}
