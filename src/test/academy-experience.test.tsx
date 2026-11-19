import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { expect,it } from 'vitest'
import { AcademyDashboard } from '../features/academy/AcademyDashboard'
import { GuidedLesson } from '../features/academy/GuidedLesson'
import { trainingJourney } from '../features/academy/journey'
import { academyCourses } from '../features/academy/catalog'
import type { AcademyPractice,AcademySubchallengeProgress } from '../lib/supabase/database.types'
const modules=academyCourses[0].modules
it('recommends the first unachieved trick and resumes its saved part, not an archived care lesson',()=>{
 const completed=new Set(modules.slice(0,7).map(module=>module.id))
 completed.add('daily-care-check-in')
 const parts=[{module_id:'stay',subchallenge_id:'short-stay'}] as AcademySubchallengeProgress[]
 const journey=trainingJourney(completed,[],parts)
 expect(journey.next?.id).toBe('stay')
 expect(journey.currentStage.id).toBe('combinations')
 expect(journey.partsDone).toBe(1)
 expect(journey.nextPart?.id).toBe('one-step-away')
 expect(journey.done).toBe(7)
})
it('shows honest first-use progress and one primary challenge without fake activity',()=>{
 const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(AcademyDashboard,{dogName:'Milo',completedIds:new Set<string>(),records:[],parts:[],available:new Set(modules.map(module=>module.id)),names:new Map(),xp:0,level:1,streak:0,zone:'Europe/Lisbon'})))
 expect(html).toContain('Your family’s saved practice will appear here.')
 expect(html).toContain('Start challenge')
 expect(html).toContain('0/11 challenges achieved')
 expect(html).not.toContain('120 XP')
 expect(html.match(/class="button"/g)).toHaveLength(1)
})
it('renders real contribution attribution and keeps the instruction guide separate from completion',()=>{
 const practice={module_id:'marker-and-reward',user_id:'member',practiced_at:'2026-11-18T10:00Z',deleted_at:null} as AcademyPractice
 const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(AcademyDashboard,{dogName:'Milo',completedIds:new Set(['marker-and-reward']),records:[practice],parts:[],available:new Set(modules.map(module=>module.id)),names:new Map([['member','Maria']]),xp:10,level:1,streak:1,zone:'Europe/Lisbon'})))
 expect(html).toContain('Maria')
 expect(html).toContain('10 XP')
 const guide=renderToStaticMarkup(createElement(GuidedLesson,{module:modules[0]}))
 expect(guide).toContain('Step 1 of 3')
 expect(guide).toContain('Save your practice below to record your progress.')
 expect(guide).toContain('How to do it')
 expect(guide).toContain(modules[0].sections[0].text)
 expect(guide).toContain('Choose a reward your dog enjoys and find a quiet, familiar place.')
 expect(guide).not.toContain('Complete challenge')
})
it('handles an entirely achieved journey without inventing another locked lesson',()=>{
 const journey=trainingJourney(new Set(modules.map(module=>module.id)),[],[])
 expect(journey.next).toBeUndefined()
 expect(journey.done).toBe(11)
 expect(journey.stages.every(stage=>stage.complete)).toBe(true)
})
