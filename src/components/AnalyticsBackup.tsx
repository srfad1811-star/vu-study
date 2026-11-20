import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ConceptHighlight,
  ImportantQuestion,
  MasteryStatus,
  Note,
  StudySession,
  Subject,
  WorkspaceBackup,
} from '../types/study';
import { validateBackupPayload } from '../lib/storage';

interface AnalyticsBackupProps {
  subjects: Subject[];
  notes: Note[];
  highlights: ConceptHighlight[];
  questions: ImportantQuestion[];
  sessions: StudySession[];
  onImportBackup: (backup: WorkspaceBackup) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const AnalyticsBackup: React.FC<AnalyticsBackupProps> = ({
  subjects,
  notes,
  highlights,
  questions,
  sessions,
  onImportBackup,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const totalMinutes = useMemo(
    () => sessions.reduce((acc, s) => acc + s.durationMinutes, 0),
    [sessions]
  );

  const masteredCount = useMemo(
    () => questions.filter((q) => q.mastery === MasteryStatus.Mastered).length,
    [questions]
  );

  const masteryRate = questions.length > 0 ? Math.round((masteredCount / questions.length) * 100) : 0;

  const subjectRows = useMemo(() => {
    return subjects.map((sub) => {
      const subNotes = notes.filter((n) => n.subjectId === sub.id).length;
      const subHighlights = highlights.filter((h) => h.subjectId === sub.id).length;
      const subQuestions = questions.filter((q) => q.subjectId === sub.id);
      const subMastered = subQuestions.filter((q) => q.mastery === MasteryStatus.Mastered).length;
      const subMinutes = sessions
        .filter((s) => s.subjectId === sub.id)
        .reduce((acc, s) => acc + s.durationMinutes, 0);

      return {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        notes: subNotes,
        highlights: subHighlights,
        questions: subQuestions.length,
        masteryPct: subQuestions.length > 0 ? Math.round((subMastered / subQuestions.length) * 100) : 0,
        minutes: subMinutes,
      };
    });
  }, [subjects, notes, highlights, questions, sessions]);

  const handleExportJson = () => {
    const payload: WorkspaceBackup = {
      version: 1,
      exportedAt: Date.now(),
      subjects,
      notes,
      highlights,
      questions,
      sessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codex-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg({ type: 'ok', text: 'Workspace backup exported as JSON.' });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = validateBackupPayload(parsed);
      if (!validated) {
        setStatusMsg({ type: 'err', text: 'Invalid backup JSON format.' });
        return;
      }
      await onImportBackup(validated);
      setStatusMsg({
        type: 'ok',
        text: `Imported ${validated.subjects.length} subjects, ${validated.notes.length} notes, and ${validated.questions.length} questions.`,
      });
    } catch {
      setStatusMsg({ type: 'err', text: 'Failed to read or parse the selected JSON file.' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pastel-canvas p-6 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 font-display">
            Study Analytics & Backup
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live metrics calculated strictly from your saved notes, highlights, questions, and completed timer sessions.
          </p>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Saved Notes</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {notes.length}
            </div>
            <div className="mt-1 text-xs text-slate-400">Across {subjects.length} subjects</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Highlighted Concepts
            </div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {highlights.length}
            </div>
            <div className="mt-1 text-xs text-slate-400">Indexed in Concept Vault</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Question Mastery
            </div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {masteryRate}%
            </div>
            <div className="mt-1 text-xs text-slate-400 tabular-nums">
              {masteredCount} of {questions.length} mastered
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Logged Study Time
            </div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {totalMinutes} min
            </div>
            <div className="mt-1 text-xs text-slate-400 tabular-nums">
              {sessions.length} completed sessions
            </div>
          </div>
        </div>

        {/* Subject Breakdown Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Subject Breakdown
            </h2>
          </div>

          {subjectRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No subjects created yet. Add subjects in the sidebar to see per-subject progress.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3 text-right">Notes</th>
                    <th className="px-5 py-3 text-right">Concepts</th>
                    <th className="px-5 py-3 text-right">Questions</th>
                    <th className="px-5 py-3 text-right">Mastery</th>
                    <th className="px-5 py-3 text-right">Study Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjectRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {row.name}
                        {row.code && (
                          <span className="ml-2 text-xs font-mono text-slate-400">{row.code}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {row.notes}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {row.highlights}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {row.questions}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {row.masteryPct}%
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {row.minutes} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Backup & Data Portability */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Data Backup & Portability
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              All notes, highlights, questions, and study logs are persisted locally in your browser&apos;s IndexedDB. Export a JSON snapshot anytime for safekeeping or moving devices.
            </p>
          </div>

          {statusMsg && (
            <div
              className={`rounded-lg px-3.5 py-2.5 text-xs border ${
                statusMsg.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Full Backup (.json)
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Restore from Backup (.json)
            </button>

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                Reset Workspace
              </button>
            ) : (
              <div className="flex items-center gap-2 ml-auto">
                <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Delete all local data?
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onClearAll();
                    setConfirmClear(false);
                    setStatusMsg({ type: 'ok', text: 'All workspace data has been cleared.' });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium"
                >
                  Confirm Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
