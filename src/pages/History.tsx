import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { format } from 'date-fns';
import { History as HistoryIcon, Trash2, ArrowUpRight, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function History() {
  const [user] = useAuthState(auth);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'incomes'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIncomes(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredIncomes = incomes.filter(i => 
    (i.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatIDR(i.amount).includes(searchTerm)
  );

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Hapus rekapan ini dari rasi bintangmu?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'incomes', id));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="p-8 text-xavier-blue">Melacak jejak bintang masa lalu...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <HistoryIcon className="text-aether-gold" />
             <h2 className="text-3xl font-bold text-star-white">Rekapan Bintang</h2>
           </div>
           <p className="text-xavier-blue/70">Jejak cahaya penghasilanmu sepanjang waktu.</p>
        </div>

        <div className="relative group w-full md:w-80">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-xavier-blue/40 group-focus-within:text-aether-gold transition-colors" />
           <input 
             type="text"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             placeholder="Cari transaksi..."
             className="w-full pl-12 pr-6 py-3 bg-celestial-depth border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50 transition-all"
           />
        </div>
      </div>

      <div className="bg-celestial-depth/50 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden">
         <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-star-white">Semua Transaksi</h3>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-xavier-blue/60 uppercase tracking-widest">
               <Filter className="w-4 h-4" />
               <span>Tahun/Bulan/Hari</span>
            </div>
         </div>

         {/* Mobile View: Cards */}
         <div className="md:hidden divide-y divide-white/5">
            {filteredIncomes.map((income, idx) => (
              <motion.div 
                key={income.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="p-6 space-y-4"
              >
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                         <ArrowUpRight className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                         <p className="text-sm font-semibold text-star-white">{income.source || 'Tanpa Keterangan'}</p>
                         <p className="text-[10px] text-xavier-blue/60 uppercase tracking-wider">
                            {format((income.date as Timestamp).toDate(), 'dd MMM yyyy HH:mm')}
                         </p>
                      </div>
                   </div>
                   <button 
                     onClick={() => handleDelete(income.id)}
                     className="p-2 text-xavier-blue/20 hover:text-red-400"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
                <div className="text-xl font-bold text-green-400">
                   +{formatIDR(income.amount)}
                </div>
              </motion.div>
            ))}
         </div>

         {/* Desktop View: Table */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5">
                     <th className="px-8 py-4 text-[10px] font-bold text-xavier-blue uppercase tracking-widest">Tanggal & Waktu</th>
                     <th className="px-8 py-4 text-[10px] font-bold text-xavier-blue uppercase tracking-widest">Sumber / Deskripsi</th>
                     <th className="px-8 py-4 text-[10px] font-bold text-xavier-blue uppercase tracking-widest">Jumlah</th>
                     <th className="px-8 py-4 text-[10px] font-bold text-xavier-blue uppercase tracking-widest text-right">Aksi</th>
                  </tr>
               </thead>
               <tbody>
                  <AnimatePresence>
                     {filteredIncomes.map((income, idx) => (
                        <motion.tr 
                          key={income.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                        >
                           <td className="px-8 py-6">
                              <div className="space-y-0.5">
                                 <p className="text-sm font-medium text-star-white">
                                    {format((income.date as Timestamp).toDate(), 'dd MMMM yyyy')}
                                 </p>
                                 <p className="text-[10px] text-xavier-blue/60 uppercase tracking-wider">
                                    {format((income.date as Timestamp).toDate(), 'HH:mm:ss')}
                                 </p>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                                 </div>
                                 <span className="text-sm text-star-white font-medium">{income.source || 'Tanpa Keterangan'}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <span className="text-sm font-bold text-green-400">
                                 +{formatIDR(income.amount)}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => handleDelete(income.id)}
                                className="p-2 text-xavier-blue/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </motion.tr>
                     ))}
                  </AnimatePresence>
               </tbody>
            </table>
            
            {filteredIncomes.length === 0 && (
               <div className="py-20 text-center">
                  <p className="text-xavier-blue/40 italic">Tidak ada rekapan yang ditemukan dalam rasi bintangmu.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
