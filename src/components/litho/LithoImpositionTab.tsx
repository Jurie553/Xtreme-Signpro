import React, { useState, useEffect } from 'react';
import { RefreshCw, LayoutGrid, Scale, HelpCircle, Percent, Settings, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

// Standard press sheet stock options
const PRESS_STOCKS = [
  { name: 'SRA3 (320 x 450 mm)', width: 450, height: 320, costPerThousand: 2200 },
  { name: 'A2 Press Sheet (430 x 610 mm)', width: 610, height: 430, costPerThousand: 4800 },
  { name: 'A1 Enterprise Stock (610 x 860 mm)', width: 860, height: 610, costPerThousand: 9500 },
  { name: 'B2 Premium Sheet (500 x 700 mm)', width: 700, height: 500, costPerThousand: 6500 }
];

export default function LithoImpositionTab() {
  const [targetQuantity, setTargetQuantity] = useState(1000);
  const [flatWidth, setFlatWidth] = useState(148); // A5 width
  const [flatHeight, setFlatHeight] = useState(210); // A5 height
  const [bleed, setBleed] = useState(3);
  const [pressStock, setPressStock] = useState(PRESS_STOCKS[0]); // SRA3
  const [includeGripMargins, setIncludeGripMargins] = useState(true);
  const [grainDirection, setGrainDirection] = useState<'Long' | 'Short'>('Long');
  const [optimizeRotation, setOptimizeRotation] = useState(true);

  // Cost Factor Drivers
  const [plateCostPerUnit, setPlateCostPerUnit] = useState(250); // R250 per plate set (CMYK = 4 plates)
  const [inkCostPerSheet, setInkCostPerSheet] = useState(0.12); // R0.12 per sheet pass
  const [setupBaseCost, setSetupBaseCost] = useState(350); // Setup/Make-ready
  const [laborHourlyRate, setLaborHourlyRate] = useState(180); // R180/hr
  const [targetMargin, setTargetMargin] = useState(40); // 40% margin

  // Calculated Results State
  const [bestLayout, setBestLayout] = useState({
    rows: 1,
    cols: 1,
    ups: 1,
    orientation: 'Portrait',
    usedWidth: 0,
    usedHeight: 0,
    efficiency: 0,
    wastePercent: 0
  });

  const gripMarginWidth = includeGripMargins ? 15 : 0; // Grip margin + color bar trim (left/right and top/bottom)
  const productWidthWithBleed = flatWidth + (bleed * 2);
  const productHeightWithBleed = flatHeight + (bleed * 2);

  // Imposition Math Engine
  useEffect(() => {
    const sheetW = pressStock.width - (gripMarginWidth * 2);
    const sheetH = pressStock.height - (gripMarginWidth * 2);

    if (sheetW <= 0 || sheetH <= 0 || productWidthWithBleed <= 0 || productHeightWithBleed <= 0) return;

    // Option A: Portrait (no-rotation) placement
    const rowsNoRot = Math.floor(sheetH / productHeightWithBleed);
    const colsNoRot = Math.floor(sheetW / productWidthWithBleed);
    const upsNoRot = Math.max(0, rowsNoRot * colsNoRot);

    // Option B: Landscape placement (rotated 90deg)
    const rowsRot = Math.floor(sheetH / productWidthWithBleed);
    const colsRot = Math.floor(sheetW / productHeightWithBleed);
    const upsRot = Math.max(0, rowsRot * colsRot);

    let rowsChosen = rowsNoRot;
    let colsChosen = colsNoRot;
    let upsChosen = upsNoRot;
    let orientation = 'Standard';
    let pWidth = productWidthWithBleed;
    let pHeight = productHeightWithBleed;

    if (optimizeRotation && upsRot > upsNoRot) {
      rowsChosen = rowsRot;
      colsChosen = colsRot;
      upsChosen = upsRot;
      orientation = 'Rotated 90°';
      pWidth = productHeightWithBleed;
      pHeight = productWidthWithBleed;
    }

    if (upsChosen === 0) {
      upsChosen = 1; // Fallback display safety
    }

    const usedW = colsChosen * pWidth;
    const usedH = rowsChosen * pHeight;
    const sheetArea = pressStock.width * pressStock.height;
    const itemsArea = upsChosen * (flatWidth * flatHeight);
    const efficiency = Math.min(100, Math.round((itemsArea / sheetArea) * 100));
    const wastePercent = 100 - efficiency;

    setBestLayout({
      rows: Math.max(1, rowsChosen),
      cols: Math.max(1, colsChosen),
      ups: upsChosen,
      orientation,
      usedWidth: usedW,
      usedHeight: usedH,
      efficiency,
      wastePercent: Math.max(0, Math.min(100, wastePercent))
    });
  }, [flatWidth, flatHeight, bleed, pressStock, includeGripMargins, optimizeRotation]);

  // Dynamic Cost & Selling Estimation Engine
  const totalPressSheets = Math.ceil(targetQuantity / bestLayout.ups);
  const spoilageAllowance = Math.max(50, Math.ceil(totalPressSheets * 0.08)); // 8% setup/spoilage sheets
  const finalSheetsCount = totalPressSheets + spoilageAllowance;

  const paperStockCost = (finalSheetsCount / 1000) * pressStock.costPerThousand;
  const plateCost = plateCostPerUnit; // assumed single set for standard run
  const makeReadyInkCost = finalSheetsCount * inkCostPerSheet;
  const setupOverheadCost = setupBaseCost;
  
  const estimatedHours = Math.max(0.5, (finalSheetsCount / 4000) + 0.5); // Litho speed setup run estimates
  const laborCostTotal = estimatedHours * laborHourlyRate;
  
  const productionCostTotal = paperStockCost + plateCost + makeReadyInkCost + setupOverheadCost + laborCostTotal;
  const marginAmt = productionCostTotal * (targetMargin / 100);
  const totalSellPrice = productionCostTotal + marginAmt;
  const unitPriceSell = totalSellPrice / targetQuantity;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      {/* Parameter inputs control panel */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="card-minimal p-6 border-slate-100 flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <span className="p-1 px-1.5 bg-brand-accent/5 text-brand-accent rounded text-[10px]"><LayoutGrid size={13} /></span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Optimization Controls</span>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1">Target Ordered Quantity</label>
            <input 
              type="number" 
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(Math.max(10, parseInt(e.target.value) || 100))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1">Flat Width (mm)</label>
              <input 
                type="number" 
                value={flatWidth}
                onChange={(e) => setFlatWidth(Math.max(5, parseInt(e.target.value) || 5))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1">Flat Height (mm)</label>
              <input 
                type="number" 
                value={flatHeight}
                onChange={(e) => setFlatHeight(Math.max(5, parseInt(e.target.value) || 5))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1">Bleed Side (mm)</label>
              <input 
                type="number" 
                value={bleed}
                onChange={(e) => setBleed(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1">Grain Path</label>
              <select 
                value={grainDirection} 
                onChange={(e) => setGrainDirection(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="Long">Grain Long</option>
                <option value="Short">Grain Short</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1">Press Sheet Stock</label>
            <select 
              value={pressStock.name}
              onChange={(e) => {
                const selected = PRESS_STOCKS.find(s => s.name === e.target.value);
                if (selected) setPressStock(selected);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
            >
              {PRESS_STOCKS.map((st) => (
                <option key={st.name} value={st.name}>{st.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-50">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Efficiency Flags</span>
            
            <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includeGripMargins} 
                onChange={(e) => setIncludeGripMargins(e.target.checked)} 
                className="rounded text-brand-accent focus:ring-brand-accent/20"
              />
              Include Press Grip Margins (15mm)
            </label>

            <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={optimizeRotation} 
                onChange={(e) => setOptimizeRotation(e.target.checked)} 
                className="rounded text-brand-accent focus:ring-brand-accent/20"
              />
              Rotate items (Best-Fit Analysis)
            </label>
          </div>
        </div>

        {/* Cost Matrix Factors Override config */}
        <div className="card-minimal p-6 border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <Settings size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Cost Drivers</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <span className="text-slate-400 block mb-0.5">CMYK Plate Set R</span>
              <input 
                type="number" 
                value={plateCostPerUnit} 
                onChange={(e) => setPlateCostPerUnit(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold"
              />
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Ink/Sheet (R)</span>
              <input 
                type="number" 
                step="0.01"
                value={inkCostPerSheet} 
                onChange={(e) => setInkCostPerSheet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold"
              />
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">MakeReady Set R</span>
              <input 
                type="number" 
                value={setupBaseCost} 
                onChange={(e) => setSetupBaseCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold"
              />
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Target Profit %</span>
              <input 
                type="number" 
                value={targetMargin} 
                onChange={(e) => setTargetMargin(Math.max(1, parseInt(e.target.value) || 20))}
                className="w-full px-2.5 py-1.5 bg-slate-55 border-brand-accent/20 rounded-lg text-xs font-bold text-brand-accent text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Imposition Diagram Grid and Metrics details */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="card-minimal p-6 border-slate-100 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dynamic Layout Imposition Preview</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Fit: {bestLayout.ups} Up on {pressStock.name.split(' (')[0]} ({bestLayout.cols} cols x {bestLayout.rows} rows)
              </p>
            </div>
            <div className="flex gap-2">
              <span className="p-1 px-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[9px] font-bold uppercase tracking-wide flex items-center gap-1">
                Efficiency: {bestLayout.efficiency}%
              </span>
              <span className="p-1 px-2.5 bg-slate-50 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-wide">
                Orientation: {bestLayout.orientation}
              </span>
            </div>
          </div>

          {/* High Fidelity SVG layout optimizer visual render */}
          <div className="flex-1 min-h-[280px] bg-slate-50 rounded-2xl border border-slate-100 p-8 flex items-center justify-center relative overflow-hidden select-none">
            <div className="absolute inset-0 grid-structure opacity-[0.01] pointer-events-none" />
            <div className="absolute top-3 left-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Paper Outer stock boundaries ({pressStock.width}x{pressStock.height} mm)
            </div>

            <svg 
              viewBox={`0 0 ${pressStock.width} ${pressStock.height}`} 
              className="w-full max-h-[220px] transition-all duration-300"
            >
              {/* Outer Stock Border */}
              <rect 
                x="0" 
                y="0" 
                width={pressStock.width} 
                height={pressStock.height} 
                fill="#f1f5f9" 
                stroke="#cbd5e1" 
                strokeWidth="2" 
                rx="4"
              />

              {/* Grip Margin Lines */}
              {includeGripMargins && (
                <rect 
                  x={gripMarginWidth} 
                  y={gripMarginWidth} 
                  width={pressStock.width - (gripMarginWidth * 2)} 
                  height={pressStock.height - (gripMarginWidth * 2)} 
                  fill="transparent" 
                  stroke="#94a3b8" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                />
              )}

              {/* Imposed flat sheets rendering matrix */}
              {Array.from({ length: bestLayout.rows }).map((_, rIdx) => 
                Array.from({ length: bestLayout.cols }).map((_, cIdx) => {
                  const pWidth = bestLayout.orientation.includes('Rotated') ? productHeightWithBleed : productWidthWithBleed;
                  const pHeight = bestLayout.orientation.includes('Rotated') ? productWidthWithBleed : productHeightWithBleed;
                  const itemX = gripMarginWidth + (cIdx * pWidth);
                  const itemY = gripMarginWidth + (rIdx * pHeight);

                  if (itemX + pWidth > pressStock.width || itemY + pHeight > pressStock.height) return null;

                  return (
                    <g key={`${rIdx}-${cIdx}`}>
                      {/* Product Bleed Border */}
                      <rect 
                        x={itemX} 
                        y={itemY} 
                        width={pWidth} 
                        height={pHeight} 
                        fill="#eff6ff" 
                        stroke="#60a5fa" 
                        strokeWidth="1" 
                        strokeDasharray="2 2"
                      />
                      {/* Finished Product cut line (Solid Trim) */}
                      <rect 
                        x={itemX + bleed} 
                        y={itemY + bleed} 
                        width={pWidth - (bleed * 2)} 
                        height={pHeight - (bleed * 2)} 
                        fill="#e0f2fe" 
                        stroke="#3b82f6" 
                        strokeWidth="1.2" 
                        rx="1"
                      />
                      <text 
                        x={itemX + pWidth / 2} 
                        y={itemY + pHeight / 2} 
                        alignmentBaseline="middle" 
                        textAnchor="middle" 
                        fontSize="11" 
                        fontWeight="bold" 
                        fill="#1d4ed8"
                      >
                        UP {rIdx * bestLayout.cols + cIdx + 1}
                      </text>
                    </g>
                  );
                })
              )}
            </svg>
          </div>

          {/* Quick instructions details */}
          <div className="flex gap-4 items-center mt-4 bg-blue-50/50 p-2.5 rounded-xl border border-blue-50 text-[10px] text-blue-800">
            <span className="p-1 px-1.5 bg-blue-500 text-white rounded font-bold uppercase">Guide</span>
            <span>Blue borders show bleed offsets. Inner boxes mark solid trimmed sizes. Dashed boundary represents grip rules.</span>
          </div>
        </div>

        {/* Live dynamic cost valuation display block */}
        <div className="card-minimal p-6 border-slate-100">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-4">Print cost breakdown matrix</span>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[8px] text-slate-400 uppercase font-bold block mb-1">Production cost</span>
              <span className="text-lg font-bold text-slate-900 leading-none">R {productionCostTotal.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[8px] text-slate-400 uppercase font-bold block mb-1">Markup Profit</span>
              <span className="text-lg font-bold text-emerald-600 leading-none">R {marginAmt.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-brand-accent/5 rounded-xl border border-brand-accent/10">
              <span className="text-[8px] text-brand-accent uppercase font-black block mb-1">RECOMMENDED SELL</span>
              <span className="text-lg font-black text-brand-accent leading-none">R {totalSellPrice.toFixed(0)}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[8px] text-slate-400 uppercase font-bold block mb-1">Unit Selling</span>
              <span className="text-lg font-bold text-slate-800 leading-none">R {unitPriceSell.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[11px] pt-4 border-t border-slate-100">
            <div className="flex justify-between border-b border-slate-50/40 pb-1">
              <span className="text-slate-400">Printed Press Sheets Required:</span>
              <span className="font-bold text-slate-700">{totalPressSheets} + {spoilageAllowance} spoil ({finalSheetsCount} total)</span>
            </div>
            <div className="flex justify-between border-b border-slate-50/40 pb-1">
              <span className="text-slate-400">Total Ink Pass cost (CMYK):</span>
              <span className="font-bold text-slate-700">R {makeReadyInkCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50/40 pb-1">
              <span className="text-slate-400">Make-Ready & Plates overheads:</span>
              <span className="font-bold text-slate-700">R {(plateCost + setupOverheadCost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50/40 pb-1">
              <span className="text-slate-400">Operator Printing labor:</span>
              <span className="font-bold text-slate-700">R {laborCostTotal.toFixed(2)} ({estimatedHours.toFixed(1)} hrs run)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
