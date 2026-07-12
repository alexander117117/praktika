import { create } from "zustand";
import type { ProgressEntry, ProgressMap, QuestionStatus } from "@/lib/types";
import { TOPICS } from "@/data/topics";
import { supabase } from "@/lib/supabase";

export type SyncStatus = "idle" | "syncing" | "error";

interface ProgressState {
  progress: ProgressMap;
  /** Authenticated user id, or null in local (guest) mode. */
  userId: string | null;
  /** Server sync health; "error" means changes are queued but not confirmed by the server. */
  syncStatus: SyncStatus;
  /** Number of queued operations awaiting server confirmation. */
  pendingCount: number;
  setUserId: (id: string | null) => void;
  mark: (questionId: string, status: QuestionStatus) => void;
  resetTopic: (topicId: number) => void;
  resetAll: () => void;
  /** Push queued changes, pull remote rows, merge (newest wins), then push local-only rows. */
  syncFromRemote: () => Promise<void>;
}

interface RemoteRow {
  question_id: string;
  status: QuestionStatus;
  reviews: number | null;
  updated_at: string;
}

/** Server operations queued per account; survives reloads. DELETE_ALL wipes every row. */
interface PendingOps {
  upserts: string[];
  deletes: string[];
}

const KEY_PREFIX = "praktika:progress:";
const LEGACY_KEY = "praktika-progress";
const PENDING_PREFIX = "praktika:pending:";
const DELETE_ALL = "*";
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 60_000;

/** Progress is cached separately per identity so a guest and accounts never bleed together. */
function storageKey(userId: string | null): string {
  return KEY_PREFIX + (userId ?? "guest");
}

function loadLocal(userId: string | null): ProgressMap {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function saveLocal(userId: string | null, progress: ProgressMap): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(progress));
  } catch {
    /* storage unavailable — stay in-memory */
  }
}

function loadPending(userId: string): PendingOps {
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + userId);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PendingOps>;
      return { upserts: parsed.upserts ?? [], deletes: parsed.deletes ?? [] };
    }
  } catch {
    /* ignore */
  }
  return { upserts: [], deletes: [] };
}

function savePending(userId: string, ops: PendingOps): void {
  try {
    if (!ops.upserts.length && !ops.deletes.length) {
      localStorage.removeItem(PENDING_PREFIX + userId);
    } else {
      localStorage.setItem(PENDING_PREFIX + userId, JSON.stringify(ops));
    }
  } catch {
    /* storage unavailable — queue lives only in this session */
  }
}

function pendingCountOf(ops: PendingOps): number {
  return ops.upserts.length + ops.deletes.length;
}

/** One-time migration of the old single-key (zustand persist) cache into the guest slot. */
function migrateLegacy(): void {
  try {
    if (localStorage.getItem(storageKey(null))) return;
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const progress = parsed?.state?.progress ?? parsed;
    if (progress && typeof progress === "object") {
      localStorage.setItem(storageKey(null), JSON.stringify(progress));
    }
  } catch {
    /* ignore */
  }
}

function toRow(userId: string, questionId: string, entry: ProgressEntry) {
  return {
    user_id: userId,
    question_id: questionId,
    status: entry.status,
    reviews: entry.reviews,
    updated_at: new Date(entry.updatedAt).toISOString(),
  };
}

if (typeof window !== "undefined") migrateLegacy();

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = RETRY_BASE_MS;
let flushing = false;
let flushAgain = false;
let pulling = false;

function scheduleRetry(): void {
  if (retryTimer !== null) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void useProgress.getState().syncFromRemote();
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
}

