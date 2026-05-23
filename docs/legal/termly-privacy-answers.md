# Termly Privacy Policy questionnaire — answers log

*Started: 2026-05-22. Completed: 2026-05-22. Tier: Termly free.*

This is a running record of every answer given to Termly's Privacy Policy generator, so we can reproduce, audit, or update later. The actual policy lives at `/privacy` via Termly embed; this file is the rationale layer behind it.

## Identity baseline (confirmed up front)

- **Operator:** Josh Jacobs (personally — no LLC formed yet)
- **State / governing law:** California
- **Contact email (privacy + general):** ondulertest@gmail.com
- **Website:** https://onduler.app
- **Termly account email:** ondulertest@gmail.com (matches privacy contact)

## Privacy Policy answers

### Use and Description
- **Type:** Website (PWA — Termly's "website" template covers web apps better than its mobile-app template, which assumes app stores)
- **Free or paid:** Free (research preview)
- **Category:** Software / SaaS or equivalent (avoid Health & Wellness — would trigger HIPAA-style clauses that don't apply)
- **Description (pasted):** "Onduler is a web-based personal habit-tracking and reflection app. Users log daily actions across different areas of their life and track their progress over time. The app supports steady daily-rhythm and recovery modes."

### Account update / delete instructions
- **Selected:** Both options — "Log in to your account settings" AND "Contact us using the contact information provided"
- *Rationale: Onduler supports in-app deletion (Settings) and the email path is the GDPR/CCPA rights-request fallback*

### User Age
- **Targets users under 18:** No
- *Rationale: "Targets" means directed-at, not whether minors might use it. Onduler isn't kid-themed. Answering No avoids COPPA + GDPR-K compliance overhead. The 13+ minimum is handled via TOS clickwrap, not by collecting DOB.*

### Personal Information Collected Directly
- **Checked:** Email address; Username and password
- **Other (free-text):** "User-generated content the user voluntarily enters into the app, including habit names, life-area names, daily logs, and reflection entries."
- *Did not check: name, phone, address, DOB, payment info, SSN, government ID, profile photo, geolocation*

### Sensitive Personal Information
- **Collects sensitive info:** No
- *Rationale: Onduler doesn't solicit or categorize health/religion/race/etc. data. Free-text fields where users may incidentally write sensitive content (anchors, motion names) are not "collecting sensitive PI" in the legal sense. Same posture as Notion or Apple Notes. The wellness-not-medical-advice TOS clause does the load-bearing work here.*

### Social Media Login
- **Use Facebook/Google/etc. login:** No
- *Email/password only via Supabase Auth. Reconfirm via Supabase dashboard → Authentication → Providers before submitting.*

### Derivative Data
- **Collects derivative data:** Yes (Sentry alone makes this true)
- **Categories selected:** Log and usage data; Device data; Location data (IP-based country inference via Sentry/Vercel — disclosing this is more conservative and accurate)
- **Add custom category:** No

### Google API Services
- **Uses Google APIs:** No
- *Stack is Supabase + Vercel + Sentry. Fonts use next/font/google (self-hosted at build time, no runtime Google calls).*

### Personal Information from Other Sources
- **Collect from other sources:** No
- *No data brokers, no enrichment, no scraping, no public-records lookups.*

### Legal Basis — Provision of Services / Contract
- **Uses personal info to provide services:** Yes
- **Reasons checked:**
  - To deliver and facilitate the delivery of services to the user
  - To respond to user inquiries
  - To send administrative information to users
- **Reasons skipped:** User-to-user communications (no social features); fulfill/manage orders (no commerce yet — add when Stripe ships)
- **Add custom reason:** No

### Legal Basis — Legitimate Interests
- **Other important reasons for using info:** Yes
- **Reasons checked:**
  - To identify usage trends (admin diagnostics surface aggregate stats; soft yes for honesty)
  - To protect your Services (Sentry + Vercel logs + Supabase auth event monitoring)
  - To request feedback (pre-tester feedback mailto; V1 exit criteria depend on it)
- **Reasons skipped:** Targeted advertising; promotional campaign measurement; marketing/promotional emails; profiling for automated decisions
- **Add custom reason:** No

### Marketing communications
- **Send marketing/promotional comms:** No
- *Transactional only — password resets, account verification, security alerts. Marketing plan is postcards + Instagram (organic), no email blasts.*

### Third Parties — Disclosure / Sale / Share
- **Selection:** Disclose only
- *Disclose to subprocessors (Supabase, Vercel, Sentry); never sell; never share for cross-context behavioral advertising.*

### How to list third parties
- **Selection:** List each company by name
- *Transparency + GDPR best practice. Termly embed makes updating easy if providers change.*

### Data Processing Agreements
- **DPAs in place:** Yes
  - Supabase DPA: https://supabase.com/legal/dpa
  - Vercel DPA: https://vercel.com/legal/dpa
  - Sentry DPA: https://sentry.io/legal/dpa
- *Incorporated by reference via each provider's standard ToS — no separate signed document required for self-serve accounts under GDPR Art. 28.*

### Business Transfers
- **Acknowledged:** Yes (Termly's "I understand" checkbox)

### Third-Party Service Categories
- **Functionality & Infrastructure Optimization** → Supabase (added as custom entry; not in Termly's preset list)
- **Website Hosting** → Vercel (added as custom entry; not in Termly's preset list)
- **Website Performance Monitoring** → Sentry (preset)

**Custom entries used:**

| Provider | URL | Privacy Policy | Country | Purpose |
|---|---|---|---|---|
| Supabase | https://supabase.com | https://supabase.com/privacy | United States | Backend platform: managed Postgres, authentication, storage |
| Vercel | https://vercel.com | https://vercel.com/legal/privacy-policy | United States | Cloud hosting and deployment platform for web applications |

**Categories skipped (and why):**

- Advertising / Marketing / Lead Generation — none
- Affiliate Marketing — none
- AI Platforms — none in production (revisit when LLM-assisted import ships per roadmap)
- Connect to Third-Party Accounts — no social login
- Cloud Computing Services — Supabase fits "Functionality & Infrastructure" better; don't double-list
- Communicate / Chat with Users — none
- Content Optimization — none
- Data Backup & Security — Supabase is primary DB, not a backup service
- Invoicing & Billing — no Stripe yet (revisit when monetization ships)
- Retargeting / Social Sharing / Online Posting — none
- User Account Registration & Authentication — this category is for third-party identity providers (Facebook Login, Google Sign-In); Supabase Auth is Onduler's own auth backend, not OAuth SSO
- User Commenting & Forums — none
- Web & Mobile Analytics — none (Sentry is error monitoring, not analytics)
- Website Testing — none

### Online Posting / Social Sharing
- **Selection:** No
- *No commenting, no public profiles, no user-to-user posting features.*

### Advertising
- **Run ads:** No

### Business Affiliates
- **Share personal information with business affiliates:** No
- *No parent company, no subsidiaries, no affiliate network.*

### Business Partners
- **Disclose information to business partners:** No
- *No partnership integrations, referral deals, or co-marketing arrangements.*

### Cookie Policy Link
- **Embed cookie policy link in privacy policy:** Yes
- **Cookie policy URL given to Termly:** https://onduler.app/cookies
- *Separate cookie policy doc generated by Termly. Will be wired into Next.js at /cookies route. Listed in footer alongside /privacy and /terms.*

### US State Privacy Laws
- **Comply with all state privacy laws:** Yes
- *Covers CCPA/CPRA, VCDPA, CPA, CTDPA, UCPA, TDPSA, OCPA, and other active state regimes. One-time setting; Termly auto-includes new state laws as they come online.*

### CA Shine the Light
- **Keep the Shine the Light disclosure:** Yes (do not remove)
- *Substantive obligation doesn't really trigger — no third-party marketing sharing — but keeping the clause is transparent and free.*

### Sale / Disclosure Methods (tracking technologies)
- **Selected:** None
- *Onduler uses no targeting cookies, social media cookies, beacons/pixels/tags, click redirects, or social plugins. All third-party data sharing happens via server-to-server API calls (Supabase, Vercel, Sentry) — already covered in the third-party disclosure section.*

### California Customer Records (Civ. Code §1798.80) Categories
- **Collected:** No
- **Disclosed:** No
- *None of the specific §1798.80 categories apply: no name, no physical address, no phone, no signature, no SSN, no passport, no driver's license, no insurance, no financial info, no medical info. Email is not on this specific list (covered by broader CCPA categories elsewhere).*

### Personal Identifiers (CCPA category)
- **Collected:** Yes (email addresses of signed-up users)
- **Disclosed:** Yes (to Supabase, Vercel, Sentry as subprocessors)
- **Retention for identifiers:** As long as the user has an account
- *Composes cleanly with the earlier "3 months after termination" rule — active accounts retain identifiers; after termination, 3-month backup grace period applies.*

### Characteristics (CCPA category)
- **Collected:** No
- **Disclosed:** No
- *No gender, age/DOB, race, religion, marital status, disability, or nationality data collected or inferred.*

### Consumer Data (CCPA category — commercial information)
- **Collected:** No
- **Disclosed:** No
- *No commerce yet, no purchase history, no payment patterns. Habit-tracking data is user-generated lifestyle content, not "consumer" data in the CCPA sense. Revisit when Stripe ships.*

### Biometric Data (CCPA category)
- **Collected:** No
- **Disclosed:** No
- *No fingerprint, face, voice, retina, or behavioral biometric data. iPhone Touch ID / Face ID happens on-device and is never transmitted to Onduler.*

### Internet Activity (CCPA category)
- **Collected:** Yes (Vercel access logs record URL paths; Sentry breadcrumbs capture in-app navigation prior to errors)
- **Disclosed:** Yes (to Vercel and Sentry as subprocessors)
- **Retention:** As long as the user has an account
- *Used for operational/security purposes, not for advertising or behavior-derived personalization. Already covered by earlier legitimate-interests answers (protect Services, identify usage trends).*

### Geolocation Data (CCPA category)
- **Collected:** Yes (IP-based country/region inference via Sentry and Vercel logs)
- **Disclosed:** Yes (to Sentry and Vercel as subprocessors)
- **Retention:** As long as the user has an account
- *No precise GPS — no Geolocation API calls, no location permissions requested. IP-based inference only.*

### Sensory Data (CCPA category — audio/visual/thermal/electronic/olfactory)
- **Collected:** No
- **Disclosed:** No
- *No microphone, camera, or sensor access. Text-based habit tracker only.*

### Professional and Employment Data (CCPA category)
- **Collected:** No
- **Disclosed:** No
- *The "Work" seeded swell is a user-chosen label, not solicited employment data.*

### Education Information (CCPA / FERPA category)
- **Collected:** No
- **Disclosed:** No
- *Not connected to any educational institution. "Mind" seeded swell is a user-chosen label, not education records.*

### Inferences (CCPA category)
- **Create consumer profiles from inferences:** No
- *Onduler computes things about user behavior (wave detection, ramps, anchors, engagement unlocks) but these are operational service features shown only to the user, not commercial profiles. Revisit if recommendation/personalization features ship that use cross-user inference.*

### CCPA Metrics (CPRA 10M+ threshold)
- **Process 10M+ Californians annually:** No
- *Trivially false at v1 scale. Threshold is for Meta/Google/Amazon-tier platforms.*

### Financial Incentives (CA/CO)
- **Offer financial incentives in exchange for personal info:** No
- *No referral rewards, no data-for-discount programs, no loyalty schemes.*

### US Privacy Inquiry Methods
- **Selected:** Email + Contact form
- **Email:** ondulertest@gmail.com
- **Contact form URL provided to Termly:** https://onduler.app/contact (to be built — see Task #9)
- *Two methods chosen per FL/NE/TX two-methods requirement. Toll-free phone skipped — not realistic for solo founder. Picked option A: build a real /contact page with public access (no login) and a structured form, since the initial proposal of /settings would have failed the compliance test (gated behind login + mailto rather than form).*

### EEA / UK Representative (GDPR Article 27)
- **Selection:** Neither
- *Qualifies for Article 27(2) exemption: processing is occasional (handful of EU testers), no sensitive categories on large scale, no regular systematic monitoring. Revisit when EU/UK user count grows beyond casual scale.*

### Data Protection Officer (DPO)
- **Appoint formal DPO:** No
- *GDPR Article 37 requirements not triggered: not a public authority, no large-scale systematic monitoring, no special-category processing at scale. Josh is the de facto privacy contact via ondulertest@gmail.com. Revisit if Article 37 triggers in the future.*

### Policy Contact Email
- **Email:** ondulertest@gmail.com
- *Same email used throughout: privacy contact, Termly account, US privacy inquiries, policy questions.*

### Account Consent Preferences
- **Users can update consent via account:** No
- *Nothing in the product currently requires consent toggling — no marketing emails, no analytics, no non-essential cookies, no data sale/sharing. Implicit consent at signup; withdraw by account deletion. Revisit if any of those change.*

### Data Subject Access Requests (DSAR)
- **Provide own DSAR service:** No — use Termly's service
- **When users can request access:** Always (not just when their country's law grants it)
- *Termly's hosted DSAR intake categorizes requests by jurisdiction + type and tracks compliance response clocks automatically (GDPR 30-day, CCPA 45-day). Reduces solo-founder risk of missing deadlines. The /contact form remains the general-purpose channel; Termly's form is purpose-built for rights requests. "Always" matches Onduler's generous product voice over the legally-minimum "only when law grants" — practical cost is the same.*

### Global Privacy Control (GPC)
- **GPC enabled:** No
- *No code reads the Sec-GPC header. Non-issue substantively since Onduler doesn't sell data or share for cross-context behavioral advertising. Revisit if any of that ever changes.*

### Additional Clause
- **Add custom clause:** No
- *Standard Termly coverage is sufficient. Onduler-specific items (wellness disclaimer, research-preview language) belong in the TOS, not the Privacy Policy. User-generated content already covered in personal-info-direct section.*

### Policy Title
- **Selected:** Privacy Policy
- *Standard, expected, matches the /privacy route.*

### Effective Date
- **Selected:** Effective today (2026-05-22)
- *Brand-new policy, no legacy users requiring notice period. Last updated + Effective both = 2026-05-22.*

### Company Details
- **Legal name:** Josh Jacobs (personal name — no entity formed)
- **DBA (trade name):** Yes — Onduler
- **Privacy email:** ondulertest@gmail.com
- **Same email for right-to-appeal:** Yes
- **Phone:** (510) 479-0918 — Google Voice number set up specifically for Onduler business use; forwards to Josh's cell. Keeps personal cell out of public policy.
- **Business address:** Josh's home address (acceptable for v1; will become publicly searchable on the published privacy policy. Upgrade triggers: virtual mailbox / P.O. Box / registered agent if/when forming LLC).

### Final Coverage Review
- **US:** all state privacy laws (CCPA/CPRA + every state regime currently active)
- **Europe:** GDPR (EU/UK/Iceland/Norway/Lichtenstein) + FADP (Switzerland)
- **Canada:** PIPEDA + Quebec Law 25
- **Other regions added:** POPIA (South Africa) + Privacy Act (Australia) + Privacy Act 2020 (New Zealand)
- *Three optional regions added for transparency / future-proofing — onduler.app is publicly accessible globally and Instagram marketing reaches AU/NZ/ZA. Substantive obligations overlap heavily with GDPR/CCPA. Small-business exemptions apply under each (AU's <AU$3M threshold, similar for NZ + ZA).*

### International Transfers
- **Transfer EU/UK data outside EU/UK:** Yes
- **Server locations:** United States only (Supabase confirmed in Northern California / us-west-1)
- **Third-party locations:** United States (Supabase Inc., Vercel Inc., Functional Software Inc. are all Delaware-incorporated with SF HQs)
- **Transfer mechanism:** Standard Contractual Clauses (SCCs) — incorporated via the Supabase, Vercel, and Sentry DPAs. BCRs unchecked (not applicable to Onduler's external-vendor model).
- **Link to Onduler's own DPA:** No (Onduler is B2C; doesn't have its own DPA document. Revisit if/when enterprise customers require one.)
- **Adhere to Data Privacy Framework (DPF):** No (SCCs cover the transfer mechanism; DPF self-certification is overkill for v1 — annual fees + FTC enforcement commitment + DPF-specific policy language. Revisit if selling to EU enterprises that require it.)
- *All subprocessor infrastructure is US-based, so EU/UK user data has a single transfer path (EU/UK → US) covered by SCCs.*

### Cookies / Web Beacons / Google Maps
- **Selection:** Cookies and/or web beacons
- *Onduler uses essential cookies only: Supabase Auth session cookie + Next.js operational cookies + theme/preference cookies. No tracking, analytics, or advertising cookies. No Google Maps APIs.*
- **Cookie consent banner needed?** No — strictly necessary cookies are exempt from GDPR consent. Revisit when/if analytics or advertising cookies are added.

### Security Measures
- **Has appropriate security measures:** Yes
- *Stack provides: Supabase SOC 2 (encryption at rest, TLS, RLS); Vercel SOC 2 (HTTPS); Sentry SOC 2; password hashing via Supabase Auth; service-role keys gated with 'server-only' marker.*

### Breach Notification Acknowledgment
- **Acknowledged "I understand my legal obligation":** Yes
- *GDPR 72-hour rule + state breach-notification laws (CA AG for California) apply if a breach occurs.*

### Data Retention
- **Selection:** A number of months after the user's account is terminated
- **Number entered:** 3 months
- *Rationale: Option 1 ("as long as the user has an account") understates the backup-retention reality. Option 3 ("N months after idle") directly contradicts Onduler's core wave philosophy — auto-deleting dormant accounts would betray the "we'll be here when you're back" promise. 3 months matches Termly's example default, gives operational headroom for Supabase backup rotation (varies by tier; free is 7 days PITR, pro is longer), and is dead-center of SaaS norms.*

---

## TODO — sections not yet covered in the questionnaire

- *(remainder of questionnaire to be added as we proceed)*

## After the questionnaire — manual additions

- **TOS:** wellness / not-medical-advice disclaimer
- **TOS:** research-preview clause
- **Site wiring:** `/privacy` + `/terms` routes via Termly embed; footer links; signup clickwrap line

## Revisit triggers

Re-open the Termly questionnaire and update when any of these happen:

- Stripe ships → add Stripe under Invoicing & Billing; add "payment information" to data collected; add paid-tier language to TOS
- Social login enabled in Supabase → flip Social Media Login to Yes; list providers
- LLM-assisted import ships → add AI Platforms category with the relevant provider
- Vercel Analytics turned on → add to derivative data + analytics category
- Newsletter / product-update emails → flip marketing comms to Yes (both places)
- Subprocessor swapped → update name + URL in third-party listings
- LLC formed → swap operator name from "Josh Jacobs" to entity
