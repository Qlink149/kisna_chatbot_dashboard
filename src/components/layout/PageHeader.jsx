export function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between pb-4 border-b mb-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && (
        <div className="ml-4 shrink-0">{action}</div>
      )}
    </div>
  )
}
