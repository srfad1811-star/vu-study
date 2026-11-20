import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  HelpCircle,
  Highlighter,
  Search,
  Trash2,
} from 'lucide-react';
import {
  ConceptHighlight,
  HIGHLIGHT_META,
  HighlightCategory,
  Note,
  Subject,
} from '../types/study';
import { formatRelativeDate } from '../lib/markdown';

interface ConceptVaultProps {
  highlights: ConceptHighlight[];
  notes: Note[];
  subjects: Subject[];
  selectedSubjectFilter: string | 'all';
  onJumpToNote: (noteId: string) => void;
  onUpdateHighlight: (
    id: string,
    updates: { category?: HighlightCategory; annotation?: string }
  ) => void;
  onMarkReviewed: (id: string) => void;
  onRemoveHighlight: (id: string) => void;
  onCreateQuestionFromHighlight: (highlight: ConceptHighlight) => void;
}

export const ConceptVault: React.FC<ConceptVaultProps> = ({
  highlights,
  notes,
  subjects,
  selectedSubjectFilter,
  onJumpToNote,
  onUpdateHighlight,
  onMarkReviewed,
  onRemoveHighlight,
  onCreateQuestionFromHighlight,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<HighlightCategory | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState('');

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
    return highlights
      .filter((h) => {
        if (selectedSubjectFilter !== 'all' && h.subjectId !== selectedSubjectFilter) {
          return false;
        }
        if (categoryFilter !== 'all' && h.category !== categoryFilter) {
          return false;
        }
        if (!q) return true;
        const noteTitle = noteMap[h.noteId]?.title.toLowerCase() ?? '';
        return (
          h.text.toLowerCase().includes(q) ||
          h.annotation.toLowerCase().includes(q) ||
          noteTitle.includes(q)
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [highlights, selectedSubjectFilter, categoryFilter, search, noteMap]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const cat of Object.values(HighlightCategory)) counts[cat] = 0;
    for (const h of highlights) {
      if (selectedSubjectFilter !== 'all' && h.subjectId !== selectedSubjectFilter) continue;
      counts.all++;
      counts[h.category] = (counts[h.category] ?? 0) + 1;
    }
    return counts;
  }, [highlights, selectedSubjectFilter]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 font-display">
              Concept Vault
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Every highlighted definition, formula, exam point, and example extracted from your study notes.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {filtered.length} concepts shown
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              All ({categoryCounts.all})
            </button>
            {(Object.keys(HIGHLIGHT_META) as HighlightCategory[]).map((cat) => {
              const meta = HIGHLIGHT_META[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${meta.swatchClass}`} />
                  <span>{meta.shortLabel}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    ({categoryCounts[cat] ?? 0})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search highlighted concepts..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Concepts List / Empty State */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
            <Highlighter className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {highlights.length === 0 ? 'No Concept Highlights Yet' : 'No Matching Concepts'}
            </h2>
            <p className="max-w-md mx-auto text-sm text-slate-500 dark:text-slate-400">
              {highlights.length === 0
                ? 'Open any note in Notes Studio, select key text in Study & Highlight mode (or Write mode), and mark it as a Definition, Formula, Exam Critical point, or Example.'
                : 'Try adjusting your category filter or search query.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => {
              const meta = HIGHLIGHT_META[item.category];
              const sub = subjectMap[item.subjectId];
              const sourceNote = noteMap[item.noteId];
              const isEditing = editingId === item.id;

              return (
                <article
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Unboxed Metadata Header */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${meta.swatchClass}`} />
                        <span className="font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {meta.label}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{sub?.name ?? 'Unassigned'}</span>
                      </div>
                      <span className="font-mono tabular-nums shrink-0">
                        Reviewed {item.reviewedCount}×
                      </span>
                    </div>

                    {/* Highlighted Excerpt */}
                    <div
                      className={`rounded-lg px-3.5 py-2.5 text-[15px] leading-relaxed border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                    >
                      {item.text}
                    </div>

                    {/* Memory Annotation */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={draftAnnotation}
                          onChange={(e) => setDraftAnnotation(e.target.value)}
                          placeholder="Add memory cue, intuition, or exam trap..."
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 rounded text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateHighlight(item.id, { annotation: draftAnnotation });
                              setEditingId(null);
                            }}
                            className="px-3 py-1 rounded bg-blue-700 text-white text-xs font-medium hover:bg-blue-800"
                          >
                            Save Cue
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {item.annotation ? (
                          <p
                            onClick={() => {
                              setEditingId(item.id);
                              setDraftAnnotation(item.annotation);
                            }}
                            className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 leading-relaxed"
                          >
                            <span className="font-medium text-slate-500 dark:text-slate-400">Cue: </span>
                            {item.annotation}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setDraftAnnotation('');
                            }}
                            className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            + Add memory cue
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    {sourceNote ? (
                      <button
                        type="button"
                        onClick={() => onJumpToNote(sourceNote.id)}
                        className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:underline truncate max-w-[200px]"
                      >
                        <span className="truncate">{sourceNote.title || 'Untitled Note'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    ) : (
                      <span className="text-slate-400">
                        Added {formatRelativeDate(item.createdAt)}
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onMarkReviewed(item.id)}
                        title="Mark concept reviewed"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Reviewed</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onCreateQuestionFromHighlight(item)}
                        title="Create Important Question from concept"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>To Q&A</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveHighlight(item.id)}
                        title="Remove highlight"
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
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
