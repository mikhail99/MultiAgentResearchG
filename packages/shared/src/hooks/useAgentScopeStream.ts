import { useEffect, useRef, useState } from 'react';

export interface AgentScopeEvent {
  agent: string;
  content: string;
}

export function useAgentScopeStream(apiBase = '') {
  const [messages, setMessages] = useState<AgentScopeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const closedByClientRef = useRef(false);
  const hasReceivedRef = useRef(false);

  const submit = (topic: string) => {
    setIsLoading(true);
    setError(null);
    setMessages([]);
    closedByClientRef.current = false;
    hasReceivedRef.current = false;
    esRef.current?.close();
    const url = `${apiBase}/agentscope/stream?topic=${encodeURIComponent(topic)}`;
    const es = new EventSource(url);
    es.onopen = () => {
      setError(null);
    };
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as AgentScopeEvent;
        hasReceivedRef.current = true;
        setMessages((prev) => [...prev, data]);
        if (data.content === '[done]') {
          setIsLoading(false);
          closedByClientRef.current = true;
          es.close();
        }
      } catch (err) {
        // ignore malformed lines
      }
    };
    es.onerror = () => {
      setIsLoading(false);
      if (!closedByClientRef.current) {
        // Only treat as error if we never received any data
        if (!hasReceivedRef.current) setError('stream error');
      }
      es.close();
    };
    esRef.current = es;
  };

  useEffect(() => () => esRef.current?.close(), []);

  return { messages, isLoading, error, submit };
}


