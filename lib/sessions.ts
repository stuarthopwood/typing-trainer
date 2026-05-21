import type { EnrichedSessionSummary } from "./types";

interface SessionListItem {
  id: string;
  url: string;
  uploadedAt: string;
}

interface SessionListResponse {
  sessions: SessionListItem[];
  cursor: string | null;
  hasMore: boolean;
}

export async function loadAllSessions(): Promise<EnrichedSessionSummary[]> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  const pin = typeof window !== "undefined" ? localStorage.getItem("neuralkeys-pin") : null;
  if (!apiKey || !pin) return [];

  const allSessions: EnrichedSessionSummary[] = [];
  let cursor: string | undefined;

  try {
    do {
      const url = cursor ? `/api/sessions?cursor=${encodeURIComponent(cursor)}` : "/api/sessions";
      const res = await fetch(url, {
        headers: { "x-api-key": apiKey, "x-user-pin": pin },
      });
      if (!res.ok) break;

      const data: SessionListResponse = await res.json();

      const sessionFetches = data.sessions.map(async (item) => {
        try {
          const r = await fetch(item.url);
          return r.ok ? ((await r.json()) as EnrichedSessionSummary) : null;
        } catch {
          return null;
        }
      });

      const sessions = (await Promise.all(sessionFetches)).filter(Boolean) as EnrichedSessionSummary[];
      allSessions.push(...sessions);
      cursor = data.hasMore ? (data.cursor ?? undefined) : undefined;
    } while (cursor);
  } catch {
    return allSessions;
  }

  return allSessions.sort((a, b) => (b.timestamp || b.date).localeCompare(a.timestamp || a.date));
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  const pin = typeof window !== "undefined" ? localStorage.getItem("neuralkeys-pin") : null;
  if (!apiKey || !pin) return true;

  try {
    const res = await fetch(`/api/sessions?id=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: { "x-api-key": apiKey, "x-user-pin": pin },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function migrateAllSessions(): Promise<{ migrated: number; skipped: number }> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  const pin = typeof window !== "undefined" ? localStorage.getItem("neuralkeys-pin") : null;
  if (!apiKey || !pin) return { migrated: 0, skipped: 0 };

  try {
    const res = await fetch("/api/sessions?action=migrate", {
      method: "POST",
      headers: { "x-api-key": apiKey, "x-user-pin": pin },
    });
    if (!res.ok) return { migrated: 0, skipped: 0 };
    return await res.json();
  } catch {
    return { migrated: 0, skipped: 0 };
  }
}
