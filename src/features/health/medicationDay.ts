import { localTime } from './time'

export function canGiveDose(scheduledAt:string,zone:string,now=new Date().toISOString()) {
 return localTime(scheduledAt,zone).slice(0,10)===localTime(now,zone).slice(0,10)
}
export const doseDayMessage='A dose can only be marked as given on its scheduled day, in your family’s time zone.'
