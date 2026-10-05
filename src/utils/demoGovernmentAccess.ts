export const DEMO_GOVERNMENT_SESSION_KEY = 'civicfix_demo_government_session';

export function isDemoGovernmentSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_GOVERNMENT_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDemoGovernmentSession(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (active) {
      window.localStorage.setItem(DEMO_GOVERNMENT_SESSION_KEY, 'true');
    } else {
      window.localStorage.removeItem(DEMO_GOVERNMENT_SESSION_KEY);
    }
  } catch {
    // Ignore storage access errors in restricted environments.
  }
}
