import { Button } from '../../components/ui'

export function DeletionControls() {
  return (
    <section className="card" aria-labelledby="permanent-deletion-title">
      <h2 id="permanent-deletion-title">Permanent deletion</h2>
      <p lang="pt">A eliminação permanente ainda não está disponível nesta versão.</p>
      <p>You can leave a family under More → Family.</p>
      <div className="walk-actions">
        <Button type="button" disabled>Permanently delete family</Button>
        <Button type="button" disabled>Permanently delete my account</Button>
      </div>
    </section>
  )
}
