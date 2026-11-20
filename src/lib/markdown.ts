import { HighlightCategory } from '../types/study';

export interface ParsedHighlightToken {
  id: string;
  category: HighlightCategory;
  text: string;
}

const HIGHLIGHT_REGEX = /==\[(definition|formula|critical|example)\|([a-zA-Z0-9_-]+)\]([\s\S]*?)==/g;

export function extractInlineHighlights(markdown: string): ParsedHighlightToken[] {
  const results: ParsedHighlightToken[] = [];
  const regex = new RegExp(HIGHLIGHT_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    results.push({
      category: match[1] as HighlightCategory,
      id: match[2],
      text: match[3],
    });
  }
  return results;
}

export function stripHighlightSyntax(markdown: string): string {
  return markdown.replace(HIGHLIGHT_REGEX, '$3');
}

export function removeInlineHighlight(markdown: string, highlightId: string): string {
  const regex = new RegExp(
    `==\\[(?:definition|formula|critical|example)\\|${escapeRegExp(highlightId)}\\]([\\s\\S]*?)==`,
    'g'
  );
  return markdown.replace(regex, '$1');
}

export function updateInlineHighlightCategory(
  markdown: string,
  highlightId: string,
  newCategory: HighlightCategory
): string {
  const regex = new RegExp(
    `==\\[(?:definition|formula|critical|example)\\|(${escapeRegExp(highlightId)})\\]([\\s\\S]*?)==`,
    'g'
  );
  return markdown.replace(regex, `==[${newCategory}|$1]$2==`);
}

export function wrapSelectionInMarkdown(
  markdown: string,
  selectedText: string,
  contextBefore: string,
  category: HighlightCategory,
  highlightId: string
): { updated: string; applied: boolean; reason?: string } {
  const clean = selectedText.trim();
  if (!clean) {
    return { updated: markdown, applied: false, reason: 'Select text inside the note to highlight.' };
  }
  if (clean.includes('\n\n')) {
    return {
      updated: markdown,
      applied: false,
      reason: 'Please highlight within a single paragraph or line.',
    };
  }
  if (clean.includes('==[') || clean.includes('==')) {
    return {
      updated: markdown,
      applied: false,
      reason: 'Selection overlaps an existing highlight marker.',
    };
  }

  // Locate candidate occurrences outside existing ==[...]== tokens
  const matches: number[] = [];
  let searchFrom = 0;
  while (searchFrom <= markdown.length) {
    const idx = markdown.indexOf(clean, searchFrom);
    if (idx === -1) break;
    if (!isInsideHighlight(markdown, idx, idx + clean.length)) {
      matches.push(idx);
    }
    searchFrom = idx + 1;
  }

  if (matches.length === 0) {
    return {
      updated: markdown,
      applied: false,
      reason: 'Could not match selection across inline formatting markers. Try selecting plain phrase or highlight in Write mode.',
    };
  }

  let targetIdx = matches[0];
  if (matches.length > 1 && contextBefore) {
    const cleanContext = contextBefore.trim().slice(-24);
    let bestScore = -1;
    for (const candidate of matches) {
      const beforeSlice = stripHighlightSyntax(markdown.slice(Math.max(0, candidate - 60), candidate));
      let score = 0;
      for (let len = Math.min(cleanContext.length, 24); len >= 4; len--) {
        if (beforeSlice.endsWith(cleanContext.slice(-len))) {
          score = len;
          break;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        targetIdx = candidate;
      }
    }
  }

  const wrapped = `==[${category}|${highlightId}]${clean}==`;
  const updated = markdown.slice(0, targetIdx) + wrapped + markdown.slice(targetIdx + clean.length);
  return { updated, applied: true };
}

function isInsideHighlight(markdown: string, start: number, end: number): boolean {
  const regex = new RegExp(HIGHLIGHT_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const mStart = match.index;
    const mEnd = mStart + match[0].length;
    if (start < mEnd && end > mStart) {
      return true;
    }
  }
  return false;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function computeNoteStats(content: string): {
  words: number;
  chars: number;
  readMinutes: number;
  highlightCount: number;
} {
  const plain = stripHighlightSyntax(content).trim();
  const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  const chars = plain.length;
  const readMinutes = Math.max(1, Math.ceil(words / 200));
  const highlightCount = extractInlineHighlights(content).length;
  return { words, chars, readMinutes, highlightCount };
}

export function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function exportNoteAsMarkdown(title: string, subjectName: string, chapter: string, content: string): string {
  const header = [
    `# ${title || 'Untitled Note'}`,
    subjectName ? `Subject: ${subjectName}${chapter ? ` · ${chapter}` : ''}` : '',
    '',
    '---',
    '',
  ]
    .filter(Boolean)
    .join('\n');

  const cleanBody = content.replace(HIGHLIGHT_REGEX, (_full, cat, _id, text) => {
    const tag = cat === 'definition' ? 'DEF' : cat === 'formula' ? 'FORMULA' : cat === 'critical' ? 'EXAM' : 'EXAMPLE';
    return `**==[${tag}] ${text}==**`;
  });

  return `${header}${cleanBody}\n`;
}
