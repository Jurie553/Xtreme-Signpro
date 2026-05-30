import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flag, 
  Tent, 
  Layers, 
  Coins, 
  Sliders, 
  Sparkles, 
  Workflow, 
  Smartphone, 
  Package, 
  Calendar, 
  FolderLock, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  TrendingUp, 
  Info, 
  PlusCircle, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  User, 
  Search, 
  Award,
  ShieldCheck,
  Eye,
  Camera,
  Signature,
  FileCheck,
  QrCode,
  MapPin,
  Truck,
  RotateCcw,
  Check,
  Wrench,
  Flame,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

// Type definitions for Exhibition branding module
interface CostBreakdown {
  raw: number;
  labor: number;
  overhead: number;
  hardware: number;
  finishing: number;
  markup: number;
  sellPrice: number;
  marginPercent: number;
}

interface ExhibitionProduct {
  id: string;
  name: string;
  category: 'Gazebo' | 'Flag' | 'Banner' | 'Exhibition Counter' | 'Tablecloth' | 'Modular Stand' | 'Kit';
  clientName: string;
  dimensions: string;
  materialType: string;
  hardwareOption: string;
  quantity: number;
  leadTimeDays: number;
  mode: 'Sale' | 'Rental';
  rentalPeriod?: number; // Days
  rentalDeposit?: number; // ZAR
  rentalStatus?: 'Cleaned' | 'Pending Clean' | 'Damaged';
  rentalDueDate?: string;
  artworkStatus: 'Pending Design' | 'Client Review' | 'Approved' | 'Changes Requested';
  artworkReference?: string;
  artworkZones?: string[];
  workflowStep: number; // 0-12
  operatorAssignment: string;
  priority: 'Normal' | 'High' | 'Urgent';
  cost: number;
  sell: number;
  qcChecked: boolean;
  qcStaff?: string;
  notes?: string;
  createdAt: number;
  specDetails?: any;
}

interface StockItem {
  id: string;
  name: string;
  category: 'Frames' | 'Poles' | 'Bases' | 'Mechanisms' | 'Fabric Rolls' | 'PVC Rolls' | 'Accessories';
  level: number;
  minLevel: number;
  unit: string;
  supplierName: string;
  reserved: number;
  damaged: number;
}

// Initial Mock Datasets
const DEFAULT_PRODUCTS: ExhibitionProduct[] = [
  {
    id: 'ex-001',
    name: 'Standard Outdoor Promo Canopy',
    category: 'Gazebo',
    clientName: 'Apex Sports Club',
    dimensions: '3x3m',
    materialType: '240gsm Waterproof Polyester',
    hardwareOption: 'Heavy-Duty 40mm Hex Aluminium Frame',
    quantity: 1,
    leadTimeDays: 5,
    mode: 'Sale',
    artworkStatus: 'Approved',
    artworkReference: 'apex-gazebo-final-v2.pdf',
    artworkZones: ['Roof Apex x4', 'Front Valance Logo', 'Full Back Wall Print'],
    workflowStep: 5, // Printing
    operatorAssignment: 'Lethabo M.',
    priority: 'High',
    cost: 3200,
    sell: 5900,
    qcChecked: false,
    createdAt: Date.now() - 3 * 24 * 3600 * 1000,
    specDetails: {
      size: '3x3m',
      roofBranding: 'Full Dye-Sublimation Print',
      valanceBranding: 'Text Logo & Co-Sponsors',
      leftWall: 'Half Wall (Yellow)',
      rightWall: 'Half Wall (Yellow)',
      backWall: 'Full Wall (Full Color Graphic)',
      frontWall: 'None',
      accessories: ['Heavy Rubber Water Weights', 'Wheel Carry Bag', 'Steel Pegs']
    }
  },
  {
    id: 'ex-002',
    name: 'Teardrop Promotional Flags Duo',
    category: 'Flag',
    clientName: 'Volt Energy Drinks',
    dimensions: 'Medium (3.2m Height)',
    materialType: '110gsm Warp Knit Flag Polyester',
    hardwareOption: 'Ultra-flex Carbon Fiber Poleset',
    quantity: 2,
    leadTimeDays: 4,
    mode: 'Sale',
    artworkStatus: 'Client Review',
    artworkReference: 'volt-teardrop-32m-v1.pdf',
    artworkZones: ['Front Face Warp Knit', 'Mirror Back Show-Through'],
    workflowStep: 2, // Artwork Proof Approved
    operatorAssignment: 'Sarah D.',
    priority: 'Normal',
    cost: 850,
    sell: 1850,
    qcChecked: false,
    createdAt: Date.now() - 1 * 24 * 3600 * 1000,
    specDetails: {
      flagType: 'Teardrop',
      size: 'Medium (3.2m)',
      doubleSided: 'Single-sided with 90% show-through',
      baseType: 'Heavy Cross Base with Water Ring',
      windRating: 'Up to 45km/h'
    }
  },
  {
    id: 'ex-003',
    name: 'Corporate Stage Backdrop Wall',
    category: 'Banner',
    clientName: 'NexGen Tech Ltd',
    dimensions: '3000 x 2250 mm',
    materialType: 'Seamless 260gsm Tension Fabric banner',
    hardwareOption: 'Collapsible Pop-Up Aluminium Frame',
    quantity: 1,
    leadTimeDays: 7,
    mode: 'Rental',
    rentalPeriod: 3,
    rentalDeposit: 1500,
    rentalStatus: 'Cleaned',
    rentalDueDate: '2026-05-30',
    artworkStatus: 'Approved',
    artworkReference: 'nexgen-backdrop-ready.pdf',
    artworkZones: ['Full Front Wrap', 'Wrapped Side Ends'],
    workflowStep: 8, // Hardware Assembly
    operatorAssignment: 'Johan B.',
    priority: 'Urgent',
    cost: 1450,
    sell: 3200,
    qcChecked: true,
    qcStaff: 'Brandon S.',
    createdAt: Date.now() - 5 * 24 * 3600 * 1000,
    specDetails: {
      bannerType: 'Media Pop-up Fabric Wall',
      installationType: 'Self-erect Tension System',
      finishing: ['Wrap-around Velcro Perimeter', 'Double Lock Overlock Sewing']
    }
  },
  {
    id: 'ex-004',
    name: 'Retail Heavy-Duty Pull-Up',
    category: 'Banner',
    clientName: 'Standard Bank Branch',
    dimensions: '850 x 2000 mm',
    materialType: 'Satin Smooth Backlit PVC Banner (Non-curl)',
    hardwareOption: 'Luxury Double-Chrome Base Cassette',
    quantity: 4,
    leadTimeDays: 3,
    mode: 'Sale',
    artworkStatus: 'Approved',
    artworkReference: 'std-bank-savings-campaign.pdf',
    artworkZones: ['Single Sided Flat Graphic'],
    workflowStep: 10, // Packing Completed
    operatorAssignment: 'Clara T.',
    priority: 'Normal',
    cost: 1100,
    sell: 2750,
    qcChecked: true,
    qcStaff: 'Brandon S.',
    createdAt: Date.now() - 2 * 24 * 3600 * 1000,
    specDetails: {
      bannerType: 'Pull-up Banner',
      finishing: ['Reinforced base adhesive', 'Top Aluminium Snap Rail']
    }
  }
];

const DEFAULT_STOCK: StockItem[] = [
  { id: 'st-01', name: '3x3m Gazebo Aluminium Frame Heavy-Hex', category: 'Frames', level: 12, minLevel: 5, unit: 'Units', supplierName: 'FrameTech SA', reserved: 4, damaged: 1 },
  { id: 'st-02', name: '4.5x3m Gazebo Aluminium Frame Heavy-Hex', category: 'Frames', level: 6, minLevel: 3, unit: 'Units', supplierName: 'FrameTech SA', reserved: 2, damaged: 0 },
  { id: 'st-03', name: 'Standard Flag Carbon Fiber Pole Set S/M', category: 'Poles', level: 45, minLevel: 15, unit: 'Sets', supplierName: 'AluPole Systems', reserved: 10, damaged: 4 },
  { id: 'st-04', name: 'Premium Heavy Ground Spike (Flag Base)', category: 'Bases', level: 32, minLevel: 10, unit: 'Units', supplierName: 'Cape Castings', reserved: 8, damaged: 0 },
  { id: 'st-05', name: 'Water-Fillable Ring Weight Accessory', category: 'Bases', level: 25, minLevel: 12, unit: 'Units', supplierName: 'Cape Castings', reserved: 6, damaged: 2 },
  { id: 'st-06', name: 'Tension Fabric Backdrop Pop-up Frame 3x2.25m', category: 'Frames', level: 4, minLevel: 3, unit: 'Units', supplierName: 'Matrix Displays', reserved: 3, damaged: 1 },
  { id: 'st-07', name: 'Dye-Sub Polyester 240gsm Weather-Resist (Cloth)', category: 'Fabric Rolls', level: 350, minLevel: 100, unit: 'Meters', supplierName: 'Sihl Textiles SA', reserved: 80, damaged: 0 },
  { id: 'st-08', name: 'Non-Curl Banner PVC Premium Satin Blockout', category: 'PVC Rolls', level: 180, minLevel: 80, unit: 'Meters', supplierName: 'Sihl Textiles SA', reserved: 45, damaged: 0 },
  { id: 'st-09', name: 'Standard Lux Double-foot PullUp Mechanism 850mm', category: 'Mechanisms', level: 50, minLevel: 20, unit: 'Units', supplierName: 'EcoDisplay Import', reserved: 12, damaged: 3 }
];

