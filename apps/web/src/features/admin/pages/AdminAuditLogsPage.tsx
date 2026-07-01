import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { AdminAuditLog, AdminPaginated, adminApi } from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminFilterBar,
  AdminPageHeader,
  AdminStatusBadge,
} from '@/features/admin/components/AdminDesign';
import {
  AdminFeedback,
  AdminNoticeState,
  toNotice,
} from '@/features/admin/components/AdminFeedback';
import {
  AdminMobileDataCard,
  AdminMobileField,
  AdminMobileList,
  AdminDesktopTable,
} from '@/features/admin/components/AdminMobileList';
import { AdminPagination } from '@/features/admin/components/AdminPagination';
import { AdminEmpty, AdminLoading } from '@/features/admin/components/AdminState';

type AuditFilters = {
  search: string;
  action: string;
  entityType: string;
  entityId: string;
  createdFrom: string;
  createdTo: string;
  page: number;
};

const initialFilters: AuditFilters = {
  search: '',
  action: '',
  entityType: '',
  entityId: '',
  createdFrom: '',
  createdTo: '',
  page: 1,
};

export function AdminAuditLogsPage() {
  const [response, setResponse] = useState<AdminPaginated<AdminAuditLog> | null>(null);
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [notice, setNotice] = useState<AdminNoticeState>(null);

  async function load(next = filters) {
    setResponse(await adminApi.auditLogsPage(buildAuditQuery(next)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    await load(next);
  }

  async function changePage(page: number) {
    const next = { ...filters, page };
    setFilters(next);
    await load(next);
  }

  function clearFilters() {
    setFilters(initialFilters);
    load(initialFilters).catch((error) => setNotice(toNotice(error)));
  }

  useEffect(() => {
    load().catch((error) => setNotice(toNotice(error)));
  }, []);
  if (!response) return <AdminLoading />;
  const items = response.items;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Audit logs"
        title="Activity Log"
        description="Review admin, user, order, upload, product, category, settings, and SHEIN operations"
        actions={
          <Button
            variant="outline"
            type="button"
            onClick={() => load().catch((error) => setNotice(toNotice(error)))}
          >
            Refresh
          </Button>
        }
      />
      <AdminFeedback notice={notice} />
      <AdminCard title="Activity Log Filters" description="Filter by text, entity, action, entity ID, or date range">
        <AdminFilterBar onSubmit={submit}>
          <Input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Search action user or entity"
          />
          <Input
            value={filters.action}
            onChange={(event) =>
              setFilters((current) => ({ ...current, action: event.target.value }))
            }
            placeholder="Action"
          />
          <Input
            value={filters.entityType}
            onChange={(event) =>
              setFilters((current) => ({ ...current, entityType: event.target.value }))
            }
            placeholder="Entity type"
          />
          <Input
            value={filters.entityId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, entityId: event.target.value }))
            }
            placeholder="Entity ID"
          />
          <Input
            type="date"
            value={filters.createdFrom}
            onChange={(event) =>
              setFilters((current) => ({ ...current, createdFrom: event.target.value }))
            }
            aria-label="Created from"
          />
          <Input
            type="date"
            value={filters.createdTo}
            onChange={(event) =>
              setFilters((current) => ({ ...current, createdTo: event.target.value }))
            }
            aria-label="Created to"
          />
          <Button type="submit">Search</Button>
          <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
        </AdminFilterBar>
      </AdminCard>
      <AdminCard
        title="Results"
        description={`${response.meta.total} operations`}
        contentClassName="space-y-4"
      >
        {items.length === 0 ? <AdminEmpty message="No activity log found" /> : null}
        <AdminMobileList>
          {items.map((item) => (
            <AuditCard key={item.id} item={item} />
          ))}
        </AdminMobileList>
        <AdminDesktopTable>
          <div className="admin-responsive-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right">
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>User</th>
                  <th>Metadata</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-black text-[#241611]">{item.action}</td>
                    <td>
                      <AdminStatusBadge tone="neutral">{item.entityType}</AdminStatusBadge>
                    </td>
                    <td dir="ltr">{item.entityId ?? '-'}</td>
                    <td>{formatActor(item)}</td>
                    <td className="max-w-xs truncate" dir="ltr">{formatMetadata(item.metadata)}</td>
                    <td>{new Date(item.createdAt).toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminDesktopTable>
        <AdminPagination
          meta={response.meta}
          onPageChange={(page) => changePage(page).catch((error) => setNotice(toNotice(error)))}
        />
      </AdminCard>
    </div>
  );
}

function AuditCard({ item }: { item: AdminAuditLog }) {
  return (
    <AdminMobileDataCard
      title={item.action}
      badge={<AdminStatusBadge tone="neutral">{item.entityType}</AdminStatusBadge>}
      meta={<span dir="ltr">{item.entityId ?? '-'}</span>}
    >
      <AdminMobileField label="User" value={formatActor(item)} />
      <AdminMobileField label="Date" value={new Date(item.createdAt).toLocaleString('en-US')} />
      <AdminMobileField label="Entity ID" value={item.entityId ?? '-'} dir="ltr" />
      <AdminMobileField label="Metadata" value={formatMetadata(item.metadata)} dir="ltr" />
    </AdminMobileDataCard>
  );
}

function buildAuditQuery(filters: AuditFilters) {
  const params = new URLSearchParams({ page: String(filters.page) });
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.action.trim()) params.set('action', filters.action.trim());
  if (filters.entityType.trim()) params.set('entityType', filters.entityType.trim());
  if (filters.entityId.trim()) params.set('entityId', filters.entityId.trim());
  if (filters.createdFrom) params.set('createdFrom', new Date(`${filters.createdFrom}T00:00:00`).toISOString());
  if (filters.createdTo) params.set('createdTo', new Date(`${filters.createdTo}T23:59:59`).toISOString());
  return `&${params.toString()}`;
}

function formatActor(item: AdminAuditLog): string {
  if (!item.actorUser) return '-';
  return item.actorUser.email ? `${item.actorUser.name} (${item.actorUser.email})` : item.actorUser.name;
}

function formatMetadata(metadata: unknown): string {
  if (!metadata || (typeof metadata === 'object' && Object.keys(metadata as object).length === 0)) return '-';
  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata);
  }
}
