import { useEffect, useState } from 'react';
import { Database, ImageOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { adminApi, UploadCleanupResult, UploadReconciliation } from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminMetricCard,
  AdminPageHeader,
} from '@/features/admin/components/AdminDesign';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { AdminFeedback, AdminNoticeState, toNotice } from '@/features/admin/components/AdminFeedback';
import { useAuth } from '@/features/auth';

export function AdminUploadsPage() {
  const { csrfToken } = useAuth();
  const [status, setStatus] = useState<UploadReconciliation | null>(null);
  const [cleanupResult, setCleanupResult] = useState<UploadCleanupResult | null>(null);
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  async function loadStatus() {
    setStatus(await adminApi.uploadReconciliation());
    setError(null);
  }

  useEffect(() => {
    loadStatus().catch((err: Error) => setError(err.message));
  }, []);

  async function cleanup() {
    if (!confirm('Delete orphaned files from Cloudinary and database. Are you sure?')) return;
    setIsCleaning(true);
    setNotice(null);
    try {
      const result = await adminApi.cleanupUploadOrphans({ csrfToken });
      setCleanupResult(result);
      setNotice({
        type: 'success',
        message: `Cleanup completed. Database records ${result.databaseRecordsDeleted}. Cloudinary files ${result.cloudinaryFilesDeleted}.`,
      });
      await loadStatus();
    } catch (err) {
      setNotice(toNotice(err));
    } finally {
      setIsCleaning(false);
    }
  }

  if (error)
    return (
      <AdminError
        message={error}
        onRetry={() => loadStatus().catch((err: Error) => setError(err.message))}
      />
    );
  if (!status) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Uploads"
        title="Manage Images"
        description="Check orphaned images and safely clean up extra files without affecting product images"
        actions={
          <Button
            variant="outline"
            type="button"
            onClick={() => loadStatus().catch((err: Error) => setError(err.message))}
          >
            Refresh
          </Button>
        }
      />
      <AdminFeedback notice={notice} />
      <div className="admin-upload-grid">
        <AdminMetricCard
          title="Unlinked database records"
          value={status.databaseOrphans}
          icon={Database}
          tone={status.databaseOrphans ? 'warning' : 'success'}
          hint="Records not linked to active products or entities"
        />
        <AdminMetricCard
          title="Unlinked Cloudinary files"
          value={status.cloudinaryOrphans}
          icon={ImageOff}
          tone={status.cloudinaryOrphans ? 'warning' : 'success'}
          hint="Files can be reviewed before cleanup"
        />
      </div>
      <AdminCard
        title="Clean Orphaned Files"
        description="Cleanup button executes a safe backend operation and writes an audit log with the admin user and deletion counts"
      >
        <div className="space-y-4">
          <Button type="button" onClick={cleanup} disabled={isCleaning} className="min-h-11 w-full sm:w-auto">
            {isCleaning ? 'Cleaning...' : 'Confirm cleanup of orphaned files'}
          </Button>
          {cleanupResult ? (
            <p className="text-sm font-semibold text-[#6f625c]">
              Last cleanup removed {cleanupResult.databaseRecordsDeleted} database records and {cleanupResult.cloudinaryFilesDeleted} Cloudinary files
            </p>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}
