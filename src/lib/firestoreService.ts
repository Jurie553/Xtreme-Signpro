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
import { db, auth } from './firebase';
import { useState, useEffect } from 'react';

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

export function useCollection<T>(collectionPath: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    try {
      const q = query(collection(db, collectionPath), ...constraints);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!isMounted) return;
        
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(docs);
        setLoading(false);
        setError(null);
      }, (err: any) => {
        if (!isMounted) return;
        const msg = err?.message || String(err);
        console.error(`Subscription error for ${collectionPath}:`, msg);
        setError(new Error(msg));
        setLoading(false);
      });
      
      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err: any) {
      if (isMounted) {
        setError(err);
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath, constraints.length]); 

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
    const docRef = await addDoc(collection(db, collectionPath), data);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
    return null;
  }
}

export async function updateDocument<T extends DocumentData>(collectionPath: string, id: string, data: Partial<T>) {
  try {
    const docRef = doc(db, collectionPath, id);
    await updateDoc(docRef, data as any);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${id}`);
    return false;
  }
}

export async function setDocument<T extends DocumentData>(collectionPath: string, id: string, data: T) {
  try {
    const docRef = doc(db, collectionPath, id);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionPath}/${id}`);
    return false;
  }
}

export async function deleteDocument(collectionPath: string, id: string) {
  try {
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
  const defaultCategories = [
    { name: 'Business Cards', slug: 'business-cards', type: 'Product', description: 'Standard size premium business cards with custom finishing', icon: 'Tag', active: true, productGroup: 'Small Format' },
    { name: 'Flyers', slug: 'flyers', type: 'Product', description: 'Single and double sided promotional hand-outs', icon: 'Layers', active: true, productGroup: 'Small Format' },
    { name: 'Posters', slug: 'posters', type: 'Product', description: 'Indoor and outdoor large size high-definition posters', icon: 'Layers', active: true, productGroup: 'Large Format' },
    { name: 'Stickers', slug: 'stickers', type: 'Product', description: 'Printed vinyl adhesive decals with custom kiss-cutting', icon: 'Tag', active: true, productGroup: 'Labels' },
    { name: 'Labels', slug: 'labels', type: 'Product', description: 'Roll and sheet labels for product packaging', icon: 'Tag', active: true, productGroup: 'Labels' },
    { name: 'Vinyl Banners', slug: 'vinyl-banners', type: 'Product', description: 'Heavy duty PVC wrap-wound banner options', icon: 'Layers', active: true, productGroup: 'Large Format' },
    { name: 'Correx Boards', slug: 'correx-boards', type: 'Product', description: 'Fluted plastic lightweight corrugated boards', icon: 'Box', active: true, productGroup: 'Rigid Media' },
    { name: 'Chromadek Signs', slug: 'chromadek-signs', type: 'Product', description: 'Heavy-duty steel outdoor protective signage', icon: 'Sparkles', active: true, productGroup: 'Rigid Media' },
    { name: 'Pull-up Banners', slug: 'pull-up-banners', type: 'Product', description: 'Retractable roll-up exhibition banner mechanisms', icon: 'Layers', active: true, productGroup: 'Large Format' },
    { name: 'Pop-up Banners', slug: 'pop-up-banners', type: 'Product', description: 'Pop-up spring steel promotional banner frames', icon: 'Layers', active: true, productGroup: 'Large Format' },
    { name: 'Gazebos', slug: 'gazebos', type: 'Product', description: 'Outdoor branded shade structures and gazebos', icon: 'Tent', active: true, productGroup: 'Large Format' },
    { name: 'NCR Books', slug: 'ncr-books', type: 'NCR', description: 'Duplicate/triplicate carbonless receipt and invoice books', icon: 'BookOpen', active: true, productGroup: 'Commercial Print' },
    { name: 'Booklets', slug: 'booklets', type: 'Product', description: 'Multi-page folded and stapled booklets and brochures', icon: 'BookOpen', active: true, productGroup: 'Commercial Print' },
    { name: 'Brochures', slug: 'brochures', type: 'Product', description: 'Multi-page gatefolded high-finish brochures', icon: 'Layers', active: true, productGroup: 'Commercial Print' },
    { name: 'Letterheads', slug: 'letterheads', type: 'Product', description: 'Corporate custom letterheads', icon: 'Layers', active: true, productGroup: 'Small Format' },
    { name: 'Litho Printing', slug: 'litho-printing', type: 'Litho', description: 'Offset/lithographic high-volume paper printing', icon: 'Printer', active: true, productGroup: 'Commercial Print' },
    { name: 'Digital Printing', slug: 'digital-printing', type: 'Product', description: 'Short-run laser and digital paper outputs', icon: 'Printer', active: true, productGroup: 'Small Format' },
    { name: 'Large Format', slug: 'large-format', type: 'Product', description: 'Wide-format prints, rolls, and poster prints', icon: 'Layers', active: true, productGroup: 'Large Format' },
    { name: 'Promotional Items', slug: 'promotional-items', type: 'Product', description: 'General printed promotional merchandise', icon: 'Briefcase', active: true, productGroup: 'Promo' },
    { name: 'Other', slug: 'other', type: 'Product', description: 'Custom products with manual costing specs', icon: 'Sliders', active: true, productGroup: 'Other' }
  ];

  try {
    const existing = await getCollection<any>('product_categories');
    const existingSlugs = new Set(existing.map(c => c.slug));
    
    let addedCount = 0;
    for (const cat of defaultCategories) {
      if (!existingSlugs.has(cat.slug)) {
        await createDocument('product_categories', {
          ...cat,
          defaultWorkflow: [],
          defaultCostingRules: {},
          compatibleMaterials: [],
          requiredFields: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        addedCount++;
      }
    }
    if (addedCount > 0) {
      console.log(`[Developer Diagnostics] Seeded ${addedCount} missing product categories.`);
    }

    // Dynamic Auditing and Synchronization of Products and Product Categories
    const updatedCategories = await getCollection<any>('product_categories');
    const products = await getCollection<any>('products');
    
    for (const p of products) {
      let categoryMatch = updatedCategories.find(c => c.id === p.categoryId);
      if (!categoryMatch) {
        categoryMatch = updatedCategories.find(
          c => c.name === p.categoryName || c.name === p.category || c.slug === p.category?.toLowerCase().replace(/\s+/g, '-')
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
