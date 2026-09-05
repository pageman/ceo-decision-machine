import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const VISIT_KEY = 'cdm-visit-count';
const DISMISS_KEY = 'cdm-install-dismissed';
const SHOW_DELAY_MS = 30_000;

/**
 * Custom PWA install banner. Shown once the browser fires
 * `beforeinstallprompt` AND (the app has been open ~30s OR this is the 3rd
 * visit). Dismissal persists; hidden when already installed (standalone).
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [standalone] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );

  // Visit counting (3rd visit qualifies).
  const [visitCount] = useState(() => {
    const count = Number(localStorage.getItem(VISIT_KEY) ?? '0') + 1;
    localStorage.setItem(VISIT_KEY, String(count));
    return count;
  });

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    const timer = window.setTimeout(() => setDelayElapsed(true), SHOW_DELAY_MS);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.clearTimeout(timer);
    };
  }, []);

  if (standalone || dismissed || !deferredPrompt) return null;
  if (!delayElapsed && visitCount < 3) return null;

  const handleInstall = () => {
    void deferredPrompt.prompt();
    void deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="install-banner" role="complementary" aria-label="Install app">
      <div className="install-banner__text">
        <div className="install-banner__title">Install CEO Decision Machine</div>
        <div className="text-muted">Offline-first, works without a connection.</div>
      </div>
      <button type="button" className="btn btn--primary btn--sm" onClick={handleInstall}>
        Install
      </button>
      <button type="button" className="btn btn--ghost btn--sm" onClick={handleDismiss}>
        Not now
      </button>
    </div>
  );
}
