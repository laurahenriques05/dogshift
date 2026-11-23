import { createContext, useContext } from 'react'
import type { Walk } from '../../lib/supabase/database.types'
import type { Point } from './gps'
import type { GpsQuality } from './recordingStatus'
import type { WasteMode } from './waste'
import type { NoteDraft } from './noteDraft'
export type WalkContextValue = {
 walks: Walk[]; ready: boolean; loading: boolean; error: string; busy: boolean; tracking: boolean; gpsEnabled: boolean; points: Point[]; pending: number; ending: boolean; now: number; warning: number | null; autoEnd: boolean; gpsMessage: string; paused:boolean; quality:GpsQuality; accuracy:number|null; saved:boolean; recovered:boolean; connectionFailed:boolean; elapsedSeconds:number;
 pause:()=>Promise<void>; reload: () => Promise<void>; start: (mode?: WasteMode, trackGps?: boolean, taskOccurrence?:string) => Promise<void>; resume: () => Promise<void>; finish: (note?:NoteDraft) => Promise<void>; sync: () => Promise<void>; reconnect:()=>Promise<boolean>; keepWalking: () => void; setAutoEnd: (value:boolean)=>void;
}
export const WalkContext=createContext<WalkContextValue>(null!)
export const useWalks=()=>useContext(WalkContext)
