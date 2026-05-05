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
  Timestamp
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  ShoppingCart, 
  Trash2, 
  ExternalLink, 
  Check, 
  Clock, 
  Plus, 
  X,
  CreditCard,
  Pencil
} from 'lucide-react';

export default function Wishlist() {
  const [user] = useAuthState(auth);
  const [items, setItems] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [dailyAverage, setDailyAverage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [link, setLink] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'users', user.uid, 'wishlist'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setLoading(false);
    });

    const incomeQ = query(collection(db, 'users', user.uid, 'incomes'));
    const expenseQ = query(collection(db, 'users', user.uid, 'expenses'));
    
    let totalInc = 0;
    let totalExp = 0;

    const unsubscribeIncome = onSnapshot(incomeQ, (snapshot) => {
      totalInc = snapshot.docs.reduce((acc, curr) => acc + (curr.data().amount || 0), 0);
      setTotalIncome(totalInc - totalExp);
    });

    const unsubscribeExpense = onSnapshot(expenseQ, (snapshot) => {
      totalExp = snapshot.docs.reduce((acc, curr) => acc + (curr.data().amount || 0), 0);
      setTotalIncome(totalInc - totalExp);
    });

    return () => {
      unsubscribe();
      unsubscribeIncome();
      unsubscribeExpense();
    };
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !price) return;

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'users', user.uid, 'wishlist', editingItem.id), {
          name,
          price: parseFloat(price),
          link,
          deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
          notes,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'wishlist'), {
          name,
          price: parseFloat(price),
          link,
          deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
          notes,
          status: 'pending',
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
    setLink('');
    setDeadline('');
    setNotes('');
    setShowAdd(false);
    setEditingItem(null);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price.toString());
    setLink(item.link || '');
    if (item.deadline) {
      const date = (item.deadline as Timestamp).toDate();
      setDeadline(date.toISOString().split('T')[0]);
    } else {
      setDeadline('');
    }
    setNotes(item.notes || '');
    setShowAdd(true);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'wishlist', id), {
        status: currentStatus === 'pending' ? 'attained' : 'pending'
      });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteItem = async (id: string | undefined) => {
    if (!user || !id) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'wishlist', id));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
    }
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) return <div className="p-8 text-xavier-blue">Searching for your dreams in the stars...</div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h2 className="text-3xl font-bold text-star-white mb-2">Wishlist</h2>
          <p className="text-xavier-blue/70">What your heart desires, the universe helps you plan.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-aether-gold text-celestial-dark px-6 py-4 sm:py-3 rounded-2xl font-bold hover:scale-105 transition-all shadow-[0_0_20px_rgba(244,208,111,0.3)]"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Wish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {items.map((item, idx) => {
             const progress = Math.min((totalIncome / item.price) * 100, 100);
             return (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`relative p-8 rounded-[2rem] border transition-all overflow-hidden ${
                    item.status === 'attained' 
                      ? 'bg-green-500/10 border-green-500/20 grayscale-[0.5]' 
                      : 'bg-celestial-depth/80 border-white/10 hover:border-aether-gold/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-aether-gold">
                       <Heart className={item.status === 'attained' ? 'fill-green-400 text-green-400' : ''} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="p-2 text-xavier-blue/40 hover:text-aether-gold transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        {deletingId === item.id ? (
                          <div className="absolute right-0 top-0 flex items-center bg-red-500 rounded-lg overflow-hidden shadow-lg z-10">
                            <button 
                              onClick={() => deleteItem(item.id)}
                              className="px-3 py-2 text-[10px] font-bold text-white uppercase tracking-tighter hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                            <button 
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-2 bg-black/20 text-white hover:bg-black/40 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(item.id);
                            }} 
                            className="p-2 text-xavier-blue/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button onClick={() => toggleStatus(item.id, item.status)} className={`p-2 rounded-lg transition-colors ${item.status === 'attained' ? 'bg-green-500 text-white' : 'bg-white/5 text-xavier-blue hover:text-green-400'}`}>
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className={`text-xl font-bold text-star-white mb-2 ${item.status === 'attained' ? 'line-through' : ''}`}>
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-6">
                    <CreditCard className="w-4 h-4 text-aether-gold/60" />
                    <span className="text-lg font-bold text-aether-gold">{formatIDR(item.price)}</span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs text-xavier-blue font-semibold">
                          <span>Galaxy Savings Progress</span>
                          <span>{Math.round(progress)}%</span>
                       </div>
                       <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className={`h-full ${item.status === 'attained' ? 'bg-green-500' : 'bg-aether-gold'}`}
                          />
                       </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-[10px] text-xavier-blue font-bold uppercase tracking-widest">
                           <Clock className="w-3 h-3" />
                           <span>Planned Wish</span>
                        </div>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-aether-gold font-bold uppercase tracking-widest hover:underline">
                            Shop <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                    </div>
                  </div>
                </motion.div>
             );
          })}
        </AnimatePresence>
        
        {items.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
             <ShoppingCart className="w-12 h-12 text-xavier-blue/20 mx-auto mb-4" />
             <p className="text-xavier-blue/40 italic">Galaxy is empty. What are you dreaming of?</p>
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
                className="absolute inset-0 bg-celestial-dark/80 backdrop-blur-md"
             />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-celestial-depth border border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-star-white">{editingItem ? 'Edit Wish' : 'New Wish'}</h3>
                  <button onClick={resetForm} className="p-2 text-xavier-blue/60 hover:text-star-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleAdd} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Item Name</label>
                      <input 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="What is your dream item?"
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                        required
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Price</label>
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
                      <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Shopping Link</label>
                      <input 
                        value={link}
                        onChange={e => setLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Deadline</label>
                      <input 
                        type="date"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Special Notes</label>
                      <textarea 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Specifications or additional details..."
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50 resize-none h-24"
                      />
                   </div>
                   
                   <button className="w-full bg-aether-gold text-celestial-dark font-black py-5 rounded-2xl text-lg hover:scale-[1.02] active:scale-95 transition-all">
                      {editingItem ? 'Update Wish' : 'Send Wish to Stars'}
                   </button>
                </form>
              </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
