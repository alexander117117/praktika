import { create } from "zustand";
import type { ProgressEntry, ProgressMap, QuestionStatus } from "@/lib/types";
import { TOPICS } from "@/data/topics";
import { supabase } from "@/lib/supabase";

interface ProgressState {
  progress: ProgressMap;
  /** Authenticated user id, or null in local (guest) mode. */
  userId: string | null;
  setUserId: (id: string | null) => void;
  mark: (questionId: string, status: QuestionStatus) => void;
  resetTopic: (topicId: number) => void;
  resetAll: () => void;
  /** Pull remote rows for the current user, merge (newest wins), then push local-only rows. */
  syncFromRemote: () => Promise<void>;
}

interface RemoteRow {
  question_id: string;
  status: QuestionStatus;
  reviews: number | null;
  updated_at: string;
}

const KEY_PREFIX = "praktika:progress:";
const LEGACY_KEY = "praktika-progress";

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

export const useProgress = create<ProgressState>((set, get) => ({
  progress: loadLocal(null),
  userId: null,

  setUserId: (id) => {
    const { userId: current, progress } = get();
    if (current === id) return;
    // Persist the identity we're leaving, then load the one we're entering.
    saveLocal(current, progress);
    set({ userId: id, progress: loadLocal(id) });
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
    if (supabase && uid) {
      void supabase.from("progress").upsert(toRow(uid, questionId, entry));
    }
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
      void supabase
        .from("progress")
        .delete()
        .eq("user_id", uid)
        .in("question_id", [...ids]);
    }
  },

  resetAll: () => {
    set({ progress: {} });
    const uid = get().userId;
    saveLocal(uid, {});
    if (supabase && uid) {
      void supabase.from("progress").delete().eq("user_id", uid);
    }
  },

  syncFromRemote: async () => {
    const uid = get().userId;
    if (!supabase || !uid) return;

    const { data, error } = await supabase
      .from("progress")
      .select("question_id,status,reviews,updated_at")
      .eq("user_id", uid);
    if (error || !data) return;

    // Merge remote with THIS account's local cache (same user — safe to merge).
    const merged: ProgressMap = { ...get().progress };
    for (const row of data as RemoteRow[]) {
      const remote: ProgressEntry = {
        status: row.status,
        reviews: row.reviews ?? 0,
        updatedAt: new Date(row.updated_at).getTime(),
      };
      const local = merged[row.question_id];
      if (!local || remote.updatedAt >= local.updatedAt) merged[row.question_id] = remote;
    }
    // Only apply if this identity is still current (user may have logged out mid-request).
    if (get().userId !== uid) return;
    set({ progress: merged });
    saveLocal(uid, merged);

    // Push rows that are local-only or newer than the server copy.
    const remoteById = new Map((data as RemoteRow[]).map((r) => [r.question_id, r]));
    const toPush = Object.entries(merged)
      .filter(([id, entry]) => {
        const r = remoteById.get(id);
        return !r || entry.updatedAt > new Date(r.updated_at).getTime();
      })
      .map(([id, entry]) => toRow(uid, id, entry));
    if (toPush.length) void supabase.from("progress").upsert(toPush);
  },
}));
