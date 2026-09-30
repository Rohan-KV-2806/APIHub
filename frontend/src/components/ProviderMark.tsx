import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Provider } from '../lib/types'

// Renders a provider's brand mark inside its colored tile. Falls back to a
// letter tile when the provider has no icon or the image fails to load
// (e.g. the frontend is served without the /brands assets).
export function ProviderMark({
  provider,
  fallback,
  size = 'md',
  style,
}: {
  provider: Provider | undefined
  fallback?: string
  size?: 'md' | 'sm'
  style?: CSSProperties
}) {
  const [broken, setBroken] = useState(false)
  const tile = `provider-tile${size === 'sm' ? ' small' : ''}`

  if (!provider?.icon || broken) {
    return (
      <span className={tile} style={{ backgroundColor: provider?.color, ...style }}>
        {fallback ?? '?'}
      </span>
    )
  }

  return (
    <span className={tile} style={{ backgroundColor: provider?.color, ...style }}>
      <img
        src={provider.icon}
        alt={provider.name}
        onError={() => setBroken(true)}
        draggable={false}
      />
    </span>
  )
}