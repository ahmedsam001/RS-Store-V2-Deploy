/* eslint-disable react-refresh/only-export-components */
export type AdminNoticeState = { type: 'success' | 'error'; message: string } | null;

export function AdminFeedback({ notice }: { notice: AdminNoticeState }) {
  if (!notice) return null;
  const className =
    notice.type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-red-200 bg-red-50 text-red-800';
  return (
    <div
      data-no-admin-translate={notice.type === 'error' ? true : undefined}
      className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-7 shadow-sm ${className}`}
    >
      {notice.message}
    </div>
  );
}

export function toNotice(error: unknown): Exclude<AdminNoticeState, null> {
  return {
    type: 'error',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
  };
}