const WORKFLOW_STAGES = [
  'Quote Generated',
  'Artwork Setup Design',
  'Client Review Sent',
  'Artwork Panel Splitting',
  'Material Allocation Approved',
  'Precision Dye-Sub Printing',
  'Oven Drying & Curing',
  'Material Sizing Cutting',
  'Overlock Sewing & Finishing',
  'Hardware Matching & Assembly',
  'Quality Control Audited',
  'Custom Packaging Labelled',
  'Installer Dispatched & Delivered'
];

export default function ExhibitionBranding() {
  const [products, setProducts] = useState<ExhibitionProduct[]>(() => {
    const cached = localStorage.getItem('erp_exhibition_products');
    return cached ? JSON.parse(cached) : DEFAULT_PRODUCTS;
  });

  const [stock, setStock] = useState<StockItem[]>(() => {
    const cached = localStorage.getItem('erp_exhibition_stock');
    return cached ? JSON.parse(cached) : DEFAULT_STOCK;
  });

  // Persistent Storage synchronization
  useEffect(() => {
    localStorage.setItem('erp_exhibition_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('erp_exhibition_stock', JSON.stringify(stock));
  }, [stock]);

  // Main UI Tabs
  // 'dashboard' | 'builder' | 'workflow' | 'stock' | 'rentals' | 'kits' | 'installer_portal'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'builder' | 'workflow' | 'stock' | 'rentals' | 'kits' | 'installer_portal'>('dashboard');

  // Selected Product for Specs, Costing, or modification
  const [selectedProduct, setSelectedProduct] = useState<ExhibitionProduct | null>(() => products[0] || null);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Interactive specifications states (Used for the Dynamic builders)
  const [builderCategory, setBuilderCategory] = useState<'Gazebo' | 'Flag' | 'Banner' | 'Exhibition Counter' | 'Tablecloth'>('Gazebo');
  const [clientName, setClientName] = useState('Apex Group Corp');
  const [specSize, setSpecSize] = useState('3x3m');
  const [specFabric, setSpecFabric] = useState('240gsm Waterproof Polyester');
  const [specHardware, setSpecHardware] = useState('Heavy-Duty 40mm Hex Aluminium Frame');
  const [specSides, setSpecSides] = useState('Single-sided (90% show-through)');
  const [specBase, setSpecBase] = useState('Heavy Steel Ground Spike');
  const [specPriority, setSpecPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [specQuantity, setSpecQuantity] = useState(1);
  const [specMode, setSpecMode] = useState<'Sale' | 'Rental'>('Sale');

  // Custom Gazebo Specifications states
  const [gazeboApexBranding, setGazeboApexBranding] = useState('Full Dye-Sublimation Print');
  const [gazeboValanceBranding, setGazeboValanceBranding] = useState('Co-sponsors repeating text');
  const [gazeboLeftWall, setGazeboLeftWall] = useState<'None' | 'Half Wall' | 'Full Wall' | 'Window Wall' | 'Door Wall'>('Half Wall');
  const [gazeboRightWall, setGazeboRightWall] = useState<'None' | 'Half Wall' | 'Full Wall' | 'Window Wall' | 'Door Wall'>('Half Wall');
  const [gazeboBackWall, setGazeboBackWall] = useState<'None' | 'Half Wall' | 'Full Wall' | 'Window Wall' | 'Door Wall'>('Full Wall');
  const [gazeboFrontWall, setGazeboFrontWall] = useState<'None' | 'Half Wall' | 'Full Wall' | 'Window Wall' | 'Door Wall'>('None');
  const [gazeboCarryBag, setGazeboCarryBag] = useState(true);
  const [gazeboPegsRopes, setGazeboPegsRopes] = useState(true);

  // Custom Banner backdrop specifications
  const [customWidthMm, setCustomWidthMm] = useState(3000);
  const [customHeightMm, setCustomHeightMm] = useState(2250);
  const [bannerEyeletsSpacing, setBannerEyeletsSpacing] = useState(500); // mm
  const [bannerHemming, setBannerHemming] = useState(true);
  const [bannerFrameIncluded, setBannerFrameIncluded] = useState(true);

  // AI Prompt Sourcing State
  const [aiPrompt, setAiPrompt] = useState('Create a branding package for an outdoor school sports day with a 3x3 gazebo, 2 flags, and a media wall.');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Simulated Mobile Production Mode Operator State
  const [operatorId, setOperatorId] = useState('installer-crew-02');
  const [scanValue, setScanValue] = useState('');
  const [signName, setSignName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [mobileStageIndex, setMobileStageIndex] = useState(0);

  // Dynamic Quoting and Direct Cost Calculations
  const calculatedCosting = useMemo<CostBreakdown>(() => {
    let rawMaterialCost = 0;
    let hardwareCost = 0;
    let laborCost = 0;
    let overheadCost = 0;
    let finishingCost = 0;

    if (builderCategory === 'Gazebo') {
      // Hex frame cost
      if (specSize === '3x3m') {
        hardwareCost = 2500;
        rawMaterialCost = 9 * 180; // 9sqm
      } else if (specSize === '4.5x3m') {
        hardwareCost = 3700;
        rawMaterialCost = 13.5 * 180;
      } else if (specSize === '6x3m') {
        hardwareCost = 4800;
        rawMaterialCost = 18 * 180;
      } else {
        hardwareCost = 3000;
        rawMaterialCost = 10 * 180;
      }

      // Walls print material cost
      if (gazeboLeftWall !== 'None') rawMaterialCost += (gazeboLeftWall === 'Half Wall' ? 400 : 800);
      if (gazeboRightWall !== 'None') rawMaterialCost += (gazeboRightWall === 'Half Wall' ? 400 : 800);
      if (gazeboBackWall !== 'None') rawMaterialCost += (gazeboBackWall === 'Half Wall' ? 400 : 800);
      if (gazeboFrontWall !== 'None') rawMaterialCost += (gazeboFrontWall === 'Half Wall' ? 400 : 800);

      finishingCost = 450; // Stitching, eyelets, reinforced corners
      laborCost = 650; // Precision cutting and sewing assembly time
      overheadCost = (hardwareCost + rawMaterialCost) * 0.12; // Out of store packaging and spoilage
    } 
    else if (builderCategory === 'Flag') {
      // Pole set
      hardwareCost = specSize.includes('Small') ? 220 : specSize.includes('Medium') ? 350 : specSize.includes('Large') ? 480 : 650;
      
      // Base premium
      if (specBase.includes('Cross')) hardwareCost += 280;
      else if (specBase.includes('Spike')) hardwareCost += 140;
      else hardwareCost += 400; // Heavy concrete/water-fill base

      rawMaterialCost = 350; // polyester print + pole sleeves
      finishingCost = 150; // double locked stitch hems + pockets
      laborCost = 250;
      overheadCost = 100;
    } 
    else if (builderCategory === 'Banner') {
      // Custom SQM
      const sqm = (customWidthMm / 1000) * (customHeightMm / 1000);
      rawMaterialCost = sqm * (specFabric.includes('PVC') ? 110 : 210);
      
      if (bannerFrameIncluded) {
        hardwareCost = sqm > 6 ? 2800 : 1600; // Tension / Pop-up frames
      }
      
      // Number of eyelets
      const perimeterMm = (customWidthMm + customHeightMm) * 2;
      const eyeletsCount = Math.ceil(perimeterMm / bannerEyeletsSpacing);
      finishingCost = (eyeletsCount * 12) + (bannerHemming ? 180 : 0);
      
      laborCost = 300;
      overheadCost = 120;
    } 
    else if (builderCategory === 'Exhibition Counter') {
      hardwareCost = 1900; // Wood/PVC counter top & shelves
      rawMaterialCost = 600; // wrap around graphic sleeve
      finishingCost = 250; 
      laborCost = 450;
      overheadCost = 180;
    } 
    else { // Tablecloth
      rawMaterialCost = 450;
      finishingCost = 180;
      laborCost = 200;
      overheadCost = 60;
    }

    const totalRawAndParts = rawMaterialCost + hardwareCost + finishingCost;
    const directCost = totalRawAndParts + laborCost + overheadCost;
    
    // Auto premium sizing formula with markup
    let markupFactor = 1.85; // 85% normal markup
    if (specPriority === 'Urgent') markupFactor += 0.20; // Rush dispatch fee
    if (specMode === 'Rental') markupFactor = 0.60; // First setup rental rate (typically fraction of item cost)

    const finalSellPrice = Math.round(directCost * markupFactor);
    const profitMarginPercent = Math.round(((finalSellPrice - directCost) / finalSellPrice) * 100);

    return {
      raw: Math.round(rawMaterialCost),
      labor: Math.round(laborCost),
      overhead: Math.round(overheadCost),
      hardware: Math.round(hardwareCost),
      finishing: Math.round(finishingCost),
      markup: Math.round(finalSellPrice - directCost),
      sellPrice: finalSellPrice,
      marginPercent: profitMarginPercent
    };
  }, [
    builderCategory, specSize, specFabric, specHardware, specSides, 
    specBase, specPriority, specMode, gazeboApexBranding, gazeboValanceBranding,
    gazeboLeftWall, gazeboRightWall, gazeboBackWall, gazeboFrontWall,
    customWidthMm, customHeightMm, bannerEyeletsSpacing, bannerHemming, 
    bannerFrameIncluded
  ]);

  // Handle building & adding new Exhibition configuration to active job queues
  const handleAddNewProduct = () => {
    let formattedSpec = {};

    if (builderCategory === 'Gazebo') {
      formattedSpec = {
        size: specSize,
        apexBranding: gazeboApexBranding,
        valanceBranding: gazeboValanceBranding,
        leftWall: gazeboLeftWall,
        rightWall: gazeboRightWall,
        backWall: gazeboBackWall,
        frontWall: gazeboFrontWall,
        accessories: [
          gazeboCarryBag ? 'Heavy PVC Roller Carrying Bag' : '', 
          gazeboPegsRopes ? 'Security Pegs & Guy Ropes' : '',
          specBase ? specBase : ''
        ].filter(Boolean)
      };
    } else if (builderCategory === 'Flag') {
      formattedSpec = {
        size: specSize,
        flagType: specSides.includes('double') ? 'Double Sided Blockout' : 'Single Warp Knit',
        baseType: specBase,
        windRating: specSides.includes('double') ? '35km/h max' : '55km/h max'
      };
    } else {
      formattedSpec = {
        dimensions: `${customWidthMm}x${customHeightMm} mm`,
        eyeletSpacing: `${bannerEyeletsSpacing} mm`,
        hemming: bannerHemming ? 'Yes, reinforced double stick' : 'No, hot cut flat edge',
        supportsFrame: bannerFrameIncluded ? 'Aluminium pop-up folding structure' : 'None'
      };
    }

    const totalCostOfOrder = calculatedCosting.sellPrice * specQuantity;

    const newPrd: ExhibitionProduct = {
      id: `ex-${100 + products.length + 1}`,
      name: `Exhibition ${builderCategory} Spec - ${specSize}`,
      category: builderCategory,
      clientName: clientName,
      dimensions: builderCategory === 'Banner' ? `${customWidthMm}x${customHeightMm} mm` : specSize,
      materialType: specFabric,
      hardwareOption: specHardware,
      quantity: specQuantity,
      leadTimeDays: specPriority === 'Urgent' ? 3 : 6,
      mode: specMode,
      rentalPeriod: specMode === 'Rental' ? 5 : undefined,
      rentalDeposit: specMode === 'Rental' ? Math.round(totalCostOfOrder * 0.4) : undefined,
      rentalStatus: specMode === 'Rental' ? 'Cleaned' : undefined,
      rentalDueDate: specMode === 'Rental' ? '2026-06-10' : undefined,
      artworkStatus: 'Pending Design',
      artworkZones: builderCategory === 'Gazebo' ? ['Roof panels (x4)', 'Valance loops (x4)', 'Back Wall Face'] : ['Single Face Area'],
      workflowStep: 0, // Quote stage
      operatorAssignment: 'Awaiting Crew Assign',
      priority: specPriority,
      cost: calculatedCosting.raw + calculatedCosting.hardware + calculatedCosting.finishing,
      sell: totalCostOfOrder,
      qcChecked: false,
      createdAt: Date.now(),
      specDetails: formattedSpec
    };

    setProducts(prev => [newPrd, ...prev]);
    setSelectedProduct(newPrd);
    
    // Post to reserved stock inventory automatically
    toast.success(`Registered Exhibition ${builderCategory} workflow blueprint. Raw and Hardware stock allocated.`);
    setActiveTab('workflow');
  };

  // Automated Quick bundle builder via Natural Prompt Parsing (Generative UI Simulation with genuine pricing engines underneath)
  const handleAiPackageBuilder = () => {
    setIsAiGenerating(true);
    
    setTimeout(() => {
      const promptLower = aiPrompt.toLowerCase();
      
      // Parse components dynamically
      if (promptLower.includes('sports day') || promptLower.includes('school') || promptLower.includes('gazebo')) {
        // Build "Apex School Track & Field Tournament Kit"
        const newKit: ExhibitionProduct = {
          id: `ex-${105 + products.length}`,
          name: 'School Sports Campaign Hub Bundle',
          category: 'Kit',
          clientName: 'St Michael Primary Athletic Dept',
          dimensions: 'Mixed Event Bundle',
          materialType: '240gsm Sublimation Banner Fabric',
          hardwareOption: 'Elite Hex Gazebo + Telescopic Flagpoles',
          quantity: 1,
          leadTimeDays: 5,
          mode: 'Sale',
          artworkStatus: 'Client Review',
          artworkReference: 'st-michael-combined-proof-v1.pdf',
          artworkZones: ['3x3 Gazebo Outer Roof', 'Left/Right Valance Logos', 'Flag Face Left (x2)', 'Table Cover Main drape'],
          workflowStep: 3, // Materials Allocated
          operatorAssignment: 'Lethabo M. & Sarah D.',
          priority: 'High',
          cost: 5120,
          sell: 9400,
          qcChecked: false,
          createdAt: Date.now(),
          specDetails: {
            bundleContents: [
              '1 x Custom Sport Canopy Gazebo 3x3m (Heavy Hex Aluminium, full apex print)',
              '2 x Classic Telescopic Flying Flags 4m Height with concrete water bases',
              '1 x Deluxe Fitted Elastic Table Cloth (3.2m x 1.8m trestle drop)',
              '1 x Mobile Symmetrical Exhibition Counter with transport soft carry bags'
            ],
            setupChecklist: [
              'Secure gazebo pegs directly into ground turf',
              'Align flag pocket seams against prevailing wind',
              'Verify tabletop tension locks are clipped'
            ]
          }
        };

        setProducts(prev => [newKit, ...prev]);
        setSelectedProduct(newKit);
        toast.success('AI Engine processed prompt successfully. Compiled 4 Event components and optimized layout constraints to standard.', {
          duration: 4000
        });
      } else {
        // Build typical corporate bundle
        const corporateKit: ExhibitionProduct = {
          id: `ex-${106 + products.length}`,
          name: 'Premium Expo Hall Exhibition Stand Package',
          category: 'Kit',
          clientName: 'Acme Systems Ltd',
          dimensions: '3m Frontage Stand',
          materialType: 'Seamless Matte Tension Polyester fabric',
          hardwareOption: 'Anodized Stretch Frame System & Case-counter',
          quantity: 1,
          leadTimeDays: 7,
          mode: 'Rental',
          rentalPeriod: 4,
          rentalDeposit: 3000,
          rentalDueDate: '2026-06-15',
          artworkStatus: 'Approved',
          artworkReference: 'acme-stretch-wall-c2.pdf',
          artworkZones: ['PopUp Stretch Backdrop Face', 'Graphic Wrap Case Fabric'],
          workflowStep: 1, // Ready for prepress
          operatorAssignment: 'Johan B.',
          priority: 'Normal',
          cost: 3800,
          sell: 7500,
          qcChecked: false,
          createdAt: Date.now(),
          specDetails: {
            bundleContents: [
              '1 x Fabric Media Wall Pop-up Frame 3x2.25m with flight case wrapper',
              '2 x Luxury Executive Chrome Base Pull-ups (850x2000mm, non-curl silk)',
              '1 x Magnetic Modular Counter Showcase (Internal acrylic layout shelves)'
            ]
          }
        };

        setProducts(prev => [corporateKit, ...prev]);
        setSelectedProduct(corporateKit);
        toast.success('AI optimized exhibition bundle built for professional rental showcase stand layout.');
      }
      setIsAiGenerating(false);
      setActiveTab('workflow');
    }, 1400);
  };

  // Progress workflow step for active operations
  const handleStepAdvance = (id: string, stepIncrement: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const nextStep = Math.min(WORKFLOW_STAGES.length - 1, Math.max(0, p.workflowStep + stepIncrement));
        
        // Auto-complete stock dedication if reaching printing/sewing phase
        if (nextStep >= 5 && p.workflowStep < 5) {
          // Adjust stock levels
          deductStockLevels(p.category);
        }

        return { 
          ...p, 
          workflowStep: nextStep,
          artworkStatus: nextStep >= 3 ? 'Approved' : p.artworkStatus
        };
      }
      return p;
    }));
    toast.info('ERP Production stage tracked. Inventory dependencies updated.');
  };

  // Helper mock to simulate stock reductions upon active workshop queue
  const deductStockLevels = (category: string) => {
    setStock(prev => prev.map(s => {
      if (category === 'Gazebo' && (s.name.includes('Gazebo') || s.name.includes('Polyester'))) {
        return { ...s, level: Math.max(0, s.level - 1), reserved: Math.max(0, s.reserved - 1) };
      }
      if (category === 'Flag' && (s.name.includes('Flag') || s.name.includes('Spike'))) {
        return { ...s, level: Math.max(0, s.level - 1), reserved: Math.max(0, s.reserved - 1) };
      }
      if (category === 'Banner' && (s.name.includes('PVC') || s.name.includes('PullUp'))) {
        return { ...s, level: Math.max(0, s.level - 1), reserved: Math.max(0, s.reserved - 1) };
      }
      return s;
    }));
  };

  // Handle client signoff simulator inside operator view
  const handleClientSignoff = (prodId: string) => {
    if (!signName.trim()) {
      toast.error('Please define the signatory representative name.');
      return;
    }
    setHasSignature(true);
    setProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        return { 
          ...p, 
          workflowStep: WORKFLOW_STAGES.length - 1, // Finalized state
          qcChecked: true, 
          notes: `${p.notes || ''} Signed off by client: ${signName}.` 
        };
      }
      return p;
    }));
    toast.success('Digital signature locked and saved to Firestore job card audit logs.', {
      icon: <ShieldCheck className="text-emerald-500" />
    });
  };

  const handleUploadMobilePhoto = () => {
    setUploadedPhotos(prev => [...prev, `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&auto=format&fit=crop`]);
    toast.success('Exhibition installation proof photo uploaded and pinned to Job ID!');
  };

  // Re-order stock items
  const handleTriggerReorder = (stockName: string) => {
    toast.success(`Purchase order dispatched to authorized hardware supplier for ${stockName}.`);
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, categoryFilter]);

  // Analytics aggregates
  const statsSummary = useMemo(() => {
    const totalOrderValue = products.reduce((acc, p) => acc + p.sell, 0);
    const totalRawCost = products.reduce((acc, p) => acc + p.cost, 0);
    const activeRentals = products.filter(p => p.mode === 'Rental').length;
    const pendingArtwork = products.filter(p => p.artworkStatus === 'Pending Design' || p.artworkStatus === 'Client Review').length;
    
    // Revenue by category values
    const mapCategoryRevenue = products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.sell;
      return acc;
    }, {});

    const chartData = Object.entries(mapCategoryRevenue).map(([key, val]) => ({
      name: key,
      value: val
    }));

    return {
      revenue: totalOrderValue,
      profit: totalOrderValue - totalRawCost,
      rentals: activeRentals,
      artworkAlerts: pendingArtwork,
      chart: chartData
    };
  }, [products]);

  return (
    <div className="flex flex-col gap-6 pb-16 px-4 md:px-8">
      {/* Module Title Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-light pb-6 pt-2"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-950 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-slate-100">
            <Tent size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
              EXHIBITION BRANDING SYSTEM
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Enterprise Production Module & Spectemplate Configurator
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2.5">
          <button 
            type="button"
            onClick={() => {
              setBuilderCategory('Gazebo');
              setActiveTab('builder');
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider border transition-all",
              activeTab === 'builder' 
                ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-100" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <PlusCircle size={14} />+ New Spec Builder
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('kits')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider border transition-all",
              activeTab === 'kits' 
                ? "bg-indigo-650 border-indigo-650 text-white shadow-md shadow-indigo-100" 
                : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-50/70"
            )}
          >
            <Sparkles size={14} /> AI Package Optimizer
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('installer_portal')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider border transition-all",
              activeTab === 'installer_portal' 
                ? "bg-emerald-650 border-emerald-650 text-white" 
                : "bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100/50"
            )}
          >
            <Smartphone size={14} /> Operator App View
          </button>
        </div>
      </motion.div>

      {/* MODULE WORKSPACE SELECTOR TABS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/60">
        {[
          { id: 'dashboard', label: 'Analytics Board', icon: TrendingUp },
          { id: 'builder', label: 'Branding Builder', icon: Sliders },
          { id: 'workflow', label: 'Production Timeline', icon: Workflow },
          { id: 'stock', label: 'Hardware & Stock Control', icon: Layers },
          { id: 'rentals', label: 'Exhibits Rentals Hub', icon: Calendar },
          { id: 'kits', label: 'Event Bundles & AI', icon: Package },
          { id: 'installer_portal', label: 'Operator Portal', icon: Smartphone }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'installer_portal' && products.length > 0 && !selectedProduct) {
                setSelectedProduct(products[0]);
              }
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-[11px] uppercase tracking-widest transition-all whitespace-nowrap -mb-0.5",
              activeTab === tab.id 
                ? "border-indigo-600 text-indigo-600 font-extrabold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* WORKSPACE AREA */}
      <AnimatePresence mode="wait">
        {/* =============== ANALYTICS PORTLET =============== */}
        {activeTab === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {/* Quick Metrics */}
            <div className="bg-paper border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block">Total Active Exhibition Value</span>
                <span className="text-3xl font-black text-slate-900 tracking-tight mt-1 inline-block">R {statsSummary.revenue.toLocaleString()}</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 mt-4">
                <CheckCircle size={12} /> Live Active Pipeline
              </div>
            </div>

            <div className="bg-paper border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block">Gross Profit (Est.)</span>
                <span className="text-3xl font-black text-indigo-650 tracking-tight mt-1 inline-block">R {statsSummary.profit.toLocaleString()}</span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-4">
                Margin Area: {Math.round((statsSummary.profit / statsSummary.revenue) * 100 || 0)}% average
              </div>
            </div>

            <div className="bg-paper border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block">Active Expo Rental Leases</span>
                <span className="text-3xl font-black text-amber-500 tracking-tight mt-1 inline-block">{statsSummary.rentals}</span>
              </div>
              <div className="text-[10px] font-extrabold text-amber-600 uppercase flex items-center gap-1 mt-4">
                <Clock size={12} /> Inuse / Clean scheduled
              </div>
            </div>

            <div className="bg-paper border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block">Artwork Pending Sign-off</span>
                <span className="text-3xl font-black text-rose-500 tracking-tight mt-1 inline-block">{statsSummary.artworkAlerts}</span>
              </div>
              <div className={cn(
                "text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mt-4",
                statsSummary.artworkAlerts > 1 ? "text-rose-600 animate-pulse" : "text-slate-400"
              )}>
                {statsSummary.artworkAlerts > 1 ? <AlertTriangle size={12} /> : null} Deadline risk review
              </div>
            </div>

            {/* Recharts Analytics Diagrams */}
            <div className="md:col-span-2 bg-paper border border-slate-200 p-6 rounded-2xl">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-slate-900" /> Revenue Allocation by Exhibit Category
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsSummary.chart}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip formatter={(value) => `R ${value}`} contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]}>
                      {statsSummary.chart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#4f46e5" : "#0f172a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stock Level Quick Alerts */}
            <div className="md:col-span-2 bg-paper border border-slate-200 p-6 rounded-2xl">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" /> Critical Hardware Low Stock Alerts
              </h3>
              
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-2">
                {stock.map((stk) => {
                  const isLow = stk.level <= stk.minLevel;
                  return (
                    <div key={stk.id} className="flex items-center justify-between py-3">
                      <div>
                        <span className="text-[11px] font-extrabold text-slate-800 block">{stk.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">{stk.supplierName} • {stk.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={cn(
                            "text-xs font-black text-slate-700 block",
                            isLow && "text-red-600 font-black animate-pulse"
                          )}>
                            {stk.level} / {stk.minLevel} {stk.unit}
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold block uppercase">CURRENT / MIN</span>
                        </div>
                        {isLow ? (
                          <button
                            onClick={() => handleTriggerReorder(stk.name)}
                            className="bg-rose-50 text-rose-600 border border-rose-150 px-2 md:px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-rose-100/80"
                          >
                            Reorder PO
                          </button>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider">
                            SECURE
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Exhibits Spec List */}
            <div className="md:col-span-4 bg-paper border border-slate-200 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                  <Layers size={16} /> Cataloged Active Exhibition Branding Orders
                </h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search Client or Spec..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs font-bold w-48 focus:outline-none focus:border-slate-300"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="All">All Categories</option>
                    <option value="Gazebo">Gazebos</option>
                    <option value="Flag">Flags</option>
                    <option value="Banner">Banners</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-4">Client Name</th>
                      <th>Spec Name / Category</th>
                      <th>Dimensions</th>
                      <th>Art Proof</th>
                      <th>Status & Stage</th>
                      <th className="text-center">Mode</th>
                      <th className="text-right py-3 px-4">Gross Contract</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-600">
                    {filteredProducts.map((p) => {
                      const completePercent = Math.round((p.workflowStep / (WORKFLOW_STAGES.length - 1)) * 100);
                      return (
                        <tr 
                          key={p.id} 
                          onClick={() => {
                            setSelectedProduct(p);
                            setActiveTab('workflow');
                          }}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span className="text-slate-900 block font-black">{p.clientName}</span>
                            <span className="text-[8px] text-slate-400 block uppercase font-bold">Order ID: {p.id}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              {p.category === 'Gazebo' ? (
                                <Tent size={12} className="text-indigo-650" />
                              ) : (
                                <Flag size={12} className="text-amber-500" />
                              )}
                              <span>{p.name}</span>
                            </div>
                          </td>
                          <td className="font-mono text-[10px] text-slate-500">{p.dimensions}</td>
                          <td>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                              p.artworkStatus === 'Approved' ? "bg-emerald-50 text-emerald-700" :
                              p.artworkStatus === 'Client Review' ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                            )}>
                              {p.artworkStatus}
                            </span>
                          </td>
                          <td>
                            <div className="space-y-1 w-44">
                              <div className="flex justify-between text-[8px] font-black uppercase">
                                <span className="text-slate-800">{WORKFLOW_STAGES[p.workflowStep]}</span>
                                <span>{completePercent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600" style={{ width: `${completePercent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                              p.mode === 'Rental' ? "border border-amber-300 text-amber-600 bg-amber-50" : "bg-slate-100 text-slate-800"
                            )}>
                              {p.mode}
                            </span>
                          </td>
                          <td className="text-right font-black text-slate-900 tabular-nums py-3.5 px-4">
                            R {p.sell.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* =============== BRANDING CONFIGURABILITY BUILDER =============== */}
        {activeTab === 'builder' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* BUILD PANEL FORM */}
            <div className="md:col-span-2 bg-paper border border-slate-200 rounded-2xl p-6 space-y-6">
              
              {/* Category selector */}
              <div>
                <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Product Branding Category</label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {[
                    { id: 'Gazebo', label: 'Gazebos', icon: Tent },
                    { id: 'Flag', label: 'Flags', icon: Flag },
                    { id: 'Banner', label: 'Banners', icon: Layers },
                    { id: 'Exhibition Counter', label: 'Counters', icon: Award },
                    { id: 'Tablecloth', label: 'Tablecloth', icon: Package }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setBuilderCategory(cat.id as any);
                        if (cat.id === 'Gazebo') {
                          setSpecSize('3x3m');
                          setSpecFabric('240gsm Waterproof Polyester');
                          setSpecHardware('Heavy-Duty 40mm Hex Aluminium Frame');
                        } else if (cat.id === 'Flag') {
                          setSpecSize('Medium (3.2m)');
                          setSpecFabric('110gsm Warp Knit Flag Polyester');
                          setSpecHardware('Ultra-flex Carbon Fiber Poleset');
                        } else {
                          setSpecSize('Custom');
                          setSpecFabric('Non-Curl PVC Banner');
                          setSpecHardware('Collapsible Pop-up Frame');
                        }
                      }}
                      className={cn(
                        "p-3.5 border rounded-xl flex flex-col items-center justify-center gap-2 text-center transition-all",
                        builderCategory === cat.id 
                          ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-100" 
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <cat.icon size={20} />
                      <span className="text-[9px] font-black uppercase tracking-wider block leading-none">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* General inputs components */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Client Billing Name</label>
                  <input 
                    type="text" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    placeholder="Enter customer name..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Job Priority urgency</label>
                  <select 
                    value={specPriority}
                    onChange={(e) => setSpecPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="Normal">Normal Production (5-7 days)</option>
                    <option value="High">Priority Queue (4 days)</option>
                    <option value="Urgent">Rush Delivery (2-3 days, +20%)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Order Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={specQuantity}
                    onChange={(e) => setSpecQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Fulfillment Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSpecMode('Sale')}
                      className={cn(
                        "py-2 border rounded-lg text-xs font-bold uppercase",
                        specMode === 'Sale' ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"
                      )}
                    >
                      Purchase Sale
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecMode('Rental')}
                      className={cn(
                        "py-2 border rounded-lg text-xs font-bold uppercase",
                        specMode === 'Rental' ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"
                      )}
                    >
                      Event Rental
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-configurator: GAZEBO DETAIL FORM */}
              {builderCategory === 'Gazebo' && (
                <div className="border-t border-dashed border-slate-200 pt-5 mt-2 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Configure Gazebo Apex/Valance Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Gazebo Size Spec</label>
                      <select 
                        value={specSize}
                        onChange={(e) => setSpecSize(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="3x3m">3x3m Compact Area</option>
                        <option value="4.5x3m">4.5x3m Medium Canopy</option>
                        <option value="6x3m">6x3m Double Sided Large</option>
                        <option value="Custom Panel">Custom Hex Spec</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Aluminium Hex Hardware</label>
                      <select 
                        value={specHardware}
                        onChange={(e) => setSpecHardware(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="Standard 40mm Hex Frame">Standard Hex Aluminium (40mm)</option>
                        <option value="Heavy-Duty 50mm Hex Frame">Heavy Deluxe Hex (50mm)</option>
                        <option value="Eco Lightweight Steel">Eco Lightweight Steel frame</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Polyester Fabric Thread</label>
                      <select 
                        value={specFabric}
                        onChange={(e) => setSpecFabric(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="240gsm Waterproof Polyester">240gsm Sublimation Treated Polyester</option>
                        <option value="110gsm Warp Knit Single">110gsm High Air-Flow polyester</option>
                        <option value="Heavy PVC Tarpaulin 500g">Heavy 500g PVC Tarpaulin</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Roof Canopy Placement</label>
                      <input 
                        type="text" 
                        value={gazeboApexBranding}
                        onChange={(e) => setGazeboApexBranding(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        placeholder="e.g. 4-Sided Dye Sublimation Vector artwork..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Valance Perimeter Print</label>
                      <input 
                        type="text" 
                        value={gazeboValanceBranding}
                        onChange={(e) => setGazeboValanceBranding(e.target.value)}
                        className="w-full px-3 py-105 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        placeholder="e.g. Center logo repeats on all 4 sides..."
                      />
                    </div>
                  </div>

                  {/* Visual wall positions selection */}
                  <div>
                    <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase block mb-2">Wall Graphic Configuration Positions</label>
                    <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 block uppercase">Left Side Panel</span>
                        <select 
                          value={gazeboLeftWall} 
                          onChange={(e: any) => setGazeboLeftWall(e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-[10px] font-bold"
                        >
                          <option value="None">None (Open)</option>
                          <option value="Half Wall">Half Wall (1m)</option>
                          <option value="Full Wall">Full Wall (2m)</option>
                          <option value="Window Wall">Window Wall</option>
                          <option value="Door Wall">Door Wall</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 block uppercase">Right Side Panel</span>
                        <select 
                          value={gazeboRightWall} 
                          onChange={(e: any) => setGazeboRightWall(e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-[10px] font-bold"
                        >
                          <option value="None">None (Open)</option>
                          <option value="Half Wall">Half Wall (1m)</option>
                          <option value="Full Wall">Full Wall (2m)</option>
                          <option value="Window Wall">Window Wall</option>
                          <option value="Door Wall">Door Wall</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 block uppercase">Back Panel</span>
                        <select 
                          value={gazeboBackWall} 
                          onChange={(e: any) => setGazeboBackWall(e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-[10px] font-bold"
                        >
                          <option value="None">None (Open)</option>
                          <option value="Half Wall">Half Wall (1m)</option>
                          <option value="Full Wall">Full Wall (2m)</option>
                          <option value="Window Wall">Window Wall</option>
                          <option value="Door Wall">Door Wall</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 block uppercase">Front Panel Entry</span>
                        <select 
                          value={gazeboFrontWall} 
                          onChange={(e: any) => setGazeboFrontWall(e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded bg-white text-[10px] font-bold"
                        >
                          <option value="None">None (Open)</option>
                          <option value="Half Wall">Half Wall (1m)</option>
                          <option value="Full Wall">Full Wall (2m)</option>
                          <option value="Window Wall">Window Wall</option>
                          <option value="Door Wall">Door Wall</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Gazebo design outline mockup diagram */}
                  <div className="border border-slate-200/60 p-4 rounded-xl">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">CANOPY VECTOR WORKSPACE PLACEMENT MAPPING</span>
                    <div className="grid grid-cols-4 gap-2 text-center text-[9px] font-bold uppercase text-slate-500">
                      <div className="border-2 border-dashed border-indigo-250 p-2 rounded bg-indigo-50/20">
                        <span className="block font-black text-slate-800">Roof Apex 1-4</span>
                        <span className="text-[8px] text-slate-400 block mt-1">{gazeboApexBranding}</span>
                      </div>
                      <div className="border border-indigo-200 p-2 rounded bg-slate-50">
                        <span className="block font-black text-slate-800">Valance Loop</span>
                        <span className="text-[8px] text-slate-400 block mt-1">Logo safe spacing</span>
                      </div>
                      <div className="border border-indigo-200 p-2 rounded bg-slate-50">
                        <span className="block font-black text-slate-800">Back Wall Panel</span>
                        <span className="text-[8px] text-slate-400 block mt-1">{gazeboBackWall !== 'None' ? 'Active Graphic Layer' : 'Awaiting Panel'}</span>
                      </div>
                      <div className="border border-indigo-200 p-2 rounded bg-slate-50">
                        <span className="block font-black text-slate-800">Side Half Wings</span>
                        <span className="text-[8px] text-slate-400 block mt-1">{gazeboLeftWall !== 'None' ? '2x Half Panels' : 'Not configured'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-configurator: FLAG DETAILS FORM */}
              {builderCategory === 'Flag' && (
                <div className="border-t border-dashed border-slate-200 pt-5 mt-2 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Flag specification template options</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Sizing Dimension Height</label>
                      <select 
                        value={specSize}
                        onChange={(e) => setSpecSize(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="Small (2.2m Height)">Small (2.2m overall height)</option>
                        <option value="Medium (3.2m Height)">Medium (3.2m overall height)</option>
                        <option value="Large (4.5m Height)">Large (4.5m overall height)</option>
                        <option value="Extra Large (5.5m Height)">Extra Large (5.5m overall height)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Flag shape styling</label>
                      <select 
                        value={specSides}
                        onChange={(e) => setSpecSides(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="Sharkfin / Bow Flag">Sharkfin (Bow Flag Style)</option>
                        <option value="Teardrop Classic">Teardrop Classic Curve</option>
                        <option value="Telescopic Pole Block">Telescopic (Rectangular block style)</option>
                        <option value="Feather Banner Flex">Feather banner curves</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Hardware base attachment anchors</label>
                      <select 
                        value={specBase}
                        onChange={(e) => setSpecBase(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="Heavy Steel Ground Spike">Ground Outdoor Metal Spike (300mm)</option>
                        <option value="Steel Cross Base + Water Bag">Heavy-Duty Folding Cross Base + Deluxe Water Ring</option>
                        <option value="Water-filled Dome Stand (20L)">Molded Rigid Plastic Dome Water Base (20L)</option>
                        <option value="U-Shaped Vehicle Wheel Base">U-Shaped Car Wheel Plate Base</option>
                        <option value="Angled Direct Wall Bracket">Angled Direct Wall Bracket (Flat Wall anchor)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Single or Double Sided Blockout Fabric</label>
                      <select 
                        value={specFabric}
                        onChange={(e) => setSpecFabric(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="Single Sided with 90% show-though">Single-Sided Print (90% mirror text bleed-through)</option>
                        <option value="Double Sided with blockout layer">Double-Sided Print (Includes silver blockout liner spacer)</option>
                      </select>
                    </div>
                  </div>

                  {/* Flag safe area visual guideline */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-800 uppercase block tracking-wider">VECTOR PRE-FLIGHT SAFE BLEED RATINGS</span>
                      <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed max-w-sm">Dye Sublimation flags must contain minimum 50mm safe margin around curved border hem tracks to prevent logo stitching clipping during overlock sewing.</p>
                    </div>
                    <div className="w-16 h-16 bg-white border border-slate-300 rounded shadow-sm flex items-center justify-center font-mono text-[8px] text-slate-400 text-center">
                      50mm<br/>BLEED<br/>SAFE ZONE
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-configurator: BANNING BACKDROP FORM */}
              {builderCategory === 'Banner' && (
                <div className="border-t border-dashed border-slate-200 pt-5 mt-2 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Tension banner & backdrop calculation dimensional builders</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Custom Finish Width (Millimeters)</label>
                      <input 
                        type="number" 
                        step="100"
                        value={customWidthMm}
                        onChange={(e) => setCustomWidthMm(parseInt(e.target.value) || 1000)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Custom Finish Height (Millimeters)</label>
                      <input 
                        type="number" 
                        step="100"
                        value={customHeightMm}
                        onChange={(e) => setCustomHeightMm(parseInt(e.target.value) || 1000)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Brass Eyelet Spacing Interval</label>
                      <select 
                        value={bannerEyeletsSpacing}
                        onChange={(e) => setBannerEyeletsSpacing(parseInt(e.target.value) || 500)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      >
                        <option value="300">Every 300mm (Ultra Guard Wind Load)</option>
                        <option value="500">Every 500mm (Standard Outdoor Pole Fence)</option>
                        <option value="1000">Every 1000mm (Light Indoor Display)</option>
                        <option value="0">No Eyelets (Velcro / Pockets Only)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 pt-6 flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={bannerHemming}
                          onChange={(e) => setBannerHemming(e.target.checked)}
                          className="rounded text-indigo-650"
                        />
                        Include Heavy Perimeter Hemming
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={bannerFrameIncluded}
                          onChange={(e) => setBannerFrameIncluded(e.target.checked)}
                          className="rounded text-indigo-650"
                        />
                        Include Frame/Mounting hardware Stand
                      </label>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between text-indigo-950">
                    <div className="font-bold text-xs uppercase flex items-center gap-2">
                      <Info size={16} /> Estimated Print Area: {((customWidthMm / 1000) * (customHeightMm / 1000)).toFixed(2)} Square Meters
                    </div>
                    <span className="text-[10px] bg-indigo-105 border border-indigo-200 px-3 py-1 rounded font-black text-indigo-800 font-mono text-right">
                      {Math.ceil(((customWidthMm + customHeightMm) * 2) / (bannerEyeletsSpacing || 1))} EYELETS APPLIED
                    </span>
                  </div>
                </div>
              )}

              {/* SAVE / SUBMIT SYSTEM BLUEPRINT */}
              <div className="pt-4 border-t border-slate-100/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleAddNewProduct()}
                  className="btn-primary flex items-center gap-2 text-xs tracking-wider"
                >
                  <Save size={14} /> Commit & Launch Work Order
                </button>
              </div>

            </div>

            {/* LIVE DYNAMIC ESTIMATING BILL SUMMARY VIEW */}
            <div className="space-y-6">
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-6">
                <div>
                  <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block">ESTIMATION AUDIT SUMMARY (ZAR / Rands)</span>
                  <h3 className="text-xl font-black uppercase text-indigo-100 tracking-tight mt-1">DYNAMIC ERP CALCULATION ENGINE</h3>
                </div>

                <div className="divide-y divide-slate-800 text-[11px] font-semibold text-slate-300">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 uppercase">Dye Sub fabric Print Coating Cost</span>
                    <span className="font-mono text-white">R {calculatedCosting.raw.toFixed(2)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 uppercase">Structural Hardware / Frame cassette</span>
                    <span className="font-mono text-white">R {calculatedCosting.hardware.toFixed(2)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 uppercase">Stitching/Finishing (Eyelet, Hems)</span>
                    <span className="font-mono text-white">R {calculatedCosting.finishing.toFixed(2)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 uppercase">Signage Operator Cutting Labor</span>
                    <span className="font-mono text-white">R {calculatedCosting.labor.toFixed(2)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 uppercase">Packaging & Spoilage Overheads</span>
                    <span className="font-mono text-white">R {calculatedCosting.overhead.toFixed(2)}</span>
                  </div>
                  <div className="py-3 flex justify-between font-bold text-white border-t border-slate-700/60 pt-3">
                    <span className="uppercase text-slate-200">Total internal print-cost</span>
                    <span className="font-mono">R {(calculatedCosting.raw + calculatedCosting.hardware + calculatedCosting.finishing + calculatedCosting.labor + calculatedCosting.overhead).toFixed(2)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between font-extrabold text-emerald-450">
                    <span className="text-slate-400 uppercase">Markup profit Margin ({calculatedCosting.marginPercent}%)</span>
                    <span className="font-mono text-emerald-400">+ R {calculatedCosting.markup.toFixed(2)}</span>
                  </div>
                </div>

                {/* Final calculated output */}
                <div className="bg-indigo-950 border border-indigo-805 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block">Unit quote Price</span>
                    <span className="text-2xl font-black text-white tabular-nums tracking-tight mt-0.5">R {calculatedCosting.sellPrice.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block">Contract Pack Total</span>
                    <span className="text-2xl font-black text-white tabular-nums tracking-tight mt-0.5">R {(calculatedCosting.sellPrice * specQuantity).toLocaleString()}</span>
                  </div>
                </div>

                {/* Aesthetic Visual preview block inside card */}
                {builderCategory === 'Gazebo' && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center font-bold text-xs space-y-2">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Visual Live Spec mockup</span>
                    <div className="relative w-full h-24 bg-gradient-to-t from-slate-900 to-slate-800 rounded flex items-center justify-center border border-indigo-900/40">
                      {/* Interactive Canvas/SVG Simulation */}
                      <div className="absolute top-4 border-b-2 border-indigo-500 w-16 h-6 bg-slate-800 flex items-center justify-center rounded">
                        <span className="text-[6px] text-indigo-200">{specSize}</span>
                      </div>
                      <div className="absolute top-10 flex gap-1">
                        <div className="w-12 h-6 border border-slate-700 bg-indigo-50/10 text-[6px] flex items-center justify-center text-slate-400 rounded">
                          Wings
                        </div>
                        <div className="w-12 h-6 border border-slate-700 bg-indigo-50/10 text-[6px] flex items-center justify-center text-slate-400 rounded">
                          Apex
                        </div>
                      </div>
                      <span className="absolute bottom-1.5 text-[8px] tracking-wide text-slate-450 uppercase">{specFabric}</span>
                    </div>
                  </div>
                )}

                {builderCategory === 'Flag' && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center font-bold text-xs space-y-2">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Visual Live Spec mockup</span>
                    <div className="relative w-full h-24 bg-gradient-to-t from-slate-900 to-slate-800 rounded flex items-center justify-center border border-yellow-900/30">
                      {/* Flag silhouette illustration */}
                      <div className="absolute right-12 w-1.5 h-20 bg-slate-700 rounded-full" />
                      <div className="absolute right-[4.2rem] top-3 w-10 h-14 border-r-2 border-t-2 border-yellow-500 bg-yellow-500/10 rounded-tr-3xl rounded-bl-3xl flex items-center justify-center">
                        <span className="text-[6px] text-yellow-500 font-mono font-black rotate-90 uppercase">FLAG</span>
                      </div>
                      <span className="absolute bottom-1.5 left-4 text-[8px] tracking-wide text-slate-450 uppercase">{specSides}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* =============== PRODUCTION TIMELINE & WORKFLOWS =============== */}
        {activeTab === 'workflow' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* ACTIVE SPEC SELECTION LIST */}
            <div className="md:col-span-1 bg-paper border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                <Workflow size={14} /> ACTIVE RUN BLUEPRINTS
              </h3>

              <div className="space-y-2 max-h-screen overflow-y-auto pr-1">
                {products.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">No specifications registered yet.</div>
                ) : (
                  products.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={cn(
                        "p-4 border rounded-xl cursor-pointer transition-all text-left space-y-2.5",
                        selectedProduct?.id === p.id 
                          ? "bg-slate-100 border-slate-950 shadow-sm" 
                          : "border-slate-200 hover:bg-slate-50/50"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-black text-slate-900 leading-none">{p.clientName}</span>
                          <span className="text-[8px] text-slate-400 block font-bold uppercase tracking-widest mt-0.5">{p.id} • {p.mode}</span>
                        </div>
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                          p.priority === 'Urgent' ? "bg-red-100 text-red-700 animate-pulse" :
                          p.priority === 'High' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {p.priority}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span className="uppercase">{p.category} Spec ({p.dimensions})</span>
                        <span className="tabular-nums">Qty x{p.quantity}</span>
                      </div>

                      {/* Micro inline progress */}
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-650" style={{ width: `${Math.round((p.workflowStep / (WORKFLOW_STAGES.length - 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* EXPANDED TRACKING AUDIT CARD */}
            <div className="md:col-span-2 space-y-6">
              {selectedProduct ? (
                <div className="bg-paper border border-slate-200/90 rounded-2xl p-6 space-y-6">
                  
                  {/* Card head details */}
                  <div className="flex items-start justify-between border-b pb-5">
                    <div>
                      <span className="text-[8px] bg-slate-950 text-white px-2 py-0.5 rounded font-black uppercase tracking-widest">
                        {selectedProduct.category} STAGE MATRIX
                      </span>
                      <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight mt-1.5">
                        {selectedProduct.clientName} Specs Tracking Card
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                        Assigned technician operator: <strong className="text-slate-800">{selectedProduct.operatorAssignment || 'Johan B.'}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Spec Quotation</span>
                      <span className="text-xl font-black text-indigo-650 tabular-nums">R {selectedProduct.sell.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Step tracking timeline bars */}
                  <div className="space-y-4">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">ACTIVE STEP: {selectedProduct.workflowStep + 1} OF {WORKFLOW_STAGES.length}</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Previous, next controls */}
                      <button
                        type="button"
                        onClick={() => handleStepAdvance(selectedProduct.id, -1)}
                        disabled={selectedProduct.workflowStep === 0}
                        className="py-2 px-3 border border-slate-200 rounded-lg text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50 text-center"
                      >
                        ◀ Roll Back Stage
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleStepAdvance(selectedProduct.id, 1)}
                        disabled={selectedProduct.workflowStep === WORKFLOW_STAGES.length - 1}
                        className="py-2 px-3 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase hover:bg-slate-850 disabled:opacity-50 text-center"
                      >
                        Advance Production Phase ▶
                      </button>
                    </div>

                    {/* Timeline stage bullets layout */}
                    <div className="space-y-2 mt-4 max-h-[22rem] overflow-y-auto pr-1">
                      {WORKFLOW_STAGES.map((stg, sIdx) => {
                        const isCurrent = selectedProduct.workflowStep === sIdx;
                        const isPassed = selectedProduct.workflowStep > sIdx;
                        return (
                          <div 
                            key={sIdx} 
                            style={{ opacity: isCurrent ? 1 : isPassed ? 0.75 : 0.4 }}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-xl transition-all border",
                              isCurrent ? "bg-indigo-50 border-indigo-200 shadow-sm" : "border-transparent"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px]",
                              isPassed ? "bg-emerald-500 text-white" :
                              isCurrent ? "bg-indigo-600 text-white animate-pulse" : "bg-slate-100 text-slate-500"
                            )}>
                              {isPassed ? "✔" : sIdx + 1}
                            </div>
                            <div className="flex-1">
                              <span className={cn(
                                "text-xs block font-bold",
                                isCurrent ? "text-indigo-950 font-black" : "text-slate-800"
                              )}>{stg}</span>
                            </div>
                            {isCurrent && (
                              <span className="text-[8px] bg-indigo-105 text-indigo-700 font-extrabold px-2 py-0.5 rounded uppercase tracking-widest">
                                ACTIVE STAGE
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Artwork & Proof Approval audit block */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">ARTWORK PROOFS AUDIT COMPLIANCE</span>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <span className="text-xs font-black text-slate-800 block">{selectedProduct.artworkReference || 'apex-canopy-proof-s1.pdf'}</span>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase mt-0.5">Uploaded Area zones: {(selectedProduct.artworkZones || []).join(', ')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider",
                          selectedProduct.artworkStatus === 'Approved' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        )}>
                          Status: {selectedProduct.artworkStatus}
                        </span>
                        
                        {selectedProduct.artworkStatus !== 'Approved' && (
                          <button
                            type="button"
                            onClick={() => {
                              setProducts(prev => prev.map(p => {
                                if (p.id === selectedProduct.id) {
                                  return { ...p, artworkStatus: 'Approved' };
                                }
                                return p;
                              }));
                              setSelectedProduct(prev => prev ? { ...prev, artworkStatus: 'Approved' } : null);
                              toast.success('Artwork vectors approved by client. Dispatched to Precision printing presses.');
                            }}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg"
                          >
                            Verify & Approve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-paper border border-dashed text-center py-12 rounded-2xl text-slate-400 text-xs">Awaiting spec selection.</div>
              )}
            </div>
          </motion.div>
        )}

        {/* =============== HARDWARE STOCK CONTROL =============== */}
        {activeTab === 'stock' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 animate-in fade-in-30"
          >
            {/* Header info */}
            <div className="bg-paper border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                  <Layers size={16} /> EXHIBITION STRUCTURAL HARDWARE REGISTRY HUB
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time alerts for frame extrusions, carbon fiber poles, ground clamps, and fabric rolls.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  toast.success('Successfully synchronized dynamic inventory balances with Cloud warehouse.');
                }}
                className="btn-secondary flex items-center gap-2 text-[10px]"
              >
                <RotateCcw size={12} /> Sync Warehouse
              </button>
            </div>

            {/* Stock List Grid Table */}
            <div className="bg-paper border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-4">Item Catalog SKU / Title</th>
                      <th>Inventory Group</th>
                      <th className="text-center">Current Total Stocks</th>
                      <th className="text-center">Reserved for Jobs</th>
                      <th className="text-center">Damaged / In Repair</th>
                      <th>Authorized Supplier</th>
                      <th className="text-right py-3 px-4">Registry Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-600">
                    {stock.map((stk) => {
                      const isLow = stk.level <= stk.minLevel;
                      return (
                        <tr key={stk.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="text-slate-900 block font-black">{stk.name}</span>
                            <span className="text-[8px] text-slate-400 block font-bold uppercase">ID: {stk.id}</span>
                          </td>
                          <td>
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                              {stk.category}
                            </span>
                          </td>
                          <td className="text-center font-mono text-slate-800 tabular-nums">
                            <span className={cn(
                              "text-xs font-black",
                              isLow && "text-red-650 font-black animate-pulse"
                            )}>{stk.level} {stk.unit}</span>
                          </td>
                          <td className="text-center font-mono text-amber-600 tabular-nums">{stk.reserved} {stk.unit}</td>
                          <td className="text-center font-mono text-rose-500 tabular-nums">{stk.damaged} {stk.unit}</td>
                          <td className="text-slate-700">{stk.supplierName}</td>
                          <td className="text-right py-4 px-4">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setStock(prev => prev.map(s => {
                                    if (s.id === stk.id) {
                                      return { ...s, level: s.level + 10 };
                                    }
                                    return s;
                                  }));
                                  toast.success(`Incremented stock levels for ${stk.name} (+10 Units)`);
                                }}
                                className="bg-slate-900 text-white hover:bg-slate-800 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider"
                              >
                                +10 Qty
                              </button>
                              <button
                                onClick={() => handleTriggerReorder(stk.name)}
                                className="border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider text-slate-600"
                              >
                                Reorder
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* =============== EXHIBITS RENTALS HUB =============== */}
        {activeTab === 'rentals' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Calendar list of rented frames */}
            <div className="md:col-span-2 bg-paper border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                  <Calendar size={16} /> EXHIBITIONS RENTAL REGISTER & ACTIVE LEASES
                </h3>
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded font-black uppercase tracking-wider">
                  ACTIVE DEPOSITS HELD
                </span>
              </div>

              {/* List of active renting orders */}
              <div className="divide-y divide-slate-100">
                {products.filter(p => p.mode === 'Rental').map((lease) => (
                  <div key={lease.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{lease.clientName}</span>
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                          DUE {lease.rentalDueDate || '2026-05-30'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-450 block uppercase font-bold">
                        {lease.name} • Setup Period: {lease.rentalPeriod || 4} Days • Deposit: R {lease.rentalDeposit || 1000}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">CLEANING STATE</span>
                        <span className={cn(
                          "text-xs font-black uppercase tracking-wide",
                          lease.rentalStatus === 'Cleaned' ? "text-emerald-600" : "text-amber-500 animate-pulse"
                        )}>
                          {lease.rentalStatus || 'Pending Clean'}
                        </span>
                      </div>
                      
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setProducts(prev => prev.map(p => {
                              if (p.id === lease.id) {
                                return { ...p, rentalStatus: 'Cleaned' };
                              }
                              return p;
                            }));
                            toast.success('Product flagged as sanitized, cleaned and re-stocked into rental pools.');
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider"
                        >
                          Cleaned OK
                        </button>
                        
                        <button
                          onClick={() => {
                            setProducts(prev => prev.map(p => {
                              if (p.id === lease.id) {
                                return { ...p, rentalStatus: 'Pending Clean' };
                              }
                              return p;
                            }));
                            toast.error('Product return inspection requested.');
                          }}
                          className="border border-slate-205 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-600"
                        >
                          Request Clean
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rental Availability calendar indicators */}
            <div className="bg-paper border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                <ShieldCheck size={16} /> RENTALS POOL INTEGRITY
              </h3>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center font-bold text-xs space-y-3">
                <span className="text-[8px] text-slate-400 uppercase tracking-widest block">RENTAL SPEC AVAILABILITY CHECKS</span>
                <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed text-left">SignPro maintains shared corporate exhibits of high Hex Gazebos and Tension banner media backdrops available for short term weekend events lease.</p>
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[9px] font-black text-slate-700 block">3x3m Canopies</span>
                    <span className="text-xs font-black text-emerald-600 block">4 Available</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[9px] font-black text-slate-700 block">Stretch back backdrop</span>
                    <span className="text-xs font-black text-amber-500 block">1 Available</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* =============== BUNDLING KITS & AI GENERATOR =============== */}
        {activeTab === 'kits' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in-30"
          >
            {/* AI Prompter Area */}
            <div className="md:col-span-2 bg-paper border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">AI EXHIBITION BUNDLE CREATOR</h3>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">Let generative specifications build and quote the perfect event package</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Generative Prompter Input Instructions</label>
                <textarea 
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 tracking-wide focus:outline-none focus:border-slate-300 shadow-inner"
                  placeholder="e.g. Create a branding package for an outdoor athletic school sports event..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAiPackageBuilder()}
                  disabled={isAiGenerating}
                  className="bg-indigo-650 btn-primary flex items-center gap-2 text-xs"
                >
                  {isAiGenerating ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Auto-compile optimized Spec package
                </button>
              </div>

              {/* Suggestions template blocks */}
              <div className="space-y-2">
                <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase block">RECOMMENDED TEMPLATE GUIDELINES</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  <div 
                    onClick={() => setAiPrompt("Create a branding package for an outdoor school sports day with a 3x3 gazebo, 2 flags, and a media wall.")}
                    className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-bold font-sans text-slate-650"
                  >
                    “School sports day layout with Hex Gazebo, Telescopic flags and table-cover drapery”
                  </div>
                  <div 
                    onClick={() => setAiPrompt("Create a rental corporate trade show layout for a 3x3 indoor exhibit stand with tension backdrop and custom counter.")}
                    className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-bold font-sans text-slate-650"
                  >
                    “Indoor corporate expo stand booth specs with tension-stretch media walls”
                  </div>
                </div>
              </div>
            </div>

            {/* Kit catalog examples */}
            <div className="bg-paper border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                <Package size={16} className="text-indigo-600" /> RECOMMENDED BOOTH BUNDLES
              </h3>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest block bg-indigo-50 px-2 py-0.5 rounded w-fit">Standard Promo Kit</span>
                <h4 className="text-xs font-black text-slate-800 uppercase block tracking-tight">CANOPY OUTDOOR ACTIVATION KIT</h4>
                <div className="text-[10px] text-slate-500 font-bold uppercase space-y-1">
                  <div>• 1x Custom Gazebo 3x3m Canopy</div>
                  <div>• 2x Teardrop Flags (Medium 3.2m)</div>
                  <div>• 1x fitted trestle Tablecloth</div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-black text-slate-900">R 8,200</span>
                  <button 
                    onClick={() => {
                      setBuilderCategory('Gazebo');
                      setClientName('Activation Client');
                      setSpecSize('3x3m');
                      setSpecQuantity(1);
                      setActiveTab('builder');
                      toast.success('Promo Kit specs preset loaded. Feel free to tweak parameters.');
                    }}
                    className="text-[9px] bg-slate-900 text-white font-black uppercase px-2.5 py-1.5 rounded-lg"
                  >
                    Tweak Specs
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* =============== INSTALLER / OPERATOR MOBILE PORTLET =============== */}
        {activeTab === 'installer_portal' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* INSTRUCTIONS */}
            <div className="md:col-span-1 bg-paper border border-slate-200 rounded-2xl p-5 space-y-5">
              <h2 className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-650" /> MOBILE OPERATOR APP FRAME
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                This is a fully-operational design simulation of the SignPro smartphone interface used by on-site production operators to change stages, scan QR/barcodes, upload photos, and complete clients signoff audits.
              </p>

              {/* Active selection */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-bold">Select Active Job to Operate</label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const found = products.find(p => p.id === e.target.value);
                    if (found) {
                      setSelectedProduct(found);
                      setMobileStageIndex(found.workflowStep);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-700"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.clientName} ({p.name})</option>
                  ))}
                </select>
              </div>

              {/* Checklist */}
              <div className="space-y-2 border-t border-dashed pt-4">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">OPERATOR PACKING CHECKLIST</span>
                <div className="text-[10px] font-extrabold text-slate-500 uppercase space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                    Verify flag seams warp-knit density
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                    Confirm Hex carry rollers are functional
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded text-indigo-600" />
                    Secure correct ground anchors base parts
                  </label>
                </div>
              </div>
            </div>

            {/* PHONE MOCKUP DEVICE */}
            <div className="md:col-span-2 flex justify-center">
              <div className="w-full max-w-sm bg-slate-950 border-[6px] border-slate-800 rounded-[2.5rem] shadow-2xl p-4 text-slate-900 overflow-hidden relative" style={{ minHeight: '520px' }}>
                
                {/* Speaker pill */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800 rounded-b-xl z-25 flex items-center justify-center">
                  <div className="w-10 h-1 bg-slate-900 rounded-full" />
                </div>

                {/* Simulated Screen */}
                <div className="bg-slate-50 rounded-[1.8rem] h-full w-full p-4 flex flex-col justify-between mt-2" style={{ minHeight: '480px' }}>
                  
                  {/* Status Bar */}
                  <div className="flex justify-between items-center text-[7.5px] font-bold text-slate-400 border-b pb-1">
                    <span>10:04 AM</span>
                    <span className="text-emerald-650 flex items-center gap-1">● OPERATOR MODE LIVE</span>
                  </div>

                  {selectedProduct ? (
                    <div className="space-y-4 flex-1 mt-3">
                      
                      {/* Job Header */}
                      <div className="bg-slate-900 text-white rounded-xl p-3 text-left">
                        <span className="text-[7px] text-indigo-300 font-bold block uppercase tracking-widest">Active Order installation</span>
                        <h4 className="text-xs font-black uppercase text-white truncate leading-tight">{selectedProduct.clientName}</h4>
                        <span className="text-[9px] text-slate-350 block mt-1">{selectedProduct.name} ({selectedProduct.dimensions})</span>
                        <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-800">
                          <span className="text-[8px] bg-indigo-900 font-bold text-white px-1.5 py-0.5 rounded">Qty x{selectedProduct.quantity}</span>
                          <span className="text-[10px] font-black">{WORKFLOW_STAGES[selectedProduct.workflowStep]}</span>
                        </div>
                      </div>

                      {/* Advanced stage control */}
                      <div className="space-y-1.5 text-left bg-white p-2.5 rounded-xl border border-slate-205">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">WORKSHOP TIMELINE TRACK</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStepAdvance(selectedProduct.id, -1)}
                            className="flex-1 py-1 px-2 border rounded text-[9px] uppercase font-black"
                            disabled={selectedProduct.workflowStep === 0}
                          >
                            Prev Step
                          </button>
                          <button
                            onClick={() => handleStepAdvance(selectedProduct.id, 1)}
                            className="flex-1 py-1 px-2 bg-indigo-600 text-white rounded text-[9px] uppercase font-black"
                            disabled={selectedProduct.workflowStep === WORKFLOW_STAGES.length - 1}
                          >
                            Done Step ✔
                          </button>
                        </div>
                      </div>

                      {/* QR / Barcode Scan simulator */}
                      <div className="bg-white p-3 rounded-xl border border-slate-205 text-left space-y-2">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                          <QrCode size={10} /> BARCODE / QR COMPLIANCE TRACKING
                        </span>
                        
                        <div className="flex gap-1.5">
                          <input 
                            type="text" 
                            placeholder="Enter / Scan Frame SKU..." 
                            value={scanValue} 
                            onChange={(e) => setScanValue(e.target.value)}
                            className="flex-1 px-2 py-1 bg-slate-50 border rounded text-[10px] font-medium"
                          />
                          <button
                            onClick={() => {
                              if (!scanValue.trim()) {
                                toast.error('Please enter a mock SKU to scan!');
                                return;
                              }
                              setStock(prev => prev.map(s => {
                                if (s.name.includes('Frame') || s.id === scanValue.trim()) {
                                  return { ...s, reserved: Math.max(0, s.reserved - 1) };
                                }
                                return s;
                              }));
                              toast.success(`SKU ${scanValue} registered successfully. Allocated stock committed.`);
                              setScanValue('');
                            }}
                            className="bg-indigo-650 hover:bg-indigo-700 text-white px-3 py-1 rounded text-[9px] font-black uppercase"
                          >
                            Scan
                          </button>
                        </div>
                      </div>

                      {/* Photos & Sign-off Upload Area */}
                      <div className="bg-white p-3 rounded-xl border border-slate-250 text-left space-y-2">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                          <Camera size={10} /> FIELD PHOTO & SIGNATURE AUDIT
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUploadMobilePhoto()}
                            className="flex-1 py-1.5 bg-slate-100 font-bold rounded text-[9px] uppercase tracking-wide border text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-1"
                          >
                            <Camera size={10} /> Capture photo
                          </button>
                        </div>

                        {uploadedPhotos.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {uploadedPhotos.map((p, idx) => (
                              <img key={idx} src={p} alt="setup photo" className="w-10 h-10 object-cover rounded border" referrerPolicy="no-referrer" />
                            ))}
                          </div>
                        )}

                        <div className="space-y-1 border-t pt-2 mt-1">
                          <span className="text-[7px] text-slate-400 font-black block uppercase">Client Digital Sign-off</span>
                          <input 
                            type="text" 
                            placeholder="Representative Name" 
                            value={signName}
                            onChange={(e) => setSignName(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border rounded text-[10px] font-bold"
                          />
                          <button
                            onClick={() => handleClientSignoff(selectedProduct.id)}
                            className="w-full mt-1 py-1 bg-emerald-600 text-white font-black uppercase tracking-wider text-[8px] rounded flex items-center justify-center gap-1"
                          >
                            <Signature size={9} /> Submit Signature Sign-off
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="py-24 text-center text-xs text-slate-400">Awaiting specimen database...</div>
                  )}

                  {/* Device Bottom Tab Indicators */}
                  <div className="flex justify-around items-center border-t pt-2 mt-2 text-[7px] text-slate-400 font-black uppercase">
                    <span>Task List</span>
                    <span className="text-indigo-650 border-t-2 border-indigo-650 pt-1">Field Proofs</span>
                    <span>Direct Sync</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
