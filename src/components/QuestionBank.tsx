import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  HelpCircle,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  ImportantQuestion,
  MasteryStatus,
  Note,
  QuestionDifficulty,
  QuestionPriority,
  Subject,
} from '../types/study';
import { formatRelativeDate } from '../lib/markdown';

interface QuestionBankProps {
  questions: ImportantQuestion[];
  subjects: Subject[];
  notes: Note[];
  selectedSubjectFilter: string | 'all';
  onAddQuestion: () => void;
  onEditQuestion: (question: ImportantQuestion) => void;
  onDeleteQuestion: (id: string) => void;
  onUpdateMastery: (id: string, mastery: MasteryStatus) => void;
  onJumpToNote: (noteId: string) => void;
}

const PRIORITY_LABELS: Record<QuestionPriority, string> = {
  [QuestionPriority.High]: 'Exam Must',
  [QuestionPriority.Medium]: 'Medium Priority',
  [QuestionPriority.Standard]: 'Standard',
};

const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  [QuestionDifficulty.Easy]: 'Easy',
  [QuestionDifficulty.Moderate]: 'Moderate',
  [QuestionDifficulty.Hard]: 'Hard',
};

const MASTERY_LABELS: Record<MasteryStatus, string> = {
  [MasteryStatus.Unreviewed]: 'Unreviewed',
  [MasteryStatus.Practice]: 'Needs Practice',
  [MasteryStatus.Mastered]: 'Mastered',
};

export const QuestionBank: React.FC<QuestionBankProps> = ({
  questions,
  subjects,
  notes,
  selectedSubjectFilter,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onUpdateMastery,
  onJumpToNote,
}) => {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<QuestionPriority | 'all'>('all');
  const [masteryFilter, setMasteryFilter] = useState<MasteryStatus | 'all'>('all');
  const [revealAll, setRevealAll] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const subjectMap = useMemo(() => {
    const map: Record<string, Subject> = {};
    for (const s of subjects) map[s.id] = s;
    return map;
  }, [subjects]);

  const noteMap = useMemo(() => {
    const map: Record<string, Note> = {};
    for (const n of notes) map[n.id] = n;
    return map;
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions
      .filter((item) => {
        if (selectedSubjectFilter !== 'all' && item.subjectId !== selectedSubjectFilter) {
          return false;
        }
        if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
          return false;
        }
        if (masteryFilter !== 'all' && item.mastery !== masteryFilter) {
          return false;
        }
        if (!q) return true;
        return (
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.reference.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const order = { high: 0, medium: 1, standard: 2 };
        if (order[a.priority] !== order[b.priority]) {
          return order[a.priority] - order[b.priority];
        }
        return b.updatedAt - a.updatedAt;
      });
  }, [questions, selectedSubjectFilter, priorityFilter, masteryFilter, search]);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportSheet = () => {
    const lines: string[] = [
      '# Important Questions Revision Sheet',
      `Exported: ${new Date().toLocaleString()}`,
      '',
      '---',
      '',
    ];
    filtered.forEach((item, idx) => {
      const sub = subjectMap[item.subjectId]?.name ?? 'General';
      lines.push(`## Q${idx + 1}. ${item.question}`);
      lines.push(
        `*Subject: ${sub} · Priority: ${PRIORITY_LABELS[item.priority]} · Difficulty: ${DIFFICULTY_LABELS[item.difficulty]}*`
      );
      if (item.reference) lines.push(`*Reference: ${item.reference}*`);
      lines.push('');
      lines.push(item.answer ? `**Answer:**\n${item.answer}` : '*No answer recorded yet.*');
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'important-questions-sheet.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto pastel-canvas p-6 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 font-display">
              Important Question Bank
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Save high-yield exam questions, hide answers for self-testing, and track mastery across subjects.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setRevealAll((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {revealAll ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {revealAll ? 'Hide All Answers' : 'Reveal All Answers'}
            </button>
            {filtered.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportSheet}
                  title="Export Revision Sheet (.md)"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Print Question Sheet"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All Mastery' },
                  { id: MasteryStatus.Unreviewed, label: 'Unreviewed' },
                  { id: MasteryStatus.Practice, label: 'Needs Practice' },
                  { id: MasteryStatus.Mastered, label: 'Mastered' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMasteryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    masteryFilter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as QuestionPriority | 'all')}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Priorities</option>
              <option value={QuestionPriority.High}>Exam Must</option>
              <option value={QuestionPriority.Medium}>Medium Priority</option>
              <option value={QuestionPriority.Standard}>Standard</option>
            </select>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions or references..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Questions List */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-4">
            <HelpCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {questions.length === 0 ? 'No Important Questions Saved Yet' : 'No Questions Match Filters'}
            </h2>
            <p className="max-w-md mx-auto text-sm text-slate-500 dark:text-slate-400">
              {questions.length === 0
                ? 'Save past paper questions, derivations, or tricky viva prompts with structured model answers for self-testing.'
                : 'Adjust your mastery, priority, or search filters to view saved questions.'}
            </p>
            {questions.length === 0 && (
              <button
                type="button"
                onClick={onAddQuestion}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Save First Question
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item, idx) => {
              const sub = subjectMap[item.subjectId];
              const linkedNote = item.noteId ? noteMap[item.noteId] : null;
              const isRevealed = revealAll || Boolean(revealedIds[item.id]);

              return (
                <article
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
                >
                  {/* Unboxed Metadata Top Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                        Q{idx + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{sub?.name ?? 'General'}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          item.priority === QuestionPriority.High
                            ? 'font-semibold text-rose-700 dark:text-rose-400'
                            : ''
                        }
                      >
                        {PRIORITY_LABELS[item.priority]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{DIFFICULTY_LABELS[item.difficulty]}</span>
                      {item.reference && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.reference}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          item.mastery === MasteryStatus.Mastered
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : item.mastery === MasteryStatus.Practice
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {MASTERY_LABELS[item.mastery]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatRelativeDate(item.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Question Body */}
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 leading-relaxed whitespace-pre-wrap">
                    {item.question}
                  </h3>

                  {/* Answer Reveal Area */}
                  {isRevealed ? (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>Model Answer</span>
                        {!revealAll && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(item.id)}
                            className="text-blue-700 dark:text-blue-400 hover:underline no-print"
                          >
                            Hide Answer
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {item.answer || 'No model answer added yet. Click Edit to add key points.'}
                      </p>
                    </div>
                  ) : (
                    <div className="no-print">
                      <button
                        type="button"
                        onClick={() => toggleReveal(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Show Model Answer
                      </button>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onUpdateMastery(item.id, MasteryStatus.Practice)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          item.mastery === MasteryStatus.Practice
                            ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Needs Practice
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateMastery(item.id, MasteryStatus.Mastered)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          item.mastery === MasteryStatus.Mastered
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Mastered
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {linkedNote && (
                        <button
                          type="button"
                          onClick={() => onJumpToNote(linkedNote.id)}
                          className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 hover:underline mr-2"
                        >
                          <span className="truncate max-w-[160px]">{linkedNote.title || 'Source Note'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditQuestion(item)}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Edit question"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteQuestion(item.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        aria-label="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
