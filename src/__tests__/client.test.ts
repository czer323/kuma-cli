import { describe, it, expect, vi, beforeEach } from "vitest";
import { io, Socket } from "socket.io-client";
import { KumaClient } from "../client.js";

// Mock socket.io-client
const mockOn = vi.fn();
const mockOnce = vi.fn();
const mockEmit = vi.fn();
const mockConnect = vi.fn();

vi.mock("socket.io-client", () => ({
  io: vi.fn(
    () =>
      ({
        on: mockOn,
        once: mockOnce,
        emit: mockEmit,
        connect: mockConnect,
      } as unknown as Socket)
  ),
}));

describe("getImportantHeartbeatCount", () => {
  let client: KumaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockClear();
    mockOnce.mockClear();
    mockEmit.mockClear();

    client = new KumaClient("http://localhost:3001");
  });

  it("emits monitorImportantHeartbeatListCount with monitorId when provided", async () => {
    // Call the method first — this registers the emit call
    const countPromise = client.getImportantHeartbeatCount(1);

    // Extract the callback from the emit call
    const emitCall = mockEmit.mock.calls.find(
      (c) => c[0] === "monitorImportantHeartbeatListCount"
    );
    expect(emitCall).toBeDefined();
    expect(emitCall![1]).toBe(1);
    const cb = emitCall![2] as (r: { ok: boolean; count?: number; msg?: string }) => void;

    // Trigger the callback
    cb({ ok: true, count: 42 });

    const count = await countPromise;
    expect(count).toBe(42);
  });

  it("emits with null when called without args", async () => {
    const countPromise = client.getImportantHeartbeatCount();

    const emitCall = mockEmit.mock.calls.find(
      (c) => c[0] === "monitorImportantHeartbeatListCount"
    );
    expect(emitCall).toBeDefined();
    expect(emitCall![1]).toBeNull();
    const cb = emitCall![2] as (r: { ok: boolean; count?: number; msg?: string }) => void;

    cb({ ok: true, count: 100 });

    const count = await countPromise;
    expect(count).toBe(100);
  });

  it("rejects when result.ok is false", async () => {
    const countPromise = client.getImportantHeartbeatCount(1);

    const emitCall = mockEmit.mock.calls.find(
      (c) => c[0] === "monitorImportantHeartbeatListCount"
    );
    const cb = emitCall![2] as (r: { ok: boolean; count?: number; msg?: string }) => void;

    cb({ ok: false, msg: "Not found" });

    await expect(countPromise).rejects.toThrow("Not found");
  });

  it("resolves count 0 when result.count is undefined", async () => {
    const countPromise = client.getImportantHeartbeatCount(1);

    const emitCall = mockEmit.mock.calls.find(
      (c) => c[0] === "monitorImportantHeartbeatListCount"
    );
    const cb = emitCall![2] as (r: { ok: boolean; count?: number; msg?: string }) => void;

    cb({ ok: true });

    const count = await countPromise;
    expect(count).toBe(0);
  });
});

describe("getImportantHeartbeatListPaged", () => {
  let client: KumaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockClear();
    mockOnce.mockClear();
    mockEmit.mockClear();

    client = new KumaClient("http://localhost:3001");
  });

  it("emits monitorImportantHeartbeatListPaged with correct params", async () => {
    const mockData = [
      { id: 1, monitorID: 5, status: 1, time: "2025-01-01T00:00:00.000Z" },
      { id: 2, monitorID: 5, status: 0, time: "2025-01-01T01:00:00.000Z", msg: "timeout" },
    ];

    const resultPromise = client.getImportantHeartbeatListPaged(5, 0, 10);

    const emitCall = mockEmit.mock.calls.find(
      (c) => c[0] === "monitorImportantHeartbeatListPaged"
    );
    expect(emitCall).toBeDefined();
    expect(emitCall![1]).toBe(5);
    expect(emitCall![2]).toBe(0);
    expect(emitCall![3]).toBe(10);
    const cb = emitCall![4] as (r: { ok: boolean; data?: unknown[]; msg?: string }) => void;

    cb({ ok: true, data: mockData });

    const result = await resultPromise;
    expect(result).toEqual(mockData);
  });

  it("rejects when result.ok is false", async () => {
    const resultPromise = client.getImportantHeartbeatListPaged(1, 0, 20);

    const emitCall = mockEmit.mock.calls.find(
      (c) => c[0] === "monitorImportantHeartbeatListPaged"
    );
    const cb = emitCall![4] as (r: { ok: boolean; data?: unknown[]; msg?: string }) => void;

    cb({ ok: false, msg: "Invalid monitor" });

    await expect(resultPromise).rejects.toThrow("Invalid monitor");
  });

  it("resolves empty array when result.data is undefined", async () => {
    const resultPromise = client.getImportantHeartbeatListPaged(1, 0, 10);

    const emitCall = mockEmit.mock.calls.find(
      (c) => c[0] === "monitorImportantHeartbeatListPaged"
    );
    const cb = emitCall![4] as (r: { ok: boolean; data?: unknown[]; msg?: string }) => void;

    cb({ ok: true });

    const result = await resultPromise;
    expect(result).toEqual([]);
  });
});
