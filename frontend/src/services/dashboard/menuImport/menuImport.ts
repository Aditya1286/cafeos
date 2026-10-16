import { apiRequest } from '../../api';
import { CommitMenuResponse, ExtractMenuResponse, MenuImportCommitCategory } from './types';

// "Upload Menu" — step 1: photos (data URLs, page order) → AI-read draft. Nothing is saved.
export const extractFromPhotos = (images: string[]): Promise<ExtractMenuResponse> =>
  apiRequest('/menu/import/extract', 'POST', { images });

// Step 2: the owner-reviewed draft → categories + items on the real menu.
export const commit = (categories: MenuImportCommitCategory[]): Promise<CommitMenuResponse> =>
  apiRequest('/menu/import/commit', 'POST', { categories });
