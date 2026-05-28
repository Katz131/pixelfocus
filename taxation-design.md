# Taxation System + Tax Office Building — Design Document
**Version:** v3.23.496 | **Status:** Design Only (NO CODING)
**Date:** 2026-05-27 (revised v3)

---

## CONCEPT

A mid-to-late-game system where the "government" begins issuing **weekly tax bills** once your operation reaches a certain size. Every 7 days, a bill is generated based on that week's taxable income. The player must **visit the Tax Office** (a dedicated unlockable building/page) to view and pay their bill. Taxes are never auto-deducted — the player always chooses whether to pay.

### Thematic Fit
The textile dystopia's arc: you build a factory → it gets big → the government notices → a new building appears on your map: the Tax Office. You can walk in and settle your account, or you can walk past it. The existing Legal Department and Lobbying Office already gesture at government interaction — taxation makes that relationship mechanical and consequential.

### Key Design Principles
- **Taxes are a WEEKLY BILL.** One bill every 7 days. Not daily, not per-earning.
- **You pay at the Tax Office.** A separate building/page you unlock. That's where you go to check your bill and decide what to do.
- **Evasion is possible but risky.** Walk past the Tax Office every week and things escalate — audits, fines, operational penalties.
- **Crypto and brokerage income are TAX EXEMPT** (per user specification)
- Players should have multiple strategies: pay dutifully, lobby for reduction, evade and gamble, or play the appeal system.

---

## THE TAX OFFICE (tax-office.html)

A dedicated building/page, like brokerage or research. Unlocks automatically when you cross the income threshold — a button appears on the main popup alongside the other building buttons.

