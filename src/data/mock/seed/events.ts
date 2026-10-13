import type {
  AttendanceRecord,
  AttendanceStatus,
  Event,
  EventCategory,
  EventLocation,
  EventNote,
  EventStatus,
  EventTranslation,
  ID,
  Locale,
  ParticipantVisibility,
  RSVP,
  RsvpStatus,
  TranslationState,
} from '@/domain';

import { at, lt, type SeedContext } from './context';

/**
 * Events (fictional): upcoming and past, national and chapter, every category, varied capacity
 * (one almost full, one full), deadlines (one already passed for an upcoming event), both
 * participant-visibility settings, one cancelled, one draft, organizer notes, RSVPs and attendance.
 */

type When = [number, string];

interface EventSeed {
  id: ID;
  status: EventStatus;
  chapterId: ID | null;
  category: EventCategory;
  starts: When;
  ends: When;
  location: EventLocation;
  organizerId: ID;
  capacity: number | null;
  deadline?: When;
  visibility: ParticipantVisibility;
  published?: When;
  created: When;
  cancelled?: { at: When; reason: string };
  translationStatus?: Partial<Record<Locale, TranslationState>>;
  en?: EventTranslation;
  bg?: EventTranslation;
  notes?: Array<{ id: ID; authorId: ID; at: When; body: string }>;
  rsvps?: Array<[ID, RsvpStatus]>;
  attendance?: { by: ID; at: When; records: Array<[ID, AttendanceStatus]> };
}

const hall = (cityEn: string, cityBg: string): EventLocation => ({
  name: lt('Chapter meeting hall (demo venue)', 'Зала на обителта (демо място)'),
  address: lt(
    `Central ${cityEn} — exact address shared with members (fictional)`,
    `Център на ${cityBg} – точният адрес се изпраща на членовете (измислен)`,
  ),
  online: false,
  url: null,
});

const SOFIA_HALL = hall('Sofia', 'София');

const ONLINE = (url: string): EventLocation => ({
  name: lt('Online', 'Онлайн'),
  address: lt(
    'Link shared with registered participants',
    'Връзката се изпраща на записаните участници',
  ),
  online: true,
  url,
});

const going = (...ids: ID[]): Array<[ID, RsvpStatus]> => ids.map((id) => [id, 'going']);

