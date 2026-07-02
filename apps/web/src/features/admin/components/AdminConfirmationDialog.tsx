import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils/cn';

type AdminConfirmationDialogProps = {
  open: boolean;
  title: string;
  message: string;
  details?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
};

export function AdminConfirmationDialog({
  open,
  title,
  message,
  details,
  confirmLabel = 'Confirm action',
  cancelLabel = 'Cancel',
  tone = 'warning',
  onConfirm,
  onCancel,
}: AdminConfirmationDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirmation-title"
        className="w-full max-w-lg rounded-[2rem] border border-[#efd6c5] bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border',
              tone === 'danger'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-amber-200 bg-amber-50 text-amber-700',
            )}
          >
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id="admin-confirmation-title" className="text-lg font-black text-[#241611]">
              {title}
            </h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">{message}</p>
          </div>
        </div>

        {details ? (
          <div className="mt-4 rounded-3xl border border-[#efd6c5] bg-[#fffaf3] p-4 text-sm font-bold leading-6 text-[#5f4638]">
            {details}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
