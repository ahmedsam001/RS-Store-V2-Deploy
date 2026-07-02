import { Button } from '@/shared/components/ui/Button';
import { adminApi } from '@/features/admin/api/admin-api';
import { useAuth } from '@/features/auth/AuthContext';

export function SheinReviewEditorButtons({
  item,
  canRetry,
  isTerminal,
  canPublishReviewedPayload,
  publishPhase,
  run,
  onPublish,
}: {
  item: { id: string; status: string; createdProduct?: { nameAr: string } | null };
  canRetry: boolean;
  isTerminal: boolean;
  canPublishReviewedPayload: boolean;
  publishPhase: 'reviewing' | 'approving' | 'publishing' | null;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
  onPublish: () => Promise<void>;
}) {
  const { csrfToken } = useAuth();

  if (isTerminal) return null;

  return (
    <div className="admin-shein-editor-buttons">
      <Button
        type="button"
        disabled={isTerminal || !canPublishReviewedPayload || Boolean(publishPhase)}
        onClick={onPublish}
      >
        {publishPhase === 'reviewing'
          ? 'Reviewing'
          : publishPhase === 'approving'
            ? 'Approving'
            : publishPhase === 'publishing'
              ? 'Publishing'
              : 'Publish Product'}
      </Button>
      {canRetry ? (
        <Button
          type="button"
          variant="outline"
          disabled={Boolean(publishPhase)}
          onClick={() =>
            run(() => adminApi.retrySheinImport(item.id, { csrfToken }), 'Retry completed')
          }
        >
          Retry
        </Button>
      ) : null}
    </div>
  );
}
