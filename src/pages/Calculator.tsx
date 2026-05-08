import { useState } from 'react';
import { Calculator as CalcIcon, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { motion } from 'motion/react';

const exchangeToIdr: Record<string, { rate: number, label: string, symbol: string }> = {
  'USD': { rate: 16250, label: 'US Dollar', symbol: '$' },
  'CNY': { rate: 2240, label: 'Chinese Yuan', symbol: '¥' },
  'SGD': { rate: 11950, label: 'Singapore Dollar', symbol: 'S$' },
  'JPY': { rate: 104, label: 'Japanese Yen', symbol: '¥' },
  'EUR': { rate: 17400, label: 'Euro', symbol: '€' },
  'GBP': { rate: 20500, label: 'British Pound', symbol: '£' },
  'KRW': { rate: 11.8, label: 'South Korean Won', symbol: '₩' },
  'MYR': { rate: 3410, label: 'Malaysian Ringgit', symbol: 'RM' },
  'AUD': { rate: 10600, label: 'Australian Dollar', symbol: 'A$' },
};

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [operator, setOperator] = useState<string | null>(null);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const clear = () => {
    setDisplay('0');
    setOperator(null);
    setPrevValue(null);
    setWaitingForOperand(false);
  };

  const handleOperator = (nextOp: string) => {
    const value = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(value);
    } else if (operator) {
      const result = calculate(prevValue, value, operator);
      setDisplay(String(result));
      setPrevValue(result);
    }

    setWaitingForOperand(true);
    setOperator(nextOp);
  };

  const calculate = (a: number, b: number, op: string) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
      default: return b;
    }
  };

  const handleEqual = () => {
    if (!operator || prevValue === null) return;
    const value = parseFloat(display);
    const result = calculate(prevValue, value, operator);
    setDisplay(String(result));
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const currentAmount = parseFloat(display) || 0;
  const idrResult = currentAmount * exchangeToIdr[selectedCurrency].rate;

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDisplayValue = (val: string) => {
    if (val === '0') return '0';
    if (!val) return '0';
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-star-white mb-2">Ethevier Calculator</h2>
        <p className="text-sm sm:text-base text-xavier-blue/70">Calculate your financial orbit and track world currency conversions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Calculator Body */}
        <div className="bg-celestial-depth/80 border border-white/10 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl backdrop-blur-xl">
           <div className="bg-white/5 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 text-right overflow-hidden border border-white/5">
              <p className="text-[10px] sm:text-xs font-bold text-xavier-blue/40 uppercase tracking-widest mb-1 h-4">
                 {prevValue !== null ? `${formatDisplayValue(String(prevValue))} ${operator || ''}` : ''}
              </p>
              <div className="flex items-end justify-end gap-2">
                 <span className="text-lg sm:text-xl font-bold text-aether-gold/40 mb-1 sm:mb-2">{exchangeToIdr[selectedCurrency].symbol}</span>
                 <p className="text-3xl sm:text-5xl font-black text-star-white truncate">{formatDisplayValue(display)}</p>
              </div>
           </div>

           <div className="grid grid-cols-4 gap-2 sm:gap-4">
              <button onClick={clear} className="bg-red-500/10 text-red-400 p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-red-500/20 transition-all text-sm sm:text-base">C</button>
              <button onClick={() => handleOperator('/')} className="bg-white/5 text-aether-gold p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/10 transition-all text-sm sm:text-base">/</button>
              <button onClick={() => handleOperator('*')} className="bg-white/5 text-aether-gold p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/10 transition-all text-sm sm:text-base">×</button>
              <button onClick={() => handleOperator('-')} className="bg-white/5 text-aether-gold p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/10 transition-all text-sm sm:text-base">-</button>
              
              <button onClick={() => inputDigit('7')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">7</button>
              <button onClick={() => inputDigit('8')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">8</button>
              <button onClick={() => inputDigit('9')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">9</button>
              <button onClick={() => handleOperator('+')} className="bg-white/5 text-aether-gold p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/10 transition-all text-sm sm:text-base">+</button>
              
              <button onClick={() => inputDigit('4')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">4</button>
              <button onClick={() => inputDigit('5')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">5</button>
              <button onClick={() => inputDigit('6')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">6</button>
              <button onClick={() => inputDigit('000')} className="bg-aether-gold/10 text-aether-gold p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-aether-gold/20 transition-all text-sm sm:text-base">000</button>
              
              <div className="col-span-3 grid grid-cols-3 gap-2 sm:gap-4">
                  <button onClick={() => inputDigit('1')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">1</button>
                  <button onClick={() => inputDigit('2')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">2</button>
                  <button onClick={() => inputDigit('3')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">3</button>
                  <button onClick={() => inputDigit('0')} className="col-span-2 bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">0</button>
                  <button onClick={() => inputDigit('.')} className="bg-white/10 text-star-white p-4 sm:p-6 rounded-xl sm:rounded-2xl font-bold hover:bg-white/20 transition-all text-sm sm:text-base">.</button>
              </div>
              <button onClick={handleEqual} className="bg-aether-gold text-celestial-dark p-4 sm:p-6 rounded-xl sm:rounded-2xl font-black text-xl sm:text-2xl hover:scale-[1.02] shadow-[0_0_20px_rgba(244,208,111,0.3)] transition-all">=</button>
           </div>
        </div>

        {/* Currency Conversions */}
        <div className="space-y-6">
           <div className="bg-celestial-depth/50 border border-white/10 p-8 rounded-[3rem]">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-xavier-blue/10 rounded-xl">
                       <ArrowRightLeft className="w-5 h-5 text-xavier-blue" />
                    </div>
                    <h3 className="text-xl font-bold text-star-white">Conversion Shield</h3>
                 </div>
              </div>

              <div className="space-y-8">
                 {/* Selector */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-xavier-blue uppercase tracking-widest px-2">Select Source Currency</label>
                    <div className="grid grid-cols-3 gap-3">
                       {Object.keys(exchangeToIdr).map(code => (
                          <button 
                            key={code}
                            onClick={() => setSelectedCurrency(code)}
                            className={`py-3 rounded-xl font-bold text-xs transition-all border ${
                              selectedCurrency === code 
                                ? 'bg-aether-gold text-celestial-dark border-aether-gold' 
                                : 'bg-white/5 text-xavier-blue border-white/5 hover:bg-white/10'
                            }`}
                          >
                             {code}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-aether-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <p className="text-xs font-bold text-xavier-blue/60 uppercase tracking-widest mb-4">Conversion Result (IDR)</p>
                    <p className="text-4xl font-black text-aether-gold mb-2 transition-transform group-hover:scale-105">
                       {formatIDR(idrResult)}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-xavier-blue/40 italic font-medium">
                       <span>1 {selectedCurrency} = {exchangeToIdr[selectedCurrency].rate} IDR</span>
                       <RefreshCw className="w-3 h-3 animate-spin-slow" />
                    </div>
                 </div>
              </div>
              
              <p className="mt-8 text-[10px] text-xavier-blue/30 text-center italic leading-relaxed px-4">
                 *Simulation exchange rates. Values may vary depending on world financial orbits. Data updated via astral resonance frequency.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
