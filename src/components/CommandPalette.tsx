import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  HelpCircle,
  Highlighter,
  Search,
  X,
} from 'lucide-react';
import {
  ConceptHighlight,
  HIGHLIGHT_META,
  ImportantQuestion,
  Note,
  Subject,
} from '../types/study';
import { stripHighlightSyntax } from '../lib/markdown';

interface CommandPaletteProps {
  open: boolean;
  notes: Note[];
  highlights: ConceptHighlight[];
  questions: ImportantQuestion[];
  subjects: Subject[];
  onClose: () => void;
  onSelectNote: (noteId: string) => void;
  onOpenConcepts: () => void;
  onOpenQuestions: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  notes,
  highlights,
  questions,
  subjects,
  onClose,
  onSelectNote,
  onOpenConcepts,
  onOpenQuestions,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const subjectMap = useMemo(() => {
    const map: Record<string, Subject> = {};
    for (const s of subjects) map[s.id] = s;
    return map;
  }, [subjects]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedNotes = notes
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.chapter.toLowerCase().includes(q) ||
          stripHighlightSyntax(n.content).toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .slice(0, 6);

    const matchedHighlights = highlights
      .filter((h) => {
        if (!q) return true;
        return (
          h.text.toLowerCase().includes(q) ||
          h.annotation.toLowerCase().includes(q)
        );
      })
      .slice(0, 5);

    const matchedQuestions = questions
      .filter((item) => {
        if (!q) return true;
        return (
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.reference.toLowerCase().includes(q)
        );
      })
      .slice(0, 5);

    return { matchedNotes, matchedHighlights, matchedQuestions };
  }, [query, notes, highlights, questions]);

  if (!open) return null;

  const totalCount =
    results.matchedNotes.length +
    results.matchedHighlights.length +
    results.matchedQuestions.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 backdrop-blur-[2px] pt-[12vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, highlighted concepts, or important questions..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {totalCount === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {notes.length === 0 && highlights.length === 0 && questions.length === 0
                ? 'Your workspace is empty. Create a note or question to search across your library.'
                : 'No matching notes, concepts, or questions found.'}
            </div>
          ) : (
            <>
              {results.matchedNotes.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Notes
                  </div>
                  <div className="space-y-1">
                    {results.matchedNotes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          onSelectNote(n.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {n.title || 'Untitled Note'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                          {subjectMap[n.subjectId]?.name ?? 'Unassigned'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.matchedHighlights.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Highlighted Concepts
                  </div>
                  <div className="space-y-1">
                    {results.matchedHighlights.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          if (h.noteId) {
                            onSelectNote(h.noteId);
                          } else {
                            onOpenConcepts();
                          }
                          onClose();
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Highlighter className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-sm text-slate-800 dark:text-slate-100 truncate">
                            {h.text}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                          {HIGHLIGHT_META[h.category].shortLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.matchedQuestions.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Important Questions
                  </div>
                  <div className="space-y-1">
                    {results.matchedQuestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onOpenQuestions();
                          onClose();
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-sm text-slate-800 dark:text-slate-100 truncate">
                            {item.question}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                          {subjectMap[item.subjectId]?.name ?? 'General'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
