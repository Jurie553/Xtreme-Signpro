import { getCollection, createDocument, getDocument, updateDocument } from './firestoreService';
import { query, collection, where, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface PublicToken {
  id?: string;
  token: string;
  relatedId: string; // The raw quoteId, jobId, etc.
  type: 'quote' | 'quote-approval' | 'job' | 'artwork-approval' | 'portal' | 'proof' | 'job-approval';
  expiresAt: number; // timestamp in ms
  createdAt: number;
  status: 'active' | 'revoked' | 'used';
  clientName?: string;
  projectName?: string;
  jobId?: string;
  clientId?: string;
  proofUrl?: string;
  createdBy?: string;
  publicUrl?: string;
  lastSentAt?: number;
}

/**
 * Creates or retrieves a secure public token for a specific document & context.
 */
export async function createSecureToken(
  relatedId: string,
  type: PublicToken['type'],
  durationDays: number = 30,
  extra: Partial<PublicToken> = {}
): Promise<string> {
  try {
    // Check if an active token already exists for this document and type to avoid bloat
    const tokenQuery = query(
      collection(db, 'public_tokens'),
      where('relatedId', '==', relatedId),
      where('type', '==', type),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap = await getDocs(tokenQuery);
    if (!snap.empty) {
      const existing = snap.docs[0].data() as PublicToken;
      if (existing.expiresAt > Date.now()) {
        const docId = snap.docs[0].id;
        // Update its lastSentAt and other passed details
        await updateDocument('public_tokens', docId, {
          lastSentAt: Date.now(),
          ...extra
        });
        return existing.token;
      }
    }

    // Generate a secure high-entropy token prefix
    const randomHex = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const token = `${type.replace('-approval', '')}_${randomHex}`;
    
    const baseUrl = getAppBaseUrl();
    const tokenData: PublicToken = {
      token,
      relatedId,
      type,
      expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      status: 'active',
      publicUrl: `${baseUrl}/public/approval/${token}`,
      lastSentAt: Date.now(),
      ...extra
    };

    await createDocument('public_tokens', tokenData);
    return token;
  } catch (error) {
    console.error('Error creating secure token:', error);
    // Fallback to random string
    return `${type}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Validates a secure token string, returning its target document ID if valid.
 */
export async function resolveAndVerifyToken(tokenStr: string): Promise<PublicToken | null> {
  if (!tokenStr) return null;
  try {
    const q = query(
      collection(db, 'public_tokens'),
      where('token', '==', tokenStr),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }
    const tokenData = { id: snap.docs[0].id, ...snap.docs[0].data() } as PublicToken;
    
    // Check expiration
    if (tokenData.expiresAt < Date.now()) {
      // Auto-expire
      await updateDocument('public_tokens', tokenData.id!, { status: 'revoked' });
      return { ...tokenData, status: 'revoked' };
    }
    
    return tokenData;
  } catch (err) {
    console.error('Error resolving secure token:', err);
    return null;
  }
}

/**
 * Link Generators using tokens or raw fallbacks.
 */
export async function generateQuoteViewLink(quoteId: string): Promise<string> {
  return `${getAppBaseUrl()}/quote/${quoteId}`;
}

export async function generateQuoteApprovalLink(quoteId: string): Promise<string> {
  const token = await createSecureToken(quoteId, 'quote-approval');
  return `${getAppBaseUrl()}/public/approval/${token}`;
}

export async function generateJobProgressLink(jobId: string): Promise<string> {
  return `${getAppBaseUrl()}/job/${jobId}`;
}

export async function generateArtworkApprovalLink(jobId: string): Promise<string> {
  const token = await createSecureToken(jobId, 'artwork-approval');
  return `${getAppBaseUrl()}/public/approval/${token}`;
}

export async function generateClientPortalLink(clientId: string): Promise<string> {
  return `${getAppBaseUrl()}/client-portal/${clientId}`;
}

export async function generateProofApprovalLink(jobId: string): Promise<string> {
  const token = await createSecureToken(jobId, 'proof');
  return `${getAppBaseUrl()}/public/approval/${token}`;
}

export async function generateJobApprovalLink(jobId: string): Promise<string> {
  const token = await createSecureToken(jobId, 'job-approval');
  return `${getAppBaseUrl()}/public/approval/${token}`;
}

/**
 * Returns clean web app origin with / handled
 */
export function getAppBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL || '';
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

export async function getExistingArtworkToken(jobId: string): Promise<PublicToken | null> {
  if (!jobId) return null;
  try {
    const q = query(
      collection(db, 'public_tokens'),
      where('relatedId', '==', jobId),
      where('type', '==', 'artwork-approval'),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const tokenObj = { id: snap.docs[0].id, ...snap.docs[0].data() } as PublicToken;
      if (tokenObj.expiresAt > Date.now()) {
        return tokenObj;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching existing artwork token:', error);
    return null;
  }
}
