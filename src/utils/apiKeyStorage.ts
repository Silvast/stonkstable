export const API_KEY_STORAGE_KEY = 'stonkstable:apikey:v1';

export function loadDeviceApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function saveDeviceApiKey(apiKey: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (err) {
    console.warn('Could not remember the API key:', err);
  }
}

export function clearDeviceApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (err) {
    console.warn('Could not forget the API key:', err);
  }
}
