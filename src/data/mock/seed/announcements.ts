import type {
  Announcement,
  AnnouncementStatus,
  AnnouncementTranslation,
  AttachmentMeta,
  Audience,
  ID,
  Locale,
  TranslationState,
} from '@/domain';
import type { ReadReceipt } from '@/data/store/schema';

import { at, type SeedContext } from './context';

/**
 * Announcements (fictional, realistic DeMolay themes; no ritual content). Bodies are plain text
 * with blank-line paragraphs. Every PUBLISHED item is complete in EN and BG; drafts may be partial.
 */

type Tr = AnnouncementTranslation;

interface PostSeed {
  id: ID;
  status: AnnouncementStatus;
  audience: Audience;
  pinned?: boolean;
  en?: Tr;
  bg?: Tr;
  translationStatus?: Partial<Record<Locale, TranslationState>>;
  authorId: ID;
  reviewerId?: ID | null;
  reviewNote?: string | null;
  /** [dayOffset, 'HH:mm'] Sofia wall time; created defaults to one day before submit/publish. */
  createdAt: [number, string];
  submittedAt?: [number, string];
  publishedAt?: [number, string];
  archivedAt?: [number, string];
  updatedAt?: [number, string];
  attachments?: AttachmentMeta[];
  relatedIds?: ID[];
}

const national = (visibility: Audience['visibility'] = 'all_members'): Audience => ({
  scope: 'national',
  chapterIds: [],
  visibility,
});
const chapter = (id: ID, visibility: Audience['visibility'] = 'all_members'): Audience => ({
  scope: 'chapter',
  chapterIds: [id],
  visibility,
});

