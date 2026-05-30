import { Material } from '../../types';

export interface CostingSummary {
  profitAmount: number;
  markupPercent: number;
  marginPercent: number;
  multiplier: number;
}

export function computeCostingSummary(cost: number, sell: number): CostingSummary {
  const profitAmount = sell - cost;
  const markupPercent = cost > 0 ? (profitAmount / cost) * 100 : 0;
  const marginPercent = sell > 0 ? (profitAmount / sell) * 100 : 0;
  const multiplier = cost > 0 ? sell / cost : 0;

  return {
    profitAmount,
    markupPercent,
    marginPercent,
    multiplier
  };
}

export function getConvertedStock(stock: number, unit: string, displayUnit: string, conversions?: Record<string, number>): number {
  if (displayUnit === 'Default' || unit === displayUnit) {
    return stock;
  }
  const factor = conversions?.[displayUnit];
  return factor ? stock * factor : stock;
}

export function getConvertedCost(cost: number, unit: string, displayUnit: string, conversions?: Record<string, number>): number {
  if (displayUnit === 'Default' || unit === displayUnit) {
    return cost;
  }
  const factor = conversions?.[displayUnit];
  return factor ? cost / factor : cost;
}

export interface RollYieldMetrics {
  totalArea: number;
  netUsableArea: number;
  pullUpYield: number;
  posterYield: number;
  stickerYield: number;
  gazeboYield: number;
}

export function calculateRollYields(width: number, length: number, wastePercent: number): RollYieldMetrics {
  const rollWidth = Number(width) || 1.37;
  const rollLength = Number(length) || 50;
  const waste = Number(wastePercent) || 8;

  const totalArea = rollWidth * rollLength;
  const netUsableArea = totalArea * (1 - waste / 100);

  return {
    totalArea,
    netUsableArea,
    pullUpYield: Math.max(0, Math.floor(netUsableArea / 1.7)), // 850mm x 2000mm
    posterYield: Math.max(0, Math.floor(netUsableArea / 0.5)),   // A1 Poster
    stickerYield: Math.max(0, Math.floor(netUsableArea / 0.01)), // 100mm x 100mm (0.01 sqm)
    gazeboYield: Math.max(0, Math.floor(netUsableArea / 6.0))    // 3m x 2m
  };
}

export type StockHealthStatus = 'Out of Stock' | 'Critical Low' | 'Low Stock' | 'Healthy';

export function getStockHealth(stockLevel: number, minStock: number, reservedStock?: number): { label: StockHealthStatus, color: string } {
  const available = Math.max(0, stockLevel - (reservedStock || 0));
  const threshold = minStock || 10;

  let label: StockHealthStatus = 'Healthy';
  let color = 'bg-emerald-500 text-white';

  if (stockLevel === 0) {
    label = 'Out of Stock';
    color = 'bg-red-500 text-white';
  } else if (stockLevel <= threshold) {
    label = 'Critical Low';
    color = 'bg-rose-500 text-white';
  } else if (stockLevel <= threshold * 1.8) {
    label = 'Low Stock';
    color = 'bg-amber-500 text-slate-900 font-extrabold';
  }

  return { label, color };
}
