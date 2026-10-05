/**
 * Cofre Central de Credenciais & Persistência de Contas
 * Barbershop Matheus Farias
 *
 * Garante que todos os logins, usuários e senhas registrados no sistema
 * permaneçam salvos, sincronizados na nuvem (Firestore) e no armazenamento
 * local de alta disponibilidade, sempre disponíveis para acessos futuros.
 */

import { doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

export interface StoredAccount {
  uid: string;
  username: string;
  email: string;
  passHash: string;
  legacyPass?: string;
  customPass?: string;
  shopName?: string;
  phone?: string;
  cpf?: string;
  updatedAt: string;
  isMaster?: boolean;
  role?: "admin" | "manager" | "operator" | "client";
  emailVerified?: boolean;
}

const VAULT_STORAGE_KEY = "simdb_registered_users";
const MASTER_PASS_KEY = "barber_custom_pass";
const MASTER_PASS_HASH_KEY = "barber_custom_pass_hash";
const VAULT_LAST_SYNC_KEY = "simdb_vault_last_sync";

/**
 * Função de hash SHA-256 resiliente e determinística
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`barber_auth_${password}_salt_2026_enterprise_sec`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return "h_sha256_" + Math.abs(hash).toString(36);
  }
}

/**
 * Normaliza identificadores (email, username ou telefone) para chaves limpas
 */
export function normalizeAccountKey(identifier: string): string {
  if (!identifier) return "";
  return identifier
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 100);
}

/**
 * Retorna todos os usuários registrados salvos localmente
 */
export function getAllLocalVaultAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Salva a tabela local de usuários registrados
 */
function setLocalVaultAccounts(accounts: Record<string, StoredAccount>): void {
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn("Aviso ao salvar cofre de contas local:", err);
  }
}

/**
 * Inicializa e preserva as contas mestras do sistema
 */
export async function seedDefaultAccounts(): Promise<void> {
  const accounts = getAllLocalVaultAccounts();
  const defaultHash = await hashPassword("372087");
  const customPass = localStorage.getItem(MASTER_PASS_KEY);
  const customHash = localStorage.getItem(MASTER_PASS_HASH_KEY) || (customPass ? await hashPassword(customPass) : defaultHash);

  const defaultSeedList: Array<{
    keys: string[];
    uid: string;
    username: string;
    email: string;
    shopName: string;
    phone: string;
  }> = [
    {
      keys: ["matheus", "matheus@barbershop.com", "matheus_farias"],
      uid: "matheus_farias",
      username: "Matheus",
      email: "matheus@barbershop.com",
      shopName: "Barbearia Matheus Farias",
      phone: "(16) 99159-0078",
    },
    {
      keys: ["admin", "admin@barbershop.com"],
      uid: "matheus_farias",
      username: "Admin",
      email: "admin@barbershop.com",
      shopName: "Barbearia Matheus Farias",
      phone: "(16) 99159-0078",
    },
    {
      keys: ["brendom", "brendomsiqueira96@gmail.com", "brendom@barbershop.com"],
      uid: "matheus_farias",
      username: "Brendom",
      email: "brendomsiqueira96@gmail.com",
      shopName: "Barbearia Matheus Farias",
      phone: "(16) 99159-0078",
    },
  ];

  let modified = false;

  for (const seed of defaultSeedList) {
    for (const key of seed.keys) {
      const lowerKey = key.toLowerCase();
      if (!accounts[lowerKey]) {
        accounts[lowerKey] = {
          uid: seed.uid,
          username: seed.username,
          email: seed.email,
          passHash: customHash || defaultHash,
          shopName: seed.shopName,
          phone: seed.phone,
          updatedAt: new Date().toISOString(),
          isMaster: true,
          role: "admin",
          emailVerified: true,
        };
        modified = true;
      }
    }
  }

  if (modified) {
    setLocalVaultAccounts(accounts);
  }
}

/**
 * Salva ou atualiza uma conta no cofre de credenciais (Local e Firestore)
 */
