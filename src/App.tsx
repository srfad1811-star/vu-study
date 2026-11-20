import { useCallback, useEffect, useMemo, useState } from 'react';
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
  WorkspaceView,
} from './types/study';
import {
  clearWorkspace,
  deleteRecord,
  generateId,
  loadWorkspace,
  putRecord,
  replaceAllWorkspace,
} from './lib/storage';
import {
  extractInlineHighlights,
  removeInlineHighlight,
  updateInlineHighlightCategory,
  wrapSelectionInMarkdown,
} from './lib/markdown';
import { playCompletionChime } from './lib/sound';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { NotesStudio } from './components/NotesStudio';
import { ConceptVault } from './components/ConceptVault';
import { QuestionBank } from './components/QuestionBank';
import { ActiveStudy } from './components/ActiveStudy';
import { AnalyticsBackup } from './components/AnalyticsBackup';
import { SubjectModal } from './components/SubjectModal';
import { QuestionModal } from './components/QuestionModal';
import { CommandPalette } from './components/CommandPalette';

export default function App() {
  const [ready, setReady] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<ConceptHighlight[]>([]);
  const [questions, setQuestions] = useState<ImportantQuestion[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  // Navigation & UI state
  const [activeView, setActiveView] = useState<WorkspaceView>('notes');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | 'all'>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Theme state synced with DOM
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  // Modals state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ImportantQuestion | null>(null);
  const [questionPrefill, setQuestionPrefill] = useState<{
    subjectId?: string;
    noteId?: string | null;
    question?: string;
    answer?: string;
  } | null>(null);

  // Global Focus Timer state
  const [timerDurationMin, setTimerDurationMin] = useState(25);
  const [timerRemainingSec, setTimerRemainingSec] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSubjectId, setTimerSubjectId] = useState('');
  const [timerNoteId, setTimerNoteId] = useState('');
  const [timerMode, setTimerMode] = useState<'focus' | 'deep' | 'review'>('focus');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initial load from IndexedDB (zero fake data)
  useEffect(() => {
    let active = true;
    loadWorkspace().then((data) => {
      if (!active) return;
      setSubjects(data.subjects);
      setNotes(data.notes);
      setHighlights(data.highlights);
      setQuestions(data.questions);
      setSessions(data.sessions);
      if (data.notes.length > 0) {
        const sorted = [...data.notes].sort((a, b) => b.updatedAt - a.updatedAt);
        setSelectedNoteId(sorted[0].id);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Global Cmd/Ctrl + K search shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Focus timer tick & automatic completion logging
  const logStudySession = useCallback(
    (minutes: number) => {
      const cleanMins = Math.max(1, Math.round(minutes));
      const newSession: StudySession = {
        id: generateId('ses'),
        subjectId: timerSubjectId || null,
        noteId: timerNoteId || null,
        mode: timerMode,
        durationMinutes: cleanMins,
        completedAt: Date.now(),
      };
      setSessions((prev) => [...prev, newSession]);
      void putRecord('sessions', newSession);
    },
    [timerSubjectId, timerNoteId, timerMode]
  );

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setTimerRemainingSec((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          if (soundEnabled) playCompletionChime();
          logStudySession(timerDurationMin);
          return timerDurationMin * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning, timerDurationMin, soundEnabled, logStudySession]);

  const handleToggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('codex-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('codex-theme', 'light');
      }
      return next;
    });
  };

  // Subject CRUD
  const handleSaveSubject = (data: {
    name: string;
    code: string;
    color: string;
    description: string;
  }) => {
    if (editingSubject) {
      const updated: Subject = { ...editingSubject, ...data };
      setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      void putRecord('subjects', updated);
    } else {
      const created: Subject = {
        id: generateId('sub'),
        ...data,
        createdAt: Date.now(),
      };
      setSubjects((prev) => [...prev, created]);
      void putRecord('subjects', created);
      setSelectedSubjectId(created.id);
    }
    setEditingSubject(null);
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    void deleteRecord('subjects', subjectId);
    if (selectedSubjectId === subjectId) setSelectedSubjectId('all');

    // Unassign subjectId on affected notes/questions/highlights rather than deleting user work
    setNotes((prev) =>
      prev.map((n) => {
        if (n.subjectId !== subjectId) return n;
        const updated = { ...n, subjectId: '' };
        void putRecord('notes', updated);
        return updated;
      })
    );
    setHighlights((prev) =>
      prev.map((h) => {
        if (h.subjectId !== subjectId) return h;
        const updated = { ...h, subjectId: '' };
        void putRecord('highlights', updated);
        return updated;
      })
    );
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.subjectId !== subjectId) return q;
        const updated = { ...q, subjectId: '' };
        void putRecord('questions', updated);
        return updated;
      })
    );
  };

  // Sync inline highlights whenever note content or subject changes
  const syncHighlightsForNote = useCallback(
    (noteId: string, subjectId: string, content: string) => {
      const tokens = extractInlineHighlights(content);
      const tokenIds = new Set(tokens.map((t) => t.id));

      setHighlights((prev) => {
        const existingById: Record<string, ConceptHighlight> = {};
        for (const h of prev) {
          if (h.noteId === noteId) existingById[h.id] = h;
        }

        const otherNotesHighlights = prev.filter((h) => h.noteId !== noteId);
        // Delete removed highlights from DB
        for (const old of prev) {
          if (old.noteId === noteId && !tokenIds.has(old.id)) {
            void deleteRecord('highlights', old.id);
          }
        }

        const syncedForNote: ConceptHighlight[] = tokens.map((tok) => {
          const existing = existingById[tok.id];
          const record: ConceptHighlight = existing
            ? {
                ...existing,
                subjectId,
                text: tok.text,
                category: tok.category,
              }
            : {
                id: tok.id,
                noteId,
                subjectId,
                text: tok.text,
                annotation: '',
                category: tok.category,
                reviewedCount: 0,
                lastReviewedAt: null,
                createdAt: Date.now(),
              };
          void putRecord('highlights', record);
          return record;
        });

        return [...otherNotesHighlights, ...syncedForNote];
      });
    },
    []
  );

  // Note CRUD
  const handleCreateNote = () => {
    const newNote: Note = {
      id: generateId('note'),
      subjectId: selectedSubjectId !== 'all' ? selectedSubjectId : subjects[0]?.id ?? '',
      title: '',
      chapter: '',
      content: '',
      tags: [],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    void putRecord('notes', newNote);
    setSelectedNoteId(newNote.id);
    setActiveView('notes');
  };

  const handleUpdateNote = (noteId: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        const updated: Note = { ...n, ...updates, updatedAt: Date.now() };
        void putRecord('notes', updated);
        if (updates.content !== undefined || updates.subjectId !== undefined) {
          syncHighlightsForNote(updated.id, updated.subjectId, updated.content);
        }
        return updated;
      })
    );
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    void deleteRecord('notes', noteId);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }

    // Remove highlights tied to deleted note
    setHighlights((prev) => {
      for (const h of prev) {
        if (h.noteId === noteId) void deleteRecord('highlights', h.id);
      }
      return prev.filter((h) => h.noteId !== noteId);
    });

    // Detach noteId from questions
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.noteId !== noteId) return q;
        const updated = { ...q, noteId: null };
        void putRecord('questions', updated);
        return updated;
      })
    );
  };

  // Concept Highlighting handlers
  const handleCreateHighlight = (
    noteId: string,
    selectedText: string,
    contextBefore: string,
    category: HighlightCategory
  ): { applied: boolean; reason?: string } => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return { applied: false, reason: 'Note not found.' };

    const hlId = generateId('hl');
    const res = wrapSelectionInMarkdown(
      target.content,
      selectedText,
      contextBefore,
      category,
      hlId
    );
    if (!res.applied) return res;

    handleUpdateNote(noteId, { content: res.updated });
    return { applied: true };
  };

  const handleWrapEditorHighlight = (
    noteId: string,
    selectionStart: number,
    selectionEnd: number,
    category: HighlightCategory
  ) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const selected = target.content.slice(selectionStart, selectionEnd).trim();
    if (!selected || selected.includes('==[')) return;
    const hlId = generateId('hl');
    const wrapped = `==[${category}|${hlId}]${selected}==`;
    const nextContent =
      target.content.slice(0, selectionStart) + wrapped + target.content.slice(selectionEnd);
    handleUpdateNote(noteId, { content: nextContent });
  };

  const handleUpdateHighlight = (
    id: string,
    updates: { category?: HighlightCategory; annotation?: string }
  ) => {
    const target = highlights.find((h) => h.id === id);
    if (!target) return;

    const updatedRecord: ConceptHighlight = { ...target, ...updates };
    setHighlights((prev) => prev.map((h) => (h.id === id ? updatedRecord : h)));
    void putRecord('highlights', updatedRecord);

    if (updates.category) {
      const sourceNote = notes.find((n) => n.id === target.noteId);
      if (sourceNote) {
        const nextContent = updateInlineHighlightCategory(sourceNote.content, id, updates.category);
        if (nextContent !== sourceNote.content) {
          const updatedNote = { ...sourceNote, content: nextContent, updatedAt: Date.now() };
          setNotes((prev) => prev.map((n) => (n.id === sourceNote.id ? updatedNote : n)));
          void putRecord('notes', updatedNote);
        }
      }
    }
  };

  const handleMarkHighlightReviewed = (id: string) => {
    setHighlights((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const updated: ConceptHighlight = {
          ...h,
          reviewedCount: h.reviewedCount + 1,
          lastReviewedAt: Date.now(),
        };
        void putRecord('highlights', updated);
        return updated;
      })
    );
  };

  const handleRemoveHighlight = (id: string) => {
    const target = highlights.find((h) => h.id === id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    void deleteRecord('highlights', id);

    if (target) {
      const sourceNote = notes.find((n) => n.id === target.noteId);
      if (sourceNote) {
        const nextContent = removeInlineHighlight(sourceNote.content, id);
        if (nextContent !== sourceNote.content) {
          const updatedNote = { ...sourceNote, content: nextContent, updatedAt: Date.now() };
          setNotes((prev) => prev.map((n) => (n.id === sourceNote.id ? updatedNote : n)));
          void putRecord('notes', updatedNote);
        }
      }
    }
  };

  // Important Question CRUD
  const handleSaveQuestion = (data: {
    subjectId: string;
    noteId: string | null;
    question: string;
    answer: string;
    reference: string;
    priority: QuestionPriority;
    difficulty: QuestionDifficulty;
    mastery: MasteryStatus;
  }) => {
    if (editingQuestion) {
      const updated: ImportantQuestion = {
        ...editingQuestion,
        ...data,
        updatedAt: Date.now(),
      };
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      void putRecord('questions', updated);
    } else {
      const created: ImportantQuestion = {
        id: generateId('q'),
        ...data,
        reviewCount: 0,
        lastReviewedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setQuestions((prev) => [created, ...prev]);
      void putRecord('questions', created);
    }
    setEditingQuestion(null);
    setQuestionPrefill(null);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    void deleteRecord('questions', id);
  };

  const handleUpdateQuestionMastery = (id: string, mastery: MasteryStatus) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated: ImportantQuestion = {
          ...q,
          mastery,
          reviewCount: q.reviewCount + 1,
          lastReviewedAt: Date.now(),
          updatedAt: Date.now(),
        };
        void putRecord('questions', updated);
        return updated;
      })
    );
  };

  // Counts for sidebar
  const counts = useMemo(() => {
    const notesBySubject: Record<string, number> = {};
    for (const n of notes) {
      if (n.subjectId) {
        notesBySubject[n.subjectId] = (notesBySubject[n.subjectId] ?? 0) + 1;
      }
    }
    return {
      notes: notes.length,
      highlights: highlights.length,
      questions: questions.length,
      notesBySubject,
    };
  }, [notes, highlights, questions]);

  const selectedSubject = useMemo(
    () => (selectedSubjectId === 'all' ? null : subjects.find((s) => s.id === selectedSubjectId) ?? null),
    [subjects, selectedSubjectId]
  );

  const primaryActionLabel =
    activeView === 'questions' ? 'Add Question' : 'New Note';

  const handlePrimaryAction = () => {
    if (activeView === 'questions') {
      setEditingQuestion(null);
      setQuestionPrefill({
        subjectId: selectedSubjectId !== 'all' ? selectedSubjectId : subjects[0]?.id ?? '',
      });
      setQuestionModalOpen(true);
    } else {
      handleCreateNote();
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen pastel-canvas flex flex-col items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-200 to-emerald-200 dark:from-blue-800 dark:to-emerald-800 animate-pulse" />
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <Sidebar
        openMobile={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        activeView={activeView}
        onSelectView={setActiveView}
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
        onAddSubject={() => {
          setEditingSubject(null);
          setSubjectModalOpen(true);
        }}
        onEditSubject={(sub) => {
          setEditingSubject(sub);
          setSubjectModalOpen(true);
        }}
        onDeleteSubject={handleDeleteSubject}
        counts={counts}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar
          activeView={activeView}
          selectedSubject={selectedSubject}
          darkMode={darkMode}
          onToggleTheme={handleToggleTheme}
          onOpenMobileMenu={() => setMobileNavOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onPrimaryAction={handlePrimaryAction}
          primaryActionLabel={primaryActionLabel}
          timerRunning={timerRunning}
          timerRemainingSeconds={timerRemainingSec}
          onOpenTimer={() => setActiveView('study')}
        />

        <main className="flex-1 flex min-h-0 overflow-hidden">
          {activeView === 'notes' && (
            <NotesStudio
              notes={notes}
              subjects={subjects}
              highlights={highlights}
              questions={questions}
              selectedNoteId={selectedNoteId}
              selectedSubjectFilter={selectedSubjectId}
              onSelectNote={setSelectedNoteId}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onCreateHighlight={handleCreateHighlight}
              onWrapEditorHighlight={handleWrapEditorHighlight}
              onUpdateHighlight={handleUpdateHighlight}
              onRemoveHighlight={handleRemoveHighlight}
              onOpenQuestionModal={(prefill) => {
                setEditingQuestion(null);
                setQuestionPrefill(prefill);
                setQuestionModalOpen(true);
              }}
              onCreateSubject={() => {
                setEditingSubject(null);
                setSubjectModalOpen(true);
              }}
            />
          )}

          {activeView === 'concepts' && (
            <ConceptVault
              highlights={highlights}
              notes={notes}
              subjects={subjects}
              selectedSubjectFilter={selectedSubjectId}
              onJumpToNote={(noteId) => {
                setSelectedNoteId(noteId);
                setActiveView('notes');
              }}
              onUpdateHighlight={handleUpdateHighlight}
              onMarkReviewed={handleMarkHighlightReviewed}
              onRemoveHighlight={handleRemoveHighlight}
              onCreateQuestionFromHighlight={(hl) => {
                setEditingQuestion(null);
                setQuestionPrefill({
                  subjectId: hl.subjectId,
                  noteId: hl.noteId,
                  question: `Explain / Define: ${hl.text}`,
                  answer: hl.annotation ? `${hl.text}\n\nNote: ${hl.annotation}` : hl.text,
                });
                setQuestionModalOpen(true);
              }}
            />
          )}

          {activeView === 'questions' && (
            <QuestionBank
              questions={questions}
              subjects={subjects}
              notes={notes}
              selectedSubjectFilter={selectedSubjectId}
              onAddQuestion={() => {
                setEditingQuestion(null);
                setQuestionPrefill({
                  subjectId: selectedSubjectId !== 'all' ? selectedSubjectId : subjects[0]?.id ?? '',
                });
                setQuestionModalOpen(true);
              }}
              onEditQuestion={(q) => {
                setEditingQuestion(q);
                setQuestionPrefill(null);
                setQuestionModalOpen(true);
              }}
              onDeleteQuestion={handleDeleteQuestion}
              onUpdateMastery={handleUpdateQuestionMastery}
              onJumpToNote={(noteId) => {
                setSelectedNoteId(noteId);
                setActiveView('notes');
              }}
            />
          )}

          {activeView === 'study' && (
            <ActiveStudy
              subjects={subjects}
              notes={notes}
              highlights={highlights}
              questions={questions}
              sessions={sessions}
              selectedSubjectFilter={selectedSubjectId}
              timerDurationMin={timerDurationMin}
              timerRemainingSec={timerRemainingSec}
              timerRunning={timerRunning}
              timerSubjectId={timerSubjectId}
              timerNoteId={timerNoteId}
              timerMode={timerMode}
              soundEnabled={soundEnabled}
              onChangeTimerPreset={(mins, m) => {
                setTimerRunning(false);
                setTimerDurationMin(mins);
                setTimerRemainingSec(mins * 60);
                setTimerMode(m);
              }}
              onChangeTimerSubject={setTimerSubjectId}
              onChangeTimerNote={setTimerNoteId}
              onToggleTimer={() => setTimerRunning((r) => !r)}
              onResetTimer={() => {
                setTimerRunning(false);
                setTimerRemainingSec(timerDurationMin * 60);
              }}
              onCompleteTimerNow={() => {
                const elapsedSec = timerDurationMin * 60 - timerRemainingSec;
                const mins = Math.max(1, Math.round(elapsedSec / 60) || timerDurationMin);
                setTimerRunning(false);
                setTimerRemainingSec(timerDurationMin * 60);
                if (soundEnabled) playCompletionChime();
                logStudySession(mins);
              }}
              onToggleSound={() => setSoundEnabled((s) => !s)}
              onUpdateQuestionMastery={handleUpdateQuestionMastery}
              onMarkHighlightReviewed={handleMarkHighlightReviewed}
              onAppendScratchpadToNote={(noteId, text) => {
                const target = notes.find((n) => n.id === noteId);
                if (!target) return;
                const next = target.content.trim()
                  ? `${target.content.trimEnd()}\n\n### Study Notes\n${text.trim()}`
                  : text.trim();
                handleUpdateNote(noteId, { content: next });
              }}
            />
          )}

          {activeView === 'analytics' && (
            <AnalyticsBackup
              subjects={subjects}
              notes={notes}
              highlights={highlights}
              questions={questions}
              sessions={sessions}
              onImportBackup={async (backup: WorkspaceBackup) => {
                await replaceAllWorkspace({
                  subjects: backup.subjects,
                  notes: backup.notes,
                  highlights: backup.highlights,
                  questions: backup.questions,
                  sessions: backup.sessions,
                });
                setSubjects(backup.subjects);
                setNotes(backup.notes);
                setHighlights(backup.highlights);
                setQuestions(backup.questions);
                setSessions(backup.sessions);
                setSelectedSubjectId('all');
                setSelectedNoteId(backup.notes[0]?.id ?? null);
              }}
              onClearAll={async () => {
                await clearWorkspace();
                setSubjects([]);
                setNotes([]);
                setHighlights([]);
                setQuestions([]);
                setSessions([]);
                setSelectedSubjectId('all');
                setSelectedNoteId(null);
              }}
            />
          )}
        </main>
      </div>

      {/* Modals & Command Palette */}
      <SubjectModal
        open={subjectModalOpen}
        editingSubject={editingSubject}
        onClose={() => {
          setSubjectModalOpen(false);
          setEditingSubject(null);
        }}
        onSave={handleSaveSubject}
      />

      <QuestionModal
        open={questionModalOpen}
        editingQuestion={editingQuestion}
        subjects={subjects}
        notes={notes}
        prefill={questionPrefill}
        onClose={() => {
          setQuestionModalOpen(false);
          setEditingQuestion(null);
          setQuestionPrefill(null);
        }}
        onSave={handleSaveQuestion}
      />

      <CommandPalette
        open={searchOpen}
        notes={notes}
        highlights={highlights}
        questions={questions}
        subjects={subjects}
        onClose={() => setSearchOpen(false)}
        onSelectNote={(noteId) => {
          setSelectedNoteId(noteId);
          setActiveView('notes');
        }}
        onOpenConcepts={() => setActiveView('concepts')}
        onOpenQuestions={() => setActiveView('questions')}
      />
    </div>
  );
}
