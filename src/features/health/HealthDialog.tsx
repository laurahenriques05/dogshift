import { useEffect, useRef, type ReactNode } from 'react'

export function HealthDialog({ children, titleId, busy, onClose }: { children: ReactNode; titleId: string; busy: boolean; onClose: () => void }) {
 const dialog = useRef<HTMLDialogElement>(null)
 useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal() }, [])
 return <dialog ref={dialog} className="health-folder-dialog" aria-labelledby={titleId} onCancel={event => { if (busy) event.preventDefault(); else onClose() }}>{children}</dialog>
}
