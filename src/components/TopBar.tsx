import React from 'react';
import {
  Clock,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
} from 'lucide-react';
import { Subject, WorkspaceView } from '../types/study';

interface TopBarProps {
  activeView: WorkspaceView;
  selectedSubject: Subject | null;
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  timerRunning: boolean;
  timerRemainingSeconds: number;
  onOpenTimer: () => void;
}

const VIEW_LABELS: Record<WorkspaceView, string> = {
  notes: 'Notes Studio',
  concepts: 'Concept Vault',
  questions: 'Question Bank',
  study: 'Active Study',
  analytics: 'Analytics & Backup',
};

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  selectedSubject,
  darkMode,
  onToggleTheme,
  onOpenMobileMenu,
  onOpenSearch,
  onPrimaryAction,
  primaryActionLabel,
  timerRunning,
  timerRemainingSeconds,
  onOpenTimer,
}) => {
  return (
    <header className="h-14 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 no-print">
      {/* Left: Mobile toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
          <span className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
            {VIEW_LABELS[activeView]}
          </span>
          {selectedSubject && (
            <>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                /
              </span>
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-[260px]">
                {selectedSubject.code ? `${selectedSubject.code} · ${selectedSubject.name}` : selectedSubject.name}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Search, Timer, Theme, Primary CTA */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-colors whitespace-nowrap shrink-0"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <span className="hidden md:inline font-mono text-[11px] text-slate-400">⌘K</span>
        </button>

        <button
          type="button"
          onClick={onOpenTimer}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            timerRunning
              ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums">
            {timerRunning ? formatClock(timerRemainingSeconds) : 'Focus Timer'}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onPrimaryAction}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{primaryActionLabel}</span>
        </button>
      </div>
    </header>
  );
};
