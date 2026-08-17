export default function Tabs({ value, onChange, items }) {
  return (
    <div className="tabs">
      {items.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={value === key ? 'active' : ''}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
