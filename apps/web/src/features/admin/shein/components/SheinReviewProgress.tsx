import { SheinReviewProgressProps } from '@/features/admin/shein/types/shein.types';

export function SheinReviewProgress({ currentStepIndex }: SheinReviewProgressProps) {
  const steps = ['Import Product', 'Review & Edit Product', 'Publish Product'];
  return (
    <div className="admin-shein-review-progress" aria-label="SHEIN review progress">
      {steps.map((step, index) => (
        <div
          key={step}
          className={`admin-shein-review-progress-step ${index <= currentStepIndex ? 'is-done' : ''} ${index === currentStepIndex ? 'is-current' : ''}`}
        >
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  );
}
