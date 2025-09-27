import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import './Button.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    block?: boolean
  }
>

const Button = ({
  variant = 'primary',
  block = false,
  className = '',
  children,
  ...rest
}: ButtonProps) => {
  const classes = ['ui-button', `ui-button--${variant}`]
  if (block) {
    classes.push('ui-button--block')
  }
  if (className) {
    classes.push(className)
  }

  return (
    <button type="button" className={classes.join(' ')} {...rest}>
      <span className="ui-button__label">{children}</span>
    </button>
  )
}

export default Button
