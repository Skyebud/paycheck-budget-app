import Icon from './Icon'

export default function Modal({
  title,
  children,
  onClose,
  wide = false,
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className={`modal ${wide ? 'modal-wide' : ''}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
