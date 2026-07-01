import { type ButtonHTMLAttributes, type MouseEvent, type ReactNode, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { AdminConfirmationDialog } from '@/features/admin/components/AdminConfirmationDialog';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  message: string;
  children: ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'warning';
};

export function AdminConfirmButton({
  message,
  children,
  onClick,
  title = 'Confirm this action?',
  confirmLabel = 'Confirm action',
  tone = 'danger',
  ...props
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button {...props} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <AdminConfirmationDialog
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        tone={tone}
        onConfirm={() => {
          setOpen(false);
          onClick?.({} as MouseEvent<HTMLButtonElement>);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
