# Todo of the Loom — Buildings Design: Legal Department & The Bureau

Two cross-cutting buildings that wire into the events list. Both accept **relocated hires** — employees the player has already trained at the factory can be reassigned, with role eligibility gated by their **seniority** and **loyalty** stats.

Status: names and terminology are fixed. **Upgrades, gates, and event triggers are intentionally left as TODOs** — we'll wire those once the building visual identities and tier-unlocks are locked in.

---

## Part I — The Legal Department

### Working names

A sober, institutional name fits better here than a codename. Shortlist, ordered by recommendation:

1. **The Chancery** *(recommended)* — Old word for the office of a chancellor; evokes both corporate counsel and late-game "intergalactic chancery court" events already written into T9.
2. **The Counting House** — Historically the back office of a textile merchant; reframes as a legal & compliance back office.
3. **The Bench** — Short, punchy, carries both the courtroom and the weaver's bench.
4. **Privy Counsel** — A little arch; private advisors to the crown, reframed as corporate.
5. **The Chambers** — British barrister's chambers connotation; reads as prestigious and sober.

### Function

Mitigates or accelerates every `court` / `commission` / `hearing` / `inquiry` / `class action` / `subpoena` / `consent decree` / `injunction` / `indictment` / `treaty` / `chancery` / `tribunal` event from T2 through T10 in the events list.

### Relocatable hires

Role slots to be filled by reassigning existing employees. Minimum seniority and loyalty thresholds to be set per slot.

- **General Counsel.** Highest-seniority slot; caps the strength of every Legal mitigation in the building. Requires high seniority and high loyalty.
- **Associate Counsel.** Multiple slots. Each one adds a parallel mitigation channel.
- **In-House Litigator.** Turns plaintiff events into defensible ones; reduces damages in adverse rulings.
- **Lobbyist.** Shifts the outcome of legislative events (`senator introduces`, `act of Congress`, `European Commission opens`).
- **Paralegal / Clerk.** Low-seniority slots. Many of them; needed to convert high-level counsel capacity into case throughput.
- **External Counsel on Retainer.** Paid, not staffed; a budget line, not a relocation slot.

### Upgrades (TODO — wire after tier-unlock pass)

- Amicus Network — extends Chancery effect to peer-industry events.
- Consent-Decree Drafting Suite — reduces magnitude of adverse regulatory outcomes.
- Compliance Bureau — reduces frequency of `OSHA`, `AG investigation`, `EU Commission` triggers.
- Precedent Archive — stacking bonus each time a favorable ruling is obtained.

### Event gates & triggers handled (TODO — per-item tagging to be done)

*To be wired directly against the numbered items in `EVENTS-DESIGN.md`. Rough coverage:*

- T2 items: `23` (trademark contested), `28–30` (AG investigation), `35` (customs seizure).
- T3 items: `43–46` (OSHA coroner), `52–55` (Blue Book / patent), `64` (jury acquittal).
- T4 items: `71–72` (Act of Congress / investor coalition list).
- T5 items: `96–99` (antitrust bill / Supreme Court), `104–105`, `110` (Senate subpoena).
- T6 items: `129–137` (DOJ, FTC, copyright class action, one-strike EO), `139–140` (permit litigation).
- T7 items: `168–170` (upload personhood rulings), `173`, `181` (upload subpoena), `187` (candidate legislator).
- T8 items: `204` (planetary-council tax), `212` (off-world secession).
- T9 items: `225–230` (embargo / non-proliferation), `245`, `248` (galactic chancery).
- T10 items: `253` (pocket-universe class action), `267–268` (intercosmic tribunal).

---

## Part II — The Bureau (Espionage / Kompromat / Sleeper Cells)

### Working names

Shortlist, grouped by flavor. All-caps in-game treatment for the codename variants.

**Recommended pick: The Black Warp.** Textile-native, sounds like a codename, evokes both the loom and clandestine infrastructure. It matches the game's industrial aesthetic rather than bolting on a generic spy-agency name.

**Codename-style (one-word, like Pegasus / Orion):**

- **ARGUS** — The hundred-eyed watchman of Greek myth.
- **JANUS** — Two-faced god of thresholds, doors, beginnings and endings.
- **HECATE** — Goddess of crossroads, secrets, witchcraft.
- **CERBERUS** — Three-headed hound guarding the underworld.
- **MNEMOSYNE** — Memory; a good name for a kompromat archive.
- **HELIOS** — The all-seeing sun.
- **HEIMDALL** — Norse all-seeing watchman.
- **ANUBIS** — Egyptian judge of the dead.
- **ORPHEUS** — Walker between worlds; hidden knowledge.
- **TARTARUS** — The deepest pit; a name for the vault.

**Astronomical:**

