import { useState, useEffect } from 'react';

const CLIENT_ID_KEY = 'client-id';

// Polyfill for crypto.randomUUID() for older browsers or HTTP context
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useClientId(): string {
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    let stored = localStorage.getItem(CLIENT_ID_KEY);
    if (!stored) {
      stored = generateUUID();
      localStorage.setItem(CLIENT_ID_KEY, stored);
    }
    setClientId(stored);
  }, []);

  return clientId;
}



