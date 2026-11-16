import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { academyCourses, academyModules, isModuleUnlocked } from '../features/academy/catalog'

const seededModules = [
  ['marker-and-reward', 'trick-training', 1],
  ['nose-target', 'trick-training', 2],
  ['sit', 'trick-training', 3],
  ['give-paw', 'trick-training', 4],
  ['lie-down', 'trick-training', 5],
  ['spin', 'trick-training', 6],
  ['high-five', 'trick-training', 7],
  ['stay', 'trick-training', 8],
  ['roll-over', 'trick-training', 9],
  ['figure-eight', 'trick-training', 10],
  ['tidy-up-toys', 'trick-training', 11],
] as const

describe('Academy curriculum', () => {
  it('uses unique stable IDs and course positions that match the seed migration', () => {
    expect(academyModules.slice(0, seededModules.length).map(({ id }) => id)).toEqual(seededModules.map(([id]) => id))
    expect(new Set(academyModules.map(({ id }) => id)).size).toBe(academyModules.length)
    expect(academyModules.slice(0, seededModules.length).map(({ id, courseId, position }) => [id, courseId, position])).toEqual(seededModules)
    const migration = readFileSync('supabase/migrations/20261115150000_academy_curriculum.sql', 'utf8')
    const migrationRows = [...migration.matchAll(/\('([^']+)',\s*'([^']+)',\s*(\d+)\)/g)]
      .map(([, id, courseId, position]) => [id, courseId, Number(position)])
    expect(migrationRows).toEqual(seededModules)
  })

  it('provides complete practical lesson content and references', () => {
    for (const module of academyModules) {
      expect(module.sections.length, module.id).toBeGreaterThanOrEqual(3)
      expect(module.visualSteps, module.id).toHaveLength(3)
      expect(module.checklist.length, module.id).toBeGreaterThanOrEqual(3)
      expect(module.question, module.id).not.toBe('')
      expect(module.answer, module.id).not.toBe('')
      expect(module.sources.length, module.id).toBeGreaterThan(0)
    }
    expect(academyCourses.map(({ id, modules }) => [id, modules.length])).toEqual([
      ['trick-training', 11],
    ])
    expect(academyModules.filter(module => module.courseId === 'trick-training').every(module => module.sources.length > 0)).toBe(true)
    const complex = academyCourses[0].modules.filter(module => module.subchallenges?.length)
    expect(complex.map(module => module.id)).toEqual(['stay', 'roll-over', 'figure-eight', 'tidy-up-toys'])
    expect(complex.every(module => module.subchallenges?.length === 3)).toBe(true)
    expect(academyCourses[0].modules.filter(module => !module.subchallenges).map(module => module.id)).toEqual([
      'marker-and-reward', 'nose-target', 'sit', 'give-paw', 'lie-down', 'spin', 'high-five',
    ])
    const migration = readFileSync('supabase/migrations/20261115150000_academy_curriculum.sql', 'utf8')
    for (const module of complex) for (const part of module.subchallenges!) expect(migration).toContain(`'${module.id}','${part.id}'`)
  })

  it('unlocks each course independently and in order', () => {
    const first = academyModules[0]
    const second = academyModules[1]
    const careFirst = academyModules.find(module => module.id === 'daily-care-check-in')!
    expect(isModuleUnlocked(first, new Set())).toBe(true)
    expect(isModuleUnlocked(second, new Set())).toBe(false)
    expect(isModuleUnlocked(second, new Set([first.id]))).toBe(true)
    expect(isModuleUnlocked(careFirst, new Set())).toBe(true)
  })
})
