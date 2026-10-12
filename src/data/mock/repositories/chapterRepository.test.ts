import { describe, expect, it } from 'vitest';

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import type { ChapterInput } from '@/domain';

import { auditEntries, signInAs } from '../testing';

import { createMockChapterRepository } from './chapterRepository';

const chapters = createMockChapterRepository();

const inputFrom = (chapter: ChapterInput): ChapterInput => ({
  slug: chapter.slug,
  name: chapter.name,
  city: chapter.city,
  description: chapter.description,
  foundedAt: chapter.foundedAt,
  meeting: chapter.meeting,
  status: chapter.status,
  imageUrl: chapter.imageUrl,
});

describe('chapter repository', () => {
  it('lists the five real chapters (fictional members only) for any signed-in member', async () => {
    signInAs('member');
    const list = await chapters.list();
    expect(list.map((c) => c.id)).toEqual(['ch-1', 'ch-2', 'ch-3', 'ch-4', 'ch-5']);
    expect(list[0]?.name.bg).toBe('Обител „Света София“');
    expect(list.every((c) => c.name.en.length > 0 && c.description.bg.length > 0)).toBe(true);
  });

  it('details include privacy-safe leaders and are scoped', async () => {
    signInAs('member');
    const detail = await chapters.get('ch-1');
    const leaderIds = detail.leaders.map((l) => l.id);
    expect(leaderIds).toEqual(expect.arrayContaining(['u-officer', 'u-advisor', 'u-s12']));
    expect(leaderIds).not.toContain('u-member');
    expect(JSON.stringify(detail.leaders)).not.toContain('@example.org');
    expect(detail.memberCount).toBeGreaterThan(10);
    await expect(chapters.get('ch-2')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('summaries cover the chapters in scope', async () => {
    signInAs('chapter_advisor');
    const own = await chapters.summaries();
    expect(own.map((s) => s.chapterId)).toEqual(['ch-1']);
    expect(own[0]?.pendingApprovalCount).toBe(2);
    signInAs('national_officer');
    const all = await chapters.summaries();
    expect(all).toHaveLength(5);
    expect(all.every((s) => s.memberCount >= s.activeMemberCount)).toBe(true);
  });

  it('administrators update chapters (audited); others cannot', async () => {
    signInAs('national_admin');
    const current = await chapters.get('ch-3');
    const updated = await chapters.update('ch-3', {
      ...inputFrom(current),
      meeting: {
        ...current.meeting,
        schedule: { en: 'Every first Saturday, 11:00', bg: 'Всяка първа събота, 11:00 ч.' },
      },
    });
    expect(updated.meeting.schedule.en).toBe('Every first Saturday, 11:00');
    expect(auditEntries('chapter.updated', 'ch-3')[0]?.metadata).toMatchObject({
      fields: 'meeting',
    });
    await expect(
      chapters.update('ch-3', { ...inputFrom(current), slug: 'sveta-sofia' }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      chapters.update('ch-3', { ...inputFrom(current), name: { en: 'Varna', bg: '' } }),
    ).rejects.toBeInstanceOf(ValidationError);
    signInAs('chapter_advisor');
    await expect(
      chapters.update('ch-1', inputFrom(await chapters.get('ch-1'))),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('creates new (demo) chapters with the next id', async () => {
    signInAs('national_admin');
    const base = inputFrom(await chapters.get('ch-5'));
    const created = await chapters.create({
      ...base,
      slug: 'demo-shumen',
      name: { en: 'Demo Chapter Shumen', bg: 'Демо обител „Шумен“' },
      city: { en: 'Shumen', bg: 'Шумен' },
      status: 'inactive',
    });
    expect(created).toMatchObject({ id: 'ch-6', isFictional: true, status: 'inactive' });
    expect(auditEntries('chapter.created', 'ch-6')).toHaveLength(1);
    signInAs('national_officer');
    await expect(chapters.create({ ...base, slug: 'demo-ruse' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
