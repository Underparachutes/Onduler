import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Onduler',
  description: 'Terms of Service for Onduler, the personal habit-tracking and reflection tool.',
}

export default function TermsPage() {
  return (
    <div className="px-4 py-12 pb-24">
      <Link
        href="/"
        className="mb-8 inline-block text-xs text-th-muted hover:text-th-text transition-colors"
      >
        &larr; Back
      </Link>
      <div className="legal-content">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: May 23, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement between you and
          Joshua Jacobs, doing business as Onduler (&ldquo;Onduler,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;), governing your access to and use of the
          Onduler website at{' '}
          <a href="https://onduler.app">https://onduler.app</a> and any related services
          (collectively, the &ldquo;Service&rdquo;).
        </p>
        <p>
          By creating an account, using the Service, or clicking to indicate your agreement, you
          accept these Terms in full. If you do not agree to these Terms, do not use the Service.
        </p>
        <p>
          These Terms incorporate by reference our{' '}
          <Link href="/privacy">Privacy Policy</Link> and our{' '}
          <Link href="/cookies">Cookie Policy</Link>.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old to use the Service. If you are between 13 and the age
          of majority in your jurisdiction, you may use the Service only with the consent of a
          parent or legal guardian who agrees to be bound by these Terms on your behalf.
        </p>
        <p>
          The Service is not directed at children under 13, and we do not knowingly collect
          personal information from children under 13. If you become aware that a child under 13
          has provided personal information to us, please contact us at{' '}
          <a href="mailto:ondulertest@gmail.com">ondulertest@gmail.com</a>.
        </p>

        <h2>3. Description of the Service</h2>
        <p>
          Onduler is a personal habit-tracking and reflection tool. The Service allows you to log
          daily actions (&ldquo;motions&rdquo;), organize them across life areas
          (&ldquo;swells&rdquo;), and reflect on your patterns over time (&ldquo;anchors&rdquo;).
          The Service is provided through a web-based progressive web application.
        </p>
        <p>
          The Service does not provide medical, mental-health, financial, legal, or professional
          advice of any kind. See &ldquo;Not Medical Advice&rdquo; below.
        </p>

        <h2>4. Research Preview Status</h2>
        <p>
          Onduler is in a research-preview phase. By using the Service, you acknowledge and accept
          that:
        </p>
        <ul>
          <li>
            <strong>The Service is not stable.</strong> Features may change, be added, or be
            removed at any time without notice. Visual design, vocabulary, workflows, and data
            structures may evolve as we learn what works for users.
          </li>
          <li>
            <strong>The Service is provided free of charge during the research-preview period.</strong>{' '}
            Pricing, paid tiers, or other charges may be introduced in the future. You will be
            notified before any free-to-paid transition affects your account.
          </li>
          <li>
            <strong>The Service may be discontinued.</strong> Onduler is operated by an individual
            (Joshua Jacobs) and is not guaranteed to remain available. We may end the Service, in
            whole or in part, at any time. We will make reasonable efforts to give you advance
            notice and time to export your data before any shutdown.
          </li>
          <li>
            <strong>You can export your data at any time.</strong> A complete JSON export of your
            account is available via the Settings page. We recommend you export periodically so you
            retain your motions, swells, anchors, and logs in a form independent of the Service.
          </li>
          <li>
            <strong>Bugs, data loss, and downtime are possible.</strong> While we take reasonable
            care to operate the Service reliably, you should not store information in Onduler that
            you cannot afford to lose. The Disclaimer of Warranties and Limitation of Liability
            provisions of these Terms apply with particular force during the research-preview
            period.
          </li>
        </ul>
        <p>
          When Onduler exits research-preview, these Terms will be updated, and you will be
          notified through the Service or by email.
        </p>

        <h2>5. Not Medical Advice</h2>
        <p>
          Onduler is a personal reflection tool, not a healthcare product. The Service is not
          medical advice, mental-health treatment, therapy, diagnosis, or care of any kind. Onduler
          does not assess your wellbeing, evaluate your habits, or intervene if your patterns
          appear concerning — by design, the Service witnesses what you choose to log and reflects
          it back without judgment.
        </p>
        <p>You agree that:</p>
        <ul>
          <li>
            You will not rely on the Service to diagnose, treat, cure, or prevent any medical or
            mental-health condition.
          </li>
          <li>
            You will consult a qualified professional for questions about your physical health,
            mental health, eating, exercise, substance use, sleep, or any other matter that
            warrants clinical guidance.
          </li>
          <li>
            You are responsible for your own use of the Service, including how you interpret your
            tracked data and what actions, if any, you take based on it.
          </li>
          <li>
            The Service does not detect or moderate patterns of disordered eating, exercise
            compulsion, self-harm, substance dependence, or other concerning behaviors that may
            appear in your data. If you notice such patterns in yourself, please reach out for
            support.
          </li>
        </ul>
        <p>
          If you are experiencing a mental health crisis or are concerned about your safety:
        </p>
        <ul>
          <li>
            <strong>United States:</strong> call or text 988 (Suicide &amp; Crisis Lifeline).
          </li>
          <li>
            <strong>Outside the United States:</strong> contact your local emergency services or a
            crisis helpline in your country.
          </li>
        </ul>
        <p>
          Nothing in the Service should be interpreted as medical advice, and no statement made by
          Onduler or its operators creates a treatment, therapy, or healthcare relationship of any
          kind.
        </p>

        <h2>6. Your Account</h2>
        <p>
          To use most features of the Service, you must create an account. When creating an
          account, you agree to:
        </p>
        <ul>
          <li>Provide accurate and complete information.</li>
          <li>Maintain the security of your password and not share it with others.</li>
          <li>
            Notify us promptly at{' '}
            <a href="mailto:ondulertest@gmail.com">ondulertest@gmail.com</a> if you suspect
            unauthorized access to your account.
          </li>
          <li>Be responsible for all activity that occurs under your account.</li>
        </ul>
        <p>
          You may close your account at any time through the Settings page or by emailing us.
          Closing your account will delete your data from active databases within 90 days, subject
          to the retention periods described in the Privacy Policy.
        </p>
        <p>
          We may suspend or terminate your account if we reasonably believe you have violated these
          Terms. See &ldquo;Termination&rdquo; below.
        </p>

        <h2>7. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service to violate any applicable law or regulation.</li>
          <li>
            Attempt to gain unauthorized access to the Service, other users&apos; accounts, or our
            systems.
          </li>
          <li>
            Interfere with or disrupt the Service, including by introducing malware, mounting
            denial-of-service attacks, or making excessive automated requests.
          </li>
          <li>
            Reverse engineer, decompile, or attempt to extract the source code of the Service,
            except to the extent expressly permitted by applicable law.
          </li>
          <li>Use the Service to harass, defame, or impersonate any person.</li>
          <li>Use the Service to send unsolicited communications to others.</li>
          <li>
            Scrape, crawl, or use automated tools to access the Service without our written
            permission.
          </li>
          <li>
            Resell, sublicense, or commercially exploit the Service without our written permission.
          </li>
        </ul>
        <p>
          We may take action — up to and including termination of your account — in response to
          conduct that we reasonably believe violates this section.
        </p>

        <h2>8. Your Content</h2>
        <p>
          The Service allows you to enter content, including motion names, swell names, group
          names, daily logs, anchor entries, reflections, and other text and selections (&ldquo;Your
          Content&rdquo;).
        </p>
        <p>
          <strong>You own Your Content.</strong> Onduler does not claim ownership of anything you
          log or reflect on in the Service. Your Content belongs to you.
        </p>
        <p>
          <strong>License to operate the Service.</strong> You grant Onduler a worldwide,
          non-exclusive, royalty-free license to store, process, transmit, and display Your Content
          solely to the extent necessary to provide the Service to you. This license terminates
          when you delete Your Content or close your account, subject to backup retention periods
          described in the Privacy Policy.
        </p>
        <p>
          <strong>You are responsible for Your Content.</strong> You represent that Your Content
          does not violate the rights of any third party and does not contain unlawful material.
        </p>
        <p>
          <strong>Export.</strong> You can download a complete JSON export of Your Content at any
          time through the Settings page.
        </p>

        <h2>9. Our Content and Intellectual Property</h2>
        <p>
          The Service, including its design, code, vocabulary (for example, &ldquo;motions,&rdquo;
          &ldquo;swells,&rdquo; &ldquo;tides,&rdquo; &ldquo;waves,&rdquo;
          &ldquo;anchors,&rdquo; &ldquo;wakes&rdquo;), logos, and other materials we provide
          (collectively, &ldquo;Onduler Content&rdquo;), is owned by Joshua Jacobs or our
          licensors and is protected by copyright, trademark, and other intellectual property laws.
        </p>
        <p>
          We grant you a limited, personal, non-exclusive, non-transferable, revocable license to
          access and use the Service for your own personal, non-commercial use, subject to these
          Terms.
        </p>
        <p>No other rights to Onduler Content are granted. In particular, you may not:</p>
        <ul>
          <li>
            Copy, modify, or create derivative works of Onduler Content except as expressly
            permitted.
          </li>
          <li>
            Use Onduler Content to train machine learning models without our written permission.
          </li>
          <li>
            Use our trademarks, logos, or vocabulary in connection with any product or service
            without our written permission.
          </li>
        </ul>
        <p>
          Some components of the Service are provided under open-source licenses. Those components
          are governed by their respective license terms, which take precedence over this section
          for those components.
        </p>

        <h2>10. Feedback</h2>
        <p>
          If you send us feedback, suggestions, or ideas about the Service, you grant us a
          perpetual, worldwide, royalty-free license to use that feedback without obligation to
          compensate or credit you. You retain the right to use your own ideas for any purpose.
        </p>

        <h2>11. Privacy</h2>
        <p>
          Your use of the Service is governed by our{' '}
          <Link href="/privacy">Privacy Policy</Link>, which describes how we collect, use, and
          protect your personal information. By using the Service, you consent to the data
          practices described in the Privacy Policy.
        </p>

        <h2>12. Termination</h2>
        <p>
          <strong>By you.</strong> You can terminate your account at any time through the Settings
          page or by emailing{' '}
          <a href="mailto:ondulertest@gmail.com">ondulertest@gmail.com</a>. Your obligations under
          the sections covering Your Content (other than your license grant to us, which
          terminates), Our Content and Intellectual Property, Disclaimer of Warranties, Limitation
          of Liability, Indemnification, and Governing Law survive termination.
        </p>
        <p>
          <strong>By us.</strong> We may suspend or terminate your account at any time, with or
          without notice, if we reasonably believe:
        </p>
        <ul>
          <li>You have violated these Terms.</li>
          <li>
            Your conduct creates risk for the Service, other users, or third parties.
          </li>
          <li>We are required to do so by law.</li>
          <li>
            We are discontinuing the Service in whole or in part (see &ldquo;Research Preview
            Status&rdquo;).
          </li>
        </ul>
        <p>
          If we terminate your account without cause (for example, as part of a Service shutdown),
          we will make reasonable efforts to give you advance notice and time to export your data.
        </p>

        <h2>13. Disclaimer of Warranties</h2>
        <p className="uppercase">
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
          warranties of any kind, express or implied. To the fullest extent permitted by applicable
          law, we disclaim all warranties, including implied warranties of merchantability, fitness
          for a particular purpose, and non-infringement.
        </p>
        <p>
          We do not warrant that the Service will be uninterrupted, secure, or error-free, that
          defects will be corrected, or that the Service is free of viruses or other harmful
          components. You use the Service at your own risk.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion of certain warranties. If those laws apply
          to you, some of the above exclusions may not apply.
        </p>

        <h2>14. Limitation of Liability</h2>
        <p className="uppercase">
          To the fullest extent permitted by applicable law, Onduler and its operator (Joshua
          Jacobs) will not be liable for any indirect, incidental, special, consequential, or
          punitive damages, or any loss of profits, revenue, data, or goodwill, arising out of or
          in connection with your use of the Service, even if we have been advised of the
          possibility of such damages.
        </p>
        <p className="uppercase">
          Our total liability for all claims related to the Service will not exceed the greater of
          (a) the amount you paid us in the twelve months before the claim arose or (b) one hundred
          U.S. dollars ($100).
        </p>
        <p>
          These limitations apply regardless of the legal theory on which the claim is based.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion or limitation of certain damages. If those
          laws apply to you, some of the above limitations may not apply.
        </p>

        <h2>15. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless Onduler, Joshua Jacobs, and any
          contractors or agents acting on our behalf from and against any claims, damages, losses,
          liabilities, and expenses (including reasonable attorneys&apos; fees) arising out of:
        </p>
        <ul>
          <li>Your use of the Service.</li>
          <li>Your violation of these Terms.</li>
          <li>
            Your violation of any third party&apos;s rights, including intellectual property
            rights.
          </li>
          <li>Your Content.</li>
        </ul>
        <p>
          We reserve the right to assume the exclusive defense and control of any matter otherwise
          subject to indemnification by you, in which case you agree to cooperate with our defense.
        </p>

        <h2>16. Governing Law and Dispute Resolution</h2>
        <p>
          These Terms are governed by the laws of the State of California, USA, without regard to
          its conflict-of-laws principles.
        </p>
        <p>
          <strong>Informal resolution first.</strong> Before filing any formal claim, you agree to
          contact us at{' '}
          <a href="mailto:ondulertest@gmail.com">ondulertest@gmail.com</a> and try to resolve the
          dispute informally for at least 30 days.
        </p>
        <p>
          <strong>Forum.</strong> If informal resolution fails, any dispute arising out of or
          relating to these Terms or the Service will be brought exclusively in the state or
          federal courts located in Alameda County, California, and you and we consent to the
          personal jurisdiction of those courts.
        </p>
        <p>
          <strong>Small claims.</strong> Either party may bring a claim in small claims court if
          the claim qualifies.
        </p>
        <p>
          <strong>Class action waiver.</strong> You and we each waive any right to participate in a
          class action against the other. All claims must be brought individually.
        </p>

        <h2>17. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material changes, we will notify
          you through the Service or by email to the address associated with your account at least
          14 days before the changes take effect. Your continued use of the Service after the
          effective date constitutes acceptance of the updated Terms.
        </p>
        <p>
          The &ldquo;Last updated&rdquo; date at the top of these Terms indicates when they were
          last revised.
        </p>

        <h2>18. Miscellaneous</h2>
        <p>
          <strong>Entire agreement.</strong> These Terms, together with the Privacy Policy and
          Cookie Policy, constitute the entire agreement between you and Onduler regarding the
          Service.
        </p>
        <p>
          <strong>Severability.</strong> If any provision of these Terms is held to be
          unenforceable, the remaining provisions will continue in full force and effect.
        </p>
        <p>
          <strong>No waiver.</strong> Our failure to enforce any provision of these Terms will not
          be considered a waiver of that provision.
        </p>
        <p>
          <strong>Assignment.</strong> You may not assign these Terms without our prior written
          consent. We may assign these Terms in connection with a sale, merger, or other transfer
          of Onduler.
        </p>
        <p>
          <strong>Third-party beneficiaries.</strong> These Terms do not create any third-party
          beneficiary rights.
        </p>
        <p>
          <strong>Notices.</strong> We may send notices to you by email to the address associated
          with your account or by posting them on the Service. You agree that electronic notices
          satisfy any legal requirement that notices be in writing.
        </p>

        <h2>19. Contact</h2>
        <p>If you have questions about these Terms, please contact us:</p>
        <p>
          <strong>Email:</strong>{' '}
          <a href="mailto:ondulertest@gmail.com">ondulertest@gmail.com</a>
          <br />
          <strong>Phone:</strong> (510) 479-0918
          <br />
          <strong>Mail:</strong>
          <br />
          Joshua Jacobs / Onduler
          <br />
          201 University Ave
          <br />
          Berkeley, CA 94710
          <br />
          United States
        </p>
      </div>
    </div>
  )
}