- **POLARIS**, **MERIDIAN**, **ZENITH**, **PENUMBRA**, **UMBRA**, **HELIX**, **QUASAR**, **CORONA**, **APHELION**.

**Birds of prey (NSA/CIA aesthetic):**

- **KESTREL**, **PEREGRINE**, **MERLIN**, **GYRFALCON**, **GOSHAWK**, **HARRIER**, **OSPREY**.

**Two-word military codename:**

- **BLUE DAWN** · **BROKEN ARROW** · **QUIET SHUTTLE** · **GOLDEN CLOTH** · **COLD WARP** · **STILLWATER** · **ASHFALL** · **WEFT LINE** · **DARK REED** · **DEAD SELVEDGE**.

**Textile-native (fits the game best):**

- **The Black Warp** · **The Quiet Shuttle** · **The Dark Loom** · **Selvedge** · **Reedwork** · **The Bobbin Works** · **Needlework** · **Warp & Weft** · **The Dyeworks** *(doubles as disinfo division)*.

**Evocative single words:**

- **Obsidian** · **Cipher** · **Ledger** · **Longsight** · **Eyewell** · **Watchtower** · **Lantern** · **Briar** · **Threadwork**.

### Function

Gates and fuels every `defector` / `exfiltration` / `implant` / `insider` / `surveillance` / `sovereign-fund` / `rogue-shard` / `counter-intel` / `emissary` event from T2 onward, **and** provides preemptive detection against rival **Luddite** and **union** ignition events across every tier. Also hosts the **Vault** where kompromat on rivals, regulators, and employees is stored.

### Relocatable hires (by role)

Hires relocated from the factory unlock slots here. Each role has minimum **seniority** and **loyalty** thresholds. High-seniority / high-loyalty hires unlock the more consequential roles.

- **Station Chief.** Seniority + loyalty gate. One per geography.
- **Case Officer / Handler.** Runs assets in the field. Mid-senior, high-loyalty.
- **Analyst.** Turns raw intake into usable product. Mid-senior.
- **Operations Officer.** Plans and executes active measures.
- **Counterintelligence Officer.** Mole hunts, internal reviews, loyalty audits.
- **Archivist of the Vault.** Sole keeper of the kompromat archive. Single slot; highest loyalty gate in the building. On defection, the vault empties.
- **Cryptographer.** One-time pads, steganography, burst transmission.
- **Field Agent (NOC).** No diplomatic cover; highest risk slot. Seniority matters less than loyalty and specialization.
- **Illegal / Sleeper.** See glossary. A hire can be pre-positioned inside a *rival* factory as the player's sleeper; activation is a discrete action.
- **Swallow / Raven.** Seduction-operation specialists; used for kompromat acquisition.
- **Courier.** Low seniority, needs cover legitimacy; moves material between cells.
- **Cutout.** A disposable intermediary. Often a junior hire; reassigning here is effectively retiring them into single-use work.

### Glossary — long-form definitions

This is the research pass. Terms are grouped for readability; in-game they'll be alphabetized.

#### People (roles & statuses)

- **Agent.** A human source working for an intelligence service. Contrast with a *staff officer*, who is on the service's payroll.
- **Asset.** A recruited source, distinct from an officer; typically not on payroll and sometimes unaware they are being run.
- **Handler / Case Officer.** The officer who recruits, meets with, and directs an asset.
- **Sleeper agent / Sleeper.** An agent placed inside a target country or organization to remain inactive — often for years — until "activated" for a specific task.
- **Sleeper cell.** A group of sleepers organized around a single mission or geography, lying dormant until triggered.
- **Mole.** A long-term, deeply embedded penetration agent, usually inside a rival intelligence service or government.
- **Double agent.** An agent ostensibly working for one service who is in fact controlled by a rival and reporting back.
- **Triple agent.** A double agent whose double status has been detected and re-turned again.
- **NOC (Non-Official Cover).** An officer operating abroad without diplomatic cover; if caught, they have no immunity.
- **Illegal.** Russian-tradecraft term for a deep-cover officer operating under a false identity with no diplomatic protection. Made famous by the FBI's *Illegals Program* takedown of 2010.
- **Singleton.** An agent who operates alone, with no handler network around them.
- **Defector.** Someone who abandons their service and changes allegiance, usually bringing material or knowledge.
- **Walk-in.** A volunteer who appears at an embassy or station offering to supply information.
- **Dangle.** A person deliberately exposed to a rival service in hopes they will recruit them — planting a controlled asset from the inside.
- **Cutout.** A trusted intermediary used to pass material between a handler and an asset so they never meet.
- **Courier.** One who physically transports material between parties.
- **Agent of influence.** An asset whose job is not collection but to shape opinion, policy, or decisions inside the target.
- **Unwitting agent.** Someone who provides information or takes useful action without knowing they are being run.
- **Swallow.** (Russian) Female officer used in seduction operations.
- **Raven.** (Russian) Male officer used in seduction operations.
- **Romeo spy.** Male seducer targeting (typically) secretaries and lonely women for access. Associated with the Stasi.
- **Sparrow school.** The colloquial name for the Soviet program that trained swallows and ravens.

