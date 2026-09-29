import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-art">
        <Icon size={26} />
      </div>
      <div className="empty-title">{title}</div>
      <p className="empty-desc">{description}</p>
      {action}
    </div>
  )
}
