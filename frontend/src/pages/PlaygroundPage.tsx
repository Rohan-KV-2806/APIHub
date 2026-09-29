import { useSearchParams } from 'react-router-dom'
import { Playground } from '../components/Playground'

export function PlaygroundPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const model = searchParams.get('model')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Playground</h1>
          <p className="page-desc">
            Chat with any model from your connected services. Every request is attributed to the
            selected unified key and tracked on the dashboard.
          </p>
        </div>
      </div>
      <Playground
        model={model}
        onModelChange={(m) => setSearchParams(m ? { model: m } : {})}
      />
    </div>
  )
}
