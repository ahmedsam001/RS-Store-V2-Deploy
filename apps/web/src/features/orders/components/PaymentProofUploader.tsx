import { ChangeEvent, useId, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useI18n } from '@/shared/i18n';

const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PAYMENT_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const paymentProofCopy = {
  ar: {
    unsupportedFile: 'صيغة الملف غير مدعومة. ارفع صورة JPG أو PNG أو WEBP أو GIF',
    fileTooLarge: 'حجم الصورة أكبر من 5MB. اختار صورة أصغر',
    selectFirst: 'اختار صورة إثبات الدفع أولًا',
    uploadFailed: 'فشل رفع إثبات الدفع',
    allowedFormats: 'الصيغ المسموحة',
    uploading: 'جاري الرفع',
    uploadProof: 'رفع الإثبات',
    selected: 'تم اختيار',
    uploadNotRequired: 'الرفع غير مطلوب لحالة الطلب الحالية',
    uploadClearReceipt: 'ارفع صورة واضحة لإيصال التحويل',
    proofFormats: 'JPG PNG WEBP GIF حتى 5MB',
  },
  en: {
    unsupportedFile: 'Unsupported file format. Please upload JPG, PNG, WEBP or GIF',
    fileTooLarge: 'Image size exceeds 5MB. Please choose a smaller image',
    selectFirst: 'Please select a payment proof image first',
    uploadFailed: 'Failed to upload payment proof',
    allowedFormats: 'Allowed formats',
    uploading: 'Uploading',
    uploadProof: 'Upload Proof',
    selected: 'Selected',
    uploadNotRequired: 'Upload not required for current order status',
    uploadClearReceipt: 'Upload clear transfer receipt image',
    proofFormats: 'JPG PNG WEBP GIF up to 5MB',
  },
} as const;

type PaymentProofUploaderProps = {
  label: string;
  isDisabled?: boolean;
  onUpload: (file: File) => Promise<void>;
};

export function PaymentProofUploader({
  label,
  isDisabled = false,
  onUpload,
}: PaymentProofUploaderProps) {
  const { language } = useI18n();
  const copy = paymentProofCopy[language];
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hintId = useId();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setError(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!ACCEPTED_PAYMENT_PROOF_TYPES.includes(selectedFile.type)) {
      setFile(null);
      setError(copy.unsupportedFile);
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_PAYMENT_PROOF_BYTES) {
      setFile(null);
      setError(copy.fileTooLarge);
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit() {
    if (!file) {
      setError(copy.selectFirst);
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await onUpload(file);
      setFile(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.uploadFailed);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-rs-peach-light bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-extrabold text-rs-ink">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copy.allowedFormats}: {copy.proofFormats}
          </p>
        </div>
        {isUploading ? (
          <span className="rounded-full bg-rs-gold-bg px-2.5 py-1 text-[11px] font-black text-rs-gold">
            {copy.uploading}
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="file"
          accept={ACCEPTED_PAYMENT_PROOF_TYPES.join(',')}
          disabled={isDisabled || isUploading}
          onChange={handleFileChange}
          className="min-h-12 w-full rounded-2xl border border-rs-peach bg-background px-3 py-2 text-sm file:me-3 file:rounded-full file:border-0 file:bg-rs-cream-warm file:px-3 file:py-1.5 file:text-xs file:font-extrabold file:text-rs-ink"
          aria-describedby={hintId}
        />
        <Button
          type="button"
          disabled={isDisabled || isUploading || !file}
          onClick={handleSubmit}
          className="min-h-12 w-full sm:w-auto"
        >
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          {isUploading ? copy.uploading : copy.uploadProof}
        </Button>
      </div>
      <p id={hintId} className="mt-2 text-xs text-muted-foreground">
        {file
          ? `${copy.selected}: ${file.name}`
          : isDisabled
            ? copy.uploadNotRequired
            : copy.uploadClearReceipt}
      </p>
      {error ? (
        <p
          className="mt-2 rounded-xl bg-destructive/10 p-2 text-sm font-semibold text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
