import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { 
  Table as TableIcon, 
  Plus, 
  Trash2, 
  Download, 
  X,
  FileSpreadsheet,
  Check,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

interface SalesItem {
  name: string;
  quantity: number;
  price: number;
}

interface SalesEntry {
  id: string;
  customerName: string;
  booth: string;
  items: SalesItem[];
  fee: number;
  noInvoice: string;
  createdAt: any;
}

export default function SalesRecap() {
  const [user] = useAuthState(auth);
  const [sales, setSales] = useState<SalesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [booth, setBooth] = useState('');
  const [fee, setFee] = useState(4000);
  const [noInvoice, setNoInvoice] = useState('');
  const [items, setItems] = useState<SalesItem[]>([{ name: '', quantity: 1, price: 0 }]);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/salesRecap`;
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SalesEntry[];
      setSales(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddItemRow = () => {
    setItems([...items, { name: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const path = `users/${user.uid}/salesRecap`;
    const saleData = {
      customerName,
      booth,
      items,
      fee: Number(fee),
      noInvoice,
      createdAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, path, editingId), saleData);
      } else {
        await addDoc(collection(db, path), saleData);
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setBooth('');
    setFee(4000);
    setNoInvoice('');
    setItems([{ name: '', quantity: 1, price: 0 }]);
    setShowAdd(false);
    setEditingId(null);
  };

  const deleteSale = async (id: string) => {
    if (!user || !confirm('Remove this entry?')) return;
    const path = `users/${user.uid}/salesRecap`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) return <div className="p-8 text-xavier-blue">Building report table...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileSpreadsheet className="text-aether-gold" />
            <h2 className="text-3xl font-bold text-star-white">Sales Recap</h2>
          </div>
          <p className="text-xavier-blue/70 italic text-sm">Detailed transaction summary in sheet format.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="px-6 py-3 bg-aether-gold text-celestial-dark font-bold rounded-2xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>New Entry</span>
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-x-auto shadow-2xl">
        <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-celestial-depth/80 text-xavier-blue uppercase tracking-tighter font-black">
              <th className="p-4 border border-white/5 text-center w-12">NO</th>
              <th className="p-4 border border-white/5">X</th>
              <th className="p-4 border border-white/5 text-center">BOOTH</th>
              <th className="p-4 border border-white/5">ITEM NAME</th>
              <th className="p-4 border border-white/5 text-center">QTY</th>
              <th className="p-4 border border-white/5 text-right">ITEM PRICE</th>
              <th className="p-4 border border-white/5 text-center">TOTAL QTY</th>
              <th className="p-4 border border-white/5 text-right">TOTAL PRICE</th>
              <th className="p-4 border border-white/5 text-center bg-red-500/20 text-red-300">FEE</th>
              <th className="p-4 border border-white/5 text-right bg-white/5">FINAL PRICE</th>
              <th className="p-4 border border-white/5 text-center">NO INVOICE</th>
              <th className="p-4 border border-white/5 text-center">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale, saleIdx) => {
              const totalQty = sale.items.reduce((acc, curr) => acc + curr.quantity, 0);
              const totalPrice = sale.items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
              const finalPrice = totalPrice + (Number(sale.fee) || 0);

              return sale.items.map((item, itemIdx) => (
                <tr key={`${sale.id}-${itemIdx}`} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  {itemIdx === 0 && (
                    <>
                      <td className="p-3 border border-white/5 text-center text-star-white font-bold" rowSpan={sale.items.length}>{saleIdx + 1}</td>
                      <td className="p-3 border border-white/5 text-star-white font-medium italic" rowSpan={sale.items.length}>{sale.customerName}</td>
                      <td className="p-3 border border-white/5 text-center text-xavier-blue" rowSpan={sale.items.length}>{sale.booth}</td>
                    </>
                  )}
                  <td className="p-3 border border-white/5 text-star-white/90">{item.name}</td>
                  <td className="p-3 border border-white/5 text-center text-xavier-blue">{item.quantity}</td>
                  <td className="p-3 border border-white/5 text-right text-star-white/70">{formatCurrency(item.price)}</td>
                  
                  {itemIdx === 0 && (
                    <>
                      <td className="p-3 border border-white/5 text-center text-star-white font-black" rowSpan={sale.items.length}>{totalQty}</td>
                      <td className="p-3 border border-white/5 text-right text-star-white font-bold" rowSpan={sale.items.length}>{formatCurrency(totalPrice)}</td>
                      <td className="p-3 border border-white/5 text-center bg-red-500/10 text-red-400 font-bold" rowSpan={sale.items.length}>{formatCurrency(sale.fee)}</td>
                      <td className="p-3 border border-white/5 text-right bg-white/5 text-aether-gold font-black text-sm" rowSpan={sale.items.length}>{formatCurrency(finalPrice)}</td>
                      <td className="p-3 border border-white/5 text-center text-xavier-blue font-bold" rowSpan={sale.items.length}>
                        {sale.noInvoice || '❌'}
                      </td>
                      <td className="p-3 border border-white/5 text-center" rowSpan={sale.items.length}>
                        <div className="flex items-center justify-center gap-2">
                           <button 
                            onClick={() => {
                              setEditingId(sale.id);
                              setCustomerName(sale.customerName);
                              setBooth(sale.booth);
                              setFee(sale.fee);
                              setNoInvoice(sale.noInvoice);
                              setItems(sale.items);
                              setShowAdd(true);
                            }}
                            className="p-2 text-xavier-blue/40 hover:text-aether-gold transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteSale(sale.id)}
                            className="p-2 text-xavier-blue/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ));
            })}
            {sales.length === 0 && (
              <tr>
                <td colSpan={12} className="p-20 text-center text-xavier-blue/40 italic">No recap data found. Start by adding a new entry.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-celestial-dark/80 backdrop-blur-md">
             <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-celestial-depth border border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
             >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-star-white">{editingId ? 'Edit Entry' : 'New Sales Entry'}</h3>
                  <button onClick={resetForm} className="p-2 text-xavier-blue/60 hover:text-star-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Customer (X)</label>
                        <input 
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          placeholder="e.g. feralish_"
                          className="w-full px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                          required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Booth</label>
                        <input 
                          value={booth}
                          onChange={e => setBooth(e.target.value)}
                          placeholder="e.g. I-19"
                          className="w-full px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                          required
                        />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                       <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest">Items</label>
                       <button 
                        type="button" 
                        onClick={handleAddItemRow}
                        className="text-[10px] bg-white/5 text-xavier-blue px-3 py-1 rounded-full hover:bg-white/10 transition-colors uppercase font-bold"
                       >
                         + Add Item
                       </button>
                    </div>
                    {items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-end">
                        <div className="flex-[3] space-y-1">
                          <input 
                            value={item.name}
                            onChange={e => handleItemChange(idx, 'name', e.target.value)}
                            placeholder="Item Name"
                            className="w-full px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-star-white focus:outline-none"
                            required
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <input 
                            type="number"
                            value={item.quantity}
                            onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                            placeholder="Qty"
                            className="w-full px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-star-white focus:outline-none"
                            required
                          />
                        </div>
                        <div className="flex-2 space-y-1">
                          <input 
                            type="number"
                            value={item.price}
                            onChange={e => handleItemChange(idx, 'price', parseInt(e.target.value) || 0)}
                            placeholder="Price"
                            className="w-full px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-star-white focus:outline-none"
                            required
                          />
                        </div>
                        {items.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-2 text-red-400/40 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Fee (IDR)</label>
                        <input 
                          type="number"
                          value={fee}
                          onChange={e => setFee(parseInt(e.target.value) || 0)}
                          className="w-full px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-red-400/50"
                          required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Invoice No</label>
                        <input 
                          value={noInvoice}
                          onChange={e => setNoInvoice(e.target.value)}
                          placeholder="e.g. 114"
                          className="w-full px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                        />
                    </div>
                  </div>

                  <button className="w-full bg-aether-gold text-celestial-dark font-black py-4 rounded-2xl text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                    {editingId ? 'Update Entry' : 'Save Entry'}
                  </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
