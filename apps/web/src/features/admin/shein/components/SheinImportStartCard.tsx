import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { SheinImportStartCardProps } from '@/features/admin/shein/types/shein.types';

export function SheinImportStartCard({
  sourceUrl,
  isStarting,
  onSourceUrlChange,
  onCreate,
  onClear,
}: SheinImportStartCardProps) {
  return (
    <Card className="rs-shein-card">
      <CardHeader>
        <p className="admin-shein-kicker">Step 1</p>
        <CardTitle>Paste SHEIN Link and Start Import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-7 text-muted-foreground">
          Paste a SHEIN product link to start automatic extraction, then review and edit product data before publishing
        </p>
        <form
          className="import-link-panel grid gap-3 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card))] p-3"
          onSubmit={onCreate}
        >
          <label
            className="admin-shein-url-label block text-sm font-bold text-[hsl(var(--foreground))]"
            htmlFor="admin-shein-source-url"
          >
            SHEIN Link
          </label>
          <Input
            id="admin-shein-source-url"
            name="sourceUrl"
            value={sourceUrl}
            onChange={(event) => onSourceUrlChange(event.target.value)}
            dir="ltr"
            placeholder="https://api-shein.shein.com/h5/sharejump/appjump?... or link=...&url_from=..."
            required
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isStarting}>
              {isStarting ? 'Importing Product' : 'Import Product'}
            </Button>
            <Button type="button" variant="outline" disabled={isStarting} onClick={onClear}>
              Clear Form
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
