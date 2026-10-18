import { useState } from 'react';
import { toast } from '@/utils/toast';
import type { OrderReviewHook } from '@/hooks/useOrderReview';
import { StarRating } from './StarRating';

interface OrderReviewCardProps {
  review: OrderReviewHook;
}

/** What each star count is called under the stars. */
const RATING_WORDS: Record<number, string> = {
  1: 'Very bad',
  2: 'Not good',
  3: 'It was okay',
  4: 'Good',
  5: 'Loved it!',
};
/** The question over the reasons changes with the stars: praise, or what went wrong. */
const REASON_PROMPTS: Record<'high' | 'middle' | 'low', string> = {
  high: 'What did you like?',
  middle: 'What could be better?',
  low: 'What went wrong?',
};
const COMMENT_MAX = 300;

const promptFor = (rating: number) =>
  REASON_PROMPTS[rating >= 4 ? 'high' : rating === 3 ? 'middle' : 'low'];

const chipCls = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
    on
      ? 'bg-cafe-button text-cafe-on-accent border-transparent'
      : 'bg-cafe-neutral-50 text-cafe-neutral-700 border-cafe-line'
  }`;

/**
 * "How was your order?" on the tracker once the order has been served: stars, a few quick reasons
 * that fit the stars, and an optional line. Afterwards it shows what was left. Renders nothing while
 * the order cannot be reviewed.
 */
export const OrderReviewCard = ({ review }: OrderReviewCardProps) => {
  const { state, submitting, submit } = review;
  const [rating, setRating] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  if (!state || (!state.eligible && !state.review)) return null;

  const labelOf = (id: string) => state.tags.find((t) => t.id === id)?.label ?? id;

  if (state.review) {
    const done = state.review;
    return (
      <section
        aria-label="Your review"
        className="bg-cafe-surface p-6 rounded-cafe-card border border-cafe-line shadow-cafe-card text-center space-y-3"
      >
        <h3 className="font-black font-cafe-display text-cafe-ink text-sm">
          Thanks for your feedback!
        </h3>
        <StarRating value={done.rating} size="sm" />
        {done.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {done.tags.map((id) => (
              <span key={id} className={chipCls(false)}>
                {labelOf(id)}
              </span>
            ))}
          </div>
        )}
        {done.comment && <p className="text-xs italic text-cafe-muted">“{done.comment}”</p>}
      </section>
    );
  }

  const reasons = state.tags.filter((t) => t.ratings.includes(rating));

  const chooseRating = (stars: number) => {
    setRating(stars);
    // A reason that does not fit the new stars is dropped (praise under 1 star, say).
    setPicked((prev) =>
      prev.filter((id) => state.tags.find((t) => t.id === id)?.ratings.includes(stars)),
    );
  };
  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async () => {
    try {
      await submit(rating, picked, comment.trim());
    } catch (err: any) {
      toast.error(err.message || 'Could not send your feedback.');
    }
  };

  return (
    <section
      aria-label="Rate your order"
      className="bg-cafe-surface p-6 rounded-cafe-card border border-cafe-line shadow-cafe-card space-y-4"
    >
      <div className="text-center space-y-1">
        <h3 className="font-black font-cafe-display text-cafe-ink text-sm">How was your order?</h3>
        <p className="text-[11px] text-cafe-muted font-medium">
          Your feedback helps the café get better.
        </p>
      </div>

      <StarRating value={rating} onChange={chooseRating} />
      <p className="text-center text-xs font-black text-cafe-ink min-h-4">
        {rating ? RATING_WORDS[rating] : ''}
      </p>

      {rating > 0 && (
        <>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-cafe-neutral-400">
              {promptFor(rating)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {reasons.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={picked.includes(tag.id)}
                  onClick={() => toggle(tag.id)}
                  className={chipCls(picked.includes(tag.id))}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="review-comment" className="sr-only">
              Anything else? (optional)
            </label>
            <textarea
              id="review-comment"
              rows={2}
              maxLength={COMMENT_MAX}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything else? (optional)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-cafe-neutral-50 border border-cafe-line text-base sm:text-xs text-cafe-ink font-medium outline-none resize-none focus:border-cafe-accent-500 focus:bg-cafe-surface focus:ring-2 focus:ring-cafe-accent-100"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-cafe-button text-cafe-on-accent text-sm font-black disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send feedback'}
          </button>
        </>
      )}
    </section>
  );
};
