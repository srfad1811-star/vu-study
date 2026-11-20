import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  CheckSquare,
  Code,
  Download,
  FileText,
  Heading1,
  Heading2,
  HelpCircle,
  Highlighter,
  Italic,
  List,
  Minus,
  Pin,
  Plus,
  Printer,
  Quote,
  Search,
  Trash2,
} from 'lucide-react';
import {
  ConceptHighlight,
  HIGHLIGHT_META,
  HighlightCategory,
  ImportantQuestion,
  Note,
  Subject,
} from '../types/study';
import {
  computeNoteStats,
  exportNoteAsMarkdown,
  formatRelativeDate,
  stripHighlightSyntax,
} from '../lib/markdown';
import { NoteRenderer } from './NoteRenderer';

interface NotesStudioProps {
  notes: Note[];
  subjects: Subject[];
  highlights: ConceptHighlight[];
  questions: ImportantQuestion[];
  selectedNoteId: string | null;
  selectedSubjectFilter: string | 'all';
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onCreateHighlight: (
    noteId: string,
    selectedText: string,
    contextBefore: string,
    category: HighlightCategory
  ) => { applied: boolean; reason?: string };
  onWrapEditorHighlight: (
    noteId: string,
    selectionStart: number,
    selectionEnd: number,
    category: HighlightCategory
  ) => void;
  onUpdateHighlight: (
    id: string,
    updates: { category?: HighlightCategory; annotation?: string }
  ) => void;
  onRemoveHighlight: (id: string) => void;
  onOpenQuestionModal: (prefill: {
    subjectId?: string;
    noteId?: string | null;
    question?: string;
    answer?: string;
  }) => void;
  onCreateSubject: () => void;
}

type StudioMode = 'write' | 'split' | 'study';

