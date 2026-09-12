import React from 'react';

export const MovingBorderButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ children, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-extrabold rounded-2xl group bg-gradient-to-br from-red-500 via-rose-600 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all ${className}`}
    >
      <span className="relative px-4 py-2.5 transition-all ease-in duration-75 bg-white rounded-[14px] flex items-center gap-2 text-slate-900 group-hover:bg-opacity-0 group-hover:text-white">
        {children}
      </span>
    </button>
  );
};

export default MovingBorderButton;
