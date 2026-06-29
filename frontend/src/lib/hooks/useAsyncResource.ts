"use client";

import { useCallback, useEffect, useState } from "react";

type LoadResult<T> = { ok: true; data: T } | { ok: false; message: string; notFound?: boolean };

export function useAsyncResource<T>(load: () => Promise<LoadResult<T>>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      setNotFound(false);
      const result = await load();
      if (!silent) setLoading(false);
      if (!result.ok) {
        if (result.notFound) setNotFound(true);
        else setError(result.message);
        return null;
      }
      setData(result.data);
      return result.data;
    },
    [load],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void reload();
    });
  }, [reload]);

  return { data, loading, error, notFound, reload, setData };
}

export type AsyncLoadResult<T> = LoadResult<T>;
