import { useState } from 'react'
import { ArrowLeft,ArrowRight,Check } from 'lucide-react'
import type { AcademyModule } from './catalog'
import { TrainingIllustration } from './TrainingIllustration'

const shortInstructions:Record<string,string>={
 'Choose a reward':'Choose a reward your dog enjoys and find a quiet, familiar place.',
 'Pair the word and reward':'Say “yes”, then immediately give the reward. Repeat with a short pause.',
 'Mark a simple choice':'When your dog looks towards you or moves naturally, say “yes” and reward.',
}
export function guideSafety(text:string){
 return text.match(/[^.!?]*(?:never|avoid|stop|do not|skip|pain|mobility|vet|stiff|uncomfortable)[^.!?]*[.!?]?/gi)?.join(' ').trim()||''
}
export function GuidedLesson({module,onPractice}:{module:AcademyModule;onPractice?:()=>void}){
 const [step,setStep]=useState(0)
 const section=module.sections[step]
 const instruction=shortInstructions[section.heading]||section.text.match(/^[^.!?]+[.!?]?/)?.[0]||section.text
 const safety=guideSafety(section.text)
 return <section className="academy-guided-lesson" aria-label="Step-by-step teaching guide">
  <div className="academy-guide-top"><span>TEACHING GUIDE</span><span>Step {step+1} of {module.sections.length}</span></div>
  <div className="academy-guide-dots" aria-label="Teaching steps">{module.sections.map((item,index)=><button type="button" key={item.heading} aria-label={`Read step ${index+1}: ${item.heading}`} aria-current={step===index?'step':undefined} className={index===step?'is-current':index<step?'is-read':''} onClick={()=>setStep(index)}>{index<step?<Check size={14}/>:index+1}</button>)}</div>
  <TrainingIllustration module={module}/>
  <div className="academy-guide-content" aria-live="polite"><h2>{section.heading}</h2><p className="academy-guide-main-instruction">{instruction}</p>
   {instruction!==section.text&&<details key={step} className="academy-full-instructions"><summary>How to do it</summary><p>{section.text}</p></details>}
   {instruction!==section.text&&safety&&<p className="academy-guide-safety">{safety}</p>}
  </div>
  <div className="academy-guide-actions"><button type="button" disabled={step===0} onClick={()=>setStep(value=>value-1)}><ArrowLeft size={16}/>Back</button>{step<module.sections.length-1?<button type="button" className="button" onClick={()=>setStep(value=>value+1)}>Next step<ArrowRight size={16}/></button>:onPractice?<button type="button" className="button" onClick={onPractice}>Try it with your dog<ArrowRight size={16}/></button>:<a className="button" href="#academy-practice">Try it with your dog<ArrowRight size={16}/></a>}</div>
  <p className="academy-guide-note">Save your practice below to record your progress.</p>
 </section>
}
