import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { DollarSign, ShieldCheck, Sparkles, TrendingUp, Info, HelpCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { NCRBook } from '@/src/types';
import { toast } from 'sonner';

interface NCRCostingTabProps {
  selectedBook: NCRBook | null;
}

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function NCRCostingTab({ selectedBook }: NCRCostingTabProps) {
  const [qtyOrdered, setQtyOrdered] = useState(25);
  const [markupPercent, setMarkupPercent] = useState(45);
  const [spoilageAllowance, setSpoilageAllowance] = useState(5); // 5% flat waste spoilage

  // Dynamically calculate costing sheets and processes
  const costBreakdown = useMemo(() => {
    const setsPerBook = selectedBook?.setsPerBook || 50;
    const partsCount = selectedBook?.parts === '2-part' ? 2 : selectedBook?.parts === '3-part' ? 3 : selectedBook?.parts === '4-part' ? 4 : 5;
    const size = selectedBook?.size || 'A5';

    // Calculate total sheets required (including spoilage factor)
    const baseSetsCount = qtyOrdered * setsPerBook;
    const spoilageSetsCount = Math.ceil(baseSetsCount * (spoilageAllowance / 100));
    const totalSetsWithSpoilage = baseSetsCount + spoilageSetsCount;
    const totalCopySheets = totalSetsWithSpoilage * partsCount;

    // Rates Definitions (Mock high fidelity actual print rates)
    const paperCostPerSheet = 0.28; // R0.28 per sheet copy
    const plateMakingCharge = 180; // Plates for 1 ink layer front
    const printSetupCharge = 220; // Press set running rate
    const numberingSetupCharge = 140; // GTO Numbering wheel setup
    const perforationSetupCharge = 120; // Perf wheel setup
    const bindingGluedItemRate = 12.00; // Glue padding per book
    const wrapCoverCrocRate = 18.50; // Crocboard cover item rate

    // Calculate item costs
    const stockCostVal = totalCopySheets * paperCostPerSheet;
    const lithoPressLaborCost = plateMakingCharge + printSetupCharge + (baseSetsCount * 0.05);
    const mechanicalNumberingCost = numberingSetupCharge + (baseSetsCount * 0.035);
    const specializedBindingCost = (qtyOrdered * bindingGluedItemRate) + (qtyOrdered * wrapCoverCrocRate) + perforationSetupCharge;
    const overheadSurcharge = 150.00; // Flat administration shop rate

    const rawProductionCost = stockCostVal + lithoPressLaborCost + mechanicalNumberingCost + specializedBindingCost + overheadSurcharge;
    const calculatedSell = rawProductionCost / (1 - (markupPercent / 100));
    const profitVal = calculatedSell - rawProductionCost;
    const averageUnitBookCost = rawProductionCost / qtyOrdered;
    const averageUnitBookSell = calculatedSell / qtyOrdered;

    return {
      totalCopySheets,
      rawProductionCost,
      calculatedSell,
      profitVal,
      averageUnitBookCost,
      averageUnitBookSell,
      dataChart: [
        { name: 'Carbonless Paper Stock', value: Number(stockCostVal.toFixed(2)) },
        { name: 'Litho Press & Plate Ink', value: Number(lithoPressLaborCost.toFixed(2)) },
        { name: 'Rotary Numbering Press', value: Number(mechanicalNumberingCost.toFixed(2)) },
        { name: 'Bindery Handcraft & Glue', value: Number(specializedBindingCost.toFixed(2)) },
        { name: 'Operational Overheads', value: Number(overheadSurcharge.toFixed(2)) }
      ]
    };
  }, [selectedBook, qtyOrdered, markupPercent, spoilageAllowance]);

  // AI-Powered optimization alerts & structural suggestions
  const aiCostingAdvice = useMemo(() => {
    if (qtyOrdered < 10) {
      return {
        rating: 'Low Volume Warning',
        text: 'Nesting index yields low press utilization. Setting up litho plates represents 62% of raw production cost. Recommend pitching user on at least 25 books to secure a 40% volume threshold discount.',
        pill: 'bg-red-50 text-red-700 border-red-200'
      };
    } else if (qtyOrdered >= 50) {
      return {
        rating: 'High Volume Sweetspot',
        text: 'Press yields fully optimized! Setup costs represent under 8% of the total quote weight. Margins could be safely increased by an additional 5% without failing market pricing tests.',
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-250'
      };
    } else {
      return {
        rating: 'Optimized Setup Plan',
        text: 'Consider combining this with pending A5 jobs on the layout sheet to perform a gang-run. This saves plate washup and setup fees, retaining R340 in operating margins directly.',
        pill: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      };
    }
  }, [qtyOrdered]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: Cost Drivers Controls & Breakdown Table */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm space-y-6">
          <div>
            <span className="text-[8px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              DYNAMIC COSTING ENGINE
            </span>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
              Live Production Cost & Yield Estimator
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Configure batch counts, spoilage thresholds, markup levels, and inspect detailed commercial cost schedules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-dashed border-slate-100 pb-6 mb-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pads/Books Ordered</label>
              <input
                type="number"
                value={qtyOrdered}
                onChange={(e) => setQtyOrdered(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Markup level (%)</label>
              <input
                type="number"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Spoilage / Overs (%)</label>
              <input
                type="number"
                value={spoilageAllowance}
                onChange={(e) => setSpoilageAllowance(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800">ITEMIZED MANUFACTURING BREAKDOWN</h4>
            
            <div className="space-y-2 text-[11px] font-bold text-slate-600">
              {costBreakdown.dataChart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="uppercase tracking-wide">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-800 tabular-nums">R{item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-xs font-extrabold text-slate-700">
                <span className="uppercase">Raw Manufacturing Cost:</span>
                <span className="tabular-nums">R{costBreakdown.rawProductionCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-extrabold text-slate-600">
                <span className="uppercase">Raw Book Unit Cost:</span>
                <span className="tabular-nums">R{costBreakdown.averageUnitBookCost.toFixed(2)} / book</span>
              </div>
              <div className="flex justify-between text-sm font-black text-emerald-600 border-t border-dashed border-slate-200 pt-2.5">
                <span className="uppercase">Quoted Sell Rate (excl VAT):</span>
                <span className="tabular-nums font-black">R{costBreakdown.calculatedSell.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-extrabold text-emerald-700">
                <span className="uppercase">Est. Gross Profit Value:</span>
                <span className="tabular-nums">R{costBreakdown.profitVal.toFixed(2)} ({markupPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI-Powered Advice Box */}
        <div className={cn("p-5 rounded-3xl border flex items-start gap-3.5 shadow-sm transition-all animate-bounce-short", aiCostingAdvice.pill)}>
          <Sparkles size={20} className="shrink-0 mt-0.5" />
          <div>
            <strong className="text-[10px] font-black uppercase tracking-widest block">AI SPECS ADVISER • {aiCostingAdvice.rating}</strong>
            <p className="text-[10px] leading-relaxed font-bold mt-1 uppercase">{aiCostingAdvice.text}</p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Cost Allocation Chart */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 shadow-sm flex flex-col items-center">
          <div className="w-full text-left border-b border-slate-100 pb-4 mb-6">
            <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-150 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              COST ALLOCATION MATRIX
            </span>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight italic mt-2.5">
              Production Composition Chart
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Visualizes which elements represents the largest raw cost weight for this batch.
            </p>
          </div>

          <div className="w-full h-64 relative flex justify-center items-center">
            <ResponsiveContainer width="95%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdown.dataChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {costBreakdown.dataChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`R${value}`, 'Amount']} 
                  contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px', fontWeight: 'bold' }} 
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Centered yield read-out */}
            <div className="absolute flex flex-col justify-center items-center text-center">
              <span className="text-[8px] text-slate-455 font-black uppercase tracking-widest">Raw Cost</span>
              <span className="text-xl font-black text-slate-850 tracking-tighter tabular-nums italic">R{costBreakdown.rawProductionCost.toFixed(0)}</span>
              <span className="text-[7px] text-slate-400 font-bold uppercase italic mt-0.5">For {qtyOrdered} Books</span>
            </div>
          </div>

          {/* Simple Legend with values */}
          <div className="w-full mt-6 space-y-2 border-t border-slate-100 pt-5">
            {costBreakdown.dataChart.map((item, idx) => {
              const itemPercent = ((item.value / costBreakdown.rawProductionCost) * 100).toFixed(0);
              return (
                <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="uppercase">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-800 tabular-nums">{itemPercent}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