const POSTS: PostSeed[] = [
  // ---------------------------------------------------------------- national, published
  {
    id: 'ann-nat-conference',
    status: 'published',
    audience: national(),
    pinned: true,
    authorId: 'u-national-officer',
    reviewerId: 'u-national-officer',
    createdAt: [-4, '16:20'],
    publishedAt: [-3, '10:00'],
    attachments: [
      {
        id: 'att-conf-programme',
        name: 'national-conference-2026-programme.pdf',
        fileType: 'pdf',
        size: 845_312,
      },
      {
        id: 'att-conf-consent',
        name: 'parental-consent-form.docx',
        fileType: 'docx',
        size: 48_640,
      },
    ],
    relatedIds: ['ann-nat-scholarship', 'ann-nat-obligatory-days'],
    en: {
      title: 'National Leadership Conference 2026: registration is open',
      summary:
        'Two days of workshops, elections and fellowship for every chapter. Register before the deadline in the Events section.',
      body: `The National Leadership Conference brings together members, officers and advisors from every chapter for two days of workshops, discussions and fellowship.

This year's programme focuses on practical leadership: running an effective meeting, speaking in public, planning a service project and mentoring younger members. Officers will also take part in a session on chapter finances and record keeping.

On the second day the delegates will elect the National Master Councilor for the coming term. Each chapter sends its Master Councilor and up to three delegates; all other members are welcome as participants.

Registration is open in the Events section until the deadline. Members under 18 need a signed parental consent form — you will find it attached below. Travel and accommodation details will be shared with registered participants.`,
    },
    bg: {
      title: 'Национална лидерска конференция 2026: регистрацията е отворена',
      summary:
        'Два дни с обучения, избори и приятелство за всички обители. Регистрирайте се до крайния срок в раздел „Събития“.',
      body: `Националната лидерска конференция събира членове, длъжностни лица и съветници от всички обители за два дни, изпълнени с обучения, дискусии и приятелство.

Тазгодишната програма е посветена на практическото лидерство: как се води ефективна среща, как се говори пред публика, как се планира доброволческа инициатива и как се наставляват по-младите членове. Длъжностните лица ще участват и в сесия за финансите и документацията на обителта.

През втория ден делегатите ще изберат Национален съветник за следващия мандат. Всяка обител изпраща своя Главен съветник и до трима делегати, а всички останали членове са добре дошли като участници.

Регистрацията е отворена в раздел „Събития“ до крайния срок. Членовете под 18 години трябва да представят подписана декларация за съгласие от родител – ще я намерите в прикачените файлове. Подробности за пътуването и настаняването ще бъдат изпратени на регистрираните участници.`,
    },
  },
  {
    id: 'ann-nat-frank-land',
    status: 'published',
    audience: national(),
    authorId: 'u-national-officer',
    reviewerId: 'u-national-officer',
    createdAt: [-7, '15:00'],
    publishedAt: [-6, '09:30'],
    relatedIds: ['ann-nat-obligatory-days'],
    en: {
      title: "Frank S. Land Memorial Day: plan your chapter's programme",
      summary:
        'Each chapter honours the founder of DeMolay with a short programme and a charity collection. Ideas and a checklist inside.',
      body: `Frank S. Land Memorial Day is one of the obligatory days in the DeMolay calendar. It honours “Dad” Land, who founded the Order in 1919, and reminds us why DeMolay exists: to help young men become good sons, good citizens and good leaders.

We ask every chapter to hold a short programme in the week of the memorial day. A simple format works well: a few words about Frank S. Land's life, a reading of the seven cardinal virtues and a conversation about what they mean in everyday life.

Many chapters also combine the day with a charity collection. Agree on a cause with your advisors, keep a record of what you collect and send a short report to the national team afterwards.

The event planning checklist in Resources can help you prepare. If you need help with speakers or materials, contact the national programme team through the portal.`,
    },
    bg: {
      title: 'Ден в памет на Франк С. Ленд: подгответе програмата на обителта',
      summary:
        'Всяка обител почита основателя на Дьо Моле с кратка програма и благотворителна кампания. Вижте идеи и контролен списък.',
      body: `Денят в памет на Франк С. Ленд е един от задължителните дни в календара на Дьо Моле. Той е посветен на „Татко“ Ленд, който основава Ордена през 1919 г., и ни напомня защо съществува Дьо Моле – за да помага на младите мъже да станат добри синове, добри граждани и добри лидери.

Молим всяка обител да проведе кратка програма в седмицата на възпоменателния ден. Добре работи прост формат: няколко думи за живота на Франк С. Ленд, прочитане на седемте кардинални добродетели и разговор за това какво означават те в ежедневието.

Много обители съчетават деня и с благотворителна кампания. Изберете кауза заедно със съветниците, водете отчет за събраното и след това изпратете кратък доклад на националния екип.

Контролният списък за планиране на събития в раздел „Ресурси“ ще ви помогне в подготовката. Ако имате нужда от лектори или материали, свържете се с националния екип за програмите през портала.`,
    },
  },
  {
    id: 'ann-nat-day-of-comfort',
    status: 'published',
    audience: national(),
    authorId: 'u-national-officer',
    reviewerId: 'u-national-officer',
    createdAt: [-11, '18:00'],
    publishedAt: [-10, '11:00'],
    relatedIds: ['ann-nat-obligatory-days'],
    en: {
      title: 'Day of Comfort: visiting those who need company',
      summary:
        'Between mid-November and the end of December, chapters visit people who are ill, elderly or alone. Here is how to organise a respectful visit.',
      body: `The Day of Comfort is the DeMolay tradition of visiting people who are ill, elderly or lonely during the holiday season. A short visit, a conversation or a hand-made card can mean a great deal to someone who rarely has guests.

Please agree on the place and time with the hosting institution in advance and always go as a group, accompanied by at least one advisor. Ask what is appropriate to bring — some care homes prefer that visitors do not bring food.

Prepare the members beforehand: talk about listening, patience and respecting people's privacy. Photos are only taken with the explicit permission of the people in them and of the institution.

Afterwards, share a few lines about the visit with your chapter so others can learn from your experience.`,
    },
    bg: {
      title: 'Ден на комфорта: посещение при хора, които имат нужда от компания',
      summary:
        'От средата на ноември до края на декември обителите посещават болни, възрастни или самотни хора. Ето как да организирате посещение с уважение.',
      body: `Денят на комфорта е традиция на Дьо Моле да посещаваме болни, възрастни или самотни хора около празниците. Кратко посещение, разговор или ръчно направена картичка могат да значат много за човек, който рядко има гости.

Уговорете предварително мястото и часа с институцията домакин и винаги ходете като група, придружени от поне един съветник. Попитайте какво е уместно да занесете – някои домове за възрастни хора предпочитат посетителите да не носят храна.

Подгответе членовете предварително: поговорете за изслушването, търпението и уважението към личното пространство на хората. Снимки се правят само с изричното съгласие на хората на тях и на институцията.

След посещението споделете няколко реда с обителта, за да могат и другите да се учат от опита ви.`,
    },
  },
  {
    id: 'ann-nat-scholarship',
    status: 'published',
    audience: national(),
    authorId: 'u-admin',
    reviewerId: 'u-admin',
    createdAt: [-15, '13:00'],
    publishedAt: [-14, '10:00'],
    attachments: [
      {
        id: 'att-grant-form',
        name: 'study-support-grant-application.pdf',
        fileType: 'pdf',
        size: 214_016,
      },
    ],
    en: {
      title: 'Study support grants for members: applications open',
      summary:
        'Members aged 14–21 can apply for a small grant towards courses, books or competition fees. Applications close at the end of the month.',
      body: `To encourage learning beyond the classroom, the national team is offering a limited number of study support grants this school year. A grant can cover course fees, books, language exams or the entry fee for an academic or sports competition.

Any active member aged 14 to 21 can apply. Tell us in a short letter what you would like to learn, why it matters to you and how you will share what you learn with your chapter. Your chapter advisor adds a short recommendation.

Applications are reviewed by a small committee of advisors who do not assess candidates from their own chapter. The results will be announced in the portal, and every applicant will receive feedback.

Use the application form attached below and send it through your chapter advisor.`,
    },
    bg: {
      title: 'Стипендии за обучение на членовете: кандидатстването започна',
      summary:
        'Членовете между 14 и 21 години могат да кандидатстват за малка стипендия за курсове, книги или такси за състезания. Срокът изтича в края на месеца.',
      body: `За да насърчи ученето извън класната стая, националният екип предлага тази учебна година ограничен брой стипендии за обучение. Стипендията може да покрие такса за курс, книги, езиков изпит или участие в научно или спортно състезание.

Може да кандидатства всеки активен член на възраст от 14 до 21 години. Опишете в кратко писмо какво искате да научите, защо е важно за вас и как ще споделите наученото с обителта си. Съветникът на обителта добавя кратка препоръка.

Кандидатурите се разглеждат от малка комисия от съветници, които не оценяват кандидати от собствената си обител. Резултатите ще бъдат обявени в портала и всеки кандидат ще получи обратна връзка.

Използвайте прикачения формуляр за кандидатстване и го изпратете чрез съветника на обителта си.`,
    },
  },
  {
    id: 'ann-nat-branding',
    status: 'published',
    audience: national(),
    authorId: 'u-admin',
    reviewerId: 'u-admin',
    createdAt: [-21, '11:00'],
    publishedAt: [-20, '15:00'],
    attachments: [
      {
        id: 'att-brand-summary',
        name: 'brand-guidelines-summary.pdf',
        fileType: 'pdf',
        size: 2_457_600,
      },
      {
        id: 'att-logo-pack',
        name: 'demolay-bulgaria-logo-pack.zip',
        fileType: 'zip',
        size: 6_815_744,
      },
    ],
    en: {
      title: 'Brand guidelines and logo files for chapters',
      summary:
        'Use the official logo files and follow a few simple rules when you design posters, social media posts or certificates.',
      body: `Many chapters design their own posters, invitations and social media posts. To keep DeMolay Bulgaria recognisable, please use only the official logo files from the Branding section of Resources.

A few rules matter most: never stretch, recolour, crop or redraw the logo; leave clear space around it; and on dark backgrounds use the round seal rather than the wordmark. Do not combine the logo with other symbols or add effects such as shadows.

As tradition allows, each chapter may still design its own chapter emblem. When you use it together with the national logo, keep the two visually separate.

If you are unsure whether a design follows the guidelines, send it to the national team before printing — we are happy to help.`,
    },
    bg: {
      title: 'Правила за визуалната идентичност и лого файлове за обителите',
      summary:
        'Използвайте официалните файлове с логото и спазвайте няколко прости правила, когато подготвяте плакати, публикации в социалните мрежи или грамоти.',
      body: `Много обители сами подготвят плакати, покани и публикации в социалните мрежи. За да остане Дьо Моле България разпознаваема, моля, използвайте само официалните файлове с логото от категория „Визуална идентичност“ в раздел „Ресурси“.

Най-важни са няколко правила: никога не разтягайте, не прецветявайте, не изрязвайте и не прерисувайте логото; оставяйте свободно пространство около него; а на тъмен фон използвайте кръглия печат вместо надписа. Не съчетавайте логото с други символи и не добавяйте ефекти като сенки.

Както повелява традицията, всяка обител може да създаде своя собствена емблема. Когато я използвате заедно с националното лого, дръжте ги визуално отделени.

Ако не сте сигурни дали даден дизайн отговаря на правилата, изпратете го на националния екип преди печат – с радост ще помогнем.`,
    },
  },
  {
    id: 'ann-nat-privacy',
    status: 'published',
    audience: national(),
    authorId: 'u-admin',
    reviewerId: 'u-admin',
    createdAt: [-26, '10:00'],
    publishedAt: [-25, '12:00'],
    attachments: [
      {
        id: 'att-privacy-policy',
        name: 'member-privacy-policy.pdf',
        fileType: 'pdf',
        size: 356_352,
      },
    ],
    en: {
      title: 'Updated member privacy policy',
      summary:
        'We have clarified what information the portal shows to other members and who can see your contact details.',
      body: `We have updated the member privacy policy to reflect how the new member portal works. The most important principle has not changed: your contact details are never shown to other members.

The chapter directory shows only your name, profile photo, chapter and position. Other members can contact you through in-app messages, but they never see your email address, phone number, home address or date of birth. You can hide yourself from the directory or turn off messages at any time in your profile.

Only your chapter advisors and the national administrators can see your contact details, and only to the extent needed to organise activities and to keep you and your parents informed.

The full policy is available in the Policies section of Resources. If you have questions, ask your chapter advisor.`,
    },
    bg: {
      title: 'Обновена политика за поверителност на членовете',
      summary:
        'Уточнихме каква информация показва порталът на другите членове и кой може да вижда данните ви за контакт.',
      body: `Обновихме политиката за поверителност на членовете, за да отразим начина, по който работи новият портал. Най-важният принцип не се променя: данните ви за контакт никога не се показват на другите членове.

Указателят на обителта показва само името, профилната снимка, обителта и длъжността ви. Другите членове могат да ви пишат чрез съобщения в портала, но никога не виждат имейла, телефона, адреса или датата ви на раждане. По всяко време можете да се скриете от указателя или да изключите съобщенията от профила си.

Данните ви за контакт виждат само съветниците на обителта и националните администратори – и само доколкото е нужно за организиране на дейностите и за информиране на вас и родителите ви.

Пълният текст на политиката е в категория „Правила“ на раздел „Ресурси“. Ако имате въпроси, обърнете се към съветника на обителта.`,
    },
  },
  {
    id: 'ann-nat-leadership-briefing',
    status: 'published',
    audience: national('leadership'),
    authorId: 'u-admin',
    reviewerId: 'u-admin',
    createdAt: [-5, '12:00'],
    publishedAt: [-4, '18:00'],
    attachments: [
      {
        id: 'att-delegate-list',
        name: 'delegate-list-template.xlsx',
        fileType: 'xlsx',
        size: 22_528,
      },
    ],
    relatedIds: ['ann-nat-conference'],
    en: {
      title: 'Briefing for officers and advisors: conference logistics',
      summary:
        'Delegate lists, consent forms and travel arrangements — what officers and advisors need to prepare before the National Leadership Conference.',
      body: `This briefing is for chapter officers, advisors and the national team only.

Please send your chapter's delegate list through the portal at least ten days before the conference. For each delegate under 18 we need a signed parental consent form; advisors are responsible for collecting the originals.

Chapters travel together with at least one advisor. If your chapter needs help with transport costs, let the national team know as early as possible — a limited travel fund is available.

During the conference, officers will run two of the workshops themselves. Volunteers who would like to lead a session should reply to this briefing by the end of the week.`,
    },
    bg: {
      title: 'Указания за длъжностните лица и съветниците: организация на конференцията',
      summary:
        'Списъци на делегатите, декларации за съгласие и пътуване – какво трябва да подготвят длъжностните лица и съветниците преди Националната лидерска конференция.',
      body: `Тези указания са само за длъжностните лица, съветниците на обителите и националния екип.

Моля, изпратете списъка с делегатите на обителта чрез портала поне десет дни преди конференцията. За всеки делегат под 18 години е необходима подписана декларация за съгласие от родител; съветниците отговарят за събирането на оригиналите.

Обителите пътуват заедно с поне един съветник. Ако обителта ви има нужда от помощ за транспортните разходи, уведомете националния екип възможно най-рано – разполагаме с ограничен фонд за пътуване.

По време на конференцията длъжностните лица ще водят сами две от работилниците. Желаещите да водят сесия да отговорят на тези указания до края на седмицата.`,
    },
  },
  {
    id: 'ann-nat-obligatory-days',
    status: 'published',
    audience: national(),
    authorId: 'u-national-officer',
    reviewerId: 'u-national-officer',
    createdAt: [-41, '17:00'],
    publishedAt: [-40, '10:00'],
    en: {
      title: 'The DeMolay calendar: seven obligatory days',
      summary: 'An overview of the seven obligatory days every chapter observes during the year.',
      body: `Every DeMolay chapter observes seven obligatory days during the year. They are a chance to put the seven cardinal virtues into practice together.

Frank S. Land Memorial Day honours the founder of DeMolay. The Day of Comfort is dedicated to visiting the sick, the elderly and the lonely. On Patriots' Day chapters hold a programme about a great event in Bulgarian history. Devotional Day is marked by attending a service at a place of worship approved by the advisors.

Educational Day stresses the value of learning, Parents' Day is a celebration for parents, guardians and mentors, and on My Government Day members visit a state or municipal institution.

Your chapter's officers plan how to mark each day. The national calendar in Resources lists the suggested dates for this year.`,
    },
    bg: {
      title: 'Календарът на Дьо Моле: седемте задължителни дни',
      summary: 'Преглед на седемте задължителни дни, които всяка обител отбелязва през годината.',
      body: `Всяка обител на Дьо Моле отбелязва седем задължителни дни през годината. Те са възможност заедно да приложим на практика седемте кардинални добродетели.

Денят в памет на Франк С. Ленд почита основателя на Дьо Моле. Денят на комфорта е посветен на посещения при болни, възрастни и самотни хора. На Деня на патриотите обителите провеждат програма за велико събитие от българската история. Денят на предаността се отбелязва с посещение на служба в храм, одобрен от съветниците.

Денят на образованието подчертава стойността на ученето, Денят на родителите е празник за родителите, настойниците и наставниците, а на Деня на моето правителство членовете посещават държавна или общинска институция.

Длъжностните лица на обителта планират как да се отбележи всеки ден. Националният календар в раздел „Ресурси“ съдържа препоръчителните дати за тази година.`,
    },
  },
  {
    id: 'ann-multi-service-weekend',
    status: 'published',
    audience: { scope: 'multi_chapter', chapterIds: ['ch-2', 'ch-4'], visibility: 'all_members' },
    authorId: 'u-national-officer',
    reviewerId: 'u-national-officer',
    createdAt: [-9, '12:00'],
    publishedAt: [-8, '17:00'],
    en: {
      title: 'Joint service weekend for the Plovdiv and Burgas chapters',
      summary:
        'Members of both chapters will spend a weekend helping a family-type care centre. Each chapter organises its own transport.',
      body: `The Plovdiv and Burgas chapters are joining forces for a service weekend. Together we will help a family-type care centre with small repairs, gardening and an afternoon of games with the children.

Each chapter organises its own transport; the two groups meet on Saturday morning. Please bring work gloves and comfortable clothes. Lunch is provided by the hosts.

Advisors from both chapters will be present throughout the weekend. Members under 18 need their parents' consent, as for every overnight activity.

This is also a good opportunity to get to know members from another chapter — the national team hopes to see more joint initiatives like this one.`,
    },
    bg: {
      title: 'Съвместен доброволчески уикенд за обителите в Пловдив и Бургас',
      summary:
        'Членовете на двете обители ще прекарат уикенд в помощ на център за настаняване от семеен тип. Всяка обител организира своя транспорт.',
      body: `Обителите в Пловдив и Бургас обединяват усилията си за доброволчески уикенд. Заедно ще помогнем на център за настаняване от семеен тип с дребни ремонти, работа в градината и следобед с игри с децата.

Всяка обител организира своя транспорт, а двете групи се срещат в събота сутринта. Носете работни ръкавици и удобни дрехи. Обядът се осигурява от домакините.

Съветници от двете обители ще присъстват през целия уикенд. Членовете под 18 години се нуждаят от съгласие на родителите си, както при всяко мероприятие с нощувка.

Това е и добра възможност да се запознаете с членове от друга обител – националният екип се надява да има още много подобни съвместни инициативи.`,
    },
  },
  // ---------------------------------------------------------------- ch-1 Sofia, published
  {
    id: 'ann-ch1-installation',
    status: 'published',
    audience: chapter('ch-1'),
    pinned: true,
    authorId: 'u-officer',
    reviewerId: 'u-advisor',
    createdAt: [-4, '18:10'],
    submittedAt: [-3, '20:00'],
    publishedAt: [-2, '19:00'],
    attachments: [
      {
        id: 'att-installation-invite',
        name: 'installation-invitation.pdf',
        fileType: 'pdf',
        size: 1_126_400,
      },
    ],
    relatedIds: ['ann-ch1-meeting-schedule'],
    en: {
      title: 'Installation of officers: save the date',
      summary:
        'The new officers of Sveta Sofia will be installed at a public ceremony. Families and friends are welcome — please reply in Events.',
      body: `The new officers of Sveta Sofia chapter will be installed at a public installation ceremony. Parents, relatives, friends and members of other chapters are warmly invited.

The ceremony is followed by a short reception prepared by the members themselves. If you can help with setting up the hall or with the reception, tell the Marshal or the Scribe at the next meeting.

Officers, please be at the hall an hour early for a final rehearsal. Members should wear the chapter's formal dress.

Reply in the Events section so we know how many guests to expect — places in the hall are limited.`,
    },
    bg: {
      title: 'Инсталиране на длъжностните лица: запазете датата',
      summary:
        'Новите длъжностни лица на „Света София“ ще бъдат инсталирани на открита церемония. Семействата и приятелите са добре дошли – отговорете в раздел „Събития“.',
      body: `Новите длъжностни лица на обител „Света София“ ще бъдат инсталирани на открита церемония. Родители, роднини, приятели и членове на другите обители са сърдечно поканени.

След церемонията следва кратък коктейл, подготвен от самите членове. Ако можете да помогнете с подреждането на залата или с коктейла, кажете на Маршала или на Писаря на следващата среща.

Длъжностните лица трябва да бъдат в залата един час по-рано за последна репетиция. Членовете се явяват в официалното облекло на обителта.

Отговорете в раздел „Събития“, за да знаем колко гости да очакваме – местата в залата са ограничени.`,
    },
  },
  {
    id: 'ann-ch1-food-drive',
    status: 'published',
    audience: chapter('ch-1'),
    authorId: 'u-officer',
    reviewerId: 'u-advisor',
    createdAt: [-14, '17:00'],
    submittedAt: [-13, '19:30'],
    publishedAt: [-12, '18:00'],
    en: {
      title: 'Thank you: winter food drive results',
      summary:
        'Together we collected 214 kg of food and household items for families supported by a local charity.',
      body: `Thank you to everyone who took part in our winter food drive! Over two Saturdays members, parents and friends collected 214 kg of food and household items.

Everything has been handed over to a local charity that supports families in difficult situations. The volunteers there told us that the donations will help more than thirty families through the winter.

A special thank you goes to our Almoner, who coordinated the collection points, and to the parents who helped with transport.

Photos from the drive are available to members on request. We will plan the next initiative together at the coming working meeting.`,
    },
    bg: {
      title: 'Благодарим ви: резултати от зимната кампания за храна',
      summary:
        'Заедно събрахме 214 кг храна и домашни потреби за семейства, подкрепяни от местна благотворителна организация.',
      body: `Благодарим на всички, които се включиха в зимната ни кампания за събиране на храна! В рамките на две съботи членове, родители и приятели събраха 214 кг храна и домашни потреби.

Всичко е предадено на местна благотворителна организация, която подкрепя семейства в трудна ситуация. Доброволците там ни споделиха, че даренията ще помогнат на повече от трийсет семейства през зимата.

Специални благодарности на нашия Милостинник, който координира пунктовете за събиране, и на родителите, които помогнаха с транспорта.

Снимки от кампанията са достъпни за членовете при поискване. Следващата инициатива ще планираме заедно на предстоящата работна среща.`,
    },
  },
  {
    id: 'ann-ch1-meeting-schedule',
    status: 'published',
    audience: chapter('ch-1'),
    authorId: 'u-officer',
    reviewerId: 'u-advisor',
    createdAt: [-20, '17:00'],
    submittedAt: [-19, '21:00'],
    publishedAt: [-18, '20:00'],
    attachments: [
      {
        id: 'att-term-calendar',
        name: 'sveta-sofia-term-calendar.pdf',
        fileType: 'pdf',
        size: 402_432,
      },
    ],
    en: {
      title: 'New meeting schedule for the term',
      summary:
        'Working meetings move to every second and fourth Saturday morning. The full calendar is in Resources.',
      body: `From this term, our working meetings will take place every second and fourth Saturday from 11:00 to 13:00. The change follows the members' survey: most of you said that Saturday mornings work better than weekday evenings.

Each meeting starts with chapter business and reports from the officers, followed by a programme prepared by a different group of members. The programme for the next few meetings is already on the chapter calendar.

If you cannot attend, let the Scribe know in advance through the portal so the attendance record stays accurate.

The term calendar with all dates is available in the Meetings section of Resources.`,
    },
    bg: {
      title: 'Нов график на срещите за срока',
      summary:
        'Работните срещи се преместват всяка втора и четвърта събота сутрин. Пълният календар е в раздел „Ресурси“.',
      body: `От този срок работните ни срещи ще се провеждат всяка втора и четвърта събота от 11:00 до 13:00 ч. Промяната следва анкетата сред членовете – повечето от вас казаха, че съботната сутрин е по-удобна от делничните вечери.

Всяка среща започва с текущите въпроси на обителта и отчетите на длъжностните лица, след което следва програма, подготвена от различна група членове. Програмата за следващите няколко срещи вече е в календара на обителта.

Ако не можете да присъствате, уведомете предварително Писаря през портала, за да бъде отчетът за присъствието точен.

Календарът за срока с всички дати е в категория „Срещи“ на раздел „Ресурси“.`,
    },
  },
  {
    id: 'ann-ch1-study-group',
    status: 'published',
    audience: chapter('ch-1'),
    authorId: 'u-s01',
    reviewerId: 'u-advisor',
    createdAt: [-9, '16:00'],
    submittedAt: [-8, '18:00'],
    publishedAt: [-7, '16:00'],
    en: {
      title: 'Study group before exams',
      summary:
        'Older members offer help with maths, physics and English before the exam period. Sign up for the study session in Events.',
      body: `Exams are coming, and several older members have offered to help. We are organising a study session where you can work on maths, physics or English in small groups.

Bring the topics you find hardest and your own notes. The session is not a lesson — it is a chance to learn from each other, ask questions without pressure and practise explaining things, which is a leadership skill in itself.

Advisors will be present, and the hall will be open an hour earlier for anyone who wants to start early.

The room is small, so registration closes early. Sign up in the Events section as soon as possible.`,
    },
    bg: {
      title: 'Учебна група преди изпитите',
      summary:
        'По-големите членове предлагат помощ по математика, физика и английски преди изпитите. Запишете се за учебната сесия в раздел „Събития“.',
      body: `Изпитите наближават и няколко по-големи членове предложиха да помогнат. Организираме учебна сесия, на която ще можете да работите по математика, физика или английски в малки групи.

Донесете темите, които ви затрудняват най-много, и собствените си записки. Сесията не е урок – тя е възможност да се учим един от друг, да задаваме въпроси без напрежение и да се упражняваме да обясняваме, което само по себе си е лидерско умение.

Съветниците ще присъстват, а залата ще бъде отворена час по-рано за всеки, който иска да започне по-рано.

Залата е малка, затова регистрацията приключва по-рано. Запишете се в раздел „Събития“ възможно най-скоро.`,
    },
  },
  {
    id: 'ann-ch1-attendance-briefing',
    status: 'published',
    audience: chapter('ch-1', 'leadership'),
    authorId: 'u-advisor',
    reviewerId: 'u-advisor',
    createdAt: [-6, '20:00'],
    publishedAt: [-5, '21:00'],
    en: {
      title: 'Officers: recording attendance in the portal',
      summary:
        'From this month the Scribe records attendance for every meeting and event in the portal instead of on paper.',
      body: `From this month, attendance for every working meeting and chapter event is recorded in the portal instead of on paper. The Scribe is responsible for it, and any officer can step in when the Scribe is absent.

Please record attendance within three days of the event. Mark members who let us know in advance as “Excused” rather than “Absent”.

The attendance records help the advisors notice early when a member stops coming, so that someone can reach out to him. They are only visible to officers and advisors.

Last month's events still need to be entered — the Parents' evening is the most urgent.`,
    },
    bg: {
      title: 'За длъжностните лица: отбелязване на присъствието в портала',
      summary:
        'От този месец Писарят отбелязва присъствието на всяка среща и събитие в портала вместо на хартия.',
      body: `От този месец присъствието на всяка работна среща и събитие на обителта се отбелязва в портала вместо на хартия. Отговорен е Писарят, а всяко длъжностно лице може да го замести, когато отсъства.

Моля, отбелязвайте присъствието до три дни след събитието. Членовете, които са ни уведомили предварително, отбелязвайте с „Извинено отсъствие“, а не с „Отсъства“.

Отчетите за присъствието помагат на съветниците да забележат навреме, когато някой член спре да идва, за да може някой да се свърже с него. Те са видими само за длъжностните лица и съветниците.

Събитията от миналия месец все още трябва да бъдат въведени – най-спешна е вечерта с родителите.`,
    },
  },
  // ---------------------------------------------------------------- other chapters, published
  {
    id: 'ann-ch2-unification-day',
    status: 'published',
    audience: chapter('ch-2'),
    authorId: 'u-p03',
    reviewerId: 'u-p04',
    createdAt: [-38, '19:00'],
    submittedAt: [-37, '20:00'],
    publishedAt: [-36, '19:00'],
    en: {
      title: 'Wreath-laying for Unification Day',
      summary:
        'Members of the Plovdiv chapter laid a wreath at the Unification monument and spoke with visitors about the history of 1885.',
      body: `On Unification Day members of our chapter laid a wreath at the Unification monument in the centre of Plovdiv. The short ceremony was followed by a walk through the old town, where the Master Councilor told the story of the events of 1885.

Several parents and younger brothers joined us, and passers-by stopped to ask what DeMolay is. It was a good reminder that patriotism is one of our cardinal virtues — and that it is best shown by example.

Thank you to everyone who came early to prepare the wreath. Our next programme dedicated to Bulgarian history will be part of Patriots' Day.`,
    },
    bg: {
      title: 'Поднасяне на венец за Деня на Съединението',
      summary:
        'Членовете на пловдивската обител поднесоха венец пред паметника на Съединението и разказаха на посетителите за историята от 1885 г.',
      body: `На Деня на Съединението членовете на обителта поднесоха венец пред паметника на Съединението в центъра на Пловдив. След кратката церемония последва разходка из Стария град, по време на която Главният съветник разказа за събитията от 1885 г.

Към нас се присъединиха няколко родители и по-малки братя, а минувачи спираха да питат какво е Дьо Моле. Това беше добро напомняне, че патриотизмът е една от нашите кардинални добродетели – и че се показва най-добре с личен пример.

Благодарим на всички, които дойдоха по-рано, за да подготвят венеца. Следващата ни програма, посветена на българската история, ще бъде част от Деня на патриотите.`,
    },
  },
  {
    id: 'ann-ch4-coastal-cleanup',
    status: 'published',
    audience: chapter('ch-4'),
    authorId: 'u-b01',
    reviewerId: 'u-b02',
    createdAt: [-16, '10:00'],
    submittedAt: [-15, '12:00'],
    publishedAt: [-14, '12:00'],
    en: {
      title: 'Coastal clean-up morning',
      summary:
        'Twelve members and parents collected rubbish along the beach. Next time we will bring more bags!',
      body: `Last Sunday twelve members and parents met early for a clean-up along the beach. In three hours we filled more than forty bags with plastic, glass and other rubbish, and separated what could be recycled.

The municipality's environmental team provided gloves and collected the bags afterwards. They told us that volunteer groups like ours make a real difference before the winter storms.

Thank you to everyone who came. We plan to make the clean-up a regular part of our programme — in spring we hope to invite members of other chapters to join us.`,
    },
    bg: {
      title: 'Сутрешно почистване на брега',
      summary:
        'Дванайсет членове и родители събраха отпадъци по плажа. Следващия път ще носим повече чували!',
      body: `Миналата неделя дванайсет членове и родители се събраха рано сутринта, за да почистят плажа. За три часа напълнихме над четирийсет чувала с пластмаса, стъкло и други отпадъци и отделихме това, което може да се рециклира.

Екологичният екип на общината осигури ръкавици и след това извози чувалите. Те ни казаха, че доброволчески групи като нашата имат истински принос преди зимните бури.

Благодарим на всички, които дойдоха. Планираме почистването да стане редовна част от програмата ни – през пролетта се надяваме да поканим и членове от другите обители.`,
    },
  },
  {
    id: 'ann-ch5-history-walk',
    status: 'published',
    audience: chapter('ch-5'),
    authorId: 'u-t01',
    reviewerId: 'u-t02',
    createdAt: [-11, '18:00'],
    submittedAt: [-10, '19:00'],
    publishedAt: [-9, '18:30'],
    translationStatus: { en: 'needs_review' },
    en: {
      title: 'History walk at Tsarevets',
      summary:
        'Join us for a guided walk around the Tsarevets fortress, prepared by members for members.',
      body: `Our next chapter activity is a history walk around the Tsarevets fortress. Three members have prepared short talks about the Second Bulgarian Kingdom, the fortress walls and the Patriarch's church.

We meet at the main gate. The walk takes about two hours and is suitable for everyone — just bring comfortable shoes and water. Entrance tickets are covered by the chapter.

After the walk we will discuss which period of Bulgarian history we would like to explore next. Ideas for Patriots' Day are especially welcome.

Reply in the Events section so we know how many tickets to buy.`,
    },
    bg: {
      title: 'Историческа разходка на Царевец',
      summary:
        'Присъединете се към разходка с беседа из крепостта Царевец, подготвена от членове за членове.',
      body: `Следващата дейност на обителта е историческа разходка из крепостта Царевец. Трима членове са подготвили кратки беседи за Второто българско царство, крепостните стени и Патриаршеската църква.

Срещата е пред главната порта. Разходката продължава около два часа и е подходяща за всички – носете удобни обувки и вода. Входните билети се поемат от обителта.

След разходката ще обсъдим кой период от българската история бихме искали да разгледаме следващия път. Идеите за Деня на патриотите са особено добре дошли.

Отговорете в раздел „Събития“, за да знаем колко билета да купим.`,
    },
  },
  {
    id: 'ann-ch3-welcome',
    status: 'published',
    audience: chapter('ch-3'),
    authorId: 'u-v03',
    reviewerId: 'u-v01',
    createdAt: [-23, '17:00'],
    submittedAt: [-22, '18:00'],
    publishedAt: [-21, '17:00'],
    en: {
      title: 'Welcome to our newest members',
      summary:
        'The Varna chapter welcomed two new members at its last meeting. Here is what to expect in the first months.',
      body: `At our last meeting we welcomed two new members to the chapter. Each of them has been paired with an older member who will help him find his way during the first months.

New members start with the welcome guide, take part in every working meeting and choose one activity they would like to help organise. After a few months they are ready to take on smaller roles at chapter events.

If you know a young man who might be interested in DeMolay, invite him to an open meeting. Joining always involves the young man and a parent, and starts with an introductory meeting with chapter representatives.`,
    },
    bg: {
      title: 'Добре дошли на най-новите ни членове',
      summary:
        'Варненската обител посрещна двама нови членове на последната си среща. Ето какво предстои през първите месеци.',
      body: `На последната ни среща посрещнахме двама нови членове в обителта. Всеки от тях има за наставник по-голям член, който ще му помага да се ориентира през първите месеци.

Новите членове започват с ръководството за нови членове, участват във всяка работна среща и избират една дейност, в чиято организация искат да помогнат. След няколко месеца са готови да поемат по-малки роли в събитията на обителта.

Ако познавате младеж, който може да се заинтересува от Дьо Моле, поканете го на открита среща. Присъединяването винаги включва младежа и негов родител и започва с опознавателна среща с представители на обителта.`,
    },
  },
  // ---------------------------------------------------------------- drafts
  {
    id: 'ann-ch1-draft-bazaar',
    status: 'draft',
    audience: chapter('ch-1'),
    authorId: 'u-officer',
    createdAt: [-1, '21:00'],
    translationStatus: { en: 'needs_review', bg: 'missing' },
    en: {
      title: 'Volunteers needed for the Christmas charity bazaar',
      summary: 'We need help with crafts, the stall rota and promotion. Sign up with the Almoner.',
      body: `This year our chapter will run a stall at the Christmas charity bazaar. Everything we raise will go to the family-type care centre we visited in the spring.

We need volunteers for three things: making crafts and decorations in the weeks before the bazaar, staffing the stall in two-hour shifts and promoting the bazaar at school and online.

[Draft — add the date, the place and the Bulgarian version before submitting.]`,
    },
  },
  {
    id: 'ann-nat-draft-workshops',
    status: 'draft',
    audience: national(),
    authorId: 'u-national-officer',
    createdAt: [-2, '11:00'],
    updatedAt: [-1, '16:00'],
    relatedIds: ['ann-nat-conference'],
    en: {
      title: 'National Conference: workshop line-up',
      summary: 'Eight workshops in two rounds — choose yours when you register.',
      body: `The workshop programme for the National Leadership Conference is ready. There will be eight workshops in two rounds, and every participant chooses one workshop per round when registering.

In the first round: running an effective meeting, public speaking, planning a service project and the basics of chapter finances. In the second round: mentoring new members, working with partners and sponsors, digital communication and a session on the seven cardinal virtues in everyday life.

Most workshops are led by advisors, and two are led by experienced officers. Each workshop has a limit of twenty participants, so popular sessions may fill up quickly.

The detailed descriptions will be available in the conference programme in Resources.`,
    },
    bg: {
      title: 'Национална конференция: програма на работилниците',
      summary: 'Осем работилници в два кръга – изберете своите при регистрацията.',
      body: `Програмата на работилниците за Националната лидерска конференция е готова. Ще има осем работилници в два кръга, като всеки участник избира по една работилница за кръг при регистрацията си.

В първия кръг: как се води ефективна среща, говорене пред публика, планиране на доброволческа инициатива и основи на финансите на обителта. Във втория кръг: наставничество на нови членове, работа с партньори и спонсори, дигитална комуникация и сесия за седемте кардинални добродетели в ежедневието.

Повечето работилници се водят от съветници, а две – от опитни длъжностни лица. Всяка работилница е за до двайсет участници, така че най-търсените може да се запълнят бързо.

Подробните описания ще бъдат включени в програмата на конференцията в раздел „Ресурси“.`,
    },
  },
  {
    id: 'ann-ch1-returned-bowling',
    status: 'draft',
    audience: chapter('ch-1'),
    authorId: 'u-officer',
    reviewerId: 'u-advisor',
    reviewNote:
      'Please add the cost per person and the meeting point in both languages, and mention that members under 16 need a parent’s permission.',
    createdAt: [-6, '19:00'],
    updatedAt: [-4, '09:30'],
    translationStatus: { en: 'needs_review', bg: 'needs_review' },
    en: {
      title: 'Bowling night for members',
      summary: 'A relaxed evening of bowling to start the term. Places are limited.',
      body: `To start the term we are going bowling together! It is a relaxed evening to get to know the newest members and spend time outside the meeting hall.

There are only eight places, so reply in Events as soon as possible. If you cannot come after all, change your reply so someone else can take your place.`,
    },
    bg: {
      title: 'Вечер на боулинг за членовете',
      summary: 'Спокойна вечер на боулинг за начало на срока. Местата са ограничени.',
      body: `За начало на срока отиваме заедно на боулинг! Това е спокойна вечер, в която да се опознаем с най-новите членове и да прекараме време извън залата за срещи.

Местата са само осем, затова отговорете в раздел „Събития“ възможно най-скоро. Ако все пак не можете да дойдете, променете отговора си, за да може някой друг да заеме мястото ви.`,
    },
  },
  // ---------------------------------------------------------------- submitted for review
  {
    id: 'ann-ch1-submitted-comfort',
    status: 'submitted',
    audience: chapter('ch-1'),
    authorId: 'u-officer',
    createdAt: [-2, '18:00'],
    submittedAt: [-1, '20:15'],
    translationStatus: { bg: 'needs_review' },
    relatedIds: ['ann-nat-day-of-comfort'],
    en: {
      title: 'Day of Comfort visit: sign up',
      summary:
        'We will visit a care home for elderly people and spend the afternoon with the residents. Twelve places.',
      body: `For this year's Day of Comfort our chapter will visit a care home for elderly people. We will spend the afternoon talking with the residents, playing board games and singing a few songs together.

There are twelve places, and at least two advisors will come with us. Please sign up in the Events section and stay for the short preparation meeting at the end of the next working meeting.

If you would like to make cards or small gifts in advance, bring them to the meeting — the Almoner will collect them.`,
    },
    bg: {
      title: 'Посещение за Деня на комфорта: запишете се',
      summary:
        'Ще посетим дом за възрастни хора и ще прекараме следобеда с живеещите там. Дванайсет места.',
      body: `За тазгодишния Ден на комфорта обителта ни ще посети дом за възрастни хора. Ще прекараме следобеда в разговори с живеещите там, ще играем настолни игри и ще изпеем заедно няколко песни.

Местата са дванайсет, а с нас ще дойдат поне двама съветници. Моля, запишете се в раздел „Събития“ и останете за кратката подготвителна среща в края на следващата работна среща.

Ако искате да направите картички или малки подаръци предварително, донесете ги на срещата – Милостинникът ще ги събере.`,
    },
  },
  {
    id: 'ann-ch1-submitted-library',
    status: 'submitted',
    audience: chapter('ch-1'),
    authorId: 'u-s01',
    createdAt: [-3, '16:00'],
    submittedAt: [-2, '17:40'],
    translationStatus: { bg: 'needs_review' },
    en: {
      title: 'The chapter library: borrow a leadership book',
      summary:
        'Twenty books on leadership, communication and history are now available to borrow at every meeting.',
      body: `Thanks to donations from advisors and parents, our chapter now has a small library of twenty books on leadership, communication, history and personal development.

Books can be borrowed at every working meeting for up to four weeks. The Scribe keeps the list of who has which book. When you return a book, share in two or three sentences what you found useful — we will collect the recommendations for future members.

If you have a book you would like to donate, bring it to the next meeting.`,
    },
    bg: {
      title: 'Библиотеката на обителта: вземете книга за лидерство',
      summary:
        'Двайсет книги за лидерство, комуникация и история вече могат да се заемат на всяка среща.',
      body: `Благодарение на дарения от съветници и родители обителта ни вече има малка библиотека от двайсет книги за лидерство, комуникация, история и личностно развитие.

Книгите могат да се заемат на всяка работна среща за до четири седмици. Писарят води списък кой коя книга е взел. Когато върнете книга, споделете в две-три изречения какво ви е било полезно – ще съберем препоръките за следващите членове.

Ако имате книга, която искате да дарите, донесете я на следващата среща.`,
    },
  },
  {
    id: 'ann-nat-submitted-survey',
    status: 'submitted',
    audience: national(),
    authorId: 'u-b03',
    createdAt: [-2, '10:00'],
    submittedAt: [-1, '12:00'],
    translationStatus: { en: 'needs_review' },
    en: {
      title: 'Youth voice: national survey for all members',
      summary:
        'Tell the national team what you want from DeMolay Bulgaria next year. The survey takes ten minutes.',
      body: `As National Master Councilor I want to make sure that next year's plans reflect what members actually want. That is why we are launching a short national survey for all members.

The survey asks about the activities you enjoy most, the topics you would like to learn about, how often you would like joint events with other chapters and how we can make meetings more useful.

It takes about ten minutes and is anonymous. The results will be presented at the National Leadership Conference, and every chapter will receive its own summary.

Thank you for taking the time — your answers will shape the programme.`,
    },
    bg: {
      title: 'Гласът на младите: национална анкета за всички членове',
      summary:
        'Кажете на националния екип какво искате от Дьо Моле България през следващата година. Анкетата отнема десет минути.',
      body: `Като Национален съветник искам плановете за следващата година да отразяват това, което членовете наистина искат. Затова започваме кратка национална анкета за всички членове.

Анкетата пита кои дейности харесвате най-много, за какви теми бихте искали да научите повече, колко често искате съвместни събития с другите обители и как можем да направим срещите по-полезни.

Попълването отнема около десет минути и е анонимно. Резултатите ще бъдат представени на Националната лидерска конференция, а всяка обител ще получи свое обобщение.

Благодарим ви за отделеното време – отговорите ви ще оформят програмата.`,
    },
  },
  // ---------------------------------------------------------------- archived
  {
    id: 'ann-nat-archived-camp',
    status: 'archived',
    audience: national(),
    authorId: 'u-national-officer',
    reviewerId: 'u-national-officer',
    createdAt: [-121, '10:00'],
    publishedAt: [-120, '10:00'],
    archivedAt: [-30, '10:00'],
    en: {
      title: 'Summer camp registration (closed)',
      summary:
        'Registration for the summer leadership camp is now closed. Thank you for the great interest!',
      body: `Registration for the summer leadership camp is closed — all places were taken within two weeks. Thank you for the great interest!

Registered participants will receive the packing list and the daily programme by message. If you are on the waiting list, we will contact you as soon as a place becomes available.`,
    },
    bg: {
      title: 'Регистрация за летния лагер (приключила)',
      summary: 'Регистрацията за летния лидерски лагер приключи. Благодарим за големия интерес!',
      body: `Регистрацията за летния лидерски лагер приключи – всички места бяха заети за две седмици. Благодарим за големия интерес!

Регистрираните участници ще получат списък с необходимия багаж и дневната програма със съобщение. Ако сте в списъка на чакащите, ще се свържем с вас веднага щом се освободи място.`,
    },
  },
  {
    id: 'ann-ch1-archived-photo-contest',
    status: 'archived',
    audience: chapter('ch-1'),
    authorId: 'u-officer',
    reviewerId: 'u-advisor',
    createdAt: [-92, '18:00'],
    submittedAt: [-91, '18:00'],
    publishedAt: [-90, '12:00'],
    archivedAt: [-50, '12:00'],
    en: {
      title: 'Photo contest: our chapter in pictures',
      summary:
        'Send your best photos from chapter activities. The winning photos will be printed for the meeting hall.',
      body: `We are collecting the best photos from this year's chapter activities. Send up to three photos with a short caption to the Scribe through the portal.

Only photos in which everyone pictured agreed to be photographed can take part. The winning photos will be printed and displayed in the meeting hall.`,
    },
    bg: {
      title: 'Фотоконкурс: обителта ни в снимки',
      summary:
        'Изпратете най-хубавите си снимки от дейностите на обителта. Наградените снимки ще бъдат отпечатани за залата.',
      body: `Събираме най-хубавите снимки от тазгодишните дейности на обителта. Изпратете до три снимки с кратко описание на Писаря през портала.

В конкурса участват само снимки, на които всички изобразени са се съгласили да бъдат снимани. Наградените снимки ще бъдат отпечатани и поставени в залата за срещи.`,
    },
  },
];

