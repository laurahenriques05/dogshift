import { Link } from 'react-router-dom'
import { ArrowUpRight, PawPrint } from 'lucide-react'
import type { Dog } from '../../lib/supabase/database.types'

export function HomeDogProfile({ dog }: { dog: Dog }) {
 const birthday = dog.date_of_birth ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${dog.date_of_birth}T00:00:00Z`)) : 'Not added yet'
 return <section className="card home-profile-card" aria-labelledby="home-profile-title"><div className="home-card-heading"><span className="icon-tile"><PawPrint size={20}/></span><div><p className="eyebrow">DOG PROFILE</p><h3 id="home-profile-title">About {dog.name}</h3></div></div><dl className="home-dog-details"><div><dt>Breed</dt><dd>{dog.breed || 'Not added yet'}</dd></div><div><dt>Neutered / spayed</dt><dd>{dog.neutered == null ? 'Not specified' : dog.neutered ? 'Yes' : 'No'}</dd></div><div><dt>Weight</dt><dd>{dog.weight_kg ? `${dog.weight_kg} kg` : 'Not added yet'}</dd></div><div><dt>Birthday</dt><dd>{birthday}</dd></div><div><dt>Sex</dt><dd>{dog.sex === 'unknown' ? 'Not specified' : dog.sex === 'female' ? 'Female' : 'Male'}</dd></div><div><dt>Energy</dt><dd>{dog.activity_level === 'high' ? 'Always on the go' : dog.activity_level === 'low' ? 'Taking it slowly' : 'A little of everything'}</dd></div></dl><Link className="text-link" to="/more/dog">Edit profile<ArrowUpRight size={16}/></Link></section>
}
