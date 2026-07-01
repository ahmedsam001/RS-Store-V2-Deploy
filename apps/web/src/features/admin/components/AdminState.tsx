import { AlertTriangle, Loader2, PackageOpen } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

export function AdminLoading({ message = 'Loading admin data' }: { message?: string }) {
  return (
    <div className="admin-card grid min-h-56 place-items-center p-8 text-center">
      <div className="space-y-3">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff6e4] text-[#9a5b00]">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        </span>
        <p className="text-sm font-bold text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function AdminEmpty({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-[#e8c7b0] bg-[#fffcfa] p-6 text-center">
      <div className="space-y-3">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff6e4] text-[#9a5b00]">
          <PackageOpen className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-bold text-muted-foreground">{message}</p>
        {action ? (
          <Button type="button" variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[1.35rem] border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-red-700">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-black">Admin panel error</p>
            <p className="mt-1 text-sm leading-7">{message}</p>
          </div>
        </div>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}