export const NotesStudio: React.FC<NotesStudioProps> = ({
  notes,
  subjects,
  highlights,
  questions,
  selectedNoteId,
  selectedSubjectFilter,
  onSelectNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onCreateHighlight,
  onWrapEditorHighlight,
  onUpdateHighlight,
  onRemoveHighlight,
  onOpenQuestionModal,
  onCreateSubject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'title'>('updated');
  const [mode, setMode] = useState<StudioMode>('split');
  const [tagInput, setTagInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const subjectMap = useMemo(() => {
    const map: Record<string, Subject> = {};
    for (const s of subjects) map[s.id] = s;
    return map;
  }, [subjects]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (selectedSubjectFilter !== 'all' && n.subjectId !== selectedSubjectFilter) {
          return false;
        }
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.chapter.toLowerCase().includes(q) ||
          stripHighlightSyntax(n.content).toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, selectedSubjectFilter, searchQuery, sortBy]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? filteredNotes[0] ?? null,
    [notes, selectedNoteId, filteredNotes]
  );

  useEffect(() => {
    setTagInput(activeNote ? activeNote.tags.join(', ') : '');
  }, [activeNote?.id]);

  useEffect(() => {
    if (!feedbackMsg) return;
    const timer = setTimeout(() => setFeedbackMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [feedbackMsg]);

  const highlightsById = useMemo(() => {
    const map: Record<string, ConceptHighlight> = {};
    for (const h of highlights) map[h.id] = h;
    return map;
  }, [highlights]);

  const linkedQuestionsCount = useMemo(() => {
    if (!activeNote) return 0;
    return questions.filter((q) => q.noteId === activeNote.id).length;
  }, [questions, activeNote]);

  const noteStats = useMemo(
    () => (activeNote ? computeNoteStats(activeNote.content) : null),
    [activeNote]
  );

  const insertFormatting = (prefix: string, suffix = '', placeholder = '') => {
    if (!activeNote || !textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = activeNote.content;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onUpdateNote(activeNote.id, { content: next });

    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const insertLinePrefix = (linePrefix: string) => {
    if (!activeNote || !textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const value = activeNote.content;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + linePrefix + value.slice(lineStart);
    onUpdateNote(activeNote.id, { content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + linePrefix.length, start + linePrefix.length);
    });
  };

  const handleToolbarHighlight = (category: HighlightCategory) => {
    setShowHighlightMenu(false);
    if (!activeNote || !textareaRef.current) return;
    const el = textareaRef.current;
    if (el.selectionStart === el.selectionEnd) {
      setFeedbackMsg('Select text inside the editor first to highlight a concept.');
      return;
    }
    onWrapEditorHighlight(activeNote.id, el.selectionStart, el.selectionEnd, category);
  };

  const handleSelectionToQuestion = () => {
    if (!activeNote) return;
    let selected = '';
    if (textareaRef.current && mode !== 'study') {
      const el = textareaRef.current;
      selected = activeNote.content.slice(el.selectionStart, el.selectionEnd).trim();
    } else {
      selected = window.getSelection()?.toString().trim() ?? '';
    }
    onOpenQuestionModal({
      subjectId: activeNote.subjectId,
      noteId: activeNote.id,
      question: selected ? `Explain: ${stripHighlightSyntax(selected)}` : '',
      answer: selected ? stripHighlightSyntax(selected) : '',
    });
  };

  const handleToggleCheckbox = (lineIndex: number) => {
    if (!activeNote) return;
    const lines = activeNote.content.split('\n');
    const target = lines[lineIndex];
    if (!target) return;
    if (/^-\s+\[\s\]\s+/.test(target)) {
      lines[lineIndex] = target.replace(/^-\s+\[\s\]\s+/, '- [x] ');
    } else if (/^-\s+\[[xX]\]\s+/.test(target)) {
      lines[lineIndex] = target.replace(/^-\s+\[[xX]\]\s+/, '- [ ] ');
    }
    onUpdateNote(activeNote.id, { content: lines.join('\n') });
  };

  const handleExportMd = () => {
    if (!activeNote) return;
    const subName = subjectMap[activeNote.subjectId]?.name ?? '';
    const md = exportNoteAsMarkdown(activeNote.title, subName, activeNote.chapter, activeNote.content);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeNote.title || 'note').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left Notes List Pane */}
      <section className="w-72 xl:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 no-print">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter notes..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
              {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'updated' | 'title')}
              className="bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="updated">Recently Updated</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredNotes.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <FileText className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {notes.length === 0
                  ? 'No study notes created yet. Start your first note to draft, highlight concepts, and link exam questions.'
                  : 'No notes match your current filter.'}
              </p>
              <button
                type="button"
                onClick={onCreateNote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Note
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              const sub = subjectMap[note.subjectId];
              const preview = stripHighlightSyntax(note.content)
                .replace(/[#>*`\-]/g, ' ')
                .trim()
                .slice(0, 88);

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onSelectNote(note.id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/35'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-sm font-medium truncate ${
                        isSelected
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {note.title || 'Untitled Note'}
                    </h3>
                    {note.pinned && (
                      <Pin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    )}
                  </div>

                  {preview && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {preview}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    <span>{sub?.name ?? 'Unassigned'}</span>
                    {note.chapter && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{note.chapter}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums shrink-0">{formatRelativeDate(note.updatedAt)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Main Editor & Study Workspace */}
      <section className="flex-1 flex flex-col min-w-0 pastel-canvas">
        {!activeNote ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-4">
              <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-display">
                Your Study Desk is Ready
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Create a subject and your first structured study note. Highlight core definitions, formulas, and exam-critical points directly inside your notes.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                {subjects.length === 0 && (
                  <button
                    type="button"
                    onClick={onCreateSubject}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Add Subject
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCreateNote}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Study Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Note Metadata & Toolbar Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 space-y-3 shrink-0 no-print">
              <div className="flex items-start justify-between gap-4">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => onUpdateNote(activeNote.id, { title: e.target.value })}
                  placeholder="Note Title..."
                  className="w-full bg-transparent text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 font-display focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateNote(activeNote.id, { pinned: !activeNote.pinned })}
                    title={activeNote.pinned ? 'Unpin note' : 'Pin note'}
                    className={`p-2 rounded-lg border transition-colors ${
                      activeNote.pinned
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportMd}
                    title="Export Markdown (.md)"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    title="Print Study Sheet"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteNote(activeNote.id)}
                    title="Delete Note"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subject, Chapter, Tags */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <select
                  value={activeNote.subjectId}
                  onChange={(e) => onUpdateNote(activeNote.id, { subjectId: e.target.value })}
                  className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Unassigned Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `${s.code} · ${s.name}` : s.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={activeNote.chapter}
                  onChange={(e) => onUpdateNote(activeNote.id, { chapter: e.target.value })}
                  placeholder="Chapter / Topic..."
                  className="w-40 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTagInput(val);
                    const tags = val
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean);
                    onUpdateNote(activeNote.id, { tags });
                  }}
                  placeholder="Tags (comma separated)..."
                  className="flex-1 min-w-[160px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Formatting & Mode Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1">
                  {mode !== 'study' && (
                    <>
                      <button
                        type="button"
                        onClick={() => insertLinePrefix('# ')}
                        title="Heading 1"
                        className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Heading1 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertLinePrefix('## ')}
                        title="Heading 2"
                        className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Heading2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('**', '**', 'bold text')}
                        title="Bold"
                        className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('*', '*', 'italic text')}
                        title="Italic"
                        className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('`', '`', 'formula or code')}
                        title="Inline Code / Formula"
                        className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Code className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertLinePrefix('- ')}
                        title="Bullet List"
                        className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertLinePrefix('- [ ] ')}
                        title="Study Checklist Item"
                        className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertLinePrefix('> ')}
                        title="Callout / Summary Quote"
                        className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Quote className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('\n---\n', '', '')}
                        title="Section Divider"
                        className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                      {/* Highlight Concept Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowHighlightMenu((v) => !v)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800 hover:brightness-95 whitespace-nowrap"
                        >
                          <Highlighter className="w-3.5 h-3.5" />
                          Highlight Concept
                        </button>
                        {showHighlightMenu && (
                          <div className="absolute left-0 top-full mt-1 z-30 w-48 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg p-1.5 space-y-0.5">
                            {(Object.keys(HIGHLIGHT_META) as HighlightCategory[]).map((cat) => {
                              const meta = HIGHLIGHT_META[cat];
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => handleToolbarHighlight(cat)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                                >
                                  <span className={`w-2.5 h-2.5 rounded-full ${meta.swatchClass}`} />
                                  {meta.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleSelectionToQuestion}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Save as Question
                  </button>
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {(
                    [
                      { id: 'write', label: 'Write' },
                      { id: 'split', label: 'Split' },
                      { id: 'study', label: 'Study & Highlight' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMode(tab.id)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        mode === tab.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {feedbackMsg && (
                <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
                  {feedbackMsg}
                </div>
              )}
            </div>

            {/* Editor & Preview Split */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
              {(mode === 'write' || mode === 'split') && (
                <div
                  className={`flex flex-col min-h-0 bg-white dark:bg-slate-950 ${
                    mode === 'split'
                      ? 'w-1/2 border-r border-slate-200 dark:border-slate-800'
                      : 'w-full'
                  }`}
                >
                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) => onUpdateNote(activeNote.id, { content: e.target.value })}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                        e.preventDefault();
                        insertFormatting('**', '**', 'bold');
                      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                        e.preventDefault();
                        insertFormatting('*', '*', 'italic');
                      }
                    }}
                    placeholder="Start writing structured study notes using Markdown (# Headings, - Lists, - [ ] Checklists, `formulas`). Select any text to highlight concepts..."
                    className="flex-1 w-full resize-none bg-transparent p-6 sm:p-8 text-[15px] leading-[1.7] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none font-sans"
                  />
                </div>
              )}

              {(mode === 'study' || mode === 'split') && (
                <div
                  className={`flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 bg-white/40 dark:bg-slate-950/40 ${
                    mode === 'split' ? 'w-1/2' : 'w-full'
                  }`}
                >
                  {mode === 'study' && (
                    <div className="max-w-[72ch] mx-auto mb-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 no-print">
                      <span>Select any phrase in the note below to highlight a concept or save a question.</span>
                      <span className="tabular-nums shrink-0">{noteStats?.highlightCount ?? 0} highlights</span>
                    </div>
                  )}
                  <NoteRenderer
                    content={activeNote.content}
                    highlightsById={highlightsById}
                    interactive={true}
                    onToggleCheckbox={handleToggleCheckbox}
                    onCreateHighlight={(text, contextBefore, cat) => {
                      const res = onCreateHighlight(activeNote.id, text, contextBefore, cat);
                      if (!res.applied && res.reason) {
                        setFeedbackMsg(res.reason);
                      }
                    }}
                    onUpdateHighlight={onUpdateHighlight}
                    onRemoveHighlight={onRemoveHighlight}
                    onCreateQuestionFromText={(text, annotation) =>
                      onOpenQuestionModal({
                        subjectId: activeNote.subjectId,
                        noteId: activeNote.id,
                        question: `Explain / Define: ${text}`,
                        answer: annotation ? `${text}\n\nNote: ${annotation}` : text,
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* Quiet Note Stats Strip */}
            <div className="px-6 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 shrink-0 no-print">
              <div className="flex items-center gap-2 tabular-nums">
                <span>{noteStats?.words ?? 0} words</span>
                <span aria-hidden="true">·</span>
                <span>{noteStats?.readMinutes ?? 1} min read</span>
                <span aria-hidden="true">·</span>
                <span>{noteStats?.highlightCount ?? 0} highlighted concepts</span>
              </div>
              <div className="flex items-center gap-3 tabular-nums">
                <span>{linkedQuestionsCount} linked questions</span>
                <span aria-hidden="true">·</span>
                <span>Saved {formatRelativeDate(activeNote.updatedAt)}</span>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