export async function saveAccountToVault(data: {
  uid: string;
  email: string;
  username?: string;
  passwordPlain?: string;
  passHash?: string;
  shopName?: string;
  phone?: string;
  cpf?: string;
  role?: "admin" | "manager" | "operator" | "client";
  emailVerified?: boolean;
}): Promise<void> {
  const cleanEmail = data.email.trim().toLowerCase();
  const username = (data.username || cleanEmail.split("@")[0] || "Usuário").trim();
  const passHash = data.passHash || (data.passwordPlain ? await hashPassword(data.passwordPlain) : await hashPassword("372087"));
  const updatedAt = new Date().toISOString();

  // Determine role: default master users are admin, others default to manager or operator
  const isMaster =
    cleanEmail.includes("matheus") ||
    cleanEmail.includes("admin") ||
    cleanEmail.includes("brendom") ||
    data.uid === "matheus_farias";

  const assignedRole: "admin" | "manager" | "operator" | "client" =
    data.role || (isMaster ? "admin" : "manager");

  const account: StoredAccount = {
    uid: data.uid,
    username,
    email: cleanEmail,
    passHash,
    legacyPass: data.passwordPlain,
    customPass: data.passwordPlain,
    shopName: data.shopName || "Barbearia Matheus Farias",
    phone: data.phone || "",
    cpf: data.cpf || "",
    updatedAt,
    isMaster,
    role: assignedRole,
    emailVerified: data.emailVerified ?? true,
  };

  // 1. Salva no localStorage sob múltiplos aliases (email, username, etc.)
  const accounts = getAllLocalVaultAccounts();
  accounts[cleanEmail] = account;
  accounts[username.toLowerCase()] = account;
  if (!cleanEmail.includes("@")) {
    accounts[`${cleanEmail}@barbershop.com`] = account;
  }
  setLocalVaultAccounts(accounts);

  // Se for usuário padrão/matheus, atualiza o custom pass local
  if (
    cleanEmail.includes("matheus") ||
    cleanEmail.includes("admin") ||
    cleanEmail.includes("brendom") ||
    data.uid === "matheus_farias"
  ) {
    if (data.passwordPlain) {
      localStorage.setItem(MASTER_PASS_KEY, data.passwordPlain);
      localStorage.setItem(MASTER_PASS_HASH_KEY, passHash);
    }
  }

  // 2. Persiste na nuvem (Firestore) na coleção system_accounts para garantia entre dispositivos
  const accountKey = normalizeAccountKey(cleanEmail);
  try {
    await setDoc(
      doc(db, "system_accounts", accountKey),
      {
        uid: data.uid,
        username,
        email: cleanEmail,
        passHash,
        shopName: account.shopName,
        phone: account.phone,
        updatedAt,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Aviso ao salvar credencial em system_accounts no Firestore:", err);
  }

  // 3. Atualiza também no documento users/{userId} se aplicável
  try {
    await setDoc(
      doc(db, "users", data.uid),
      {
        username,
        email: cleanEmail,
        passwordHash: passHash,
        shopName: account.shopName,
        phone: account.phone,
        updatedAt,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Aviso ao atualizar users/{userId} com passwordHash:", err);
  }
}

/**
 * Atualiza a senha de um usuário no cofre de credenciais
 */
export async function updateAccountPassword(
  identifierOrUid: string,
  newPasswordPlain: string
): Promise<boolean> {
  if (!newPasswordPlain) return false;
  const newHash = await hashPassword(newPasswordPlain);
  const cleanId = identifierOrUid.trim().toLowerCase();
  const accounts = getAllLocalVaultAccounts();

  // Localiza a conta por e-mail, username ou uid
  let matchedAccount: StoredAccount | null = null;
  let matchedKey = "";

  for (const [key, acc] of Object.entries(accounts)) {
    if (
      key === cleanId ||
      acc.email.toLowerCase() === cleanId ||
      acc.username.toLowerCase() === cleanId ||
      acc.uid === identifierOrUid
    ) {
      matchedAccount = acc;
      matchedKey = key;
      break;
    }
  }

  const targetUid = matchedAccount ? matchedAccount.uid : (cleanId.includes("matheus") ? "matheus_farias" : cleanId);
  const targetEmail = matchedAccount ? matchedAccount.email : cleanId.includes("@") ? cleanId : `${cleanId}@barbershop.com`;
  const targetUsername = matchedAccount ? matchedAccount.username : cleanId.split("@")[0];

  // Atualiza no localStorage
  const updatedAccount: StoredAccount = {
    ...(matchedAccount || {
      uid: targetUid,
      email: targetEmail,
      username: targetUsername,
      shopName: "Barbearia Matheus Farias",
      phone: "",
    }),
    passHash: newHash,
    customPass: newPasswordPlain,
    legacyPass: newPasswordPlain,
    updatedAt: new Date().toISOString(),
  };

  accounts[targetEmail.toLowerCase()] = updatedAccount;
  accounts[targetUsername.toLowerCase()] = updatedAccount;
  if (matchedKey) accounts[matchedKey] = updatedAccount;
  setLocalVaultAccounts(accounts);

  // Se for administrador / Matheus
  if (
    targetUid === "matheus_farias" ||
    cleanId.includes("matheus") ||
    cleanId.includes("admin") ||
    cleanId.includes("brendom")
  ) {
    localStorage.setItem(MASTER_PASS_KEY, newPasswordPlain);
    localStorage.setItem(MASTER_PASS_HASH_KEY, newHash);
  }

  // Atualiza no Firestore system_accounts
  try {
    const accountKey = normalizeAccountKey(targetEmail);
    await setDoc(
      doc(db, "system_accounts", accountKey),
      {
        uid: targetUid,
        username: targetUsername,
        email: targetEmail,
        passHash: newHash,
        updatedAt: updatedAccount.updatedAt,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Aviso ao atualizar system_accounts no Firestore:", err);
  }

  // Atualiza no Firestore users/{targetUid}
  try {
    await setDoc(
      doc(db, "users", targetUid),
      {
        passwordHash: newHash,
        updatedAt: updatedAccount.updatedAt,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Aviso ao atualizar users no Firestore:", err);
  }

  return true;
}

/**
 * Sincroniza o cofre local de contas com o Firestore (Bidirecional)
 * Garante que contas criadas em outros navegadores ou no passado sejam restauradas
 */
export async function syncVaultWithFirestore(): Promise<Record<string, StoredAccount>> {
  await seedDefaultAccounts();
  const localAccounts = getAllLocalVaultAccounts();

  try {
    // 1. Tenta buscar todas as contas da coleção system_accounts no Firestore
    const snap = await getDocs(collection(db, "system_accounts"));
    let importedCount = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.email && data.passHash) {
        const emailLower = data.email.toLowerCase();
        const usernameLower = (data.username || emailLower.split("@")[0]).toLowerCase();

        // Se local não tiver ou Firestore tiver versão mais recente
        const existing = localAccounts[emailLower];
        if (!existing || (data.updatedAt && (!existing.updatedAt || data.updatedAt > existing.updatedAt))) {
          const acc: StoredAccount = {
            uid: data.uid || "user_" + emailLower.replace(/[^a-z0-9]/g, "_"),
            username: data.username || emailLower.split("@")[0],
            email: emailLower,
            passHash: data.passHash,
            shopName: data.shopName || "Barbearia Matheus Farias",
            phone: data.phone || "",
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
          localAccounts[emailLower] = acc;
          localAccounts[usernameLower] = acc;
          importedCount++;
        }
      }
    });

    if (importedCount > 0) {
      setLocalVaultAccounts(localAccounts);
    }

    // 2. Envia contas locais que ainda não estão no Firestore
    const localKeys = Object.keys(localAccounts);
    for (const key of localKeys) {
      const acc = localAccounts[key];
      // Só sobe a chave primária de e-mail para evitar duplicatas
      if (key === acc.email.toLowerCase() && acc.passHash) {
        const accountKey = normalizeAccountKey(acc.email);
        try {
          await setDoc(
            doc(db, "system_accounts", accountKey),
            {
              uid: acc.uid,
              username: acc.username,
              email: acc.email,
              passHash: acc.passHash,
              shopName: acc.shopName || "Barbearia Matheus Farias",
              phone: acc.phone || "",
              updatedAt: acc.updatedAt || new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {
          // Silent catch for network drops
        }
      }
    }

    localStorage.setItem(VAULT_LAST_SYNC_KEY, Date.now().toString());
  } catch (err) {
    console.warn("Aviso ao sincronizar cofre de contas com Firestore:", err);
  }

  return localAccounts;
}

/**
 * Valida credenciais informadas contra o cofre completo de contas
 */
export async function verifyCredentialsInVault(
  identifier: string,
  passwordInput: string
): Promise<{ matched: boolean; account?: StoredAccount; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const rawPass = passwordInput.trim();
  const paddedPass = rawPass.length < 6 ? rawPass.padEnd(6, "0") : rawPass;

  if (!cleanId) return { matched: false, error: "Identificador não fornecido" };
  if (!rawPass) return { matched: false, error: "Senha não fornecida" };

  // Garante que sementes padrão estejam carregadas
  await seedDefaultAccounts();
  const accounts = getAllLocalVaultAccounts();

  // Localiza por e-mail direto, username direto, ou alias com @barbershop.com
  let candidate: StoredAccount | undefined =
    accounts[cleanId] ||
    accounts[`${cleanId}@barbershop.com`] ||
    accounts[cleanId.split("@")[0]];

  // Se ainda não encontrou, busca iterativa por username ou uid
  if (!candidate) {
    for (const acc of Object.values(accounts)) {
      if (
        acc.username.toLowerCase() === cleanId ||
        acc.email.toLowerCase() === cleanId ||
        (acc.phone && acc.phone.replace(/\D/g, "") === cleanId.replace(/\D/g, "") && cleanId.length >= 8)
      ) {
        candidate = acc;
        break;
      }
    }
  }

  // Se for o usuário Matheus / Admin padrão
  const isDefaultMaster =
    cleanId === "matheus" ||
    cleanId === "admin" ||
    cleanId === "matheus_farias" ||
    cleanId === "matheus@barbershop.com" ||
    cleanId === "admin@barbershop.com" ||
    cleanId === "brendom" ||
    cleanId === "brendomsiqueira96@gmail.com" ||
    cleanId === "brendom@barbershop.com" ||
    cleanId.replace(/\D/g, "") === "16991590078";

  // Senhas padrão aceitas para administradores
  const customPass = localStorage.getItem(MASTER_PASS_KEY);
  const customPassHash = localStorage.getItem(MASTER_PASS_HASH_KEY);

  const rawPassHash = await hashPassword(rawPass);
  const paddedPassHash = await hashPassword(paddedPass);

  const isCustomMatch =
    (customPass && (rawPass === customPass || paddedPass === customPass)) ||
    (customPassHash && (rawPassHash === customPassHash || paddedPassHash === customPassHash));

  const isDefaultHardcodedMatch =
    rawPass === "372087" ||
    rawPass === "1234" ||
    paddedPass === "372087" ||
    paddedPass === "123400" ||
    paddedPass === "37208700";

  // Se bater como Master User
  if (isDefaultMaster && (isCustomMatch || isDefaultHardcodedMatch)) {
    const masterAccount: StoredAccount = candidate || {
      uid: "matheus_farias",
      username: "Matheus Farias",
      email: cleanId.includes("@") ? cleanId : "matheus@barbershop.com",
      passHash: customPassHash || rawPassHash,
      shopName: "Barbearia Matheus Farias",
      phone: "(16) 99159-0078",
      updatedAt: new Date().toISOString(),
      isMaster: true,
    };
    return { matched: true, account: masterAccount };
  }

  // Se encontrou conta registrada no cofre
  if (candidate) {
    const isHashMatch =
      candidate.passHash === rawPassHash ||
      candidate.passHash === paddedPassHash;

    const isPlainMatch =
      (candidate.customPass && (candidate.customPass === rawPass || candidate.customPass === paddedPass)) ||
      (candidate.legacyPass && (candidate.legacyPass === rawPass || candidate.legacyPass === paddedPass));

    if (isHashMatch || isPlainMatch || (candidate.isMaster && isDefaultHardcodedMatch)) {
      return { matched: true, account: candidate };
    }
  }

  // Tenta checar diretamente no Firestore system_accounts caso a conta tenha sido criada em outro navegador
  try {
    const accountKey = normalizeAccountKey(cleanId);
    const snap = await getDoc(doc(db, "system_accounts", accountKey));
    if (snap.exists()) {
      const data = snap.data() as StoredAccount;
      if (
        data.passHash === rawPassHash ||
        data.passHash === paddedPassHash ||
        (data.isMaster && isDefaultHardcodedMatch)
      ) {
        // Salva localmente para acessos futuros instantâneos
        accounts[cleanId] = data;
        accounts[data.email.toLowerCase()] = data;
        setLocalVaultAccounts(accounts);
        return { matched: true, account: data };
      }
    }
  } catch (err) {
    // Ignora erro de rede
  }

  return { matched: false, error: "Usuário ou senha incorretos." };
}
