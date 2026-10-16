import { useCallback, useMemo, useRef, useState } from 'react';
import menuImportService from '../services/dashboard/menuImport';
import type { MenuImportResult } from '../services/dashboard/menuImport/types';
import { compressImage } from '../utils/compressImage';
import {
  EditableMenuCategory,
  EditableMenuItem,
  countItems,
  countProblems,
  toCommitPayload,
  toEditableMenu,
} from '../utils/menuImportDraft';
import { toast } from '../utils/toast';

export const MAX_MENU_PHOTOS = 6;

export type MenuImportStep = 'pick' | 'reading' | 'review' | 'saving';

export interface MenuImportPhoto {
  key: string;
  dataUrl: string;
}

let photoSeq = 0;

/**
 * State for "Upload Menu": pick photos → AI reads them into a draft → owner edits → save.
 * The draft lives only here until save; closing the modal (reset) throws it away.
 */
export const useMenuImport = () => {
  const [step, setStep] = useState<MenuImportStep>('pick');
  const [photos, setPhotos] = useState<MenuImportPhoto[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [categories, setCategories] = useState<EditableMenuCategory[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Bumped on reset, so a read that finishes after the owner closed the modal is ignored.
  const session = useRef(0);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const picked = Array.from(files).filter((f) => f.type.startsWith('image/'));
      const room = MAX_MENU_PHOTOS - photos.length;
      if (picked.length > room) {
        toast.error(`You can add up to ${MAX_MENU_PHOTOS} photos.`);
      }
      const accepted = picked.slice(0, Math.max(0, room));
      if (accepted.length === 0) return;

      setPreparingPhotos(true);
      setError(null);
      try {
        const dataUrls = await Promise.all(accepted.map((file) => compressImage(file)));
        setPhotos((prev) =>
          [...prev, ...dataUrls.map((dataUrl) => ({ key: `ph-${++photoSeq}`, dataUrl }))].slice(
            0,
            MAX_MENU_PHOTOS,
          ),
        );
      } catch (err: any) {
        toast.error(err.message || 'Could not read that photo.');
      } finally {
        setPreparingPhotos(false);
      }
    },
    [photos.length],
  );

  const removePhoto = useCallback((key: string) => {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const readMenu = useCallback(async () => {
    if (photos.length === 0) return;
    const current = session.current;
    setStep('reading');
    setError(null);
    try {
      const res = await menuImportService.extractFromPhotos(photos.map((p) => p.dataUrl));
      if (session.current !== current) return;
      setCategories(toEditableMenu(res.data.categories));
      setNotes(res.data.notes || []);
      setStep('review');
    } catch (err: any) {
      if (session.current !== current) return;
      setError(err.message || 'Could not read the menu. Please try again.');
      setStep('pick');
    }
  }, [photos]);

  const renameCategory = useCallback((categoryKey: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c.key === categoryKey ? { ...c, name } : c)));
  }, []);

  const removeCategory = useCallback((categoryKey: string) => {
    setCategories((prev) => prev.filter((c) => c.key !== categoryKey));
  }, []);

  const updateItem = useCallback(
    (categoryKey: string, itemKey: string, patch: Partial<EditableMenuItem>) => {
      setCategories((prev) =>
        prev.map((c) =>
          c.key !== categoryKey
            ? c
            : {
                ...c,
                items: c.items.map((i) =>
                  // An edited value is the owner's own now — drop the AI's doubts about it.
                  i.key === itemKey ? { ...i, ...patch, warnings: [] } : i,
                ),
              },
        ),
      );
    },
    [],
  );

  const removeItem = useCallback((categoryKey: string, itemKey: string) => {
    setCategories((prev) =>
      prev
        .map((c) =>
          c.key !== categoryKey ? c : { ...c, items: c.items.filter((i) => i.key !== itemKey) },
        )
        .filter((c) => c.items.length > 0),
    );
  }, []);

  /** Back to the photo picker, keeping the photos (e.g. to add a missed page). */
  const startOver = useCallback(() => {
    setCategories([]);
    setNotes([]);
    setError(null);
    setStep('pick');
  }, []);

  const save = useCallback(async (): Promise<MenuImportResult | null> => {
    setStep('saving');
    try {
      const res = await menuImportService.commit(toCommitPayload(categories));
      return res.data;
    } catch (err: any) {
      toast.error(err.message || 'Could not save the menu.');
      setStep('review');
      return null;
    }
  }, [categories]);

  const reset = useCallback(() => {
    session.current += 1;
    setStep('pick');
    setPhotos([]);
    setCategories([]);
    setNotes([]);
    setError(null);
    setPreparingPhotos(false);
  }, []);

  const itemCount = useMemo(() => countItems(categories), [categories]);
  const problems = useMemo(() => countProblems(categories), [categories]);

  return {
    step,
    photos,
    preparingPhotos,
    categories,
    notes,
    error,
    itemCount,
    problems,
    addFiles,
    removePhoto,
    readMenu,
    renameCategory,
    removeCategory,
    updateItem,
    removeItem,
    startOver,
    save,
    reset,
  };
};

export type MenuImportState = ReturnType<typeof useMenuImport>;
