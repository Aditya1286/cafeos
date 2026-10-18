import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  /** Leave out for a read-only row of stars. */
  onChange?: (stars: number) => void;
  size?: 'sm' | 'lg';
}

const STARS = [1, 2, 3, 4, 5];

/** Five stars: tap one to rate (a filled star means "this many or fewer"), or just show a rating. */
export const StarRating = ({ value, onChange, size = 'lg' }: StarRatingProps) => (
  <div
    role={onChange ? 'radiogroup' : 'img'}
    aria-label={onChange ? 'Rating' : `${value} out of 5 stars`}
    className="flex items-center justify-center gap-1.5"
  >
    {STARS.map((n) => {
      const filled = n <= value;
      const icon = (
        <Star
          className={`${size === 'lg' ? 'w-9 h-9' : 'w-4 h-4'} transition-colors ${
            filled ? 'fill-amber-400 text-amber-400' : 'text-cafe-neutral-300'
          }`}
        />
      );
      return onChange ? (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(n)}
          className="p-0.5 active:scale-90 transition-transform"
        >
          {icon}
        </button>
      ) : (
        <span key={n}>{icon}</span>
      );
    })}
  </div>
);
