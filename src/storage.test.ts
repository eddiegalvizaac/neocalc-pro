import { test } from "node:test";
import assert from "node:assert/strict";
import { seal, unseal } from "./storage";
import { demo } from "./model";
test("cofre round-trip, senha incorreta e adulteração rejeitadas", async () => {
  const state = demo(),
    e = await seal(state, "senha-teste-longa-123");
  assert.deepEqual(await unseal(e, "senha-teste-longa-123"), state);
  await assert.rejects(() => unseal(e, "senha-incorreta-123"));
  e.data[0] ^= 1;
  await assert.rejects(() => unseal(e, "senha-teste-longa-123"));
});
test("cofre exige senha longa e usa salt/nonce aleatórios", async () => {
  await assert.rejects(() => seal(demo(), "curta"));
  const a = await seal(demo(), "senha-teste-longa-123"),
    b = await seal(demo(), "senha-teste-longa-123");
  assert.notDeepEqual(a.salt, b.salt);
  assert.notDeepEqual(a.iv, b.iv);
});

test("integração IndexedDB: conteúdo criptografado preservado após reabertura", async () => {
  const { indexedDB } = await import("fake-indexeddb");
  globalThis.indexedDB = indexedDB;
  const { writeVault, readVault } = await import("./storage");
  const state = demo();
  await writeVault(await seal(state, "integration-senha-123"));
  const saved = await readVault();
  assert.ok(saved);
  assert.deepEqual(await unseal(saved, "integration-senha-123"), state);
  assert.ok(!JSON.stringify(saved).includes("RN-001"));
});

import {
  validateEnvelope,
  decodeBackup,
  ConflictError,
  MAX_BACKUP_BYTES,
  assertPassword,
} from "./storage";
test("envelope rejeita versão, comprimentos, bytes e revisões inválidos", async () => {
  const e = await seal(demo(), "senha-auditoria-123");
  for (const bad of [
    null,
    {},
    { ...e, version: 2 },
    { ...e, salt: [1] },
    { ...e, iv: Array(12).fill(256) },
    { ...e, data: [-1] },
    { ...e, revision: -1 },
    { ...e, revision: 0.5 },
    { ...e, extra: "não permitido" },
  ])
    assert.throws(() => validateEnvelope(bad));
  assert.throws(() => assertPassword("            "));
  await assert.rejects(() =>
    decodeBackup(" ".repeat(MAX_BACKUP_BYTES + 1), "senha-auditoria-123"),
  );
});
test("criptografia autenticada: adulterar salt ou IV também impede abertura", async () => {
  const e = await seal(demo(), "senha-auditoria-123");
  for (const k of ["salt", "iv"] as const) {
    const changed = structuredClone(e);
    changed[k][0] ^= 1;
    await assert.rejects(() => unseal(changed, "senha-auditoria-123"));
  }
});
test("cofre v1 sem revisão continua legível após atualização", async () => {
  const e = await seal(demo(), "senha-auditoria-123");
  assert.equal(e.revision, undefined);
  assert.equal((await unseal(e, "senha-auditoria-123")).patients.length, 3);
});
test("concorrência entre abas: comparação e gravação atômicas impedem sobrescrita silenciosa", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  globalThis.indexedDB = new IDBFactory();
  const { writeVault, readVault } = await import("./storage");
  const a = await seal(demo(), "senha-auditoria-123"),
    b = await seal({ patients: [], audit: [] }, "senha-auditoria-123");
  const results = await Promise.allSettled([
    writeVault(a, 0),
    writeVault(b, 0),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const failed = results.find((r) => r.status === "rejected");
  assert.ok(
    failed?.status === "rejected" && failed.reason instanceof ConflictError,
  );
  const saved = await readVault();
  assert.equal(saved?.revision, 1);
  assert.equal(await writeVault(a, 1), 2);
  await assert.rejects(() => writeVault(b, 1), ConflictError);
  assert.equal((await readVault())?.revision, 2);
});
test("payload autenticado porém com esquema inválido é recusado sem expor estado", async () => {
  const pass = "senha-auditoria-123",
    e = await seal(demo(), pass);
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(e.salt),
      iterations: 600000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const invalid = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(e.iv) },
    key,
    new TextEncoder().encode(JSON.stringify({ patients: [{}], audit: [] })),
  );
  e.data = [...new Uint8Array(invalid)];
  await assert.rejects(() => unseal(e, pass), /Estrutura/);
});

test("credenciais Unicode ou espaços aceitas pela v1 continuam abrindo e permitindo backup", async () => {
  for (const pass of ["😀😀😀😀😀😀", "            "]) {
    const original = demo(),
      e = await seal(original, pass);
    assert.deepEqual(await unseal(e, pass), original);
    assert.deepEqual(
      await unseal(await seal(await unseal(e, pass), pass), pass),
      original,
    );
  }
});
