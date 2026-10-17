import React, { useLayoutEffect, useRef } from 'react';
import { applyTheme } from './applyTheme';
import { resolveTheme } from './registry';
import type { PublicIdentity } from './types';

interface CafeThemeScopeProps {
  /** The `identity` block from the public café or order payload. Missing or off → the caos look. */
  identity: PublicIdentity | null | undefined;
  /**
   * True while the payload that carries `identity` is still loading. The content is laid out but
   * not shown, so a themed café never flashes the default look first.
   */
  pending?: boolean;
  children: React.ReactNode;
}

/**
 * The themed area of a guest page (the customer menu and the order tracker). It writes the café's
 * theme as --cafe-* variables on its own div, which the `cafe-*` Tailwind utilities read, before the
 * browser paints. The theme applies only when café identity is on for the café; otherwise, and for
 * an unknown theme or variant, it is the built-in caos look, which is the page as it was before.
 */
export const CafeThemeScope: React.FC<CafeThemeScopeProps> = ({ identity, pending, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const on = !!identity?.enabled;
  const themeId = on ? identity?.theme?.id : undefined;
  const variantId = on ? identity?.theme?.variantId : undefined;

  useLayoutEffect(() => {
    if (ref.current) applyTheme(ref.current, resolveTheme(themeId, variantId));
  }, [themeId, variantId]);

  return (
    <div
      ref={ref}
      data-cafe-theme={resolveTheme(themeId, variantId).theme.id}
      className={`min-h-screen bg-cafe-page${pending ? ' invisible' : ''}`}
    >
      {children}
    </div>
  );
};

export default CafeThemeScope;
