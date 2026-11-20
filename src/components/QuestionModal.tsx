import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  ImportantQuestion,
  MasteryStatus,
  Note,
  QuestionDifficulty,
  QuestionPriority,
  Subject,
} from '../types/study';

interface QuestionModalProps {
  open: boolean;
  editingQuestion: ImportantQuestion | null;
  subjects: Subject[];
  notes: Note[];
  prefill?: {
    subjectId?: string;
    noteId?: string | null;
    question?: string;
    answer?: string;
  } | null;
  onClose: () => void;
  onSave: (data: {
    subjectId: string;
    noteId: string | null;
    question: string;
    answer: string;
    reference: string;
    priority: QuestionPriority;
    difficulty: QuestionDifficulty;
    mastery: MasteryStatus;
  }) => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  open,
  editingQuestion,
  subjects,
  notes,
  prefill,
  onClose,
  onSave,
}) => {
  const [subjectId, setSubjectId] = useState('');
  const [noteId, setNoteId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [reference, setReference] = useState('');
  const [priority, setPriority] = useState<QuestionPriority>(QuestionPriority.High);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(QuestionDifficulty.Moderate);
  const [mastery, setMastery] = useState<MasteryStatus>(MasteryStatus.Unreviewed);

  useEffect(() => {
    if (!open) return;
    if (editingQuestion) {
      setSubjectId(editingQuestion.subjectId);
      setNoteId(editingQuestion.noteId ?? '');
      setQuestion(editingQuestion.question);
      setAnswer(editingQuestion.answer);
      setReference(editingQuestion.reference);
      setPriority(editingQuestion.priority);
      setDifficulty(editingQuestion.difficulty);
      setMastery(editingQuestion.mastery);
    } else {
      setSubjectId(prefill?.subjectId ?? subjects[0]?.id ?? '');
      setNoteId(prefill?.noteId ?? '');
      setQuestion(prefill?.question ?? '');
      setAnswer(prefill?.answer ?? '');
      setReference('');
      setPriority(QuestionPriority.High);
      setDifficulty(QuestionDifficulty.Moderate);
      setMastery(MasteryStatus.Unreviewed);
    }
  }, [open, editingQuestion, prefill, subjects]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const subjectNotes = notes.filter((n) => !subjectId || n.subjectId === subjectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    onSave({
      subjectId,
      noteId: noteId || null,
      question: question.trim(),
      answer: answer.trim(),
      reference: reference.trim(),
      priority,
      difficulty,
      mastery,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 font-display">
            {editingQuestion ? 'Edit Important Question' : 'Save Important Question'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setNoteId('');
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Unassigned Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `${s.code} — ${s.name}` : s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Linked Note (Optional)
              </label>
              <select
                value={noteId}
                onChange={(e) => setNoteId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">None</option>
                {subjectNotes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title || 'Untitled Note'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Question / Prompt
            </label>
            <textarea
              required
              autoFocus
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Write the exam question, derivation prompt, or recall cue..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Model Answer & Key Points
            </label>
            <textarea
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write the structured answer, formula steps, or marking scheme points..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Exam Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as QuestionPriority)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value={QuestionPriority.High}>High / Exam Must</option>
                <option value={QuestionPriority.Medium}>Medium</option>
                <option value={QuestionPriority.Standard}>Standard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value={QuestionDifficulty.Easy}>Easy</option>
                <option value={QuestionDifficulty.Moderate}>Moderate</option>
                <option value={QuestionDifficulty.Hard}>Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Mastery State
              </label>
              <select
                value={mastery}
                onChange={(e) => setMastery(e.target.value as MasteryStatus)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value={MasteryStatus.Unreviewed}>Unreviewed</option>
                <option value={MasteryStatus.Practice}>Needs Practice</option>
                <option value={MasteryStatus.Mastered}>Mastered</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Paper / Chapter Reference (Optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Past Paper 2024 Q3 · Ch. 5"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-700 hover:bg-blue-800 text-white transition-colors whitespace-nowrap"
            >
              {editingQuestion ? 'Save Question' : 'Add to Question Bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
