<!-- Source: github.com/joro2404/jacques-web @ 60e5909 (DESIGN-SYSTEM.md), imported 2026-10-13. Keep in sync with the source; local notes go in DECISIONS.md. -->

# Design system

LAST UPDATED: 14 September 2026
MODEL: Claude Opus 5, extended reasoning
SCOPE OF CHANGE: rewritten against the DeMolay International Brand Center, superseding the palette and typography taken from the 2025 HTML draft
STATUS: active. Binding on every screen, document and social asset

---

## 1. Authority

The single source is the DeMolay International Brand Center at https://beademolay.org/brand-center/ and the font guideline at https://beademolay.org/wp-content/uploads/2022/06/DeMolay-International-Font-Guideline.pdf, together with the full guidelines PDF linked from that page. DI states that this version replaces every earlier set of brand guidelines.

Nothing in this file overrides DI. Where this file and DI disagree, DI wins and this file is corrected.

Bulgaria adds nothing to the identity beyond language. The separation between DeMolay International and DeMolay Bulgaria is one of content and jurisdiction, not of visual identity.

## 2. Brand marks

The keystone mark is the DeMolay and Stars lockup, adopted in 2014. DI states it replaced every previous logo used by DeMolay International and its jurisdictions as the corporate brand mark.

| Asset | Source |
|---|---|
| Full colour lockup | https://beademolay.org/wp-content/uploads/2022/03/DeMolay-Logo_FC-01-1024x330.png |
| White lockup, for dark backgrounds | https://beademolay.org/wp-content/uploads/2022/03/DeMolay-Logo_White.png |
| DeMolay International emblem, colour | https://beademolay.org/wp-content/uploads/2026/03/DeMolay-International-Emblem-COLOR-1024x1024.png |
| Full logo and campaign pack | https://app.air.inc/a/blIneJOUP |
| Photography library | https://app.air.inc/a/bYZK4zrWc |
| Auxiliary emblems, Priory, Squires, 1949 | linked from the Brand Center |

Rules:

- Vector (.EPS) for print, apparel and signage. Raster (PNG) for web, social and video, kept at modest scale to avoid distortion.
- Use the white lockup on Oxford Blue and on photography. Use the full colour lockup on white and on light neutrals.
- Never recolour, stretch, rotate, outline, add effects to, or place the lockup on a busy background.
- Clear space and minimum size follow the DI guidelines PDF. Download it and hold it in the repository under `/docs/brand/`.
- Favicon and application icon derive from the DI emblem, not from a self-made seal.

## 3. Colour palette

Every colour on the site comes from this table. Nothing else.

| Token | Name | Hex |
|---|---|---|
| `oxford` | Oxford Blue, primary | #1E4488 |
| `oxford-shade` | Oxford Blue, shade | #1B365F |
| `gold` | Crown Gold, primary | #FFCF00 |
| `gold-shade` | Crown Gold, shade | #EAAB00 |
| `sapphire` | Sapphire Blue, primary | #0076AF |
| `sapphire-tint` | Sapphire Blue, tint | #72C7F6 |
| `sapphire-shade` | Sapphire Blue, shade | #005695 |
| `ruby` | Ruby Red, primary | #AC242A |
| `ruby-tint` | Ruby Red, tint | #EE2633 |
| `ruby-shade` | Ruby Red, shade | #661D34 |
| `beacon` | Beacon Orange, primary | #FF6727 |
| `beacon-tint` | Beacon Orange, tint | #FF8F29 |
| `beacon-shade` | Beacon Orange, shade | #C7362D |
| `emerald` | Emerald Green, primary | #3A9144 |
| `emerald-tint` | Emerald Green, tint | #6CC351 |
| `emerald-shade` | Emerald Green, shade | #00694B |

Neutrals, the minimum an interface needs and no more:

| Token | Hex | Use |
|---|---|---|
| `white` | #FFFFFF | Base |
| `paper` | #F5F7FA | Alternating section background |
| `ink` | #1B365F | Body text. Oxford Blue shade, so no new colour enters |
| `line` | #D9DFEA | Borders and dividers |

The draft's #0D1F3C, #2C3E50, #607488, #F7F8FC, #EEF1F8 and #DDE3EE are removed. They are not DeMolay colours.

Usage:

- Oxford Blue carries the identity. Navigation, hero, footer, primary buttons.
- Crown Gold is the accent and nothing else: calls to action, statistics, section rules, hover states. Gold never carries body text on white, since contrast fails.
- Sapphire supports Oxford for links, section tags and informational states.
- Ruby marks urgency and errors. Beacon marks warnings and time-critical events. Emerald marks success and confirmations.
- No gradients other than Oxford Blue to Oxford Blue shade. No invented tints.

## 4. Typography

| Face | Role | Licence |
|---|---|---|
| Soleil | Logotype and branded headline support | Purchase, MyFonts or Adobe Fonts |
| Lato | Free substitute for Soleil, permitted for non-logo use | Google Fonts, free |
| Crimson Pro | Serif, chapter and jurisdiction materials, long-form copy | Google Fonts, free |
| Mongoose | Condensed display | Purchase, MyFonts or Adobe Fonts |
| Bebas Neue | Free substitute for Mongoose | Google Fonts, free |

