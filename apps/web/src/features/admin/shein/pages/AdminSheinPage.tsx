import { AdminPageHeader } from '@/features/admin/components/AdminDesign';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { SheinImportCycleOverview } from '@/features/admin/shein/components/SheinImportCycleOverview';
import { SheinMarketplaceCard } from '@/features/admin/shein/components/SheinMarketplaceCard';
import { SheinImportStartCard } from '@/features/admin/shein/components/SheinImportStartCard';
import { SheinImportStepsPanel } from '@/features/admin/shein/components/SheinImportStepsPanel';
import { SheinReviewEditor } from '@/features/admin/shein/components/SheinReviewEditor';
import { useSheinImportWorkflow } from '@/features/admin/shein/hooks/useSheinImportWorkflow';
import { Notice } from '@/features/admin/shein/types/shein.types';

export function AdminSheinPage() {
  const workflow = useSheinImportWorkflow();

  if (workflow.loadError && !workflow.response) {
    return <AdminError message={workflow.loadError} onRetry={workflow.reload} />;
  }

  if (workflow.isLoading && !workflow.response) return <AdminLoading />;

  if (!workflow.response) {
    return <AdminError message="Unable to load SHEIN import data" onRetry={workflow.reload} />;
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="SHEIN Import"
        title="SHEIN Import"
        description="Paste a SHEIN link and review product data before publishing to store"
      />

      <SheinImportCycleOverview
        items={workflow.response.items}
        selected={workflow.selected}
        sarExchangeRate={workflow.sarExchangeRate}
      />

      <section className="admin-shein-console">
        <SheinMarketplaceCard marketplace={workflow.marketplace} onSaved={workflow.setMarketplace} />
        <SheinImportStartCard
          sourceUrl={workflow.sourceUrl}
          isStarting={workflow.isStarting}
          onSourceUrlChange={workflow.setSourceUrl}
          onCreate={workflow.handleCreate}
          onClear={workflow.handleClearForm}
        />
        <SheinImportStepsPanel
          job={workflow.assistJob}
          isContinuing={workflow.isContinuing}
          onContinue={workflow.handleContinueExtraction}
        />
      </section>

      {workflow.notice ? <NoticeBox notice={workflow.notice} /> : null}

      <div className="admin-shein-workspace">
        {workflow.selected ? (
          <SheinReviewEditor
            item={workflow.selected}
            categories={workflow.categories}
            marketplace={workflow.marketplace}
            sarExchangeRate={workflow.sarExchangeRate}
            onActionComplete={async () => workflow.reload()}
          />
        ) : null}
      </div>
    </div>
  );
}

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        notice.type === 'error'
          ? 'border-destructive text-destructive'
          : notice.type === 'warning'
            ? 'border-amber-300 text-amber-800'
            : 'border-green-200 text-green-700'
      }`}
    >
      {notice.message}
    </div>
  );
}
