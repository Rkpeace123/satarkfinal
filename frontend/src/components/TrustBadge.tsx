import clsx from 'clsx'

interface TrustBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function TrustBadge({ score, showLabel = false, size = 'md' }: TrustBadgeProps) {
  const isGreen = score >= 80
  const isAmber = score >= 60 && score < 80
  const isRed = score < 60

  const sizeConfig = {
    sm: { outer: 'w-8 h-8', text: 'text-xs', label: 'text-xs' },
    md: { outer: 'w-10 h-10', text: 'text-sm', label: 'text-xs' },
    lg: { outer: 'w-14 h-14', text: 'text-base', label: 'text-sm' }
  }

  const cfg = sizeConfig[size]

  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          cfg.outer,
          'rounded-full flex items-center justify-center font-bold ring-2 flex-shrink-0',
          isGreen && 'ring-green-500 bg-green-500/10 text-green-400',
          isAmber && 'ring-amber-500 bg-amber-500/10 text-amber-400',
          isRed && 'ring-red-500 bg-red-500/10 text-red-400 pulse-danger'
        )}
      >
        <span className={cfg.text}>{score}</span>
      </div>
      {showLabel && (
        <div>
          <div
            className={clsx(
              cfg.label,
              'font-semibold',
              isGreen && 'text-green-400',
              isAmber && 'text-amber-400',
              isRed && 'text-red-400'
            )}
          >
            {isGreen ? 'Good Standing' : isAmber ? 'Watch' : 'At Risk'}
          </div>
          <div className="text-slate-500 text-xs">Trust Score</div>
        </div>
      )}
    </div>
  )
}
