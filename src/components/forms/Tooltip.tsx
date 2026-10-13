import { useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

const BUBBLE_HALF = 130 // half the bubble's max width, for clamping to the viewport

interface Props {
  text: string
  children: ReactNode
  // Non-interactive content (a label, a number) gets a tab stop so keyboard
  // users can reach the tooltip; buttons and inputs already have their own
  focusable?: boolean
  // Text fields show the bubble on hover only, so it doesn't sit over the
  // row above while someone types
  hoverOnly?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function Tooltip({
  text,
  children,
  focusable = true,
  hoverOnly = false,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{
    x: number
    y: number
    side: "top" | "bottom"
  } | null>(null)

  function show() {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const side = r.top > 140 ? "top" : "bottom"
    const x = Math.min(
      Math.max(r.left + r.width / 2, BUBBLE_HALF + 8),
      window.innerWidth - BUBBLE_HALF - 8
    )
    setPos({ x, y: side === "top" ? r.top - 8 : r.bottom + 8, side })
  }

  function hide() {
    setPos(null)
  }

  return (
    <span
      ref={ref}
      className={className}
      style={style}
      tabIndex={focusable && !hoverOnly ? 0 : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={hoverOnly ? undefined : show}
      onBlur={hoverOnly ? undefined : hide}
    >
      {children}
      {pos &&
        createPortal(
          <span
            role="tooltip"
            className="tip-bubble"
            data-side={pos.side}
            style={{ left: pos.x, top: pos.y }}
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  )
}
