import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseTabSlug,
  readPersistedTab,
  writePersistedTab,
  resolveInitialTab,
  ACTIVE_TAB_STORAGE_KEY,
  type TabSlug,
} from "@/lib/stats-tabs";

const KNOWN_SLUGS: TabSlug[] = [
  "overview",
  "gamification",
  "performance",
  "weaknesses",
  "history",
];

function makeStubStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

describe("stats-tabs — parseTabSlug", () => {
  it.each(KNOWN_SLUGS)("should round-trip a known slug %s", (slug) => {
    // Given a known tab slug as a bare string
    // When parseTabSlug is called
    // Then it returns the slug unchanged
    expect(parseTabSlug(slug)).toBe(slug);
  });

  it.each(KNOWN_SLUGS)(
    "should round-trip a known slug %s when prefixed with #",
    (slug) => {
      // Given a hash string with a leading '#'
      // When parseTabSlug is called
      // Then the leading '#' is trimmed and the slug is recognised
      expect(parseTabSlug(`#${slug}`)).toBe(slug);
    },
  );

  it("should return null for an empty string", () => {
    // Given an empty string
    // When parseTabSlug is called
    // Then it returns null
    expect(parseTabSlug("")).toBeNull();
  });

  it("should return null for just '#'", () => {
    // Given a hash containing only '#'
    // When parseTabSlug is called
    // Then it returns null (no slug after the '#')
    expect(parseTabSlug("#")).toBeNull();
  });

  it("should return null for an unknown slug", () => {
    // Given an unrecognised slug
    // When parseTabSlug is called
    // Then it returns null
    expect(parseTabSlug("nonsense")).toBeNull();
    expect(parseTabSlug("#nonsense")).toBeNull();
  });

  it("should return null for compound paths like 'overview/extra'", () => {
    // Given a composite hash that isn't an exact slug match
    // When parseTabSlug is called
    // Then it returns null
    expect(parseTabSlug("overview/extra")).toBeNull();
    expect(parseTabSlug("#overview/extra")).toBeNull();
  });

  it("should return null for null and undefined", () => {
    // Given null or undefined
    // When parseTabSlug is called
    // Then it returns null without throwing
    expect(parseTabSlug(null)).toBeNull();
    expect(parseTabSlug(undefined)).toBeNull();
  });
});

describe("stats-tabs — readPersistedTab", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStubStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return null when nothing has been persisted", () => {
    // Given an empty localStorage
    // When readPersistedTab is called
    // Then it returns null
    expect(readPersistedTab()).toBeNull();
  });

  it.each(KNOWN_SLUGS)(
    "should return the persisted slug %s when valid",
    (slug) => {
      // Given a previously-persisted valid slug
      // When readPersistedTab is called
      // Then it returns that slug
      window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, slug);
      expect(readPersistedTab()).toBe(slug);
    },
  );

  it("should return null when the persisted value is invalid", () => {
    // Given a corrupt localStorage value
    // When readPersistedTab is called
    // Then it returns null and does NOT propagate the bad value
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "not-a-real-slug");
    expect(readPersistedTab()).toBeNull();
  });

  it("should return null when localStorage.getItem throws", () => {
    // Given a localStorage that throws (private mode, blocked, etc.)
    // When readPersistedTab is called
    // Then it returns null silently
    vi.stubGlobal("localStorage", {
      ...makeStubStorage(),
      getItem: () => {
        throw new Error("storage blocked");
      },
    });
    expect(readPersistedTab()).toBeNull();
  });
});

describe("stats-tabs — writePersistedTab", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStubStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(KNOWN_SLUGS)(
    "should persist slug %s to localStorage",
    (slug) => {
      // Given a working localStorage
      // When writePersistedTab is called with a slug
      // Then the value lands under the canonical storage key
      writePersistedTab(slug);
      expect(window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)).toBe(slug);
    },
  );

  it("should not throw when localStorage.setItem throws", () => {
    // Given a localStorage that refuses writes (quota exceeded, blocked store)
    // When writePersistedTab is called
    // Then it returns silently — no exception escapes the helper
    vi.stubGlobal("localStorage", {
      ...makeStubStorage(),
      setItem: () => {
        throw new Error("quota exceeded");
      },
    });
    expect(() => writePersistedTab("performance")).not.toThrow();
  });
});

describe("stats-tabs — resolveInitialTab", () => {
  const ORIGINAL_HASH = window.location.hash;

  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStubStorage());
    window.location.hash = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.location.hash = ORIGINAL_HASH;
  });

  it("should prefer the URL hash when it names a known slug", () => {
    // Given both a URL hash and a persisted slug pointing at different tabs
    // When resolveInitialTab runs
    // Then the URL hash wins (deep-link priority — SC-005)
    window.location.hash = "weaknesses";
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "performance");
    expect(resolveInitialTab()).toBe("weaknesses");
  });

  it("should fall back to localStorage when the URL hash is missing", () => {
    // Given no URL hash but a previously-persisted slug
    // When resolveInitialTab runs
    // Then the persisted slug is used
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "history");
    expect(resolveInitialTab()).toBe("history");
  });

  it("should fall back to localStorage when the URL hash is unknown", () => {
    // Given an unrecognised hash and a valid persisted slug
    // When resolveInitialTab runs
    // Then the persisted slug is used (the hash is ignored, NOT defaulted away)
    window.location.hash = "garbage";
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "gamification");
    expect(resolveInitialTab()).toBe("gamification");
  });

  it("should default to overview when both sources are missing", () => {
    // Given no hash and no persisted slug
    // When resolveInitialTab runs
    // Then 'overview' is the safe default
    expect(resolveInitialTab()).toBe("overview");
  });

  it("should default to overview when storage holds a corrupt slug", () => {
    // Given a corrupt persisted slug and no URL hash
    // When resolveInitialTab runs
    // Then it defaults to 'overview' (does not propagate the corrupt value)
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "definitely-not-a-tab");
    expect(resolveInitialTab()).toBe("overview");
  });
});
