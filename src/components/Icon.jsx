export default function Icon({ name }) {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    income: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </>
    ),
    expenses: (
      <>
        <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    goals: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l-2.78 2.78A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1.4 1.51V21h-3.2v-.09A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1.98.36l-2.78-2.78A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.51-1.4H3v-3.2h.09A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.98l2.78-2.78A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1.4-1.51V3h3.2v.09A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1.98-.36l2.78 2.78A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 1.51 1.4H21v3.2h-.09A1.8 1.8 0 0 0 19.4 15Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
  }

  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
