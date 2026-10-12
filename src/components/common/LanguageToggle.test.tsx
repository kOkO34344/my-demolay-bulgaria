import { useTranslation } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/i18n';
import { renderWithProviders, screen } from '@/test';

import { LanguageToggle } from './LanguageToggle';

/** Any translated text, to prove the UI re-renders in place. */
function TranslatedProbe() {
  const { t } = useTranslation();
  return <p data-testid="probe">{t('common.actions.signIn')}</p>;
}

describe('LanguageToggle', () => {
  it('switches the interface language in place and updates <html lang>', async () => {
    const { user } = renderWithProviders(
      <>
        <LanguageToggle />
        <TranslatedProbe />
      </>,
      { role: null },
    );

    const group = screen.getByRole('radiogroup', { name: 'Language' });
    const en = screen.getByRole('radio', { name: /^EN/ });
    const bg = screen.getByRole('radio', { name: /^BG/ });
    expect(group).toBeInTheDocument();
    expect(en).toHaveAttribute('aria-checked', 'true');
    expect(bg).toHaveAccessibleName('BG (Български)');
    expect(screen.getByTestId('probe')).toHaveTextContent('Sign in');

    await user.click(bg);

    expect(i18n.language).toBe('bg');
    expect(document.documentElement).toHaveAttribute('lang', 'bg');
    expect(window.sessionStorage.getItem('mdb.lang')).toBe('bg');
    expect(screen.getByTestId('probe')).toHaveTextContent('Вход');
    expect(screen.getByRole('radiogroup', { name: 'Език' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^BG/ })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: /^EN/ }));
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(screen.getByTestId('probe')).toHaveTextContent('Sign in');
  });

  it('keeps the current language when the active option is pressed again', async () => {
    const { user } = renderWithProviders(<LanguageToggle />, { role: null });
    await user.click(screen.getByRole('radio', { name: /^EN/ }));
    expect(i18n.language).toBe('en');
    expect(screen.getByRole('radio', { name: /^EN/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows language names (endonyms) in the settings variant', () => {
    renderWithProviders(<LanguageToggle showNames />, { role: null, lang: 'bg' });
    expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Български' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
