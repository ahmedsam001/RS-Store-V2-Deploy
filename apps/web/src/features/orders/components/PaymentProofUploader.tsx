import { ChangeEvent, useId, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PAYMENT_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_PAYMENT_PROOF_LABEL = 'JPG PNG WEBP GIF up to 5MB';

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
      setError('Unsupported file format. Please upload JPG, PNG, WEBP or GIF');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_PAYMENT_PROOF_BYTES) {
      setFile(null);
      setError('Image size exceeds 5MB. Please choose a smaller image');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit() {
    if (!file) {
      setError('Please select a payment proof image first');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await onUpload(file);
      setFile(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Failed to upload payment proof',
      );
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
            Allowed formats: {ACCEPTED_PAYMENT_PROOF_LABEL}
          </p>
        </div>
        {isUploading ? (
          <span className="rounded-full bg-rs-gold-bg px-2.5 py-1 text-[11px] font-black text-rs-gold">
            Uploading
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
          {isUploading ? 'Uploading' : 'Upload Proof'}
        </Button>
      </div>
      <p id={hintId} className="mt-2 text-xs text-muted-foreground">
        {file
          ? `Selected: ${file.name}`
          : isDisabled
            ? 'Upload not required for current order status'
            : 'Upload clear transfer receipt image'}
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
