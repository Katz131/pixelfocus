# Taxation System + Government Page — Design Document
**Version:** v3.23.495 | **Status:** Design Only (NO CODING)
**Date:** 2026-05-27

---

## CONCEPT

A mid-to-late-game system where the "government" begins taxing your earnings once you reach a certain size. Taxes are a percentage of income, deducted automatically. The Government Page is a new sub-page (like brokerage/research/ratiocinatory) where you can view your tax bracket, file appeals, purchase exemptions, and lobby for loopholes.

### Thematic Fit
The textile dystopia's arc: you build a factory → it gets big → the government notices → they want their cut. This mirrors the real progression from cottage industry to regulated corporation. The existing Legal Department and Lobbying Office already gesture at government interaction — taxation makes that relationship mechanical and consequential.

### Key Design Principles
- **Crypto and gambling are TAX EXEMPT** (per user specification)
- Taxation should feel like a natural extension of the Bureaucracy tree
- Players should have agency — multiple ways to reduce their tax burden
- The system should create meaningful decisions, not just be a flat income penalty

---

## TAX BRACKETS

Tax kicks in once `lifetimeCoins >= 50,000` (roughly mid-game, after unlocking several factory tiers). Before that threshold, the government "hasn't noticed you yet."

| Bracket | Lifetime Coins | Tax Rate | Label |
|---------|---------------|----------|-------|
| 0 | < $50K | 0% | Below the radar |
| 1 | $50K – $200K | 8% | Cottage assessment |
| 2 | $200K – $1M | 15% | Regional levy |
| 3 | $1M – $10M | 22% | Industrial tariff |
| 4 | $10M – $100M | 30% | Corporate extraction |
| 5 | $100M – $1B | 38% | Sovereign tithe |
| 6 | $1B+ | 45% | Imperial tribute |

### What Gets Taxed
- Combo burst payouts ✅
- Marathon threshold bonuses ✅
- End-of-day streak bonus ✅
- Passive streak trickle ✅
- Challenge winnings ✅
- Wind-down check-in rewards ✅

### What Does NOT Get Taxed
- **Brokerage capital gains** (crypto, stocks, funds) — TAX EXEMPT
- **Gallery art sales** — considered "cultural" activity
- **Focus session textiles** — in-kind, not monetary
- **CK Buddy rewards** — cross-extension, outside jurisdiction
- Double-down bonuses — "off the books" gamble

### Implementation Point
Tax is deducted inside `awardCoins()`. A new parameter or flag distinguishes taxable vs. exempt income:
```
awardCoins(amount, reason, { taxable: true })  // default: taxable
awardCoins(amount, reason, { taxable: false }) // brokerage, gallery, etc.
```

---

## TAX REDUCTION MECHANISMS

### 1. Legal Department Synergy (Existing Upgrade)
Each Legal Department level reduces effective tax rate:
- L1-L2: -1% each
- L3-L4: -2% each
- L5-L7: -3% each
Maximum legal reduction: ~15% off the bracket rate.

### 2. Lobbying Office Synergy (Existing Upgrade)
Lobbying L3+ unlocks "Tax Loopholes" on the Government Page:
- L3: Unlock the Government Page itself
- L5: Unlock "Offshore Textile Accounts" (shelter up to 20% of income)
- L7: Unlock "Regulatory Capture: Tax Division" (flat -5% rate)
- L9+: "The concept of 'taxation' now refers to our internal memos" (rate capped at 10%)

### 3. Filing Appeals (Government Page Mechanic)
Once per day, you can file a "tax appeal" — a mini-challenge:
- Complete a specific quest-like objective (e.g., "Focus for 60 minutes today")
- Success: refund of 50% of today's taxes
- Failure: no penalty, just no refund

### 4. Ratiocinatory Institutions
The 4 Standing Institutions from the Ratiocinatory can provide tax benefits:
- **Standing Office**: -2% tax rate per level
- **Enquiry Bureau**: Audit protection (see below)
- **Personnel Ministry**: Employee wages become tax-deductible
- **Audit Department**: Ironically, reduces YOUR audit risk

### 5. Charitable Donations (Government Page)
Spend money on "charitable" causes to get tax deductions:
- Donate to "The Weavers' Benevolent Fund": $X → reduces taxable income by 2×$X
- Donate to "Thread Preservation Society": $X → reduces tax rate by 0.5% for the day
These are effectively money sinks with strategic value.