const time = (ctx: SeedContext, value: [number, string] | undefined): string | null =>
  value ? at(ctx, value[0], value[1]) : null;

export function seedAnnouncements(ctx: SeedContext): Announcement[] {
  return POSTS.map((s) => {
    const createdAt = at(ctx, s.createdAt[0], s.createdAt[1]);
    const submittedAt = time(ctx, s.submittedAt);
    const publishedAt = time(ctx, s.publishedAt);
    const archivedAt = time(ctx, s.archivedAt);
    const updatedAt =
      time(ctx, s.updatedAt) ?? archivedAt ?? publishedAt ?? submittedAt ?? createdAt;
    const translations: Announcement['translations'] = {};
    if (s.en) translations.en = s.en;
    if (s.bg) translations.bg = s.bg;
    return {
      id: s.id,
      status: s.status,
      audience: s.audience,
      chapterId: s.audience.scope === 'chapter' ? (s.audience.chapterIds[0] ?? null) : null,
      pinned: s.pinned ?? false,
      translations,
      translationStatus: {
        en: s.translationStatus?.en ?? (s.en ? 'reviewed' : 'missing'),
        bg: s.translationStatus?.bg ?? (s.bg ? 'reviewed' : 'missing'),
      },
      authorId: s.authorId,
      createdAt,
      updatedAt,
      submittedAt,
      publishedAt,
      archivedAt,
      reviewerId: s.reviewerId ?? null,
      reviewNote: s.reviewNote ?? null,
      attachments: s.attachments ?? [],
      relatedIds: s.relatedIds ?? [],
    };
  });
}

