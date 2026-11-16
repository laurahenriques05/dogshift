import type { MedicationDose } from '../../lib/supabase/database.types'

export function medicationComplete(doses: Pick<MedicationDose, 'status'>[]): boolean {
 return doses.length > 0 && doses.every(dose => dose.status === 'given')
}