---

## TAX AUDITS

Random chance each day rollover (5% base, reduced by Audit Department levels):
- Audit examines your recent transactions
- If you have undeclared loopholes active: fine = 2× evaded taxes
- If clean: "Audit passed. The inspector notes your exemplary paperwork."
- Enquiry Bureau levels reduce audit probability (-1% per level)

---

## GOVERNMENT PAGE (government.html)

### Layout
Header: "DEPARTMENT OF REVENUE" (pixel art government seal)

### Sections:

**1. Tax Status Panel**
- Current bracket + rate
- Effective rate (after reductions)
- Today's taxes paid
- Lifetime taxes paid
- Active loopholes/exemptions

**2. Filing Cabinet** (Appeals + Deductions)
- Daily appeal slot (quest-style objective)
- Charitable donation interface
- Loophole management (once unlocked)

**3. Audit History**
- Recent audits + outcomes
- Audit risk meter (probability display)

**4. Treasury Report**
- Where your tax money "goes" (flavor text):
  - "Municipal thread infrastructure: 34%"
  - "Loom safety inspections: 22%"
  - "The Committee on Committees: 18%"
  - "Administrative refreshments: 15%"
  - "Actual public services: 11%"

### Unlock Gate
Government Page unlocks when:
- `lifetimeCoins >= 50000` (first tax bracket) AND
- `lobbyingLevel >= 3` (you need political connections to even see the building)

---

## STATE FIELDS (Proposed)

```javascript
// Government / Taxation
taxBracket: 0,                    // current bracket (0-6)
taxRateEffective: 0,              // computed effective rate after reductions
taxPaidToday: 0,                  // taxes paid today (reset on day rollover)
taxPaidLifetime: 0,               // all-time taxes paid
taxAppealDate: '',                // last appeal date (todayStr())
taxAppealObjective: null,         // current appeal quest
taxAppealCompleted: false,        // did they complete today's appeal?
taxLoopholes: [],                 // active loopholes/exemptions
taxAuditHistory: [],              // recent audits [{date, result, fine}]
taxLastAuditDate: '',             // last audit date
taxCharitableDonatedToday: 0,     // charitable donations today
governmentUnlocked: false,        // government page visible
```

---

## INTERACTION WITH EXISTING SYSTEMS

| System | Tax Interaction |
|--------|----------------|
| **Debt** | Taxes still deducted even while in debt (can deepen debt) |
| **Payroll** | Personnel Ministry makes wages deductible |
| **Incinerator** | Fuel income is taxable (they see everything) |
| **Ratiocinatory** | Institutions reduce tax burden |
| **Brokerage** | ALL brokerage income exempt |
| **Market Yield** | Market yield multiplier applies before tax |
| **Dissidents** | High dissident count → higher audit risk |

---

## NARRATIVE FLAVOR

The Government Page dispatch voice: a weary civil servant who has seen everything and is mildly apologetic about all of it. Sample lines:

- "The Department of Revenue acknowledges your contribution. It has been filed."
- "Your appeal has been logged. It will be reviewed in the order it was received, which is to say, eventually."
- "The charitable donation has been noted. The Committee on Committees sends its regards."
- "An audit has been scheduled. This is routine. Everything is routine."

---

## IMPLEMENTATION PRIORITY (When Coding Begins)

1. Add tax deduction to `awardCoins()` with taxable/exempt flag
2. Add state fields to DEFAULT_STATE
3. Create government.html + government-window.js
4. Wire Legal/Lobbying/Institution synergies
5. Add audit system to day rollover
6. Add charitable donation + appeal mechanics
7. Wire dispatch file (government-dispatch.js)
8. Add government badges

---

## OPEN QUESTIONS (For User Decision)

1. Should there be a "Tax Evasion" option? (High risk, high reward — if caught, massive fine + employee dissidence spike)
2. Should the government ever *spend* tax money on something beneficial? (e.g., "Municipal loom subsidy: +5% textile output for all taxpayers")
3. Should tax brackets reset on prestige/new game+? (If that ever exists)
4. What should the Government Page icon be? (Suggested: 🏛️ or ⚖️)
