import { useEffect, useRef, useState, type ReactNode } from "react"
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

  // Show on focus only when it came from the keyboard, so clicking a label
  // doesn't leave the bubble up until the next click
  function onFocus(e: React.FocusEvent<HTMLSpanElement>) {
    if (e.target.matches(":focus-visible")) show()
  }

  // While the bubble is open, hide it as soon as the pointer is no longer
  // over the trigger. Mouse-leave alone misses the case where the element
  // under the pointer is removed (picking an address from the list), which
  // left bubbles stuck at a stale position. Any click or scroll hides too.
  useEffect(() => {
    if (!pos) return
    function onMove(e: MouseEvent) {
      const el = ref.current
      if (!el || !el.contains(e.target as Node)) hide()
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("pointerdown", hide, true)
    window.addEventListener("scroll", hide, true)
    window.addEventListener("resize", hide)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("pointerdown", hide, true)
      window.removeEventListener("scroll", hide, true)
      window.removeEventListener("resize", hide)
    }
  }, [pos])

  return (
    <span
      ref={ref}
      className={className}
      style={style}
      tabIndex={focusable && !hoverOnly ? 0 : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={hoverOnly ? undefined : onFocus}
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
