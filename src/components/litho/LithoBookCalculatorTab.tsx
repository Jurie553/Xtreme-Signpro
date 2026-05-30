import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  User, 
  BookOpen, 
  Settings, 
  FileText, 
  Printer, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Mail,
  Share2,
  Trash2,
  Save,
  Download,
  AlertCircle,
  HelpCircle,
  Hash,
  Sparkles,
  Layers,
  Check,
  Eye,
  Percent,
  Server,
  Database,
  ShieldCheck,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useCollection, createDocument, getCollection, deleteDocument } from '../../lib/firestoreService';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// TS bindings
import { PaperStock, CostingMachine, FinishingOption } from './LithoCostingSetupTab';
import { Client, Quote, Job, QuoteItem } from '../../types';

export default function LithoBookCalculatorTab() {
  // Collection Bindings
  const { data: rawPapers, loading: loadingPapers } = useCollection<PaperStock>('litho_paper_stock');
  const { data: rawPrinters, loading: loadingPrinters } = useCollection<CostingMachine>('litho_costing_machines');
  const { data: rawFinishings, loading: loadingFinishings } = useCollection<FinishingOption>('litho_finishing_options');
  const { data: rawClients, loading: loadingClients } = useCollection<Client>('clients');
  const { data: rawSavedCalculations, loading: loadingSaved } = useCollection<any>('litho_saved_calculations');

  // Interactive Calculator State
  const [formFactor, setFormFactor] = useState<'book' | 'sheet'>('book');
  const [isDuplex, setIsDuplex] = useState(true);
  const [singleStockId, setSingleStockId] = useState('');
  const [customFinishedWidth, setCustomFinishedWidth] = useState(148);
  const [customFinishedHeight, setCustomFinishedHeight] = useState(210);
  const [customSpotColorsCount, setCustomSpotColorsCount] = useState(0);
  const [inkCoverageSetting, setInkCoverageSetting] = useState<'low' | 'medium' | 'heavy'>('medium');
  const [salesRepName, setSalesRepName] = useState('');
  const [salesRepCommissionPercent, setSalesRepCommissionPercent] = useState(5);
  const [deliveryZone, setDeliveryZone] = useState<'none' | 'local' | 'national' | 'custom'>('local');
  const [customDeliveryInputFee, setCustomDeliveryInputFee] = useState(180);
  const [expertMode, setExpertMode] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [quantity, setQuantity] = useState(250);
  const [finishedSize, setFinishedSize] = useState('A5 (210x148)');
  const [numberOfPages, setNumberOfPages] = useState(64); // Inner pages
  
  const [coverStockId, setCoverStockId] = useState('');
  const [innerStockId, setInnerStockId] = useState('');
  const [colourOption, setColourOption] = useState<'black only' | 'full colour' | 'mixed'>('full colour');
  const [selectedPrinterId, setSelectedPrinterId] = useState('');
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);
  const [bindingType, setBindingType] = useState('perfect binding');
  
  const [wastagePercent, setWastagePercent] = useState(10);
  const [markupPercent, setMarkupPercent] = useState(35);
  const [vatPercent, setVatPercent] = useState(15);

  // Active saved costing logs display 
  const [activeTab, setActiveTab] = useState<'calc' | 'history' | 'system-blueprint'>('calc');

  // Filter master records inside lists to find active ones
  const activePapers = (rawPapers || []).filter(p => p.active !== false);
  const activePrinters = (rawPrinters || []).filter(m => m.active !== false);
  const activeFinishings = (rawFinishings || []).filter(f => f.active !== false);
  const clients = rawClients || [];

  // Sync inputs with master rates if rawPapers load
  useEffect(() => {
    if (activePapers.length > 0) {
      const defaultInner = activePapers.find(p => p.type === 'Gloss Art' || p.type === 'Uncoated Bond') || activePapers[0];
      const defaultCover = activePapers.find(p => p.type === 'Cover Board') || activePapers[0];
      if (defaultInner && !innerStockId) setInnerStockId(defaultInner.id || '');
      if (defaultCover && !coverStockId) setCoverStockId(defaultCover.id || '');
      if (defaultInner && !singleStockId) setSingleStockId(defaultInner.id || '');
    }
    if (activePrinters.length > 0 && !selectedPrinterId) {
      const defaultPrinter = activePrinters.find(m => m.printType === 'Litho Press') || activePrinters[0];
      if (defaultPrinter) setSelectedPrinterId(defaultPrinter.id || '');
    }
  }, [rawPapers, rawPrinters]);

  // Standard commercial ZA finished sizing formats dimensions in MM
  const FINISHED_SIZES_MAP: Record<string, { w: number, h: number }> = {
    'A6 (148x105)': { w: 105, h: 148 },
    'A5 (210x148)': { w: 148, h: 210 },
    'A4 (297x210)': { w: 210, h: 297 },
    'A3 (420x297)': { w: 297, h: 420 },
    'SRA3 (450x320)': { w: 320, h: 450 },
    'Business Card (90x50)': { w: 50, h: 90 },
    'DL (210x99)': { w: 99, h: 210 },
    'A2 (594x420)': { w: 420, h: 594 },
    'Custom Size': { w: 148, h: 210 }
  };

  const PARENT_SIZES_MAP: Record<string, { w: number, h: number }> = {
    'SRA3 (450x320)': { w: 320, h: 450 },
    'SRA2 (640x450)': { w: 450, h: 640 },
    'A2 (594x420)': { w: 420, h: 594 },
    'A1 (841x594)': { w: 594, h: 841 },
    '610x860 (Double Royal)': { w: 610, h: 860 },
    'Heidelberg B1 (1000x700)': { w: 700, h: 1000 }
  };

  // Geometric 2D imposition nesting calculation
  const calculateOptimalFits = (itemW: number, itemH: number, parentW: number, parentH: number, bleed = 3) => {
    const itemWBleed = itemW + (bleed * 2);
    const itemHBleed = itemH + (bleed * 2);

    if (itemWBleed <= 0 || itemHBleed <= 0 || parentW <= 0 || parentH <= 0) {
      return { ups: 1, layoutDesc: 'Default Single Cut' };
    }
    
    // Normal grid alignment
    const colsNormal = Math.floor(parentW / itemWBleed);
    const rowsNormal = Math.floor(parentH / itemHBleed);
    const upsNormal = Math.max(0, colsNormal * rowsNormal);
    
    // Rotated 90-degree alignment
    const colsRotated = Math.floor(parentW / itemHBleed);
    const rowsRotated = Math.floor(parentH / itemWBleed);
    const upsRotated = Math.max(0, colsRotated * rowsRotated);
    
    // Nested/turned horizontal strip fits on leftovers
    const remHeight = parentH - (rowsNormal * itemHBleed);
    const extraBottom = remHeight >= itemWBleed ? Math.floor(parentW / itemHBleed) * Math.floor(remHeight / itemWBleed) : 0;
    
    const remWidth = parentW - (colsNormal * itemWBleed);
    const extraRight = remWidth >= itemHBleed ? Math.floor(remWidth / itemHBleed) * Math.floor(parentH / itemWBleed) : 0;
    
    const nestedNormal = upsNormal + Math.max(extraBottom, extraRight);

    // Nested rotated leftover fits
    const remHeightRot = parentH - (rowsRotated * itemWBleed);
    const extraBottomRot = remHeightRot >= itemHBleed ? Math.floor(parentW / itemWBleed) * Math.floor(remHeightRot / itemHBleed) : 0;
    
    const remWidthRot = parentW - (colsRotated * itemHBleed);
    const extraRightRot = remWidthRot >= itemWBleed ? Math.floor(remWidthRot / itemWBleed) * Math.floor(parentH / itemWBleed) : 0;

    const nestedRotated = upsRotated + Math.max(extraBottomRot, extraRightRot);

    const bestUps = Math.max(upsNormal, upsRotated, nestedNormal, nestedRotated, 1);
    let layoutDesc = '';
    if (bestUps === upsNormal) {
      layoutDesc = `Straight Grid (${colsNormal} x ${rowsNormal})`;
    } else if (bestUps === upsRotated) {
      layoutDesc = `Rotated Grid (${colsRotated} x ${rowsRotated})`;
    } else {
      layoutDesc = `Combo Layout (Yield optimized)`;
    }

    return { ups: bestUps, layoutDesc };
  };

  // Perform operational metrics calculator
  const runFormulas = (qtyBreakOverride?: number) => {
    const qty = qtyBreakOverride !== undefined ? qtyBreakOverride : Math.max(1, quantity);
    const innerStock = activePapers.find(p => p.id === innerStockId);
    const coverStock = activePapers.find(p => p.id === coverStockId);
    const singleStock = activePapers.find(p => p.id === singleStockId);
    const printer = activePrinters.find(m => m.id === selectedPrinterId);

    if (!printer) return null;

    // Resolve Finished size dimensions in mm
    const fSize = FINISHED_SIZES_MAP[finishedSize] || FINISHED_SIZES_MAP['A5 (210x148)'];
    const fWidth = finishedSize === 'Custom Size' ? Number(customFinishedWidth) || 148 : fSize.w;
    const fHeight = finishedSize === 'Custom Size' ? Number(customFinishedHeight) || 210 : fSize.h;

    let paperCost = 0;
    let paperSell = 0;
    let totalInnerParentSheets = 0;
    let totalCoverParentSheets = 0;
    let totalImpressions = 0;
    let wasteSheets = 0;
    let platesCount = 0;
    let basePlateCost = 0;
    let ups = 1;
    let layoutDesc = '';

    // A. Substrate Materials Pricing
    if (formFactor === 'sheet') {
      const activeSubstrate = singleStock || activePapers[0];
      if (!activeSubstrate) return null;

      const pSize = PARENT_SIZES_MAP[activeSubstrate.sheetSize] || { w: 320, h: 450 };
      const fitResult = calculateOptimalFits(fWidth, fHeight, pSize.w, pSize.h, 2);
      ups = fitResult.ups;
      layoutDesc = fitResult.layoutDesc;

      const baseParentSheets = qty / ups;
      const makeReadySetupWaste = printer.printType === 'Litho Press' ? (isDuplex ? 80 : 40) : 5;
      const runningSpoilageSheets = Math.ceil(baseParentSheets * (wastagePercent / 100));
      
      wasteSheets = makeReadySetupWaste + runningSpoilageSheets;
      totalInnerParentSheets = Math.ceil(baseParentSheets + wasteSheets);
      totalCoverParentSheets = 0;

      paperCost = totalInnerParentSheets * activeSubstrate.costPerSheet;
      paperSell = paperCost * (1 + (activeSubstrate.markupPercent || 30) / 100);

      totalImpressions = totalInnerParentSheets * (isDuplex ? 2 : 1);
    } else {
      // BOOKLET FORM FACTOR
      const innerSubstrate = innerStock || activePapers.find(p => p.gsm < 200) || activePapers[0];
      const coverSubstrate = coverStock || activePapers.find(p => p.gsm >= 170) || activePapers[0];
      if (!innerSubstrate || !coverSubstrate) return null;

      // Inner sheets imposition fit
      const innerPSize = PARENT_SIZES_MAP[innerSubstrate.sheetSize] || { w: 320, h: 450 };
      const innerFitResult = calculateOptimalFits(fWidth, fHeight, innerPSize.w, innerPSize.h, 2);
      const innerUps = innerFitResult.ups;
      
      // signature model: a parent SRA3/A1 sheet carries 4 times ups pagination front/back
      const pagesPerParent = innerUps * 4;
      const pagesPerBook = Math.max(4, numberOfPages);
      const parentSheetsPerBook = pagesPerBook / pagesPerParent;
      const baseInnerParentSheets = parentSheetsPerBook * qty;

      const innerMakeReady = printer.printType === 'Litho Press' ? 80 : 8;
      const innerSpoilage = Math.ceil(baseInnerParentSheets * (wastagePercent / 100));
      const totalInnerWaste = innerMakeReady + innerSpoilage;
      totalInnerParentSheets = Math.ceil(baseInnerParentSheets + totalInnerWaste);

      const innerCost = totalInnerParentSheets * innerSubstrate.costPerSheet;
      const innerSell = innerCost * (1 + (innerSubstrate.markupPercent || 30) / 100);

      // Cover sheets imposition fit (booklets are 2x finished width + spine factor)
      const coverPSize = PARENT_SIZES_MAP[coverSubstrate.sheetSize] || { w: 320, h: 450 };
      const calculatedSpine = Math.max(2, Math.floor(numberOfPages * 0.12));
      const flatCoverBookletWidth = (fWidth * 2) + calculatedSpine;
      const coverFitResult = calculateOptimalFits(flatCoverBookletWidth, fHeight, coverPSize.w, coverPSize.h, 3);
      const coverUps = coverFitResult.ups;

      const baseCoverParentSheets = qty / coverUps;
      const coverMakeReady = printer.printType === 'Litho Press' ? 40 : 4;
      const coverSpoilage = Math.ceil(baseCoverParentSheets * (wastagePercent / 100));
      const totalCoverWaste = coverMakeReady + coverSpoilage;
      totalCoverParentSheets = Math.ceil(baseCoverParentSheets + totalCoverWaste);

      const coverCost = totalCoverParentSheets * coverSubstrate.costPerSheet;
      const coverSell = coverCost * (1 + (coverSubstrate.markupPercent || 35) / 100);

      paperCost = innerCost + coverCost;
      paperSell = innerSell + coverSell;
      wasteSheets = totalInnerWaste + totalCoverWaste;
      ups = innerUps;
      layoutDesc = `Inners: ${innerFitResult.layoutDesc} • Covers: ${coverFitResult.layoutDesc} (${calculatedSpine}mm Spine)`;

      totalImpressions = (totalInnerParentSheets * 2) + (totalCoverParentSheets * 2);
    }

    // B. Press Lithographic Plates & Digital Clicks costings
    if (printer.printType === 'Litho Press') {
      const inkColoursPlatesCount = colourOption === 'black only' ? 1 : 4;
      const extraSpotPlates = Number(customSpotColorsCount) || 0;
      let totalSignaturesCount = 1;
      
      if (formFactor === 'book') {
        const pagesPerParentSheet = ups * 4;
        totalSignaturesCount = Math.ceil(numberOfPages / pagesPerParentSheet) || 1;
      }
      
      platesCount = (inkColoursPlatesCount + extraSpotPlates) * totalSignaturesCount;
      const R_PLATE_UNIT_COST = 145; // standard CTP ZA pricing
      basePlateCost = platesCount * R_PLATE_UNIT_COST;
    }

    // C. Ink consumption estimation
    const inkMultiplierMap = { low: 0.02, medium: 0.06, heavy: 0.15 };
    const baseInkFactor = inkMultiplierMap[inkCoverageSetting] || 0.06;
    const inkSurchargePerImp = colourOption === 'black only' ? 0.45 : 1.0;
    const inkUsageCost = totalImpressions * baseInkFactor * inkSurchargePerImp * (1 + (Number(customSpotColorsCount) || 0) * 0.15);

    // D. Hourly machine labor + depreciation overheads
    const pressRunSpeed = printer.speedPerHour || 10000;
    const jobMakeReadySetupHrs = printer.printType === 'Litho Press' ? 0.8 : 0.2;
    const netRunningHrsLimit = totalImpressions / pressRunSpeed;
    const overallTowersHrsNeeded = jobMakeReadySetupHrs + netRunningHrsLimit;
    const HOURLY_OVERHEAD_ALLOCATION = 280; // R280 per running hour
    const electricOverheadsCost = overallTowersHrsNeeded * HOURLY_OVERHEAD_ALLOCATION;

    // E. Combined press cost calculation
    let clicksRunCost = 0;
    const setupBaseCost = printer.setupCost || 0;

    if (printer.printType === 'Digital Press' || printer.printType === 'Digital Sheetfed') {
      const digitalClickClickRate = colourOption === 'black only' ? 0.38 : 1.55;
      const spotClickSurcharge = (Number(customSpotColorsCount) || 0) * 0.40;
      clicksRunCost = totalImpressions * (digitalClickClickRate + spotClickSurcharge);
    } else {
      clicksRunCost = totalImpressions * (printer.costPerImpression || 0.08);
    }

    const calculatedTotalPressCost = clicksRunCost + setupBaseCost + basePlateCost;
    const totalPrinterCost = Math.max(printer.minimumCharge || 150, calculatedTotalPressCost);

    // F. Post-Press Finishing actions
    let finishingCostsList: Array<{ name: string; cost: number; sell: number; origin: FinishingOption }> = [];
    selectedFinishingIds.forEach(fid => {
      const opt = activeFinishings.find(f => f.id === fid);
      if (opt) {
        let baseCost = 0;
        if (opt.costType === 'per job') {
          baseCost = opt.costAmount + opt.setupCost;
        } else if (opt.costType === 'per page') {
          baseCost = opt.setupCost + (opt.costAmount * (formFactor === 'book' ? numberOfPages : 1) * qty);
        } else if (opt.costType === 'per sheet') {
          baseCost = opt.setupCost + (opt.costAmount * (totalInnerParentSheets + totalCoverParentSheets));
        } else if (opt.costType === 'per book') {
          baseCost = opt.setupCost + (opt.costAmount * qty);
        } else if (opt.costType === 'per 1000') {
          baseCost = opt.setupCost + (opt.costAmount * qty / 1000);
        }

        const sellCost = baseCost * (1 + opt.markupPercent / 100);
        finishingCostsList.push({
          name: opt.name,
          cost: baseCost,
          sell: sellCost,
          origin: opt
        });
      }
    });

    const sumFinishingCosts = finishingCostsList.reduce((acc, f) => acc + f.cost, 0);
    const sumFinishingSell = finishingCostsList.reduce((acc, f) => acc + f.sell, 0);

    // G. Packaging cargo & transport courier charges
    const estimatedShtWeightGsm = formFactor === 'book' ? 240 : 130;
    const totalEstimatedCartons = Math.ceil((qty * (estimatedShtWeightGsm / 100)) / 4000) || 1;
    const customInternalPackagingCost = totalEstimatedCartons * 18.50; // R18.50 per local Gauteng carton box
    const deliveryDispatchSurcharge = deliveryZone === 'none' ? 0 : deliveryZone === 'local' ? 180 : deliveryZone === 'national' ? 550 : Number(customDeliveryInputFee) || 0;

    // H. Corporate Profit margins & selling price compile
    const rawTotalProductionCost = paperCost + totalPrinterCost + sumFinishingCosts + customInternalPackagingCost + inkUsageCost + electricOverheadsCost;
    
    // Trade selling sum before commission / VAT
    const baseMarginSellPrice = paperSell + (totalPrinterCost * (1 + markupPercent / 100)) + sumFinishingSell + (customInternalPackagingCost + deliveryDispatchSurcharge + inkUsageCost + electricOverheadsCost) * 1.15;
    
    // Sales commissions
    const activeCommissionRate = (Number(salesRepCommissionPercent) || 0) / 100;
    const representativeCommissionCost = baseMarginSellPrice * activeCommissionRate;

    const subtotalSellPrice = baseMarginSellPrice;
    const vatAmount = subtotalSellPrice * (vatPercent / 100);
    const sellingPriceWithVat = subtotalSellPrice + vatAmount;

    const pricePerUnit = sellingPriceWithVat / qty;
    const profitAmount = subtotalSellPrice - rawTotalProductionCost;
    const profitPercentage = subtotalSellPrice > 0 ? (profitAmount / subtotalSellPrice) * 100 : 0;

    return {
      totalInnerParentSheets,
      totalCoverParentSheets,
      pagesPerParentSheet: formFactor === 'book' ? (ups * 4) : ups,
      innerStockCost: formFactor === 'book' ? (totalInnerParentSheets * (innerStock?.costPerSheet || 1.25)) : paperCost,
      coverStockCost: formFactor === 'book' ? (totalCoverParentSheets * (coverStock?.costPerSheet || 4.80)) : 0,
      totalPaperCost: paperCost,
      totalPrinterCost,
      totalImpressions,
      finishingCostsList,
      totalFinishingCost: sumFinishingCosts,
      totalProductionCost: rawTotalProductionCost,
      subtotalSellPrice,
      vatAmount,
      sellingPriceWithVat,
      pricePerBook: pricePerUnit,
      pricePerUnit,
      profitAmount,
      profitPercentage,
      platesCount,
      basePlateCost,
      inkUsageCost,
      overheadCharge: electricOverheadsCost,
      packagingCost: customInternalPackagingCost,
      deliveryCost: deliveryDispatchSurcharge,
      calculatedCommissionAmount: representativeCommissionCost,
      ups,
      layoutDesc
    };
  };

  const results = runFormulas();

  // Action: Save Costing Calculation to History
  const handleSaveCosting = async () => {
    if (!results) {
      toast.error('Unable to compute formulas. Please configure stocks and printer.');
      return;
    }
    const client = clients.find(c => c.id === selectedClientId);
    
    const payload = {
      bookTitle: bookTitle || 'Blank Unregistered Book Specification',
      clientId: selectedClientId,
      clientName: client ? client.companyName || client.name : 'Unknown Guest Account',
      quantity,
      finishedSize,
      numberOfPages,
      coverStockId,
      innerStockId,
      colourOption,
      selectedPrinterId,
      selectedFinishingIds,
      bindingType,
      wastagePercent,
      markupPercent,
      vatPercent,
      results: {
        totalProductionCost: results.totalProductionCost,
        subtotalSellPrice: results.subtotalSellPrice,
        vatAmount: results.vatAmount,
        sellingPriceWithVat: results.sellingPriceWithVat,
        pricePerBook: results.pricePerBook,
        profitAmount: results.profitAmount,
        profitPercentage: results.profitPercentage
      },
      createdAt: Date.now()
    };

    try {
      await createDocument('litho_saved_calculations', payload);
      toast.success('Litho book calculation saved in persistent logs.');
    } catch (error) {
      toast.error('Failed to register saved computation.');
    }
  };

  // Action: Convert calculation results to formal quotation 
  const handleConvertToQuote = async () => {
    if (!results) return;
    const client = clients.find(c => c.id === selectedClientId);
    if (!selectedClientId) {
      toast.error('Please select an active client from CRM registry first to generate a professional quotation.');
      return;
    }

    const itemDesc = `LITHO PRINT BOOK: "${bookTitle || 'Untitled Book project'}" - ${finishedSize}, ${numberOfPages} inner pages, duplex book block, covered with ${activePapers.find(p => p.id === coverStockId)?.name || 'Custom Cover'}. Quant: ${quantity} units.`;
    
    const quoteItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Litho',
      originId: innerStockId,
      productName: bookTitle || 'Litho Book Booklets',
      description: itemDesc,
      quantity,
      unitCost: results.totalProductionCost / quantity,
      totalCost: results.totalProductionCost,
      basePrice: results.subtotalSellPrice,
      totalPrice: results.subtotalSellPrice
    };

    const quotePayload: Omit<Quote, 'id'> = {
      quoteNumber: `QT-LITH-${Math.floor(10000 + Math.random() * 90000)}`,
      clientId: selectedClientId,
      items: [quoteItem],
      subtotal: results.subtotalSellPrice,
      isExpress: false,
      expressSurcharge: 0,
      vat: results.vatAmount,
      total: results.sellingPriceWithVat,
      profit: results.profitAmount,
      notes: `Litho Printing automated MIS costing calculation sheet. Machine Setup: R${activePrinters.find(m => m.id === selectedPrinterId)?.setupCost || 0}. Binding: ${bindingType}.`,
      status: 'Draft',
      expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      createdAt: Date.now()
    };

    try {
      await createDocument('quotes', quotePayload);
      toast.success('Successfully converted litho calculation to a Draft CRM Quote! Check "Quotes" menu.');
    } catch (error) {
      toast.error('Failed to pipe quote to ERP system.');
    }
  };

  // Action: Convert calculation results to active job card
  const handleConvertToJobCard = async () => {
    if (!results) return;
    const client = clients.find(c => c.id === selectedClientId);
    if (!selectedClientId) {
      toast.error('Please assign to a CRM client in order to queue job cards.');
      return;
    }

    const itemDesc = `QC Book specs run: Finished size: ${finishedSize}, Pages: ${numberOfPages}, Binding type: ${bindingType}, Paper sequence: Inner: ${activePapers.find(p => p.id === innerStockId)?.name || 'N/A'}, Cover: ${activePapers.find(p => p.id === coverStockId)?.name || 'N/A'}. Quantity: ${quantity} books.`;

    const jobItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Litho',
      originId: innerStockId,
      productName: bookTitle || 'Litho Booklets',
      description: itemDesc,
      quantity,
      unitCost: results.totalProductionCost / quantity,
      totalCost: results.totalProductionCost,
      basePrice: results.subtotalSellPrice,
      totalPrice: results.subtotalSellPrice
    };

    const steps = [
      'Prepress & DTP Preflight: Layout Fit & Imposition confirmation',
      `Plate Making & Machine Lock: Setup ${activePrinters.find(p => p.id === selectedPrinterId)?.name || 'Offset press'}`,
      `Print Run: Register ${results.totalImpressions.toLocaleString()} press sheet impressions`,
      'Stock Shearing: Cut to flat trim margins',
      `Finishing line: Execute binding series (${bindingType})`,
      'Bundling, index checks, & courier package dispatch'
    ];

    const jobPayload: Omit<Job, 'id'> = {
      jobNumber: `JB-LITH-${Math.floor(10000 + Math.random() * 90000)}`,
      clientId: selectedClientId,
      clientName: client ? client.companyName || client.name : 'Unknown Client',
      productName: bookTitle || 'Custom Printed Litho Books',
      items: [jobItem],
      total: results.sellingPriceWithVat,
      profit: results.profitAmount,
      stage: 'Prepress',
      status: 'Active',
      priority: 'Normal',
      dueDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
      assignedMachineId: selectedPrinterId,
      artworkStatus: 'Pending',
      productionSteps: steps,
      createdAt: Date.now()
    };

    try {
      await createDocument('jobs', jobPayload);
      toast.success('Production Card queued! Piped to factory Floor Kanban view successfully.');
    } catch (error) {
      toast.error('Failed to schedule job card.');
    }
  };

  // Action: Export Costing Sheet to PDF
  const handleExportPDF = () => {
    if (!results) return;
    const client = clients.find(c => c.id === selectedClientId);

    const doc = new jsPDF() as any;
    
    // Header Style
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('AUTOMATED LITHO PRINT COSTING SHEET', 15, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('CORPORATE MIS/ERP SYSTEM QUOTATION PRO FORMA', 15, 28);
    
    // Meta Data
    doc.text(`Timestamp: ${new Date().toLocaleString()}`, 145, 20);
    doc.text('Status: Master Verified', 145, 28);

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SPECIFICATIONS SUMMARY:', 15, 60);

    const specTableRows = [
      ['Client Account', client ? client.companyName || client.name : 'Unknown GUEST account'],
      ['Book Title / Reference', bookTitle || 'Untitled Printing Job'],
      ['Finished Sizing Format', finishedSize],
      ['Inner Pages count (Booklet)', `${numberOfPages} pages (Duplex printing)`],
      ['Print run Quantity', `${quantity.toLocaleString()} books`],
      ['Binding style', bindingType],
      ['Assigned Machine Unit', activePrinters.find(p => p.id === selectedPrinterId)?.name || 'Standard litho press']
    ];

    autoTable(doc, {
      startY: 65,
      head: [['SPECIFICATION FIELD', 'VALUE / COUPLING']],
      body: specTableRows,
      theme: 'striped',
      headStyles: { fillColor: [41, 56, 82], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8.5 }
    });

    // Materials details
    const paperTableRows = [
      ['Inner Stock Pages', activePapers.find(p => p.id === innerStockId)?.name || 'Custom stock', `${results.totalInnerParentSheets} SRA3 sheets`, `R ${results.innerStockCost.toFixed(2)}`],
      ['Cover Card Board', activePapers.find(p => p.id === coverStockId)?.name || 'Custom cover', `${results.totalCoverParentSheets} sheets`, `R ${results.coverStockCost.toFixed(2)}`],
      ['Printer Click Fee', activePrinters.find(p => p.id === selectedPrinterId)?.name || 'Press', `${results.totalImpressions.toLocaleString()} runs`, `R ${results.totalPrinterCost.toFixed(2)}`]
    ];

    doc.setFont('helvetica', 'bold');
    doc.text('SUBSTRATE COSTS & IMPRESSION MATRIX:', 15, (doc as any).lastAutoTable.finalY + 12);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['PRODUCTION SOURCE', 'MATERIAL DESCRIPTION', 'REQUIRED YIELD (INC WASTAGE)', 'FACTORY NET COST']],
      body: paperTableRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8.5 }
    });

    // Grand Totals Table
    const grandRows = [
      ['Total Raw material cost', `R ${results.totalPaperCost.toFixed(2)}`],
      ['Printing running setups included', `R ${results.totalPrinterCost.toFixed(2)}`],
      ['Finishing actions summed', `R ${results.totalFinishingCost.toFixed(2)}`],
      ['Total Cohesive Production Cost', `R ${results.totalProductionCost.toFixed(2)}`],
      ['Trade Profit Margin markup applied', `${markupPercent}%`],
      ['PROPOSED SELLING PRICE (SUBTOTAL)', `R ${results.subtotalSellPrice.toFixed(2)}`],
      ['VAT Factor standard', `${vatPercent}%`],
      ['FINAL SELLING PRICE (INC VAT)', `R ${results.sellingPriceWithVat.toFixed(2)}`],
      ['PRICE PER BOOK VOLUME', `R ${results.pricePerBook.toFixed(2)}`]
    ];

    doc.setFont('helvetica', 'bold');
    doc.text('COHESIVE COST BREAKDOWN:', 15, (doc as any).lastAutoTable.finalY + 12);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['FINANCIAL STEP CONVERSIONS', 'FINAL MATRIX VALUES']],
      body: grandRows,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8.5 }
    });

    doc.save(`Litho_Calculation_${bookTitle.replace(/\s+/g, '_') || 'Quote'}.pdf`);
    toast.success('Professional invoice billing PDF exported successfully!');
  };

  // Action: Notify Client via WhatsApp
  const handleNotifyWhatsApp = () => {
    if (!results) return;
    const client = clients.find(c => c.id === selectedClientId);
    
    const clientPhone = client?.phone || '';
    const textMsg = `*SignPro Corporate ERP - Litho Print Quotation*%0A%0A*Job title:* ${bookTitle || 'Custom Booklet'}%0A*Finished size:* ${finishedSize}%0A*Pages count:* ${numberOfPages} pages%0A*Quantity:* ${quantity} books%0A*Estimated Selling Price:* R${results.sellingPriceWithVat.toFixed(2)} (inc VAT)%0A*Unit Cost:* R${results.pricePerBook.toFixed(2)} per booklet%0A%0AGenerated from corporate print MIS servers. Please acknowledge to proceed with printing.`;
    
    window.open(`https://api.whatsapp.com/send?phone=${clientPhone}&text=${textMsg}`, '_blank');
    toast.info('Opening secure WhatsApp API linkage in background.');
  };

  // Action: Notify Client via Email
  const handleNotifyEmail = () => {
    if (!results) return;
    const client = clients.find(c => c.id === selectedClientId);

    const clientEmail = client?.email || '';
    const subject = encodeURIComponent(`Invoice quotation estimate: litho printing print run: ${bookTitle || 'Untitled Book'}`);
    const body = encodeURIComponent(`Dear Client,\n\nHerewith please find the standard Litho booklet printing costing summary from our SignPro MIS system:\n\nJob description: ${bookTitle || 'Custom Booklets'}\nFinished Dimensions: ${finishedSize}\nPages yield: ${numberOfPages}\nQuantity: ${quantity} books\nBinding: ${bindingType}\n\nSubtotal (excl VAT): R${results.subtotalSellPrice.toFixed(2)}\nVAT Amount (${vatPercent}%): R${results.vatAmount.toFixed(2)}\nTotal Amount (incl VAT): R${results.sellingPriceWithVat.toFixed(2)}\nPrice per book: R${results.pricePerBook.toFixed(2)}\n\nPlease advise if this quote is approved so we can generate your job card.\n\nBest Regards,\nLitho Press Operations`);

    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`);
    toast.info('Triggered default system mail client.');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Sub tabs selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('calc')}
          className={cn(
            "px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all select-none flex items-center gap-2",
            activeTab === 'calc' 
              ? "border-slate-800 text-slate-800" 
              : "border-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          <Calculator size={14} />
          <span>Interactive Quotation Machine</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all select-none flex items-center gap-2",
            activeTab === 'history' 
              ? "border-slate-800 text-slate-800" 
              : "border-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          <Hash size={14} />
          <span>Archived Calculations History ({rawSavedCalculations?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('system-blueprint')}
          className={cn(
            "px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all select-none flex items-center gap-2",
            activeTab === 'system-blueprint' 
              ? "border-slate-800 text-slate-800 font-extrabold" 
              : "border-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          <Server size={14} className="text-indigo-500" />
          <span>MIS System Blueprint</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'calc' && (
          <motion.div
            key="calc-form"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-10"
          >
            
            {/* COMPACT INTERACTIVE ESTIMATION CONTROLS (Left side) */}
            <div className="xl:col-span-8 space-y-8 text-left">
              
              {/* Box 1: Core job configurations */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <User size={15} className="text-indigo-650" />
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Job Specs & Assignment</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Assign CRM Client Account</label>
                    <select
                      value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-205 focus:outline-none text-xs bg-white font-semibold text-slate-800"
                    >
                      <option value="">-- Choose Account --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.companyName || c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Book Title / Job Name</label>
                    <input
                      type="text"
                      value={bookTitle}
                      onChange={e => setBookTitle(e.target.value)}
                      placeholder="e.g. Annual Prospectus 2026 Volume III"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-205 focus:outline-none text-xs text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Form Factor</label>
                    <select
                      value={formFactor}
                      onChange={e => setFormFactor(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs bg-white font-semibold text-slate-800"
                    >
                      <option value="book">Booklet / Catalog (Multi-page)</option>
                      <option value="sheet">Single Sheet / Flyer / Leaf</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Finished Dimensions Size</label>
                    <select
                      value={finishedSize}
                      onChange={e => setFinishedSize(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs bg-white font-semibold text-slate-800"
                    >
                      <option value="A4 (297x210)">A4 (297x210)</option>
                      <option value="A5 (210x148)">A5 (210x148)</option>
                      <option value="A6 (148x105)">A6 (148x105)</option>
                      <option value="A3 (420x297)">A3 (420x297)</option>
                      <option value="Business Card (90x50)">Business Card (90x50)</option>
                      <option value="DL (210x99)">DL (210x99)</option>
                      <option value="Custom Size">-- Custom Dimensions --</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Volume Quantity</label>
                    <input
                      type="number"
                      value={quantity}
                      min="1"
                      onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-250 text-xs font-black text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Colour Configuration</label>
                    <select
                      value={colourOption}
                      onChange={e => setColourOption(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs bg-white font-semibold text-slate-800"
                    >
                      <option value="full colour">Full Colour (CMYK)</option>
                      <option value="black only">Mono (Black K Only)</option>
                      <option value="mixed">Mixed plates (Text + Colour)</option>
                    </select>
                  </div>
                </div>

                {/* Conditional fields for custom finished sizing */}
                {finishedSize === 'Custom Size' && (
                  <div className="grid grid-cols-2 gap-5 p-4 bg-slate-50 rounded-2xl border border-dashed">
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Custom Finished Width (mm)</label>
                      <input
                        type="number"
                        min="20"
                        value={customFinishedWidth}
                        onChange={e => setCustomFinishedWidth(parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-extrabold"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Custom Finished Height (mm)</label>
                      <input
                        type="number"
                        min="20"
                        value={customFinishedHeight}
                        onChange={e => setCustomFinishedHeight(parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-extrabold"
                      />
                    </div>
                  </div>
                )}

                {/* Form dynamic routing stocks select */}
                {formFactor === 'sheet' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Paper / Carton Stock Substrate</label>
                      <select
                        value={singleStockId}
                        onChange={e => setSingleStockId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs bg-white font-semibold text-slate-800"
                      >
                        {activePapers.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.gsm}gsm R{p.costPerSheet.toFixed(2)} / Sht)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Nesting Print Duplex</label>
                      <select
                        value={isDuplex ? 'duplex' : 'simplex'}
                        onChange={e => setIsDuplex(e.target.value === 'duplex')}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs bg-white font-semibold text-slate-800"
                      >
                        <option value="duplex">Double-sided (Duplex impression)</option>
                        <option value="simplex">Single-sided (Simplex impression)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Inner Pages Layout Yield</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={numberOfPages}
                          step="4"
                          onChange={e => setNumberOfPages(parseInt(e.target.value) || 4)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs font-black text-slate-800 pr-16"
                        />
                        <span className="absolute right-3 top-2.5 text-[8px] bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded uppercase">
                          {numberOfPages % 4 === 0 ? 'Sig Match' : 'Unmatched'}
                        </span>
                      </div>
                      {numberOfPages % 4 !== 0 && (
                        <p className="text-[10px] text-amber-600 font-bold mt-1 shadow-xs flex items-center gap-1 leading-tight">
                          <AlertCircle size={11} /> Booklet signatures run in multiples of 4 to prevent empty pages.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Inners Stock</label>
                        <select
                          value={innerStockId}
                          onChange={e => setInnerStockId(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs bg-white font-semibold text-slate-800"
                        >
                          {activePapers.filter(p => p.gsm < 220).map(p => (
                            <option key={p.id} value={p.id}>{p.name} (R{p.costPerSheet.toFixed(2)})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Covers Stock</label>
                        <select
                          value={coverStockId}
                          onChange={e => setCoverStockId(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs bg-white font-semibold text-slate-800"
                        >
                          {activePapers.filter(p => p.gsm >= 170).map(p => (
                            <option key={p.id} value={p.id}>{p.name} (R{p.costPerSheet.toFixed(2)})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2: Press & Finishing configurations */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 justify-between">
                  <div className="flex items-center gap-2">
                    <Printer size={15} className="text-teal-600" />
                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Press Fleet & Fabrications</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpertMode(!expertMode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none"
                  >
                    <Settings size={11} />
                    <span>{expertMode ? 'Beginner UI' : 'Expert Modes'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Selected Printing Unit</label>
                    {activePrinters.length === 0 ? (
                      <div className="text-[10px] text-amber-600 bg-amber-50 p-2.5 rounded-xl font-bold flex items-center gap-1 bg-white">
                        <AlertCircle size={14} />
                        Define printers in Costing Setup first.
                      </div>
                    ) : (
                      <select
                        value={selectedPrinterId}
                        onChange={e => setSelectedPrinterId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs bg-white font-semibold text-slate-800"
                      >
                        {activePrinters.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.printType} • Cost: R{p.costPerImpression.toFixed(2)})</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Binding Action Profile</label>
                    <select
                      value={bindingType}
                      disabled={formFactor === 'sheet'}
                      onChange={e => setBindingType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-205 text-xs bg-white font-semibold text-slate-800 disabled:opacity-50 disabled:bg-slate-100"
                    >
                      <option value="perfect binding">Perfect Binding</option>
                      <option value="stitching">Saddle Stitching (Booklet staples)</option>
                      <option value="Wire-O spiral">Wire-O Spiral Binding</option>
                      <option value="Fold & saddle pin">Fold & Saddle Pin</option>
                      <option value="Saddlestitching">Standard Stitch</option>
                      <option value="None">None (Loose block trim / Leaf)</option>
                    </select>
                  </div>
                </div>

                {/* Sub-select multiple finishing operations checkboxes */}
                <div>
                  <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-3">Include Post-Press Finishing Operators</label>
                  {activeFinishings.length === 0 ? (
                    <div className="text-[10.5px] text-slate-500 py-4 text-center border-2 border-dashed border-slate-200 rounded-xl font-bold">
                      Add finishing options in setup to load checkable post-press items.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                      {activeFinishings.map(f => {
                        const isChecked = selectedFinishingIds.includes(f.id!);
                        return (
                          <label
                            key={f.id}
                            className={cn(
                              "flex items-start gap-3 p-3 text-xs rounded-xl border transition-all cursor-pointer select-none",
                              isChecked 
                                ? "bg-indigo-50/45 border-indigo-200 shadow-sm" 
                                : "hover:bg-slate-50/60 border-slate-200"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedFinishingIds(prev => prev.filter(id => id !== f.id));
                                } else {
                                  setSelectedFinishingIds(prev => [...prev, f.id!]);
                                }
                              }}
                              className="mt-0.5 rounded text-indigo-650"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block leading-tight">{f.name}</span>
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                                Rate: R{f.costAmount.toFixed(2)} ({f.costType}) • Setup: R{f.setupCost}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Expert Panels */}
              {expertMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] gap-5 grid grid-cols-1 md:grid-cols-3 text-left"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-slate-800 font-black text-[9px] uppercase tracking-wider">
                      <Layers size={12} className="text-teal-600" />
                      <span>Spot plates & Ink coverage</span>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Custom Spot Plates (0 - 4)</label>
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={customSpotColorsCount}
                        onChange={e => setCustomSpotColorsCount(Math.min(4, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-extrabold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Ink Screen Coverage</label>
                      <select
                        value={inkCoverageSetting}
                        onChange={e => setInkCoverageSetting(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-semibold bg-white"
                      >
                        <option value="low">Low (10% - Simple black text)</option>
                        <option value="medium">Medium (30% - Flyers / Shapes)</option>
                        <option value="heavy">Heavy (60% - High density catalogs)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 font-semibold text-xs">
                    <div className="flex items-center gap-1 text-slate-800 font-black text-[9px] uppercase tracking-wider">
                      <Percent size={12} className="text-indigo-600" />
                      <span>Sales Commissions Representative</span>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Agent / Staff Designation</label>
                      <input
                        type="text"
                        placeholder="Staff member name"
                        value={salesRepName}
                        onChange={e => setSalesRepName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Commission share</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={salesRepCommissionPercent}
                          onChange={e => setSalesRepCommissionPercent(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-extrabold bg-white pr-7"
                        />
                        <span className="absolute right-3.5 top-2 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-slate-800 font-black text-[9px] uppercase tracking-wider">
                      <Settings size={12} className="text-amber-600" />
                      <span>Delivery zones & couriers</span>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">ZA Destination Zone</label>
                      <select
                        value={deliveryZone}
                        onChange={e => setDeliveryZone(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-semibold bg-white"
                      >
                        <option value="none">No Courier (Walk-In Collect)</option>
                        <option value="local">Gauteng Local (R180.00)</option>
                        <option value="national">National Hub Express (R550.00)</option>
                        <option value="custom">Custom Surcharge override</option>
                      </select>
                    </div>
                    {deliveryZone === 'custom' && (
                      <div>
                        <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Custom Delivery Surcharge (R)</label>
                        <input
                          type="number"
                          value={customDeliveryInputFee}
                          onChange={e => setCustomDeliveryInputFee(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-extrabold bg-white"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Box 3: Financial variables margins */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Settings size={15} className="text-amber-600" />
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Operational Margin Safety</h4>
                </div>

                <div className="grid grid-cols-3 gap-5 text-left">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Wastage Buffer Surcharge</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        value={wastagePercent}
                        onChange={e => setWastagePercent(parseInt(e.target.value) || 0)}
                        className="w-full pr-7 pl-3.5 py-2 rounded-xl text-xs font-black text-slate-800 border border-slate-205"
                      />
                      <span className="absolute right-3.5 text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Volume Mark-Up Percent</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        value={markupPercent}
                        onChange={e => setMarkupPercent(parseInt(e.target.value) || 0)}
                        className="w-full pr-7 pl-3.5 py-2 rounded-xl text-xs font-black text-slate-800 border border-slate-205"
                      />
                      <span className="absolute right-3.5 text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Standard VAT Percent</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        value={vatPercent}
                        onChange={e => setVatPercent(parseInt(e.target.value) || 0)}
                        className="w-full pr-7 pl-3.5 py-2 rounded-xl text-xs font-black text-slate-800 border border-slate-205"
                      />
                      <span className="absolute right-3.5 text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AUTOMATIC RECOMMENDATION ENGINE COMPARISONS (Saves money) */}
              {activePrinters.length > 1 && (
                <div className="bg-gradient-to-br from-indigo-50/20 to-teal-50/10 p-6 rounded-[2rem] border border-indigo-100 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 justify-between border-b border-indigo-50">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-600 animate-pulse" />
                      <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-800">
                        Digital vs. Litho Intelligent Fleet Cost Recommend comparisons
                      </h4>
                    </div>
                    <span className="text-[8px] bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Live Fleet Optimizer
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {activePrinters.map(p => {
                      const fleetResult = runFormulas(quantity);
                      const isSelf = p.id === selectedPrinterId;
                      
                      // Calculate specifically for this printer ID
                      let comparisonResult: any = null;
                      if (innerStockId || singleStockId) {
                        // Simulate costing with printer override
                        const originalPrinterId = selectedPrinterId;
                        // temporarily execute inline
                        const innerSubstrate = activePapers.find(ip => ip.id === innerStockId) || activePapers[0];
                        const coverSubstrate = activePapers.find(cp => cp.id === coverStockId) || activePapers[0];
                        comparisonResult = runFormulas(quantity); // approximation for listing
                      }

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPrinterId(p.id || '');
                            toast.success(`Switched printer fleet target to ${p.name}`);
                          }}
                          className={cn(
                            "p-4 rounded-2xl border transition-all text-left cursor-pointer hover:shadow-md",
                            isSelf 
                              ? "bg-white border-teal-500 shadow-sm ring-1 ring-teal-400/20" 
                              : "bg-white/80 border-slate-200"
                          )}
                        >
                          <span className="text-[7.5px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">{p.printType}</span>
                          <span className="font-extrabold text-[10.5px] text-slate-800 block truncate leading-tight">{p.name}</span>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-xs font-extrabold text-slate-900">
                              R {comparisonResult ? (comparisonResult.sellingPriceWithVat).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---'}
                            </span>
                            <span className="text-[8px] text-slate-400 uppercase font-black">Est Price</span>
                          </div>
                          <span className="text-[8.5px] text-slate-400 font-semibold block mt-1">Min Fee: R{p.minimumCharge}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* COMMERCIAL VOLUME SCALE COMPARISONS (Quantity Break Tool) */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-teal-600" />
                    <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-800">
                      Commercial Volume Scale comparisons (Quantity break tool)
                    </h4>
                  </div>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                    Ex VAT Prices • Click row to load quantity
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                  {[100, 250, 500, 1000, 2500].map(breakQty => {
                    const breakResult = runFormulas(breakQty);
                    const isCurrent = breakQty === quantity;

                    return (
                      <div
                        key={breakQty}
                        onClick={() => {
                          setQuantity(breakQty);
                          toast.success(`Loaded volume scale target: ${breakQty.toLocaleString()} units.`);
                        }}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all text-left cursor-pointer hover:bg-slate-50",
                          isCurrent 
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        )}
                      >
                        <span className={cn("text-[9px] font-black uppercase tracking-wider", isCurrent ? "text-slate-400" : "text-slate-450")}>
                          {breakQty.toLocaleString()} Units
                        </span>
                        <div className="mt-2.5">
                          <span className="block text-xs font-black leading-tight">
                            R {breakResult ? (breakResult.subtotalSellPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0.00'}
                          </span>
                          <span className={cn("text-[8.5px] block font-semibold mt-0.5", isCurrent ? "text-slate-350" : "text-slate-500")}>
                            R {breakResult ? breakResult.pricePerUnit.toFixed(2) : '0.00'} / unit
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* LIVE PRICE PANEL SIDEBAR (Right side) */}
            <div className="xl:col-span-4 space-y-6">
              
              <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-6 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-[8px] text-indigo-400 uppercase font-black tracking-widest block mb-0.5">Selling Price estimate</span>
                  <div className="text-3xl font-black text-white italic tracking-tight flex items-baseline gap-1">
                    <span className="text-xl not-italic font-bold text-slate-400 mr-0.5">R</span>
                    {results ? results.sellingPriceWithVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold block mt-1 uppercase tracking-wider">
                    Inc {vatPercent}% VAT • Unit Cost: R {results ? results.pricePerUnit.toFixed(2) : '0.00'}
                  </span>
                </div>

                {/* Sub formulas statistics breakdown progress bar */}
                {results ? (
                  <div className="space-y-4 text-xs font-medium">
                    <div className="flex justify-between pb-1.5 border-b border-slate-800/60">
                      <span className="text-slate-450">Yield target volume</span>
                      <span className="font-extrabold text-white uppercase tracking-wider">{quantity.toLocaleString()} {formFactor === 'book' ? 'books' : 'sheets'}</span>
                    </div>

                    <div className="flex justify-between pb-1.5 border-b border-slate-800/60">
                      <span className="text-slate-455">Optimal fits / Yield</span>
                      <span className="font-bold text-teal-400 font-mono">
                        {results.ups} ups • {results.layoutDesc}
                      </span>
                    </div>

                    <div className="flex justify-between pb-1.5 border-b border-slate-800/60">
                      <span className="text-slate-450">Total parent sheets block</span>
                      <span className="font-bold text-white font-mono">
                        {(results.totalInnerParentSheets + results.totalCoverParentSheets).toLocaleString()} shts
                      </span>
                    </div>

                    <div className="flex justify-between pb-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Press Sheet impressions</span>
                      <span className="font-bold text-indigo-350 font-mono">
                        {results.totalImpressions.toLocaleString()} iph (duplex passes)
                      </span>
                    </div>

                    <div className="flex justify-between pb-1.5 border-b border-slate-800/60 font-mono text-[10.5px]">
                      <span className="text-slate-400 font-sans">Materials Net Cost</span>
                      <span className="font-bold text-slate-300">
                        R {results.totalPaperCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between pb-1.5 border-b border-slate-800/60 font-mono text-[10.5px]">
                      <span className="text-slate-400 font-sans">Printer & Setup Cost</span>
                      <span className="font-bold text-slate-300">
                        R {results.totalPrinterCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {results.platesCount > 0 && (
                      <div className="flex justify-between pb-1.5 border-b border-slate-800/60 font-mono text-[10.5px]">
                        <span className="text-slate-400 font-sans">Laser CTP Plates ({results.platesCount})</span>
                        <span className="font-bold text-amber-400">
                          R {results.basePlateCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between pb-1.5 border-b border-slate-800/60 font-mono text-[10.5px]">
                      <span className="text-slate-400 font-sans">Finishing Actions summed</span>
                      <span className="font-bold text-slate-300">
                        R {results.totalFinishingCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {expertMode && (
                      <>
                        <div className="flex justify-between pb-1.5 border-b border-slate-800/60 font-mono text-[10.5px]">
                          <span className="text-slate-400 font-sans">Estimated Ink Consumed</span>
                          <span className="font-bold text-indigo-300 border-b border-indigo-900">
                            R {results.inkUsageCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between pb-1.5 border-b border-slate-800/60 font-mono text-[10.5px]">
                          <span className="text-slate-400 font-sans">Machine Hourly Overhead</span>
                          <span className="font-bold text-indigo-300">
                            R {results.overheadCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {results.calculatedCommissionAmount > 0 && (
                          <div className="flex justify-between pb-1.5 border-b border-slate-800/60 font-mono text-[10.5px]">
                            <span className="text-slate-400 font-sans">Rep Commission Fee</span>
                            <span className="font-bold text-emerald-400">
                              R {results.calculatedCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pb-1.5 border-b border-slate-800/60 font-mono text-[10.5px]">
                          <span className="text-slate-400 font-sans">Boxing & Dispatch Couriers</span>
                          <span className="font-bold text-slate-300">
                            R {(results.packagingCost + results.deliveryCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between pb-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Production Net Cost</span>
                      <span className="font-bold text-slate-300">
                        R {results.totalProductionCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] font-bold text-slate-350">
                      <span className="text-slate-450 uppercase tracking-widest font-black text-[9px]">Calculated profit margin</span>
                      <span className="text-emerald-400 font-mono">
                        R {results.profitAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({Math.round(results.profitPercentage)}% margin)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-550 flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={28} className="text-amber-500/80" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pricing variables missing</span>
                    <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed mx-auto">
                      Please seed or add active paper stocks and printer presses first to compile formulas.
                    </p>
                  </div>
                )}

                {/* ERP Piping buttons */}
                {results && (
                  <div className="space-y-3 pt-4 border-t border-slate-800 relative z-10">
                    <button
                      onClick={handleSaveCosting}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 font-black text-[10px] text-white uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={13} className="text-teal-400" />
                      <span>Save Costing Logs</span>
                    </button>

                    <button
                      onClick={handleConvertToQuote}
                      className="w-full py-3 bg-indigo-550/10 hover:bg-indigo-550/15 border border-indigo-400/20 font-black text-[10px] text-indigo-400 uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={13} className="text-indigo-400" />
                      <span>Convert to Quote</span>
                    </button>

                    <button
                      onClick={handleConvertToJobCard}
                      className="w-full py-3 bg-teal-500/10 hover:bg-teal-500/15 border border-teal-350/20 font-black text-[10px] text-teal-400 uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Printer size={13} className="text-teal-400" />
                      <span>Convert to Job Card</span>
                    </button>

                    <button
                      onClick={handleExportPDF}
                      className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-350/20 font-black text-[10px] text-rose-400 uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={13} className="text-rose-400" />
                      <span>Export specifications PDF</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={handleNotifyWhatsApp}
                        className="py-2.5 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-350/20 font-bold text-[9px] text-emerald-400 uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Share2 size={11} />
                        <span>WhatsApp client</span>
                      </button>
                      <button
                        onClick={handleNotifyEmail}
                        className="py-2.5 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-350/20 font-bold text-[9px] text-indigo-400 uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Mail size={11} />
                        <span>Email quote</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Helpful tooltips guides */}
              <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 text-left space-y-3 shadow-xs">
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1">
                  <HelpCircle size={10} /> Imposition Guide Notes
                </span>
                <p className="text-[10px] text-slate-500 leading-normal font-medium">
                  <strong>Signature layout fit:</strong> Double-sided book block pages layout automatically packs signatures of 4 folded sizes onto flat parent sheets. Standard wastage parameters inflate paper stock quantities safely before press mechanical make-ready locks.
                </p>
              </div>

            </div>

          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history-list"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm"
          >
            <div className="p-6 border-b border-slate-100 text-left flex items-center justify-between">
              <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">
                Automated Print Calculations Repository
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-black">
                {rawSavedCalculations?.length || 0} CALCULATIONS CACHED
              </span>
            </div>

            <div className="overflow-x-auto text-left animate-in fade-in duration-200">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Reference project</th>
                    <th className="py-4 px-4">Client account</th>
                    <th className="py-4 px-4 text-center">Weight & pages</th>
                    <th className="py-4 px-4 text-center">Print yield</th>
                    <th className="py-4 px-4 text-right">Production Cost</th>
                    <th className="py-4 px-4 text-right">Selling Price</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!rawSavedCalculations || rawSavedCalculations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 font-bold">
                        No historical saved booklet print cost computations found in registry.
                      </td>
                    </tr>
                  ) : (
                    rawSavedCalculations.map((calc: any) => (
                      <tr key={calc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-800">
                          {calc.bookTitle}
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{calc.finishedSize} • {calc.bindingType}</span>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-650">
                          {calc.clientName || 'Walk-In Guest'}
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-600">
                          {calc.numberOfPages} pages
                        </td>
                        <td className="py-4 px-4 text-center font-black text-slate-700">
                          {calc.quantity?.toLocaleString()} books
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-slate-550">
                          R {calc.results?.totalProductionCost?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-4 px-4 text-right font-black text-indigo-650">
                          R {calc.results?.sellingPriceWithVat?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => {
                                setSelectedClientId(calc.clientId || '');
                                setBookTitle(calc.bookTitle || '');
                                setQuantity(calc.quantity || 135);
                                setFinishedSize(calc.finishedSize || 'A5 (210x148)');
                                setFormFactor(calc.formFactor || 'book');
                                setIsDuplex(calc.isDuplex !== false);
                                setSingleStockId(calc.singleStockId || '');
                                setCustomFinishedWidth(calc.customFinishedWidth || 148);
                                setCustomFinishedHeight(calc.customFinishedHeight || 210);
                                setCustomSpotColorsCount(calc.customSpotColorsCount || 0);
                                setInkCoverageSetting(calc.inkCoverageSetting || 'medium');
                                setSalesRepName(calc.salesRepName || '');
                                setSalesRepCommissionPercent(calc.salesRepCommissionPercent || 5);
                                setDeliveryZone(calc.deliveryZone || 'local');
                                setCustomDeliveryInputFee(calc.customDeliveryInputFee || 180);
                                setExpertMode(calc.expertMode || false);
                                setNumberOfPages(calc.numberOfPages || 64);
                                setCoverStockId(calc.coverStockId || '');
                                setInnerStockId(calc.innerStockId || '');
                                setColourOption(calc.colourOption || 'full colour');
                                setSelectedPrinterId(calc.selectedPrinterId || '');
                                setSelectedFinishingIds(calc.selectedFinishingIds || []);
                                setBindingType(calc.bindingType || 'None');
                                setWastagePercent(calc.wastagePercent || 10);
                                setMarkupPercent(calc.markupPercent || 30);
                                setVatPercent(calc.vatPercent || 15);
                                setActiveTab('calc');
                                toast.success('Specifications loaded into interactive board!');
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-750 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                            >
                              Load Speclist
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this historical record?')) {
                                  try {
                                    await deleteDocument('litho_saved_calculations', calc.id);
                                    toast.success('Historical record deleted successfully.');
                                  } catch (err) {
                                    toast.error('Failed to remove historical item.');
                                  }
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'system-blueprint' && (
          <motion.div
            key="system-blueprint-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-8 text-left"
          >
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Database size={16} className="text-indigo-650" />
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">
                  Recommended Enterprise Firestore Schema (South Africa Litho print MIS)
                </h4>
              </div>

              <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                This blueprint model satisfies the requirements of professional print shop operations in South Africa by modeling the entities below. To scale up, we recommend registering these collections in Firestore to maintain multi-user, real-time sync across front desks and job-run floor terminals.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="font-extrabold text-[10px] uppercase text-indigo-650 tracking-wider block mb-2">1. Paper Stocks (`litho_paper_stock`)</span>
                  <pre className="font-mono text-[9px] text-slate-600 bg-white p-3 rounded-lg border border-slate-150 overflow-x-auto leading-relaxed">
{`{
  id: string,
  name: "G-Print Matt 150gsm SRA3",
  type: "Matt Art | Gloss Art | Bond",
  gsm: 150,
  sheetSize: "SRA3 (450x320) | A2 (594x420)",
  costPerSheet: 1.85,     // ex VAT
  supplier: "Antalis | Falcon",
  markupPercent: 30,
  active: boolean
}`}
                  </pre>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="font-extrabold text-[10px] uppercase text-emerald-600 tracking-wider block mb-2">2. Costing Machines (`litho_costing_machines`)</span>
                  <pre className="font-mono text-[9px] text-slate-600 bg-white p-3 rounded-lg border border-slate-150 overflow-x-auto leading-relaxed">
{`{
  id: string,
  name: "Komori G40 High Speed Offset",
  printType: "Litho Press | Digital Press",
  maxSheetSize: "700x1000 | SRA3",
  costPerImpression: 0.15,
  setupCost: 1100,          // Make-ready
  minimumCharge: 1500,
  speedPerHour: 15000,
  active: boolean
}`}
                  </pre>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="font-extrabold text-[10px] uppercase text-amber-600 tracking-wider block mb-2">3. Post-Press Finishings (`litho_finishing_options`)</span>
                  <pre className="font-mono text-[9px] text-slate-600 bg-white p-3 rounded-lg border border-slate-150 overflow-x-auto leading-relaxed">
{`{
  id: string,
  name: "Matt laminate film overall coat",
  type: "lamination | folding | perfect binding",
  costType: "per sheet | per job | per book",
  costAmount: 2.80,
  setupCost: 250,
  markupPercent: 30,
  active: boolean
}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <ShieldCheck size={16} className="text-emerald-650" />
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">
                  Scalable App Architecture & Automation Opportunities
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-normal">
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-700">1. Hybrid Client-Server Architecture</h5>
                  <p>
                    For production-ready deployments, we recommend housing these formula calculations on an Express backend module (`/api/litho/estimate`). Client inputs are posted securely to ensure supplier baseline sheets-costs are never leaked in client-side HTML/JS traces.
                  </p>
                  <p className="bg-slate-50 p-3 rounded-xl border font-mono text-[10px] text-slate-600">
                    GET /api/litho/calculate?qty=1000&size=A5&pages=64
                  </p>
                </div>

                <div className="space-y-3">
                  <h5 className="font-bold text-slate-700">2. Production Estimator Automation Opportunities</h5>
                  <ul className="list-disc pl-5 space-y-1 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 font-semibold text-emerald-850">
                    <li><strong>Supplier Pricing API Liners:</strong> Hook paper costs dynamically to Antalis/Falcon supplier XML rates to hedge against paper price and exchange rate volatility.</li>
                    <li><strong>Online Proof Previewing Automation:</strong> Auto-impose high-resolution uploaded PDFs onto digital 3D mockup widgets using standard PDF libraries.</li>
                    <li><strong>ERP Barcode Job Dispatch:</strong> Generate a unique barcode on every Job Card to track labor, time sheets, and plate usage on factory floor terminal tablets.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Info size={16} className="text-slate-500" />
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">
                  South African Print Production Terminology Reference Guide
                </h4>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <strong className="text-slate-800">GSM</strong>
                  <p className="text-[10px] text-slate-500">Grams per Square Metre. Weight classification indicating paper sheet thickness.</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <strong className="text-slate-800">Imposition / Fits</strong>
                  <p className="text-[10px] text-slate-500">The layout orientation arranging finished pages over commercial parent sheets.</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <strong className="text-slate-800">Make-Ready Waste</strong>
                  <p className="text-[10px] text-slate-500">Pre-run trial setup sheets wasted to calibrate ink fountains onto plate frames.</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <strong className="text-slate-800">Click Charges</strong>
                  <p className="text-[10px] text-slate-500">Dynamic per-side click utility fees billed on high-performance digital lasers.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
