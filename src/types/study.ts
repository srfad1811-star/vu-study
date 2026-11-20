export enum HighlightCategory {
  Definition = 'definition',
  Formula = 'formula',
  Critical = 'critical',
  Example = 'example',
}

export enum QuestionPriority {
  High = 'high',
  Medium = 'medium',
  Standard = 'standard',
}

export enum QuestionDifficulty {
  Easy = 'easy',
  Moderate = 'moderate',
  Hard = 'hard',
}

export enum MasteryStatus {
  Unreviewed = 'unreviewed',
  Practice = 'practice',
  Mastered = 'mastered',
}

export type WorkspaceView = 'notes' | 'concepts' | 'questions' | 'study' | 'analytics';

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
  description: string;
  createdAt: number;
}

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  chapter: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ConceptHighlight {
  id: string;
  noteId: string;
  subjectId: string;
  text: string;
  annotation: string;
  category: HighlightCategory;
  reviewedCount: number;
  lastReviewedAt: number | null;
  createdAt: number;
}

export interface ImportantQuestion {
  id: string;
  subjectId: string;
  noteId: string | null;
  question: string;
  answer: string;
  reference: string;
  priority: QuestionPriority;
  difficulty: QuestionDifficulty;
  mastery: MasteryStatus;
  reviewCount: number;
  lastReviewedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface StudySession {
  id: string;
  subjectId: string | null;
  noteId: string | null;
  mode: 'focus' | 'deep' | 'review';
  durationMinutes: number;
  completedAt: number;
}

export interface WorkspaceBackup {
  version: 1;
  exportedAt: number;
  subjects: Subject[];
  notes: Note[];
  highlights: ConceptHighlight[];
  questions: ImportantQuestion[];
  sessions: StudySession[];
}

export const HIGHLIGHT_META: Record<
  HighlightCategory,
  {
    label: string;
    shortLabel: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    swatchClass: string;
  }
> = {
  [HighlightCategory.Definition]: {
    label: 'Core Definition',
    shortLabel: 'Definition',
    bgClass: 'bg-amber-100/85 dark:bg-amber-900/45',
    textClass: 'text-amber-950 dark:text-amber-100',
    borderClass: 'border-amber-300 dark:border-amber-700',
    swatchClass: 'bg-amber-400',
  },
  [HighlightCategory.Formula]: {
    label: 'Formula / Rule',
    shortLabel: 'Formula',
    bgClass: 'bg-sky-100/85 dark:bg-sky-900/45',
    textClass: 'text-sky-950 dark:text-sky-100',
    borderClass: 'border-sky-300 dark:border-sky-700',
    swatchClass: 'bg-sky-500',
  },
  [HighlightCategory.Critical]: {
    label: 'Exam Critical',
    shortLabel: 'Exam Critical',
    bgClass: 'bg-rose-100/85 dark:bg-rose-900/45',
    textClass: 'text-rose-950 dark:text-rose-100',
    borderClass: 'border-rose-300 dark:border-rose-700',
    swatchClass: 'bg-rose-500',
  },
  [HighlightCategory.Example]: {
    label: 'Example / Case',
    shortLabel: 'Example',
    bgClass: 'bg-emerald-100/85 dark:bg-emerald-900/45',
    textClass: 'text-emerald-950 dark:text-emerald-100',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    swatchClass: 'bg-emerald-500',
  },
};

export const SUBJECT_COLORS = [
  { id: 'cobalt', label: 'Cobalt', dotClass: 'bg-blue-600' },
  { id: 'emerald', label: 'Emerald', dotClass: 'bg-emerald-600' },
  { id: 'amber', label: 'Amber', dotClass: 'bg-amber-600' },
  { id: 'rose', label: 'Crimson', dotClass: 'bg-rose-600' },
  { id: 'violet', label: 'Indigo', dotClass: 'bg-indigo-600' },
  { id: 'slate', label: 'Graphite', dotClass: 'bg-slate-600' },
];