#### Tradecraft & operations

- **Tradecraft.** The accumulated craft of espionage — methods, techniques, protocols.
- **Legend.** A fabricated backstory, identity, and supporting history used by an operative.
- **Pocket litter.** Small authenticating items (receipts, stubs, photos, keys) carried by an operative to support a legend.
- **Cover.** A false occupation or identity concealing an operative's real role.
- **Cover for status.** A false identity claim (job, nationality).
- **Cover for action.** A reason the operative is in *this* place doing *this* thing right now.
- **Dead drop.** A prearranged location where material is left by one party and retrieved by another without direct contact.
- **Brush pass / Live drop.** A very brief physical encounter during which material is exchanged in passing.
- **SDR (Surveillance Detection Route).** A planned walking or driving route designed to reveal whether one is being followed.
- **Dry cleaning.** Actions taken to shake surveillance.
- **Safe house.** A secure location for meetings, debriefings, or temporary shelter.
- **Brevity code.** A short set of prearranged words or phrases that carry complex meaning.
- **One-time pad.** An unbreakable symmetric cipher using truly random keys used only once.
- **Steganography.** Hiding a message inside another medium — an image, a microdot, an innocuous text.
- **Microdot.** A photograph reduced to a dot, used to conceal information.
- **Burst transmission.** A compressed radio transmission designed to minimize the interception window.

#### Recruitment & coercion

- **Pitch.** The moment an officer directly asks a potential asset to work for the service.
- **MICE.** The four classical recruitment motivators — Money, Ideology, Coercion, Ego.
- **Kompromat.** (Russian) Compromising material used to blackmail, coerce, or discredit a target.
- **Honey trap / Honey pot.** The use of romantic or sexual seduction to compromise or recruit a target.
- **Blackmail file.** A dossier of compromising material held in reserve against an individual.
- **False flag.** An operation conducted so it appears to be carried out by another party.
- **Provocation.** An action designed to elicit a specific response from a target for exploitation.
- **Sting.** An operation using a concealed lure to entrap a subject in conduct the service wants exposed.

#### Doctrine (mostly Russian)

- **Active measures.** (*Aktivnye meropriyatiya.*) Covert political warfare — forgery, disinformation, influence operations, wet work.
- **Dezinformatsiya.** Disinformation: the deliberate spread of false information designed to mislead.
- **Maskirovka.** Military deception doctrine covering concealment, decoys, disinformation, and surprise.
- **Reflexive control.** A doctrine of manipulating an adversary's decision-making by feeding them selected information that causes them to choose what you want.
- **Wet work / Wet affairs.** (*Mokroye delo.*) Lethal operations — assassination.
- **Siloviki.** "Men of force" — politicians drawn from the security and military services.
- **Chekist.** Member or alumnus of a Russian security service, named after the Cheka, the first Soviet secret police.

#### Intelligence products (the "INTs")

- **HUMINT.** Human intelligence — from agents and debriefings.
- **SIGINT.** Signals intelligence — intercepted communications and electronics.
- **COMINT.** Communications intelligence (voice, text).
- **ELINT.** Electronic intelligence (radar, telemetry).
- **OSINT.** Open-source intelligence — publicly available material.
- **GEOINT.** Geospatial intelligence — imagery and mapping.
- **MASINT.** Measurement and signature intelligence (acoustic, seismic, nuclear).
- **FININT.** Financial intelligence — banking records, transactions.
- **CYBINT.** Cyber intelligence.
- **TECHINT.** Technical intelligence on enemy materiel.

#### Counterintelligence

- **Counterintelligence (CI).** Activities to identify, deceive, or neutralize hostile intelligence operations against you.
- **Mole hunt.** An internal investigation to identify a penetration.
- **Canary trap.** Leaking slightly different versions of a document to different suspects to identify the leaker.
- **Barium meal.** Fake information placed in circulation to detect leakers.
- **Chicken feed.** Low-value genuine information fed through a double agent to maintain their credibility with the opposing service.
- **Burn / Burn notice.** A notice that an officer or asset has been compromised and should be cut off.
- **Burned.** Exposed, compromised.
- **Turning.** Converting an adversary's asset into a double agent.
- **Tripwire.** A source or system that alerts counterintelligence to hostile activity.
- **Honeypot (CI).** A deliberately attractive target set out to draw and identify hostile collectors.
- **Parallel construction.** Creating a legitimate-looking chain of evidence to hide the true (classified) source of a lead.

#### Actions & operations

