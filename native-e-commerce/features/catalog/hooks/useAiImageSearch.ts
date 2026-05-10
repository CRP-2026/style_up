import { useCallback, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { searchProductsByImage } from '~/lib/api/catalog';
import type { ImageSearchResult } from '~/lib/types/products';

const CAMERA_PERMISSION_ERROR = 'Bạn cần cấp quyền camera để chụp ảnh.';
const LIBRARY_PERMISSION_ERROR = 'Bạn cần cấp quyền thư viện ảnh.';
const AI_SEARCH_ERROR = 'Không thể tìm kiếm bằng ảnh. Vui lòng thử lại.';

export function useAiImageSearch() {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<ImageSearchResult[]>([]);
  const [aiHasSearched, setAiHasSearched] = useState(false);

  const clearResults = useCallback(() => {
    setAiResults([]);
    setAiError(null);
    setAiHasSearched(false);
  }, []);

  const openSheet = useCallback(() => {
    setAiError(null);
    setAiHasSearched(false);
    setAiResults([]);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const runAiImageSearch = useCallback(async (pickerResult: ImagePicker.ImagePickerResult) => {
    if (pickerResult.canceled || !pickerResult.assets?.length) return;

    setAiLoading(true);
    setAiError(null);
    setAiHasSearched(true);
    try {
      const selected = pickerResult.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        selected.uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (!manipulated.base64) {
        throw new Error('Image base64 missing after compression');
      }
      const items = await searchProductsByImage(manipulated.base64, 10);
      setAiResults(items);
    } catch (error) {
      console.warn('[useAiImageSearch] failed', error);
      setAiResults([]);
      setAiError(AI_SEARCH_ERROR);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    closeSheet();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setAiError(CAMERA_PERMISSION_ERROR);
      setAiHasSearched(true);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ['images'],
    });
    await runAiImageSearch(result);
  }, [closeSheet, runAiImageSearch]);

  const pickFromLibrary = useCallback(async () => {
    closeSheet();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAiError(LIBRARY_PERMISSION_ERROR);
      setAiHasSearched(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ['images'],
    });
    await runAiImageSearch(result);
  }, [closeSheet, runAiImageSearch]);

  return {
    aiError,
    aiHasSearched,
    aiLoading,
    aiResults,
    clearResults,
    closeSheet,
    openSheet,
    pickFromCamera,
    pickFromLibrary,
    sheetVisible,
  };
}
