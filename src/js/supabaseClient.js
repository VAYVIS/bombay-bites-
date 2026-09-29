const SUPABASE_URL = 'https://rjagdirzkovjjchianli.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYWdkaXJ6a292ampjaGlhbmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjYyODMsImV4cCI6MjEwNjEwMjI4M30.q9LDpKDajhdzrGn2Rmnd0J5LaIYPndCRsPeb32K2bJs';

// In Electron, window.sessionStore exists (exposed by preload.js) and talks
// to electron-store, which writes to a real file and survives app restarts.
// On Vercel (a normal browser), window.sessionStore does not exist, so this
// falls back to plain localStorage — which already persists fine in a browser.
const isElectron = typeof window !== 'undefined' && !!window.sessionStore;
console.log('isElectron:', isElectron, 'sessionStore exists:', typeof window !== 'undefined' ? !!window.sessionStore : 'no window');

const electronStorage = {
  getItem: async () => {
    const session = await window.sessionStore.get();
    return session ? JSON.stringify(session) : null;
  },
  setItem: async (_key, value) => {
    await window.sessionStore.set(JSON.parse(value));
  },
  removeItem: async () => {
    await window.sessionStore.clear();
  },
};

const browserStorage = {
  getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve(window.localStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(window.localStorage.removeItem(key)),
};

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: isElectron ? electronStorage : browserStorage,
    storageKey: 'bombay-bites-auth',
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});