- **Exfiltration.** The clandestine removal of a person or material from a target area.
- **Extraction.** Recovery of an asset or officer, usually from hostile territory.
- **Rendition.** Transfer of a person from one jurisdiction to another, typically covertly and without process.
- **Black bag job.** A surreptitious entry into premises to steal, plant, or install surveillance.
- **Plausible deniability.** Designing operations so officials can credibly deny knowledge of them.
- **Compartmentalization.** Restricting information access to the smallest possible set of people.
- **Need-to-know.** The principle that access is granted only to those who genuinely require it.
- **Black propaganda.** Propaganda attributed to a false source.
- **White propaganda.** Propaganda openly attributed to its real source.
- **Grey propaganda.** Propaganda of ambiguous or unclear origin.

#### Organizational

- **Station.** A foreign posting of an intelligence service.
- **Rezidentura.** (Russian) The station of a Russian intelligence service in a foreign country.
- **Rezident.** (Russian) The head of a rezidentura.
- **The Farm.** Colloquial term for an intelligence training facility (e.g., Camp Peary).
- **Deep cover.** Cover so thorough and long-term it is withheld from most of the sponsor service itself.

#### Textile-native tradecraft (game-invented, fits the setting)

These read as domain-specific jargon inside the game's world — the Bureau's own dialect.

- **Warp line.** A covert supply channel threaded through legitimate shipping.
- **Weft cell.** A single operational node inside a sleeper network.
- **Selvedge.** The outer edge of an operational network — the last contact before a cutout.
- **Reed code.** An encrypted pattern-message; visually indistinguishable from a genuine weaving draft.
- **Loom signal.** A burst transmission pretending to be a loom-control instruction.
- **Dyework.** A disinformation operation — "dyeing" a story into public perception.
- **Bobbin drop.** A dead drop concealed inside returned industrial textile packaging.
- **Unraveling.** The controlled collapse of a compromised cell, with evidence destruction.
- **Black warp.** The Bureau's term-of-art for its deepest sleeper roster — the operatives whose identities are withheld from the Bureau's own staff.

### Cross-building mechanic — Hire relocation

Shared by Chancery and the Bureau:

- Every hire carries a **seniority** score (accrued in the factory) and a **loyalty** score (accrued by tenure, treatment, and by not being exposed to rival kompromat).
- **Relocation** moves a hire out of the factory roster into a Chancery or Bureau slot; the slot has a minimum seniority/loyalty requirement.
- Relocated hires no longer contribute to factory throughput but unlock the building's specialized actions.
- A hire below loyalty threshold but above seniority threshold can still be slotted — but they are flaggable as *defection risks*.
- The Bureau can pre-position a hire inside a **rival** factory as a **sleeper / mole**. Activation is a one-time discrete action; once activated, the hire either exfiltrates, defects, or is burned.

### Upgrades (TODO — wire after tier-unlock pass)

*All placeholder, to be named and balanced after we decide how the Bureau sits in the tier unlock chain:*

- **The Vault** — Kompromat archive. Each level increases storage and the number of targets you can hold material on.
- **The Sparrow School** — Trains swallow/raven-class hires from existing low-loyalty staff.
- **The Reed Room** — Cryptography upgrade; unlocks brevity codes and burst transmission, reducing the chance hostile CI detects your traffic.
- **The Warp Line** — Global logistics upgrade; makes exfiltrations faster and cheaper.
- **The Dyeworks** — Disinformation wing; feeds the press-side events with manufactured counter-narratives.
- **The Illegals Desk** — Unlocks the ability to pre-position sleepers abroad.
- **Counterintelligence Directorate** — Runs mole hunts and canary traps; reduces the frequency of successful rival exfiltration events.

### Event gates & triggers handled (TODO — per-item tagging to be done)

*Rough coverage of `EVENTS-DESIGN.md`:*

