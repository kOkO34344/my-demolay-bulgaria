import { describe, expect, it } from 'vitest';

import { mediaState, renderWithProviders, screen } from '@/test';

import { ThemeToggle } from './ThemeToggle';

const html = () => document.documentElement;
const themeColor = () =>
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? null;

describe('ThemeToggle', () => {
  it('menu variant: choosing Dark applies .dark, color-scheme and the dark theme-color', async () => {
    const { user } = renderWithProviders(<ThemeToggle />, { role: null, theme: 'light' });
    expect(html()).not.toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: 'Theme: Light' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Dark' }));

    expect(html()).toHaveClass('dark');
    expect(html()).toHaveAttribute('data-theme', 'dark');
    expect(html().style.colorScheme).toBe('dark');
    expect(themeColor()).toBe('#132136');
    expect(window.sessionStorage.getItem('mdb.theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Theme: Dark' })).toBeInTheDocument();
  });

  it('segmented variant: Light / Dark / System (System follows the OS preference)', async () => {
    mediaState.prefersDark = true;
    const { user } = renderWithProviders(<ThemeToggle variant="segmented" />, {
      role: null,
      theme: 'light',
    });
    const group = screen.getByRole('radiogroup', { name: 'Theme' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(html()).toHaveClass('dark');

    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(html()).not.toHaveClass('dark');
    expect(themeColor()).toBe('#ffffff');

    await user.click(screen.getByRole('radio', { name: 'System' }));
    expect(html()).toHaveClass('dark');
    expect(window.sessionStorage.getItem('mdb.theme')).toBe('system');
  });

  it('is fully translated in Bulgarian', async () => {
    const { user } = renderWithProviders(<ThemeToggle />, { role: null, lang: 'bg' });
    await user.click(screen.getByRole('button', { name: 'Тема: Светла' }));
    expect(await screen.findByRole('menuitemradio', { name: 'Тъмна' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Като системата' })).toBeInTheDocument();
  });
});
