import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc as originalDoc,
  setDoc as originalSetDoc,
  getDoc as originalGetDoc,
  onSnapshot as originalOnSnapshot,
  collection as originalCollection,
  query as originalQuery,
  where as originalWhere,
  deleteDoc as originalDeleteDoc,
  updateDoc as originalUpdateDoc,
  getDocFromServer as originalGetDocFromServer,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase SDK with persistent multi-tab cache and auto-detect long polling
const app = initializeApp(firebaseConfig);
let firestoreDb: any;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: typeof window !== 'undefined'
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : undefined
  }, firebaseConfig.firestoreDatabaseId);
} catch {
  try {
    firestoreDb = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
  } catch {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}
export const db = firestoreDb;

const firebaseAuth = getAuth();

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {}
  },
  getKeys: (): string[] => {
    try {
      return typeof localStorage !== 'undefined' ? Object.keys(localStorage) : [];
    } catch {
      return [];
    }
  }
};

export const isContingencyActive = (): boolean => {
  const forceOffline = safeStorage.getItem('force_offline') === 'true';
  const quotaExhausted = safeStorage.getItem('firestore_quota_exhausted') === 'true';
  const quotaTime = safeStorage.getItem('firestore_quota_exhausted_time');
  
  if (quotaExhausted && quotaTime) {
    const elapsed = Date.now() - Number(quotaTime);
    // Auto-recover after 10 minutes so fresh sessions or expired quota resets automatically
    if (elapsed > 10 * 60 * 1000) {
      safeStorage.removeItem('force_offline');
      safeStorage.removeItem('firestore_quota_exhausted');
      safeStorage.removeItem('firestore_quota_exhausted_time');
      try {
        enableNetwork(firestoreDb).catch(() => {});
      } catch {}
      return false;
    }
    return true;
  }
  return forceOffline;
};

export const restoreOnlineConnection = async () => {
  safeStorage.removeItem('force_offline');
  safeStorage.removeItem('firestore_quota_exhausted');
  safeStorage.removeItem('firestore_quota_exhausted_time');
  try {
    await enableNetwork(firestoreDb);
    console.log('[Connection Restored]: Firestore network enabled successfully.');
  } catch (err) {
    console.warn('[Connection Restore Warning]:', err);
  }
};

// Clear any stale offline flags on fresh app startup to ensure real database is always contacted
const quotaTimeOnStart = safeStorage.getItem('firestore_quota_exhausted_time');
if (quotaTimeOnStart) {
  const elapsed = Date.now() - Number(quotaTimeOnStart);
  if (elapsed > 10 * 60 * 1000) {
    safeStorage.removeItem('force_offline');
    safeStorage.removeItem('firestore_quota_exhausted');
    safeStorage.removeItem('firestore_quota_exhausted_time');
  }
} else {
  // If no timestamp recorded, remove any accidental offline flag
  safeStorage.removeItem('force_offline');
  safeStorage.removeItem('firestore_quota_exhausted');
}

// Ensure network connection is active
try {
  enableNetwork(firestoreDb).catch(() => {});
} catch {}

export const getGoogleLink = (emailOrUid: string): string | null => {
  if (!emailOrUid) return null;
  const key = emailOrUid.toLowerCase().trim();
  try {
    const raw = safeStorage.getItem('simdb_google_links');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[key]) return parsed[key];
    }
  } catch {}
  return null;
};

export const setGoogleLink = (googleEmail: string, googleUid: string, targetBarberId: string): void => {
  try {
    const raw = safeStorage.getItem('simdb_google_links');
    const links = raw ? JSON.parse(raw) : {};
    if (googleEmail) links[googleEmail.toLowerCase().trim()] = targetBarberId;
    if (googleUid) links[googleUid.trim()] = targetBarberId;
    safeStorage.setItem('simdb_google_links', JSON.stringify(links));
  } catch (e) {
    console.error('Error saving google link:', e);
  }
};

export const removeGoogleLink = (googleEmail?: string, googleUid?: string): void => {
  try {
    const raw = safeStorage.getItem('simdb_google_links');
    if (!raw) return;
    const links = JSON.parse(raw);
    if (googleEmail) delete links[googleEmail.toLowerCase().trim()];
    if (googleUid) delete links[googleUid.trim()];
    safeStorage.setItem('simdb_google_links', JSON.stringify(links));
  } catch (e) {
    console.error('Error removing google link:', e);
  }
};