export const EVENT_SEEDS: EventSeed[] = [
  // ------------------------------------------------------------------ upcoming, ch-1
  {
    id: 'ev-ch1-meeting-next',
    status: 'published',
    chapterId: 'ch-1',
    category: 'meeting',
    starts: [5, '11:00'],
    ends: [5, '13:00'],
    location: SOFIA_HALL,
    organizerId: 'u-officer',
    capacity: null,
    visibility: 'members',
    created: [-11, '18:00'],
    published: [-10, '10:00'],
    notes: [
      {
        id: 'note-meeting-key',
        authorId: 'u-officer',
        at: [-2, '19:30'],
        body: 'Hall key: collect it from the advisor the evening before.',
      },
    ],
    rsvps: [
      ...going('u-member', 'u-officer', 'u-advisor', 'u-s01', 'u-s02', 'u-s04', 'u-s06', 'u-s07'),
      ['u-s03', 'maybe'],
      ['u-s12', 'maybe'],
      ['u-s08', 'not_going'],
    ],
    en: {
      title: 'Working meeting: public speaking',
      summary:
        'Regular working meeting: chapter business, officer reports and a practical session on public speaking.',
      description: `Our regular working meeting starts with chapter business and reports from the officers. After a short break, the Orator leads a practical session on speaking in front of a group — come ready to say a few words about yourself.

Please arrive ten minutes early so we can start on time. If you cannot come, let the Secretary know in advance.`,
    },
    bg: {
      title: 'Работна среща: говорене пред публика',
      summary:
        'Редовна работна среща: текущи въпроси, отчети на длъжностните лица и практическа сесия за говорене пред публика.',
      description: `Редовната ни работна среща започва с текущите въпроси на обителта и отчетите на длъжностните лица. След кратка почивка Ораторът ще води практическа сесия за говорене пред група – елате готови да кажете няколко думи за себе си.

Моля, елате десет минути по-рано, за да започнем навреме. Ако не можете да дойдете, уведомете предварително Секретаря.`,
    },
  },
  {
    id: 'ev-ch1-installation',
    status: 'published',
    chapterId: 'ch-1',
    category: 'ceremony',
    starts: [12, '17:00'],
    ends: [12, '20:00'],
    location: SOFIA_HALL,
    organizerId: 'u-officer',
    capacity: 60,
    deadline: [10, '23:59'],
    visibility: 'members',
    created: [-7, '18:00'],
    published: [-6, '12:00'],
    notes: [
      {
        id: 'note-installation-certificates',
        authorId: 'u-advisor',
        at: [-3, '21:00'],
        body: 'Certificates are ordered — collect them from the print shop two days before the ceremony.',
      },
    ],
    rsvps: [
      ...going(
        'u-officer',
        'u-advisor',
        'u-s01',
        'u-s02',
        'u-s03',
        'u-s04',
        'u-s05',
        'u-s06',
        'u-s07',
        'u-s08',
        'u-s12',
        'u-admin',
      ),
      ['u-s09', 'maybe'],
      ['u-national-officer', 'maybe'],
    ],
    en: {
      title: 'Installation of officers',
      summary:
        'Public installation ceremony for the new officers of Sveta Sofia, followed by a reception. Families and friends welcome.',
      description: `The new officers of Sveta Sofia will be installed at a public ceremony. Parents, relatives, friends and members of other chapters are warmly invited to attend.

The ceremony takes about an hour and is followed by a reception prepared by the members. Officers arrive an hour early for the final rehearsal. Please reply so we know how many guests to expect.`,
    },
    bg: {
      title: 'Инсталиране на длъжностните лица',
      summary:
        'Открита церемония по инсталиране на новите длъжностни лица на „Света София“, последвана от коктейл. Семействата и приятелите са добре дошли.',
      description: `Новите длъжностни лица на „Света София“ ще бъдат инсталирани на открита церемония. Родители, роднини, приятели и членове на другите обители са сърдечно поканени.

Церемонията продължава около час, след което следва коктейл, подготвен от членовете. Длъжностните лица идват един час по-рано за последна репетиция. Моля, отговорете, за да знаем колко гости да очакваме.`,
    },
  },
  {
    id: 'ev-ch1-day-of-comfort',
    status: 'published',
    chapterId: 'ch-1',
    category: 'service',
    starts: [19, '14:00'],
    ends: [19, '17:00'],
    location: {
      name: lt(
        'Care home for elderly people, Sofia (demo venue)',
        'Дом за възрастни хора, София (демо място)',
      ),
      address: lt('Shared with registered participants', 'Изпраща се на записаните участници'),
      online: false,
      url: null,
    },
    organizerId: 'u-officer',
    capacity: 12,
    deadline: [16, '20:00'],
    visibility: 'organizers',
    created: [-2, '17:00'],
    published: [-1, '21:00'],
    rsvps: [
      ...going(
        'u-officer',
        'u-advisor',
        'u-s01',
        'u-s02',
        'u-s03',
        'u-s04',
        'u-s06',
        'u-s07',
        'u-s08',
        'u-s12',
      ),
      ['u-s05', 'maybe'],
    ],
    en: {
      title: 'Day of Comfort: care home visit',
      summary:
        'An afternoon with the residents of a care home for elderly people: conversation, board games and songs.',
      description: `For the Day of Comfort we will spend an afternoon with the residents of a care home for elderly people. We will talk, play board games and sing a few songs together.

Two advisors come with the group. Please do not bring food — the home has asked visitors not to. Hand-made cards are very welcome.`,
    },
    bg: {
      title: 'Ден на комфорта: посещение в дом за възрастни хора',
      summary: 'Следобед с живеещите в дом за възрастни хора: разговори, настолни игри и песни.',
      description: `За Деня на комфорта ще прекараме следобеда с живеещите в дом за възрастни хора. Ще си говорим, ще играем настолни игри и ще изпеем заедно няколко песни.

С групата идват двама съветници. Моля, не носете храна – домът е помолил посетителите за това. Ръчно направените картички са добре дошли.`,
    },
  },
  {
    id: 'ev-ch1-bowling',
    status: 'published',
    chapterId: 'ch-1',
    category: 'social',
    starts: [8, '18:30'],
    ends: [8, '21:00'],
    location: {
      name: lt('Bowling centre, Sofia (demo venue)', 'Боулинг център, София (демо място)'),
      address: lt('22 Demo Blvd, Sofia (fictional)', 'бул. „Демо“ 22, София (измислен адрес)'),
      online: false,
      url: null,
    },
    organizerId: 'u-officer',
    capacity: 8,
    deadline: [7, '18:00'],
    visibility: 'members',
    created: [-7, '12:00'],
    published: [-6, '19:00'],
    rsvps: [
      ...going('u-officer', 'u-s01', 'u-s02', 'u-s03', 'u-s04', 'u-s06', 'u-s07', 'u-s08'),
      ['u-s09', 'maybe'],
    ],
    en: {
      title: 'Bowling night',
      summary: 'A relaxed evening of bowling to start the term. Eight places.',
      description: `A relaxed evening of bowling to get to know the newest members. Lanes are booked for two and a half hours.

The chapter covers the lane fee; drinks are paid individually. If you can't come after all, change your reply so someone else can take your place.`,
    },
    bg: {
      title: 'Вечер на боулинг',
      summary: 'Спокойна вечер на боулинг за начало на срока. Осем места.',
      description: `Спокойна вечер на боулинг, в която да се опознаем с най-новите членове. Пистите са резервирани за два часа и половина.

Обителта поема наема на пистите, а напитките се плащат индивидуално. Ако все пак не можете да дойдете, променете отговора си, за да може някой друг да заеме мястото ви.`,
    },
  },
  {
    id: 'ev-ch1-study-session',
    status: 'published',
    chapterId: 'ch-1',
    category: 'education',
    starts: [3, '10:00'],
    ends: [3, '13:00'],
    location: SOFIA_HALL,
    organizerId: 'u-s01',
    capacity: 20,
    deadline: [-1, '20:00'],
    visibility: 'members',
    created: [-8, '15:00'],
    published: [-7, '16:00'],
    rsvps: [...going('u-s01', 'u-s02', 'u-s03', 'u-s05', 'u-s08'), ['u-s09', 'maybe']],
    en: {
      title: 'Exam study session',
      summary: 'Study in small groups with older members: maths, physics and English.',
      description: `Older members help younger ones prepare for exams in small groups: maths, physics and English. Bring your notes and the topics you find hardest.

Registration closed early because the room is small. Advisors will be present throughout.`,
    },
    bg: {
      title: 'Учебна сесия преди изпитите',
      summary: 'Учим в малки групи с по-големите членове: математика, физика и английски.',
      description: `По-големите членове помагат на по-малките да се подготвят за изпитите в малки групи: математика, физика и английски. Донесете записките си и темите, които ви затрудняват най-много.

Регистрацията приключи по-рано, защото залата е малка. Съветниците ще присъстват през цялото време.`,
    },
  },
  {
    id: 'ev-ch1-hike-cancelled',
    status: 'cancelled',
    chapterId: 'ch-1',
    category: 'social',
    starts: [6, '08:00'],
    ends: [6, '16:00'],
    location: {
      name: lt('Vitosha Nature Park', 'Природен парк Витоша'),
      address: lt(
        'Meeting point: the bus stop at the foot of the mountain (demo)',
        'Среща: спирката в подножието на планината (демо)',
      ),
      online: false,
      url: null,
    },
    organizerId: 'u-officer',
    capacity: 25,
    deadline: [4, '20:00'],
    visibility: 'members',
    created: [-12, '17:00'],
    published: [-11, '18:00'],
    cancelled: {
      at: [-1, '09:15'],
      reason:
        'Severe weather warning for the mountain — we will choose a new date at the next working meeting.',
    },
    rsvps: [...going('u-member', 'u-s01', 'u-s04', 'u-s06'), ['u-s07', 'maybe']],
    en: {
      title: 'Hiking day on Vitosha',
      summary: 'A day hike with lunch at a mountain hut.',
      description: `A full-day hike on Vitosha with lunch at a mountain hut. The route is suitable for beginners, but you need proper hiking shoes and warm clothes.

We meet at the bus stop at 8:00 and return by 16:00.`,
    },
    bg: {
      title: 'Преход във Витоша',
      summary: 'Еднодневен преход с обяд в планинска хижа.',
      description: `Еднодневен преход във Витоша с обяд в планинска хижа. Маршрутът е подходящ за начинаещи, но са необходими подходящи туристически обувки и топли дрехи.

Срещата е на спирката в 8:00 ч., а връщането – до 16:00 ч.`,
    },
  },
  {
    id: 'ev-ch1-draft-bazaar',
    status: 'draft',
    chapterId: 'ch-1',
    category: 'fundraiser',
    starts: [45, '10:00'],
    ends: [45, '18:00'],
    location: {
      name: lt('Christmas charity bazaar (place to be confirmed)', ''),
      address: lt('', ''),
      online: false,
      url: null,
    },
    organizerId: 'u-officer',
    capacity: null,
    visibility: 'members',
    created: [-1, '21:30'],
    translationStatus: { en: 'needs_review', bg: 'missing' },
    en: {
      title: 'Christmas charity bazaar',
      summary: 'Our stall at the Christmas charity bazaar — crafts, decorations and hot drinks.',
      description: `The chapter will run a stall at the Christmas charity bazaar. Proceeds go to the family-type care centre we visited in the spring.

To do before publishing: confirm the place, the stall rota and the Bulgarian version.`,
    },
  },
  // ------------------------------------------------------------------ upcoming, national
  {
    id: 'ev-nat-conference',
    status: 'published',
    chapterId: null,
    category: 'conference',
    starts: [33, '09:00'],
    ends: [34, '17:00'],
    location: {
      name: lt(
        'Conference centre, Plovdiv (demo venue)',
        'Конферентен център, Пловдив (демо място)',
      ),
      address: lt(
        '1 Primerna Sq, Plovdiv (fictional)',
        'пл. „Примерен“ 1, Пловдив (измислен адрес)',
      ),
      online: false,
      url: null,
    },
    organizerId: 'u-national-officer',
    capacity: 120,
    deadline: [25, '23:59'],
    visibility: 'members',
    created: [-5, '10:00'],
    published: [-3, '10:05'],
    notes: [
      {
        id: 'note-conference-hotel',
        authorId: 'u-national-officer',
        at: [-2, '14:00'],
        body: 'Hotel block reserved for 80 people; release unused rooms ten days before the conference.',
      },
    ],
    rsvps: [
      ...going(
        'u-national-officer',
        'u-officer',
        'u-advisor',
        'u-admin',
        'u-s01',
        'u-s02',
        'u-s12',
        'u-p01',
        'u-p02',
        'u-p03',
        'u-p04',
        'u-v01',
        'u-v02',
        'u-b01',
        'u-b02',
        'u-b03',
        'u-t01',
        'u-t02',
      ),
      ['u-member', 'maybe'],
      ['u-s07', 'maybe'],
      ['u-b05', 'maybe'],
      ['u-v03', 'not_going'],
    ],
    en: {
      title: 'National Leadership Conference 2026',
      summary:
        'Two days of workshops, elections and fellowship for members, officers and advisors from every chapter.',
      description: `The National Leadership Conference brings together members, officers and advisors from every chapter. Day one is dedicated to workshops in two rounds; on day two the delegates elect the National Master Councilor and the conference closes with a joint ceremony.

Members under 18 need a signed parental consent form. Travel and accommodation details are sent to registered participants.`,
    },
    bg: {
      title: 'Национална лидерска конференция 2026',
      summary:
        'Два дни с обучения, избори и приятелство за членове, длъжностни лица и съветници от всички обители.',
      description: `Националната лидерска конференция събира членове, длъжностни лица и съветници от всички обители. Първият ден е посветен на работилници в два кръга, а през втория делегатите избират Национален съветник и конференцията завършва със съвместна церемония.

Членовете под 18 години се нуждаят от подписана декларация за съгласие от родител. Подробности за пътуването и настаняването се изпращат на регистрираните участници.`,
    },
  },
  {
    id: 'ev-nat-public-speaking',
    status: 'published',
    chapterId: null,
    category: 'education',
    starts: [15, '19:00'],
    ends: [15, '20:30'],
    location: ONLINE('https://meet.example.org/demolay-public-speaking'),
    organizerId: 'u-national-officer',
    capacity: 40,
    deadline: [14, '12:00'],
    visibility: 'organizers',
    created: [-9, '11:00'],
    published: [-8, '09:00'],
    rsvps: [
      ...going('u-s07', 'u-s01', 'u-p03', 'u-v02', 'u-t03'),
      ['u-b05', 'maybe'],
      ['u-officer', 'maybe'],
    ],
    en: {
      title: 'Public speaking workshop (online)',
      summary:
        'A practical online workshop: structure a short speech and deliver it with confidence.',
      description: `In this online workshop you will learn how to structure a short speech, how to open and close it and how to handle nerves. Every participant gives a one-minute speech and receives friendly feedback.

You need a computer or phone with a camera and microphone. The meeting link is sent to registered participants the day before.`,
    },
    bg: {
      title: 'Работилница по ораторско майсторство (онлайн)',
      summary: 'Практическа онлайн работилница: как да подредим кратка реч и да я изнесем уверено.',
      description: `В тази онлайн работилница ще научите как да подредите кратка реч, как да я започнете и завършите и как да се справите с притеснението. Всеки участник изнася едноминутна реч и получава приятелска обратна връзка.

Необходими са компютър или телефон с камера и микрофон. Връзката за срещата се изпраща на записаните участници предишния ден.`,
    },
  },
  // ------------------------------------------------------------------ upcoming, other chapters
  {
    id: 'ev-ch2-football',
    status: 'published',
    chapterId: 'ch-2',
    category: 'sports',
    starts: [22, '10:00'],
    ends: [22, '15:00'],
    location: {
      name: lt(
        'School sports ground, Plovdiv (demo venue)',
        'Училищно игрище, Пловдив (демо място)',
      ),
      address: lt('14 Demo St, Plovdiv (fictional)', 'ул. „Демо“ 14, Пловдив (измислен адрес)'),
      online: false,
      url: null,
    },
    organizerId: 'u-p03',
    capacity: 48,
    deadline: [18, '20:00'],
    visibility: 'members',
    created: [-6, '18:00'],
    published: [-5, '10:00'],
    rsvps: [...going('u-p01', 'u-p02', 'u-p03', 'u-p05', 'u-national-officer'), ['u-p04', 'maybe']],
    en: {
      title: 'Inter-chapter football tournament',
      summary:
        'Five-a-side football with teams from several chapters. Players and supporters welcome.',
      description: `The Plovdiv chapter hosts a five-a-side football tournament for teams from several chapters. Each chapter can register up to two teams of six players; supporters are just as welcome.

The tournament ends with a short award ceremony and a picnic. Bring sports shoes, water and your chapter's spirit!`,
    },
    bg: {
      title: 'Междуобителски футболен турнир',
      summary:
        'Футбол на малки вратички с отбори от няколко обители. Добре дошли са играчи и запалянковци.',
      description: `Пловдивската обител е домакин на турнир по футбол на малки вратички за отбори от няколко обители. Всяка обител може да запише до два отбора по шестима играчи, а запалянковците са също толкова добре дошли.

Турнирът завършва с кратка церемония по награждаване и пикник. Носете спортни обувки, вода и духа на своята обител!`,
    },
  },
  {
    id: 'ev-ch4-cleanup',
    status: 'published',
    chapterId: 'ch-4',
    category: 'service',
    starts: [11, '09:00'],
    ends: [11, '12:00'],
    location: {
      name: lt(
        'Beach, Burgas (meeting point at the north entrance)',
        'Плажът в Бургас (среща при северния вход)',
      ),
      address: lt('Burgas', 'Бургас'),
      online: false,
      url: null,
    },
    organizerId: 'u-b01',
    capacity: 30,
    visibility: 'members',
    created: [-4, '12:00'],
    published: [-4, '13:00'],
    rsvps: [...going('u-b01', 'u-b02', 'u-b05'), ['u-b04', 'maybe']],
    en: {
      title: 'Coastal clean-up',
      summary: 'Help clean the beach before the winter storms. Gloves and bags provided.',
      description: `We meet on the beach for our regular clean-up. The municipality provides gloves and bags and collects the rubbish afterwards.

Wear clothes you don't mind getting dirty and bring water. Members under 16 come with a parent or with an advisor's written permission.`,
    },
    bg: {
      title: 'Почистване на брега',
      summary:
        'Помогнете да почистим плажа преди зимните бури. Ръкавиците и чувалите се осигуряват.',
      description: `Събираме се на плажа за редовното ни почистване. Общината осигурява ръкавици и чували и след това извозва отпадъците.

Облечете дрехи, които не ви е жал да изцапате, и носете вода. Членовете под 16 години идват с родител или с писмено разрешение от съветник.`,
    },
  },
  {
    id: 'ev-ch5-history-walk',
    status: 'published',
    chapterId: 'ch-5',
    category: 'education',
    starts: [16, '10:30'],
    ends: [16, '12:30'],
    location: {
      name: lt('Tsarevets fortress, main gate', 'Крепостта Царевец, главната порта'),
      address: lt('Veliko Tarnovo', 'Велико Търново'),
      online: false,
      url: null,
    },
    organizerId: 'u-t01',
    capacity: 25,
    deadline: [14, '18:00'],
    visibility: 'members',
    created: [-10, '17:00'],
    published: [-9, '18:40'],
    translationStatus: { en: 'needs_review' },
    rsvps: going('u-t01', 'u-t02', 'u-t03', 'u-s12'),
    en: {
      title: 'History walk at Tsarevets',
      summary: 'A two-hour walk around the fortress with short talks prepared by members.',
      description: `Three members have prepared short talks about the Second Bulgarian Kingdom, the fortress walls and the Patriarch's church. We meet at the main gate.

The walk takes about two hours. Entrance tickets are covered by the chapter — reply so we know how many to buy.`,
    },
    bg: {
      title: 'Историческа разходка на Царевец',
      summary: 'Двучасова разходка из крепостта с кратки беседи, подготвени от членове.',
      description: `Трима членове са подготвили кратки беседи за Второто българско царство, крепостните стени и Патриаршеската църква. Срещата е пред главната порта.

Разходката продължава около два часа. Входните билети се поемат от обителта – отговорете, за да знаем колко да купим.`,
    },
  },
  {
    id: 'ev-ch3-meeting',
    status: 'published',
    chapterId: 'ch-3',
    category: 'meeting',
    starts: [9, '16:00'],
    ends: [9, '18:00'],
    location: hall('Varna', 'Варна'),
    organizerId: 'u-v03',
    capacity: null,
    visibility: 'members',
    created: [-6, '10:00'],
    published: [-6, '10:30'],
    rsvps: going('u-v01', 'u-v02', 'u-v03', 'u-admin'),
    en: {
      title: 'Working meeting: conference delegates',
      summary:
        'Monthly working meeting of the Varna chapter: plans for the conference and the Day of Comfort.',
      description: `At this month's working meeting we will choose our delegates for the National Leadership Conference and plan the Day of Comfort visit.

New members are especially welcome — it's a good meeting to see how the chapter plans its activities.`,
    },
    bg: {
      title: 'Работна среща: делегати за конференцията',
      summary:
        'Месечна работна среща на варненската обител: планове за конференцията и Деня на комфорта.',
      description: `На тазмесечната работна среща ще изберем делегатите си за Националната лидерска конференция и ще планираме посещението за Деня на комфорта.

Новите членове са особено добре дошли – на тази среща ще видят как обителта планира дейностите си.`,
    },
  },
  // ------------------------------------------------------------------ past
  {
    id: 'ev-ch1-past-meeting',
    status: 'published',
    chapterId: 'ch-1',
    category: 'meeting',
    starts: [-9, '11:00'],
    ends: [-9, '13:00'],
    location: SOFIA_HALL,
    organizerId: 'u-officer',
    capacity: null,
    visibility: 'members',
    created: [-21, '18:00'],
    published: [-20, '10:00'],
    rsvps: [
      ...going(
        'u-member',
        'u-officer',
        'u-advisor',
        'u-s01',
        'u-s02',
        'u-s04',
        'u-s06',
        'u-s07',
        'u-s08',
      ),
      ['u-s03', 'not_going'],
      ['u-s05', 'maybe'],
    ],
    attendance: {
      by: 'u-officer',
      at: [-8, '10:00'],
      records: [
        ['u-member', 'present'],
        ['u-officer', 'present'],
        ['u-advisor', 'present'],
        ['u-s01', 'present'],
        ['u-s02', 'present'],
        ['u-s03', 'excused'],
        ['u-s04', 'present'],
        ['u-s05', 'absent'],
        ['u-s06', 'present'],
        ['u-s07', 'present'],
        ['u-s08', 'present'],
        ['u-s09', 'absent'],
      ],
    },
    en: {
      title: 'Working meeting: term planning',
      summary: "Working meeting: planning the term's activities and the food drive report.",
      description: `We planned the term's activities and heard the Almoner's report on the food drive.

The minutes are available from the Secretary.`,
    },
    bg: {
      title: 'Работна среща: планиране на срока',
      summary: 'Работна среща: планиране на дейностите за срока и отчет за кампанията за храна.',
      description: `Планирахме дейностите за срока и изслушахме отчета на Милостинника за кампанията за храна.

Протоколът може да се получи от Секретаря.`,
    },
  },
  {
    id: 'ev-ch1-past-food-drive',
    status: 'published',
    chapterId: 'ch-1',
    category: 'service',
    starts: [-16, '10:00'],
    ends: [-16, '16:00'],
    location: {
      name: lt(
        'Neighbourhood supermarkets, Sofia (demo venues)',
        'Квартални супермаркети, София (демо места)',
      ),
      address: lt('Two collection points (fictional)', 'Два пункта за събиране (измислени)'),
      online: false,
      url: null,
    },
    organizerId: 'u-officer',
    capacity: 16,
    visibility: 'organizers',
    created: [-30, '18:00'],
    published: [-29, '10:00'],
    rsvps: [
      ...going('u-member', 'u-officer', 'u-s01', 'u-s04', 'u-s05', 'u-s06', 'u-s08'),
      ['u-s02', 'maybe'],
    ],
    attendance: {
      by: 'u-officer',
      at: [-15, '18:00'],
      records: [
        ['u-member', 'present'],
        ['u-officer', 'present'],
        ['u-s01', 'present'],
        ['u-s02', 'present'],
        ['u-s04', 'present'],
        ['u-s05', 'present'],
        ['u-s06', 'excused'],
        ['u-s08', 'present'],
      ],
    },
    en: {
      title: 'Winter food drive',
      summary: 'Collecting food and household items for families supported by a local charity.',
      description: `Members staff two collection points in front of neighbourhood supermarkets. Everything collected goes to a local charity that supports families in need.

Wear the chapter T-shirt and bring a warm jacket.`,
    },
    bg: {
      title: 'Зимна кампания за храна',
      summary:
        'Събиране на храна и домашни потреби за семейства, подкрепяни от местна благотворителна организация.',
      description: `Членовете поемат два пункта за събиране пред квартални супермаркети. Всичко събрано се предава на местна благотворителна организация, която подкрепя нуждаещи се семейства.

Облечете тениската на обителта и вземете топло яке.`,
    },
  },
  {
    id: 'ev-ch1-past-parents-evening',
    status: 'published',
    chapterId: 'ch-1',
    category: 'ceremony',
    starts: [-30, '18:00'],
    ends: [-30, '20:30'],
    location: SOFIA_HALL,
    organizerId: 'u-officer',
    capacity: 70,
    deadline: [-32, '20:00'],
    visibility: 'members',
    created: [-45, '18:00'],
    published: [-44, '10:00'],
    rsvps: going(
      'u-member',
      'u-officer',
      'u-advisor',
      'u-s01',
      'u-s02',
      'u-s03',
      'u-s04',
      'u-s06',
      'u-s07',
      'u-s08',
      'u-s12',
    ),
    en: {
      title: "Parents' evening",
      summary:
        "An evening for parents and guardians: the Flower Talk, a presentation of the chapter's year and a reception.",
      description: `An evening dedicated to the parents, guardians and mentors of our members. The programme includes the Flower Talk, a short presentation of the chapter's activities and a reception.

Each member is welcome to bring his family.`,
    },
    bg: {
      title: 'Вечер с родителите',
      summary:
        'Вечер за родителите и настойниците: „Беседа за цветята“, представяне на годината на обителта и коктейл.',
      description: `Вечер, посветена на родителите, настойниците и наставниците на нашите членове. Програмата включва „Беседа за цветята“, кратко представяне на дейностите на обителта и коктейл.

Всеки член е добре дошъл да доведе семейството си.`,
    },
  },
  {
    id: 'ev-nat-past-portal-briefing',
    status: 'published',
    chapterId: null,
    category: 'education',
    starts: [-20, '19:00'],
    ends: [-20, '20:00'],
    location: ONLINE('https://meet.example.org/demolay-portal-briefing'),
    organizerId: 'u-national-officer',
    capacity: 50,
    visibility: 'organizers',
    created: [-28, '10:00'],
    published: [-27, '10:00'],
    rsvps: going('u-officer', 'u-advisor', 'u-s01', 'u-p01', 'u-p04', 'u-v02', 'u-b01', 'u-t01'),
    attendance: {
      by: 'u-national-officer',
      at: [-19, '09:00'],
      records: [
        ['u-officer', 'present'],
        ['u-advisor', 'present'],
        ['u-s01', 'present'],
        ['u-p01', 'present'],
        ['u-p04', 'absent'],
        ['u-v02', 'present'],
        ['u-b01', 'excused'],
      ],
    },
    en: {
      title: 'Online briefing: introducing the member portal',
      summary:
        'A short online session showing officers and advisors how to use the new member portal.',
      description: `A one-hour online session for officers and advisors: publishing announcements, creating events, recording attendance and protecting members' privacy in the new portal.

The recording is available to officers on request.`,
    },
    bg: {
      title: 'Онлайн среща: представяне на портала за членове',
      summary:
        'Кратка онлайн сесия, в която длъжностните лица и съветниците научават как да използват новия портал за членове.',
      description: `Едночасова онлайн сесия за длъжностни лица и съветници: публикуване на съобщения, създаване на събития, отбелязване на присъствие и опазване на личните данни на членовете в новия портал.

Записът е достъпен за длъжностните лица при поискване.`,
    },
  },
  {
    id: 'ev-ch2-past-wreath',
    status: 'published',
    chapterId: 'ch-2',
    category: 'ceremony',
    starts: [-36, '10:00'],
    ends: [-36, '11:30'],
    location: {
      name: lt('Unification monument, Plovdiv', 'Паметникът на Съединението, Пловдив'),
      address: lt('Plovdiv city centre', 'Центърът на Пловдив'),
      online: false,
      url: null,
    },
    organizerId: 'u-p03',
    capacity: null,
    visibility: 'members',
    created: [-44, '18:00'],
    published: [-43, '10:00'],
    rsvps: going('u-p01', 'u-p02', 'u-p03', 'u-p04', 'u-p05'),
    attendance: {
      by: 'u-p03',
      at: [-35, '19:00'],
      records: [
        ['u-p01', 'present'],
        ['u-p02', 'present'],
        ['u-p03', 'present'],
        ['u-p04', 'present'],
        ['u-p05', 'present'],
        ['u-national-officer', 'present'],
      ],
    },
    en: {
      title: 'Unification Day wreath-laying',
      summary:
        'Wreath-laying at the Unification monument, followed by a history walk in the old town.',
      description: `We lay a wreath at the Unification monument and walk through the old town, where the Master Councilor tells the story of 1885.

Formal dress.`,
    },
    bg: {
      title: 'Поднасяне на венец за Деня на Съединението',
      summary:
        'Поднасяне на венец пред паметника на Съединението и историческа разходка из Стария град.',
      description: `Поднасяме венец пред паметника на Съединението и се разхождаме из Стария град, където Главният съветник разказва за събитията от 1885 г.

Официално облекло.`,
    },
  },
];