### Unlock Gate
- `lifetimeCoins >= 50,000` (you've earned enough for the government to notice)
- No upgrade purchase required — the government finds YOU

When the gate triggers, a narrative event fires: "A new building has appeared on the district map. It was always there, of course. You simply hadn't earned enough to warrant its attention."

### Building Button
Appears on the main popup alongside FACTORY, GALLERY, HOUSE, etc. Icon: 🏛️ or a pixel-art government building. Label: "TAX OFFICE". Locked/greyed out until unlock gate is met. Tooltip when locked: "The government hasn't noticed you yet."

---

## HOW TAX BILLS WORK

### Weekly Cycle
Every 7 days (tracked via `state.taxWeekStartDate`), the system tallies the week's taxable income and generates a single bill. This happens at day rollover on the 7th day.

| Field | Value |
|-------|-------|
| Amount | `taxableIncomeThisWeek × effectiveTaxRate` |
| Issued | Day rollover on the 7th day of the tax week |
| Grace period | 7 more days to pay (next tax week) |
| Status | `unpaid` → `paid` / `overdue` / `evaded` |

If taxable income for the week was $0, no bill is generated. The tax week counter resets regardless.

### Bill Lifecycle
```
ISSUED (every 7 days at day rollover)
  ├── Player visits Tax Office and pays → PAID (good standing)
  ├── 7 days pass (next bill arrives) → OVERDUE (interest begins)
  │     ├── Player pays (with interest) → PAID
  │     └── 7 more days (another bill) → EVADED (escalating consequences)
  │           ├── Player pays (with penalty) → PAID
  │           └── Consequences stack until paid
  └── Player files appeal at Tax Office → APPEALED (see Appeals)
```

So the rhythm is: every week you get a new bill. You have until the NEXT bill arrives to pay the current one. After that it's overdue. After another week it's evaded.

### What Gets Taxed (Tracked Weekly)
- Combo burst payouts
- Marathon threshold bonuses
- End-of-day streak bonus
- Passive streak trickle
- Challenge winnings
- Wind-down check-in rewards

### What Does NOT Get Taxed
- **Brokerage capital gains** (crypto, stocks, funds) — TAX EXEMPT
- **Gallery art sales** — considered "cultural" activity
- **Focus session textiles** — in-kind, not monetary
- **CK Buddy rewards** — cross-extension, outside jurisdiction
- Double-down bonuses — "off the books" gamble

### Tracking Taxable Income
`awardCoins()` gets a `taxable` flag (default `true`). When `taxable: true`, the amount is added to `state.taxableIncomeThisWeek`. At the weekly rollover, this becomes the bill amount × rate. The weekly tracker resets to 0.

```
awardCoins(amount, reason, { taxable: true })   // adds to taxableIncomeThisWeek
awardCoins(amount, reason, { taxable: false })   // brokerage, gallery, etc.
```

No money is deducted at this point — just tracked.

---

## TAX BRACKETS

Tax kicks in once `lifetimeCoins >= 50,000` (roughly mid-game). Before that threshold, the Tax Office doesn't exist and no bills are generated.

| Bracket | Lifetime Coins | Tax Rate | Label |
|---------|---------------|----------|-------|
| 0 | < $50K | 0% | Below the radar |
| 1 | $50K – $200K | 8% | Cottage assessment |
| 2 | $200K – $1M | 15% | Regional levy |
| 3 | $1M – $10M | 22% | Industrial tariff |
| 4 | $10M – $100M | 30% | Corporate extraction |
| 5 | $100M – $1B | 38% | Sovereign tithe |
| 6 | $1B+ | 45% | Imperial tribute |

---

## PAYING TAXES (At the Tax Office)

The Tax Office is the ONLY place to pay. No pay button on the main popup — you have to visit the building. This makes it feel like a deliberate trip, not a dismissable notification.

### Option A: Pay On Time
Visit the Tax Office before the next bill arrives. Click PAY. Full amount deducted from coins. Bill marked `paid`. Good standing maintained.

### Option B: Pay Late (Overdue)
Didn't visit in time? The bill is now overdue. Interest accrues: **5% per week** on the unpaid amount. You can still pay at the Tax Office (original + accrued interest).

### Option C: Ignore / Evade
After 3 weeks total (1 grace + 2 overdue), the bill is marked `evaded`. Consequences escalate:

| Evasion Level | Trigger | Consequence |
|--------------|---------|-------------|
| 1 | First evaded bill | Audit risk +15%. Warning memo dispatched. |
| 2 | 2 evaded bills | All upgrade costs +10%. "Compliance surcharge." |
| 3 | 3 evaded bills | Employee morale hit (wellbeing -10). |
| 4 | 5+ evaded bills | Passive income halved. "Your accounts have been flagged." |
| 5 | 10+ evaded bills | All penalties stack. "The Department has noted your creative approach to civic obligation." |

### Clearing Evasion
Visit the Tax Office and pay all outstanding bills (including interest/penalties) to reset evasion level. Or use Lobbying/Legal mechanisms to get bills forgiven.

---

## TAX OFFICE PAGE LAYOUT (tax-office.html)

Header: "DEPARTMENT OF REVENUE" with pixel art government seal and the brokerage-style digital clock.

**1. Current Bill**
Big prominent card showing this week's bill:
- Amount owed
- Due date (countdown: "Due in X days")
- PAY button (big, green when affordable, grey when broke)
- APPEAL button (if eligible)
- Status indicator (current / overdue / evaded)

**2. Outstanding Bills** (if any unpaid from previous weeks)
- Scrollable list of past-due bills with amount + interest
- PAY button on each
- PAY ALL button to clear everything at once

**3. Tax Status Panel**
- Current bracket + rate
- Effective rate (after all reductions from Legal/Lobbying/Institutions)
- Active loopholes/exemptions list
- Weekly taxable income tracker (running total for current week)
- Evasion level indicator (0 = clean, escalating warning colors)

**4. Filing Cabinet** (Appeals + Deductions)
- Appeal interface for current bill
- Charitable donation interface
- Weekly forgiveness petition (if Lobbying L7+)
- Offshore account toggle (if Lobbying L5+)

**5. Audit History**
- Recent audits + outcomes
- Audit risk meter (probability display with breakdown)

**6. Treasury Report** (flavor text, rotates)
Where your tax money "goes":
- "Municipal thread infrastructure: 34%"
- "Loom safety inspections: 22%"
- "The Committee on Committees: 18%"
- "Administrative refreshments: 15%"
- "Actual public services: 11%"

---

## TAX REDUCTION MECHANISMS

### 1. Legal Department Synergy (Existing Upgrade)
Each Legal Department level reduces effective tax rate:
- L1-L2: -1% each
- L3-L4: -2% each
- L5-L7: -3% each
Maximum legal reduction: ~15% off the bracket rate.

### 2. Lobbying Office Synergy (Existing Upgrade)
- L5: Unlock "Offshore Textile Accounts" — shelter up to 20% of weekly income from taxation
- L7: "Regulatory Capture: Tax Division" — flat -5% rate
- L9+: Rate capped at 10% regardless of bracket

### 3. Filing Appeals (Tax Office Mechanic)
Once per bill, you can file a "tax appeal" — a mini-challenge:
- Complete a specific objective (e.g., "Focus for 60 minutes today")
- Success: bill reduced by 50%
- Failure: no penalty, bill remains at full amount
- Appeal window closes when bill goes overdue

### 4. Ratiocinatory Institutions
- **Standing Office**: -2% tax rate per level
- **Enquiry Bureau**: Audit protection (reduces audit probability)
- **Personnel Ministry**: Employee wages become tax-deductible (payroll subtracted from taxable income)
- **Audit Department**: Reduces YOUR audit risk

### 5. Charitable Donations (Tax Office)
Spend money on "charitable" causes to reduce future bills:
- Donate to "The Weavers' Benevolent Fund": $X → reduces this week's taxable income by 2×$X
- Donate to "Thread Preservation Society": $X → reduces tax rate by 0.5% for the week

### 6. Bill Forgiveness (Lobbying L7+)
Once per month, petition to have one overdue/evaded bill forgiven entirely. "The Department of Revenue has graciously reconsidered your assessment."

---

## TAX AUDITS

Random chance each week (checked at bill generation time):

| Modifier | Effect on Audit Chance |
|----------|----------------------|
| Base | 5% per week |
| Per overdue bill | +3% each |
| Per evaded bill | +5% each |
| Enquiry Bureau | -1% per level |
| Audit Department | -1% per level |
| Clean record (0 evaded) | -2% |

Audit outcome:
- Evaded bills exist: fine = 2× total evaded amount. Bills force-collected (only time money is taken without consent).
- Overdue bills exist: interest doubled. Warning issued.
- Clean: "Audit passed. The inspector notes your exemplary paperwork." (+$50 token refund)

---

## UI ON MAIN POPUP

The Tax Office button appears alongside other building buttons when unlocked. A small indicator dot shows bill status:
- **Green dot**: All bills paid, good standing
- **Yellow dot**: Unpaid bill within grace period
- **Orange dot**: Overdue bill(s)
- **Red dot (pulsing)**: Evaded bill(s), consequences active

No pay button on the main popup. No dismissable banner. Just the dot on the building button — you have to go inside to deal with it.

---

## STATE FIELDS (Proposed)

```javascript
// Tax Office
taxOfficeUnlocked: false,         // Tax Office building visible
taxBracket: 0,                    // current bracket (0-6)
taxRateEffective: 0,              // computed effective rate after reductions
taxableIncomeThisWeek: 0,         // running tally of taxable earnings (reset weekly)
taxWeekStartDate: '',             // date string when current tax week started
taxBills: [],                     // [{id, amount, issuedAt, dueAt, status, interest, appealFiled}]
taxPaidLifetime: 0,               // all-time taxes paid
taxEvadedCount: 0,                // current number of evaded bills
taxEvasionLevel: 0,               // escalating consequence tier (0-5)
taxAppealCooldown: '',            // date string of last appeal
taxForgivenessDate: '',           // date string of last monthly forgiveness
taxAuditHistory: [],              // [{date, result, fine}]
taxLastAuditDate: '',             // last audit date
taxCharitableDonatedThisWeek: 0,  // charitable donations this week
taxOffshoreEnabled: false,        // offshore account active (Lobbying L5+)
```

---

## INTERACTION WITH EXISTING SYSTEMS

| System | Tax Interaction |
|--------|----------------|
| **Debt** | Paying a tax bill while broke pushes you into debt. Evaded bills do NOT auto-create debt — only paying does. |
| **Payroll** | Personnel Ministry makes wages deductible (payroll subtracted from weekly taxable income) |
| **Incinerator** | Fuel income is taxable |
| **Ratiocinatory** | Institutions reduce tax burden and audit risk |
| **Brokerage** | ALL brokerage income exempt |
| **Market Yield** | Applied to earnings before they're tracked as taxable |
| **Dissidents** | High dissident count → higher audit risk |
| **Factory button row** | Tax Office button added alongside existing buildings |

---

## NARRATIVE FLAVOR

The Tax Office dispatch voice: a weary civil servant who has seen everything and is mildly apologetic about all of it.

- "The Department of Revenue acknowledges your contribution. It has been filed."
- "Your appeal has been logged. It will be reviewed in the order it was received, which is to say, eventually."
- "The charitable donation has been noted. The Committee on Committees sends its regards."
- "An audit has been scheduled. This is routine. Everything is routine."
- "We notice you have chosen not to visit. The Department respects your decision. The Department also has a long memory."
- "Welcome back. Your bill has been waiting. It is very patient."

---

## IMPLEMENTATION PRIORITY (When Coding Begins)

1. Add `taxable` flag to `awardCoins()` + track `taxableIncomeThisWeek`
2. Add weekly bill generation to `checkDayRollover()` (every 7th day)
3. Add state fields to DEFAULT_STATE
4. Add Tax Office button to main popup (with status dot indicator)
5. Create tax-office.html + tax-office-window.js
6. Add bill payment logic + PAY / PAY ALL buttons
7. Wire Legal/Lobbying/Institution synergies for rate reduction
8. Add evasion escalation system
9. Add audit system (checked at bill generation)
10. Add appeal + charitable donation mechanics
11. Wire dispatch file (tax-office-dispatch.js)
12. Add tax/government badges
13. Add tax-office.html to release.yml staging list

---

## OPEN QUESTIONS (For User Decision)

1. Should there be a "Tax Amnesty" event that periodically wipes all evaded bills? (Narrative: "The Department has declared a Jubilee of Compliance.")
2. Should the government ever spend tax money on something beneficial? (e.g., "Municipal loom subsidy: +5% textile output for taxpayers in good standing")
3. Should tax bills be visible on the timeline page?
4. Should the Tax Office have its own dispatch voice file, or share the Ratiocinatory's bureaucratic tone?
