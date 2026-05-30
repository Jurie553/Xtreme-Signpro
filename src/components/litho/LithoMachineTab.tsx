import React, { useState } from 'react';
import { Settings, Shield, Activity, RefreshCw, BarChart2, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface PressMachine {
  id: string;
  name: string;
  type: 'Litho Press' | 'Digital Press' | 'Post-Press Finishing';
  status: 'Running' | 'Idle' | 'Maintenance' | 'Calibrating';
  utilization: number;
  speedImpressionsPerHour: number;
  queueCount: number;
  operator: string;
  maintenanceDueHours: number;
  totalClickCount: number;
}

const INITIAL_MACHINES: PressMachine[] = [
  {
    id: '1',
    name: 'Heidelberg Speedmaster XL 106',
    type: 'Litho Press',
    status: 'Running',
    utilization: 84,
    speedImpressionsPerHour: 18000,
    queueCount: 4,
    operator: 'Muzi Ndlovu',
    maintenanceDueHours: 42,
    totalClickCount: 12450800
  },
  {
    id: '2',
    name: 'Komori Lithrone G40 Offset',
    type: 'Litho Press',
    status: 'Idle',
    utilization: 62,
    speedImpressionsPerHour: 16500,
    queueCount: 0,
    operator: 'Dave Miller',
    maintenanceDueHours: 120,
    totalClickCount: 8900450
  },
  {
    id: '3',
    name: 'HP Indigo 12000 HD Digital',
    type: 'Digital Press',
    status: 'Running',
    utilization: 91,
    speedImpressionsPerHour: 4600,
    queueCount: 7,
    operator: 'Sarah Williams',
    maintenanceDueHours: 15,
    totalClickCount: 3450200
  },
  {
    id: '4',
    name: 'Polar N 137 PLUS Guillotine',
    type: 'Post-Press Finishing',
    status: 'Running',
    utilization: 45,
    speedImpressionsPerHour: 3200, // cuts per hour
    queueCount: 2,
    operator: 'Brandon Cox',
    maintenanceDueHours: 84,
    totalClickCount: 450120
  },
  {
    id: '5',
    name: 'Stahlfolder KH 82 Folder Unit',
    type: 'Post-Press Finishing',
    status: 'Idle',
    utilization: 28,
    speedImpressionsPerHour: 9000,
    queueCount: 0,
    operator: 'Chloe van Wyk',
    maintenanceDueHours: 210,
    totalClickCount: 890200
  },
  {
    id: '6',
    name: 'Muller Martini Presto II Stitcher',
    type: 'Post-Press Finishing',
    status: 'Maintenance',
    utilization: 0,
    speedImpressionsPerHour: 0,
    queueCount: 0,
    operator: 'None (Tech Team)',
    maintenanceDueHours: 0,
    totalClickCount: 1504900
  }
];

export default function LithoMachineTab() {
  const [machines, setMachines] = useState<PressMachine[]>(INITIAL_MACHINES);

  const handleMaintenanceReset = (id: string) => {
    setMachines(prev => prev.map(m => {
      if (m.id === id) {
        toast.info(`Calibration logs reset. Next major service rescheduled for +250 operational hours on "${m.name}".`);
        return { ...m, maintenanceDueHours: 250, status: m.status === 'Maintenance' ? 'Calibrating' : m.status };
      }
      return m;
    }));
  };

  const handleStatusToggle = (id: string) => {
    setMachines(prev => prev.map(m => {
      if (m.id === id) {
        let nextStatus: PressMachine['status'] = 'Running';
        if (m.status === 'Running') nextStatus = 'Idle';
        else if (m.status === 'Idle') nextStatus = 'Maintenance';
        else if (m.status === 'Maintenance') nextStatus = 'Calibrating';
        else nextStatus = 'Running';

        toast.success(`"${m.name}" state manually flagged: ${nextStatus}`);
        return { 
          ...m, 
          status: nextStatus,
          utilization: nextStatus === 'Running' ? Math.floor(Math.random() * 30) + 65 : (nextStatus === 'Idle' ? 0 : m.utilization)
        };
      }
      return m;
    }));
  };

  const activeFleetCount = machines.filter(m => m.status === 'Running').length;
  const overallAvgUtilization = Math.round(machines.reduce((acc, m) => acc + m.utilization, 0) / machines.length);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Overview Analytics Chips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-minimal p-6 border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Active Fleet Units</span>
            <span className="text-2xl font-black text-slate-800 italic">{activeFleetCount} / {machines.length} RUNNING</span>
          </div>
          <span className="p-3 bg-blue-55 text-blue-600 rounded-2xl border border-blue-100/50">
            <Activity size={20} />
          </span>
        </div>

        <div className="card-minimal p-6 border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Cohesive Capacity Utilization</span>
            <span className="text-2xl font-black text-slate-800 italic">{overallAvgUtilization}% AVG LOAD</span>
          </div>
          <span className="p-3 bg-emerald-55 text-emerald-600 rounded-2xl border border-emerald-100/50">
            <BarChart2 size={20} />
          </span>
        </div>

        <div className="card-minimal p-6 border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Pre-Press Queue backlog</span>
            <span className="text-2xl font-black text-slate-800 italic">{machines.reduce((acc, m) => acc + m.queueCount, 0)} JOBS ENQUEUED</span>
          </div>
          <span className="p-3 bg-purple-55 text-purple-600 rounded-2xl border border-purple-100/50">
            <Layers size={20} />
          </span>
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines.map((mac) => (
          <div 
            key={mac.id}
            className="card-minimal p-6 border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:border-brand-accent/20 transition-all duration-300"
          >
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex flex-col">
                  <span className={cn(
                    "text-[8px] font-bold p-1 px-2 mb-1.5 rounded uppercase tracking-wider w-fit",
                    mac.type === 'Litho Press' && "bg-blue-50 text-blue-600 border border-blue-100",
                    mac.type === 'Digital Press' && "bg-purple-50 text-purple-600 border border-purple-100",
                    mac.type === 'Post-Press Finishing' && "bg-amber-50 text-amber-600 border border-amber-100"
                  )}>
                    {mac.type}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 leading-tight group-hover:text-brand-accent transition-colors duration-300">
                    {mac.name}
                  </h4>
                </div>

                <button 
                  type="button"
                  onClick={() => handleStatusToggle(mac.id)}
                  title="Toggle State"
                  className={cn(
                    "p-1.5 px-3 rounded-full text-[8.5px] font-bold uppercase tracking-wider border",
                    mac.status === 'Running' && "bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse",
                    mac.status === 'Idle' && "bg-slate-50 text-slate-500 border-slate-25",
                    mac.status === 'Maintenance' && "bg-red-50 text-red-650 border-red-100",
                    mac.status === 'Calibrating' && "bg-blue-50 text-blue-600 border-blue-100"
                  )}
                >
                  {mac.status}
                </button>
              </div>

              {/* Status Indicators progress speed */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100/40 text-[10px] mb-4">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Assigned operator:</span>
                  <span className="font-bold text-slate-700">{mac.operator}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Mechanical Speed:</span>
                  <span className="font-bold text-slate-700">
                    {mac.speedImpressionsPerHour > 0 
                      ? `${mac.speedImpressionsPerHour.toLocaleString()} sheets/hr` 
                      : '0 (Static)'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Cumulative click count:</span>
                  <span className="font-mono text-[9px] font-bold text-slate-600">{mac.totalClickCount.toLocaleString()} passes</span>
                </div>
              </div>

              {/* Workload Progress Bar */}
              <div className="space-y-1.5 mb-4 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Utilization capacity</span>
                  <span className="font-bold text-slate-700">{mac.utilization}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand-accent h-full rounded-full transition-all duration-550" 
                    style={{ width: `${mac.utilization}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <div className="flex flex-col">
                <span className="text-slate-400 block">Queue pipeline</span>
                <span className="font-bold text-slate-700">{mac.queueCount} Jobs pending</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded text-[9px]",
                  mac.maintenanceDueHours <= 20 
                    ? "text-red-600 bg-red-50 border border-red-100" 
                    : "text-slate-500 bg-slate-50"
                )}>
                  {mac.maintenanceDueHours > 0 ? `Service we: ${mac.maintenanceDueHours} Hrs` : 'Blocked'}
                </span>
                
                <button 
                  type="button" 
                  onClick={() => handleMaintenanceReset(mac.id)}
                  className="p-1 text-slate-400 hover:text-brand-accent hover:bg-slate-100 rounded transition-all"
                  title="Calibrate service reset logs"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
