import { MapPin } from 'lucide-react'
import { recordingStatus, type GpsQuality } from './recordingStatus'
export function WalkRecordingStatus({gps,tracking,paused,quality,accuracy,lastFix,pending,ending,online,saved,now}:{gps:boolean;tracking:boolean;paused:boolean;quality:GpsQuality;accuracy:number|null;lastFix:number|null;pending:number;ending:boolean;online:boolean;saved:boolean;now:number;recovered?:boolean}){
 const status=recordingStatus({gps,tracking,paused,quality,accuracy,lastFix,pending,ending,online,saved,now})
 return <div className="walk-recording-status"><p className="walk-save-caption"><MapPin size={16} aria-hidden="true"/>{status.footer}</p></div>
}
