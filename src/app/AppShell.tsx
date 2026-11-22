import { Modal } from '../components/ui/Modal'
import { MoreOptions } from '../features/dashboard/DashboardPage'
import './space-menu.css'
import { Select } from '../components/ui/Select'
import { AppFooter } from '../components/ui/AppFooter'
import { NavLink, Outlet } from 'react-router-dom'
import { Home, Utensils, Footprints, GraduationCap, LogOut, HeartPulse, ListChecks } from 'lucide-react'
import { Brand, Button, Notice } from '../components/ui'
import { db } from '../lib/supabase/client'
import { useHousehold } from '../features/household/HouseholdProvider'
import { useState } from 'react'
export function AppShell() {
 const { household, households, select } = useHousehold(); const [error, setError] = useState(''); const [spaceOpen,setSpaceOpen]=useState(false)
 async function signOut() { const { error } = await db().auth.signOut(); if (error) setError(error.message) }
 return (
  <div className="app-layout">
    <aside className="sidebar">
      <Brand/>
      <p className="nav-label">DAILY CARE</p>
      <nav aria-label="Main navigation">
        <NavLink to="/" end><Home size={20}/>Home</NavLink>
        <NavLink to="/feed"><Utensils size={20}/>Feeding</NavLink>
        <NavLink to="/walks"><Footprints size={20}/>Walks</NavLink>
        <NavLink to="/academy"><GraduationCap size={20}/>Academy</NavLink>
        <NavLink to="/tasks"><ListChecks size={20}/>Tasks</NavLink>
        <NavLink to="/health"><HeartPulse size={20}/>Health</NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="private-note">A little care.<br/><strong>A happier everyday.</strong></div>
        <Button className="secondary" onClick={signOut}><LogOut size={16}/>Sign out</Button>
      </div>
    </aside>
    <div className="app-content">
      <header className="topbar">
        <div className="mobile-brand"><Brand/></div>
        <span className="desktop-label">One dog. One family. All connected.</span>
        <div className="household-label desktop-household-label"><span className="status-dot"/>{households.length > 1 ? <Select aria-label="Active household" value={household?.id} onChange={event => select(event.target.value)}>{households.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</Select> : household?.name}<button type="button" className="avatar space-menu-trigger" aria-label="Open your space" aria-haspopup="dialog" aria-expanded={spaceOpen} onClick={()=>setSpaceOpen(true)}>{household?.name.charAt(0).toUpperCase()}</button></div>
        <button type="button" className="mobile-family-menu" aria-label={`Open family and account for ${household?.name || 'your household'}`} aria-haspopup="dialog" aria-expanded={spaceOpen} onClick={()=>setSpaceOpen(true)}><span className="status-dot" aria-hidden="true"/><span className="mobile-family-name">{household?.name}</span><span className="avatar" aria-hidden="true">{household?.name.charAt(0).toUpperCase()}</span></button>
      </header>
      <main id="main-content" className="main-content">{error && <Notice error>{error}</Notice>}<Outlet/></main>
      <AppFooter/>
    </div>
    {spaceOpen&&<Modal title="Your space" onClose={()=>setSpaceOpen(false)}><div className="space-menu">{households.length>1&&<label className="field mobile-space-household-switch">Active household<Select value={household?.id} onChange={event=>select(event.target.value)}>{households.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</Select></label>}<MoreOptions showCareLinks={false} onNavigate={()=>setSpaceOpen(false)}/></div></Modal>}
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <NavLink to="/" end><Home/><span>Home</span></NavLink>
      <NavLink to="/feed"><Utensils/><span>Feed</span></NavLink>
      <NavLink to="/walks"><Footprints/><span>Walks</span></NavLink>
      <NavLink to="/academy"><GraduationCap/><span>Academy</span></NavLink>
      <NavLink to="/tasks"><ListChecks/><span>Tasks</span></NavLink>
      <NavLink to="/health"><HeartPulse/><span>Health</span></NavLink>
    </nav>
  </div>
)
}
