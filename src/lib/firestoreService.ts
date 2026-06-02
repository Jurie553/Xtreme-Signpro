import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  doc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  orderBy,
  limit,
  runTransaction,
  increment,
  type DocumentData,
  type QueryConstraint
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebase';
import { useState, useEffect, useMemo } from 'react';

export enum OperationType {
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

/**
 * Safely stringifies an object that might contain circular references.
 * Improved implementation to be more robust.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let errorMessage = 'Unknown error';
  let errorCode = 'unknown-code';

  if (error instanceof Error) {
    errorMessage = error.message;
    if ('code' in error) errorCode = String((error as any).code);
  } else if (typeof error === 'object' && error !== null) {
    errorMessage = (error as any).message || String(error);
    errorCode = (error as any).code || 'unknown-code';
  } else {
    errorMessage = String(error);
  }

  const safeMessage = `Firestore ${operationType} failed at [${path || 'unknown'}]: ${errorMessage} (Code: ${errorCode})`;
  console.error(safeMessage, error);
  throw new Error(safeMessage);
}

function assertFirebaseReady(operationType: OperationType, path: string | null) {
  if (!isFirebaseConfigured) {
    handleFirestoreError(
      new Error('Firebase is not configured. Please check deployment environment variables and try again.'),
      operationType,
      path
    );
  }
}

function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) return null as T;
  if (value === null) return value;
  if (value instanceof Date) return value as T;
  if (value instanceof Timestamp) return value as T;
  if (Array.isArray(value)) {
    return value.map(item => sanitizeForFirestore(item)) as T;
  }
  if (typeof value === 'object') {
    const output: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([key, child]) => {
      if (child !== undefined) {
        output[key] = sanitizeForFirestore(child);
      }
    });
    return output as T;
  }
  return value;
}

function withAuditFields<T extends DocumentData>(data: T, isCreate: boolean): T {
  const now = Date.now();
  const cleanData = sanitizeForFirestore(data);
  return {
    ...cleanData,
    ...(isCreate && !cleanData.createdAt ? { createdAt: now } : {}),
    updatedAt: now,
  };
}

const collectionCache = new Map<string, {
  data: any[];
  loading: boolean;
  error: Error | null;
  unsubscribe?: () => void;
  listeners: Set<(state: { data: any[]; loading: boolean; error: Error | null }) => void>;
}>();

function getCollectionCacheKey(collectionPath: string, constraints: QueryConstraint[]) {
  return `${collectionPath}::${constraints.length}`;
}

export function useCollection<T>(collectionPath: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheKey = useMemo(() => getCollectionCacheKey(collectionPath, constraints), [collectionPath, constraints.length]);

  useEffect(() => {
    let isMounted = true;
    let cache = collectionCache.get(cacheKey);
    
    try {
      if (!cache) {
        cache = {
          data: [],
          loading: true,
          error: null,
          listeners: new Set()
        };
        collectionCache.set(cacheKey, cache);

        const q = query(collection(db, collectionPath), ...constraints);
        cache.unsubscribe = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const current = collectionCache.get(cacheKey);
          if (!current) return;
          current.data = docs;
          current.loading = false;
          current.error = null;
          current.listeners.forEach(listener => listener({ data: current.data, loading: current.loading, error: current.error }));
        }, (err: any) => {
          const msg = err?.message || String(err);
          console.error(`Subscription error for ${collectionPath}:`, msg);
          const current = collectionCache.get(cacheKey);
          if (!current) return;
          current.error = new Error(msg);
          current.loading = false;
          current.listeners.forEach(listener => listener({ data: current.data, loading: current.loading, error: current.error }));
        });
      }

      const listener = (state: { data: any[]; loading: boolean; error: Error | null }) => {
        if (!isMounted) return;
        setData(state.data as T[]);
        setLoading(state.loading);
        setError(state.error);
      };

      cache.listeners.add(listener);
      listener({ data: cache.data, loading: cache.loading, error: cache.error });
      
      return () => {
        isMounted = false;
        const activeCache = collectionCache.get(cacheKey);
        if (!activeCache) return;
        activeCache.listeners.delete(listener);
        if (activeCache.listeners.size === 0) {
          activeCache.unsubscribe?.();
          collectionCache.delete(cacheKey);
        }
      };
    } catch (err: any) {
      if (isMounted) {
        setError(err);
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, collectionPath]); 

  return { data, loading, error };
}

/**
 * Hook to monitor Firestore connection status
 */
export function useFirestoreConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, '_connection_test_', 'check'), 
      () => setIsConnected(true),
      (err) => {
        // If it's a permission error, we're still connected to the service
        if (err.code === 'permission-denied') {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      }
    );
    return unsub;
  }, []);
  
  return { isConnected };
}

