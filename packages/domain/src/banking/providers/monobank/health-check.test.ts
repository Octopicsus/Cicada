import { describe, expect, it, vi } from "vitest";

import { Result } from "@cicada/shared";

import { MonobankProvider } from "./index";

/**
 * Unit tests for MonobankProvider.healthCheck.
 *
 * The provider takes an injectable `fetchImpl` in its constructor — we
 * exploit that to feed scripted Response objects (or scripted throws)
 * without touching the network. The real-network exercise lives in
 * the `__smoke__/` directory and is only run by hand.
 *
 * `fetchImpl` is typed as `typeof fetch` so the mock's `.mock.calls[i]`
 * carries the real `[input, init?]` tuple shape; otherwise vitest infers
 * a 0-arg signature and TS rejects the index access.
 */
function fetchReturning(response: Response): typeof fetch {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function fetchRejecting(error: unknown): typeof fetch {
  return vi.fn<typeof fetch>().mockRejectedValue(error);
}

describe("MonobankProvider.healthCheck", () => {
  it("maps a 200 to status='up' with a non-negative latency", async () => {
    const fetchImpl = fetchReturning(new Response(null, { status: 200 }));
    const provider = new MonobankProvider(fetchImpl);

    const result = await provider.healthCheck();

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("up");
      expect(result.value.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.value.checkedAt).toBeInstanceOf(Date);
    }
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.monobank.ua/",
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("treats a 405 (Method Not Allowed) as 'up' — endpoint is still reachable", async () => {
    const provider = new MonobankProvider(fetchReturning(new Response(null, { status: 405 })));
    const result = await provider.healthCheck();

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("up");
    }
  });

  it("maps a 503 to status='degraded'", async () => {
    const provider = new MonobankProvider(fetchReturning(new Response(null, { status: 503 })));
    const result = await provider.healthCheck();

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("degraded");
      expect(result.value.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("maps a 500 to status='degraded' (boundary)", async () => {
    const provider = new MonobankProvider(fetchReturning(new Response(null, { status: 500 })));
    const result = await provider.healthCheck();

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("degraded");
    }
  });

  it("maps a network error (TypeError) to status='down'", async () => {
    const provider = new MonobankProvider(fetchRejecting(new TypeError("fetch failed")));
    const result = await provider.healthCheck();

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("down");
      expect(result.value.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("maps a timeout (AbortError) to status='down'", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    const provider = new MonobankProvider(fetchRejecting(abortError));
    const result = await provider.healthCheck();

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("down");
    }
  });

  it("passes an AbortSignal to fetch (so the timeout is wired)", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const provider = new MonobankProvider(fetchImpl);

    await provider.healthCheck();

    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init).toBeDefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