- T2 items: `26` (new Luddite at the trade show — detect in advance), `27–28` (defector with pattern libraries), `38` (leaked bid).
- T3 items: `41–42` (Luddite revival cell — detect before ignition), `54–55` (patent fight, industrial espionage angle).
- T4 items: `74` (uninvited country-house guest = foreign IO), `87` (rival-heir manifesto — detect signatories early).
- T5 items: `94–95` (muckraker's name lists), `106` (coup in sourcing country), `107` (European general strike), `111` (country manager expelled), `112` (FBI file on organizer).
- T6 items: `121–122` (bomb threat / Neo-Luddite sabotage), `125` (weights exfiltration — the crown example), `142–144` (annotation-vendor insider / GPU implant / researcher on encrypted drive), `146–149` (leaked memo, evaluation deception), `154–155` (sovereign-wealth fund stake).
- T7 items: `167` (anti-upload server-hall bombing), `176` (rogue shard in election interference), `180` (black-market clone of founder), `184` (upload sweatshop subcontractor).
- T8 items: `192–196` (ocean-first contact — gated by Bureau + Research Lab), `215–216` (off-world emissary of unknown intent), `219` (martian-equator temple bombing).
- T9 items: `233–234` (rogue AI defection both directions), `247` (galactic anti-upload denomination).
- T10 items: `263` (parallel-timeline heat-death tailor weaving from inside), `264` (extinguished-early star purchase).

---

## Part III — Activated Personnel: Full Catalog (Bureau / Black Warp)

Every term from the glossary that can plausibly be a **role** or a **verb** is enumerated here as an in-game slot or operation. This is the master list we'll wire functionality against. Every entry has a rough **seniority** requirement (S1 lowest → S5 highest), a **loyalty** requirement (L1 → L5), and a one-line gameplay effect. *Effect text is first-draft; balance comes later.*

### A. Command & Staff (permanent slotted roles)

1. **Director of the Black Warp** *(S5, L5, one slot)* — Runs the building. Caps the effective strength of every other slot. On defection: the Vault empties.
2. **Deputy Director** *(S4, L4, one slot)* — Shadow of the Director; steps in if Director is burned or killed.
3. **Rezident** *(S4, L4, one per geography)* — Station chief of an overseas rezidentura. Unlocks regional coverage.
4. **Illegal Rezident** *(S4, L5, one per geography)* — Parallel station staffed by illegals with no cover.
5. **Chief of Operations** *(S4, L3)* — Approves all active ops; unlocks cross-discipline joint ops.
6. **Chief of Counterintelligence** *(S4, L5)* — Runs mole hunts and internal loyalty audits.
7. **Chief of Analysis** *(S4, L2)* — Turns raw take into daily product; bonus to event-warning lead time.
8. **Archivist of the Vault** *(S3, L5, one slot)* — Sole keeper of the kompromat archive. On defection or assassination: the archive is lost.
9. **Quartermaster** *(S2, L3)* — Equips operations; costs drop for pocket-litter and legend fabrication.
10. **Paymaster** *(S2, L4)* — Unsigned-cash disbursements; required for asset retainers.

### B. Case-Handling Roles (run assets)

11. **Case Officer / Handler** *(S3, L4)* — Runs one or more assets; each handler caps how many assets can stay live.
12. **Senior Handler** *(S4, L4)* — Handles high-value assets (moles inside rival C-suite, etc.).
13. **Walk-In Intake Officer** *(S2, L3)* — Processes unsolicited volunteers; filters dangles from genuine walk-ins.
14. **Defector Resettlement Officer** *(S3, L4)* — Relocates incoming defectors, builds their new legend.
15. **Singleton Handler** *(S3, L4)* — Manages agents with no network around them — tighter security, narrower bandwidth.

### C. Field Deployments (relocated hires who *leave* the factory)

16. **NOC Field Agent** *(S2, L5)* — No cover if caught. Highest risk, highest reward slot.
17. **Illegal** *(S3, L5)* — Deep-cover operative with fabricated nationality and legend; no diplomatic protection.
18. **Sleeper** *(S1–S5, L4)* — Pre-positioned inside a rival factory. Dormant until activated. Activation is a discrete one-time action.
19. **Sleeper Cell Anchor** *(S3, L5)* — The one sleeper in a cell who knows the others; loss of anchor collapses the cell.
20. **Mole** *(S4, L5)* — Placed inside a *rival's* corresponding building (their Bureau or their Chancery). Provides continuous intelligence.
21. **Double Agent** *(S3, L3)* — An asset the player has turned from a rival service. Fragile loyalty.
22. **Triple Agent** *(S3, L2)* — A former double whose double status was detected and re-turned.
23. **Dangle** *(S2, L4)* — Deliberately exposed to a rival to get recruited on the player's behalf.
24. **Singleton Asset** *(S2, L4)* — Lone asset with no peer contact; survives longer but delivers less per tick.
25. **Agent of Influence** *(S3, L3)* — Deployed into a target org to shape opinion, not to collect.
26. **Courier** *(S1, L3)* — Low-seniority slot for physically moving material between cells.
27. **Cutout** *(S1, L3)* — A disposable intermediary; effectively retires the hire into single-use work.
28. **Unwitting Asset** *(external, not a hire)* — Third-party who produces useful take without knowing they're being run; recruited via social engineering.
29. **Paramilitary Operator** *(S3, L4)* — Unlocks wet-work class operations (last-resort tier).
30. **Agent Provocateur** *(S2, L3)* — Infiltrates rival protest / Luddite / union movements and pushes them into self-discrediting action.

### D. Recruitment & Compromise Roles

31. **Recruiter** *(S3, L3)* — Conducts pitches against identified targets.
32. **MICE Profiler** *(S2, L2)* — Identifies which of Money / Ideology / Coercion / Ego applies to a target.
33. **Swallow** *(S2, L2, graduate of the Sparrow School)* — Female seduction operative.
34. **Raven** *(S2, L2, graduate of the Sparrow School)* — Male seduction operative.
35. **Romeo Operative** *(S2, L3)* — Specialist in long-term romantic compromise of secretaries and aides.
36. **Honey Trap Runner** *(S3, L4)* — Runs a crew of swallows/ravens against a specific mark.
37. **Blackmail Officer** *(S3, L5)* — Prepares kompromat for controlled release; coerces without exposing the file.
38. **Kompromat Researcher** *(S2, L4)* — Patiently accumulates compromising material against a target over quarters/years.
39. **Forger** *(S2, L4)* — Fabricates documents for legends, compromise packages, and false-flag operations.
40. **Legend Architect** *(S3, L4)* — Designs and maintains cover identities for NOCs, illegals, and sleepers.
41. **Pocket Litter Clerk** *(S1, L3)* — Assembles authenticating items (receipts, stubs, photos) to support a legend.

### E. Collection Specialists (the "INT" disciplines)

42. **HUMINT Officer** *(S3, L4)* — Runs human sources; the backbone of the Bureau.
43. **SIGINT Officer** *(S3, L4)* — Intercepts communications and electronic signals at rival facilities.
44. **COMINT Officer** *(S3, L3)* — Specializes in intercepted voice/text.
45. **ELINT Officer** *(S3, L3)* — Non-communications signals (radar, telemetry, loom-controller emissions).
46. **OSINT Analyst** *(S2, L2)* — Mines publicly available material; cheap, broad coverage, low resolution.
47. **GEOINT Analyst** *(S3, L3)* — Satellite and drone imagery of rival supply chains and facilities.
48. **MASINT Analyst** *(S3, L3)* — Measurement-and-signature intelligence; detects anomalous industrial activity.
49. **FININT Analyst** *(S3, L4)* — Follows money; best coverage for detecting rival bribery and shell companies.
50. **CYBINT Officer** *(S3, L4)* — Cyber collection; unlocks intrusion operations against rival networks.
51. **TECHINT Officer** *(S3, L3)* — Reverse-engineers captured rival hardware (e.g., GPU implants from item 143).

### F. Counterintelligence Roles

52. **Mole Hunter** *(S4, L5)* — Investigates internal penetrations; finds rival sleepers inside the player's factory.
53. **Loyalty Auditor** *(S3, L5)* — Monitors the loyalty score of every hire; flags candidates for canary traps.
54. **Canary-Trap Operator** *(S3, L5)* — Runs versioned-document leak detectors; finds leakers by differential.
55. **Barium Meal Cook** *(S2, L4)* — Plants fake information to see who repeats it.
56. **Chicken-Feed Supervisor** *(S3, L4)* — Curates the stream of low-value-but-real information fed through a double agent.
57. **Burn Officer** *(S3, L5)* — Formally burns a compromised asset, cuts all contact, and documents the closure.
58. **Asset-Turning Officer** *(S4, L4)* — Converts a detected hostile asset into a player double agent.
59. **Tripwire Engineer** *(S2, L3)* — Builds the passive detection layer that flags hostile activity.
60. **Interrogator** *(S3, L4)* — Debriefs walk-ins, defectors, and captured rival assets.
61. **Surveillance Operator** *(S1, L3)* — Foot / vehicle surveillance; supports mole hunts and pitch validation.

### G. Technical & Support Roles

62. **Cryptographer** *(S3, L4)* — Designs brevity codes; manages one-time pads.
63. **One-Time-Pad Clerk** *(S1, L4)* — Distributes and accounts for pads; single most loyalty-sensitive support role.
64. **Steganographer** *(S2, L3)* — Hides messages inside images, textiles, microdots.
65. **Microdot Photographer** *(S2, L3)* — Produces microdots for concealed transport.
66. **Radio Operator** *(S2, L3)* — Runs burst transmission and directional-antenna comms.
67. **Cipher Machine Operator** *(S2, L3)* — Runs the Reed Room's encryption hardware.
68. **Safe-House Keeper** *(S1, L4)* — Maintains a discreet location for meetings, debriefings, and short-term shelter.
69. **Dry-Cleaner** *(S2, L3)* — Specialist in countersurveillance routes for handlers and assets.
70. **Logistics Officer** *(S2, L3)* — Moves material via the Warp Line.
71. **Exfiltration Specialist** *(S3, L4)* — Plans and executes the clandestine removal of persons and material.

### H. Activatable Operations (verbs — what slotted personnel DO)

Each operation is a discrete action the player triggers. Some are one-shot; some are ongoing. All consume slot capacity and risk exposure.

**Recruitment & asset creation**

72. **Pitch** — Make the direct recruitment ask on an identified target.
73. **Run a Dangle** — Deliberately expose a controlled hire to a rival's recruiter.
74. **Process a Walk-In** — Accept, vet, and debrief a volunteer source.
75. **Resettle a Defector** — Absorb an incoming defector into the player's roster.
76. **Turn a Hostile Asset** — Convert a detected rival asset into a double agent.
77. **Re-Turn** — Convert a double whose cover has been blown into a triple.

**Compromise**

78. **Acquire Kompromat** — Kompromat Researcher builds a file on a named target over time.
79. **Release Kompromat** — Controlled public or private release of a file to coerce or discredit.
80. **Honey Trap** — Swallow/Raven lures a target into a compromising situation; kompromat accrues on success.
81. **Romeo Op** — Long-horizon romantic compromise of aides close to a principal.
82. **Sting** — Lure a target into exposed illegal conduct under observation.
83. **Provocation** — Push a target org into a self-discrediting action.

**Active measures**

84. **Active Measures Campaign** — Multi-quarter covert political warfare operation (mix of forgery, influence, disinfo).
85. **Dezinformatsiya Push** — Inject false information into a named press or platform channel.
86. **Maskirovka** — Layered concealment + decoys + disinformation protecting one of the player's own operations.
87. **Reflexive Control Op** — Feed a rival carefully selected information so they choose what the player wants.
88. **Publish a Forgery** — Release a fabricated document; success depends on Forger seniority.
89. **Black Propaganda** — Release content attributed to a false (usually rival) source.
90. **Grey Propaganda** — Release content of unattributed origin to shape narrative.
91. **White Propaganda** — Release content openly attributed to the player's own house org.

**Collection**

92. **Stand Up a Dead Drop** — Establishes a physical dead-drop location between handler and asset.
93. **Execute a Brush Pass** — One-time live-drop between two operatives.
94. **Mount Surveillance** — Observe a named target for a defined window.
95. **Intercept Communications** — SIGINT op against a rival's internal traffic.
96. **Tap a Rival's Supply Chain** — MASINT/FININT op detecting covert production runs.
97. **Satellite Pass** — GEOINT pass over a named rival facility.
98. **OSINT Sweep** — Broad, cheap coverage pass.

**Counterintelligence**

99. **Mount a Mole Hunt** — Full internal investigation; temporarily reduces factory throughput in exchange for CI gains.
100. **Plant a Canary Trap** — Version a document; identify the leaker on next release.
101. **Feed Barium Meal** — Plant fake information; detect which suspect repeats it.
102. **Run a Loyalty Audit** — Audit a named group of hires; flags defection risks.
103. **Issue a Burn Notice** — Cut all contact with a compromised asset.
104. **Set a Honeypot (CI)** — Attractive target laid out to identify hostile collectors.
105. **Parallel Construction** — Launder intelligence into a press-ready chain of evidence hiding the true source.

**Extraction & escalation**

106. **Exfiltrate Material** — Remove documents, drives, or physical assets from a target.
107. **Exfiltrate Personnel** — Clandestinely recover an asset or officer from hostile territory.
108. **Extract an Asset Under Fire** — Emergency extraction; high cost, high failure risk.
109. **Rendition** — Transfer a person from one jurisdiction to another covertly.
110. **Black Bag Job** — Surreptitious entry to steal, plant, or install surveillance.
111. **Wet Work** *(locked behind dedicated upgrade + ethics gate)* — Lethal operation against a named target; extreme kompromat risk on failure.
112. **False Flag Op** — An operation conducted so it appears to be carried out by another party.

**Sleeper & mole operations**

113. **Place a Sleeper** — Pre-position a hire inside a rival factory as a dormant sleeper.
114. **Activate a Sleeper** — Wake a sleeper for a specific task; one-shot discrete action.
115. **Run a Sleeper Cell** — Ongoing coordination of multiple sleepers via an anchor.
116. **Promote Sleeper to Illegal Rezident** — Convert a successful activated sleeper into a permanent deep-cover post.
117. **Roll Up a Rival Cell** — CI op that simultaneously burns every detected node of a rival cell.
118. **Burn Their Mole** — Expose a detected hostile penetration publicly or privately.

### I. Textile-Native Bureau Operations (game-invented, in-universe jargon)

119. **Open a Warp Line** — Establish a covert supply channel threaded through legitimate freight.
120. **Stand Up a Weft Cell** — Plant a single operational node inside a rival region.
121. **Run the Selvedge** — Extend a cutout chain out past the last trusted node.
122. **Transmit a Reed Code** — Send an encrypted pattern-message visually indistinguishable from a weaving draft.
123. **Send a Loom Signal** — Burst transmission disguised as a loom-controller instruction.
124. **Mount a Dyework** — Dye a story into public perception (disinformation op with domain-specific flavor).
125. **Plant a Bobbin Drop** — Dead drop concealed inside returned industrial textile packaging.
126. **Trigger an Unraveling** — Controlled collapse of a compromised cell with evidence destruction.
127. **Spin the Black Warp** — Publish (internally) a new roster of deep sleepers; no one outside the Director and Archivist sees it.
128. **Stitch a Legend** — Textile-native term for fabricating a cover identity.
129. **Cut the Thread** — Bureau term for a burn notice; all contact with an asset is severed on the same clock tick.

### J. Passive / Doctrinal Slots (no active verb; permanent effects while staffed)

130. **Compartmentalization Officer** *(S3, L4)* — Reduces the blast radius when any single slot is compromised.
131. **Need-to-Know Gatekeeper** *(S2, L5)* — Restricts information propagation inside the Bureau.
132. **Plausible-Deniability Architect** *(S4, L4)* — Ensures the CEO can credibly deny knowledge of any active op.
133. **Training Master (The Farm)** *(S4, L4)* — Slowly raises the seniority of low-level Bureau hires in place.
134. **Sparrow Schoolmaster** *(S3, L4)* — Graduates swallow/raven hires from the Sparrow School upgrade.
135. **Chekist Mentor** *(S4, L5, cosmetic)* — Flavor slot; provides a passive loyalty bonus to the whole Bureau.
136. **Siloviki Liaison** *(S4, L3)* — Passive bonus to all government-facing operations; passive penalty to treating civilians gently.

### K. Rival-Facing Escalation Slots (endgame)

137. **Foreign Service Liaison** *(S4, L4)* — Coordinates joint ops with allied services; unlocks shared safe houses.
138. **Embassy Rezident** *(S4, L4)* — Operates under diplomatic cover at rival headquarters.
139. **Press Asset Coordinator** *(S3, L3)* — Runs journalists as agents of influence; feeds press events with friendly framing.
140. **Regulator Asset Coordinator** *(S3, L4)* — Runs regulators, legislators, and their aides as assets of influence.
141. **Judicial Asset Coordinator** *(S4, L4)* — Pairs with the Chancery; runs compromised judges and clerks.
142. **Academic Asset Coordinator** *(S3, L3)* — Runs peer-lab researchers; feeds and collects alignment/espionage events (T6).
143. **Cult Liaison** *(S2, L2, flavor)* — Maintains quiet relationships with anti-AI religious movements for early warning.
144. **Luddite Desk** *(S3, L4)* — Full-time slot dedicated to detecting, infiltrating, and redirecting Luddite-analog movements across every tier.
145. **Union Desk** *(S3, L4)* — Parallel desk for detecting, infiltrating, and redirecting unionization drives.

### L. Vault Operations (kompromat archive)

146. **File Intake** — Deposit new compromising material into the Vault.
147. **Cross-Reference Pull** — Query the Vault for every file touching a named entity.
148. **Sealed Release** — Release a file to a single recipient (coercion).
149. **Open Release** — Release a file publicly (discrediting).
150. **Seal Permanently** — Mark a file as never-release (used to protect current allies; increases risk if allies become enemies).
151. **Trade a File** — Swap a Vault file with an allied service for one of theirs.
152. **Destroy a File** — Permanently remove a file from the Vault (reduces leverage; removes exposure risk).

### Reassignment rules (summary)

- Every activation draws from the **relocated-hire pool**. Once slotted, the hire no longer contributes to factory throughput.
- **Seniority** determines which slots a hire is eligible for (hard gate).
- **Loyalty** determines whether the hire will execute orders without creating kompromat against the company itself (soft gate — below threshold and the hire may defect, leak, or flip).
- Slot-specific **specializations** (swallow, raven, cryptographer, etc.) are trained via the corresponding upgrade (Sparrow School, Reed Room, etc.), not granted at hire.
- **Burnouts** return hires to the factory at reduced seniority and reduced loyalty. **Defections** remove the hire permanently; the hire may reappear as a rival asset.

---

## Open questions (to resolve before we wire upgrades)

1. Which codename do we commit to for the Bureau? Recommend **The Black Warp** as display name with an internal codename (e.g. **ARGUS**) used in spreadsheets, events, and in-game memos.
2. Do Chancery and Bureau share a single "relocation UI" or is each building its own panel?
3. At what tier is each building unlocked? Chancery feels T3 (the first time a federal commission fires); Bureau feels T5–T6 (unionization era, escalating into the AI-2027 arc).
4. Is the Vault a single upgrade or a building-within-a-building? If the Archivist slot empties on defection, the visual consequence should be dramatic.
5. Do we allow the player to *lose* their own Chancery / Bureau staff to a rival's pre-positioned sleeper? (Recommend yes — it makes counterintelligence matter.)
