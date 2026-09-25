interface VegMarkProps {
  isVeg: boolean;
  size?: 'sm' | 'md';
}

/** Indian food-type mark: green square + dot for veg, red square + triangle for non-veg. */
export const VegMark = ({ isVeg, size = 'md' }: VegMarkProps) => {
  const box = size === 'sm' ? 'w-3 h-3 border' : 'w-4 h-4 border-2';
  const dot = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  return (
    <span
      role="img"
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      className={`${box} rounded-[4px] flex items-center justify-center shrink-0 bg-white ${
        isVeg ? 'border-emerald-600' : 'border-rose-600'
      }`}
    >
      {isVeg ? (
        <span className={`${dot} rounded-full bg-emerald-600`} />
      ) : (
        <span
          className={`${dot} bg-rose-600`}
          style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
        />
      )}
    </span>
  );
};

export default VegMark;
