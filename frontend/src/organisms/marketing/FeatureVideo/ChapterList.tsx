import React from 'react';
import type { VideoChapter } from '@/constants/featureVideo';

interface ChapterListProps {
  chapters: VideoChapter[];
  active: number;
  /** How far through the active chapter the video is, 0 to 1. */
  progress: number;
  onSelect: (index: number) => void;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** The video's chapters. The playing one opens to show its description and tags, with a bar
 * that fills as the chapter plays; clicking any row jumps the video there. */
export const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  active,
  progress,
  onSelect,
}) => (
  <ol aria-label="Video chapters" className="space-y-1.5">
    {chapters.map((chapter, index) => {
      const current = index === active;
      return (
        <li key={chapter.start}>
          <button
            type="button"
            data-chapter
            aria-current={current ? 'step' : undefined}
            onClick={() => onSelect(index)}
            className={`relative w-full overflow-hidden text-left rounded-2xl border px-4 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${
              current
                ? 'bg-white border-red-200 shadow-md shadow-red-600/5'
                : 'bg-transparent border-transparent hover:bg-white/70'
            }`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                  current
                    ? 'bg-red-600 text-white ring-4 ring-red-100'
                    : 'border border-slate-300 text-slate-500'
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`flex-1 min-w-0 text-sm sm:text-[15px] font-bold leading-snug ${
                  current ? 'text-slate-900' : 'text-slate-600'
                }`}
              >
                {chapter.title}
              </span>
              <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">
                {clock(chapter.start)}
              </span>
            </span>

            <span
              className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
                current ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <span className="min-h-0 overflow-hidden pl-10">
                <span className="block pt-1.5 text-sm text-slate-600 font-medium leading-relaxed">
                  {chapter.body}
                </span>
                {chapter.tags && (
                  <span className="flex flex-wrap gap-1.5 pt-2.5 pb-1">
                    {chapter.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </span>

            {current && (
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-slate-100">
                <span
                  className="block h-full bg-red-600"
                  style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
                />
              </span>
            )}
          </button>
        </li>
      );
    })}
  </ol>
);
