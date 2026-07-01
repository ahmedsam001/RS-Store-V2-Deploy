import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { AdminSetting, AdminSettingDefinition, adminApi } from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminFormSection,
  AdminInfoItem,
  AdminPageHeader,
} from '@/features/admin/components/AdminDesign';
import {
  AdminFeedback,
  AdminNoticeState,
  toNotice,
} from '@/features/admin/components/AdminFeedback';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { useAuth } from '@/features/auth';
import { cn } from '@/shared/utils/cn';

type SettingField = {
  key: string;
  label: string;
  labelEn: string;
  hint: string;
  scope: string;
  group: 'storefront' | 'payment' | 'shipping' | 'shein';
  type?: string;
  min?: number;
  max?: number;
  ltr?: boolean;
  defaultValue?: string;
};
type ResolvedSettingField = SettingField & { required: boolean };

type SettingGroup = {
  key: SettingField['group'];
  title: string;
  description: string;
  helper: string;
  priority: 'Daily' | 'Store' | 'Advanced';
};

const FIELDS: SettingField[] = [
  {
    key: 'store.name',
    label: 'Store name',
    labelEn: 'Store name',
    hint: 'Appears in storefront and invoices',
    scope: 'PUBLIC',
    group: 'storefront',
  },
  {
    key: 'store.whatsapp',
    label: 'WhatsApp',
    labelEn: 'WhatsApp',
    hint: 'Customer service phone number',
    scope: 'PUBLIC',
    group: 'storefront',
    ltr: true,
    defaultValue: '01018313022',
  },
  {
    key: 'store.phone',
    label: 'Phone',
    labelEn: 'Phone',
    hint: 'Primary contact number',
    scope: 'PUBLIC',
    group: 'storefront',
    ltr: true,
  },
  {
    key: 'store.instagram',
    label: 'Instagram',
    labelEn: 'Instagram',
    hint: 'Full Instagram account link',
    scope: 'PUBLIC',
    group: 'storefront',
    type: 'url',
    ltr: true,
  },
  {
    key: 'store.currency',
    label: 'Currency',
    labelEn: 'Currency',
    hint: 'EGP',
    scope: 'PUBLIC',
    group: 'storefront',
    ltr: true,
  },
  {
    key: 'payment.depositMinPercent',
    label: 'Minimum deposit percent',
    labelEn: 'Minimum deposit percent',
    hint: '50 or 60 or 70',
    scope: 'PUBLIC',
    group: 'payment',
    type: 'number',
    min: 50,
    max: 70,
    ltr: true,
  },
  {
    key: 'payment.depositDefaultPercent',
    label: 'Default deposit percent',
    labelEn: 'Default deposit percent',
    hint: '50 or 60 or 70',
    scope: 'PUBLIC',
    group: 'payment',
    type: 'number',
    min: 50,
    max: 70,
    ltr: true,
  },
  {
    key: 'payment.vodafoneFeePercent',
    label: 'Vodafone Cash fee percent',
    labelEn: 'Vodafone Cash fee percent',
    hint: 'Fee added only when the customer pays with Vodafone Cash',
    scope: 'PUBLIC',
    group: 'payment',
    type: 'number',
    min: 0,
    max: 20,
    ltr: true,
  },
  {
    key: 'payment.vodafoneCash',
    label: 'Vodafone Cash',
    labelEn: 'Vodafone Cash',
    hint: 'Deposit and final payment Vodafone Cash number',
    scope: 'PUBLIC',
    group: 'payment',
    ltr: true,
    defaultValue: '01018313022',
  },
  {
    key: 'payment.instapay',
    label: 'Instapay',
    labelEn: 'Instapay',
    hint: 'Payment account shown to customers',
    scope: 'PUBLIC',
    group: 'payment',
    ltr: true,
    defaultValue: '01018313022',
  },
  {
    key: 'shipping.estimatedDays',
    label: 'Shipping days',
    labelEn: 'Shipping days',
    hint: 'Example: 14',
    scope: 'PUBLIC',
    group: 'shipping',
    type: 'number',
    min: 1,
    max: 120,
    ltr: true,
  },
  {
    key: 'shein.import.sarExchangeRate',
    label: 'SAR exchange rate',
    labelEn: 'SAR exchange rate',
    hint: 'Used to calculate store price when publishing SHEIN products',
    scope: 'ADMIN',
    group: 'shein',
    type: 'number',
    min: 1,
    max: 1000,
    ltr: true,
  },
];

