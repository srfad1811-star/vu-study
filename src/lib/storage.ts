import {
  ConceptHighlight,
  HighlightCategory,
  ImportantQuestion,
  MasteryStatus,
  Note,
  QuestionDifficulty,
  QuestionPriority,
  StudySession,
  Subject,
  WorkspaceBackup,
} from '../types/study';

const DB_NAME = 'codex-study-workspace';
const DB_VERSION = 1;
const FALLBACK_KEY = 'codex-study-workspace-fallback';

const STORES = ['subjects', 'notes', 'highlights', 'questions', 'sessions'] as const;
type StoreName = (typeof STORES)[number];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function readFallback(): Omit<WorkspaceBackup, 'version' | 'exportedAt'> {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) {
      return { subjects: [], notes: [], highlights: [], questions: [], sessions: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { subjects: [], notes: [], highlights: [], questions: [], sessions: [] };
  }
}

function writeFallback(data: Omit<WorkspaceBackup, 'version' | 'exportedAt'>): void {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in fallback mode
  }
}

async function getAllFromStore<T>(db: IDBDatabase, storeName: StoreName): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function loadWorkspace(): Promise<{
  subjects: Subject[];
  notes: Note[];
  highlights: ConceptHighlight[];
  questions: ImportantQuestion[];
  sessions: StudySession[];
}> {
  try {
    const db = await openDatabase();
    const [subjects, notes, highlights, questions, sessions] = await Promise.all([
      getAllFromStore<Subject>(db, 'subjects'),
      getAllFromStore<Note>(db, 'notes'),
      getAllFromStore<ConceptHighlight>(db, 'highlights'),
      getAllFromStore<ImportantQuestion>(db, 'questions'),
      getAllFromStore<StudySession>(db, 'sessions'),
    ]);
    db.close();
    return { subjects, notes, highlights, questions, sessions };
  } catch {
    return readFallback();
  }
}

export async function putRecord<T extends { id: string }>(storeName: StoreName, record: T): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const current = readFallback();
    const list = current[storeName] as unknown as Array<{ id: string }>;
    const idx = list.findIndex((item) => item.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    writeFallback(current);
  }
}

export async function deleteRecord(storeName: StoreName, id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const current = readFallback();
    const list = current[storeName] as unknown as Array<{ id: string }>;
    (current[storeName] as unknown as Array<{ id: string }>) = list.filter((item) => item.id !== id);
    writeFallback(current);
  }
}

export async function replaceAllWorkspace(data: Omit<WorkspaceBackup, 'version' | 'exportedAt'>): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES as unknown as string[], 'readwrite');
      for (const storeName of STORES) {
        const store = tx.objectStore(storeName);
        store.clear();
        for (const item of data[storeName]) {
          store.put(item);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    writeFallback(data);
  }
}

export async function clearWorkspace(): Promise<void> {
  await replaceAllWorkspace({
    subjects: [],
    notes: [],
    highlights: [],
    questions: [],
    sessions: [],
  });
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function validateBackupPayload(raw: unknown): WorkspaceBackup | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.subjects) || !Array.isArray(obj.notes)) return null;

  const validHighlightCats = new Set<string>(Object.values(HighlightCategory));
  const validPriorities = new Set<string>(Object.values(QuestionPriority));
  const validDifficulties = new Set<string>(Object.values(QuestionDifficulty));
  const validMasteries = new Set<string>(Object.values(MasteryStatus));

  const subjects: Subject[] = obj.subjects
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
    .map((s) => ({
      id: String(s.id ?? generateId('sub')),
      name: String(s.name ?? 'Untitled Subject').slice(0, 80),
      code: String(s.code ?? '').slice(0, 24),
      color: String(s.color ?? 'cobalt'),
      description: String(s.description ?? '').slice(0, 300),
      createdAt: Number(s.createdAt) || Date.now(),
    }));

  const notes: Note[] = obj.notes
    .filter((n): n is Record<string, unknown> => Boolean(n && typeof n === 'object'))
    .map((n) => ({
      id: String(n.id ?? generateId('note')),
      subjectId: String(n.subjectId ?? ''),
      title: String(n.title ?? 'Untitled Note').slice(0, 140),
      chapter: String(n.chapter ?? '').slice(0, 80),
      content: String(n.content ?? ''),
      tags: Array.isArray(n.tags) ? n.tags.map((t) => String(t).slice(0, 32)) : [],
      pinned: Boolean(n.pinned),
      createdAt: Number(n.createdAt) || Date.now(),
      updatedAt: Number(n.updatedAt) || Date.now(),
    }));

  const highlights: ConceptHighlight[] = Array.isArray(obj.highlights)
    ? obj.highlights
        .filter((h): h is Record<string, unknown> => Boolean(h && typeof h === 'object'))
        .map((h) => ({
          id: String(h.id ?? generateId('hl')),
          noteId: String(h.noteId ?? ''),
          subjectId: String(h.subjectId ?? ''),
          text: String(h.text ?? ''),
          annotation: String(h.annotation ?? ''),
          category: validHighlightCats.has(String(h.category))
            ? (String(h.category) as HighlightCategory)
            : HighlightCategory.Definition,
          reviewedCount: Number(h.reviewedCount) || 0,
          lastReviewedAt: h.lastReviewedAt ? Number(h.lastReviewedAt) : null,
          createdAt: Number(h.createdAt) || Date.now(),
        }))
    : [];

  const questions: ImportantQuestion[] = Array.isArray(obj.questions)
    ? obj.questions
        .filter((q): q is Record<string, unknown> => Boolean(q && typeof q === 'object'))
        .map((q) => ({
          id: String(q.id ?? generateId('q')),
          subjectId: String(q.subjectId ?? ''),
          noteId: q.noteId ? String(q.noteId) : null,
          question: String(q.question ?? ''),
          answer: String(q.answer ?? ''),
          reference: String(q.reference ?? ''),
          priority: validPriorities.has(String(q.priority))
            ? (String(q.priority) as QuestionPriority)
            : QuestionPriority.Medium,
          difficulty: validDifficulties.has(String(q.difficulty))
            ? (String(q.difficulty) as QuestionDifficulty)
            : QuestionDifficulty.Moderate,
          mastery: validMasteries.has(String(q.mastery))
            ? (String(q.mastery) as MasteryStatus)
            : MasteryStatus.Unreviewed,
          reviewCount: Number(q.reviewCount) || 0,
          lastReviewedAt: q.lastReviewedAt ? Number(q.lastReviewedAt) : null,
          createdAt: Number(q.createdAt) || Date.now(),
          updatedAt: Number(q.updatedAt) || Date.now(),
        }))
    : [];

  const sessions: StudySession[] = Array.isArray(obj.sessions)
    ? obj.sessions
        .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
        .map((s) => ({
          id: String(s.id ?? generateId('ses')),
          subjectId: s.subjectId ? String(s.subjectId) : null,
          noteId: s.noteId ? String(s.noteId) : null,
          mode: s.mode === 'deep' || s.mode === 'review' ? s.mode : 'focus',
          durationMinutes: Math.max(1, Number(s.durationMinutes) || 25),
          completedAt: Number(s.completedAt) || Date.now(),
        }))
    : [];

  return {
    version: 1,
    exportedAt: Number(obj.exportedAt) || Date.now(),
    subjects,
    notes,
    highlights,
    questions,
    sessions,
  };
}
