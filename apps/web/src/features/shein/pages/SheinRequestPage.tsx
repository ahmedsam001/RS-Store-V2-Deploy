import { FormEvent, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { apiRequest } from '@/shared/api/http-client';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { useI18n } from '@/shared/i18n';

const sheinRequestCopy = {
  ar: {
    metaTitle: 'طلب خاص من SHEIN | RS Store',
    metaDescription: 'أرسل رابط منتج SHEIN لمراجعة السعر قبل الطلب',
    failedManual: 'وصل طلب SHEIN لكن الاستخراج التلقائي فشل. فريق المتجر سيراجعه يدويًا.',
    sent: 'تم إرسال طلب SHEIN وتجهيز المعاينة لمراجعة الأدمن',
    failedSend: 'فشل إرسال الطلب',
    kicker: 'منتجات SHEIN',
    title: 'طلب خاص جديد',
    description: 'أرسل رابط منتج SHEIN وسنراجع السعر والتفاصيل قبل الطلب',
    catalog: 'كتالوج الكويت',
    currencyHint: 'EGP → SAR',
    productLink: 'رابط منتج SHEIN',
    notes: 'ملاحظات (اختياري)',
    notesPlaceholder: 'مثال: المقاس، اللون، أو الكمية المطلوبة',
    sending: 'جاري الإرسال...',
    submitRequest: 'إرسال طلب المراجعة',
    openLink: 'فتح الرابط',
    howItWorks: 'طريقة الطلب',
    step1: 'انسخ رابط منتج SHEIN',
    step2: 'الصق الرابط هنا مع أي ملاحظات',
    step3: 'نراجع المنتج ونحدد السعر النهائي',
    step4: 'أكد الطلب وأكمل الدفع',
  },
  en: {
    metaTitle: 'SHEIN Custom Order | RS Store',
    metaDescription: 'Submit a SHEIN product link for price review before ordering',
    failedManual:
      'SHEIN request received but automatic extraction failed. The store team will review it manually.',
    sent: 'SHEIN request sent and preview prepared for admin review',
    failedSend: 'Failed to send request',
    kicker: 'SHEIN Products',
    title: 'New Custom Order',
    description: 'Submit a SHEIN product link and we will review price and details before ordering',
    catalog: 'Kuwait Catalog',
    currencyHint: 'EGP → SAR',
    productLink: 'SHEIN Product Link',
    notes: 'Notes (optional)',
    notesPlaceholder: 'e.g. size, color, or required quantity',
    sending: 'Sending...',
    submitRequest: 'Submit Request',
    openLink: 'Open Link',
    howItWorks: 'How It Works',
    step1: 'Copy SHEIN product link',
    step2: 'Paste link here with any notes',
    step3: 'We review and provide final price',
    step4: 'Confirm order and complete payment',
  },
} as const;

export function SheinRequestPage() {
  const { language } = useI18n();
  const copy = sheinRequestCopy[language];
  useDocumentMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
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
      setSuccess(result.status === 'FAILED' ? copy.failedManual : copy.sent);
      setSourceUrl('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.failedSend);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rs-page-stack">
      <div className="rs-section-heading text-start">
        <span className="rs-section-kicker">{copy.kicker}</span>
        <h1 className="rs-heading-1 mt-2">{copy.title}</h1>
        <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
          {copy.description}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rs-panel p-4 sm:p-5">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rs-peach bg-rs-cream-warm px-3.5 py-2">
            <span className="text-xs font-extrabold text-rs-ink">{copy.catalog}</span>
            <span className="text-xs text-muted-foreground">{copy.currencyHint}</span>
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
                {copy.productLink}
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
                {copy.notes}
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={copy.notesPlaceholder}
                rows={3}
                className="mt-0.5 w-full rounded-2xl border border-rs-peach bg-card px-4 py-3 text-sm shadow-sm transition-all placeholder:text-muted-foreground hover:border-rs-gold-light focus:outline-none focus:border-rs-gold focus:ring-2 focus:ring-rs-gold/20"
              />
            </label>

            <div className="grid gap-2 sm:flex">
              <Button type="submit" className="flex-1" size="lg" disabled={isSubmitting}>
                {isSubmitting ? copy.sending : copy.submitRequest}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => sourceUrl && window.open(sourceUrl, '_blank')}
                disabled={!sourceUrl}
              >
                {copy.openLink}
              </Button>
            </div>
          </form>
        </section>

        <aside className="rs-panel p-4 sm:p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.22em] text-rs-gold mb-3">
            {copy.howItWorks}
          </h3>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            {[copy.step1, copy.step2, copy.step3, copy.step4].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rs-gold-bg text-xs font-black text-rs-ink">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
