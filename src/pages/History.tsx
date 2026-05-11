import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { History as HistoryIcon, Trash2, ArrowUpRight, Search, Filter, Edit2, X, Save, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function History() {
  const [user] = useAuthState(auth);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editFrequency, setEditFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'income' | 'expense' } | null>(null);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);

  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user?.uid,
        email: user?.email,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  };

  const toggleSelect = (id: string, type: 'income' | 'expense') => {
    const compositeId = `${type}:${id}`;
    setSelectedIds(prev => 
      prev.includes(compositeId) ? prev.filter(i => i !== compositeId) : [...prev, compositeId]
    );
  };

  const deleteSelected = async () => {
    if (!user || selectedIds.length === 0) return;
    
    setConfirmDeleteSelected(false);
    setLoading(true);
    try {
      const batch = selectedIds.map(compositeId => {
        const [type, id] = compositeId.split(':');
        const collectionName = type === 'income' ? 'incomes' : 'expenses';
        return deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, id));
      });
      await Promise.all(batch);
      setSelectedIds([]);
    } catch (error) {
      handleFirestoreError(error, 'deleteSelected', `users/${user.uid}/transactions`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (e: React.MouseEvent, transaction: any) => {
    e.stopPropagation();
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditSource(transaction.source || '');
    setEditFrequency(transaction.frequency || 'daily');
  };

  const formatInputNumber = (value: string | number) => {
    const digits = value.toString().replace(/\D/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(digits));
  };

  const handleAmountEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setEditAmount(rawValue);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTransaction) return;

    setIsUpdating(true);
    try {
      const collectionName = editingTransaction.type === 'income' ? 'incomes' : 'expenses';
      await updateDoc(doc(db, 'users', user.uid, collectionName, editingTransaction.id), {
        amount: parseFloat(editAmount),
        source: editSource,
        frequency: editFrequency,
        updatedAt: new Date()
      });
      setEditingTransaction(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const iq = query(
      collection(db, 'users', user.uid, 'incomes'),
      orderBy('date', 'desc')
    );
    const eq = query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    );

    let incomes: any[] = [];
    let expenses: any[] = [];

    const unsubscribeIncomes = onSnapshot(iq, (snapshot) => {
      incomes = snapshot.docs.map(doc => ({ id: doc.id, type: 'income', ...doc.data() }));
      combineAndSet();
    });

    const unsubscribeExpenses = onSnapshot(eq, (snapshot) => {
      expenses = snapshot.docs.map(doc => ({ id: doc.id, type: 'expense', ...doc.data() }));
      combineAndSet();
    });

    const combineAndSet = () => {
      const combined = [...incomes, ...expenses].sort((a, b) => {
        const dateA = (a.date as Timestamp)?.toMillis() || Date.now();
        const dateB = (b.date as Timestamp)?.toMillis() || Date.now();
        return dateB - dateA;
      });
      setTransactions(combined);
      setLoading(false);
    };

    return () => {
      unsubscribeIncomes();
      unsubscribeExpenses();
    };
  }, [user]);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredTransactions = transactions.filter(t => 
    (t.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatIDR(t.amount).includes(searchTerm)
  );

  const handleDeleteAction = async () => {
    if (!user || !confirmDelete) return;
    
    const { id, type } = confirmDelete;
    setConfirmDelete(null);
    setDeletingIds(prev => [...prev, id]);
    try {
      const collectionName = type === 'income' ? 'incomes' : 'expenses';
      await deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/${type === 'income' ? 'incomes' : 'expenses'}`);
    } finally {
      setDeletingIds(prev => prev.filter(di => di !== id));
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string, type: 'income' | 'expense') => {
    e.stopPropagation();
    setConfirmDelete({ id, type });
  };

  const exportToPDF = () => {
    if (filteredTransactions.length === 0) return;

    const doc = new jsPDF();
    const tableData = filteredTransactions.map((t, idx) => {
      const date = (t.date as Timestamp)?.toDate() || new Date();
      return [
        idx + 1,
        format(date, 'dd MMM yyyy, HH:mm'),
        `${t.source || 'General'} (${t.frequency || 'daily'})`,
        t.type === 'income' ? 'INCOME' : 'EXPENSE',
        formatIDR(t.amount).replace('Rp', '').trim()
      ];
    });

    // Add Brand Header (Matching SalesRecap style)
    doc.setFillColor(15, 23, 42); // Deep Dark
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    
    doc.setTextColor(255, 215, 0); // Gold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('ETHEVIER', 14, 22);
    
    doc.setTextColor(148, 163, 184); // Slate blue
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('COMPLETE FINANCIAL HISTORY REPORT', 14, 30);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(user?.displayName?.toUpperCase() || 'USER HISTORY', doc.internal.pageSize.width - 15, 22, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, doc.internal.pageSize.width - 15, 30, { align: 'right' });

    autoTable(doc, {
      startY: 45,
      head: [['ID', 'DATE', 'SOURCE / DESCRIPTION', 'TYPE', 'AMOUNT']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 40 },
        3: { fontStyle: 'bold', halign: 'center' },
        4: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.column.index === 3) {
          if (data.cell.text[0] === 'INCOME') {
            data.cell.styles.textColor = [34, 197, 94]; // Green
          } else if (data.cell.text[0] === 'EXPENSE') {
            data.cell.styles.textColor = [239, 68, 68]; // Red
          }
        }
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Ethevier Financial Service - Page ${doc.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(`Ethevier_History_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return <div className="p-8 text-xavier-blue">Tracking past star trails...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <HistoryIcon className="text-aether-gold" />
             <h2 className="text-3xl font-bold text-star-white">History</h2>
           </div>
           <p className="text-xavier-blue/70">The light trails of your prosperity over time.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setConfirmDeleteSelected(true)}
              className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all text-sm sm:text-base"
            >
              <Trash2 className="w-5 h-5" />
              <span>Delete {selectedIds.length}</span>
            </button>
          )}
          <button 
            onClick={exportToPDF}
            className="px-6 py-3 bg-white/5 text-xavier-blue border border-white/10 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
          >
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
          <div className="relative group w-full sm:w-80">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-xavier-blue/40 group-focus-within:text-aether-gold transition-colors" />
             <input 
               type="text"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               placeholder="Search transactions..."
               className="w-full pl-12 pr-6 py-3 bg-celestial-depth border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50 transition-all"
             />
          </div>
        </div>
      </div>

      <div className="bg-celestial-depth/50 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden">
         <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-star-white">All Transactions</h3>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-xavier-blue/60 uppercase tracking-widest">
               <Filter className="w-4 h-4" />
               <span>Year/Month/Day</span>
            </div>
         </div>

          {/* Mobile View: Cards */}
          <div className="md:hidden divide-y divide-white/5">
            {filteredTransactions.map((transaction, idx) => (
              <motion.div 
                key={transaction.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`p-6 space-y-4 cursor-pointer transition-all ${selectedIds.includes(`${transaction.type}:${transaction.id}`) ? 'bg-white/[0.04]' : ''}`}
                onClick={() => toggleSelect(transaction.id, transaction.type)}
              >
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.includes(`${transaction.type}:${transaction.id}`) ? 'bg-aether-gold border-aether-gold' : 'border-white/10 bg-white/5'}`}>
                         {selectedIds.includes(`${transaction.type}:${transaction.id}`) && <X className="w-3 h-3 text-deep-void" />}
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${transaction.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                         <ArrowUpRight className={`w-4 h-4 ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400 rotate-90'}`} />
                      </div>
                      <div>
                         <p className="text-sm font-semibold text-star-white">{transaction.source || 'No Note'}</p>
                         <p className="text-[10px] text-xavier-blue/60 uppercase tracking-wider">
                            {(transaction.date as Timestamp)?.toDate ? format((transaction.date as Timestamp).toDate(), 'dd MMM yyyy HH:mm') : 'Syncing...'}
                         </p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={(e) => handleEdit(e, transaction)}
                       className="p-2 text-xavier-blue/20 hover:text-aether-gold transition-colors"
                     >
                       <Edit2 className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={(e) => handleDelete(e, transaction.id, transaction.type)}
                       disabled={deletingIds.includes(transaction.id)}
                       className={`p-2 text-xavier-blue/20 hover:text-red-400 transition-all ${deletingIds.includes(transaction.id) ? 'opacity-50' : ''}`}
                     >
                       {deletingIds.includes(transaction.id) ? (
                         <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                       ) : (
                         <Trash2 className="w-4 h-4" />
                       )}
                     </button>
                   </div>
                </div>
                    <div className="flex gap-2">
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase border ${transaction.type === 'income' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                          {transaction.frequency || 'daily'}
                       </span>
                       <div className={`text-xl font-bold ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatIDR(transaction.amount)}
                       </div>
                    </div>
              </motion.div>
            ))}
         </div>

         {/* Desktop View: Table */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-white/5">
                     <th className="px-8 py-4 w-12">
                        <div 
                          onClick={() => {
                            if (selectedIds.length === filteredTransactions.length) setSelectedIds([]);
                            else setSelectedIds(filteredTransactions.map(t => `${t.type}:${t.id}`));
                          }}
                          className={`w-5 h-5 rounded border-2 transition-all cursor-pointer flex items-center justify-center ${selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? 'bg-aether-gold border-aether-gold' : 'border-white/10 bg-white/5'}`}
                        >
                           {selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0 && <X className="w-3 h-3 text-deep-void" />}
                        </div>
                     </th>
                     <th className="px-8 py-4 text-[10px] font-bold text-xavier-blue uppercase tracking-widest">Date & Time</th>
                     <th className="px-8 py-4 text-[10px] font-bold text-xavier-blue uppercase tracking-widest">Source / Description</th>
                     <th className="px-8 py-4 text-[10px] font-bold text-xavier-blue uppercase tracking-widest">Amount</th>
                     <th className="px-8 py-4 text-[10px] font-bold text-xavier-blue uppercase tracking-widest text-right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  <AnimatePresence>
                     {filteredTransactions.map((transaction, idx) => (
                        <motion.tr 
                          key={transaction.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer ${selectedIds.includes(`${transaction.type}:${transaction.id}`) ? 'bg-white/[0.04]' : ''}`}
                          onClick={() => toggleSelect(transaction.id, transaction.type)}
                        >
                           <td className="px-8 py-6">
                              <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.includes(`${transaction.type}:${transaction.id}`) ? 'bg-aether-gold border-aether-gold' : 'border-white/10 bg-white/5'}`}>
                                 {selectedIds.includes(`${transaction.type}:${transaction.id}`) && <X className="w-3 h-3 text-deep-void" />}
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <div className="space-y-0.5">
                                 <p className="text-sm font-medium text-star-white">
                                    {(transaction.date as Timestamp)?.toDate ? format((transaction.date as Timestamp).toDate(), 'dd MMMM yyyy') : 'Syncing...'}
                                 </p>
                                 <p className="text-[10px] text-xavier-blue/60 uppercase tracking-wider">
                                    {(transaction.date as Timestamp)?.toDate ? format((transaction.date as Timestamp).toDate(), 'HH:mm:ss') : '...'}
                                 </p>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${transaction.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    <ArrowUpRight className={`w-4 h-4 ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400 rotate-90'}`} />
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-sm text-star-white font-medium">{transaction.source || 'No Note'}</span>
                                    <span className="text-[9px] text-xavier-blue/40 uppercase font-black tracking-widest">{transaction.frequency || 'daily'}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <span className={`text-sm font-bold ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                 {transaction.type === 'income' ? '+' : '-'}{formatIDR(transaction.amount)}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                                <button 
                                  onClick={(e) => handleEdit(e, transaction)}
                                  className="p-2 text-xavier-blue/20 hover:text-aether-gold hover:bg-aether-gold/10 rounded-xl transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => handleDelete(e, transaction.id, transaction.type)}
                                  disabled={deletingIds.includes(transaction.id)}
                                  className={`p-2 text-xavier-blue/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all ${deletingIds.includes(transaction.id) ? 'opacity-50' : ''}`}
                                >
                                  {deletingIds.includes(transaction.id) ? (
                                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                           </td>
                        </motion.tr>
                     ))}
                  </AnimatePresence>
               </tbody>
            </table>
            
            {filteredTransactions.length === 0 && (
               <div className="py-20 text-center">
                  <p className="text-xavier-blue/40 italic">No traces found in your star constellation.</p>
               </div>
            )}
         </div>
      </div>
       {/* Edit Modal */}
       <AnimatePresence>
         {editingTransaction && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setEditingTransaction(null)}
               className="absolute inset-0 bg-celestial-dark/80 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-md bg-celestial-depth border border-white/10 rounded-[2.5rem] p-8 shadow-2xl"
             >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-star-white">Edit {editingTransaction.type === 'income' ? 'Income' : 'Expense'}</h3>
                  <button onClick={() => setEditingTransaction(null)} className="p-2 text-xavier-blue/60 hover:text-star-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-aether-gold">Rp</span>
                      <input 
                        type="text"
                        value={formatInputNumber(editAmount)}
                        onChange={handleAmountEditChange}
                        className="w-full pl-16 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-xl font-bold text-star-white focus:outline-none focus:border-aether-gold/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Source / Note</label>
                    <input 
                      type="text"
                      value={editSource}
                      onChange={e => setEditSource(e.target.value)}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Frequency / Period</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['daily', 'weekly', 'monthly', 'yearly'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setEditFrequency(f as any)}
                          className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${
                            editFrequency === f 
                              ? 'bg-xavier-blue/20 border-xavier-blue text-star-white' 
                              : 'bg-white/5 border-white/5 text-xavier-blue/40'
                          }`}
                        >
                          {f === 'daily' ? 'Harian' : f === 'weekly' ? 'Mgguan' : f === 'monthly' ? 'Bulan' : 'Tahun'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    disabled={isUpdating}
                    className="w-full bg-aether-gold text-celestial-dark font-black py-5 rounded-2xl text-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {isUpdating ? 'Updating...' : 'Save Changes'}
                  </button>
                </form>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
       {/* Custom Confirmation Modals */}
       <AnimatePresence>
         {(confirmDelete || confirmDeleteSelected) && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => { setConfirmDelete(null); setConfirmDeleteSelected(false); }}
               className="absolute inset-0 bg-celestial-dark/80 backdrop-blur-md"
             />
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
                <p className="text-xavier-blue/60 mb-8">
                  {confirmDeleteSelected 
                    ? `Remove ${selectedIds.length} transactions from your history forever? This action cannot be undone.` 
                    : "Remove this transaction from your star constellation? This action cannot be undone."}
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setConfirmDelete(null); setConfirmDeleteSelected(false); }}
                    className="flex-1 py-4 bg-white/5 text-xavier-blue font-bold rounded-2xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeleteSelected ? deleteSelected : handleDeleteAction}
                    className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
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
