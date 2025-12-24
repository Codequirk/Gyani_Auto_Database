import { useState, useEffect, useRef } from 'react';

export const useFetch = (fetchFn, deps = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);

  const refetch = async () => {
    try {
      // Only show loading on initial load, not on updates
      if (initialLoadRef.current) {
        setLoading(true);
      }
      const result = await fetchFn();
      setData(result.data);
      setError(null);
      initialLoadRef.current = false;
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
      setData(null);
      initialLoadRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, deps);

  return { data, error, loading, refetch };
};

export const usePolling = (fetchFn, interval = 10000) => {
  const { data, error, loading, refetch } = useFetch(fetchFn);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      refetch();
    }, interval);

    return () => clearInterval(pollInterval);
  }, [refetch, interval]);

  return { data, error, loading, refetch };
};
