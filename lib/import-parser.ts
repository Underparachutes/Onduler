export type ImportPreview = {
  swells: { name: string; target: number | null }[]
  motions: { name: string; points: number; hours: number }[]
  groups: { name: string }[]
  swellAssignments: { motionName: string; swellName: string }[]
  groupAssignments: { motionName: string; groupName: string }[]
  unparsedLineCount: number
}

type Section = 'swells' | 'motions' | 'groups' | null

const SECTION_MAP: Record<string, Section> = {
  swells: 'swells',
  swell: 'swells',
  goals: 'swells',
  domains: 'swells',
  motions: 'motions',
  motion: 'motions',
  tasks: 'motions',
  habits: 'motions',
  activities: 'motions',
  groups: 'groups',
  group: 'groups',
  buckets: 'groups',
}

function detectSection(line: string): Section | false {
  const match = line.match(/^#{1,3}\s+(.+?)[:.]?\s*$/)
  if (!match) return false
  const key = match[1].trim().toLowerCase()
  return SECTION_MAP[key] ?? false
}

function extractTarget(text: string): { name: string; target: number | null } {
  const patterns = [
    /\[target:\s*(\d+(?:\.\d+)?)\]/i,
    /\(target\s+(\d+(?:\.\d+)?)\)/i,
    /→\s*(\d+(?:\.\d+)?)\s*(?:pts?|hr|hrs|hours?|\/week|\/wk)?/i,
    /[–—-]\s*(\d+(?:\.\d+)?)\/(?:week|wk)/i,
    /\[(\d+(?:\.\d+)?)\]\s*$/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const name = text.replace(p, '').replace(/[-–—]\s*$/, '').trim()
      return { name, target: parseFloat(m[1]) }
    }
  }
  return { name: text.trim(), target: null }
}

function extractPoints(text: string): { name: string; points: number; hours: number } {
  const patterns = [
    /\((\d+(?:\.\d+)?)\s*(?:pts?|points?)\)/i,
    /\((\d+(?:\.\d+)?)\s*(?:hrs?|hours?)\)/i,
    /\[(\d+(?:\.\d+)?)\]\s*$/,
    /:\s*(\d+(?:\.\d+)?)\s*$/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const name = text.replace(p, '').trim()
      const val = parseFloat(m[1])
      const isHoursHint = /hrs?|hours?/i.test(m[0])
      return {
        name,
        points: isHoursHint ? 1 : Math.max(1, Math.round(val)),
        hours: isHoursHint ? val : 1,
      }
    }
  }
  return { name: text.trim(), points: 1, hours: 1 }
}

function stripBullet(line: string): { text: string; indent: number } | null {
  const m = line.match(/^(\s*)[-*+]\s+(.+)$/)
  if (!m) return null
  return { text: m[2].trim(), indent: m[1].length }
}

export function parseImportMarkdown(markdown: string, trackingMode: 'points' | 'hours'): ImportPreview {
  const lines = markdown.split('\n')
  let section: Section = null
  let currentParent: string | null = null
  let parentIndent = 0

  const swellMap = new Map<string, number | null>()
  const motionMap = new Map<string, { points: number; hours: number }>()
  const groupSet = new Set<string>()
  const swellAssignments: { motionName: string; swellName: string }[] = []
  const groupAssignments: { motionName: string; groupName: string }[] = []
  let unparsedLineCount = 0

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line.trim()) continue

    const detected = detectSection(line)
    if (detected !== false) {
      section = detected
      currentParent = null
      continue
    }

    // Skip the setup header
    if (/^#{1,3}\s+onduler\s+setup/i.test(line)) continue
    // Skip code fences
    if (/^```/.test(line.trim())) continue

    if (!section) {
      unparsedLineCount++
      continue
    }

    const bullet = stripBullet(line)
    if (!bullet) {
      unparsedLineCount++
      continue
    }

    if (section === 'swells') {
      if (currentParent && bullet.indent > parentIndent) {
        const motionName = bullet.text.replace(/\(.*?\)|\[.*?\]/g, '').trim()
        if (motionName) {
          swellAssignments.push({ motionName, swellName: currentParent })
          if (!motionMap.has(motionName.toLowerCase())) {
            motionMap.set(motionName.toLowerCase(), { points: 1, hours: 1 })
          }
        }
      } else {
        const { name, target } = extractTarget(bullet.text)
        if (name) {
          swellMap.set(name.toLowerCase(), target)
          currentParent = name
          parentIndent = bullet.indent
        }
      }
    } else if (section === 'motions') {
      const { name, points, hours } = extractPoints(bullet.text)
      if (name) {
        motionMap.set(name.toLowerCase(), { points, hours })
      }
    } else if (section === 'groups') {
      if (currentParent && bullet.indent > parentIndent) {
        const motionName = bullet.text.replace(/\(.*?\)|\[.*?\]/g, '').trim()
        if (motionName) {
          groupAssignments.push({ motionName, groupName: currentParent })
        }
      } else {
        const name = bullet.text.trim()
        if (name) {
          groupSet.add(name)
          currentParent = name
          parentIndent = bullet.indent
        }
      }
    }
  }

  const swells = Array.from(swellMap.entries()).map(([key, target]) => {
    const original = findOriginalCase(markdown, key)
    return { name: original, target }
  })

  const motions = Array.from(motionMap.entries()).map(([key, val]) => {
    const original = findOriginalCase(markdown, key)
    return { name: original, ...val }
  })

  const groups = Array.from(groupSet).map(name => ({ name }))

  const normalizedSwellAssignments = swellAssignments.map(a => ({
    motionName: findOriginalCase(markdown, a.motionName.toLowerCase()),
    swellName: findOriginalCase(markdown, a.swellName.toLowerCase()),
  }))

  const normalizedGroupAssignments = groupAssignments.map(a => ({
    motionName: findOriginalCase(markdown, a.motionName.toLowerCase()),
    groupName: a.groupName,
  }))

  return {
    swells,
    motions,
    groups,
    swellAssignments: normalizedSwellAssignments,
    groupAssignments: normalizedGroupAssignments,
    unparsedLineCount,
  }
}

function findOriginalCase(markdown: string, lowered: string): string {
  for (const line of markdown.split('\n')) {
    const bullet = stripBullet(line)
    if (!bullet) continue
    const cleaned = bullet.text
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/→.*$/g, '')
      .replace(/[–—-]\s*\d+.*$/g, '')
      .trim()
    if (cleaned.toLowerCase() === lowered) return cleaned
  }
  return lowered.charAt(0).toUpperCase() + lowered.slice(1)
}
