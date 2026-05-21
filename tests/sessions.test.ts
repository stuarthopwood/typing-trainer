import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadAllSessions, deleteSession, migrateAllSessions } from "@/lib/sessions";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.setItem("neuralkeys-pin", "6767");
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("fetch", vi.fn());
  vi.stubEnv("NEXT_PUBLIC_PROGRESS_API_KEY", "test-key");
});

describe("Sessions — loadAllSessions", () => {
  it("should return empty array when no API key configured", async () => {
    // Given no API key is set
    vi.stubEnv("NEXT_PUBLIC_PROGRESS_API_KEY", "");

    // When loadAllSessions is called
    const sessions = await loadAllSessions();

    // Then empty array is returned
    expect(sessions).toEqual([]);
  });

  it("should return empty array when no PIN set", async () => {
    // Given no PIN in localStorage
    localStorageMock.removeItem("neuralkeys-pin");

    // When loadAllSessions is called
    const sessions = await loadAllSessions();

    // Then empty array is returned
    expect(sessions).toEqual([]);
  });

  it("should fetch and aggregate all session blobs from paginated list", async () => {
    // Given 2 session blobs exist (single page, no pagination)
    const listResponse = {
      sessions: [
        { id: "uuid-1", url: "https://blob.test/session-1.json", uploadedAt: "2026-05-20T15:00:00Z" },
        { id: "uuid-2", url: "https://blob.test/session-2.json", uploadedAt: "2026-05-20T16:00:00Z" },
      ],
      cursor: null,
      hasMore: false,
    };
    const session1 = { id: "uuid-1", timestamp: "2026-05-20T15:00:00Z", date: "2026-05-20", wpm: 18, accuracy: 92, mode: "drill:home-row", duration: 30000, charsTyped: 50, modeDetails: { type: "drill", level: "home-row" } };
    const session2 = { id: "uuid-2", timestamp: "2026-05-20T16:00:00Z", date: "2026-05-20", wpm: 14, accuracy: 88, mode: "drill:top-row", duration: 45000, charsTyped: 52, modeDetails: { type: "drill", level: "top-row" } };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(listResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(session1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(session2) });
    vi.stubGlobal("fetch", fetchMock);

    // When loadAllSessions is called
    const sessions = await loadAllSessions();

    // Then both sessions are returned sorted by timestamp descending
    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe("uuid-2");
    expect(sessions[1].id).toBe("uuid-1");
  });

  it("should handle pagination across multiple pages", async () => {
    // Given sessions span 2 pages
    const page1 = {
      sessions: [{ id: "uuid-1", url: "https://blob.test/s1.json", uploadedAt: "2026-05-20T15:00:00Z" }],
      cursor: "page2cursor",
      hasMore: true,
    };
    const page2 = {
      sessions: [{ id: "uuid-2", url: "https://blob.test/s2.json", uploadedAt: "2026-05-19T10:00:00Z" }],
      cursor: null,
      hasMore: false,
    };
    const s1 = { id: "uuid-1", timestamp: "2026-05-20T15:00:00Z", date: "2026-05-20", wpm: 18, accuracy: 92, mode: "drill:home-row", duration: 30000, charsTyped: 50, modeDetails: { type: "drill", level: "home-row" } };
    const s2 = { id: "uuid-2", timestamp: "2026-05-19T10:00:00Z", date: "2026-05-19", wpm: 12, accuracy: 85, mode: "drill:home-row", duration: 40000, charsTyped: 48, modeDetails: { type: "drill", level: "home-row" } };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(s1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(s2) });
    vi.stubGlobal("fetch", fetchMock);

    // When loadAllSessions is called
    const sessions = await loadAllSessions();

    // Then all sessions from both pages are returned
    expect(sessions).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("Sessions — deleteSession", () => {
  it("should return true when delete succeeds", async () => {
    // Given a session exists
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    // When deleteSession is called with valid ID
    const result = await deleteSession("550e8400-e29b-41d4-a716-446655440000");

    // Then it returns true and calls DELETE endpoint
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/sessions?id=550e8400-e29b-41d4-a716-446655440000"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("should return false when delete fails", async () => {
    // Given the session doesn't exist
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    // When deleteSession is called
    const result = await deleteSession("550e8400-e29b-41d4-a716-446655440000");

    // Then it returns false
    expect(result).toBe(false);
  });

  it("should return false when no PIN set", async () => {
    // Given no PIN in localStorage
    localStorageMock.removeItem("neuralkeys-pin");

    // When deleteSession is called
    const result = await deleteSession("550e8400-e29b-41d4-a716-446655440000");

    // Then it returns false without making a network call
    expect(result).toBe(false);
  });
});

describe("Sessions — migrateAllSessions", () => {
  it("should call migrate endpoint and return counts", async () => {
    // Given legacy allSessions exist on Blob
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ migrated: 21, skipped: 0 }) });
    vi.stubGlobal("fetch", fetchMock);

    // When migrateAllSessions is called
    const result = await migrateAllSessions();

    // Then it returns the migration counts
    expect(result).toEqual({ migrated: 21, skipped: 0 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions?action=migrate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("should return zeros when migration fails", async () => {
    // Given the endpoint errors
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    // When migrateAllSessions is called
    const result = await migrateAllSessions();

    // Then zeros returned gracefully
    expect(result).toEqual({ migrated: 0, skipped: 0 });
  });
});
