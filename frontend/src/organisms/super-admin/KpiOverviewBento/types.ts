import React from 'react';

export interface KpiTile {
  key: string;
  value: React.ReactNode;
  /** Short caption — the mobile tile's only text. */
  label: string;
  /** Full sentence — the desktop bento's description. */
  description: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}
