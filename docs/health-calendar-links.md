# Health calendar links

- Appointments: `/health/appointments` opens the general Health overview.
- Vaccinations: `/health/vaccinations?record=<vaccinations.id>` opens the matching edit form.
- Medication: `/health/medications?dose=<medication_doses.id>` opens and focuses the matching dose details after the current household’s authorized data loads. This is the dose UUID, not the schedule UUID.

Opening a medication link never logs a dose or changes its status. The existing explicit administration controls and RPC permissions remain authoritative. Unknown, deleted or other-household dose IDs produce the same unavailable message; the route does not query across households or switch families automatically. Details remain available for given/skipped doses and corrections remain limited to the recorder. Changing the query while on the page selects the new dose.

No database migration or notification delivery change is required. Maria can retain her proposed medication destination unchanged.
