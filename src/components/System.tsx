import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Custom PWA install banner (bypasses the default browser mini-infobar). */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('cdm-install-dismissed') === '1') return;

    const visits = Number(localStorage.getItem('cdm-visit-count') ?? '0') + 1;
    localStorage.setItem('cdm-visit-count', String(visits));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Show after the 3rd visit or ~5 minutes of usage, whichever comes first.
      if (visits >= 3) setVisible(true);
      else {
        const t = setTimeout(() => setVisible(true), 5 * 60 * 1000);
        void t;
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install app">
      <strong>Install CEO Decision Machine</strong>
      <span className="muted" style={{ fontSize: '0.9rem' }}>
        Analyze acquisition targets offline, right from your home screen.
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            void deferred.prompt();
            void deferred.userChoice.then(() => {
              setVisible(false);
              setDeferred(null);
            });
          }}
        >
          Install
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            localStorage.setItem('cdm-install-dismissed', '1');
            setVisible(false);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}

/** Offline connectivity toast. */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="toast" role="status">
      Working offline. Changes will sync when connected.
    </div>
  );
}