export const useProgress = create<ProgressState>((set, get) => {
  /** One queue pass; returns true when more queued work remains. */
  async function flushOnce(): Promise<boolean> {
    const uid = get().userId;
    if (!supabase || !uid) return false;

    const ops = loadPending(uid);
    if (!pendingCountOf(ops)) {
      if (get().userId === uid) set({ pendingCount: 0, syncStatus: "idle" });
      return false;
    }
    if (get().userId === uid) set({ syncStatus: "syncing" });

    try {
      if (ops.deletes.includes(DELETE_ALL)) {
        const { error } = await supabase.from("progress").delete().eq("user_id", uid);
        if (error) throw error;
      } else if (ops.deletes.length) {
        const { error } = await supabase
          .from("progress")
          .delete()
          .eq("user_id", uid)
          .in("question_id", ops.deletes);
        if (error) throw error;
      }

      const progress = get().progress;
      const rows = ops.upserts
        .filter((id) => progress[id])
        .map((id) => toRow(uid, id, progress[id]));
      if (rows.length) {
        const { error } = await supabase.from("progress").upsert(rows);
        if (error) throw error;
      }

      // Ops queued while the requests were in flight stay queued for the next pass.
      const now = loadPending(uid);
      const remaining: PendingOps = {
        upserts: now.upserts.filter((id) => !ops.upserts.includes(id)),
        deletes: now.deletes.filter((id) => !ops.deletes.includes(id)),
      };
      savePending(uid, remaining);
      retryDelay = RETRY_BASE_MS;
      const left = pendingCountOf(remaining);
      if (get().userId === uid) {
        set({ pendingCount: left, syncStatus: left ? "syncing" : "idle" });
      }
      return left > 0;
    } catch (err) {
      console.error("[praktika] Не удалось синхронизировать прогресс:", err);
      if (get().userId === uid) set({ syncStatus: "error" });
      scheduleRetry();
      return false;
    }
  }

  async function flush(): Promise<void> {
    if (flushing) {
      flushAgain = true;
      return;
    }
    flushing = true;
    try {
      do {
        flushAgain = false;
        while (await flushOnce());
      } while (flushAgain);
    } finally {
      flushing = false;
    }
  }

  /** Queue changed ids for upsert (dropping conflicting deletes) and start a push. */
  function enqueueUpserts(uid: string, ids: string[]): void {
    const ops = loadPending(uid);
    for (const id of ids) {
      if (!ops.upserts.includes(id)) ops.upserts.push(id);
    }
    ops.deletes = ops.deletes.filter((id) => id === DELETE_ALL || !ids.includes(id));
    savePending(uid, ops);
    set({ pendingCount: pendingCountOf(ops) });
    void flush();
  }

  return {
    progress: loadLocal(null),
    userId: null,
    syncStatus: "idle",
    pendingCount: 0,

    setUserId: (id) => {
      const { userId: current, progress } = get();
      if (current === id) return;
      // Persist the identity we're leaving, then load the one we're entering.
      saveLocal(current, progress);
      const next = { ...loadLocal(id) };
      if (current === null && id !== null) {
        // Import guest progress into the account (newest wins) so questions answered
        // before logging in are not stranded on this device; syncFromRemote uploads them.
        let imported = false;
        for (const [qid, entry] of Object.entries(progress)) {
          const own = next[qid];
          if (!own || entry.updatedAt > own.updatedAt) {
            next[qid] = entry;
            imported = true;
          }
        }
        if (imported) saveLocal(id, next);
      }
      const pendingCount = id ? pendingCountOf(loadPending(id)) : 0;
      set({ userId: id, progress: next, pendingCount, syncStatus: "idle" });
    },

    mark: (questionId, status) => {
      const prev = get().progress[questionId];
      const entry: ProgressEntry = {
        status,
        reviews: (prev?.reviews ?? 0) + 1,
        updatedAt: Date.now(),
      };
      const progress = { ...get().progress, [questionId]: entry };
      set({ progress });

      const uid = get().userId;
      saveLocal(uid, progress);
      if (supabase && uid) enqueueUpserts(uid, [questionId]);
    },

    resetTopic: (topicId) => {
      const ids = new Set(
        TOPICS.find((t) => t.id === topicId)?.questions.map((q) => q.id) ?? [],
      );
      if (!ids.size) return;
      const progress: ProgressMap = {};
      for (const [k, v] of Object.entries(get().progress)) if (!ids.has(k)) progress[k] = v;
      set({ progress });

      const uid = get().userId;
      saveLocal(uid, progress);
      if (supabase && uid) {
        const ops = loadPending(uid);
        ops.upserts = ops.upserts.filter((id) => !ids.has(id));
        for (const id of ids) {
          if (!ops.deletes.includes(id)) ops.deletes.push(id);
        }
        savePending(uid, ops);
        set({ pendingCount: pendingCountOf(ops) });
        void flush();
      }
    },

    resetAll: () => {
      set({ progress: {} });
      const uid = get().userId;
      saveLocal(uid, {});
      if (supabase && uid) {
        savePending(uid, { upserts: [], deletes: [DELETE_ALL] });
        set({ pendingCount: 1 });
        void flush();
      }
    },

    syncFromRemote: async () => {
      const uid = get().userId;
      if (!supabase || !uid || pulling) return;
      pulling = true;
      try {
        // Push queued work first so pending deletions are not resurrected by the pull.
        await flush();

        const { data, error } = await supabase
          .from("progress")
          .select("question_id,status,reviews,updated_at")
          .eq("user_id", uid);
        // Only apply if this identity is still current (user may have logged out mid-request).
        if (get().userId !== uid) return;
        if (error || !data) {
          console.error("[praktika] Не удалось загрузить прогресс с сервера:", error);
          set({ syncStatus: "error" });
          scheduleRetry();
          return;
        }

        // Merge remote with THIS account's local cache (same user — safe to merge),
        // skipping rows whose deletion is still queued.
        const ops = loadPending(uid);
        const skipAll = ops.deletes.includes(DELETE_ALL);
        const pendingDelete = new Set(ops.deletes);
        const merged: ProgressMap = { ...get().progress };
        for (const row of data as RemoteRow[]) {
          if (skipAll || pendingDelete.has(row.question_id)) continue;
          const remote: ProgressEntry = {
            status: row.status,
            reviews: row.reviews ?? 0,
            updatedAt: new Date(row.updated_at).getTime(),
          };
          const local = merged[row.question_id];
          if (!local || remote.updatedAt >= local.updatedAt) merged[row.question_id] = remote;
        }
        set({ progress: merged });
        saveLocal(uid, merged);

        // Queue rows that are local-only or newer than the server copy.
        const remoteById = new Map((data as RemoteRow[]).map((r) => [r.question_id, r]));
        const toPush = Object.entries(merged)
          .filter(([id, entry]) => {
            const r = remoteById.get(id);
            return !r || entry.updatedAt > new Date(r.updated_at).getTime();
          })
          .map(([id]) => id);
        if (toPush.length) {
          enqueueUpserts(uid, toPush);
        } else if (!pendingCountOf(loadPending(uid)) && get().userId === uid) {
          set({ syncStatus: "idle", pendingCount: 0 });
        }
      } finally {
        pulling = false;
      }
    },
  };
});

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void useProgress.getState().syncFromRemote();
  });
}
