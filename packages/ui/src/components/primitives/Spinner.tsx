import './Spinner.css'

type SpinnerProps = {
  size?: 'sm' | 'md'
  label?: string
}

const Spinner = ({ size = 'md', label }: SpinnerProps) => {
  const className = `ui-spinner ui-spinner--${size}`
  return (
    <span className={className} role="status" aria-live="polite" aria-label={label ?? 'Loading'}>
      <span className="ui-spinner__circle" />
    </span>
  )
}

export default Spinner
