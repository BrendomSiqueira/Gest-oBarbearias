import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  doc as originalDoc,
  setDoc as originalSetDoc,
  getDoc as originalGetDoc,
  onSnapshot as originalOnSnapshot,
  collection as originalCollection,
  query as originalQuery,
  where as originalWhere,
  deleteDoc as originalDeleteDoc,
  updateDoc as originalUpdateDoc,
  getDocFromServer as originalGetDocFromServer
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase SDK
console.log('Firebase Init Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
  apiKeyLength: firebaseConfig.apiKey?.length,
  apiKeyStart: firebaseConfig.apiKey?.slice(0, 5)
});
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const firebaseAuth = getAuth();

// Initialize simulated session based on previous activeUID to prevent hijacking real logins
let simulatedUser: any = null;

// Allow persistent offline mode for contingency, do NOT clear force_offline on every reload.
// This prevents infinite reload-loops when the Firestore database quota is exceeded.
const activeUid = localStorage.getItem('simdb_active_uid');
if (activeUid) {
  simulatedUser = {
    uid: activeUid,
    email: localStorage.getItem('simdb_active_email') || 'matheus@barbershop.com',
    displayName: localStorage.getItem('simdb_active_name') || 'Matheus Farias'
  };
} else {
  simulatedUser = null;
}

let onAuthStateCallbacks: Array<(user: any) => void> = [];

export const setSimulatedUser = (user: any) => {
  simulatedUser = user;
  if (user) {
    localStorage.setItem('simdb_active_uid', user.uid);
    localStorage.setItem('simdb_active_email', user.email || '');
    localStorage.setItem('simdb_active_name', user.displayName || '');
  } else {
    localStorage.removeItem('simdb_active_uid');
    localStorage.removeItem('simdb_active_email');
    localStorage.removeItem('simdb_active_name');
  }
  onAuthStateCallbacks.forEach(cb => cb(user));
};

