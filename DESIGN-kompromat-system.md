# Bureau Kompromat System — Design Document
## Todo of the Loom v3.23.527+

---

## 1. Overview

The kompromat system is a **Bureau intelligence operation** that produces leverage over targets — employees, officials, rivals, and Jed Strutt. Each piece of leverage has a concrete gameplay effect. The system is mechanical, not decorative.

The **island** is a late-game Bureau asset that enables the highest-tier kompromat operations. It is described in clinical Bureau language. What happens there is implied by context and consequences, never shown.

---

## 2. Prerequisites & Unlock Timing

| Requirement | Typical player timing |
|---|---|
| Bureau unlocked | Mid-game (bureauUnlocked = true) |
| Bureau Island purchased | Late Tier 4 / early Tier 5 (lifetimeCoins ~$500K+) |
| autoLeadershipLevel >= 1 | Tier 5 (Corporate Oligarchy) |
| autoLeadershipLevel >= 3 | Tier 6 (Technocratic) — **AI CFO takes over, Jed death trigger** |
| Jed Strutt hired | Tax Office unlocked ($50K lifetime) |
| Jed lessons 6+ | Mid-game — hush money demand |

---

## 3. Bureau Kompromat Operations

### 3.1 Operation Types

Kompromat ops are a new operation category in the Bureau alongside existing intelligence, recruitment, and street ops.

| Operation | Target Type | Cost | Cooldown | Leverage Produced |
|---|---|---|---|---|
| Background check | Employee | $5,000 | 24h | Employee dossier — prevents sabotage on termination |
| Financial audit | Rival executive | $25,000 | 48h | Market competitor suppression (-5% rival market events) |
| Regulatory contact | Government official | $50,000 | 72h | Audit risk reduced by 2% permanently |
| Private investigation | Named target (Jed, etc.) | $100,000 | 7 days | Target-specific leverage |
| Island invitation | Any high-value target | $250,000 | 14 days | Maximum leverage — target fully compromised |

### 3.2 The Island

**Purchase**: Bureau upgrade, ~$500,000. Appears as a Bureau asset once purchased.

**Mechanic**: Once purchased, the island enables "Island Invitation" operations. You select a target and invite them. After the cooldown, the Bureau produces a dossier. The dossier is described in clinical terms:

> *"Dossier compiled. Materials acquired during the retreat have been catalogued and secured. The subject's cooperation is now assured on all matters within scope."*

**What the island is NOT:**
- Not a joke
- Not described with any detail about what happens there
- Not something the player "visits" or sees
- A Bureau intelligence asset that produces leverage, period

### 3.3 Targets & Leverage Effects

| Target | How to target | Leverage effect |
|---|---|---|
| **Jed Strutt** | Private investigation or island invitation | Stops hush money demands, works harder (-2% tax rate), vitals worsen faster |
| **Employee (any)** | Background check | Prevents sabotage event if fired, +loyalty |
| **Government official** | Regulatory contact or island invitation | Permanent audit risk reduction, faster appeal processing |
| **Rival executive** | Financial audit or island invitation | Reduced negative market events, competitor suppression |
| **Union representative** | Private investigation | Prevents strike events (if implemented) |
| **Tax inspector** | Island invitation (very late game) | Audit fines halved, evasion penalties reduced |

---

## 4. Jed Strutt — Full Arc Timeline

### Phase 1: Hire & Learn (Tax Office unlocked → lessons 1-5)
- Jed is hired for $5,000
- Teaches US tax concepts, each with a quiz
- AI Management notices him at lesson 1
- Vitals: healthy (HR 68-75, BP 122-130/78-84)
- AI complaints: none yet, just generic memos

### Phase 2: Tension (lessons 6-8 + autoLeadershipLevel 1-2)
- **Lesson 6**: Jed discovers irregularities in the company books
- **Hush money event**: Jed quietly asks for $50,000 to stay quiet
  - Pay: Jed stays quiet, -$50K
  - Don't pay: Audit risk spikes +10% for 4 weeks