const GROUPS: SettingGroup[] = [
  {
    key: 'payment',
    title: 'Payment settings',
    description: 'Deposit percent and customer payment accounts',
    helper: 'Most used. Vodafone fee applies only to Vodafone Cash payments.',
    priority: 'Daily',
  },
  {
    key: 'storefront',
    title: 'Storefront settings',
    description: 'Public store contact data visible to customers',
    helper: 'Update this when customer contact details change.',
    priority: 'Store',
  },
  {
    key: 'shipping',
    title: 'Shipping settings',
    description: 'Delivery settings and estimated duration',
    helper: 'Usually changed less often.',
    priority: 'Advanced',
  },
  {
    key: 'shein',
    title: 'SHEIN pricing settings',
    description: 'SAR exchange rate for importing products',
    helper: 'Advanced pricing input. Review before publishing imported products.',
    priority: 'Advanced',
  },
];

export function AdminSettingsPage() {
  const { csrfToken } = useAuth();
  const [settings, setSettings] = useState<AdminSetting[] | null>(null);
  const [definitions, setDefinitions] = useState<AdminSettingDefinition[] | null>(null);
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [activeGroup, setActiveGroup] = useState<SettingGroup['key']>('payment');
  const byKey = useMemo(() => new Map(settings?.map((item) => [item.key, item]) ?? []), [settings]);
  const fields = useMemo(
    () => (definitions ? resolveFields(FIELDS, definitions) : []),
    [definitions],
  );
  const activeFields = useMemo(
    () => fields.filter((field) => field.group === activeGroup),
    [activeGroup, fields],
  );
  const activeGroupMeta = GROUPS.find((group) => group.key === activeGroup) ?? GROUPS[0];

  async function load() {
    const [nextSettings, nextDefinitions] = await Promise.all([
      adminApi.settings(),
      adminApi.settingDefinitions(),
    ]);
    setSettings(nextSettings);
    setDefinitions(nextDefinitions);
  }
  useEffect(() => {
    load().catch((error) => setNotice(toNotice(error)));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      validateSettingsForm(form, activeFields);
      await Promise.all(
        activeFields.map((field) =>
          adminApi.upsertSetting(field.key, {
            scope: field.scope,
            value: String(form.get(field.key) ?? ''),
            description: field.hint,
          }, { csrfToken }),
        ),
      );
      setNotice({ type: 'success', message: `${activeGroupMeta.title} saved` });
      await load();
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  if ((!settings || !definitions) && notice?.type === 'error')
    return (
      <AdminError
        message={notice.message}
        onRetry={() => load().catch((error) => setNotice(toNotice(error)))}
      />
    );
  if (!settings || !definitions) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Settings"
        title="Store Settings"
        description="Focused setting groups. Open one area, edit only the fields you need, then save that section."
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

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <AdminCard title="Settings areas" description="Inputs are hidden until you choose a section">
          <div className="grid gap-2">
            {GROUPS.map((group) => {
              const count = fields.filter((field) => field.group === group.key).length;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveGroup(group.key)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition',
                    activeGroup === group.key
                      ? 'border-[#c7831e] bg-[#fff6e4] shadow-sm'
                      : 'border-[#efd6c5] bg-white hover:bg-[#fffaf5]',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-[#241611]">{group.title}</span>
                    <span className="rounded-full bg-[#fff1d1] px-2 py-1 text-[11px] font-black uppercase tracking-wider text-[#8a5a10]">
                      {group.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                  <p className="mt-2 text-xs font-bold text-[#8b7b73]">{count} setting{count === 1 ? '' : 's'}</p>
                </button>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard
          title={activeGroupMeta.title}
          description={activeGroupMeta.helper}
          actions={<span className="text-xs font-black uppercase tracking-wider text-[#c7831e]">Save this section only</span>}
        >
          <form className="grid gap-4" onSubmit={handleSubmit} key={activeGroup}>
            <SettingsPreview group={activeGroup} byKey={byKey} />
            <AdminFormSection title="Editable fields" description="Only the selected section is saved so hidden settings are never overwritten by accident.">
              <div className="admin-form-grid">
                {activeFields.map((field) => (
                  <SettingInput
                    key={field.key}
                    field={field}
                    value={readValue(byKey.get(field.key)?.value) || field.defaultValue || ''}
                  />
                ))}
              </div>
            </AdminFormSection>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => load().catch((error) => setNotice(toNotice(error)))}>
                Reset changes
              </Button>
              <Button type="submit" size="lg">Save {activeGroupMeta.title}</Button>
            </div>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}

function SettingsPreview({
  group,
  byKey,
}: {
  group: SettingGroup['key'];
  byKey: Map<string, AdminSetting>;
}) {
  if (group === 'payment') {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminInfoItem label="Default deposit" value={`${readValue(byKey.get('payment.depositDefaultPercent')?.value) || '-'}%`} />
        <AdminInfoItem label="Vodafone fee" value={`${readValue(byKey.get('payment.vodafoneFeePercent')?.value) || '0'}%`} />
        <AdminInfoItem label="Instapay" value={readValue(byKey.get('payment.instapay')?.value) || '-'} dir="ltr" />
      </div>
    );
  }
  if (group === 'storefront') {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminInfoItem label="Store" value={readValue(byKey.get('store.name')?.value) || '-'} />
        <AdminInfoItem label="WhatsApp" value={readValue(byKey.get('store.whatsapp')?.value) || '-'} dir="ltr" />
        <AdminInfoItem label="Currency" value={readValue(byKey.get('store.currency')?.value) || 'EGP'} dir="ltr" />
      </div>
    );
  }
  if (group === 'shipping') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminInfoItem label="Estimated delivery" value={`${readValue(byKey.get('shipping.estimatedDays')?.value) || '-'} days`} />
        <AdminInfoItem label="Visibility" value="Shown to customers" />
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AdminInfoItem label="SAR exchange rate" value={readValue(byKey.get('shein.import.sarExchangeRate')?.value) || '-'} dir="ltr" />
      <AdminInfoItem label="Scope" value="Admin only" />
    </div>
  );
}

function SettingInput({ field, value }: { field: ResolvedSettingField; value: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-black text-[#241611]">
        {field.label}{' '}
        {field.required ? <span className="text-red-600">*</span> : null}{' '}
        <span className="text-xs text-muted-foreground">{field.labelEn}</span>
      </span>
      <Input
        name={field.key}
        dir={field.ltr ? 'ltr' : 'rtl'}
        type={field.type ?? 'text'}
        min={field.min}
        max={field.max}
        defaultValue={value}
        placeholder={field.hint}
        required={field.required}
      />
      <span className="text-xs text-muted-foreground">{field.hint}</span>
    </label>
  );
}

function validateSettingsForm(form: FormData, fields: ResolvedSettingField[]) {
  for (const field of fields) {
    const value = String(form.get(field.key) ?? '').trim();
    if (!value) {
      if (field.required) throw new Error(`${field.label} is required`);
      continue;
    }
    if (field.type === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new Error(`${field.label} must be a number`);
      if (field.min !== undefined && number < field.min)
        throw new Error(`${field.label} is below allowed minimum`);
      if (field.max !== undefined && number > field.max)
        throw new Error(`${field.label} is above allowed maximum`);
    }
  }
}
function readValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function resolveFields(
  fields: SettingField[],
  definitions: AdminSettingDefinition[],
): ResolvedSettingField[] {
  const byKey = new Map(definitions.map((definition) => [definition.key, definition]));
  return fields.map((field) => {
    const definition = byKey.get(field.key);
    if (!definition) {
      throw new Error(`Missing settings registry definition for ${field.key}`);
    }
    return { ...field, required: definition.required };
  });
}
