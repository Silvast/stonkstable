export const API_USAGE_KEY = 'stonkstable:apicalls:v1';
export const API_USAGE_EVENT = 'stonkstable:apicalls';
export const DAILY_CALL_BUDGET = 20;

const todayUtc = () => new Date().toISOString().slice(0, 10);

const readUsage = (): { date: string; count: number } | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(API_USAGE_KEY) ?? 'null');
    if (parsed && typeof parsed.date === 'string' && typeof parsed.count === 'number') return parsed;
  } catch {
    return null;
  }
  return null;
};

export function apiCallsToday(): number {
  const usage = readUsage();
  return usage && usage.date === todayUtc() ? usage.count : 0;
}

export function recordApiCalls(calls: number): void {
  try {
    localStorage.setItem(API_USAGE_KEY, JSON.stringify({ date: todayUtc(), count: apiCallsToday() + calls }));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(API_USAGE_EVENT));
}
