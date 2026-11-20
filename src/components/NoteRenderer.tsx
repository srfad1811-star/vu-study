import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  HelpCircle,
  Highlighter,
  Trash2,
  X,
} from 'lucide-react';
import {
  ConceptHighlight,
  HIGHLIGHT_META,
  HighlightCategory,
} from '../types/study';

interface NoteRendererProps {
  content: string;
  highlightsById: Record<string, ConceptHighlight>;
  interactive?: boolean;
  onToggleCheckbox?: (lineIndex: number) => void;
  onCreateHighlight?: (
    selectedText: string,
    contextBefore: string,
    category: HighlightCategory
  ) => void;
  onUpdateHighlight?: (
    id: string,
    updates: { category?: HighlightCategory; annotation?: string }
  ) => void;
  onRemoveHighlight?: (id: string) => void;
  onCreateQuestionFromText?: (text: string, annotation?: string) => void;
}

interface FloatingSelectionState {
  text: string;
  contextBefore: string;
  top: number;
  left: number;
}

interface ActiveHighlightPopover {
  id: string;
  top: number;
  left: number;
}

const INLINE_TOKEN_REGEX =
  /(==\[(?:definition|formula|critical|example)\|[a-zA-Z0-9_-]+\][\s\S]*?==|\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;

export const NoteRenderer: React.FC<NoteRendererProps> = ({
  content,
  highlightsById,
  interactive = true,
  onToggleCheckbox,
  onCreateHighlight,
  onUpdateHighlight,
  onRemoveHighlight,
  onCreateQuestionFromText,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionBar, setSelectionBar] = useState<FloatingSelectionState | null>(null);
  const [activePopover, setActivePopover] = useState<ActiveHighlightPopover | null>(null);
  const [annotationDraft, setAnnotationDraft] = useState('');

  useEffect(() => {
    if (activePopover) {
      const existing = highlightsById[activePopover.id];
      setAnnotationDraft(existing?.annotation ?? '');
    }
  }, [activePopover, highlightsById]);

  useEffect(() => {
    const handleDocMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-highlight-popover="true"]') || target.closest('[data-selection-bar="true"]')) {
        return;
      }
      if (!target.closest('[data-highlight-id]')) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleDocMouseDown);
    return () => document.removeEventListener('mousedown', handleDocMouseDown);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!interactive || !onCreateHighlight) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      setSelectionBar(null);
      return;
    }

    const anchorNode = sel.anchorNode;
    const focusNode = sel.focusNode;
    if (
      !anchorNode ||
      !focusNode ||
      !containerRef.current.contains(anchorNode) ||
      !containerRef.current.contains(focusNode)
    ) {
      setSelectionBar(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 2) {
      setSelectionBar(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Compute context before selection within container text
    let contextBefore = '';
    try {
      const preRange = document.createRange();
      preRange.selectNodeContents(containerRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      contextBefore = preRange.toString().slice(-40);
    } catch {
      contextBefore = '';
    }

    setActivePopover(null);
    setSelectionBar({
      text,
      contextBefore,
      top: Math.max(8, rect.top - containerRect.top - 52),
      left: Math.min(
        Math.max(12, rect.left - containerRect.left + rect.width / 2),
        Math.max(180, containerRect.width - 180)
      ),
    });
  }, [interactive, onCreateHighlight]);

  const handleApplyHighlight = (category: HighlightCategory) => {
    if (!selectionBar || !onCreateHighlight) return;
    onCreateHighlight(selectionBar.text, selectionBar.contextBefore, category);
    setSelectionBar(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlightClick = (e: React.MouseEvent<HTMLElement>, id: string) => {
    if (!interactive) return;
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setSelectionBar(null);
    setActivePopover({
      id,
      top: rect.bottom - containerRect.top + 8,
      left: Math.min(
        Math.max(12, rect.left - containerRect.left),
        Math.max(16, containerRect.width - 300)
      ),
    });
  };

  const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = new RegExp(INLINE_TOKEN_REGEX.source, 'g');
    let match: RegExpExecArray | null;
    let tokenIdx = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const token = match[0];
      const key = `${keyPrefix}-${tokenIdx++}`;

      if (token.startsWith('==[')) {
        const parsed = /^==\[(definition|formula|critical|example)\|([a-zA-Z0-9_-]+)\]([\s\S]*?)==$/.exec(token);
        if (parsed) {
          const category = parsed[1] as HighlightCategory;
          const id = parsed[2];
          const inner = parsed[3];
          const meta = HIGHLIGHT_META[category];
          const record = highlightsById[id];

          parts.push(
            <mark
              key={key}
              data-highlight-id={id}
              onClick={(e) => handleHighlightClick(e, id)}
              title={record?.annotation ? `${meta.shortLabel}: ${record.annotation}` : `${meta.label} — click to inspect`}
              className={`inline rounded px-1 py-0.5 border-b-2 transition-colors ${meta.bgClass} ${meta.textClass} ${meta.borderClass} ${
                interactive ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110' : ''
              }`}
            >
              {inner}
            </mark>
          );
        } else {
          parts.push(token);
        }
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={key} className="font-semibold text-slate-900 dark:text-slate-50">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={key} className="italic">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={key}
            className="font-mono text-[0.875em] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  const renderBlocks = () => {
    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code or formula block
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim();
        const codeLines: string[] = [];
        const startIdx = i;
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing fence
        nodes.push(
          <div
            key={`code-${startIdx}`}
            className="my-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 overflow-hidden"
          >
            {lang && (
              <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400">
                {lang}
              </div>
            )}
            <pre className="p-3.5 overflow-x-auto text-sm font-mono leading-relaxed text-slate-800 dark:text-slate-200">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        continue;
      }

      // Horizontal divider
      if (/^---+$/.test(line.trim())) {
        nodes.push(
          <hr
            key={`hr-${i}`}
            className="my-6 border-t border-slate-200 dark:border-slate-800"
          />
        );
        i++;
        continue;
      }

      // Headings
      const h3Match = /^###\s+(.*)$/.exec(line);
      if (h3Match) {
        nodes.push(
          <h3
            key={`h3-${i}`}
            className="mt-6 mb-2 text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {renderInline(h3Match[1], `h3-${i}`)}
          </h3>
        );
        i++;
        continue;
      }

      const h2Match = /^##\s+(.*)$/.exec(line);
      if (h2Match) {
        nodes.push(
          <h2
            key={`h2-${i}`}
            className="mt-7 mb-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 font-display"
          >
            {renderInline(h2Match[1], `h2-${i}`)}
          </h2>
        );
        i++;
        continue;
      }

      const h1Match = /^#\s+(.*)$/.exec(line);
      if (h1Match) {
        nodes.push(
          <h1
            key={`h1-${i}`}
            className="mt-8 mb-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 font-display"
          >
            {renderInline(h1Match[1], `h1-${i}`)}
          </h1>
        );
        i++;
        continue;
      }

      // Blockquote (clean subtle box without thick left bar)
      if (line.startsWith('> ')) {
        const quoteLines: { text: string; idx: number }[] = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push({ text: lines[i].slice(2), idx: i });
          i++;
        }
        nodes.push(
          <blockquote
            key={`quote-${quoteLines[0].idx}`}
            className="my-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-4 py-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300"
          >
            {quoteLines.map((q) => (
              <p key={q.idx} className="my-1 first:mt-0 last:mb-0">
                {renderInline(q.text, `q-${q.idx}`)}
              </p>
            ))}
          </blockquote>
        );
        continue;
      }

      // Checklist items
      const checkMatch = /^-\s+\[([ xX])\]\s+(.*)$/.exec(line);
      if (checkMatch) {
        const items: { checked: boolean; text: string; lineIdx: number }[] = [];
        while (i < lines.length) {
          const m = /^-\s+\[([ xX])\]\s+(.*)$/.exec(lines[i]);
          if (!m) break;
          items.push({ checked: m[1].toLowerCase() === 'x', text: m[2], lineIdx: i });
          i++;
        }
        nodes.push(
          <ul key={`chk-${items[0].lineIdx}`} className="my-3 space-y-2">
            {items.map((item) => (
              <li key={item.lineIdx} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
                <button
                  type="button"
                  disabled={!interactive || !onToggleCheckbox}
                  onClick={() => onToggleCheckbox?.(item.lineIdx)}
                  aria-label={item.checked ? 'Mark unchecked' : 'Mark checked'}
                  className={`mt-1 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    item.checked
                      ? 'bg-blue-700 border-blue-700 text-white dark:bg-blue-600 dark:border-blue-600'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-blue-600'
                  }`}
                >
                  {item.checked && <Check className="w-3 h-3" />}
                </button>
                <span
                  className={
                    item.checked
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-700 dark:text-slate-200'
                  }
                >
                  {renderInline(item.text, `chk-${item.lineIdx}`)}
                </span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Unordered list
      if (/^[-*]\s+/.test(line)) {
        const items: { text: string; idx: number }[] = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i]) && !/^-\s+\[[ xX]\]\s+/.test(lines[i])) {
          items.push({ text: lines[i].replace(/^[-*]\s+/, ''), idx: i });
          i++;
        }
        nodes.push(
          <ul key={`ul-${items[0].idx}`} className="my-3 pl-5 list-disc space-y-1.5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
            {items.map((item) => (
              <li key={item.idx}>{renderInline(item.text, `ul-${item.idx}`)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered list
      if (/^\d+\.\s+/.test(line)) {
        const items: { text: string; idx: number }[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          items.push({ text: lines[i].replace(/^\d+\.\s+/, ''), idx: i });
          i++;
        }
        nodes.push(
          <ol key={`ol-${items[0].idx}`} className="my-3 pl-5 list-decimal space-y-1.5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
            {items.map((item) => (
              <li key={item.idx}>{renderInline(item.text, `ol-${item.idx}`)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // Empty line
      if (!line.trim()) {
        i++;
        continue;
      }

      // Paragraph
      nodes.push(
        <p key={`p-${i}`} className="my-3 text-[15px] leading-[1.7] text-slate-700 dark:text-slate-200">
          {renderInline(line, `p-${i}`)}
        </p>
      );
      i++;
    }

    return nodes;
  };

  const activeHighlight = activePopover ? highlightsById[activePopover.id] : null;

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="relative max-w-[72ch] mx-auto pb-16"
    >
      {content.trim() ? (
        <div>{renderBlocks()}</div>
      ) : (
        <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
          <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-60" />
          Nothing written in this note yet. Switch to Write or Split mode to begin drafting.
        </div>
      )}

      {/* Floating Concept Highlighter Toolbar on Text Selection */}
      {selectionBar && (
        <div
          data-selection-bar="true"
          style={{
            top: selectionBar.top,
            left: selectionBar.left,
            transform: 'translateX(-50%)',
          }}
          className="absolute z-30 flex items-center gap-1 p-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white shadow-lg border border-slate-700"
        >
          <span className="px-2 text-xs text-slate-300 flex items-center gap-1 whitespace-nowrap shrink-0">
            <Highlighter className="w-3.5 h-3.5" />
            Highlight:
          </span>
          {(Object.keys(HIGHLIGHT_META) as HighlightCategory[]).map((cat) => {
            const meta = HIGHLIGHT_META[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleApplyHighlight(cat)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <span className={`w-2 h-2 rounded-full ${meta.swatchClass}`} />
                {meta.shortLabel}
              </button>
            );
          })}
          {onCreateQuestionFromText && (
            <>
              <span className="w-px h-4 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => {
                  onCreateQuestionFromText(selectionBar.text);
                  setSelectionBar(null);
                  window.getSelection()?.removeAllRanges();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-blue-300 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Save Question
              </button>
            </>
          )}
        </div>
      )}

      {/* Highlight Inspector Popover */}
      {activePopover && activeHighlight && (
        <div
          data-highlight-popover="true"
          style={{
            top: activePopover.top,
            left: activePopover.left,
          }}
          className="absolute z-30 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {HIGHLIGHT_META[activeHighlight.category].label}
            </span>
            <button
              type="button"
              onClick={() => setActivePopover(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Close inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 rounded-md p-2.5 border border-slate-200/70 dark:border-slate-700/70 line-clamp-3">
            {activeHighlight.text}
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Category
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(HIGHLIGHT_META) as HighlightCategory[]).map((cat) => {
                const meta = HIGHLIGHT_META[cat];
                const isSelected = activeHighlight.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onUpdateHighlight?.(activeHighlight.id, { category: cat })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${meta.swatchClass}`} />
                    {meta.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Memory Cue / Annotation
            </label>
            <textarea
              rows={2}
              value={annotationDraft}
              onChange={(e) => setAnnotationDraft(e.target.value)}
              placeholder="Add why this matters or a quick recall cue..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              {onRemoveHighlight && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveHighlight(activeHighlight.id);
                    setActivePopover(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
              {onCreateQuestionFromText && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateQuestionFromText(activeHighlight.text, annotationDraft);
                    setActivePopover(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  To Q&A
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onUpdateHighlight?.(activeHighlight.id, { annotation: annotationDraft });
                setActivePopover(null);
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white transition-colors whitespace-nowrap"
            >
              Save Cue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
