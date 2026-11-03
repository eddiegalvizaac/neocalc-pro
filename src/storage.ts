import type { State } from "./model";
import { validateState } from "./validation";
const enc = new TextEncoder(),
  dec = new TextDecoder();
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_CIPHERTEXT = 2_000_000;
export type Envelope = {
  salt: number[];
  iv: number[];
  data: number[];
  version: 1;
  revision?: number;
};
export class ConflictError extends Error {
  constructor() {
    super(
      "Cofre alterado em outra aba. Desbloqueie novamente para carregar a versão atual.",
    );
    this.name = "ConflictError";
  }
}
// Opening/re-encrypting a v1 vault must keep the original credential semantics.
export function assertCredential(password: string) {
  if (typeof password !== "string" || password.length < 12)
    throw Error("Informe a senha do cofre (mínimo original de 12 caracteres).");
}
export function assertPassword(password: string) {
  if (
    typeof password !== "string" ||
    [...password].length < 12 ||
    password.length > 1024 ||
    !password.trim()
  )
    throw Error(
      "Use uma senha forte com pelo menos 12 caracteres (máximo 1024).",
    );
}
function bytes(v: unknown, min: number, max: number) {
  if (
    !Array.isArray(v) ||
    v.length < min ||
    v.length > max ||
    !v.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
  )
    throw Error("Envelope criptografado inválido.");
  return v as number[];
}
export function validateEnvelope(value: unknown): Envelope {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Backup incompatível.");
  const e = value as Record<string, unknown>;
  if (
    e.version !== 1 ||
    Object.keys(e).some(
      (k) => !["salt", "iv", "data", "version", "revision"].includes(k),
    ) ||
    (e.revision !== undefined &&
      (!Number.isSafeInteger(e.revision) || Number(e.revision) < 0))
  )
    throw Error("Backup incompatível.");
  return {
    version: 1,
    salt: bytes(e.salt, 16, 16),
    iv: bytes(e.iv, 12, 12),
    data: bytes(e.data, 16, MAX_CIPHERTEXT),
    ...(e.revision === undefined ? {} : { revision: Number(e.revision) }),
  };
}
async function key(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 600000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(state: State, password: string): Promise<Envelope> {
  assertCredential(password);
  const payload = enc.encode(JSON.stringify(validateState(state)));
  if (payload.length > MAX_CIPHERTEXT - 16)
    throw Error(
      "Cofre excede o limite de 2 MB de conteúdo. Exporte o backup e revise os registros.",
    );
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(password, salt),
    payload,
  );
  return {
    version: 1,
    salt: [...salt],
    iv: [...iv],
    data: [...new Uint8Array(data)],
  };
}
export async function unseal(value: unknown, password: string): Promise<State> {
  assertCredential(password);
  const e = validateEnvelope(value);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(e.iv) },
    await key(password, new Uint8Array(e.salt)),
    new Uint8Array(e.data),
  );
  return validateState(JSON.parse(dec.decode(plain)));
}
export async function decodeBackup(text: string, password: string) {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw Error("Backup excede o limite de 10 MB.");
  return unseal(JSON.parse(text), password);
}
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("neocalc-vault", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("vault");
    r.onsuccess = () => {
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(
        Error(
          "Banco bloqueado por outra aba. Feche as outras abas e tente novamente.",
        ),
      );
  });
}
export async function readVault(): Promise<Envelope | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("vault");
    let value: unknown;
    const r = t.objectStore("vault").get("state");
    r.onsuccess = () => {
      value = r.result;
    };
    t.oncomplete = () => {
      d.close();
      try {
        resolve(value === undefined ? undefined : validateEnvelope(value));
      } catch (e) {
        reject(e);
      }
    };
    t.onabort = () => {
      d.close();
      reject(t.error || Error("Leitura interrompida."));
    };
    t.onerror = () => {
      d.close();
      reject(t.error || Error("Falha de leitura."));
    };
  });
}
export async function writeVault(
  value: Envelope,
  expectedRevision = 0,
): Promise<number> {
  const e = validateEnvelope(value);
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    expectedRevision >= Number.MAX_SAFE_INTEGER
  )
    throw Error("Revisão inválida.");
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("vault", "readwrite"),
      store = t.objectStore("vault");
    let conflict = false;
    const r = store.get("state");
    r.onsuccess = () => {
      if ((r.result?.revision ?? 0) !== expectedRevision) {
        conflict = true;
        t.abort();
        return;
      }
      store.put({ ...e, revision: expectedRevision + 1 }, "state");
    };
    t.oncomplete = () => {
      d.close();
      resolve(expectedRevision + 1);
    };
    t.onabort = () => {
      d.close();
      reject(
        conflict
          ? new ConflictError()
          : t.error || Error("Gravação interrompida."),
      );
    };
    t.onerror = () => {
      d.close();
      reject(t.error || Error("Falha de gravação."));
    };
  });
}
