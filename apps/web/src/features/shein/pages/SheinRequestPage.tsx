import { FormEvent, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { apiRequest } from '@/shared/api/http-client';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';

export function SheinRequestPage() {
  useDocumentMetadata({
    title: 'SHEIN Custom Order | RS Store',
    description: 'Submit a SHEIN product link for price review before ordering',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError(null);
      setIsSubmitting(true);
      const result = await apiRequest<{ status: string; errorMessage?: string | null }>(
        '/shein/requests',
        {
          method: 'POST',
          body: { sourceUrl, notes: notes || undefined },
        },
      );
      setSuccess(
        result.status === 'FAILED'
          ? 'SHEIN request received but automatic extraction failed. The store team will review it manually.'
          : 'SHEIN request sent and preview prepared for admin review',
      );
      setSourceUrl('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rs-page-stack">
      <div className="rs-section-heading text-start">
        <span className="rs-section-kicker">SHEIN Products</span>
        <h1 className="rs-heading-1 mt-2">New Custom Order</h1>
        <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
          Submit a SHEIN product link and we will review price and details before ordering
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rs-panel p-4 sm:p-5">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rs-peach bg-rs-cream-warm px-3.5 py-2">
            <span className="text-xs font-extrabold text-rs-ink">Kuwait Catalog</span>
            <span className="text-xs text-muted-foreground">EGP → SAR</span>
          </div>

          {error ? (
            <p
              className="mb-4 rounded-2xl bg-destructive/10 p-3 text-sm font-extrabold text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {success ? (
            <p
              className="mb-4 rounded-2xl bg-rs-green-bg p-3 text-sm font-extrabold text-rs-green"
              role="status"
            >
              {success}
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                SHEIN Product Link
              </span>
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                dir="ltr"
                className="text-left border-rs-peach hover:border-rs-gold-light focus:border-rs-gold focus:ring-rs-gold/20"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-extrabold text-rs-ink mb-1.5">
                Notes (optional)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. size, color, or required quantity"
                rows={3}
                className="mt-0.5 w-full rounded-2xl border border-rs-peach bg-card px-4 py-3 text-sm shadow-sm transition-all placeholder:text-muted-foreground hover:border-rs-gold-light focus:outline-none focus:border-rs-gold focus:ring-2 focus:ring-rs-gold/20"
              />
            </label>

            <div className="grid gap-2 sm:flex">
              <Button type="submit" className="flex-1" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Add to Cart'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => sourceUrl && window.open(sourceUrl, '_blank')}
                disabled={!sourceUrl}
              >
                Open Link
              </Button>
            </div>
          </form>
        </section>

        <aside className="rs-panel p-4 sm:p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold mb-3">
            How It Works
          </h3>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rs-gold-bg text-xs font-black text-rs-ink">
                1
              </span>
              <span>Copy SHEIN product link</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rs-gold-bg text-xs font-black text-rs-ink">
                2
              </span>
              <span>Paste link here with any notes</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rs-gold-bg text-xs font-black text-rs-ink">
                3
              </span>
              <span>We review and provide final price</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rs-gold-bg text-xs font-black text-rs-ink">
                4
              </span>
              <span>Confirm order and complete payment</span>
            </li>
          </ol>
        </aside>
      </div>
    </div>
  );
}
