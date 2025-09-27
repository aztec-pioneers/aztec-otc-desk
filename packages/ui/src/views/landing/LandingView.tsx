import FeatureCard from '../../components/cards/FeatureCard'
import useIsMobile from '../../hooks/useIsMobile'
import './LandingView.css'

const LandingView = () => {
  const isMobile = useIsMobile()

  return (
    <section className="landing">
      {isMobile ? (
        <div className="landing__mobile-banner" role="status" aria-live="polite">
          <strong>This experience is desktop-only.</strong>
          <span>Please switch to a desktop browser to access the Aztec OTC Desk.</span>
        </div>
      ) : null}

      <div className="landing__hero">
        <p className="landing__eyebrow">Private OTC trading for Aztec</p>
        <h1>Aztec OTC Desk</h1>
        <p className="landing__lead">
          Execute private OTC trades with end-to-end confidentiality, from discovery to finality.
        </p>
      </div>

      <div className="landing__features">
        <FeatureCard title="Private matching">
          Discover counterparties without broadcasting intent to the public mempool.
        </FeatureCard>
        <FeatureCard title="Private execution">
          Execute trades with shielded settlement flows and audit-ready proofs.
        </FeatureCard>
        <FeatureCard title="Private counterparties">
          Verify counterparties using anonymous credentials and selective disclosures.
        </FeatureCard>
        <FeatureCard title="Instant finality">
          Confirm trades within seconds with Aztec rollup speed and deterministic settlement.
        </FeatureCard>
      </div>

      <section className="landing__how-to">
        <h2>How to use</h2>
        <p>
          This section will outline onboarding steps once product copy and flows are finalized. For
          now, placeholders ensure layout validation across the MVP screens.
        </p>
      </section>
    </section>
  )
}

export default LandingView
