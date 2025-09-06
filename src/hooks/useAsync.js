import { useCallback, useState } from "react";

/**
 * Wrap any async function and get loading/error state + runner.
 * const { run, loading, error, reset } = useAsync();
 * await run(() => apiCall(args));
 */
export default function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      return res;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      await new Promise((r) => setTimeout(r, 400)); // 400ms
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { loading, error, run, reset, setLoading, setError };
}
