import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
  onCopied?: () => void
}

export function CopyButton({ value, label, className, onCopied }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const el = document.createElement('textarea')
      el.value = value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setCopied(true)
    onCopied?.()
    window.setTimeout(() => setCopied(false), 1400)
  }

  if (label) {
    return (
      <button type="button" className={className ?? 'btn btn-sm'} onClick={copy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : label}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={className ?? 'icon-btn'}
      onClick={copy}
      aria-label="Copy to clipboard"
      title="Copy"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}