let simulatedUser: any = null;
let onAuthStateCallbacks: Array<(user: any) => void> = [];

export const setSimulatedUser = (user: any) => {
  simulatedUser = user;
  if (user) {
    safeStorage.setItem('simdb_active_uid', user.uid);
    safeStorage.setItem('simdb_active_email', user.email || '');
    safeStorage.setItem('simdb_active_name', user.displayName || '');
  } else {
    safeStorage.removeItem('simdb_active_uid');
    safeStorage.removeItem('simdb_active_email');
    safeStorage.removeItem('simdb_active_name');
  }
  onAuthStateCallbacks.forEach(cb => {
    try {
      cb(user);
    } catch (err) {
      console.error('Auth state callback error:', err);
    }
  });
};

export const auth = new Proxy(firebaseAuth, {
  get(target, prop, receiver) {
    if (prop === 'currentUser') {
      return simulatedUser || firebaseAuth.currentUser;
    }
    if (prop === 'onAuthStateChanged') {
      return (cb: (user: any) => void) => {
        onAuthStateCallbacks.push(cb);
        // Call back immediately with current state
        cb(simulatedUser || firebaseAuth.currentUser);
        
        const unsub = firebaseAuth.onAuthStateChanged((user) => {
          if (user) {
            safeStorage.setItem('simdb_active_uid', user.uid);
            safeStorage.setItem('simdb_active_email', user.email || '');
            safeStorage.setItem('simdb_active_name', user.displayName || '');
          }
          if (!simulatedUser) {
            cb(user);
          }
        });
        return () => {
          unsub();
          onAuthStateCallbacks = onAuthStateCallbacks.filter(c => c !== cb);
        };
      };
    }
    if (prop === 'signOut') {
      return async () => {
        simulatedUser = null;
        safeStorage.removeItem('simdb_active_uid');
        safeStorage.removeItem('simdb_active_email');
        safeStorage.removeItem('simdb_active_name');
        onAuthStateCallbacks.forEach(cb => cb(null));
        return firebaseAuth.signOut();
      };
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
}) as any;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.warn('Handling Firestore Error:', errMsg, 'at path:', path);

  const isQuotaOrAvailabilityFailure = 
    errMsg.toLowerCase().includes('quota') || 
    errMsg.toLowerCase().includes('exhausted') || 
    errMsg.toLowerCase().includes('resource-exhausted') || 
    errMsg.toLowerCase().includes('unavailable') || 
    errMsg.toLowerCase().includes('failed-precondition') ||
    errMsg.toLowerCase().includes('offline') ||
    errMsg.toLowerCase().includes('could not reach cloud firestore backend');

  if (isQuotaOrAvailabilityFailure) {
    console.warn('Firestore is temporarily offline or unavailable. Operating with local cache/contingency mode for path:', path);
    activateContingencyMode();
    return undefined as never;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: (auth.currentUser?.providerData || []).map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      }))
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ===============================================================
// VIRTUAL FIRESTORE database FOR OFFLINE DEMO MODE
// ===============================================================

const listeners: { [path: string]: Array<(snapshot: any) => void> } = {};

