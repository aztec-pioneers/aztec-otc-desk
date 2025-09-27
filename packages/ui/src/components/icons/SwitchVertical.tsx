const SwitchVertical = ({ className = '', ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M8 16l-4-4 4-4" />
    <path d="M4 12h9" />
    <path d="M16 8l4 4-4 4" />
    <path d="M11 12h9" />
  </svg>
)

export default SwitchVertical