- **autoLeadershipLevel 1** (HR chatbot): AI memo — *"Mr. Strutt's filing methods have been noted as predominantly manual."*
- **autoLeadershipLevel 2** (middle managers): AI memo — *"Mr. Strutt's quarterly projections lag our automated forecasts by 72 hours."*
- Vitals: elevated (HR 80-88, BP 138-145/86-92)
- TERMINATE CONTRACT button always available

### Phase 3: Compromise (Bureau + island available)
- **If player has Bureau island + targets Jed**: Jed is invited to the island
  - Bureau dossier produced: *"Materials acquired. Mr. Strutt's cooperation is now assured."*
  - Jed stops asking for hush money
  - Jed works harder: additional -2% effective tax rate
  - Vitals worsen sharply (HR 92-100, BP 150-158/94-100)
  - Jed's demeanor in lesson quotes becomes noticeably subdued
- **This is optional** — player can choose not to compromise Jed

### Phase 4: The Kill (autoLeadershipLevel >= 3)
- **autoLeadershipLevel 3** (CFO algorithm): The AI decides Jed is redundant
- **AI memo**: *"The CFO algorithm has completed its assessment of Mr. Strutt's role. His responsibilities have been fully modeled. Continued human oversight of tax operations introduces latency that the algorithm cannot justify. We recommend immediate transition."*
- **If player hasn't fired Jed**: eugeneDeathTriggered fires on next day rollover
- **If player fired Jed before this**: He's safe in Aspen. Death never triggers.
- **If player compromised Jed via island**: Death still triggers — the kompromat didn't save him, it just made his last months worse

### Phase 5: Aftermath
- Tax Office: AI memo about skiing accident in Aspen
- Tax Office: "You have an unread morse transmission"
- Vitals: 0 bpm / --/--
- Morse inbox: Message from J. Strutt — locked in a house, confused, door won't open
- All purchased+passed lessons remain active
- No new lessons can be purchased

---

## 5. AI Complaints (autoLeadershipLevel progression)

These replace the current generic AI Management memos. They appear in the Tax Office Eugene panel.

| autoLeadershipLevel | Complaint |
|---|---|
| 0 | (none — AI not active yet) |
| 1 | "Mr. Strutt's filing methods have been noted as predominantly manual. The department's analytics suite has offered to assist. Mr. Strutt declined." |
| 2 | "Mr. Strutt's quarterly projections lag our automated forecasts by approximately 72 hours. His insistence on double-checking figures by hand has been flagged as a process bottleneck." |
| 3 | "The CFO algorithm has completed its assessment of Mr. Strutt's position. His responsibilities have been fully modeled. Continued human oversight of tax operations introduces latency the system cannot justify. We recommend immediate transition." |
| 4+ | (post-death or post-fire — no more complaints) |

---

## 6. Church of the Loom

### Unlock
- Legal Dept L4+ AND Bureau unlocked AND Lobbying L3+
- Purchase cost: $200,000

### What it is
- A Scientology-style tax-exempt religious organization
- Founded through Bureau + Legal collaboration
- Provides significant tax shelter

### Mechanics
- **Tax exemption**: 15% of weekly income sheltered (stacks with offshore)
- **Tithe**: Church takes 5% of weekly income (net benefit: +10% sheltered)
- **"Auditing sessions"**: Purchasable upgrades that increase the shelter percentage
  - Session 1 ($50K): Shelter 18%, tithe 6%
  - Session 2 ($150K): Shelter 22%, tithe 7%
  - Session 3 ($500K): Shelter 28%, tithe 8%
- **Narrative**: Church sends periodic memos in the same sterile tone as other departments
- **Does NOT grow larger than the company** — it's a subsidiary, a tool. The company goes intergalactic; the church stays a line item.

### Tone
- Memos use corporate-spiritual language
- *"The Congregation appreciates your continued patronage. Your tithe has been received and allocated to Thread Awareness programs."*
- Never threatening, always slightly off
- No one ever leaves the church. This is not discussed.

---

## 7. Cross-Building Tax Integrations

