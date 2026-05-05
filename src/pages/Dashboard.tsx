import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  TrendingUp, 
  Wallet, 
  CreditCard,
  ArrowUpRight,
  Target,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, startOfWeek, startOfMonth, startOfYear, isAfter, differenceInDays } from 'date-fns';

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

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [impulseChecks, setImpulseChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    const incomesPath = `users/${user.uid}/incomes`;
    const iq = query(
      collection(db, incomesPath),
      orderBy('date', 'desc')
    );
    const unsubscribeIncomes = onSnapshot(iq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, type: 'income', ...doc.data() }));
      setIncomes(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, incomesPath);
    });

    const expensesPath = `users/${user.uid}/expenses`;
    const eq = query(
      collection(db, expensesPath),
      orderBy('date', 'desc')
    );
    const unsubscribeExpenses = onSnapshot(eq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, type: 'expense', ...doc.data() }));
      setExpenses(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, expensesPath);
    });

    const wishlistPath = `users/${user.uid}/wishlist`;
    const wq = query(collection(db, wishlistPath));
    const unsubscribeWishlist = onSnapshot(wq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWishlist(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, wishlistPath);
    });

    const impulsePath = `users/${user.uid}/impulseChecks`;
    const icq = query(collection(db, impulsePath), where('status', '==', 'considering'));
    const unsubscribeImpulse = onSnapshot(icq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setImpulseChecks(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, impulsePath);
    });

    return () => {
      unsubscribeIncomes();
      unsubscribeExpenses();
      unsubscribeWishlist();
      unsubscribeImpulse();
    };
  }, [user]);

  const stats = (() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const calcTotal = (list: any[], start: Date) => 
      list.filter(i => {
        const date = (i.date as Timestamp)?.toDate ? (i.date as Timestamp).toDate() : new Date();
        return isAfter(date, start);
      }).reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const totalIncome = incomes.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalExpense = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return {
      weekly: calcTotal(incomes, weekStart) - calcTotal(expenses, weekStart),
      monthly: calcTotal(incomes, monthStart) - calcTotal(expenses, monthStart),
      yearly: calcTotal(incomes, yearStart) - calcTotal(expenses, yearStart),
      total: totalIncome - totalExpense,
      totalIncome,
      totalExpense
    };
  })();

  const allActivity = [...incomes, ...expenses].sort((a, b) => {
    const dateA = (a.date as Timestamp)?.toMillis() || Date.now();
    const dateB = (b.date as Timestamp)?.toMillis() || Date.now();
    return dateB - dateA;
  });

  const finishedChecks = impulseChecks.filter(check => {
    const createdAt = check.createdAt?.toDate ? check.createdAt.toDate() : new Date();
    const daysPassed = differenceInDays(new Date(), createdAt);
    return daysPassed >= (check.waitDays || 0);
  });

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const nextWishlist = wishlist
    .filter(item => item.status === 'pending')
    .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)[0];

  if (loading) return <div className="p-8 text-xavier-blue animate-pulse">Scanning the starry sky...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-star-white mb-2">Hello, {user?.displayName}!</h2>
          <p className="text-xavier-blue/70 text-sm sm:text-base">Your celestial financial orbit today.</p>
        </div>
        {finishedChecks.length > 0 && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full sm:w-auto bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-3xl flex items-center gap-4 animate-pulse cursor-pointer"
            onClick={() => window.location.href = '/app/impulse'}
          >
            <ShieldAlert className="text-red-400 w-6 h-6" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Impulse Alert</p>
              <p className="text-sm font-semibold text-star-white">{finishedChecks.length} items need review</p>
            </div>
            <ArrowRight className="text-red-400 w-4 h-4 ml-2" />
          </motion.div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Weekly Balance', value: stats.weekly, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Monthly Balance', value: stats.monthly, icon: Wallet, color: 'text-aether-gold' },
          { label: 'Total Expenses', value: stats.totalExpense, icon: ShieldAlert, color: 'text-red-400' },
          { label: 'Total Galaxy Savings', value: stats.total, icon: ArrowUpRight, color: 'text-star-white' }
        ].map((item, id) => (
          <motion.div 
            key={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: id * 0.1 }}
            className="bg-celestial-depth border border-white/5 p-6 rounded-3xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -bottom-4 opacity-[0.03]">
              <item.icon className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-2 rounded-xl bg-white/5 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-xavier-blue tracking-wider uppercase">{item.label}</span>
            </div>
            <p className="text-2xl font-bold text-star-white">{formatIDR(item.value)}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-celestial-depth/50 border border-white/10 rounded-[2.5rem] p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-star-white">Recent Galaxy Activity</h3>
            <button onClick={() => window.location.href = '/app/history'} className="text-sm text-aether-gold font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {allActivity.slice(0, 5).map((activity, idx) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.type === 'income' ? 'bg-aether-gold/20' : 'bg-red-500/20'}`}>
                  {activity.type === 'income' ? (
                    <ArrowUpRight className="w-5 h-5 text-aether-gold" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-red-500 rotate-90" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-star-white">{activity.source || (activity.type === 'income' ? 'Daily Savings' : 'Expense')}</p>
                  <p className="text-xs text-xavier-blue/60">{format((activity.date as Timestamp).toDate(), 'PPP p')}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${activity.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {activity.type === 'income' ? '+' : '-'}{formatIDR(activity.amount)}
                  </p>
                </div>
              </div>
            ))}
            {allActivity.length === 0 && <p className="text-center py-8 text-xavier-blue/40 italic">No transactions recorded yet.</p>}
          </div>
        </div>

        {/* Wishlist Highlight */}
        <div className="bg-aether-gold/10 border border-aether-gold/20 rounded-[2.5rem] p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <Target className="text-aether-gold" />
             <h3 className="text-xl font-bold text-aether-gold">Current Mission</h3>
          </div>
          
          {nextWishlist ? (
            <div className="flex-1 flex flex-col">
              <p className="text-sm text-xavier-blue/60 mb-2">Saving for:</p>
              <h4 className="text-2xl font-bold text-star-white mb-1">{nextWishlist.name}</h4>
              <p className="text-xl font-bold text-aether-gold mb-8">{formatIDR(nextWishlist.price)}</p>
              
              <div className="mt-auto space-y-4">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.total / nextWishlist.price) * 100, 100)}%` }}
                    className="h-full bg-aether-gold"
                  ></motion.div>
                </div>
                <div className="flex justify-between text-xs font-semibold text-xavier-blue">
                  <span>Progress</span>
                  <span>{Math.round((stats.total / nextWishlist.price) * 100)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-xavier-blue/50 italic mb-4">You have no active mission.</p>
              <button 
                onClick={() => window.location.href = '/app/wishlist'}
                className="px-6 py-3 bg-aether-gold/20 border border-aether-gold/40 text-aether-gold rounded-2xl hover:bg-aether-gold/30 transition-all font-bold text-sm"
              >
                Add Wish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wishlist Notes Section */}
      <div className="bg-celestial-depth/30 border border-white/5 rounded-[2.5rem] p-8">
        <h3 className="text-xl font-bold text-star-white mb-6">Dream Notes & Deadlines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.filter(item => item.notes || item.deadline).map((item, idx) => (
             <motion.div 
               key={item.id}
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: idx * 0.1 }}
               className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3"
             >
               <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-aether-gold uppercase tracking-widest">{item.name}</span>
                  {item.deadline && (
                    <span className="text-[10px] text-red-400 font-bold bg-red-400/10 px-2 py-1 rounded">
                      Deadline: {format(item.deadline.toDate(), 'dd MMM')}
                    </span>
                  )}
               </div>
               {item.notes && (
                 <p className="text-xs text-xavier-blue/70 italic leading-relaxed">
                   "{item.notes}"
                 </p>
               )}
             </motion.div>
          ))}
          {wishlist.filter(item => item.notes || item.deadline).length === 0 && (
            <p className="col-span-full text-center py-10 text-xavier-blue/30 italic">No notes or deadlines for your dreams yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
