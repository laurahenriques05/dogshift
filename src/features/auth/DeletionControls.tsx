import { Button } from '../../components/ui'

export function DeletionControls() {
 return (
  <section className="card" aria-labelledby="permanent-deletion-title">
   <h2 id="permanent-deletion-title">Permanent deletion</h2>
   <p>Permanent deletion is not available in this version. Your family data stays safe.</p>
   <p>You can leave a family under More → Family. This does not delete shared records.</p>
   <div className="walk-actions">
    <Button type="button" disabled aria-describedby="permanent-deletion-note">Permanently delete family</Button>
    <Button type="button" className="secondary" disabled aria-describedby="permanent-deletion-note">Permanently delete my account</Button>
   </div>
   <p id="permanent-deletion-note">These controls are disabled until the deletion service has been fully tested and approved.</p>
  </section>
 )
}
