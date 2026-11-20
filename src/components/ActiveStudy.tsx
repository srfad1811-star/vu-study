import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ConceptHighlight,
  HIGHLIGHT_META,
  ImportantQuestion,
  MasteryStatus,
  Note,
  StudySession,
  Subject,
} from '../types/study';
import { NoteRenderer } from './NoteRenderer';

interface ActiveStudyProps {
  subjects: Subject[];
  notes: Note[];
  highlights: ConceptHighlight[];
  questions: ImportantQuestion[];
  sessions: StudySession[];
  selectedSubjectFilter: string | 'all';
  // Timer lifted state so it stays running across views
  timerDurationMin: number;
  timerRemainingSec: number;
  timerRunning: boolean;
  timerSubjectId: string;
  timerNoteId: string;
  timerMode: 'focus' | 'deep' | 'review';
  soundEnabled: boolean;
  onChangeTimerPreset: (minutes: number, mode: 'focus' | 'deep' | 'review') => void;
  onChangeTimerSubject: (subjectId: string) => void;
  onChangeTimerNote: (noteId: string) => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onCompleteTimerNow: () => void;
  onToggleSound: () => void;
  onUpdateQuestionMastery: (id: string, mastery: MasteryStatus) => void;
  onMarkHighlightReviewed: (id: string) => void;
  onAppendScratchpadToNote: (noteId: string, text: string) => void;
}

type StudyTab = 'recall' | 'timer' | 'desk';

function formatTimerClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ActiveStudy: React.FC<ActiveStudyProps> = ({
  subjects,
  notes,
  highlights,
  questions,
  sessions,
  selectedSubjectFilter,
  timerDurationMin,
  timerRemainingSec,
  timerRunning,
  timerSubjectId,
  timerNoteId,
  timerMode,
  soundEnabled,
  onChangeTimerPreset,
  onChangeTimerSubject,
  onChangeTimerNote,
  onToggleTimer,
  onResetTimer,
  onCompleteTimerNow,
  onToggleSound,
  onUpdateQuestionMastery,
  onMarkHighlightReviewed,
  onAppendScratchpadToNote,
}) => {
  const [tab, setTab] = useState<StudyTab>('recall');

  // Active Recall State
  const [deckSource, setDeckSource] = useState<'questions' | 'concepts'>('questions');
  const [onlyUnmastered, setOnlyUnmastered] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Split Study Desk State
  const [deskNoteId, setDeskNoteId] = useState<string>(notes[0]?.id ?? '');
  const [scratchpad, setScratchpad] = useState('');
  const [scratchSavedMsg, setScratchSavedMsg] = useState(false);

  // Custom timer input
  const [customMin, setCustomMin] = useState('30');

  const subjectMap = useMemo(() => {
    const map: Record<string, Subject> = {};
    for (const s of subjects) map[s.id] = s;
    return map;
  }, [subjects]);

  const highlightsById = useMemo(() => {
    const map: Record<string, ConceptHighlight> = {};
    for (const h of highlights) map[h.id] = h;
    return map;
  }, [highlights]);

  const recallDeck = useMemo(() => {
    if (deckSource === 'questions') {
      return questions.filter((q) => {
        if (selectedSubjectFilter !== 'all' && q.subjectId !== selectedSubjectFilter) return false;
        if (onlyUnmastered && q.mastery === MasteryStatus.Mastered) return false;
        return true;
      });
    } else {
      return highlights.filter((h) => {
        if (selectedSubjectFilter !== 'all' && h.subjectId !== selectedSubjectFilter) return false;
        return true;
      });
    }
  }, [deckSource, questions, highlights, selectedSubjectFilter, onlyUnmastered]);

  useEffect(() => {
    setCardIndex(0);
    setFlipped(false);
  }, [deckSource, selectedSubjectFilter, onlyUnmastered]);

  useEffect(() => {
    if (cardIndex >= recallDeck.length && recallDeck.length > 0) {
      setCardIndex(0);
    }
  }, [recallDeck.length, cardIndex]);

  useEffect(() => {
    if (!deskNoteId && notes.length > 0) {
      setDeskNoteId(notes[0].id);
    }
  }, [notes, deskNoteId]);

  // Keyboard shortcuts for Active Recall
  useEffect(() => {
    if (tab !== 'recall' || recallDeck.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((v) => !v);
      } else if (e.key === 'ArrowRight') {
        setFlipped(false);
        setCardIndex((i) => (i + 1) % recallDeck.length);
      } else if (e.key === 'ArrowLeft') {
        setFlipped(false);
        setCardIndex((i) => (i - 1 + recallDeck.length) % recallDeck.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tab, recallDeck.length]);

  const currentCard = recallDeck[cardIndex] ?? null;

  const activeDeskNote = notes.find((n) => n.id === deskNoteId) ?? notes[0] ?? null;
  const deskLinkedQuestions = useMemo(
    () =>
      activeDeskNote
        ? questions.filter(
            (q) =>
              q.noteId === activeDeskNote.id ||
              (activeDeskNote.subjectId && q.subjectId === activeDeskNote.subjectId && !q.noteId)
          )
        : [],
    [activeDeskNote, questions]
  );
  const deskNoteHighlights = useMemo(
    () => (activeDeskNote ? highlights.filter((h) => h.noteId === activeDeskNote.id) : []),
    [activeDeskNote, highlights]
  );

  const progressPct = Math.max(
    0,
    Math.min(100, Math.round(((timerDurationMin * 60 - timerRemainingSec) / (timerDurationMin * 60)) * 100))
  );

  return (
    <div className="flex-1 overflow-y-auto pastel-canvas p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header + Sub-mode Segmented Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 font-display">
              Active Study
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Self-test with flashcards, run timed focus sessions, or study notes alongside linked questions.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg self-start">
            {(
              [
                { id: 'recall', label: 'Active Recall Deck' },
                { id: 'timer', label: 'Focus Timer' },
                { id: 'desk', label: 'Split Study Desk' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: Active Recall Flashcard Deck */}
        {tab === 'recall' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDeckSource('questions')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      deckSource === 'questions'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Important Questions ({questions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeckSource('concepts')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      deckSource === 'concepts'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Highlighted Concepts ({highlights.length})
                  </button>
                </div>

                {deckSource === 'questions' && (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyUnmastered}
                      onChange={(e) => setOnlyUnmastered(e.target.checked)}
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    Only Unreviewed & Needs Practice
                  </label>
                )}
              </div>

              <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {recallDeck.length > 0 ? `Card ${cardIndex + 1} / ${recallDeck.length}` : '0 cards'}
              </div>
            </div>

            {!currentCard ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  No Cards in This Recall Deck
                </h2>
                <p className="max-w-md mx-auto text-sm text-slate-500 dark:text-slate-400">
                  {deckSource === 'questions'
                    ? 'Save important questions in the Question Bank (or turn off the unmastered filter) to practice active recall.'
                    : 'Highlight concepts inside your study notes to drill definitions, formulas, and exam points here.'}
                </p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 min-h-[300px] flex flex-col justify-between">
                  {deckSource === 'questions' ? (
                    (() => {
                      const qCard = currentCard as ImportantQuestion;
                      const sub = subjectMap[qCard.subjectId];
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                            <span>
                              {sub?.name ?? 'General'} · {qCard.reference || 'Important Question'}
                            </span>
                            <span className="font-mono tabular-nums">
                              Reviews: {qCard.reviewCount}
                            </span>
                          </div>

                          <div className="py-6 space-y-5">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 leading-relaxed whitespace-pre-wrap">
                              {qCard.question}
                            </h2>

                            {flipped && (
                              <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                  Model Answer
                                </div>
                                <p className="text-[15px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                  {qCard.answer || 'No model answer recorded for this question.'}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setFlipped((v) => !v)}
                              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              {flipped ? 'Hide Answer (Space)' : 'Reveal Answer (Space)'}
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateQuestionMastery(qCard.id, MasteryStatus.Practice);
                                  setFlipped(false);
                                  setCardIndex((i) => (i + 1) % recallDeck.length);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-xs font-medium"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Needs Practice
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateQuestionMastery(qCard.id, MasteryStatus.Mastered);
                                  setFlipped(false);
                                  setCardIndex((i) => (i + 1) % recallDeck.length);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Mastered
                              </button>
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    (() => {
                      const hCard = currentCard as ConceptHighlight;
                      const meta = HIGHLIGHT_META[hCard.category];
                      const sub = subjectMap[hCard.subjectId];
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                            <span>
                              {meta.label} · {sub?.name ?? 'Unassigned'}
                            </span>
                            <span className="font-mono tabular-nums">
                              Reviewed {hCard.reviewedCount}×
                            </span>
                          </div>

                          <div className="py-6 space-y-5">
                            {hCard.annotation ? (
                              <>
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                  Memory Cue
                                </div>
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 leading-relaxed">
                                  {hCard.annotation}
                                </h2>
                                {flipped && (
                                  <div
                                    className={`rounded-lg p-4 border text-[15px] leading-relaxed ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                                  >
                                    {hCard.text}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div
                                  className={`rounded-lg p-4 border text-base leading-relaxed ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                                >
                                  {hCard.text}
                                </div>
                                {flipped && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Tip: Add a Memory Cue in Concept Vault to test yourself from prompt to concept!
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setFlipped((v) => !v)}
                              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium"
                            >
                              {flipped ? 'Hide Concept (Space)' : 'Reveal Concept (Space)'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onMarkHighlightReviewed(hCard.id);
                                setFlipped(false);
                                setCardIndex((i) => (i + 1) % recallDeck.length);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Reviewed & Next
                            </button>
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>

                {/* Card Navigation */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      setFlipped(false);
                      setCardIndex((i) => (i - 1 + recallDeck.length) % recallDeck.length);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span>Shortcuts: Space = Flip · Left/Right = Navigate</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFlipped(false);
                      setCardIndex((i) => (i + 1) % recallDeck.length);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Focus Timer & Session Logger */}
        {tab === 'timer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Study Session Timer</span>
                </div>
                <button
                  type="button"
                  onClick={onToggleSound}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {soundEnabled ? 'Chime On' : 'Muted'}
                </button>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: '25m Focus', min: 25, mode: 'focus' as const },
                  { label: '50m Deep Work', min: 50, mode: 'deep' as const },
                  { label: '15m Recall', min: 15, mode: 'review' as const },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onChangeTimerPreset(preset.min, preset.mode)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      timerDurationMin === preset.min && timerMode === preset.mode
                        ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const mins = Math.max(1, Math.min(180, Number(customMin) || 25));
                    onChangeTimerPreset(mins, 'focus');
                  }}
                  className="inline-flex items-center gap-1.5 ml-auto"
                >
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customMin}
                    onChange={(e) => setCustomMin(e.target.value)}
                    className="w-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Set min
                  </button>
                </form>
              </div>

              {/* Clock Display */}
              <div className="py-6 text-center space-y-4">
                <div className="text-6xl sm:text-7xl font-mono font-semibold tracking-tight tabular-nums text-slate-900 dark:text-slate-50">
                  {formatTimerClock(timerRemainingSec)}
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Session Target Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Studying Subject
                  </label>
                  <select
                    value={timerSubjectId}
                    onChange={(e) => onChangeTimerSubject(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="">General Study</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Linked Note (Optional)
                  </label>
                  <select
                    value={timerNoteId}
                    onChange={(e) => onChangeTimerNote(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="">None</option>
                    {notes
                      .filter((n) => !timerSubjectId || n.subjectId === timerSubjectId)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.title || 'Untitled Note'}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onToggleTimer}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors"
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {timerRunning ? 'Pause Timer' : 'Start Focus'}
                </button>
                <button
                  type="button"
                  onClick={onResetTimer}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onCompleteTimerNow}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-sm font-medium text-emerald-800 dark:text-emerald-200 hover:brightness-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Log Elapsed
                </button>
              </div>
            </div>

            {/* Session Log */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Logged Study Sessions
                </h2>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {sessions.length} total
                </span>
              </div>

              {sessions.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                  No completed study sessions logged yet. Finish or log a focus timer to record real study time.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
                  {[...sessions]
                    .sort((a, b) => b.completedAt - a.completedAt)
                    .slice(0, 20)
                    .map((s) => (
                      <div key={s.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                            {s.subjectId ? subjectMap[s.subjectId]?.name ?? 'Subject' : 'General Study'}
                          </div>
                          <div className="text-slate-400 dark:text-slate-500 mt-0.5">
                            {new Date(s.completedAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-200 shrink-0">
                          {s.durationMinutes} min
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Split Study Desk */}
        {tab === 'desk' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Study Note:
                </label>
                <select
                  value={activeDeskNote?.id ?? ''}
                  onChange={(e) => setDeskNoteId(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                >
                  {notes.length === 0 ? (
                    <option value="">No notes available</option>
                  ) : (
                    notes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title || 'Untitled Note'}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {activeDeskNote && (
                <div className="text-xs text-slate-400 tabular-nums">
                  {deskNoteHighlights.length} concepts · {deskLinkedQuestions.length} related questions
                </div>
              )}
            </div>

            {!activeDeskNote ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Create at least one note in Notes Studio to use the Split Study Desk.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left: Note Reading Pane */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-h-[68vh] overflow-y-auto">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 font-display mb-4">
                    {activeDeskNote.title || 'Untitled Note'}
                  </h2>
                  <NoteRenderer
                    content={activeDeskNote.content}
                    highlightsById={highlightsById}
                    interactive={false}
                  />
                </div>

                {/* Right: Linked Questions, Highlights, & Scratchpad */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Quick Scratchpad
                    </h3>
                    <textarea
                      rows={4}
                      value={scratchpad}
                      onChange={(e) => setScratchpad(e.target.value)}
                      placeholder="Write rough recall points or derivations while reading, then append directly to this note..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        {scratchSavedMsg ? 'Appended to note' : ''}
                      </span>
                      <button
                        type="button"
                        disabled={!scratchpad.trim()}
                        onClick={() => {
                          onAppendScratchpadToNote(activeDeskNote.id, scratchpad);
                          setScratchpad('');
                          setScratchSavedMsg(true);
                          setTimeout(() => setScratchSavedMsg(false), 2500);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                      >
                        Append to Note
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 max-h-[38vh] overflow-y-auto">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Related Questions ({deskLinkedQuestions.length})
                    </h3>
                    {deskLinkedQuestions.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        No questions linked to this note or subject yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-2">
                        {deskLinkedQuestions.map((q) => (
                          <div key={q.id} className="pt-2.5 first:pt-0 space-y-1">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                              {q.question}
                            </p>
                            <details className="text-xs text-slate-500 dark:text-slate-400">
                              <summary className="cursor-pointer text-blue-700 dark:text-blue-400 hover:underline">
                                View Answer
                              </summary>
                              <p className="mt-1.5 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                {q.answer || 'No answer saved.'}
                              </p>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
