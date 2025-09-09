import { useState, useEffect, useCallback, useRef } from 'react';
import { ItemDTO, createApiClient } from '../api';

interface UseInfiniteItemsResult {
  items: ItemDTO[];
  isLoading: boolean;
  isEnd: boolean;
  error: string | null;
  fetchNext: () => void;
  reset: () => void;
  updateItems: (newItems: ItemDTO[]) => void;
}

export function useInfiniteItems(
  clientId: string,
  query: string = ''
): UseInfiniteItemsResult {
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnd, setIsEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);

  const apiClient = createApiClient(clientId);

  const fetchNext = useCallback(async () => {
    if (isLoading || isEnd) return;

    setIsLoading(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await apiClient.getItems(
        {
          q: query || undefined,
          offset,
          limit: 20,
        } as { q?: string; offset?: number; limit?: number },
        abortControllerRef.current.signal
      );

      setItems(prev => {
        // Merge without duplicates
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = response.items.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });

      setOffset(prev => prev + response.items.length);

      if (response.items.length < 20) {
        setIsEnd(true);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, query, offset, isLoading, isEnd]);

  const reset = useCallback(() => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setItems([]);
    setOffset(0);
    setIsEnd(false);
    setError(null);
    setIsLoading(false);
  }, []);

  const updateItems = useCallback((newItems: ItemDTO[]) => {
    console.log('🔄 useInfiniteItems: updateItems called');
    console.log('🔄 Current query:', query);
    console.log('🔄 Is in search mode:', query.length > 0);
    console.log('🔄 Old items count:', items.length);
    console.log('🔄 New items count:', newItems.length);
    console.log('🔄 Old items IDs:', items.map(item => item.id));
    console.log('🔄 New items IDs:', newItems.map(item => item.id));
    setItems(newItems);
  }, [items, query]);

  // Reset when query changes (with debounce)
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Reset state for new search
      setItems([]);
      setOffset(0);
      setIsEnd(false);
      setError(null);
      setIsLoading(false);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query]);

  // Initial load
  useEffect(() => {
    if (clientId && !isLoading && items.length === 0 && !isEnd) {
      fetchNext();
    }
  }, [clientId, fetchNext, isLoading, items.length, isEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    items,
    isLoading,
    isEnd,
    error,
    fetchNext,
    reset,
    updateItems,
  };
}
