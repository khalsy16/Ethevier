import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Plus, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  TrendingDown,
  Info,
  Pencil,
  Trash2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function ImpulseCheck() {
  const [user] = useAuthState(auth);
  const [checks, setChecks] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [dailyAverage, setDailyAverage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCheck, setEditingCheck] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');
  const [waitDays, setWaitDays] = useState('14');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'impulseChecks'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChecks(data);
      setLoading(false);
    });

    const incomeQ = query(collection(db, 'users', user.uid, 'incomes'));
    const unsubscribeIncome = onSnapshot(incomeQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      const total = docs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      setTotalIncome(total);

      // Calculate daily average
      if (docs.length > 0) {
        const recent = docs.slice(-7);
        const avg = recent.reduce((acc, curr) => acc + (curr.amount || 0), 0) / Math.max(recent.length, 1);
        setDailyAverage(avg);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeIncome();
    };
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !price) return;

    try {
      if (editingCheck) {
        await updateDoc(doc(db, 'users', user.uid, 'impulseChecks', editingCheck.id), {
          name,
          price: parseFloat(price),
          reason,
          waitDays: parseInt(waitDays),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'impulseChecks'), {
          name,
          price: parseFloat(price),
          reason,
          waitDays: parseInt(waitDays),
          status: 'considering',
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setReason('');
    setWaitDays('14');
    setShowAdd(false);
    setEditingCheck(null);
  };

  const openEdit = (check: any) => {
    setEditingCheck(check);
    setName(check.name);
    setPrice(check.price.toString());
    setReason(check.reason || '');
    setWaitDays(check.waitDays.toString());
    setShowAdd(true);
  };

  const updateStatus = async (id: string, status: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'impulseChecks', id), {
        status
      });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteCheck = async (id: string | undefined) => {
    if (!user || !id) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'impulseChecks', id));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting impulse check:", error);
    }
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) return <div className="p-8 text-xavier-blue">Navigating the nebula...</div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-400/10 rounded-xl">
              <ShieldAlert className="text-red-400" />
            </div>
            <h2 className="text-3xl font-bold text-star-white">Impulse Check</h2>
          </div>
          <p className="text-xavier-blue/70">Protect your galaxy from impulsive black holes.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-white/5 border border-white/10 text-star-white px-6 py-3 rounded-2xl font-bold hover:bg-white/10 transition-all"
        >
          <Plus className="w-5 h-5 text-aether-gold" />
          <span>New Check</span>
        </button>
      </div>

      <div className="bg-celestial-depth/30 border border-white/5 p-6 rounded-[2rem] flex items-start gap-4">
        <Info className="w-5 h-5 text-xavier-blue mt-1 shrink-0" />
        <p className="text-sm text-xavier-blue/60 leading-relaxed italic">
          "The Impulse Shield helps you decide if a purchase is truly necessary. By waiting a few days, 
          you let the initial 'want' fade, allowing the 'need' to shine through."
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {checks.map((check, idx) => {
            const createdAt = check.createdAt?.toDate ? check.createdAt.toDate() : new Date();
            const daysPassed = differenceInDays(new Date(), createdAt);
            const remainingDays = Math.max(0, check.waitDays - daysPassed);
            const isFinished = remainingDays === 0;

            return (
              <motion.div 
                key={check.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className={`relative p-8 rounded-[2.5rem] border overflow-hidden ${
                  check.status === 'avoided' 
                    ? 'bg-green-500/5 border-green-500/20' 
                    : check.status === 'purchased'
                    ? 'bg-xavier-blue/5 border-xavier-blue/20'
                    : 'bg-celestial-depth/60 border-white/10'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    check.status === 'considering' ? 'bg-aether-gold/10 text-aether-gold' : 
                    check.status === 'avoided' ? 'bg-green-500/10 text-green-500' : 'bg-xavier-blue/10 text-xavier-blue'
                  }`}>
                    {check.status === 'considering' ? 'Considering' : check.status === 'avoided' ? 'Avoided' : 'Purchased'}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(check)} className="text-white/10 hover:text-aether-gold transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      {deletingId === check.id ? (
                        <div className="absolute right-0 top-0 flex items-center bg-red-500 rounded-lg overflow-hidden shadow-lg z-10">
                          <button 
                            onClick={() => deleteCheck(check.id)}
                            className="px-3 py-1 text-[8px] font-bold text-white uppercase tracking-tighter hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                          <button 
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-1 bg-black/20 text-white hover:bg-black/40 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(check.id);
                          }} 
                          className="text-white/10 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <h3 className="text-2xl font-bold text-star-white">{check.name}</h3>
                  <p className="text-xl font-bold text-aether-gold">{formatIDR(check.price)}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-8">
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] text-xavier-blue uppercase tracking-widest font-bold mb-1">Waiting Period</p>
                    <p className="text-sm font-bold text-star-white">{isFinished ? 'Complete' : `${remainingDays} Days Left`}</p>
                  </div>
                </div>

                {check.status === 'considering' && (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => updateStatus(check.id, 'avoided')}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 text-green-400 py-4 rounded-2xl font-bold hover:bg-green-500/30 transition-all"
                      >
                        <TrendingDown className="w-4 h-4" />
                        Hold Off
                      </button>
                      <button 
                        onClick={() => updateStatus(check.id, 'purchased')}
                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 text-star-white py-4 rounded-2xl font-bold hover:bg-white/10 transition-all"
                      >
                        Buy Anyway
                      </button>
                    </div>
                    {isFinished && (
                      <div className="p-4 bg-aether-gold/10 border border-aether-gold/20 rounded-2xl text-center">
                        <p className="text-xs font-bold text-aether-gold uppercase tracking-widest animate-pulse">Waiting period finished! Still need it?</p>
                      </div>
                    )}
                  </div>
                )}

                {check.status === 'avoided' && (
                  <div className="flex items-center gap-3 text-green-400 font-bold justify-center py-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Shield successful. Money saved!</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {checks.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <HelpCircle className="w-12 h-12 text-xavier-blue/20 mx-auto mb-4" />
            <p className="text-xavier-blue/40 italic">No impulsive black holes detected.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-0">
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAdd(false)}
                className="absolute inset-0 bg-celestial-dark/90 backdrop-blur-md"
             />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-celestial-depth border border-white/10 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
             >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-star-white">{editingCheck ? 'Edit Shield' : 'Impulse Check'}</h3>
                  <button onClick={resetForm} className="p-2 text-xavier-blue/60 hover:text-star-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleAdd} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-xavier-blue uppercase tracking-widest px-2">Item Name</label>
                      <input 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="What's tempting you?"
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                        required
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-xavier-blue uppercase tracking-widest px-2">Price</label>
                      <input 
                        type="number"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder="0"
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                        required
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-xavier-blue uppercase tracking-widest px-2">Waiting Period (Days)</label>
                      <input 
                        type="number"
                        value={waitDays}
                        onChange={e => setWaitDays(e.target.value)}
                        placeholder="14"
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                        min="1"
                      />
                   </div>
                   
                   <button className="w-full bg-aether-gold text-celestial-dark font-black py-5 rounded-2xl text-lg hover:scale-[1.02] shadow-[0_10px_30px_rgba(244,208,111,0.2)] transition-all">
                      {editingCheck ? 'Update Shield' : 'Activate Shield'}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