export interface EventsSeed {
  events: Event[];
  rsvps: RSVP[];
  attendance: AttendanceRecord[];
}

export function seedEvents(ctx: SeedContext): EventsSeed {
  const out: EventsSeed = { events: [], rsvps: [], attendance: [] };
  const when = (value: When): string => at(ctx, value[0], value[1]);
  for (const s of EVENT_SEEDS) {
    const createdAt = when(s.created);
    const publishedAt = s.published ? when(s.published) : null;
    const cancelledAt = s.cancelled ? when(s.cancelled.at) : null;
    const notes: EventNote[] = (s.notes ?? []).map((n) => ({
      id: n.id,
      authorId: n.authorId,
      body: n.body,
      createdAt: when(n.at),
    }));
    const translations: Event['translations'] = {};
    if (s.en) translations.en = s.en;
    if (s.bg) translations.bg = s.bg;
    out.events.push({
      id: s.id,
      status: s.status,
      scope: s.chapterId ? 'chapter' : 'national',
      chapterId: s.chapterId,
      category: s.category,
      translations,
      translationStatus: {
        en: s.translationStatus?.en ?? (s.en ? 'reviewed' : 'missing'),
        bg: s.translationStatus?.bg ?? (s.bg ? 'reviewed' : 'missing'),
      },
      startsAt: when(s.starts),
      endsAt: when(s.ends),
      location: s.location,
      organizerId: s.organizerId,
      capacity: s.capacity,
      registrationDeadline: s.deadline ? when(s.deadline) : null,
      participantVisibility: s.visibility,
      notes,
      cancelledReason: s.cancelled?.reason ?? null,
      cancelledAt,
      publishedAt,
      imageUrl: null,
      createdBy: s.organizerId,
      createdAt,
      updatedAt: cancelledAt ?? notes.at(-1)?.createdAt ?? publishedAt ?? createdAt,
    });

    // Replies are spread deterministically between publication and the earlier of the deadline /
    // start / seed time.
    const replyFrom = Date.parse(publishedAt ?? createdAt);
    const replyUntil = Math.min(
      Date.parse(s.deadline ? when(s.deadline) : when(s.starts)),
      ctx.now.getTime() - 3600 * 1000,
    );
    const span = Math.max(0, replyUntil - replyFrom);
    (s.rsvps ?? []).forEach(([userId, status], index, all) => {
      const fraction = all.length <= 1 ? 0.5 : index / (all.length - 1);
      out.rsvps.push({
        id: `${s.id}:${userId}`,
        eventId: s.id,
        userId,
        status,
        respondedAt: new Date(replyFrom + Math.round(span * (0.1 + 0.8 * fraction))).toISOString(),
      });
    });

    if (s.attendance) {
      const recordedAt = when(s.attendance.at);
      for (const [userId, status] of s.attendance.records) {
        out.attendance.push({
          id: `${s.id}:${userId}`,
          eventId: s.id,
          userId,
          status,
          recordedBy: s.attendance.by,
          recordedAt,
        });
      }
    }
  }
  return out;
}
