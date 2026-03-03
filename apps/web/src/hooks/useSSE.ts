import { useEffect, useRef, useCallback } from 'react';
import { useConnectionStore } from '../stores/connectionStore';

interface UseSSEOptions {
  url: string;
  onMessage: (event: MessageEvent) => void;
  enabled?: boolean;
}

export function useSSE({ url, onMessage, enabled = true }: UseSSEOptions) {
  const retryCount = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setLastEventTime = useConnectionStore((s) => s.setLastEventTime);

  const connect = useCallback(() => {
    if (!enabled) return;

    setStatus('connecting');
    const es = new EventSource(url);

    es.onopen = () => {
      setStatus('connected');
      retryCount.current = 0;
    };

    es.onmessage = (event) => {
      setLastEventTime(Date.now());
      onMessage(event);
    };

    es.onerror = () => {
      es.close();
      setStatus('disconnected');

      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30_000);
      retryCount.current++;
      timeoutRef.current = setTimeout(connect, delay);
    };

    return es;
  }, [url, onMessage, enabled, setStatus, setLastEventTime]);

  useEffect(() => {
    const es = connect();
    return () => {
      es?.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus('disconnected');
    };
  }, [connect, setStatus]);
}
