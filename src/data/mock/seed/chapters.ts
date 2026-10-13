import type { Chapter } from '@/domain';
import { PHOTOS } from '@/lib/brand';

import { ago, lt, type SeedContext } from './context';

/**
 * Chapters (Обители). The five names and charter dates are the chapters listed on the official
 * DeMolay Bulgaria website (verified in RESEARCH.md §2.1) — BG names verbatim. English names are
 * our UNOFFICIAL transliterations. Everything else (meeting places, schedules, members, content)
 * is FICTIONAL demo data; no real addresses, membership counts or sponsor claims are made.
 *
 * Ids are fixed: ch-1 Sofia (member/officer/advisor demo accounts), ch-2 Plovdiv (national
 * officer), ch-3 Varna (administrator), ch-4 Burgas, ch-5 Veliko Tarnovo.
 */

const DEMO_NOTE = lt(
  'Demo data: the meeting place, schedule and address are fictional.',
  'Демо данни: мястото, графикът и адресът на срещите са измислени.',
);

export function seedChapters(ctx: SeedContext): Chapter[] {
  const created = ago(ctx, { days: 420 });
  const updated = (days: number) => ago(ctx, { days });
  return [
    {
      id: 'ch-1',
      slug: 'sveta-sofia',
      name: lt('Sveta Sofia Chapter', 'Обител „Света София“'),
      city: lt('Sofia', 'София'),
      description: lt(
        'Sveta Sofia was the first DeMolay chapter in Bulgaria, instituted in Sofia on 5 June 2021. Its members meet regularly for working meetings, leadership practice and service projects in the capital, and welcome young men aged 14 to 21 who want to grow as leaders of character.',
        '„Света София“ е първата обител на Дьо Моле в България, учредена в София на 5 юни 2021 г. Членовете ѝ се събират редовно на работни срещи, упражняват лидерски умения и организират благотворителни инициативи в столицата. Обителта приема млади мъже между 14 и 21 години, които искат да израснат като лидери с характер.',
      ),
      foundedAt: '2021-06-05',
      meeting: {
        schedule: lt(
          'Every second and fourth Saturday, 11:00–13:00',
          'Всяка втора и четвърта събота, 11:00–13:00 ч.',
        ),
        venue: lt('Chapter meeting hall (demo venue)', 'Зала на обителта (демо място)'),
        address: lt(
          '10 Primerna St, Sofia (fictional)',
          'ул. „Примерна“ 10, София (измислен адрес)',
        ),
        notes: DEMO_NOTE,
      },
      status: 'active',
      isFictional: false,
      imageUrl: PHOTOS.vitosha.src,
      createdAt: created,
      updatedAt: updated(40),
    },
    {
      id: 'ch-2',
      slug: 'kapitan-petko-voyvoda',
      name: lt(
        'Kapitan Petko Voyvoda – Garibaldinyo Chapter',
        'Обител „Капитан Петко Войвода – Гарибалдиньо“',
      ),
      city: lt('Plovdiv', 'Пловдив'),
      description: lt(
        'Instituted in Plovdiv on 15 May 2022, the chapter brings together young men from the city and the region. Members plan their own programme of meetings, community service and joint activities with other chapters.',
        'Обителта е учредена в Пловдив на 15 май 2022 г. и събира млади мъже от града и региона. Членовете сами планират програмата си от срещи, доброволчески инициативи и съвместни дейности с другите обители.',
      ),
      foundedAt: '2022-05-15',
      meeting: {
        schedule: lt('Every other Friday, 18:00–20:00', 'Всеки втори петък, 18:00–20:00 ч.'),
        venue: lt('Youth activity room (demo venue)', 'Младежка зала (демо място)'),
        address: lt('5 Demo Blvd, Plovdiv (fictional)', 'бул. „Демо“ 5, Пловдив (измислен адрес)'),
        notes: DEMO_NOTE,
      },
      status: 'active',
      isFictional: false,
      imageUrl: null,
      createdAt: created,
      updatedAt: updated(75),
    },
    {
      id: 'ch-3',
      slug: 'sv-arhangel-mihail',
      name: lt('Sveti Arhangel Mihail Chapter', 'Обител „Св. Архангел Михаил“'),
      city: lt('Varna', 'Варна'),
      description: lt(
        'Instituted in Varna on 1 July 2023 as the fifth Bulgarian chapter. In this demo the chapter is shown with a small, fictional membership.',
        'Обителта е учредена във Варна на 1 юли 2023 г. като петата българска обител. В демото тя е представена с малък, измислен състав.',
      ),
      foundedAt: '2023-07-01',
      meeting: {
        schedule: lt(
          'First Sunday of the month, 16:00–18:00',
          'Първата неделя на месеца, 16:00–18:00 ч.',
        ),
        venue: lt('Seaside community room (demo venue)', 'Зала край морето (демо място)'),
        address: lt('3 Primerna St, Varna (fictional)', 'ул. „Примерна“ 3, Варна (измислен адрес)'),
        notes: DEMO_NOTE,
      },
      status: 'active',
      isFictional: false,
      imageUrl: null,
      createdAt: created,
      updatedAt: updated(120),
    },
    {
      id: 'ch-4',
      slug: 'sv-anastasia',
      name: lt('Sveta Anastasia Chapter', 'Обител „Св. Анастасия“'),
      city: lt('Burgas', 'Бургас'),
      description: lt(
        'Instituted in Burgas on 15 May 2022. Members combine regular meetings with outdoor service projects on the coast and joint events with the other chapters.',
        'Обителта е учредена в Бургас на 15 май 2022 г. Членовете съчетават редовните срещи с доброволчески инициативи на открито край морето и съвместни събития с другите обители.',
      ),
      foundedAt: '2022-05-15',
      meeting: {
        schedule: lt('Every second Thursday, 18:30–20:30', 'Всеки втори четвъртък, 18:30–20:30 ч.'),
        venue: lt('Chapter room (demo venue)', 'Стая на обителта (демо място)'),
        address: lt('12 Demo St, Burgas (fictional)', 'ул. „Демо“ 12, Бургас (измислен адрес)'),
        notes: DEMO_NOTE,
      },
      status: 'active',
      isFictional: false,
      imageUrl: null,
      createdAt: created,
      updatedAt: updated(95),
    },
    {
      id: 'ch-5',
      slug: 'tsarevgrad-tarnov',
      name: lt('Tsarevgrad Tarnov Chapter', 'Обител „Царевград Търнов“'),
      city: lt('Veliko Tarnovo', 'Велико Търново'),
      description: lt(
        'Instituted in Veliko Tarnovo on 8 April 2023, the first chapter founded after the Bulgarian jurisdiction was installed. Members often build their programme around the history of the old capital.',
        'Обителта е учредена във Велико Търново на 8 април 2023 г. – първата, основана след инсталирането на Юрисдикция Дьо Моле България. Членовете често изграждат програмата си около историята на старата столица.',
      ),
      foundedAt: '2023-04-08',
      meeting: {
        schedule: lt('Every third Saturday, 10:30–12:30', 'Всяка трета събота, 10:30–12:30 ч.'),
        venue: lt('Old town meeting room (demo venue)', 'Зала в стария град (демо място)'),
        address: lt(
          '8 Primerna St, Veliko Tarnovo (fictional)',
          'ул. „Примерна“ 8, Велико Търново (измислен адрес)',
        ),
        notes: DEMO_NOTE,
      },
      status: 'active',
      isFictional: false,
      imageUrl: PHOTOS.tsarevets.src,
      createdAt: created,
      updatedAt: updated(12),
    },
  ];
}
