import type { PropsWithChildren, ReactNode } from 'react'
import './FeatureCard.css'

type FeatureCardProps = PropsWithChildren<{
  title: string
  caption?: ReactNode
}>

const FeatureCard = ({ title, caption, children }: FeatureCardProps) => {
  return (
    <article className="feature-card">
      <header className="feature-card__header">
        <h2>{title}</h2>
        {caption ? <span className="feature-card__caption">{caption}</span> : null}
      </header>
      <div className="feature-card__body">{children}</div>
    </article>
  )
}

export default FeatureCard
