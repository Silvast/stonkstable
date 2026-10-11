import { useEffect, useState } from 'react';
import { API_USAGE_EVENT, apiCallsToday } from '../utils/apiUsage';

export function useApiCallsToday(): number {
  const [calls, setCalls] = useState(apiCallsToday);

  useEffect(() => {
    const update = () => setCalls(apiCallsToday());
    window.addEventListener(API_USAGE_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(API_USAGE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return calls;
}
