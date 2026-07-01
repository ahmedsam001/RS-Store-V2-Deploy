import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { SheinImportStepsPanelProps } from '@/features/admin/shein/types/shein.types';
import { sanitizeSheinAdminMessage, defaultSteps, formatStepStatus } from '@/features/admin/shein/utils/shein-review-utils';

export function SheinImportStepsPanel({ job, isContinuing = false, onContinue }: SheinImportStepsPanelProps) {
  const steps = job?.steps ?? defaultSteps();
  const assistedUrl = job?.assistedUrl ?? job?.preparedUrl;
  const isAutoMonitoring = job?.status === 'running' || job?.status === 'verification';
  const needsCaptchaAction = job?.status === 'verification';
  const canOpenSheinPage = Boolean(assistedUrl && (needsCaptchaAction || job?.status === 'failed'));
  return (
    <Card className="admin-shein-steps-card">
      <CardHeader>
        <p className="admin-shein-kicker">Import steps</p>
        <CardTitle>Import Steps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="admin-shein-job-status">
          <span>
            {job
              ? sanitizeSheinAdminMessage(job.messageAr)
              : 'Click Start automatic import to open Chrome with V1 mode, or use Open link as backup'}
          </span>
          {job ? <Badge>{job.status}</Badge> : null}
        </div>
        {isAutoMonitoring ? (
          <p className="rounded-2xl border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--muted)/0.45)] px-3 py-2 text-sm leading-6 text-muted-foreground">
            The browser tab is being monitored automatically. Solve CAPTCHA if it appears; once the product page loads, import will continue and the SHEIN tab will close by itself.
          </p>
        ) : null}
        {needsCaptchaAction || canOpenSheinPage ? (
          <div className="flex flex-wrap gap-2">
            {canOpenSheinPage ? (
              <Button asChild variant="outline" size="sm">
                <a href={assistedUrl} target="_blank" rel="noreferrer">
                  Open SHEIN Page
                </a>
              </Button>
            ) : null}
            {needsCaptchaAction ? (
              <Button type="button" size="sm" variant="outline" disabled={isContinuing} onClick={() => void onContinue?.()}>
                {isContinuing ? 'Checking...' : 'Manual check now'}
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="admin-shein-step-list">
          {steps.map((step, index) => (
            <div key={step.id} className={`admin-shein-step is-${step.status}`}>
              <span className="admin-shein-step-number">{index + 1}</span>
              <div>
                <strong>{step.labelEn || step.labelAr}</strong>
                {step.message ? <p>{sanitizeSheinAdminMessage(step.message)}</p> : null}
              </div>
              <em>{formatStepStatus(step.status)}</em>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
