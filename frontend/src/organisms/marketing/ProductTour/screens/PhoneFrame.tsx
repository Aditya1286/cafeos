import React from 'react';

export const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-[250px] h-[456px] rounded-[34px] bg-slate-900 p-2 shadow-2xl shadow-slate-900/30">
    <div className="relative w-full h-full rounded-[28px] bg-white overflow-hidden">
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-slate-900 z-10" />
      {children}
    </div>
  </div>
);