/** Read receipts: which demo users have already read which published posts. */
const READS: Record<ID, ID[]> = {
  'u-member': [
    'ann-nat-scholarship',
    'ann-nat-branding',
    'ann-nat-privacy',
    'ann-nat-obligatory-days',
    'ann-ch1-food-drive',
    'ann-ch1-meeting-schedule',
  ],
  'u-officer': [
    'ann-nat-frank-land',
    'ann-nat-day-of-comfort',
    'ann-nat-scholarship',
    'ann-nat-branding',
    'ann-nat-privacy',
    'ann-nat-obligatory-days',
    'ann-ch1-installation',
    'ann-ch1-food-drive',
    'ann-ch1-meeting-schedule',
    'ann-ch1-attendance-briefing',
  ],
  'u-advisor': [
    'ann-nat-conference',
    'ann-nat-scholarship',
    'ann-nat-branding',
    'ann-nat-privacy',
    'ann-nat-obligatory-days',
    'ann-ch1-installation',
    'ann-ch1-food-drive',
    'ann-ch1-meeting-schedule',
    'ann-ch1-study-group',
    'ann-ch1-attendance-briefing',
  ],
  'u-national-officer': [
    'ann-nat-conference',
    'ann-nat-frank-land',
    'ann-nat-day-of-comfort',
    'ann-nat-obligatory-days',
    'ann-multi-service-weekend',
    'ann-nat-leadership-briefing',
    'ann-ch2-unification-day',
  ],
  'u-admin': [
    'ann-nat-scholarship',
    'ann-nat-branding',
    'ann-nat-privacy',
    'ann-nat-leadership-briefing',
    'ann-nat-obligatory-days',
    'ann-ch3-welcome',
  ],
  'u-s01': ['ann-nat-conference', 'ann-ch1-installation', 'ann-ch1-food-drive'],
  'u-s07': ['ann-ch1-installation', 'ann-ch1-meeting-schedule'],
};

export function seedReadReceipts(ctx: SeedContext, posts: readonly Announcement[]): ReadReceipt[] {
  const receipts: ReadReceipt[] = [];
  for (const [userId, postIds] of Object.entries(READS)) {
    for (const postId of postIds) {
      const post = posts.find((p) => p.id === postId);
      if (!post?.publishedAt) continue;
      const readAt = new Date(
        Math.min(Date.parse(post.publishedAt) + 3 * 3600 * 1000, ctx.now.getTime() - 60_000),
      ).toISOString();
      receipts.push({ id: `${postId}:${userId}`, postId, userId, readAt });
    }
  }
  return receipts;
}
