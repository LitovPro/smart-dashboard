import { useState, useEffect } from 'react';

const CLIENT_ID_KEY = 'client-id';

export function useClientId(): string {
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    let stored = localStorage.getItem(CLIENT_ID_KEY);
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, stored);
    }
    setClientId(stored);
  }, []);

  return clientId;
}


