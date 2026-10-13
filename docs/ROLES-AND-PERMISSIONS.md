<!-- Source: github.com/joro2404/jacques-web @ 60e5909 (ROLES-AND-PERMISSIONS.md), imported 2026-10-13. Keep in sync with the source; local notes go in DECISIONS.md. -->

# Roles and permissions

LAST UPDATED: 14 September 2026
MODEL: Claude Opus 5, extended reasoning
SCOPE OF CHANGE: first issue
STATUS: active. Named holders to be supplied by the product owner

---

## 1. Two dimensions

Member type governs what a person sees. Role governs what a person does. A person always has one member type and zero or more roles.

## 2. Member types

| Type | DeM ID | Sees |
|---|---|---|
| Active member | Yes | Everything in the member area. Age 14 to 21 |
| Senior | Yes | Same read access as an advisor. Loses access on expulsion |
| Advisor | Yes | Everything in the member area |
| Parent | Linked to one or more members | Feed, announcements, calendar, documents, rituals, library, payments for linked children. No directory, no posting |
| Alumni | No | Public content and own donation history. Release 3 |
| Donor | No | Public content and own donation history. Release 3 |

## 3. Roles

National scope:

| Code | Role |
|---|---|
| `sysadmin` | System administrator. The National Representative plus two to three deputies |
| `exec_director` | Executive Director |
| `nat_rep` | National Representative |
| `nat_mc` | National Master Councillor |
| `nat_sec` | National Secretary |
| `nat_coord` | National Coordinator |
| `nat_treas` | National Treasurer |

Chapter scope, one set per chapter:

| Code | Role |
|---|---|
| `ch_chairman` | Chapter Chairman. The single advisor point of contact for the chapter |
| `ch_mc` | Chapter Master Councillor |
| `ch_sc` | Senior Councillor |
| `ch_jc` | Junior Councillor |
| `ch_sec` | Chapter Secretary |
| `ch_treas` | Chapter Treasurer |
| `advisor` | General advisor, held nationally |

## 4. Permission matrix

Legend: Y allowed, C allowed within own chapter, S submit for approval, blank not allowed.

| Capability | sysadmin | exec_director | nat_rep | nat_sec | nat_coord | nat_mc | nat_treas | ch_chairman | ch_mc | ch_sc / ch_jc | ch_sec | ch_treas | advisor | parent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Read feed, calendar, documents, rituals, library | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| Read member directory | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | |
| Publish national post | Y | Y | Y | Y | Y | Y | | | | | | | | |
| Publish chapter post | Y | Y | Y | Y | Y | | | C | C | | | | | |
| Submit post for approval | Y | Y | Y | Y | Y | Y | | Y | Y | S | S | | | |
| Approve chapter post | Y | Y | Y | Y | Y | | | C | | | | | | |
| Upload national document | Y | Y | Y | Y | Y | | | | | | | | | |
| Upload chapter minutes | Y | Y | Y | Y | | | | C | | | C | | | |
| Create chapter event | Y | Y | Y | Y | Y | | | C | C | | | | | |
| Approve chapter event | Y | Y | Y | Y | Y | | | C | | | | | | |
| Approve new accounts | Y | Y | Y | Y | Y | | | | | | | | | |
| Assign roles | Y | | | | | | | | | | | | | |
| View all payments and dues | Y | Y | Y | | | | Y | | | | | | | |
| View chapter dues status | Y | Y | Y | | | | Y | C | | | | C | | |
| Record cash or transfer payment | Y | | | | | | Y | | | | | C | | |
| Pay own dues | | | | | | | | | | | | | | Y for linked children |
| Send mass email | Y | Y | Y | Y | Y | | | | | | | | | |
| Manage chapter roster | Y | Y | Y | Y | | | | C | | | C | | | |
| Read audit log | Y | | | | | | | | | | | | | |
| Raise a helpdesk ticket | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| Answer helpdesk tickets | Y | | | | | | | | | | | | | |

## 5. Rules that sit behind the matrix

- Chapter output is approved by the Chapter Chairman. National output is approved by a national officer. Nothing published by a member under 18 reaches the public site without an adult approval.
- Role assignment belongs to system administrators alone. No officer grants themselves or a peer a role.
- Every approval, rejection and role change writes to `audit_log`.
- Roles carry a term. Rotation ends a term and starts another. History stays.
- A person with no role and member type `active`, `senior` or `advisor` reads everything and publishes nothing.
- Parents never see the directory, never post, and see payments only for their linked children.
- Suspension or expulsion revokes every role immediately.

## 6. To be supplied

Named holders of the five Chapter Chairman posts and of each national office, so roles are seeded rather than guessed.
