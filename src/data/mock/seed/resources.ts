import type {
  FileType,
  ID,
  Locale,
  Resource,
  ResourceCategory,
  ResourceLanguage,
  ResourceTranslation,
  ResourceVisibility,
  TranslationState,
} from '@/domain';

import { ago, type SeedContext } from './context';

/** Resource library metadata (no real files). All seven categories, EN / BG / bilingual files. */

interface ResourceSeed {
  id: ID;
  category: ResourceCategory;
  language: ResourceLanguage;
  fileType: FileType;
  fileName: string;
  fileSize: number;
  version: string;
  chapterId?: ID;
  visibility?: ResourceVisibility;
  uploadedBy: ID;
  createdDaysAgo: number;
  updatedDaysAgo?: number;
  archivedDaysAgo?: number;
  downloads: number;
  translationStatus?: Partial<Record<Locale, TranslationState>>;
  en: ResourceTranslation;
  bg: ResourceTranslation;
}

const RESOURCES: ResourceSeed[] = [
  {
    id: 'res-welcome-guide',
    category: 'new_members',
    language: 'both',
    fileType: 'pdf',
    fileName: 'welcome-guide-new-members.pdf',
    fileSize: 2_412_544,
    version: '2.1',
    uploadedBy: 'u-national-officer',
    createdDaysAgo: 200,
    updatedDaysAgo: 35,
    downloads: 148,
    en: {
      title: 'New member welcome guide',
      description:
        'Everything a new member needs in the first months: how the chapter works, the seven cardinal virtues, meetings, offices and who to ask for help.',
    },
    bg: {
      title: 'Ръководство за нови членове',
      description:
        'Всичко, от което новият член има нужда през първите месеци: как работи обителта, седемте кардинални добродетели, срещите, длъжностите и към кого да се обърне за помощ.',
    },
  },
  {
    id: 'res-seven-virtues',
    category: 'new_members',
    language: 'both',
    fileType: 'pdf',
    fileName: 'seven-cardinal-virtues-card.pdf',
    fileSize: 318_464,
    version: '1.0',
    uploadedBy: 'u-admin',
    createdDaysAgo: 180,
    downloads: 97,
    en: {
      title: 'The seven precepts — study card',
      description:
        'A one-page card with the seven precepts of DeMolay, in DeMolay International order: Filial Love, Reverence for Sacred Things, Courtesy, Comradeship, Fidelity, Cleanness and Patriotism.',
    },
    bg: {
      title: 'Седемте принципа – карта за учене',
      description:
        'Карта на една страница със седемте принципа на Дьо Моле в реда на DeMolay International: синовна любов, благоговение – почит към свещените неща, учтивост, другарство, вярност, чистота и патриотизъм.',
    },
  },
  {
    id: 'res-ch1-welcome-pack',
    category: 'new_members',
    language: 'bg',
    fileType: 'docx',
    fileName: 'sveta-sofia-welcome-pack.docx',
    fileSize: 1_204_224,
    version: '1.3',
    chapterId: 'ch-1',
    uploadedBy: 'u-s07',
    createdDaysAgo: 3,
    downloads: 6,
    en: {
      title: 'Sveta Sofia welcome pack',
      description:
        "The chapter's own welcome pack: meeting schedule, how to reach the officers through the portal, the chapter's traditions and a first-month checklist.",
    },
    bg: {
      title: 'Пакет за добре дошли на „Света София“',
      description:
        'Пакетът за добре дошли на обителта: график на срещите, как да се свържете с длъжностните лица през портала, традициите на обителта и списък със задачи за първия месец.',
    },
  },
  {
    id: 'res-meeting-agenda-template',
    category: 'meetings',
    language: 'both',
    fileType: 'docx',
    fileName: 'working-meeting-agenda-template.docx',
    fileSize: 64_512,
    version: '3.0',
    uploadedBy: 'u-national-officer',
    createdDaysAgo: 160,
    updatedDaysAgo: 60,
    downloads: 61,
    en: {
      title: 'Working meeting agenda template',
      description:
        'A ready-to-use agenda for working meetings: opening, reports of the officers, chapter business, programme and closing.',
    },
    bg: {
      title: 'Шаблон за дневен ред на работна среща',
      description:
        'Готов дневен ред за работни срещи: откриване, отчети на длъжностните лица, текущи въпроси, програма и закриване.',
    },
  },
  {
    id: 'res-minutes-template',
    category: 'meetings',
    language: 'bg',
    fileType: 'docx',
    fileName: 'meeting-minutes-template.docx',
    fileSize: 58_368,
    version: '2.0',
    visibility: 'leadership',
    uploadedBy: 'u-admin',
    createdDaysAgo: 150,
    updatedDaysAgo: 9,
    downloads: 33,
    en: {
      title: 'Meeting minutes template for Secretaries',
      description:
        'The standard format for minutes of working meetings, with guidance on what to record and how to store it.',
    },
    bg: {
      title: 'Шаблон за протокол от среща за Секретарите',
      description:
        'Стандартният формат за протоколи от работни срещи с указания какво да се записва и как да се съхранява.',
    },
  },
  {
    id: 'res-ch1-term-calendar',
    category: 'meetings',
    language: 'both',
    fileType: 'pdf',
    fileName: 'sveta-sofia-term-calendar.pdf',
    fileSize: 402_432,
    version: '1.1',
    chapterId: 'ch-1',
    uploadedBy: 'u-officer',
    createdDaysAgo: 19,
    updatedDaysAgo: 18,
    downloads: 18,
    en: {
      title: 'Sveta Sofia term calendar',
      description: 'All working meetings and planned chapter activities for the current term.',
    },
    bg: {
      title: 'Календар на „Света София“ за срока',
      description: 'Всички работни срещи и планирани дейности на обителта за текущия срок.',
    },
  },
  {
    id: 'res-event-planning-checklist',
    category: 'events',
    language: 'en',
    fileType: 'xlsx',
    fileName: 'event-planning-checklist.xlsx',
    fileSize: 41_984,
    version: '1.4',
    uploadedBy: 'u-national-officer',
    createdDaysAgo: 140,
    updatedDaysAgo: 30,
    downloads: 44,
    en: {
      title: 'Event planning checklist',
      description:
        'A step-by-step checklist for planning chapter events: budget, venue, permissions, communication and follow-up.',
    },
    bg: {
      title: 'Контролен списък за планиране на събития',
      description:
        'Списък стъпка по стъпка за планиране на събития на обителта: бюджет, място, разрешения, комуникация и проследяване.',
    },
  },
  {
    id: 'res-parents-day-guide',
    category: 'events',
    language: 'both',
    fileType: 'pdf',
    fileName: 'parents-day-programme-guide.pdf',
    fileSize: 1_536_000,
    version: '1.0',
    uploadedBy: 'u-national-officer',
    createdDaysAgo: 110,
    downloads: 29,
    en: {
      title: "Parents' Day programme guide",
      description:
        "How to prepare Parents' Day, including the Flower Talk, the invitation and a sample programme.",
    },
    bg: {
      title: 'Ръководство за програмата за Деня на родителите',
      description:
        'Как да подготвите Деня на родителите, включително „Беседа за цветята“, поканата и примерна програма.',
    },
  },
  {
    id: 'res-photo-guidelines',
    category: 'events',
    language: 'both',
    fileType: 'pdf',
    fileName: 'event-photography-guidelines.pdf',
    fileSize: 512_000,
    version: '1.2',
    uploadedBy: 'u-admin',
    createdDaysAgo: 130,
    updatedDaysAgo: 25,
    downloads: 22,
    en: {
      title: 'Event photography and consent guidelines',
      description:
        'When and how to take photos at events, how to ask for consent and which photos may be published.',
    },
    bg: {
      title: 'Правила за снимане на събития и съгласие',
      description:
        'Кога и как да снимаме на събития, как да поискаме съгласие и кои снимки могат да се публикуват.',
    },
  },
  {
    id: 'res-code-of-conduct',
    category: 'policies',
    language: 'both',
    fileType: 'pdf',
    fileName: 'member-code-of-conduct.pdf',
    fileSize: 287_744,
    version: '2.0',
    uploadedBy: 'u-admin',
    createdDaysAgo: 210,
    downloads: 120,
    en: {
      title: 'Member code of conduct',
      description:
        'The standards of behaviour expected from every member at meetings, events and online.',
    },
    bg: {
      title: 'Етичен кодекс на членовете',
      description:
        'Нормите на поведение, които се очакват от всеки член на срещи, събития и онлайн.',
    },
  },
  {
    id: 'res-privacy-policy',
    category: 'policies',
    language: 'both',
    fileType: 'pdf',
    fileName: 'member-privacy-policy.pdf',
    fileSize: 356_352,
    version: '1.2',
    uploadedBy: 'u-admin',
    createdDaysAgo: 190,
    updatedDaysAgo: 25,
    downloads: 54,
    en: {
      title: 'Member privacy policy',
      description:
        'What personal data the portal stores, who can see it and how members control what others see.',
    },
    bg: {
      title: 'Политика за поверителност на членовете',
      description:
        'Какви лични данни съхранява порталът, кой може да ги вижда и как членовете контролират какво виждат другите.',
    },
  },
  {
    id: 'res-youth-protection',
    category: 'policies',
    language: 'both',
    fileType: 'pdf',
    fileName: 'youth-protection-policy-advisors.pdf',
    fileSize: 640_000,
    version: '1.0',
    visibility: 'leadership',
    uploadedBy: 'u-admin',
    createdDaysAgo: 100,
    updatedDaysAgo: 11,
    downloads: 27,
    en: {
      title: 'Youth protection policy for advisors',
      description:
        'Rules for adults working with members: supervision, communication, travel and reporting concerns.',
    },
    bg: {
      title: 'Политика за закрила на младите хора за съветници',
      description:
        'Правила за възрастните, които работят с членовете: надзор, комуникация, пътуване и сигнализиране на притеснения.',
    },
  },
  {
    id: 'res-officer-handbook',
    category: 'leadership',
    language: 'en',
    fileType: 'pdf',
    fileName: 'officer-handbook-2026.pdf',
    fileSize: 3_145_728,
    version: '4.0',
    uploadedBy: 'u-national-officer',
    createdDaysAgo: 31,
    updatedDaysAgo: 30,
    downloads: 39,
    translationStatus: { bg: 'needs_review' },
    en: {
      title: 'Officer handbook',
      description:
        'The duties of every chapter office, how to prepare for installation and how to hand over to the next officer.',
    },
    bg: {
      title: 'Наръчник за длъжностните лица',
      description:
        'Задълженията на всяка длъжност в обителта, подготовката за инсталиране и предаването на длъжността на следващия.',
    },
  },
  {
    id: 'res-public-speaking-slides',
    category: 'leadership',
    language: 'bg',
    fileType: 'pptx',
    fileName: 'public-speaking-workshop.pptx',
    fileSize: 5_242_880,
    version: '1.0',
    uploadedBy: 'u-national-officer',
    createdDaysAgo: 75,
    downloads: 15,
    en: {
      title: 'Public speaking workshop slides',
      description:
        'Slides from the public speaking workshop: structuring a speech, body language and handling questions.',
    },
    bg: {
      title: 'Презентация от работилницата по ораторско майсторство',
      description:
        'Слайдове от работилницата по ораторско майсторство: структура на речта, език на тялото и отговори на въпроси.',
    },
  },
  {
    id: 'res-advisor-training',
    category: 'leadership',
    language: 'both',
    fileType: 'mp4',
    fileName: 'advisor-training-module-1.mp4',
    fileSize: 157_286_400,
    version: '1.0',
    visibility: 'leadership',
    uploadedBy: 'u-admin',
    createdDaysAgo: 95,
    downloads: 11,
    en: {
      title: 'Advisor training — module 1 (video)',
      description:
        "Introductory training for new advisors: the advisor's role, the chapter's structure and youth protection.",
    },
    bg: {
      title: 'Обучение за съветници – модул 1 (видео)',
      description:
        'Въвеждащо обучение за нови съветници: ролята на съветника, структурата на обителта и закрилата на младите хора.',
    },
  },
  {
    id: 'res-membership-application',
    category: 'forms',
    language: 'bg',
    fileType: 'pdf',
    fileName: 'membership-application-form.pdf',
    fileSize: 196_608,
    version: '2.2',
    uploadedBy: 'u-admin',
    createdDaysAgo: 220,
    updatedDaysAgo: 50,
    downloads: 76,
    en: {
      title: 'Membership application form',
      description:
        'Application form for new members, completed by the young man together with a parent or guardian.',
    },
    bg: {
      title: 'Формуляр за кандидатстване за членство',
      description:
        'Формуляр за нови членове, който младежът попълва заедно с родител или настойник.',
    },
  },
  {
    id: 'res-expense-claim',
    category: 'forms',
    language: 'both',
    fileType: 'xlsx',
    fileName: 'expense-reimbursement-form.xlsx',
    fileSize: 35_840,
    version: '1.1',
    uploadedBy: 'u-admin',
    createdDaysAgo: 120,
    downloads: 19,
    en: {
      title: 'Expense reimbursement form',
      description:
        'Use this form to claim back approved expenses for chapter activities. Attach copies of the receipts.',
    },
    bg: {
      title: 'Формуляр за възстановяване на разходи',
      description:
        'Използвайте този формуляр, за да поискате възстановяване на одобрени разходи за дейности на обителта. Приложете копия от касовите бележки.',
    },
  },
  {
    id: 'res-ch1-attendance-sheet',
    category: 'forms',
    language: 'bg',
    fileType: 'pdf',
    fileName: 'printable-attendance-sheet.pdf',
    fileSize: 88_064,
    version: '1.0',
    chapterId: 'ch-1',
    uploadedBy: 'u-officer',
    createdDaysAgo: 5,
    downloads: 4,
    translationStatus: { en: 'needs_review' },
    en: {
      title: 'Printable attendance sheet',
      description: 'A paper backup for recording attendance when the portal cannot be used.',
    },
    bg: {
      title: 'Списък за присъствие за отпечатване',
      description:
        'Резервен хартиен списък за отбелязване на присъствие, когато порталът не може да се използва.',
    },
  },
  {
    id: 'res-brand-guidelines',
    category: 'branding',
    language: 'en',
    fileType: 'pdf',
    fileName: 'brand-guidelines-summary.pdf',
    fileSize: 2_457_600,
    version: '1.0',
    uploadedBy: 'u-admin',
    createdDaysAgo: 21,
    updatedDaysAgo: 20,
    downloads: 31,
    en: {
      title: 'Brand guidelines (summary)',
      description: 'How to use the DeMolay Bulgaria logo, seal, colours and typography correctly.',
    },
    bg: {
      title: 'Правила за визуалната идентичност (резюме)',
      description:
        'Как правилно да използвате логото, печата, цветовете и шрифтовете на Дьо Моле България.',
    },
  },
  {
    id: 'res-logo-pack',
    category: 'branding',
    language: 'both',
    fileType: 'zip',
    fileName: 'demolay-bulgaria-logo-pack.zip',
    fileSize: 6_815_744,
    version: '1.0',
    uploadedBy: 'u-admin',
    createdDaysAgo: 21,
    updatedDaysAgo: 20,
    downloads: 42,
    en: {
      title: 'Logo pack',
      description: 'Official logo and seal files (PNG). Use the seal on dark backgrounds.',
    },
    bg: {
      title: 'Пакет с лого файлове',
      description: 'Официалните файлове с логото и печата (PNG). На тъмен фон използвайте печата.',
    },
  },
  {
    id: 'res-presentation-template',
    category: 'branding',
    language: 'both',
    fileType: 'pptx',
    fileName: 'presentation-template.pptx',
    fileSize: 1_884_160,
    version: '2.0',
    uploadedBy: 'u-national-officer',
    createdDaysAgo: 85,
    downloads: 25,
    en: {
      title: 'Presentation template',
      description:
        'A slide template in the national colours for chapter presentations and reports.',
    },
    bg: {
      title: 'Шаблон за презентации',
      description:
        'Шаблон за слайдове в националните цветове за презентации и отчети на обителите.',
    },
  },
  {
    id: 'res-officer-handbook-2024',
    category: 'leadership',
    language: 'en',
    fileType: 'pdf',
    fileName: 'officer-handbook-2024.pdf',
    fileSize: 2_936_012,
    version: '3.2',
    uploadedBy: 'u-national-officer',
    createdDaysAgo: 400,
    archivedDaysAgo: 30,
    downloads: 212,
    en: {
      title: 'Officer handbook (previous edition)',
      description: 'Replaced by the current edition of the officer handbook.',
    },
    bg: {
      title: 'Наръчник за длъжностните лица (предишно издание)',
      description: 'Заменен от актуалното издание на наръчника за длъжностните лица.',
    },
  },
];

export function seedResources(ctx: SeedContext): Resource[] {
  return RESOURCES.map((r) => {
    const createdAt = ago(ctx, { days: r.createdDaysAgo, hours: 4 });
    const archivedAt = r.archivedDaysAgo ? ago(ctx, { days: r.archivedDaysAgo, hours: 2 }) : null;
    const updatedAt =
      archivedAt ??
      (r.updatedDaysAgo !== undefined ? ago(ctx, { days: r.updatedDaysAgo, hours: 3 }) : createdAt);
    return {
      id: r.id,
      translations: { en: r.en, bg: r.bg },
      translationStatus: {
        en: r.translationStatus?.en ?? 'reviewed',
        bg: r.translationStatus?.bg ?? 'reviewed',
      },
      category: r.category,
      language: r.language,
      fileType: r.fileType,
      fileName: r.fileName,
      fileSize: r.fileSize,
      version: r.version,
      chapterId: r.chapterId ?? null,
      visibility: r.visibility ?? 'all_members',
      status: archivedAt ? 'archived' : 'active',
      uploadedBy: r.uploadedBy,
      createdAt,
      updatedAt,
      archivedAt,
      downloadCount: r.downloads,
    };
  });
}
