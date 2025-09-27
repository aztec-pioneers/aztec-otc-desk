import swapIcon from '../../assets/icons/swap.svg'

const SwapCircle = ({ className = '', alt = 'Swap tokens' }: { className?: string; alt?: string }) => (
  <span className={`swap-circle ${className}`}>
    <img src={swapIcon} alt={alt} />
  </span>
)

export default SwapCircle
