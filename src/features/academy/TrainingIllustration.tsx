import { Fragment } from 'react'
import { ArrowRight,AudioLines,Bone,Dog,Hand,MessageCircle,MoveUp,CircleCheck,PawPrint,Handshake,ArrowDownToLine,RotateCw,Circle,Timer,Play,Heart,CircleStop,RotateCcw,Infinity as InfinityIcon,Puzzle,Footprints,PackageOpen,type LucideIcon } from 'lucide-react'
import type { AcademyModule } from './catalog'

// The diagram explains this challenge, rather than repeating the same three
// pictures for every trick. Its conceptual stages are separate from read steps.
const challengeIcons:Record<string,readonly [LucideIcon,LucideIcon,LucideIcon]>={
 'marker-and-reward':[AudioLines,Bone,Dog],
 'nose-target':[Hand,MessageCircle,Bone],
 sit:[MoveUp,CircleCheck,MessageCircle],
 'give-paw':[Hand,PawPrint,Handshake],
 'lie-down':[Dog,ArrowDownToLine,Bone],
 spin:[RotateCw,Circle,AudioLines],
 'high-five':[Hand,MoveUp,MessageCircle],
 stay:[Dog,Timer,Play],
 'roll-over':[Heart,RotateCw,CircleStop],
 'figure-eight':[RotateCcw,RotateCw,InfinityIcon],
 'tidy-up-toys':[Puzzle,Footprints,PackageOpen],
}
const fallbackIcons= [AudioLines,Bone,Dog] as const
export function TrainingIllustration({module}:{module:AcademyModule}){
 const icons=challengeIcons[module.id]||fallbackIcons
 return <div className="academy-training-drawing" data-challenge={module.id} role="group" aria-label={`Training together: ${module.title}`}>
  {module.visualSteps.map((item,index)=>{const Icon=icons[index]||Dog;return <Fragment key={`${index}-${item.title}`}>
   {index>0&&<ArrowRight className="academy-drawing-arrow" aria-hidden="true"/>}
   <div><span className={`academy-drawing-icon academy-drawing-stage-${index}`}><Icon size={52} strokeWidth={1.5} aria-hidden="true"/></span><small>{item.title}</small></div>
  </Fragment>})}
 </div>
}
