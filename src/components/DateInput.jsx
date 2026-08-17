import { useRef } from 'react'
import Icon from './Icon'

export default function DateInput({
  value,
  onChange,
  onClick,
  className = '',
  ...props
}) {
  const inputRef = useRef(null)

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
      } else {
        input.focus()
      }
    } catch {
      input.focus()
    }
  }

  return (
    <div className={`date-input-shell ${className}`.trim()}>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        onClick={(event) => {
          onClick?.(event)
          openPicker()
        }}
        {...props}
      />

      <button
        type="button"
        className="date-picker-button"
        aria-label="Open calendar"
        onClick={openPicker}
      >
        <Icon name="calendar" />
      </button>
    </div>
  )
}
