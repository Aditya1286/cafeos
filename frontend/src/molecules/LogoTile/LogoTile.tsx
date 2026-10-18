import React, { useEffect, useState } from 'react';

interface LogoTileProps {
  /** The business's own logo, if it has set one. */
  src?: string;
  /** Size and shape of the tile, for example `w-10 h-10 rounded-2xl`. */
  className: string;
  /** What the tile looks like without a logo (its colours and text style). */
  fallbackClassName: string;
  /** The default mark shown without a logo: an icon or an initial. */
  children: React.ReactNode;
}

/**
 * A rounded tile holding the business's logo, or the default mark when it has none, or when its
 * image cannot be loaded (a broken link must not leave an empty tile in the top bar).
 */
export const LogoTile = ({ src, className, fallbackClassName, children }: LogoTileProps) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <div
        className={`${className} bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0`}
      >
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }
  return (
    <div className={`${className} ${fallbackClassName} flex items-center justify-center shrink-0`}>
      {children}
    </div>
  );
};

export default LogoTile;