export const auth = new Proxy(firebaseAuth, {
  get(target, prop, receiver) {
    if (prop === 'currentUser') {
      return simulatedUser || firebaseAuth.currentUser;
    }
    if (prop === 'onAuthStateChanged') {
      return (cb: (user: any) => void) => {
        onAuthStateCallbacks.push(cb);
        // Call back immediately with the active simulated user or real user
        cb(simulatedUser || firebaseAuth.currentUser);
        
        const unsub = firebaseAuth.onAuthStateChanged((user) => {
          if (user) {
            localStorage.setItem('simdb_active_uid', user.uid);
            localStorage.setItem('simdb_active_email', user.email || '');
            localStorage.setItem('simdb_active_name', user.displayName || '');
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
        localStorage.removeItem('simdb_active_uid');
        localStorage.removeItem('simdb_active_email');
        localStorage.removeItem('simdb_active_name');
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
    errMsg.toLowerCase().includes('offline');

  if (isQuotaOrAvailabilityFailure) {
    if (localStorage.getItem('force_offline') === 'true') {
      throw new Error('Firestore quota exceeded or offline. Operating in Contingency Mode.');
    }
    console.error('CRITICAL: Firestore database quota exceeded or offline. Enabling automatic Local High Availability Contingency Mode...');
    localStorage.setItem('force_offline', 'true');
    const currentUid = auth.currentUser?.uid || 'matheus_farias';
    localStorage.setItem('simdb_active_uid', currentUid);
    
    // Smooth reload to boot in contingency mode
    setTimeout(() => {
      window.location.reload();
    }, 800);
    throw new Error('Firestore quota exceeded or offline. Activating Contingency Mode.');
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
      const userData = localStorage.getItem(storageKey);
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
  const raw = localStorage.getItem(`simdb_${collPath}`);
  if (!raw) {
    const segments = collPath.split('_');
    const col = segments[segments.length - 1];
    
    // Fallback recovery: scan localStorage for legacy barberpro_v2_ documents
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('barberpro_v2_') && key.endsWith(`_${col}`)) {
        const item = localStorage.getItem(key);
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
  localStorage.setItem(`simdb_${collPath}`, JSON.stringify(data));
};

export function doc(database: any, ...pathSegments: string[]) {
  const fullPath = pathSegments.join('/');
  const isOffline = fullPath.includes('offline_demo') || pathSegments[1] === 'offline_demo' || localStorage.getItem('force_offline') === 'true';
  const ref = originalDoc(database, ...pathSegments as [string, ...string[]]);
  
  (ref as any).isOffline = isOffline;
  (ref as any).customPath = fullPath;
  return ref;
}

export function collection(database: any, ...pathSegments: string[]) {
  const fullPath = pathSegments.join('/');
  const isOffline = fullPath.includes('offline_demo') || pathSegments[1] === 'offline_demo' || localStorage.getItem('force_offline') === 'true';
  const ref = originalCollection(database, ...pathSegments as [string, ...string[]]);
  
  (ref as any).isOffline = isOffline;
  (ref as any).customPath = fullPath;
  return ref;
}

export function query(queryRef: any, ...queryConstraints: any[]) {
  const isOffline = queryRef.isOffline || localStorage.getItem('force_offline') === 'true';
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
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        current = JSON.parse(raw);
      } catch {}
    }
    const merged = options?.merge ? { ...current, ...data } : data;
    localStorage.setItem(storageKey, JSON.stringify(merged));
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
  if (docRef.isOffline) {
    const path = docRef.customPath;
    const segments = path.split('/');
    
    if (segments.length === 2) {
      const uId = segments[1];
      const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
      const userData = localStorage.getItem(storageKey);
      
      let val;
      if (userData) {
        val = JSON.parse(userData);
      } else {
        let marketing_msg = "";
        let campaign_goal = "";
        
        // Scan for legacy values to recover
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith('barberpro_v2_')) {
            if (key.endsWith('_marketing_msg')) {
              try { marketing_msg = JSON.parse(localStorage.getItem(key) || '""') || ''; } catch {}
            }
            if (key.endsWith('_campaign_goal')) {
              try { campaign_goal = JSON.parse(localStorage.getItem(key) || '""') || ''; } catch {}
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
        localStorage.setItem(storageKey, JSON.stringify(val));
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
          localStorage.setItem(storageKey, JSON.stringify(res.data()));
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
    return handleFirestoreError(err, OperationType.GET, docRef.customPath || '');
  }
}

export async function getDocFromServer(docRef: any) {
  if (docRef.isOffline) {
    return getDoc(docRef);
  }
  return originalGetDocFromServer(docRef);
}

function isQuotaOrAvailabilityError(err: unknown): boolean {
  const errMsg = err instanceof Error ? err.message : String(err);
  return (
    errMsg.toLowerCase().includes('quota') || 
    errMsg.toLowerCase().includes('exhausted') || 
    errMsg.toLowerCase().includes('resource-exhausted') || 
    errMsg.toLowerCase().includes('unavailable') || 
    errMsg.toLowerCase().includes('failed-precondition') ||
    errMsg.toLowerCase().includes('offline')
  );
}

function activateContingencyMode() {
  if (localStorage.getItem('force_offline') === 'true') {
    return;
  }
  console.error('CRITICAL: Firestore database quota exceeded or offline. Enabling automatic Local High Availability Contingency Mode...');
  localStorage.setItem('force_offline', 'true');
  const currentUid = auth.currentUser?.uid || 'matheus_farias';
  localStorage.setItem('simdb_active_uid', currentUid);
  
  // Smooth reload to boot in contingency mode
  setTimeout(() => {
    window.location.reload();
  }, 1200);
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const path = docRef.customPath || '';
  
  if (docRef.isOffline) {
    localStorage.setItem("simdb_has_local_changes", "true");
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
  
  if (docRef.isOffline) {
    localStorage.setItem("simdb_has_local_changes", "true");
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
  
  if (docRef.isOffline) {
    const segments = path.split('/');
    if (segments.length > 2) {
      deleteFromLocalSimDB(path);
      
      const pendingDeletionsStr = localStorage.getItem("simdb_pending_deletions");
      const pendingDeletions = pendingDeletionsStr ? JSON.parse(pendingDeletionsStr) : [];
      pendingDeletions.push(path);
      localStorage.setItem("simdb_pending_deletions", JSON.stringify(pendingDeletions));
      localStorage.setItem("simdb_has_local_changes", "true");
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

  if (reference.isOffline) {
    setTimeout(() => {
      if (path.split('/').length === 2) {
        const uId = path.split('/')[1];
        const storageKey = uId === 'offline_demo' ? 'simdb_user_offline_demo' : `simdb_user_${uId}`;
        const userData = localStorage.getItem(storageKey);
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
            localStorage.setItem(storageKey, JSON.stringify(snap.data()));
          }
        } else if (segments.length === 3 || segments.length === 4) {
          if (snap.docs) {
            const collPath = customPath.replace(/\//g, '_');
            const docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            
            if (localStorage.getItem("simdb_has_local_changes") === "true") {
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
              saveMockCollectionData(collPath, docs);
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
    console.warn('onSnapshot error on path:', customPath, err);
    try {
      handleFirestoreError(err, OperationType.LIST, customPath);
    } catch (e) {
      // Ignored to avoid uncaught bubbling
    }
    if (onError) {
      onError(err);
    }
  };

  const unsubOriginal = originalOnSnapshot(reference, wrappedOnNext, wrappedOnError);

  return () => {
    unsubOriginal();
    listeners[path] = listeners[path].filter(cb => cb !== onNext);
  };
}
