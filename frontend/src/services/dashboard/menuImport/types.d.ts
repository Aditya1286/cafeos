import { ApiResponse } from '../../apiTypes';

export interface MenuImportOption {
  name: string;
  pricePaise: number;
}

export interface MenuImportDraftItem {
  name: string;
  description: string;
  pricePaise: number | null; // null = the AI couldn't read a price; the owner must fill it in
  isVeg: boolean;
  variants: MenuImportOption[];
  addons: MenuImportOption[];
  confidence: number;
  warnings: string[];
}

export interface MenuImportDraftCategory {
  name: string;
  items: MenuImportDraftItem[];
}

export interface MenuImportDraft {
  aiLogId: string;
  status: 'success' | 'partial';
  categories: MenuImportDraftCategory[];
  notes: string[];
}

export interface MenuImportCommitItem {
  name: string;
  description: string;
  pricePaise: number;
  isVeg: boolean;
  variants: MenuImportOption[];
  addons: MenuImportOption[];
}

export interface MenuImportCommitCategory {
  name: string;
  items: MenuImportCommitItem[];
}

export interface MenuImportResult {
  categoriesCreated: number;
  categoriesReused: number;
  itemsCreated: number;
  itemsSkipped: string[];
}

export type ExtractMenuResponse = ApiResponse<MenuImportDraft>;
export type CommitMenuResponse = ApiResponse<MenuImportResult>;
