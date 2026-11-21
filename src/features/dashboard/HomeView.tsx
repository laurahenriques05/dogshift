import { HomeDogProfile } from './HomeDogProfile'
import { HomeHealthCard } from '../health/HomeHealthCard'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Camera, PawPrint, ShieldCheck } from 'lucide-react'
import { PageTitle } from '../../components/ui'
import { HomeTasksCard } from '../tasks/HomeTasksCard'
import { HomeAcademyCard } from '../academy/HomeAcademyCard'
import { HomeToday } from './HomeToday'
import { HomeCalendarCard } from '../tasks/HomeCalendarCard'
import type { Dog, Household } from '../../lib/supabase/database.types'

export function HomeView({ dog, household, photo, family }: { dog: Dog; household: Household; photo: ReactNode; family: ReactNode }) {
 return <div className="home-page"><PageTitle eyebrow="PAWSHARE" title={`Today with ${dog.name}`}>Care at a glance, shared with your family.</PageTitle>
  <HomeToday household={household} dogName={dog.name}/>
  <HomeCalendarCard householdId={household.id} zone={household.timezone}/>
  <section className="card home-dog-card" aria-labelledby="home-dog-name"><div className="home-portrait-wrap">{photo}<Link className="home-photo-action" to="/more/dog" aria-label={`Add or change ${dog.name}’s photo`} title="Change dog photo"><Camera size={14}/></Link></div><div className="home-dog-copy"><p className="eyebrow">THE HEART OF YOUR FAMILY</p><h2 id="home-dog-name">{dog.name}</h2><p className="home-dog-breed">{dog.breed || 'One of a kind'}</p></div><Link className="home-profile-action" to="/more/dog">View profile<ArrowUpRight size={16}/></Link></section>
  <div className="home-section-heading"><div><p className="eyebrow">CARE AND PLANS</p><h2>Keep the day moving</h2></div><span className="home-private-label"><ShieldCheck size={14}/>Private to your family</span></div>
  <div className="home-care-grid"><HomeTasksCard householdId={household.id} zone={household.timezone}/><HomeHealthCard key={household.id} home={household.id} zone={household.timezone}/><HomeAcademyCard householdId={household.id} zone={household.timezone} dogName={dog.name}/></div>
  <div className="home-section-heading home-manage-heading"><div><p className="eyebrow">YOUR SPACE</p><h2>Family and profile</h2></div></div>
  <div className="home-details-grid">{family}<HomeDogProfile dog={dog}/></div>

  <footer className="home-footer"><PawPrint size={15} aria-hidden="true"/><p>A space for <strong>{household.name}</strong>. Made for the love of your dog.</p></footer>
 </div>
}
