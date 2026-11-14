import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { MedicationProgress } from '../features/health/MedicationProgress'
import type { MedicationDose } from '../lib/supabase/database.types'

const doses = [
 { id: 'dose-one', scheduled_at: '2026-11-14T09:00Z', status: 'scheduled', recorded_at: null },
 { id: 'dose-two', scheduled_at: '2026-11-15T09:00Z', status: 'given', recorded_at: '2026-11-15T09:00Z' },
] as MedicationDose[]
function render(requestedDoseId?: string) {
 const onTake = vi.fn(async () => {})
 const renderDose = vi.fn((dose: MedicationDose) => createElement('li', { key: dose.id }, `Details for ${dose.id}`))
 const html = renderToStaticMarkup(createElement(MedicationProgress, { doses, name: 'Prescription', zone: 'Europe/Lisbon', busy: false, requestedDoseId, onTake, renderDose }))
 return { html, onTake, renderDose }
}
it.each(['dose-one', 'dose-two'])('opens only the linked dose without recording administration: %s', id => {
 const { html, onTake, renderDose } = render(id)
 expect(html).toContain(`Details for ${id}`)
 expect(renderDose).toHaveBeenCalledTimes(1)
 expect(renderDose).toHaveBeenCalledWith(doses.find(dose => dose.id === id))
 expect(onTake).not.toHaveBeenCalled()
 expect(doses[0].status).toBe('scheduled')
})
it.each([undefined, 'another-family-dose', '<script>'])('does not open an unavailable dose: %s', id => {
 const { html, onTake, renderDose } = render(id)
 expect(html).not.toContain('Details for')
 expect(renderDose).not.toHaveBeenCalled()
 expect(onTake).not.toHaveBeenCalled()
})