Decision for the platform: Lato for interface and body, Crimson Pro for editorial headings and long reads, Bebas Neue for display numerals and campaign-style statements. Licensed faces are added later if the organisation buys them; the substitutes are the approved fallbacks and no visual rework follows.

Playfair Display and DM Sans are removed everywhere.

Scale:

| Element | Face | Weight | Size |
|---|---|---|---|
| Hero headline | Bebas Neue | 400 | clamp(2.6rem, 5vw, 4.4rem), uppercase |
| Section title | Crimson Pro | 700 | clamp(1.9rem, 3.5vw, 2.7rem) |
| Statistic numeral | Bebas Neue | 400 | 2.4rem |
| Section tag | Lato | 700 | 0.75rem, uppercase, letter-spacing 0.14em |
| Body | Lato | 400 | 1rem, line-height 1.7 |
| Small and caption | Lato | 400 | 0.85rem |
| Button | Lato | 700 | 0.9rem |

Self-host all three faces. No runtime request to Google, which removes a third-party dependency and the associated cookie question.

Cyrillic: Lato and Crimson Pro both ship Cyrillic. Bebas Neue does not. Bulgarian display text therefore uses Lato Black in uppercase with wide tracking rather than a substitute condensed face, so the two languages stay consistent in weight and colour.

## 5. Voice

DI's mission is to shape young men into leaders of character, expressed through seven precepts: Filial Love, Reverence for Sacred Things, Courtesy, Comradeship, Fidelity, Cleanness and Patriotism. The Bulgarian site names all seven in both languages, in that order, matching DI rather than reordering them.

"The Road Begins Here" is the current DI campaign and its assets are available in the brand pack. If Bulgaria adopts it, the Bulgarian rendering is agreed once and used everywhere, never translated ad hoc per poster.

## 6. Components

- Navigation: fixed, 70px, Oxford Blue shade at 97% opacity, white lockup on the left, Crown Gold underline on hover, language toggle, gold call to action, hamburger below 768px.
- Announcement strip: Crown Gold background, Oxford Blue shade text, one line, reserved for genuine headline achievements with a review date.
- Hero: Oxford Blue to Oxford Blue shade, subtle pattern at low opacity, gold accent, white lockup.
- Statistic card: translucent white on Oxford, Crown Gold numeral in Bebas Neue.
- Card grid: four columns, two below 1100px, one below 480px. 14px radius, `line` border, gold top rule on hover.
- Event item: white card, 4px left border in Oxford, Ruby where time-critical, Beacon for deadlines.
- Buttons: primary Crown Gold on Oxford Blue shade text; secondary outlined white on dark, outlined Oxford on light. One primary per view.
- Forms: white card, `line` borders, Oxford focus ring, full-width submit.
- Footer: Oxford Blue shade, white lockup, Crown Gold column headings.

## 7. Mobile

Design at 360px first. Breakpoints 480, 768, 900, 1100. Tap targets 44px minimum. Grids collapse to one column below 480px. The member area is a single column with bottom navigation. Nothing depends on hover, because the audience runs from 14 to 60.

## 8. Accessibility

AA contrast against every background. Crown Gold never carries text on white. Body text never below 0.85rem. Visible focus on every interactive element. Alternative text on every image. Labelled fields, not placeholder-only.

## 9. Changes required to the 2025 draft

1. Replace Playfair Display and DM Sans with Lato, Crimson Pro and Bebas Neue.
2. Replace #0D1F3C with Oxford Blue shade #1B365F. Remove #2C3E50, #607488, #F7F8FC, #EEF1F8, #DDE3EE.
3. Replace the circular 2020 seal with the approved DI lockup pending the outcome of item 1 in section 11.
4. Membership age reads 12 to 21 throughout. Change to 14 to 21, both languages, including the enquiry form.
5. Remove the broken script block, a stray `}, 800);` with no opening statement, which halts execution and disables the form handler.
6. Move base64 logos and photographs out of the markup into files, which removes around 250KB from the HTML.
7. Replace the Cloudflare email obfuscation with a contact form or server-rendered addresses.
8. Replace emoji with a consistent icon set drawn from the DI brand pack.
9. Remove or implement the disabled `.reveal` animations.
10. Source or remove the Saint Marina partner card and the partners section, per the decision to defer partners.
11. Attach a source and review date to the statistics: 500+ volunteer hours, 20,000+ EUR donated, second fastest growing jurisdiction 2023.

## 10. Restrictions

DI states that third parties outside the organisation, meaning anyone selling for personal profit, may not use any part of the DeMolay visual identity without written approval from the Board of Directors. This binds our developers and any print or merchandise supplier the organisation engages. Written approval is obtained before any external vendor touches the marks.

## 11. Open items

1. Request a Bulgaria jurisdictional logo from the DeMolay Service and Leadership Center. Bulgaria is absent from the jurisdictional logo index, which lists France, Germany, Italy, Romania and Greece under Region 10. Until an approved mark exists, the DI lockup plus a Bulgarian wordmark set in Lato is the interim solution.
2. Download the full guidelines PDF and store it under `/docs/brand/` so clear space, minimum sizes and misuse examples sit in the repository rather than behind a link.
3. Decide whether Bulgaria adopts "The Road Begins Here" and, if so, agree the Bulgarian wording once.
4. Confirm whether the organisation will licence Soleil and Mongoose, or stay on the free substitutes permanently.
