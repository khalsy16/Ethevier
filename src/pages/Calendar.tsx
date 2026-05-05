import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isWeekend, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calculator as CalcIcon, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  setDoc, 
  deleteDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

// Simplified Indonesia Holidays 2026/2027 (Approximate/Common)
const holidays: Record<string, string> = {
  '2026-01-01': 'Tahun Baru Masehi',
  '2026-02-17': 'Isra Mi\'raj',
  '2026-03-31': 'Idul Fitri',
  '2026-04-01': 'Idul Fitri',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-08-17': 'Hari Kemerdekaan RI',
  '2026-12-25': 'Hari Raya Natal',
};

export default function CalendarPage() {
  const [user] = useAuthState(auth);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyProjection, setDailyProjection] = useState('');
  const [monthlyProjection, setMonthlyProjection] = useState(0);

  // Data
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [impulseChecks, setImpulseChecks] = useState<any[]>([]);
  const [offDays, setOffDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribeWishlist = onSnapshot(collection(db, 'users', user.uid, 'wishlist'), (snapshot) => {
      setWishlist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeImpulse = onSnapshot(collection(db, 'users', user.uid, 'impulseChecks'), (snapshot) => {
      setImpulseChecks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeOffDays = onSnapshot(collection(db, 'users', user.uid, 'offDays'), (snapshot) => {
      setOffDays(snapshot.docs.map(doc => doc.id)); // doc ID is the date string YYYY-MM-DD
    });

    setLoading(false);
    return () => {
      unsubscribeWishlist();
      unsubscribeImpulse();
      unsubscribeOffDays();
    };
  }, [user]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const toggleOffDay = async (dateStr: string) => {
    if (!user) return;
    if (offDays.includes(dateStr)) {
      await deleteDoc(doc(db, 'users', user.uid, 'offDays', dateStr));
    } else {
      await setDoc(doc(db, 'users', user.uid, 'offDays', dateStr), {
        date: dateStr,
        userId: user.uid
      });
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  useEffect(() => {
    const amount = parseFloat(dailyProjection) || 0;
    const activeDays = daysInMonth.filter(day => {
       const dateStr = format(day, 'yyyy-MM-dd');
       return !isWeekend(day) && !holidays[dateStr] && !offDays.includes(dateStr);
    }).length;
    
    setMonthlyProjection(activeDays * amount);
  }, [dailyProjection, currentDate, offDays]);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) return <div className="p-8 text-xavier-blue">Synchronizing orbits...</div>;

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-star-white mb-2">Calendar</h2>
            <p className="text-sm sm:text-base text-xavier-blue/70">The perfect time to save and plan for the future.</p>
          </div>
          <div className="flex flex-wrap gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-400" />
                <span className="text-[8px] sm:text-[10px] text-xavier-blue uppercase font-bold tracking-widest">Holidays</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-aether-gold" />
                <span className="text-[8px] sm:text-[10px] text-xavier-blue uppercase font-bold tracking-widest">Deadlines</span>
             </div>
          </div>
        </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Calendar View */}
        <div className="xl:col-span-2 bg-celestial-depth/50 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden">
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <h3 className="text-xl sm:text-2xl font-bold text-star-white capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: undefined })}
              </h3>
              <div className="flex gap-2">
                 <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-xl text-xavier-blue transition-colors"><ChevronLeft /></button>
                 <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-xl text-xavier-blue transition-colors"><ChevronRight /></button>
              </div>
           </div>

           <div className="grid grid-cols-7 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                 <div key={day} className="bg-celestial-depth py-4 text-center text-[10px] font-bold text-xavier-blue uppercase tracking-widest">{day}</div>
              ))}
              
              {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                 <div key={`pad-${i}`} className="bg-celestial-depth/30 h-28" />
              ))}

              {daysInMonth.map(day => {
                 const dateStr = format(day, 'yyyy-MM-dd');
                 const holidayName = holidays[dateStr];
                 const isOff = offDays.includes(dateStr);
                 const isWknd = isWeekend(day);

                 // DEADLINES
                 const wishlistDeadlines = wishlist.filter(w => w.deadline && format(w.deadline.toDate(), 'yyyy-MM-dd') === dateStr);
                 const impulseDeadlines = impulseChecks.filter(i => {
                    if (i.status !== 'considering') return false;
                    const createdAt = i.createdAt?.toDate ? i.createdAt.toDate() : new Date();
                    const deadline = addDays(createdAt, i.waitDays || 0);
                    return format(deadline, 'yyyy-MM-dd') === dateStr;
                 });

                 return (
                    <div 
                      key={dateStr} 
                      onClick={() => toggleOffDay(dateStr)}
                      className={`bg-celestial-depth h-28 p-2 border-t border-white/5 relative group transition-all hover:bg-white/5 cursor-pointer ${!isSameMonth(day, currentDate) ? 'opacity-25' : ''} ${isOff ? 'bg-red-500/5' : ''}`}
                    >
                       <div className="flex justify-between items-start">
                          <span className={`text-sm font-semibold rounded-full w-6 h-6 flex items-center justify-center transition-colors ${
                            isToday(day) ? 'text-celestial-dark bg-aether-gold' : 
                            (isWknd || holidayName || isOff ? 'text-red-400' : 'text-star-white/60')
                          }`}>
                            {format(day, 'd')}
                          </span>
                       </div>

                       <div className="mt-2 space-y-1">
                          {holidayName && (
                            <p className="text-[7px] text-red-300 font-bold leading-tight uppercase bg-red-500/10 p-1 rounded truncate">
                               {holidayName}
                            </p>
                          )}
                          {isOff && !holidayName && (
                             <p className="text-[7px] text-red-300 font-bold leading-tight uppercase bg-red-500/10 p-1 rounded truncate">
                                 Special Holiday
                             </p>
                          )}
                          {wishlistDeadlines.map((w, idx) => (
                             <p key={`w-${idx}`} className="text-[7px] text-aether-gold font-bold leading-tight uppercase bg-aether-gold/10 p-1 rounded truncate">
                                 Wish: {w.name}
                             </p>
                          ))}
                          {impulseDeadlines.map((i, idx) => (
                             <p key={`i-${idx}`} className="text-[7px] text-ethereal-purple font-bold leading-tight uppercase bg-ethereal-purple/10 p-1 rounded truncate">
                                 Impulse: {i.name}
                             </p>
                          ))}
                       </div>
                       
                       {isToday(day) && (
                          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-aether-gold shadow-[0_0_8px_#f4d06f]" />
                       )}
                    </div>
                 );
              })}
           </div>
        </div>

        {/* Projections Panel */}
        <div className="space-y-6">
           <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-aether-gold/10 border border-aether-gold/20 p-8 rounded-[2.5rem]"
           >
              <div className="flex items-center gap-3 mb-6">
                 <CalcIcon className="text-aether-gold" />
                 <h3 className="text-lg font-bold text-aether-gold">Income Projection</h3>
              </div>
              
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-xavier-blue uppercase tracking-widest">Daily Prediction (IDR)</label>
                    <input 
                      type="number"
                      value={dailyProjection}
                      onChange={e => setDailyProjection(e.target.value)}
                      placeholder="Contoh: 100000"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-star-white focus:outline-none focus:border-aether-gold/50"
                    />
                 </div>

                 <div className="pt-6 border-t border-white/10">
                    <p className="text-xs text-xavier-blue/60 mb-2 uppercase tracking-widest font-bold">Estimated Total This Month</p>
                    <p className="text-3xl font-black text-aether-gold">{formatIDR(monthlyProjection)}</p>
                    <p className="text-[10px] text-xavier-blue/40 mt-2 italic">*Only counts active days (Excludes weekends, National Holidays, and your chosen Special Holidays).</p>
                 </div>
              </div>
           </motion.div>

           <div className="bg-celestial-depth p-8 rounded-[2.5rem] border border-white/5">
              <h4 className="font-bold text-star-white mb-2 uppercase text-xs tracking-widest">Manage Your Holidays</h4>
              <p className="text-[10px] text-xavier-blue/60 mb-4 italic">Click on a date in the calendar to mark days when you don't receive income.</p>
              
              <div className="p-4 bg-white/5 rounded-2xl flex items-start gap-3">
                 <Plus className="w-4 h-4 text-aether-gold mt-1 shrink-0" />
                 <p className="text-[11px] text-xavier-blue/80 leading-relaxed">
                    Chosen holidays will affect your monthly saving projection calculation in real-time.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
