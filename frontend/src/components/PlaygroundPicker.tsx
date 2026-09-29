import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Service } from '../lib/types'

export function PlaygroundPicker({
  services,
  style,
}: {
  services: Service[]
  style?: CSSProperties
}) {
  const navigate = useNavigate()

  return (
    <select
      className="select"
      value=""
      onChange={(e) => {
        const value = e.target.value
        if (value) navigate(`/playground?model=${encodeURIComponent(value)}`)
      }}
      style={style}
      aria-label="Open a model in the Playground"
    >
      <option value="">Open a model in the Playground…</option>
      {services.map((s) => (
        <optgroup key={s.id} label={s.name}>
          {s.models.map((m) => (
            <option key={m.id} value={`${s.type}/${m.id}`}>
              {m.id}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
