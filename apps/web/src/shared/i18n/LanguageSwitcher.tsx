import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useI18n } from '@/shared/i18n/useI18n';
import { cn } from '@/shared/utils/cn';

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, toggleLanguage, isSavingLanguage, t } = useI18n();
  const nextLanguageLabel =
    language === 'ar' ? t('language.en') : t('language.ar');
  const ariaLabel =
    language === 'ar'
      ? t('language.switchToEnglish')
      : t('language.switchToArabic');

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void toggleLanguage()}
      disabled={isSavingLanguage}
      className={cn(
        'h-10 rounded-full px-3 text-xs font-black text-gray-600 hover:bg-[#FFF7F1] hover:text-[#B8860B]',
        className,
      )}
      aria-label={ariaLabel}
      title={isSavingLanguage ? t('language.saving') : ariaLabel}
    >
      {isSavingLanguage ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Languages className="h-4 w-4" aria-hidden="true" />
      )}
      <span>{nextLanguageLabel}</span>
    </Button>
  );
}
