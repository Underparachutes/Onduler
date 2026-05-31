import { renderEmailWaveSvg } from './email-wave-svg'
import { formatCycleLabel, type Cadence, type Cycle } from './cycles'

// Cycle-close email body. Witness voice (ADR 0008 / PROJECT.md), no
// nudging, no metrics, single CTA. The wave SVG inlines at the top as a
// hero; modern email clients render it cleanly. Outlook desktop strips
// SVG — the email still reads correctly without it because the copy and
// CTA carry the message.
//
// Subject line + body match in tone: announcement that the surface is
// open, not a coach telling the user what to do.

type Args = {
  cadence: Cadence  // 'week' for now; the helpers accept the others
  cycle: Cycle
  anchorsUrl: string
  unsubscribeUrl: string
}

export function cycleCloseSubject(args: Args): string {
  const noun =
    args.cadence === 'week' ? 'week'
      : args.cadence === 'month' ? 'month'
        : args.cadence === 'quarter' ? 'quarter'
          : 'year'
  return `Your ${noun} closed. The wake is here.`
}

export function cycleCloseHtml(args: Args): string {
  const noun =
    args.cadence === 'week' ? 'week'
      : args.cadence === 'month' ? 'month'
        : args.cadence === 'quarter' ? 'quarter'
          : 'year'
  const label = formatCycleLabel(args.cycle, args.cadence)
  const wave = renderEmailWaveSvg({ width: 600, height: 220 })

  return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="dark only">
    <meta name="supported-color-schemes" content="dark only">
    <title>Your ${noun} closed.</title>
  </head>
  <body style="margin:0;padding:0;background:#0c1116;color:#e8e6e1;font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0c1116;">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#0c1116;">
            <tr>
              <td style="padding:0;line-height:0;font-size:0;">${wave}</td>
            </tr>
            <tr>
              <td style="padding:36px 32px 12px 32px;">
                <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#897f74;">Onduler</p>
                <h1 style="margin:0 0 24px 0;font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:500;font-size:24px;line-height:1.3;letter-spacing:0.02em;color:#e8e6e1;">
                  Your ${noun} closed.
                </h1>
                <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#b3ada3;">
                  ${label}.
                </p>
                <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#b3ada3;">
                  The wake is here when you're ready to look.
                </p>
                <p style="margin:0 0 40px 0;">
                  <a href="${args.anchorsUrl}" style="display:inline-block;padding:12px 22px;background:#e8e6e1;color:#0c1116;font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:500;font-size:14px;letter-spacing:0.04em;text-decoration:none;border-radius:6px;">
                    See your wake
                  </a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 36px 32px;border-top:1px solid #1e242b;">
                <p style="margin:24px 0 6px 0;font-size:12px;line-height:1.5;color:#504a42;">
                  Every motion leaves a wake.
                </p>
                <p style="margin:0;font-size:11px;line-height:1.5;color:#504a42;">
                  <a href="${args.unsubscribeUrl}" style="color:#897f74;text-decoration:underline;">Unsubscribe</a> from cycle-close emails.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function cycleCloseText(args: Args): string {
  const noun =
    args.cadence === 'week' ? 'week'
      : args.cadence === 'month' ? 'month'
        : args.cadence === 'quarter' ? 'quarter'
          : 'year'
  const label = formatCycleLabel(args.cycle, args.cadence)
  return `Your ${noun} closed.

${label}.

The wake is here when you're ready to look.

See your wake: ${args.anchorsUrl}

---
Every motion leaves a wake.
Unsubscribe: ${args.unsubscribeUrl}
`
}
