import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect,it } from 'vitest'
import { academyCourses } from '../features/academy/catalog'
import { TrainingIllustration } from '../features/academy/TrainingIllustration'
import { GuidedLesson,guideSafety } from '../features/academy/GuidedLesson'
const modules=academyCourses[0].modules
it('provides the three labelled drawings for every challenge, including the advanced paths',()=>{
 expect(modules).toHaveLength(11)
 expect(new Set(modules.map(module=>module.level)).size).toBe(5)
 for(const module of modules){
  const html=renderToStaticMarkup(createElement(TrainingIllustration,{module}))
  for(const step of module.visualSteps)expect(html,module.id).toContain(step.title)
  expect(html.match(/class="academy-drawing-icon /g),module.id).toHaveLength(3)
  expect(html.match(/class="lucide lucide-arrow-right academy-drawing-arrow"/g),module.id).toHaveLength(2)
 }
})
it('uses meaningful challenge-specific drawings instead of repeating audio and food for every trick',()=>{
 const render=(id:string)=>renderToStaticMarkup(createElement(TrainingIllustration,{module:modules.find(module=>module.id===id)!}))
 expect(render('nose-target')).toContain('lucide-hand')
 expect(render('nose-target')).not.toContain('lucide-audio-lines')
 expect(render('give-paw')).toContain('lucide-handshake')
 expect(render('figure-eight')).toContain('lucide-infinity')
 expect(render('tidy-up-toys')).toContain('lucide-package-open')
})
it('keeps full instructions and safety visible without turning reading into a completed practice',()=>{
 const module=modules.find(module=>module.id==='roll-over')!
 const html=renderToStaticMarkup(createElement(GuidedLesson,{module}))
 expect(html).toContain(module.sections[0].text)
 expect(guideSafety(module.sections[0].text)).toContain('Skip it for dogs with pain')
 expect(guideSafety(module.sections[0].text)).toContain('Ask your vet')
 expect(html).toContain('academy-guide-safety')
 expect(html).toContain('Save your practice below to record your progress.')
 expect(html).not.toContain('Complete challenge')
})
