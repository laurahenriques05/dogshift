import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { PawPrint, Eye, EyeOff } from 'lucide-react'
export function Brand() { return <span className="brand"><span className="brand-mark"><PawPrint size={22}/></span>PawShare<span className="brand-dot">.</span></span> }
export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`button ${className}`} {...props}/> }
export function Field({ label, hint, type, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
 const id = useId(), [visible, setVisible] = useState(false)
 const input = <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props} type={type === 'password' && visible ? 'text' : type}/>
 return <div className="field"><label htmlFor={id}>{label}</label>{type === 'password' ? <div className="password-input-group">{input}<button type="button" className="password-visibility" aria-controls={id} aria-pressed={visible} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} disabled={props.disabled} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={19} aria-hidden="true"/> : <Eye size={19} aria-hidden="true"/>}</button></div> : input}{hint && <small id={`${id}-hint`}>{hint}</small>}</div>
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) { return <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div> }
export function Loading() { return <main className="loading" role="status"><PawPrint className="animate-pulse"/><p>Getting everything ready…</p></main> }
export function LoadingPlaceholder({ label, lines = 2 }: { label: string; lines?: number }) { return <div className="loading-placeholder" role="status"><div aria-hidden="true">{Array.from({ length: lines }, (_, index) => <span className={`loading-placeholder-line line-${index + 1}`} key={index}/>)}</div><span className="loading-placeholder-label">{label}…</span></div> }
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children: ReactNode; action?: ReactNode }) { return <div className="empty-state">{icon && <span className="empty-state-icon" aria-hidden="true">{icon}</span>}<div><h3>{title}</h3><p>{children}</p>{action && <div className="empty-state-action">{action}</div>}</div></div> }
export function PageTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) { return <header className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <p className="muted">{children}</p>}</header> }
const schemaUnavailableMessage = 'This feature’s database functions or tables are not available in the connected Supabase project. Its migration may not be applied yet, or the API schema cache may need refreshing. Check the migration status for the intended project; do not reset or rerun existing migrations.'
export function isSchemaUnavailable(error: unknown) {
 if (typeof error === 'string') return error.toLowerCase().includes('database functions or tables are not available')
 if (!error || typeof error !== 'object') return false
 const code = 'code' in error && typeof error.code === 'string' ? error.code : ''
 const message = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : ''
 return ['PGRST202','PGRST204','PGRST205','42P01','42883'].includes(code) || message.includes('could not find the function') || message.includes('could not find the table') || (message.includes('function') && message.includes('does not exist'))
}
export function errorMessage(error: unknown) {
 if (isSchemaUnavailable(error)) return schemaUnavailableMessage
 if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
 return 'We couldn’t complete that action. Check your connection, then try again.'
}
