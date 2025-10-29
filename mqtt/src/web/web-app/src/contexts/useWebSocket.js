import { useEffect, useRef, useState } from 'react';

export default function useWebSocket(url) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    let isUnmounted = false;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) return;
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        if (isUnmounted) return;
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          // fallback: provide raw message
          setLastMessage({ type: 'raw', data: event.data });
        }
      };

      ws.onerror = (evt) => {
        if (isUnmounted) return;
        setError('WebSocket encountered an error');
      };

      ws.onclose = () => {
        if (isUnmounted) return;
        setIsConnected(false);
      };
    } catch (e) {
      setError(e.message || 'Failed to initialize WebSocket');
    }

    return () => {
      isUnmounted = true;
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      } catch (_) {
        // ignore
      }
    };
  }, [url]);

  return { isConnected, lastMessage, error };
}
