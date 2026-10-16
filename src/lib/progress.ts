"use client";

import { useSyncExternalStore } from "react";

// Progreso guardado en el navegador, sin cuentas ni servidor.

export interface TopicProgress {
  /** Secciones de la lección que el estudiante marcó como leídas. */
  read: string[];
  /** Ejercicios resueltos sin ver la solución, por id de generador. */
  solved: Record<string, number>;
  /** Intentos fallidos por generador (para estadísticas). */
  missed: Record<string, number>;
  lastVisit?: number;
}

export interface ExamResult {
  score: number;
  at: number;
}

export interface Progress {
  v: 1;
  topics: Record<string, TopicProgress>;
  exams: Record<string, ExamResult[]>;
}

const KEY = "tangente-progreso-v1";
const EMPTY: Progress = { v: 1, topics: {}, exams: {} };

let state: Progress = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Progress;
      if (parsed?.v === 1) state = { ...EMPTY, ...parsed };
    }
  } catch {
    state = EMPTY;
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      state = e.newValue ? JSON.parse(e.newValue) : EMPTY;
    } catch {
      state = EMPTY;
    }
    listeners.forEach((l) => l());
  });
}

function save(next: Progress) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // almacenamiento lleno o bloqueado: el progreso vive solo en memoria
  }
  listeners.forEach((l) => l());
}

function topic(p: Progress, slug: string): TopicProgress {
  return p.topics[slug] ?? { read: [], solved: {}, missed: {} };
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => EMPTY,
  );
}

export function markRead(slug: string, sectionId: string) {
  load();
  const t = topic(state, slug);
  if (t.read.includes(sectionId)) return;
  save({ ...state, topics: { ...state.topics, [slug]: { ...t, read: [...t.read, sectionId], lastVisit: Date.now() } } });
}

export function recordAttempt(slug: string, genId: string, solved: boolean) {
  load();
  const t = topic(state, slug);
  const next: TopicProgress = solved
    ? { ...t, solved: { ...t.solved, [genId]: (t.solved[genId] ?? 0) + 1 }, lastVisit: Date.now() }
    : { ...t, missed: { ...t.missed, [genId]: (t.missed[genId] ?? 0) + 1 }, lastVisit: Date.now() };
  save({ ...state, topics: { ...state.topics, [slug]: next } });
}

export function recordExam(id: string, score: number) {
  load();
  const list = [...(state.exams[id] ?? []), { score, at: Date.now() }].slice(-10);
  save({ ...state, exams: { ...state.exams, [id]: list } });
}

export function resetProgress() {
  load();
  save(EMPTY);
}

/** Dominio de un tema entre 0 y 1: tipos de ejercicio resueltos sobre el total. */
export function mastery(p: Progress, slug: string, genIds: string[]): number {
  if (!genIds.length) return 0;
  const t = p.topics[slug];
  if (!t) return 0;
  return genIds.filter((g) => (t.solved[g] ?? 0) > 0).length / genIds.length;
}