const triggerListeners = (path: string) => {
  if (listeners[path]) {
    if (path.split('/').length === 2) {
      // Root user
      const uId = path.split('/')[1];
      const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
      const userData = safeStorage.getItem(storageKey);
      const val = userData ? JSON.parse(rawOr(userData, '{}')) : {
        ...getInitialUserData(),
        username: uId,
        shopName: uId === 'matheus_farias' ? 'Barbearia Matheus Farias' : `Barbearia de ${uId.replace(/_/g, ' ')}`,
      };
      listeners[path].forEach(cb => cb({
        exists: () => true,
        data: () => val
      }));
    } else {
      const collPath = path.replace(/\//g, '_');
      const data = getMockCollectionData(collPath);
      const snap = {
        docs: data.map((d: any) => ({
          id: d.id,
          data: () => d
        }))
      };
      listeners[path].forEach(cb => cb(snap));
    }
  }
};

const rawOr = (val: any, fallback: string): string => val || fallback;

const getInitialUserData = () => ({
  username: 'admin',
  shopName: 'Barbearia Matheus Farias',
  phone: '',
  profileImage: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=400&h=400&auto=format&fit=crop",
  monthlyGoal: 5000,
  marketing_msg: "",
  campaign_goal: "",
  privacy_mode: false,
  migrated: true
});

const getMockCollectionData = (collPath: string): any[] => {
  const raw = safeStorage.getItem(`simdb_${collPath}`);
  if (!raw) {
    const segments = collPath.split('_');
    const col = segments[segments.length - 1];
    
    // Fallback recovery: scan localStorage for legacy barberpro_v2_ documents
    const keys = safeStorage.getKeys();
    for (const key of keys) {
      if (key.startsWith('barberpro_v2_') && key.endsWith(`_${col}`)) {
        const item = safeStorage.getItem(key);
        if (item) {
          try {
            const data = JSON.parse(item);
            if (Array.isArray(data) && data.length > 0) {
              console.log(`[Backup System] Legacy recovery restored ${col} from local storage key: ${key}`);
              saveMockCollectionData(collPath, data);
              return data;
            }
          } catch {}
        }
      }
    }

    // Return some initial setup data
    if (collPath.endsWith('_services')) {
      return [
        { id: '1', name: 'Corte Social', price: 35, duration: 30 },
        { id: '2', name: 'Degradê Especial', price: 45, duration: 45 },
        { id: '3', name: 'Barba Terapia', price: 25, duration: 25 },
        { id: '4', name: 'Corte + Barba (Combo)', price: 55, duration: 60 },
        { id: '5', name: 'Sobrancelha', price: 15, duration: 15 },
        { id: '6', name: 'Pigmentação Cabelo/Barba', price: 30, duration: 30 },
        { id: '7', name: 'Selagem Térmica', price: 80, duration: 90 },
        { id: '8', name: 'Luzes / Platinado', price: 90, duration: 120 },
      ];
    }
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveMockCollectionData = (collPath: string, data: any[]) => {
  safeStorage.setItem(`simdb_${collPath}`, JSON.stringify(data));
};

export function doc(database: any, ...pathSegments: string[]) {
  const fullPath = pathSegments.join('/');
  const isOffline = 
    fullPath.includes('offline_demo') || 
    pathSegments[1] === 'offline_demo' || 
    isContingencyActive();
  const ref = originalDoc(database, ...pathSegments as [string, ...string[]]);
  
  (ref as any).isOffline = isOffline;
  (ref as any).customPath = fullPath;
  return ref;
}

export function collection(database: any, ...pathSegments: string[]) {
  const fullPath = pathSegments.join('/');
  const isOffline = 
    fullPath.includes('offline_demo') || 
    pathSegments[1] === 'offline_demo' || 
    isContingencyActive();
  const ref = originalCollection(database, ...pathSegments as [string, ...string[]]);
  
  (ref as any).isOffline = isOffline;
  (ref as any).customPath = fullPath;
  return ref;
}

export function query(queryRef: any, ...queryConstraints: any[]) {
  const isOffline = queryRef.isOffline || isContingencyActive();
  const ref = originalQuery(queryRef, ...queryConstraints);
  (ref as any).isOffline = isOffline;
  (ref as any).customPath = queryRef.customPath;
  return ref;
}

export function where(fieldPath: string, opStr: any, value: any) {
  return originalWhere(fieldPath, opStr, value);
}

function saveToLocalSimDB(path: string, data: any, options?: any) {
  const segments = path.split('/');
  
  if (segments.length === 2) {
    const uId = segments[1];
    const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
    let current = {};
    const raw = safeStorage.getItem(storageKey);
    if (raw) {
      try {
        current = JSON.parse(raw);
      } catch {}
    }
    const merged = options?.merge ? { ...current, ...data } : data;
    safeStorage.setItem(storageKey, JSON.stringify(merged));
    triggerListeners(path);
  } else {
    const collPath = segments.slice(0, -1).join('_');
    const collKey = segments.slice(0, -1).join('/');
    const docId = segments[segments.length - 1];
    const items = getMockCollectionData(collPath);
    
    const idx = items.findIndex((i: any) => i.id === docId);
    if (idx >= 0) {
      items[idx] = options?.merge ? { ...items[idx], ...data } : { ...data, id: docId };
    } else {
      items.push({ id: docId, ...data });
    }
    saveMockCollectionData(collPath, items);
    triggerListeners(collKey);
  }
}

function deleteFromLocalSimDB(path: string) {
  const segments = path.split('/');
  if (segments.length > 2) {
    const collPath = segments.slice(0, -1).join('_');
    const collKey = segments.slice(0, -1).join('/');
    const docId = segments[segments.length - 1];
    let items = getMockCollectionData(collPath);
    items = items.filter((i: any) => i.id !== docId);
    saveMockCollectionData(collPath, items);
    triggerListeners(collKey);
  }
}

export async function getDoc(docRef: any) {
  if (docRef.isOffline || isContingencyActive()) {
    const path = docRef.customPath;
    const segments = path ? path.split('/') : [];
    
    if (segments.length === 2) {
      const uId = segments[1];
      const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
      const userData = safeStorage.getItem(storageKey);
      
      let val;
      if (userData) {
        val = JSON.parse(userData);
      } else {
        let marketing_msg = "";
        let campaign_goal = "";
        
        // Scan for legacy values to recover
        const keys = safeStorage.getKeys();
        for (const key of keys) {
          if (key.startsWith('barberpro_v2_')) {
            if (key.endsWith('_marketing_msg')) {
              try { marketing_msg = JSON.parse(safeStorage.getItem(key) || '""') || ''; } catch {}
            }
            if (key.endsWith('_campaign_goal')) {
              try { campaign_goal = JSON.parse(safeStorage.getItem(key) || '""') || ''; } catch {}
            }
          }
        }

        val = {
          ...getInitialUserData(),
          username: uId === 'matheus_farias' ? 'Matheus Farias' : uId,
          shopName: uId === 'matheus_farias' ? 'Barbearia Matheus Farias' : `Barbearia de ${uId.replace(/_/g, ' ')}`,
          marketing_msg,
          campaign_goal,
        };
        safeStorage.setItem(storageKey, JSON.stringify(val));
      }

      return {
        exists: () => true,
        data: () => val
      };
    } else {
      const collPath = segments.slice(0, -1).join('_');
      const docId = segments[segments.length - 1];
      const items = getMockCollectionData(collPath);
      const matched = items.find((i: any) => i.id === docId);
      return {
        exists: () => !!matched,
        data: () => matched
      };
    }
  }
  
  // Online getDoc - fetch and silently cash locally
  try {
    const res = await originalGetDoc(docRef);
    try {
      const path = docRef.customPath;
      if (path && res.exists()) {
        const segments = path.split('/');
        if (segments.length === 2) {
          const uId = segments[1];
          const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
          safeStorage.setItem(storageKey, JSON.stringify(res.data()));
        } else {
          const collPath = segments.slice(0, -1).join('_');
          const docId = segments[segments.length - 1];
          const items = getMockCollectionData(collPath);
          const idx = items.findIndex((i: any) => i.id === docId);
          if (idx >= 0) {
            items[idx] = { id: docId, ...(res.data() as any) };
          } else {
            items.push({ id: docId, ...(res.data() as any) });
          }
          saveMockCollectionData(collPath, items);
        }
      }
    } catch (err) {
      console.warn('Error backing up getDoc result locally:', err);
    }
    return res;
  } catch (err) {
    if (isQuotaOrAvailabilityError(err)) {
      activateContingencyMode();
      const path = docRef.customPath;
      if (path) {
        const segments = path.split('/');
        if (segments.length === 2) {
          const uId = segments[1];
          const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
          const userData = safeStorage.getItem(storageKey);
          if (userData) {
            try {
              return { exists: () => true, data: () => JSON.parse(userData) };
            } catch {}
          }
          return { exists: () => true, data: () => getInitialUserData() };
        } else {
          const collPath = segments.slice(0, -1).join('_');
          const docId = segments[segments.length - 1];
          const items = getMockCollectionData(collPath);
          const matched = items.find((i: any) => i.id === docId);
          return {
            exists: () => !!matched,
            data: () => matched
          };
        }
      }
      return { exists: () => false, data: () => undefined };
    }
    return handleFirestoreError(err, OperationType.GET, docRef.customPath || '');
  }
}

export async function getDocFromServer(docRef: any) {
  if (docRef.isOffline || isContingencyActive()) {
    return getDoc(docRef);
  }
  try {
    return await originalGetDocFromServer(docRef);
  } catch (err) {
    if (isQuotaOrAvailabilityError(err)) {
      return getDoc(docRef);
    }
    throw err;
  }
}

export function isQuotaOrAvailabilityError(err: unknown): boolean {
  const errMsg = err instanceof Error ? err.message : String(err);
  const lower = errMsg.toLowerCase();
  const code = (err as any)?.code ? String((err as any).code).toLowerCase() : "";
  return (
    code === 'resource-exhausted' ||
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    lower.includes('quota') || 
    lower.includes('exhausted') || 
    lower.includes('resource-exhausted') || 
    lower.includes('resource_exhausted') || 
    lower.includes('unavailable') || 
    lower.includes('failed-precondition') ||
    lower.includes('offline') ||
    lower.includes('could not reach') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('deadline') ||
    lower.includes('failed to fetch')
  );
}

export function activateContingencyMode(reason?: string) {
  safeStorage.setItem('force_offline', 'true');
  safeStorage.setItem('firestore_quota_exhausted', 'true');
  safeStorage.setItem('firestore_quota_exhausted_time', Date.now().toString());
  const currentUid = auth.currentUser?.uid || 'matheus_farias';
  safeStorage.setItem('simdb_active_uid', currentUid);
  try {
    disableNetwork(firestoreDb).catch(() => {});
  } catch {}
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const path = docRef.customPath || '';
  
  if (docRef.isOffline || isContingencyActive()) {
    safeStorage.setItem("simdb_has_local_changes", "true");
    saveToLocalSimDB(path, data, options);
    return;
  }
  
  // Sync to local Quiet Backup
  try {
    saveToLocalSimDB(path, data, options);
  } catch (err) {
    console.error('Error syncing online write to local simdb backup:', err);
  }
  
  try {
    return await originalSetDoc(docRef, data, options);
  } catch (err) {
    if (isQuotaOrAvailabilityError(err)) {
      activateContingencyMode();
      return; // Fallback succeeded via saveToLocalSimDB above!
    }
    throw err;
  }
}

export async function updateDoc(docRef: any, data: any) {
  const path = docRef.customPath || '';
  
  if (docRef.isOffline || isContingencyActive()) {
    safeStorage.setItem("simdb_has_local_changes", "true");
    saveToLocalSimDB(path, data, { merge: true });
    return;
  }
  
  try {
    saveToLocalSimDB(path, data, { merge: true });
  } catch (err) {
    console.error('Error syncing online update to local simdb backup:', err);
  }
  
  try {
    return await originalUpdateDoc(docRef, data);
  } catch (err) {
    if (isQuotaOrAvailabilityError(err)) {
      activateContingencyMode();
      return; // Fallback succeeded via saveToLocalSimDB above!
    }
    throw err;
  }
}

export async function deleteDoc(docRef: any) {
  const path = docRef.customPath || '';
  
  if (docRef.isOffline || isContingencyActive()) {
    const segments = path.split('/');
    if (segments.length > 2) {
      deleteFromLocalSimDB(path);
      
      const pendingDeletionsStr = safeStorage.getItem("simdb_pending_deletions");
      const pendingDeletions = pendingDeletionsStr ? JSON.parse(pendingDeletionsStr) : [];
      pendingDeletions.push(path);
      safeStorage.setItem("simdb_pending_deletions", JSON.stringify(pendingDeletions));
      safeStorage.setItem("simdb_has_local_changes", "true");
    }
    return;
  }
  
  try {
    deleteFromLocalSimDB(path);
  } catch (err) {
    console.error('Error syncing online delete to local simdb backup:', err);
  }
  
  try {
    return await originalDeleteDoc(docRef);
  } catch (err) {
    if (isQuotaOrAvailabilityError(err)) {
      activateContingencyMode();
      return; // Fallback succeeded via deleteFromLocalSimDB above!
    }
    throw err;
  }
}

export function onSnapshot(reference: any, onNext: any, onError?: any) {
  const path = reference.customPath || '';
  
  if (!listeners[path]) {
    listeners[path] = [];
  }
  listeners[path].push(onNext);

  if (reference.isOffline || isContingencyActive()) {
    setTimeout(() => {
      if (path.split('/').length === 2) {
        const uId = path.split('/')[1];
        const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
        const userData = safeStorage.getItem(storageKey);
        const val = userData ? JSON.parse(userData) : {
          ...getInitialUserData(),
          username: uId,
          shopName: uId === 'matheus_farias' ? 'Barbearia Matheus Farias' : `Barbearia de ${uId.replace(/_/g, ' ')}`,
        };
        onNext({
          exists: () => true,
          data: () => val
        });
      } else {
        const collPath = path.replace(/\//g, '_');
        const items = getMockCollectionData(collPath);
        onNext({
          docs: items.map((item: any) => ({
            id: item.id,
            data: () => item
          }))
        });
      }
    }, 0);
    
    return () => {
      listeners[path] = listeners[path].filter(cb => cb !== onNext);
    };
  }
  
  const customPath = reference.customPath;
  const wrappedOnNext = (snap: any) => {
    try {
      if (customPath) {
        const segments = customPath.split('/');
        if (segments.length === 2) {
          if (snap.exists && snap.exists()) {
            const uId = segments[1];
            const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
            safeStorage.setItem(storageKey, JSON.stringify(snap.data()));
          }
        } else if (segments.length === 3 || segments.length === 4) {
          if (snap.docs) {
            const collPath = customPath.replace(/\//g, '_');
            const docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            
            if (safeStorage.getItem("simdb_has_local_changes") === "true") {
              const localItems = getMockCollectionData(collPath);
              const mergedDocs = [...localItems];
              docs.forEach((cloudItem: any) => {
                const idx = mergedDocs.findIndex(li => li.id === cloudItem.id);
                if (idx >= 0) {
                  mergedDocs[idx] = cloudItem;
                } else {
                  mergedDocs.push(cloudItem);
                }
              });
              saveMockCollectionData(collPath, mergedDocs);
            } else {
              const localItems = getMockCollectionData(collPath);
              if (docs.length === 0 && localItems.length > 0) {
                console.warn(`[Data Protection] Cloud returned 0 items for ${collPath} while local storage has ${localItems.length} items. Preserving local records.`);
              } else {
                saveMockCollectionData(collPath, docs);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error syncing onSnapshot to local simdb backup:', err);
    }
    onNext(snap);
  };

  const wrappedOnError = (err: any) => {
    console.warn('onSnapshot intercepted error on path:', customPath, err);
    
    const isTransientOrQuota = isQuotaOrAvailabilityError(err);
    if (isTransientOrQuota) {
      activateContingencyMode('onSnapshot quota/unavailable error');
    }

    try {
      if (customPath) {
        const segments = customPath.split('/');
        if (segments.length === 2) {
          // Document path like users/matheus_farias or system/config
          const uId = segments[1];
          const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
          const userData = safeStorage.getItem(storageKey);
          const val = userData ? JSON.parse(rawOr(userData, '{}')) : {
            ...getInitialUserData(),
            username: uId,
            shopName: uId === 'matheus_farias' ? 'Barbearia Matheus Farias' : `Barbearia de ${uId.replace(/_/g, ' ')}`,
          };
          onNext({
            exists: () => true,
            data: () => val
          });
        } else {
          // Collection path like users/matheus_farias/clients
          const collPath = customPath.replace(/\//g, '_');
          const items = getMockCollectionData(collPath);
          onNext({
            docs: (items || []).map((item: any) => ({
              id: item.id,
              data: () => item
            }))
          });
        }
      }
    } catch (e) {
      console.warn('Fallback recovery error:', e);
    }

    // Only forward non-transient, non-quota errors (e.g. permission-denied) to onError to avoid crashing during reconnects/quota limits
    if (!isTransientOrQuota && onError) {
      onError(err);
    }
  };

  const unsubOriginal = originalOnSnapshot(reference, wrappedOnNext, wrappedOnError);

  return () => {
    unsubOriginal();
    listeners[path] = listeners[path].filter(cb => cb !== onNext);
  };
}

// Global safety interceptors to protect the app from unhandled quota exhaustion errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event?.error?.message || event?.message || '';
    if (isQuotaOrAvailabilityError(msg)) {
      activateContingencyMode('Global error interceptor detected quota exhaustion');
      event.preventDefault?.();
      event.stopPropagation?.();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || String(event?.reason || '');
    if (isQuotaOrAvailabilityError(msg)) {
      activateContingencyMode('Unhandled rejection detected quota exhaustion');
      event.preventDefault?.();
      event.stopPropagation?.();
    }
  });

  if (typeof console !== 'undefined') {
    const origError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map(a => String(a?.message || a)).join(' ');
      if (isQuotaOrAvailabilityError(msg)) {
        activateContingencyMode('Console error quota interceptor');
        return;
      }
      origError.apply(console, args);
    };
  }
}

