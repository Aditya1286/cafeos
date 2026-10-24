import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { FEATURE_VIDEO, FEATURE_VIDEO_CHAPTERS } from '@/constants/featureVideo';
import { ChapterList } from './ChapterList';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The landing page's features section: the product video with its chapters beside it. It plays
 * muted (the captions are in the picture) while it is on screen, and pauses when scrolled away;
 * "Play with sound" restarts it from the top with the narration. */
export const FeatureVideo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Set when the viewer pauses: scrolling back into view must not override that.
  const userPaused = useRef(prefersReducedMotion());
  const soundStarted = useRef(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);

  const play = useCallback(() => {
    userPaused.current = false;
    setEnded(false);
    videoRef.current?.play().catch(() => setPlaying(false));
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let raf = 0;
    const tick = () => {
      setTime(video.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
      setTime(video.currentTime);
    };
    const onSeeked = () => setTime(video.currentTime);
    const onEnded = () => setEnded(true);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('ended', onEnded);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('ended', onEnded);
    };
  }, []);

  // Play while at least half the video is on screen, pause once it scrolls away.
  useEffect(() => {
    const card = cardRef.current;
    const video = videoRef.current;
    if (!card || !video || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) video.pause();
        else if (!userPaused.current && video.paused && !video.ended) {
          video.play().catch(() => setPlaying(false));
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) play();
    else {
      userPaused.current = true;
      video.pause();
    }
  };

  const playWithSound = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!soundStarted.current) {
      soundStarted.current = true;
      video.currentTime = 0;
    }
    video.muted = false;
    setMuted(false);
    play();
  };

  const mute = () => {
    if (videoRef.current) videoRef.current.muted = true;
    setMuted(true);
  };

  const jumpTo = (index: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = FEATURE_VIDEO_CHAPTERS[index].start;
    setTime(FEATURE_VIDEO_CHAPTERS[index].start);
    play();
  };

  const chapters = FEATURE_VIDEO_CHAPTERS;
  const active = chapters.reduce((found, c, i) => (c.start <= time + 0.05 ? i : found), 0);
  const chapterEnd = chapters[active + 1]?.start ?? FEATURE_VIDEO.duration;
  const progress = (time - chapters[active].start) / (chapterEnd - chapters[active].start);
  const roundButton =
    'flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/70 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

  return (
    <section id="features" className="scroll-mt-20 py-14 sm:py-24 px-4 lg:px-8 bg-page">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-3">
            What Caos fixes, in 45 seconds
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            One table, one customer. The old way first, then with Caos. Tap a chapter to jump to it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,8fr)_minmax(0,5fr)] gap-6 lg:gap-10 items-start">
          <div
            ref={cardRef}
            data-mascot-peek="tour"
            className="relative z-10 aspect-video rounded-3xl border border-slate-200 bg-slate-950 shadow-xl shadow-slate-300/40 overflow-hidden"
          >
            <video
              ref={videoRef}
              src={FEATURE_VIDEO.src}
              poster={FEATURE_VIDEO.poster}
              aria-label={FEATURE_VIDEO.label}
              muted
              loop={muted}
              playsInline
              preload="metadata"
              onClick={togglePlay}
              className="absolute inset-0 h-full w-full object-cover cursor-pointer"
            />

            {!playing && (
              <button
                type="button"
                onClick={ended ? () => jumpTo(0) : togglePlay}
                aria-label={ended ? 'Replay the video' : 'Play the video'}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-600/30 hover:bg-red-700 hover:scale-105 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {ended ? (
                  <RotateCcw className="h-7 w-7 sm:h-8 sm:w-8" />
                ) : (
                  <Play className="h-7 w-7 sm:h-8 sm:w-8 fill-white translate-x-0.5" />
                )}
              </button>
            )}

            {/* Top right: the video's captions sit along the bottom. */}
            <div className="absolute top-2.5 right-2.5 sm:top-5 sm:right-5 flex items-center gap-2">
              {muted ? (
                <button
                  type="button"
                  onClick={playWithSound}
                  className="flex h-9 sm:h-11 items-center gap-2 rounded-full bg-red-600 px-3.5 sm:px-4 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-black/20 hover:bg-red-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <VolumeX className="h-4 w-4" /> Play with sound
                </button>
              ) : (
                <button type="button" onClick={mute} aria-label="Mute" className={roundButton}>
                  <Volume2 className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                className={roundButton}
              >
                {playing ? (
                  <Pause className="h-5 w-5 fill-white" />
                ) : (
                  <Play className="h-5 w-5 fill-white" />
                )}
              </button>
            </div>
          </div>

          <ChapterList chapters={chapters} active={active} progress={progress} onSelect={jumpTo} />
        </div>
      </div>
    </section>
  );
};

export default FeatureVideo;
