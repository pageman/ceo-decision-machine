import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="toast" role="status">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" d="M1 1l22 22M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 014.3-2.6M12 20h.01M19 12.9a10 10 0 00-2.2-1.8M2 8.8A15 15 0 018.7 5.1M22 8.8a15 15 0 00-3.4-2.3" />
      </svg>
      <span>Working offline. Changes will sync when connected.</span>
    </div>
  );
}
