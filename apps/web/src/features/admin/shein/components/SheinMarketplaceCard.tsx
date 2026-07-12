import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { SheinMarketplaceCardProps, Notice } from '@/features/admin/shein/types/shein.types';
import { sanitizeSheinAdminMessage } from '@/features/admin/shein/utils/shein-review-utils';
import { sheinApi } from '@/features/admin/shein/api/shein-api';
import { useAuth } from '@/features/auth/AuthContext';

export function SheinMarketplaceCard({ marketplace, onSaved }: SheinMarketplaceCardProps) {
  const { csrfToken } = useAuth();
  const [countryCode, setCountryCode] = useState(marketplace.countryCode);
  const [language, setLanguage] = useState(marketplace.language || 'en');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  useEffect(() => {
    setCountryCode(marketplace.countryCode);
    setLanguage(marketplace.language || 'en');
  }, [marketplace.countryCode, marketplace.language]);

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const next = await sheinApi.updateMarketplaceSettings(
        { countryCode, language },
        { csrfToken },
      );
      onSaved(next);
      setNotice({ type: 'success', message: 'SHEIN marketplace settings saved' });
    } catch (error) {
      setNotice({
        type: 'error',
        message: sanitizeSheinAdminMessage(
          error instanceof Error ? error.message : 'Failed to save SHEIN settings',
        ),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rs-shein-card">
      <CardHeader>
        <p className="admin-shein-kicker">Marketplace settings</p>
        <CardTitle>SHEIN Country Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm leading-7 text-muted-foreground">
          Select country to open SHEIN product. Currency is fixed to SAR to prevent wrong market
          price import
        </p>
        <div className="admin-shein-form-grid">
          <label>
            <span>Country</span>
            <Select value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
              {marketplace.countries?.map((country) => (
                <option key={country.code} value={country.code} data-no-admin-translate>
                  {country.nameEn} {country.code}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>Fixed Currency</span>
            <Input value="SAR" disabled />
          </label>
          <label>
            <span>Language</span>
            <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="ar">Arabic</option>
              <option value="en">English</option>
            </Select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save SHEIN settings'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCountryCode('KW');
              setLanguage('en');
            }}
          >
            Reset to Kuwait SAR
          </Button>
        </div>
        {notice ? <NoticeBox notice={notice} /> : null}
      </CardContent>
    </Card>
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
      {sanitizeSheinAdminMessage(notice.message)}
    </div>
  );
}
