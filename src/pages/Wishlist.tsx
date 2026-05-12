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
  Pencil,
  ArrowLeft,
  Folder
} from 'lucide-react';

export default function Wishlist() {
  const [user] = useAuthState(auth);
  const [items, setItems] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [dailyAverage, setDailyAverage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (!user || selectedIds.length === 0) return;
    
    setConfirmDeleteSelected(false);
    setLoading(true);
    try {
      const batch = selectedIds.map(id => 
        deleteDoc(doc(db, `users/${user.uid}/wishlist`, id))
      );
      await Promise.all(batch);
      setSelectedIds([]);
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/wishlist`);
    } finally {
      setLoading(false);
    }
  };

  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user?.uid,
        email: user?.email,
        emailVerified: user?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    // Optional: show a user-friendly alert or notification
  };

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');
  const [link, setLink] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');

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

  const formatDisplayNumber = (value: string | number) => {
    const digits = value.toString().replace(/\D/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(digits));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setPrice(rawValue);
    setDisplayPrice(formatDisplayNumber(e.target.value));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !price) return;

    setSaving(true);
    try {
      const wishlistRef = collection(db, 'users', user.uid, 'wishlist');
      if (editingItem) {
        await updateDoc(doc(db, 'users', user.uid, 'wishlist', editingItem.id), {
          name,
          price: parseFloat(price),
          link,
          deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
          notes,
          category: category.trim() || 'General',
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(wishlistRef, {
          name,
          price: parseFloat(price),
          link,
          userId: user.uid,
          deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
          notes,
          category: category.trim() || 'General',
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingItem ? 'update' : 'create', `users/${user.uid}/wishlist`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setDisplayPrice('');
    setLink('');
    setDeadline('');
    setNotes('');
    setCategory('');
    setShowAdd(false);
    setEditingItem(null);
  };

  const openEdit = (item: any) => {
    try {
      setEditingItem(item);
      setName(item.name || '');
      const priceVal = item.price?.toString() || '';
      setPrice(priceVal);
      setDisplayPrice(formatDisplayNumber(priceVal));
      setLink(item.link || '');
      if (item.deadline) {
        const date = (item.deadline as Timestamp).toDate ? (item.deadline as Timestamp).toDate() : new Date(item.deadline);
        if (!isNaN(date.getTime())) {
          setDeadline(date.toISOString().split('T')[0]);
        } else {
          setDeadline('');
        }
      } else {
        setDeadline('');
      }
      setNotes(item.notes || '');
      setCategory(item.category || '');
      setShowAdd(true);
    } catch (error) {
      console.error("Error opening edit modal:", error);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!user) return;
    const wishlistPath = `users/${user.uid}/wishlist`;
    try {
      await updateDoc(doc(db, wishlistPath, id), {
        status: currentStatus === 'pending' ? 'attained' : 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, 'update', wishlistPath);
    }
  };

  const deleteItem = async (id: string | undefined) => {
    if (!user || !id) return;
    const wishlistPath = `users/${user.uid}/wishlist`;
    try {
      await deleteDoc(doc(db, wishlistPath, id));
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, 'delete', wishlistPath);
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

  const getMillis = (val: any) => {
    if (!val) return null;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (val.seconds !== undefined) return val.seconds * 1000;
    const date = new Date(val.toDate ? val.toDate() : val);
    return isNaN(date.getTime()) ? null : date.getTime();
  };

  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const categories = Object.keys(groupedItems).sort();

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-star-white">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
             {selectedCategory && (
               <button 
                 onClick={() => setSelectedCategory(null)}
                 className="p-2 bg-white/5 border border-white/10 rounded-xl text-xavier-blue hover:text-aether-gold transition-colors"
               >
                 <ArrowLeft className="w-5 h-5" />
               </button>
             )}
             <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase italic">
               {selectedCategory ? selectedCategory : 'Galaxy Wishlist'}
             </h1>
           </div>
           <p className="text-xavier-blue text-sm font-bold tracking-widest uppercase opacity-60">
             {selectedCategory ? `${groupedItems[selectedCategory].length} Dreams in this cluster` : 'Architect your future desires'}
           </p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setConfirmDeleteSelected(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 sm:py-3 rounded-2xl font-bold hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-5 h-5" />
              <span>Delete {selectedIds.length}</span>
            </button>
          )}
          <button 
            onClick={() => {
              resetForm();
              if (selectedCategory) setCategory(selectedCategory);
              setShowAdd(true);
            }}
            className="flex-1 sm:flex-none group relative px-8 py-4 bg-aether-gold text-celestial-dark font-black rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,215,0,0.3)]"
          >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative flex items-center gap-2 uppercase tracking-tighter">
            <Plus className="w-5 h-5" /> New Dream
          </span>
        </button>
      </div>
    </div>

      {!selectedCategory ? (
        // FOLDER VIEW
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {categories.map((cat) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedCategory(cat)}
              className="group relative flex flex-col items-center p-8 bg-celestial-depth/40 border border-white/5 rounded-[2.5rem] hover:bg-white/5 hover:border-aether-gold/30 transition-all text-center"
            >
              <div className="relative mb-4">
                 <Folder className="w-16 h-16 text-aether-gold/40 group-hover:text-aether-gold/60 transition-colors fill-aether-gold/5" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-white/40 group-hover:text-white/60">
                      {groupedItems[cat].length}
                    </span>
                 </div>
              </div>
              <span className="text-xs font-black text-star-white uppercase tracking-widest truncate w-full px-2">
                {cat}
              </span>
              <div className="mt-2 text-[8px] text-xavier-blue font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                Open Cluster
              </div>
            </motion.button>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
               <ShoppingCart className="w-12 h-12 text-xavier-blue/20 mx-auto mb-4" />
               <p className="text-xavier-blue/40 italic">Galaxy is empty. No dream clusters detected.</p>
            </div>
          )}
        </div>
      ) : (
        // ITEMS VIEW
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {groupedItems[selectedCategory].map((item, idx) => {
               return (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative p-8 rounded-[2rem] border transition-all overflow-hidden cursor-pointer ${
                      selectedIds.includes(item.id) ? 'ring-2 ring-aether-gold border-aether-gold/50' : ''
                    } ${
                      item.status === 'attained' 
                        ? 'bg-green-500/10 border-green-500/20 grayscale-[0.5]' 
                        : 'bg-celestial-depth/80 border-white/10 hover:border-aether-gold/30'
                    }`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-aether-gold border-aether-gold' : 'border-white/10 bg-white/5'}`}>
                           {selectedIds.includes(item.id) && <Check className="w-4 h-4 text-deep-void" />}
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-aether-gold">
                           <Heart className={item.status === 'attained' ? 'fill-green-400 text-green-400' : ''} />
                        </div>
                      </div>
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(item)} className="p-3 text-xavier-blue/40 hover:text-aether-gold hover:bg-white/5 rounded-xl transition-all">
                          <Pencil className="w-5 h-5" />
                        </button>
                        <div className="relative">
                          {deletingId === item.id ? (
                            <div className="absolute right-0 top-0 flex items-center bg-red-500 rounded-xl overflow-hidden shadow-lg z-10">
                              <button 
                                onClick={() => deleteItem(item.id)}
                                className="px-4 py-3 text-xs font-bold text-white uppercase tracking-tighter hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                              <button 
                                onClick={() => setDeletingId(null)}
                                className="px-3 py-3 bg-black/20 text-white hover:bg-black/40 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(item.id);
                              }} 
                              className="p-3 text-xavier-blue/40 hover:text-red-400 hover:bg-white/5 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                        <button onClick={() => toggleStatus(item.id, item.status)} className={`p-3 rounded-xl transition-all ${item.status === 'attained' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/5 text-xavier-blue hover:text-green-400 hover:bg-white/10'}`}>
                          <Check className="w-5 h-5" />
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
        </div>
      )}
        
        {items.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
             <ShoppingCart className="w-12 h-12 text-xavier-blue/20 mx-auto mb-4" />
             <p className="text-xavier-blue/40 italic">Galaxy is empty. What are you dreaming of?</p>
          </div>
        )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
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
                        type="text"
                        value={displayPrice}
                        onChange={handlePriceChange}
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
                      <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Category (Folder)</label>
                      <input 
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        placeholder="e.g. Needs, Hobby, Tech"
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
                   
                   <button 
                     type="submit"
                     disabled={saving}
                     className="w-full bg-aether-gold text-celestial-dark font-black py-5 rounded-2xl text-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-celestial-dark/30 border-t-celestial-dark rounded-full animate-spin" />
                      ) : (
                        editingItem ? 'Update Wish' : 'Send Wish to Stars'
                      )}
                   </button>
                </form>
              </motion.div>
          </div>
        )}
      </AnimatePresence>
       {/* Custom Confirmation Modal */}
       <AnimatePresence>
         {confirmDeleteSelected && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-celestial-dark/80 backdrop-blur-md">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-sm bg-celestial-depth border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center"
             >
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-star-white mb-2">Are you sure?</h3>
                <p className="text-xavier-blue/60 mb-8 text-sm">
                  Remove {selectedIds.length} dreams from your constellation? This action cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setConfirmDeleteSelected(false)}
                    className="flex-1 py-4 bg-white/5 text-xavier-blue font-bold rounded-2xl hover:bg-white/10 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={deleteSelected}
                    className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 text-sm"
                  >
                    Delete Now
                  </button>
                </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
    </div>
  );
}
