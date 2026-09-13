import { useToastStore } from '@/shared/store/toast';

export const ToastContainer = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          onClick={() => dismiss(t.id)}
          className={`flex max-w-sm cursor-pointer items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg transition ${
            t.variant === 'error'
              ? 'bg-error-container text-on-error-container'
              : 'bg-tertiary-container text-on-tertiary-container'
          }`}
        >
          {t.variant === 'error' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};