export async function getCollection<T>(collectionPath: string, constraints: QueryConstraint[] = []) {
  try {
    assertFirebaseReady(OperationType.LIST, collectionPath);
    const q = query(collection(db, collectionPath), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

export function subscribeToCollection<T>(
  collectionPath: string, 
  constraints: QueryConstraint[], 
  callback: (data: T[]) => void
) {
  const q = query(collection(db, collectionPath), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  });
}

export async function createDocument<T extends DocumentData>(collectionPath: string, data: T) {
  try {
    assertFirebaseReady(OperationType.CREATE, collectionPath);
    const payload = withAuditFields(data, true);
    const docRef = await addDoc(collection(db, collectionPath), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
    return null;
  }
}

export async function updateDocument<T extends DocumentData>(collectionPath: string, id: string, data: Partial<T>) {
  try {
    assertFirebaseReady(OperationType.UPDATE, `${collectionPath}/${id || 'missing-id'}`);
    if (!id) throw new Error('Missing document ID for update.');
    const docRef = doc(db, collectionPath, id);
    await updateDoc(docRef, withAuditFields(data as DocumentData, false) as any);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${id}`);
    return false;
  }
}

export async function setDocument<T extends DocumentData>(collectionPath: string, id: string, data: T) {
  try {
    assertFirebaseReady(OperationType.WRITE, `${collectionPath}/${id || 'missing-id'}`);
    if (!id) throw new Error('Missing document ID for set.');
    const docRef = doc(db, collectionPath, id);
    await setDoc(docRef, withAuditFields(data, false), { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionPath}/${id}`);
    return false;
  }
}

export async function deleteDocument(collectionPath: string, id: string) {
  try {
    assertFirebaseReady(OperationType.DELETE, `${collectionPath}/${id || 'missing-id'}`);
    if (!id) throw new Error('Missing document ID for delete.');
    const docRef = doc(db, collectionPath, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionPath}/${id}`);
    return false;
  }
}

export async function getDocument<T>(collectionPath: string, id: string) {
  try {
    assertFirebaseReady(OperationType.GET, `${collectionPath}/${id || 'missing-id'}`);
    if (!id) throw new Error('Missing document ID for get.');
    const docRef = doc(db, collectionPath, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionPath}/${id}`);
    return null;
  }
}

export async function seedProductCategories(): Promise<void> {
  const workflow = {
    small: ['Prepress', 'Printing', 'Finishing', 'Quality Check', 'Ready'],
    large: ['Prepress', 'Printing', 'Laminating', 'Finishing', 'Quality Check', 'Ready'],
    rigid: ['Prepress', 'Printing', 'Mounting', 'Finishing', 'Quality Check', 'Ready'],
    display: ['Prepress', 'Printing', 'Hardware Assembly', 'Finishing', 'Quality Check', 'Ready'],
    commercial: ['Prepress', 'Printing', 'Finishing', 'Quality Check', 'Ready'],
    ncr: ['Prepress', 'Printing', 'Numbering', 'Collation', 'Binding', 'Quality Check', 'Ready'],
    promo: ['Prepress', 'Printing', 'Finishing', 'Quality Check', 'Ready'],
    custom: ['Prepress', 'Production', 'Finishing', 'Quality Check', 'Ready']
  };

  const makeCategory = (
    name: string,
    slug: string,
    type: 'Product' | 'NCR' | 'Litho',
    description: string,
    icon: string,
    productGroup: string,
    defaultWorkflow: string[],
    costingMethod: string,
    requiredFields: string[],
    compatibleMaterials: string[]
  ) => ({
    name,
    slug,
    type,
    description,
    icon,
    active: true,
    productGroup,
    defaultWorkflow,
    defaultCostingRules: {
      costingMethod,
      vatApplicable: true,
      marginReview: true,
      dimensionsRequired: requiredFields.includes('width') || requiredFields.includes('length')
    },
    compatibleMaterials,
    requiredFields
  });

  const defaultCategories = [
    makeCategory('Business Cards', 'business-cards', 'Product', 'Premium business cards with common finishing such as matt, gloss, rounded corners, spot UV, and foiling.', 'Tag', 'Small Format', workflow.small, 'Per Item', ['quantity', 'sides', 'paperStock', 'finishing'], ['Coated paper', 'Uncoated board', 'Textured board']),
    makeCategory('Flyers', 'flyers', 'Product', 'Single and double sided flyers for short-run digital or larger campaign print jobs.', 'Layers', 'Small Format', workflow.small, 'Per Item', ['quantity', 'size', 'sides', 'paperStock'], ['Coated paper', 'Bond paper']),
    makeCategory('Posters', 'posters', 'Product', 'Indoor and outdoor posters with flexible paper, vinyl, or synthetic media options.', 'Layers', 'Large Format', workflow.large, 'Area', ['quantity', 'width', 'length', 'material'], ['Poster paper', 'Synthetic poster media', 'Vinyl']),
    makeCategory('Stickers', 'stickers', 'Product', 'Printed vinyl decals, kiss-cut stickers, labels, and contour-cut adhesive graphics.', 'Tag', 'Labels', workflow.large, 'Area', ['quantity', 'width', 'length', 'material', 'cutting'], ['White vinyl', 'Clear vinyl', 'Reflective vinyl', 'One-way vision']),
    makeCategory('Labels', 'labels', 'Product', 'Roll or sheet labels for packaging, promotions, compliance stickers, and product branding.', 'Tag', 'Labels', workflow.small, 'Per Item', ['quantity', 'size', 'material', 'finish'], ['Paper label stock', 'Vinyl label stock', 'Clear label stock']),
    makeCategory('PVC Banners', 'pvc-banners', 'Product', 'PVC banner printing with hems, eyelets, pole pockets, and outdoor finishing options.', 'Flag', 'Large Format', workflow.large, 'Area', ['quantity', 'width', 'length', 'material', 'finishing'], ['PVC banner', 'Blockout PVC', 'Mesh banner']),
    makeCategory('Vinyl Banners', 'vinyl-banners', 'Product', 'Flexible vinyl banner products for events, promotions, building wraps, and signage campaigns.', 'Flag', 'Large Format', workflow.large, 'Area', ['quantity', 'width', 'length', 'material', 'finishing'], ['PVC banner', 'Vinyl banner', 'Mesh banner']),
    makeCategory('Large Format', 'large-format', 'Product', 'General wide-format roll media, wall graphics, poster runs, and oversized printed graphics.', 'Layers', 'Large Format', workflow.large, 'Area', ['quantity', 'width', 'length', 'material'], ['Vinyl', 'Canvas', 'Wallpaper', 'Poster paper']),
    makeCategory('Correx Boards', 'correx-boards', 'Product', 'Fluted correx signage boards for estate agent signs, event signs, and lightweight outdoor boards.', 'Box', 'Rigid Media', workflow.rigid, 'Area', ['quantity', 'width', 'length', 'material'], ['Correx board', 'Vinyl']),
    makeCategory('Chromadek Signs', 'chromadek-signs', 'Product', 'Durable steel outdoor signage using vinyl application, print-and-mount, or direct print production.', 'Sparkles', 'Rigid Media', workflow.rigid, 'Area', ['quantity', 'width', 'length', 'material'], ['Chromadek', 'Vinyl', 'Laminate']),
    makeCategory('ABS Signs', 'abs-signs', 'Product', 'ABS plastic signs for safety, directional, industrial, and branded indoor/outdoor applications.', 'Box', 'Rigid Media', workflow.rigid, 'Area', ['quantity', 'width', 'length', 'material'], ['ABS sheet', 'Vinyl', 'Laminate']),
    makeCategory('Foam Board Signs', 'foam-board-signs', 'Product', 'Lightweight mounted foam board signs and presentation boards for indoor display.', 'Box', 'Rigid Media', workflow.rigid, 'Area', ['quantity', 'width', 'length', 'material'], ['Foam board', 'Poster paper', 'Vinyl']),
    makeCategory('ACM Signs', 'acm-signs', 'Product', 'Aluminium composite signage panels for professional exterior and long-term installations.', 'Box', 'Rigid Media', workflow.rigid, 'Area', ['quantity', 'width', 'length', 'material'], ['ACM panel', 'Vinyl', 'Laminate']),
    makeCategory('Pull-up Banners', 'pull-up-banners', 'Product', 'Retractable pull-up banner systems with printed inserts and hardware options.', 'Layers', 'Exhibition/Display', workflow.display, 'Per Item', ['quantity', 'width', 'length', 'hardware'], ['Display film', 'PVC banner', 'Pull-up mechanism']),
    makeCategory('Pop-up Banners', 'pop-up-banners', 'Product', 'Spring-frame pop-up banners and portable display signage for events and activations.', 'Layers', 'Exhibition/Display', workflow.display, 'Per Item', ['quantity', 'size', 'hardware'], ['Display fabric', 'PVC media']),
    makeCategory('Gazebos', 'gazebos', 'Product', 'Branded gazebo canopies and walls for outdoor events, trade shows, and promotional activations.', 'Tent', 'Exhibition/Display', workflow.display, 'Per Item', ['quantity', 'size', 'hardware', 'artwork'], ['Gazebo fabric', 'Hardware']),
    makeCategory('Flags', 'flags', 'Product', 'Sharkfin, teardrop, telescopic, and wall-mounted flags with printed fabric and hardware.', 'Flag', 'Exhibition/Display', workflow.display, 'Per Item', ['quantity', 'size', 'hardware'], ['Flag fabric', 'Pole hardware']),
    makeCategory('Fabric Backdrops', 'fabric-backdrops', 'Product', 'Stretch fabric backdrops, stage backgrounds, and event photo walls.', 'Layers', 'Exhibition/Display', workflow.display, 'Area', ['quantity', 'width', 'length', 'material'], ['Display fabric', 'Stretch fabric']),
    makeCategory('Media Walls', 'media-walls', 'Product', 'Press walls, photo walls, and branded event backdrops with modular hardware.', 'Layers', 'Exhibition/Display', workflow.display, 'Per Item', ['quantity', 'width', 'length', 'hardware'], ['Display fabric', 'PVC banner', 'Frame hardware']),
    makeCategory('Exhibition Branding', 'exhibition-branding', 'Product', 'Grouped exhibition and event branding products including stands, walls, flags, and venue graphics.', 'Tent', 'Exhibition/Display', workflow.display, 'Per Item', ['quantity', 'hardware', 'artwork'], ['Display fabric', 'PVC media', 'Hardware']),
    makeCategory('NCR Books', 'ncr-books', 'NCR', 'Duplicate, triplicate, and custom carbonless books with numbering, perforation, and binding options.', 'BookOpen', 'Commercial Print', workflow.ncr, 'NCR', ['quantity', 'parts', 'setsPerBook', 'numbering', 'binding'], ['NCR CB paper', 'NCR CFB paper', 'NCR CF paper', 'Board backing']),
    makeCategory('Litho Printing', 'litho-printing', 'Litho', 'Offset and lithographic production for high-volume paper print with imposition and finishing.', 'Printer', 'Commercial Print', workflow.commercial, 'Page', ['quantity', 'size', 'paperStock', 'sides', 'finishing'], ['Litho paper', 'Coated paper', 'Uncoated paper']),
    makeCategory('Digital Printing', 'digital-printing', 'Product', 'Short-run digital paper printing for office, marketing, and variable-data jobs.', 'Printer', 'Small Format', workflow.small, 'Page', ['quantity', 'size', 'paperStock', 'sides'], ['Bond paper', 'Coated paper', 'Card stock']),
    makeCategory('Booklets', 'booklets', 'Product', 'Multi-page booklets, manuals, programmes, and stitched brochures with finishing options.', 'BookOpen', 'Commercial Print', workflow.commercial, 'Page', ['quantity', 'pages', 'size', 'paperStock', 'binding'], ['Coated paper', 'Uncoated paper', 'Cover board']),
    makeCategory('Brochures', 'brochures', 'Product', 'Folded brochures, menus, and promotional pieces with creasing, folding, and coating options.', 'Layers', 'Commercial Print', workflow.commercial, 'Per Item', ['quantity', 'size', 'paperStock', 'folding'], ['Coated paper', 'Uncoated paper']),
    makeCategory('Letterheads', 'letterheads', 'Product', 'Corporate letterheads and stationery on bond or premium paper stocks.', 'Layers', 'Small Format', workflow.small, 'Per Item', ['quantity', 'paperStock', 'sides'], ['Bond paper', 'Conqueror paper']),
    makeCategory('Envelopes', 'envelopes', 'Product', 'Printed business envelopes, invitation envelopes, and branded stationery envelopes.', 'Mail', 'Small Format', workflow.small, 'Per Item', ['quantity', 'size', 'printColor'], ['Envelope stock']),
    makeCategory('Presentation Folders', 'presentation-folders', 'Product', 'Die-cut folders with pockets, business-card slots, lamination, and custom finishes.', 'BookOpen', 'Commercial Print', workflow.commercial, 'Per Item', ['quantity', 'paperStock', 'dieCut', 'finishing'], ['Cover board', 'Coated board']),
    makeCategory('Promotional Items', 'promotional-items', 'Product', 'Promotional merchandise, branded gifts, and campaign items with manual costing support.', 'Briefcase', 'Promo', workflow.promo, 'Per Item', ['quantity', 'itemType', 'brandingMethod'], ['Promo item', 'Transfer media']),
    makeCategory('Apparel Branding', 'apparel-branding', 'Product', 'Branded clothing, heat press transfers, embroidery, and screenprinting products.', 'Shirt', 'Promo', workflow.promo, 'Per Item', ['quantity', 'garment', 'brandingMethod', 'positions'], ['Garment', 'Heat transfer vinyl', 'Embroidery thread']),
    makeCategory('Packaging', 'packaging', 'Product', 'Custom printed packaging, belly bands, swing tags, stickers, and branded boxes.', 'Package', 'Commercial Print', workflow.commercial, 'Per Item', ['quantity', 'size', 'material', 'finishing'], ['Board', 'Label stock', 'Packaging substrate']),
    makeCategory('Materials', 'materials', 'Product', 'Sellable raw substrates and stock items quoted directly from the material registry.', 'Database', 'Other', workflow.custom, 'Area', ['quantity', 'material'], ['Any stock material']),
    makeCategory('General Products', 'general-products', 'Product', 'General print and signage products that do not need a specialist calculator.', 'Briefcase', 'Other', workflow.custom, 'Per Item', ['quantity', 'description'], ['Manual selection']),
    makeCategory('Custom Products', 'custom-products', 'Product', 'Estimator-defined custom production items for once-off or unusual jobs.', 'Sliders', 'Other', workflow.custom, 'Per Item', ['quantity', 'description', 'manualPrice'], ['Manual selection']),
    makeCategory('Other', 'other', 'Product', 'Fallback category for uncategorised items until they are assigned to a better production category.', 'Sliders', 'Other', workflow.custom, 'Per Item', ['quantity', 'description'], ['Manual selection'])
  ];

  const categoryAliases: Record<string, string> = {
    'banner': 'PVC Banners',
    'banners': 'PVC Banners',
    'vinyl banner': 'Vinyl Banners',
    'vinyl banners': 'Vinyl Banners',
    'pvc banner': 'PVC Banners',
    'pvc banners': 'PVC Banners',
    'pull up banners': 'Pull-up Banners',
    'pull-up banner': 'Pull-up Banners',
    'popup banners': 'Pop-up Banners',
    'pop up banners': 'Pop-up Banners',
    'fabric backdrop': 'Fabric Backdrops',
    'media wall': 'Media Walls',
    'media walls': 'Media Walls',
    'flags': 'Flags',
    'flag': 'Flags',
    'gazebo': 'Gazebos',
    'chromadek': 'Chromadek Signs',
    'correx': 'Correx Boards',
    'foam board': 'Foam Board Signs',
    'acm': 'ACM Signs',
    'aluminium composite': 'ACM Signs',
    'abs': 'ABS Signs',
    'ncr': 'NCR Books',
    'ncr book': 'NCR Books',
    'litho': 'Litho Printing',
    'offset': 'Litho Printing',
    'digital': 'Digital Printing',
    'large format print': 'Large Format',
    'large format': 'Large Format',
    'general': 'General Products',
    'custom': 'Custom Products',
    'uncategorized': 'Other',
    'uncategorised': 'Other'
  };

  try {
    const existing = await getCollection<any>('product_categories');
    const existingBySlug = new Map<string, any>(existing.map(c => [c.slug, c]));
    
    let addedCount = 0;
    let refreshedCount = 0;
    for (const cat of defaultCategories) {
      const existingCat = existingBySlug.get(cat.slug);
      if (!existingCat) {
        await createDocument('product_categories', {
          ...cat,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        addedCount++;
      } else {
        const metadataUpdate: any = {};
        for (const key of ['description', 'icon', 'productGroup', 'type', 'defaultWorkflow', 'defaultCostingRules', 'compatibleMaterials', 'requiredFields']) {
          if (JSON.stringify(existingCat[key] ?? null) !== JSON.stringify((cat as any)[key] ?? null)) {
            metadataUpdate[key] = (cat as any)[key];
          }
        }
        if (Object.keys(metadataUpdate).length > 0) {
          await updateDocument('product_categories', existingCat.id, {
            ...metadataUpdate,
            updatedAt: Date.now()
          });
          refreshedCount++;
        }
      }
    }
    if (addedCount > 0 || refreshedCount > 0) {
      console.log(`[Developer Diagnostics] Seeded ${addedCount} missing product categories and refreshed ${refreshedCount} existing category metadata records.`);
    }

    // Dynamic Auditing and Synchronization of Products and Product Categories
    const updatedCategories = await getCollection<any>('product_categories');
    const products = await getCollection<any>('products');
    
    for (const p of products) {
      let categoryMatch = updatedCategories.find(c => c.id === p.categoryId);
      if (!categoryMatch) {
        const rawCategory = String(p.categoryName || p.category || '').trim();
        const normalizedCategory = rawCategory.toLowerCase().replace(/\s+/g, ' ');
        const aliasTargetName = categoryAliases[normalizedCategory];
        categoryMatch = updatedCategories.find(
          c => c.name === p.categoryName ||
               c.name === p.category ||
               c.name === aliasTargetName ||
               c.slug === rawCategory.toLowerCase().replace(/\s+/g, '-')
        );
      }
      
      const targetCategory = categoryMatch || updatedCategories.find(c => c.slug === 'general-products');
      if (targetCategory) {
        const needsUpdate = p.categoryId !== targetCategory.id || 
                            p.categoryName !== targetCategory.name || 
                            p.category !== targetCategory.name || 
                            p.productType !== targetCategory.type;
        if (needsUpdate) {
          console.log(`[Developer Diagnostics] Auditing and Synchronizing product '${p.name}': Setting core category to '${targetCategory.name}'`);
          await updateDocument('products', p.id, {
            category: targetCategory.name,
            categoryId: targetCategory.id,
            categoryName: targetCategory.name,
            productType: targetCategory.type,
            updatedAt: Date.now()
          });
        }
      }
    }
  } catch (error) {
    console.error('[Developer Diagnostics] Failed to seed default product categories or audit and synchronize catalog:', error);
  }
}

export async function getNextSequence(sequenceName: string): Promise<number | null> {
  const counterRef = doc(db, 'counters', sequenceName);
  
  try {
    const nextId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      if (!counterDoc.exists()) {
        transaction.set(counterRef, { current: 1 });
        return 1;
      }
      
      const newVal = (counterDoc.data()?.current || 0) + 1;
      transaction.update(counterRef, { current: newVal });
      return newVal;
    });
    
    return nextId;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `counters/${sequenceName}`);
    return null;
  }
}