| Feature | Building | Trigger | Effect |
|---|---|---|---|
| Home office deduction | House | Eugene lesson 5 + House unlocked | Weekly write-off ($500/week off taxable) |
| R&D tax credit | Research Lab | Eugene lesson 5 + Research unlocked | Each experiment gives $200 tax credit |
| Employee benefits | Factory/Personnel | Employees L3+ + Eugene lesson 5 | Payroll costs 50% tax-deductible (up from current 100%) |
| Equipment depreciation | Factory | Eugene lesson 6 | Factory purchases create 4-week depreciation schedule |
| Bureau funneling | Bureau | Bureau + Eugene lesson 5+ | Route $5K/week through Jed's office (reduces taxable, +audit risk) |
| Offshore shell corp | Bureau + Brokerage | Bureau + Brokerage + Lobbying L5+ + lesson 8 | Shelter brokerage capital gains |
| Capital gains deferral | Brokerage | Eugene lesson 9 + active portfolio | Defer brokerage taxes on reinvested profits |
| Legal provisions | Factory | Legal L4+ + Eugene lesson 11 | Draft one-time laws creating permanent deductions |
| Church of the Loom | Bureau + Legal | Legal L4+ + Bureau + Lobbying L3+ | Tax-exempt shelter (see section 6) |

---

## 8. Trigger Timing Audit

### Ensuring nothing fires too early

| Event | Gate | Earliest possible timing |
|---|---|---|
| Jed hireable | lifetimeCoins >= 50,000 | Mid Tier 2 (Journeyman) |
| Lessons 1-3 | $500-$3,500 + quiz | Shortly after hire |
| AI memo tier 1 | autoLeadershipLevel >= 1 | Tier 5 ($500K purchase) |
| Lessons 4-6 | $8K-$40K | Mid-game |
| Hush money | eugeneLessons >= 6 | After significant investment in Jed |
| Bureau island | Bureau + $500K | Late Tier 4 / Tier 5 |
| Kompromat on Jed | Island + target Jed | After island purchase |
| AI memo tier 2 | autoLeadershipLevel >= 2 | Tier 5-6 ($4M purchase) |
| Church of the Loom | Legal L4 + Bureau + Lobbying L3 | Late Tier 5 |
| AI memo tier 3 (death warning) | autoLeadershipLevel >= 3 | Tier 6 ($40M purchase) |
| Jed death trigger | autoLeadershipLevel >= 3 + eugeneHired + !eugeneFired | Tier 6 |
| Jed morse message | Day after death trigger | Tier 6 |

### Logical consistency checks
- Player CANNOT encounter hush money before having enough lessons to understand what Jed found
- AI complaints CANNOT appear before the AI exists (autoLeadershipLevel >= 1)
- Death CANNOT trigger before the AI has the power to act (autoLeadershipLevel >= 3 = CFO algorithm)
- Kompromat CANNOT be gathered before the Bureau and island exist
- Church CANNOT be founded before Legal and Bureau are established
- If player fires Jed at ANY point: death arc disabled, safe in Aspen, all learned lessons kept

---

## 9. State Fields Needed (not yet in DEFAULT_STATE)

```
eugeneHushMoneyAsked: false,        // hush money event triggered
eugeneHushMoneyPaid: false,         // player paid the hush money
eugeneCompromised: false,           // kompromat gathered on Jed via Bureau
churchOfTheLoomFounded: false,      // Church established
churchAuditingSessions: 0,          // 0-3 auditing session upgrades
bureauIslandPurchased: false,       // island asset purchased
bureauKompromat: {},                // { targetId: { type, date, active } }
bureauFunneling: false,             // money funneling through Jed's office active
homeOfficeDeduction: false,         // home office write-off active
```

---

## 10. Open Questions

1. Should the Church of the Loom have its own page, or live as a section within the Bureau?
2. How many total kompromat targets beyond Jed? (Suggest 5-8 named targets)
3. Should the island invitation have a visible "guest list" or just clinical dossier results?
4. Does compromising Jed change his lesson quote tone (more subdued/fearful)?
5. Should the player receive a Bureau notification when the AI makes its move on Jed, or discover it passively?
