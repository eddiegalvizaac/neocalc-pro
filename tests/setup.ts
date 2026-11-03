import { beforeEach, afterEach, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { IDBFactory } from "fake-indexeddb";
import { cleanup } from "@testing-library/react";
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: { persist: vi.fn(async () => true) },
  });
  URL.createObjectURL = vi.fn(() => "blob:simulado");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
