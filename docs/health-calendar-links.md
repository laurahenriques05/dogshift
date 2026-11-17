# Health calendar links

- Appointments: `/health/appointments` opens the general Health overview.
- Vaccinations: `/health/vaccinations?record=<vaccinations.id>` opens the matching edit form.
- Medication: `/health/medications?dose=<medication_doses.id>` opens and focuses the matching dose details after the current household’s authorized data loads. This is the dose UUID, not the schedule UUID.

Opening a medication link never logs a dose or changes its status. The existing explicit administration controls and RPC permissions remain authoritative. Unknown, deleted or other-household dose IDs produce the same unavailable message; the route does not query across households or switch families automatically. Details remain available for given/skipped doses and corrections remain limited to the recorder. Changing the query while on the page selects the new dose.

No database migration or notification delivery change is required. Maria can retain her proposed medication destination unchanged.

The Health hub includes a Past appointments shortcut to the separate `/health/past-appointments` page. The history is not displayed on the main Health page. It lists appointments whose scheduled time has passed, newest first, with their existing edit/delete controls and an Add appointment record action. It does not imply attendance was confirmed. Future appointments remain in Upcoming events; no schema change is required.

Medication schedules with at least one dose and every dose marked given appear in Past Medication at the bottom of the medication page. Other schedules appear above the new-schedule form. This is a display grouping, not a clinical assessment or database archive: corrections and added doses automatically update the grouping, and dose links remain available in both groups. Skipped doses do not count as given.

The medication form is hidden until Add medication or Edit is selected and closes after a successful save or cancellation. Past Medication is collapsed by default; links targeting a completed dose expand its history automatically.

Health record pages use compact top actions to reveal their add forms (vaccinations, treatments, weight, documents, medication and past appointments). Forms close on successful save/upload or cancellation. Vet contacts retains its directory toolbar and add/edit form workflow.

Weight measurements appear in a single vertical list ordered by measured time, newest first. Hide records / Show records collapses only the list; the weight chart remains available.

Undo dose is available in dose details only for the current recorder, with explicit confirmation. The user applied `20261117131000_undo_medication_dose.sql` through the shared project SQL Editor on 2026-11-17 and supplied a successful result plus a non-null to_regprocedure check. End-to-end undo in the shared app remains to be confirmed; do not reapply this migration. The RPC locks the dose, requires current membership and null-safe recorder ownership, and checks the expected updated_at to reject stale actions. It resets the existing dose to scheduled without changing scheduled_at, clearing administration/recorder/notes. Overdue is derived from scheduled time. Restoring an archived schedule to the current list follows the existing 100%-given display rule. Coordinate notification rescheduling with Maria; this change does not enqueue extra reminders.
