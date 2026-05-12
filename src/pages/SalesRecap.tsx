import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { 
  Table as TableIcon, 
  Plus, 
  Trash2, 
  Download, 
  X,
  FileSpreadsheet,
  Check,
  Edit2,
  Sparkle,
  ArrowLeft,
  Folder,
  ExternalLink
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
  category?: string;
  shopLink?: string;
  createdAt: any;
}

export default function SalesRecap() {
  const [user] = useAuthState(auth);
  const [sales, setSales] = useState<SalesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [booth, setBooth] = useState('');
  const [category, setCategory] = useState('');
  const [fee, setFee] = useState(4000);
  const [noInvoice, setNoInvoice] = useState('');
  const [shopLink, setShopLink] = useState('');
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

  const formatIDNumber = (value: string | number) => {
    const digits = value.toString().replace(/\D/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(digits));
  };

  const handlePriceChange = (index: number, value: string) => {
    const rawValue = value.replace(/\D/g, '');
    handleItemChange(index, 'price', parseInt(rawValue) || 0);
  };

  const handleFeeChange = (value: string) => {
    const rawValue = value.replace(/\D/g, '');
    setFee(parseInt(rawValue) || 0);
  };

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
      const path = `users/${user.uid}/salesRecap`;
      const batch = selectedIds.map(id => deleteDoc(doc(db, path, id)));
      await Promise.all(batch);
      setSelectedIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/salesRecap`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    const path = `users/${user.uid}/salesRecap`;
    const saleData: any = {
      customerName,
      booth,
      category: category.trim() || 'General',
      items,
      fee: Number(fee),
      userId: user.uid,
      noInvoice,
      shopLink,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, path, editingId), saleData);
      } else {
        saleData.createdAt = serverTimestamp();
        await addDoc(collection(db, path), saleData);
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setBooth('');
    setFee(4000);
    setNoInvoice('');
    setShopLink('');
    setItems([{ name: '', quantity: 1, price: 0 }]);
    setCategory('');
    setShowAdd(false);
    setEditingId(null);
  };

  const deleteSaleAction = async () => {
    if (!user || !confirmDelete) return;
    const path = `users/${user.uid}/salesRecap`;
    const idToDelete = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteDoc(doc(db, path, idToDelete));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const deleteSale = (id: string) => {
    setConfirmDelete(id);
  };

  const exportToPDF = (eventTitle?: string) => {
    if (sales.length === 0) return;

    const doc = new jsPDF('landscape');
    const tableData: any[][] = [];
    
    // Sort sales by date ascending for the report
    const sortedSales = [...sales].sort((a, b) => {
      const dateA = (a.createdAt as Timestamp)?.toMillis() || 0;
      const dateB = (b.createdAt as Timestamp)?.toMillis() || 0;
      return dateA - dateB;
    });

    // Calculate Grand Totals accurately
    const grandTotalQty = sortedSales.reduce((acc, sale) => acc + sale.items.reduce((iAcc, item) => iAcc + item.quantity, 0), 0);
    const grandSubtotal = sortedSales.reduce((acc, sale) => acc + sale.items.reduce((iAcc, item) => iAcc + (item.price * item.quantity), 0), 0);
    const grandTotalFees = sortedSales.reduce((acc, sale) => acc + (Number(sale.fee) || 0), 0);
    const grandNetRevenue = grandSubtotal + grandTotalFees;

    sortedSales.forEach((sale, saleIdx) => {
      const saleTotalPrice = sale.items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
      const saleFinalPrice = saleTotalPrice + (Number(sale.fee) || 0);

      sale.items.forEach((item, itemIdx) => {
        const row = [
          itemIdx === 0 ? saleIdx + 1 : '',
          itemIdx === 0 ? sale.customerName : '',
          itemIdx === 0 ? sale.booth : '',
          item.name,
          item.quantity,
          formatCurrency(item.price).replace('Rp', '').trim(),
          itemIdx === 0 ? sale.items.reduce((acc, curr) => acc + curr.quantity, 0) : '', 
          itemIdx === 0 ? formatCurrency(saleTotalPrice).replace('Rp', '').trim() : '',
          itemIdx === 0 ? formatCurrency(sale.fee).replace('Rp', '').trim() : '',
          itemIdx === 0 ? formatCurrency(saleFinalPrice).replace('Rp', '').trim() : '',
          itemIdx === 0 ? sale.noInvoice : ''
        ];
        tableData.push(row);
      });
    });

    // Add Brand Header
    doc.setFillColor(15, 23, 42); // Deep Dark
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    
    doc.setTextColor(255, 215, 0); // Gold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('ETHEVIER', 14, 22);
    
    doc.setTextColor(148, 163, 184); // Slate blue
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const subTitle = eventTitle ? `EVENT: ${eventTitle.toUpperCase()}` : 'MAGICAL FINANCIAL RECAP';
    doc.text(subTitle, 14, 30);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`REPORT DATE: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, doc.internal.pageSize.width - 15, 22, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`Generated at: ${new Date().toLocaleTimeString('id-ID')}`, doc.internal.pageSize.width - 15, 30, { align: 'right' });

    autoTable(doc, {
      startY: 45,
      head: [['ID', 'CUSTOMER', 'BOOTH', 'ITEM NAME', 'QTY', 'PRICE', 'T. QTY', 'SUBTOTAL', 'FEE', 'TOTAL', 'INV']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold', 
        fontSize: 9,
        halign: 'center'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3, 
        font: 'helvetica',
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
        1: { fontStyle: 'italic', cellWidth: 35 },
        2: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'right', cellWidth: 22 },
        6: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
        7: { halign: 'right', cellWidth: 25 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
        10: { halign: 'center', cellWidth: 20 }
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Ethevier Financial Service - Page ${doc.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    // Add Final Summary Box at the end
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    const boxWidth = 120;
    const boxHeight = 50;
    const startX = doc.internal.pageSize.width - boxWidth - 14;

    // Check if box fits on current page
    if (finalY + boxHeight > doc.internal.pageSize.height - 20) {
      doc.addPage();
      finalY = 20;
    }

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(startX, finalY, boxWidth, boxHeight, 3, 3, 'FD');
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('GRAND RECAP SUMMARY', startX + 5, finalY + 10);
    
    doc.setDrawColor(30, 41, 59, 0.1);
    doc.line(startX + 5, finalY + 13, startX + boxWidth - 5, finalY + 13);

    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const rowY = (offset: number) => finalY + 22 + (offset * 7);
    
    doc.text(`Total Records:`, startX + 5, rowY(0));
    doc.text(`${sortedSales.length} Transactions`, startX + boxWidth - 5, rowY(0), { align: 'right' });
    
    doc.text(`Total Items Sold:`, startX + 5, rowY(1));
    doc.text(`${grandTotalQty} Items`, startX + boxWidth - 5, rowY(1), { align: 'right' });
    
    doc.text(`Total Item Sales (Subtotal):`, startX + 5, rowY(2));
    doc.text(`${formatCurrency(grandSubtotal)}`, startX + boxWidth - 5, rowY(2), { align: 'right' });
    
    doc.text(`Total Additional Fees:`, startX + 5, rowY(3));
    doc.text(`${formatCurrency(grandTotalFees)}`, startX + boxWidth - 5, rowY(3), { align: 'right' });
    
    // Revenue Line
    doc.setFillColor(30, 41, 59);
    doc.rect(startX, finalY + boxHeight - 12, boxWidth, 12, 'F');
    doc.setTextColor(255, 215, 0); // Gold text on dark bg
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`GRAND NET REVENUE:`, startX + 5, finalY + boxHeight - 4);
    doc.text(`${formatCurrency(grandNetRevenue)}`, startX + boxWidth - 5, finalY + boxHeight - 4, { align: 'right' });

    const fileName = eventTitle 
      ? `Ethevier_${eventTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      : `Ethevier_Recap_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(fileName);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const groupedSales = sales.reduce((acc, sale) => {
    const cat = sale.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sale);
    return acc;
  }, {} as Record<string, SalesEntry[]>);

  const saleCategories = Object.keys(groupedSales).sort();

  if (loading) return <div className="p-8 text-xavier-blue">Building report table...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {selectedEvent && (
               <button 
                 onClick={() => setSelectedEvent(null)}
                 className="p-2 bg-white/5 border border-white/10 rounded-xl text-xavier-blue hover:text-aether-gold transition-colors"
               >
                 <ArrowLeft className="w-5 h-5" />
               </button>
            )}
            <FileSpreadsheet className="text-aether-gold" />
            <h2 className="text-3xl font-bold text-star-white">
              {selectedEvent ? selectedEvent : 'Sales Recap'}
            </h2>
          </div>
          <p className="text-xavier-blue/70 italic text-sm">
            {selectedEvent ? `${groupedSales[selectedEvent].length} Transactions recorded` : 'Detailed transaction summary in sheet format.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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
            onClick={() => setShowEventModal(true)}
            className="px-6 py-3 bg-white/5 text-xavier-blue border border-white/10 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
          >
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
            <button 
              onClick={() => {
                resetForm();
                if (selectedEvent) setCategory(selectedEvent);
                setShowAdd(true);
              }}
              className="px-6 py-3 bg-aether-gold text-celestial-dark font-bold rounded-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>New Entry</span>
            </button>
        </div>
      </div>

      {!selectedEvent ? (
        // FOLDER VIEW
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {saleCategories.map(cat => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedEvent(cat)}
              className="group relative flex flex-col items-center p-8 bg-celestial-depth/40 border border-white/5 rounded-[2.5rem] hover:bg-white/5 hover:border-aether-gold/30 transition-all text-center"
            >
              <div className="relative mb-4">
                 <Folder className="w-16 h-16 text-aether-gold/40 group-hover:text-aether-gold/60 transition-colors fill-aether-gold/5" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-white/40 group-hover:text-white/60">
                      {groupedSales[cat].length}
                    </span>
                 </div>
              </div>
              <span className="text-xs font-black text-star-white uppercase tracking-widest truncate w-full px-2">
                {cat}
              </span>
              <div className="mt-2 text-[8px] text-xavier-blue font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                View Reports
              </div>
            </motion.button>
          ))}
          {saleCategories.length === 0 && (
             <div className="col-span-full bg-white/5 border border-white/10 rounded-[2rem] p-20 text-center text-xavier-blue/40 italic">
               No recap data found. Start by adding a new entry.
             </div>
          )}
        </div>
      ) : (
        // TABLE VIEW
        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-x-auto shadow-2xl">
          {(() => {
            const currentSales = groupedSales[selectedEvent];
            const grandTotalQty = currentSales.reduce((acc, sale) => acc + sale.items.reduce((iAcc, item) => iAcc + item.quantity, 0), 0);
            const grandTotalPrice = currentSales.reduce((acc, sale) => acc + sale.items.reduce((iAcc, item) => iAcc + (item.price * item.quantity), 0), 0);
            const grandTotalFee = currentSales.reduce((acc, sale) => acc + (Number(sale.fee) || 0), 0);
            const grandTotalFinalPrice = grandTotalPrice + grandTotalFee;

            return (
              <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-celestial-depth/80 text-xavier-blue uppercase tracking-tighter font-black">
                    <th className="p-4 border border-white/5 text-center w-12">
                      <div className="flex items-center justify-center">
                         <div 
                           onClick={() => {
                             const allIds = currentSales.map(s => s.id);
                             if (selectedIds.length === allIds.length) setSelectedIds([]);
                             else setSelectedIds(allIds);
                           }}
                           className={`w-4 h-4 rounded border transition-all cursor-pointer ${selectedIds.length === currentSales.length ? 'bg-aether-gold border-aether-gold' : 'border-white/20 bg-white/5'}`}
                         >
                            {selectedIds.length === currentSales.length && <Check className="w-3 h-3 text-deep-void" />}
                         </div>
                      </div>
                    </th>
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
                  {currentSales.map((sale, saleIdx) => {
                    const totalQty = sale.items.reduce((acc, curr) => acc + curr.quantity, 0);
                    const totalPrice = sale.items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
                    const finalPrice = totalPrice + (Number(sale.fee) || 0);
      
                    return sale.items.map((item, itemIdx) => (
                      <tr 
                        key={`${sale.id}-${itemIdx}`} 
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedIds.includes(sale.id) ? 'bg-white/[0.04]' : ''}`}
                        onClick={() => toggleSelect(sale.id)}
                      >
                        {itemIdx === 0 && (
                          <>
                            <td className="p-3 border border-white/5 text-center" rowSpan={sale.items.length}>
                               <div className="flex flex-col items-center gap-1">
                                  <div className={`w-4 h-4 rounded border transition-all ${selectedIds.includes(sale.id) ? 'bg-aether-gold border-aether-gold' : 'border-white/20 bg-white/5'}`}>
                                     {selectedIds.includes(sale.id) && <Check className="w-3 h-3 text-deep-void" />}
                                  </div>
                                  <span className="text-[10px] text-star-white font-bold">{saleIdx + 1}</span>
                               </div>
                            </td>
                            <td className="p-3 border border-white/5 text-star-white font-medium italic" rowSpan={sale.items.length}>
                              <div className="flex items-center gap-2">
                                <span>{sale.customerName}</span>
                                {sale.shopLink && (
                                  <a 
                                    href={sale.shopLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="p-1 bg-white/5 rounded hover:bg-aether-gold/20 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3 text-aether-gold" />
                                  </a>
                                )}
                              </div>
                            </td>
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
                              <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                                <button 
                                  onClick={() => {
                                    setEditingId(sale.id);
                                    setCustomerName(sale.customerName);
                                    setBooth(sale.booth);
                                    setCategory(sale.category || '');
                                    setFee(sale.fee);
                                    setNoInvoice(sale.noInvoice);
                                    setShopLink(sale.shopLink || '');
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
                </tbody>
                <tfoot>
                  <tr className="bg-celestial-depth/40 font-black border-t-2 border-white/10 uppercase italic">
                    <td colSpan={6} className="p-6 border border-white/5 text-right text-xavier-blue tracking-[0.2em]">Grand Total</td>
                    <td className="p-6 border border-white/5 text-center text-star-white">{grandTotalQty}</td>
                    <td className="p-6 border border-white/5 text-right text-star-white">{formatCurrency(grandTotalPrice)}</td>
                    <td className="p-6 border border-white/5 text-center text-red-400 bg-red-500/10">{formatCurrency(grandTotalFee)}</td>
                    <td className="p-6 border border-white/5 text-right text-aether-gold bg-aether-gold/10 text-base">{formatCurrency(grandTotalFinalPrice)}</td>
                    <td colSpan={2} className="p-6 border border-white/5"></td>
                  </tr>
                </tfoot>
              </table>
            );
          })()}
        </div>
      )}
    {sales.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-20 text-center text-xavier-blue/40 italic">
            No recap data found. Start by adding a new entry.
          </div>
        )}

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

                  <div className="space-y-2">
                      <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Category (Event / Folder)</label>
                      <input 
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        placeholder="e.g. Comifuro 18, Daily, Special Event"
                        className="w-full px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                      />
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
                            type="text"
                            value={formatIDNumber(item.price)}
                            onChange={e => handlePriceChange(idx, e.target.value)}
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
                          type="text"
                          value={formatIDNumber(fee)}
                          onChange={e => handleFeeChange(e.target.value)}
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

                  <div className="space-y-2">
                      <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Shop Link (Optional)</label>
                      <input 
                        value={shopLink}
                        onChange={e => setShopLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                      />
                  </div>

                  <button 
                    disabled={saving}
                    className="w-full bg-aether-gold text-celestial-dark font-black py-4 rounded-2xl text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-celestial-dark/30 border-t-celestial-dark rounded-full animate-spin" />
                    ) : (
                      editingId ? 'Update Entry' : 'Save Entry'
                    )}
                  </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Event Name Modal */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 sm:p-0">
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEventModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-[#0F172A] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-aether-gold/5 blur-[80px] -mr-16 -mt-16" />
                <div className="relative space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-star-white">Event Name</h3>
                    <button onClick={() => setShowEventModal(false)} className="p-2 text-xavier-blue/40 hover:text-star-white">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-xavier-blue uppercase tracking-widest px-2">Specify Event (Optional)</label>
                      <input 
                        type="text"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        placeholder="e.g. Comifuro 18, Popcon, etc."
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      exportToPDF(eventName);
                      setShowEventModal(false);
                      setEventName('');
                    }}
                    className="w-full py-4 bg-aether-gold text-deep-void font-bold rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Sparkle className="w-5 h-5" />
                    Generate PDF
                  </button>
                </div>
              </motion.div>
          </div>
        )}
      </AnimatePresence>
       {/* Custom Confirmation Modals */}
       <AnimatePresence>
         {(confirmDelete || confirmDeleteSelected) && (
           <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
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
                <p className="text-xavier-blue/60 mb-8 text-sm">
                  {confirmDeleteSelected 
                    ? `Remove ${selectedIds.length} sales entries from your records forever? This action cannot be undone.` 
                    : "Remove this sales entry from your records? This action cannot be undone."}
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setConfirmDelete(null); setConfirmDeleteSelected(false); }}
                    className="flex-1 py-4 bg-white/5 text-xavier-blue font-bold rounded-2xl hover:bg-white/10 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeleteSelected ? deleteSelected : deleteSaleAction}
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
