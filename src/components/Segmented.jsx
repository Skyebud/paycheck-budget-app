export default function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          className={value === optionValue ? 'active' : ''}
          onClick={() => onChange(optionValue)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
