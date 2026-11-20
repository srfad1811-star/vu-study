import React from 'react';
import {
  BarChart3,
  BookOpen,
  FileText,
  FolderPlus,
  HelpCircle,
  Highlighter,
  Layers,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { SUBJECT_COLORS, Subject, WorkspaceView } from '../types/study';

interface SidebarProps {
  openMobile: boolean;
  onCloseMobile: () => void;
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  subjects: Subject[];
  selectedSubjectId: string | 'all';
  onSelectSubject: (id: string | 'all') => void;
  onAddSubject: () => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
  counts: {
    notes: number;
    highlights: number;
    questions: number;
    notesBySubject: Record<string, number>;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  openMobile,
  onCloseMobile,
  activeView,
  onSelectView,
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  counts,
}) => {
  const navItems: {
    id: WorkspaceView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'notes', label: 'Notes Studio', icon: FileText, count: counts.notes },
    { id: 'concepts', label: 'Concept Vault', icon: Highlighter, count: counts.highlights },
    { id: 'questions', label: 'Question Bank', icon: HelpCircle, count: counts.questions },
    { id: 'study', label: 'Active Study', icon: BookOpen },
    { id: 'analytics', label: 'Analytics & Backup', icon: BarChart3 },
  ];

  const getColorDot = (colorId: string) =>
    SUBJECT_COLORS.find((c) => c.id === colorId)?.dotClass ?? 'bg-blue-600';

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-[264px] select-none">
      {/* Brand header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 font-display whitespace-nowrap">
            Codex
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Navigation */}
      <div className="px-3 py-4 space-y-1">
        <div className="px-2.5 pb-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.count === 'number' && (
                <span
                  className={`text-xs font-mono tabular-nums ${
                    active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mx-4 border-t border-slate-200 dark:border-slate-800" />

      {/* Subjects Tree */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex items-center justify-between px-2.5 pb-2">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Subjects
          </span>
          <button
            type="button"
            onClick={onAddSubject}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onSelectSubject('all');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedSubjectId === 'all'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="truncate">All Subjects</span>
            <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500">
              {counts.notes}
            </span>
          </button>

          {subjects.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              No subjects yet. Create your first subject to organize notes, highlights, and exam questions.
            </div>
          ) : (
            subjects.map((sub) => {
              const isSelected = selectedSubjectId === sub.id;
              const noteCount = counts.notesBySubject[sub.id] ?? 0;
              return (
                <div
                  key={sub.id}
                  className={`group flex items-center justify-between gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSubject(sub.id);
                      onCloseMobile();
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${getColorDot(sub.color)}`} />
                    <span className="truncate">{sub.name}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500 group-hover:hidden">
                      {noteCount}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onEditSubject(sub)}
                        aria-label={`Edit ${sub.name}`}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSubject(sub.id)}
                        aria-label={`Delete ${sub.name}`}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Keyboard Hint Footer */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>Local Vault Storage</span>
        <span className="font-mono">⌘K Search</span>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">{content}</aside>

      {openMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full">{content}</aside>
        </div>
      )}
    </>
  );
};
