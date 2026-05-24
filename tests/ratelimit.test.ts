import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/ratelimit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("should allow requests under the limit", () => {
    // Given a fresh PIN with no prior requests
    // When 5 requests are made
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("test-pin-1");
      // Then each is allowed
      expect(result.allowed).toBe(true);
    }
  });

  it("should block requests over the limit", () => {
    // Given a PIN that has made 30 requests (the max)
    for (let i = 0; i < 30; i++) {
      checkRateLimit("test-pin-2");
    }

    // When the 31st request is made
    const result = checkRateLimit("test-pin-2");

    // Then it is blocked
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should reset the counter after the window expires", () => {
    // Given a PIN that has hit the rate limit
    for (let i = 0; i < 30; i++) {
      checkRateLimit("test-pin-3");
    }
    expect(checkRateLimit("test-pin-3").allowed).toBe(false);

    // When the window (60s) expires
    vi.advanceTimersByTime(61_000);

    // Then the counter resets and requests are allowed again
    const result = checkRateLimit("test-pin-3");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29);
  });

  it("should track PINs independently", () => {
    // Given PIN-A has hit the limit
    for (let i = 0; i < 30; i++) {
      checkRateLimit("pin-a");
    }

    // When PIN-B makes a request
    const result = checkRateLimit("pin-b");

    // Then PIN-B is allowed (independent counter)
    expect(result.allowed).toBe(true);
  });
});
