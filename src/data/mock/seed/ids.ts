/**
 * Seed ids worth knowing for demos and E2E tests. Stable across reseeds;
 * dates are relative to the seed time.
 */
export const SEED_IDS = {
  chapters: {
    sofia: 'ch-1',
    plovdiv: 'ch-2',
    varna: 'ch-3',
    burgas: 'ch-4',
    tarnovo: 'ch-5',
  },
  events: {
    /** Upcoming ch-1 ceremony, capacity 60 — the member demo user has NOT replied yet. */
    memberCanRsvp: 'ev-ch1-installation',
    /** Upcoming ch-1 service visit, 10 of 12 places taken (organizers-only participant list). */
    almostFull: 'ev-ch1-day-of-comfort',
    /** Upcoming ch-1 social, 8 of 8 places taken ("going" is rejected with event.full). */
    full: 'ev-ch1-bowling',
    /** Upcoming ch-1 session whose registration deadline has already passed. */
    deadlinePassed: 'ev-ch1-study-session',
    /** Upcoming ch-1 meeting the member already replied "going" to. */
    memberGoing: 'ev-ch1-meeting-next',
    /** Cancelled ch-1 event (reason set; RSVP'd members were notified). */
    cancelled: 'ev-ch1-hike-cancelled',
    /** ch-1 draft — visible only to officers/advisors/admins in scope. */
    draft: 'ev-ch1-draft-bazaar',
    /** Past ch-1 event WITHOUT attendance (officer "required action"). */
    pastWithoutAttendance: 'ev-ch1-past-parents-evening',
    /** Past ch-1 event with attendance recorded. */
    pastWithAttendance: 'ev-ch1-past-meeting',
    /** National conference (member replied "maybe"). */
    nationalConference: 'ev-nat-conference',
    /** National online workshop, organizers-only participant list, member not replied. */
    nationalOnline: 'ev-nat-public-speaking',
  },
  posts: {
    /** Pinned national announcement (unread for the member). */
    nationalPinned: 'ann-nat-conference',
    /** Pinned ch-1 announcement. */
    chapterPinned: 'ann-ch1-installation',
    /** ch-1 posts submitted for review — the advisor demo user can publish or return them. */
    advisorCanPublish: 'ann-ch1-submitted-comfort',
    advisorCanPublish2: 'ann-ch1-submitted-library',
    /** National draft by the national officer demo user (complete EN+BG → can be published). */
    nationalDraft: 'ann-nat-draft-workshops',
    /** National submission (by the National Master Councilor) awaiting national review. */
    nationalSubmitted: 'ann-nat-submitted-survey',
    /** Officer demo user's draft (Bulgarian missing → cannot be submitted until translated). */
    officerDraft: 'ann-ch1-draft-bazaar',
    /** Officer's draft returned by the advisor with a review note. */
    officerReturned: 'ann-ch1-returned-bowling',
    /** National leadership-only announcement (hidden from members). */
    nationalLeadership: 'ann-nat-leadership-briefing',
    /** ch-1 leadership-only announcement. */
    chapterLeadership: 'ann-ch1-attendance-briefing',
    /** Multi-chapter (Plovdiv + Burgas) announcement. */
    multiChapter: 'ann-multi-service-weekend',
    archived: 'ann-nat-archived-camp',
  },
  resources: {
    chapterSpecific: 'res-ch1-welcome-pack',
    leadershipOnly: 'res-youth-protection',
    archived: 'res-officer-handbook-2024',
  },
  members: {
    /** Suspended account in ch-1 (advisor/admin can reactivate; can't sign in). */
    suspended: 'u-s10',
    /** Pending account in ch-1 (awaiting activation). */
    pending: 'u-s11',
    /** Multi-chapter advisor (manual override: ch-1 + ch-5). */
    multiChapterAdvisor: 'u-s12',
    /** Member with an unmapped imported position (NAT_INSPECTOR). */
    unmappedPosition: 'u-b04',
    /** Hidden from the directory (privacy setting). */
    hiddenFromDirectory: 'u-s09',
    /** Does not accept in-app messages. */
    noMessages: 'u-s05',
  },
  roles: {
    /** Admin CRUD candidates. */
    mappingToEdit: 'map-ch-chaplain',
    inactiveMapping: 'map-ch-sentinel-legacy',
    activeSpecialAssignment: 'sa-welcome-pack',
    expiredSpecialAssignment: 'sa-charity-run',
    scheduledSpecialAssignment: 'sa-conference-comms',
    revokedSpecialAssignment: 'sa-plovdiv-publish',
  },
  sync: {
    latestJob: 'sync-006',
    failedJob: 'sync-004',
    openUnmappedException: 'exc-inspector-unmapped',
    openConflictException: 'exc-conflict-home-chapter',
  },
} as const;
