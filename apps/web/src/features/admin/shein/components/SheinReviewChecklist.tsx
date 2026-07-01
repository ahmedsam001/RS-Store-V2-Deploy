import { SheinReviewChecklistProps } from '@/features/admin/shein/types/shein.types';

export function SheinReviewChecklist({ steps }: SheinReviewChecklistProps) {
  return (
    <div className="admin-shein-review-checklist">
      {steps.map((step) => (
        <div key={step.label} className={step.done ? 'is-done' : ''}>
          <span>{step.done ? '✓' : '!'}</span>
          <strong>{step.label}</strong>
        </div>
      ))}
    </div>
  );
}