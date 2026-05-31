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
  const hashMatch = line.match(/^#{1,3}\s+(.+?)[:.]?\s*$/)
  if (hashMatch) {
    const key = hashMatch[1].trim().toLowerCase()
    return SECTION_MAP[key] ?? false
  }
  const bare = line.trim().toLowerCase().replace(/[:.]$/, '')
  if (SECTION_MAP[bare] !== undefined) return SECTION_MAP[bare]
  return false
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

function parseLine(line: string): { text: string; indent: number } | null {
  const bullet = line.match(/^(\s*)[-*+]\s+(.+)$/)
  if (bullet) return { text: bullet[2].trim(), indent: bullet[1].length }
  const indented = line.match(/^(\s+)(\S.+)$/)
  if (indented) return { text: indented[2].trim(), indent: indented[1].length }
  const bare = line.match(/^(\S.+)$/)
  if (bare) return { text: bare[1].trim(), indent: 0 }
  return null
}

export function parseImportMarkdown(markdown: string, _trackingMode: 'points' | 'hours'): ImportPreview {
  const lines = markdown.split('\n')
  let section: Section = null
  let currentParent: string | null = null
  let parentIndent = -1
  let blankCount = 0
  let hasIndentation = false
  let hasChildrenForParent = false

  for (const line of lines) {
    if (/^(\s*)[-*+]\s/.test(line) && RegExp.$1.length > 0) { hasIndentation = true; break }
    if (/^\s{2,}\S/.test(line)) { hasIndentation = true; break }
  }

  const swellMap = new Map<string, number | null>()
  const motionMap = new Map<string, { points: number; hours: number }>()
  const groupSet = new Set<string>()
  const swellAssignments: { motionName: string; swellName: string }[] = []
  const groupAssignments: { motionName: string; groupName: string }[] = []
  let unparsedLineCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()

    if (!line.trim()) {
      blankCount++
      continue
    }

    const detected = detectSection(line)
    if (detected !== false) {
      section = detected
      currentParent = null
      parentIndent = -1
      blankCount = 0
      hasChildrenForParent = false
      continue
    }

    if (/^#{1,3}\s+onduler\s+setup/i.test(line)) { blankCount = 0; continue }
    if (/^onduler\s+setup/i.test(line.trim())) { blankCount = 0; continue }
    if (/^```/.test(line.trim())) { blankCount = 0; continue }

    if (!section) {
      unparsedLineCount++
      blankCount = 0
      continue
    }

    const parsed = parseLine(line)
    if (!parsed) {
      unparsedLineCount++
      blankCount = 0
      continue
    }

    let isChild: boolean
    if (hasIndentation) {
      isChild = currentParent !== null && parsed.indent > parentIndent
    } else {
      // No indentation (rendered copy-paste): use blank-line + children-seen heuristic.
      // Parent → blank → children (consecutive) → blank → next parent.
      // If we haven't seen children yet, a blank is just the separator before them.
      // If we have seen children, a blank signals the next parent.
      isChild = currentParent !== null && (!hasChildrenForParent || blankCount === 0)
    }

    if (section === 'swells') {
      if (isChild) {
        const motionName = parsed.text.replace(/\(.*?\)|\[.*?\]/g, '').trim()
        if (motionName) {
          swellAssignments.push({ motionName, swellName: currentParent! })
          if (!motionMap.has(motionName.toLowerCase())) {
            motionMap.set(motionName.toLowerCase(), { points: 1, hours: 1 })
          }
          hasChildrenForParent = true
        }
      } else {
        const { name, target } = extractTarget(parsed.text)
        if (name) {
          swellMap.set(name.toLowerCase(), target)
          currentParent = name
          parentIndent = parsed.indent
          hasChildrenForParent = false
        }
      }
    } else if (section === 'motions') {
      const { name, points, hours } = extractPoints(parsed.text)
      if (name) {
        motionMap.set(name.toLowerCase(), { points, hours })
      }
    } else if (section === 'groups') {
      if (isChild) {
        const motionName = parsed.text.replace(/\(.*?\)|\[.*?\]/g, '').trim()
        if (motionName) {
          groupAssignments.push({ motionName, groupName: currentParent! })
          hasChildrenForParent = true
        }
      } else {
        const name = parsed.text.trim()
        if (name) {
          groupSet.add(name)
          currentParent = name
          parentIndent = parsed.indent
          hasChildrenForParent = false
        }
      }
    }

    blankCount = 0
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
    const parsed = parseLine(line)
    if (!parsed) continue
    const cleaned = parsed.text
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/→.*$/g, '')
      .replace(/[–—-]\s*\d+.*$/g, '')
      .trim()
    if (cleaned.toLowerCase() === lowered) return cleaned
  }
  return lowered.charAt(0).toUpperCase() + lowered.slice(1)
}
