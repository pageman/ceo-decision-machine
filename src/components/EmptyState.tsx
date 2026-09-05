import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

function DefaultIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.6a1 1 0 00-.9.55l-.8 1.6a1 1 0 01-.9.55h-5.6a1 1 0 01-.9-.55l-.8-1.6a1 1 0 00-.9-.55H4"
      />
    </svg>
  );
}

export default function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon ?? <DefaultIcon />}</div>
      <div className="empty-state__title">{title}</div>
      {message ? <p className="empty-state__message">{message}</p> : null}
      {action}
    </div>
  );
}
