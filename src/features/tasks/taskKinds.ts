// Creation choices: only feeding/walking use verified activity completion.
// Health and other responsibilities reuse the existing general-task workflow.
export const taskKinds=[
 {value:'feeding',label:'Feeding'},
 {value:'walk',label:'Walk'},
 {value:'health',label:'Health'},
 {value:'other',label:'Other'},
] as const
export type TaskKind=(typeof taskKinds)[number]['value']
export function isCareTaskKind(kind:TaskKind):kind is 'feeding'|'walk'{return kind==='feeding'||kind==='walk'}
