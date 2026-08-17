export default function EmptyState({ title, action, onAction }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {action && (
        <button type="button" className="text-button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}
