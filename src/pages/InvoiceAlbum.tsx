import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  ImageIcon, 
  Plus, 
  Trash2, 
  X, 
  Upload, 
  Edit2, 
  Save, 
  Search,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: any;
}

export default function InvoiceAlbum() {
  const [user] = useAuthState(auth);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Selection
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'invoices'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];
      setInvoices(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate upload by converting to base64
    // In a real app with Firebase Storage, we would upload to storage and get a URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !imageUrl || !title) return;

    setIsUploading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'invoices'), {
        title,
        imageUrl,
        userId: user.uid,
        createdAt: new Date()
      });
      setTitle('');
      setImageUrl('');
      setShowAdd(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Discard this memory from your album?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'invoices', id));
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStartEdit = (invoice: Invoice) => {
    setEditingId(invoice.id);
    setEditTitle(invoice.title);
  };

  const handleUpdateTitle = async (id: string) => {
    if (!user || !editTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'invoices', id), {
        title: editTitle
      });
      setEditingId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-xavier-blue">Opening your celestial archives...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ImageIcon className="text-aether-gold" />
            <h2 className="text-3xl font-bold text-star-white">Invoice Album</h2>
          </div>
          <p className="text-xavier-blue/70">Visual echoes of your financial journey.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-xavier-blue/40 group-focus-within:text-aether-gold transition-colors" />
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search album..."
              className="w-full pl-12 pr-6 py-3 bg-celestial-depth border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50 transition-all text-sm"
            />
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-aether-gold text-celestial-dark font-black rounded-2xl hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Image
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filteredInvoices.map((invoice, idx) => (
            <motion.div
              key={invoice.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative bg-celestial-depth border border-white/10 rounded-[2rem] overflow-hidden shadow-xl hover:shadow-aether-gold/5 transition-all"
            >
              {/* Image Preview */}
              <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
                <img 
                  src={invoice.imageUrl} 
                  alt={invoice.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-celestial-dark/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                   <button 
                     onClick={() => setSelectedInvoice(invoice)}
                     className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
                   >
                     <Maximize2 className="w-5 h-5" />
                   </button>
                   <button 
                     onClick={() => handleDelete(invoice.id)}
                     className="p-3 bg-red-500/20 backdrop-blur-md rounded-full text-red-400 hover:bg-red-500/40 transition-all"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                </div>
              </div>

              {/* Title Area */}
              <div className="p-5">
                {editingId === invoice.id ? (
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="flex-1 bg-white/5 border border-aether-gold/50 rounded-lg px-3 py-1 text-star-white text-sm focus:outline-none"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleUpdateTitle(invoice.id)}
                      className="p-1 text-green-400 hover:scale-110"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="p-1 text-red-400 hover:scale-110"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="overflow-hidden">
                      <h4 className="text-star-white font-bold truncate pr-2">{invoice.title}</h4>
                      <p className="text-[10px] text-xavier-blue/40 uppercase tracking-widest font-medium">
                        {invoice.createdAt?.toDate ? format(invoice.createdAt.toDate(), 'dd MMM yyyy') : 'Recently'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleStartEdit(invoice)}
                      className="p-2 text-xavier-blue/20 hover:text-aether-gold transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredInvoices.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-2">
                <ImageIcon className="text-xavier-blue/20 w-8 h-8" />
             </div>
             <div>
                <p className="text-star-white font-bold">No echoes yet</p>
                <p className="text-xavier-blue/40 text-sm">Upload your first invoice to build the album.</p>
             </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
              className="absolute inset-0 bg-celestial-dark/80 backdrop-blur-xl px-4"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-celestial-depth border border-white/10 rounded-[3rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-star-white">New Submission</h3>
                <button 
                  onClick={() => setShowAdd(false)}
                  className="p-2 text-xavier-blue/60 hover:text-star-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* File Upload Area */}
                <div className="space-y-4 text-center">
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className={`aspect-video w-full rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 overflow-hidden ${imageUrl ? 'border-aether-gold bg-black/40' : 'border-white/10 bg-white/5'}`}>
                      {imageUrl ? (
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-aether-gold/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="text-aether-gold w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                             <p className="text-star-white font-bold">Select File</p>
                             <p className="text-[10px] text-xavier-blue/40 uppercase tracking-widest">JPG, PNG or GIF (Small size)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-xavier-blue uppercase tracking-[0.2em] px-2">Image Title</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Pembayaran Booth #21"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-star-white focus:outline-none focus:border-aether-gold/50 transition-all font-medium"
                    required
                  />
                </div>

                <button 
                  disabled={isUploading || !imageUrl || !title}
                  className="w-full bg-star-white text-celestial-dark font-black py-5 rounded-2xl text-lg hover:bg-aether-gold transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isUploading ? 'Preserving...' : 'Add to Collection'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox / View Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedInvoice(null)}
               className="absolute inset-0 bg-black/95 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="relative w-full max-w-5xl aspect-auto max-h-screen p-4 flex flex-col gap-4 overflow-hidden"
             >
                <div className="relative flex-1 rounded-2xl overflow-hidden bg-black/40">
                   <img 
                     src={selectedInvoice.imageUrl} 
                     alt={selectedInvoice.title}
                     className="w-full h-full object-contain"
                   />
                </div>
                <div className="flex items-center justify-between text-star-white px-2">
                   <div>
                      <h3 className="text-xl font-bold">{selectedInvoice.title}</h3>
                      <p className="text-sm text-xavier-blue/60">
                        Saved on {selectedInvoice.createdAt?.toDate ? format(selectedInvoice.createdAt.toDate(), 'dd MMMM yyyy HH:mm') : 'Recently'}
                      </p>
                   </div>
                   <button 
                     onClick={() => setSelectedInvoice(null)}
                     className="p-4 bg-white/10 rounded-full hover:bg-white/20 transition-all"
                   >
                     <X className="w-8 h-8" />
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
