// ─── Present mode (26 Sep 2026) ─────────────────────────────────────────────
// Adapted from the shared reference implementation (the same behaviour across
// the NEXT.io brochures); this brochure's house tokens are brand-dark,
// brand-yellow, brand-white and brand-gray, so the classes carry over as they
// are.
//
// What it is: a full-screen walk through the rate card, one slide at a time -
// a cover, the proof, every family and every product, the ticket ladder,
// recognition, the plan and how to book. App builds the slides from the page's
// own data (`buildDeck` in App.jsx), so a new product appears in the deck
// automatically and nothing on a slide is a new claim.
//
// Open:   ?present             -> the first slide
//         ?present=<slide id>  -> that slide (a product slide's id is its card
//                                 id, p-<slug>, so card links and slides agree)
// Keys:   → Space PageDown = next · ← PageUp = back · Home End · G = all
//         slides · Esc = close (closes the slide list first when it is open)
// Touch:  swipe left or right; the slide itself scrolls vertically.
//
// Local changes from the reference: `label` names the dialog for assistive
// technology (the visible title sits in an uppercase bar, where the brand must
// never appear, so the brand travels in the logo and in `label`); CopyLinkButton
// takes an optional `text` (so the same quiet button copies a plan link) and a
// replaceable `look`; and the slide scroller clips x (see below).

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, LayoutGrid, Link2, Check } from 'lucide-react'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The URL carries the open slide, so a seller can copy the address bar and
// send the exact slide. replaceState only: opening and moving through the
// deck are not navigations, and Back should not step through slides.
export function readPresentParam() {
  try {
    const p = new URLSearchParams(window.location.search)
    return p.has('present') ? (p.get('present') || '') : null
  } catch { return null }
}
export function writePresentParam(id) {
  try {
    const url = new URL(window.location.href)
    if (id === null) url.searchParams.delete('present')
    else url.searchParams.set('present', id)
    window.history.replaceState(window.history.state, '', url)
  } catch { /* no URL access: the deck still works */ }
}

// App-side state: `present` is null (closed), '' (first slide) or a slide id.
export function usePresent() {
  const [present, setPresent] = useState(readPresentParam)
  const open = useCallback((id = '') => { writePresentParam(id); setPresent(id) }, [])
  const close = useCallback(() => { writePresentParam(null); setPresent(null) }, [])
  return { present, open, close }
}

// ─── Copy link ──────────────────────────────────────────────────────────────
// The link a seller sends: this page, its current screen parameters, and the
// card's anchor. Never the present parameter.
export function linkTo(id) {
  const url = new URL(window.location.href)
  url.searchParams.delete('present')
  url.hash = id
  return url.href
}
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch { /* fall back below */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}
// `text` (a string, or a function called at click time) replaces the card
// link - the plan link uses it. `done` is what the button says once copied.
// `look` replaces the base size and shape (two min-h or rounded classes on one
// element resolve by stylesheet order, not class order, so callers swap the
// base instead of stacking on it); `className` adds colours.
export function CopyLinkButton({ id, text, label = 'Copy link', done = 'Link copied', title = 'Copy a link to this product', disabled = false,
  look = 'inline-flex items-center gap-1.5 min-h-9 rounded-full px-3 text-xs font-bold', className = '' }) {
  const [state, setState] = useState(null) // null | 'ok' | 'fail'
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const onClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const value = typeof text === 'function' ? text() : (text ?? linkTo(id))
    const ok = await copyText(value)
    setState(ok ? 'ok' : 'fail')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState(null), 1800)
  }
  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled}
      className={`${look} transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>
      {state === 'ok' ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden /> : <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden />}
      <span aria-live="polite">{state === 'ok' ? done : state === 'fail' ? 'Copy failed' : label}</span>
    </button>
  )
}

// ─── The deck ───────────────────────────────────────────────────────────────
// slides: [{ id, label, group, ...anything renderSlide needs }]
//   id     unique; product slides use the card id (p-<slug>)
//   label  short title, shown on the Next button and in the slide list
//   group  heading the slide sits under in the slide list ("Start", a family
//          name, "Next steps")
// renderSlide(slide, { go, goId, close, index }) returns the slide body.
export function PresentMode({ slides, startId, onClose, renderSlide, title, label, logo = null }) {
  const [i, setI] = useState(() => {
    const at = slides.findIndex((s) => s.id === startId)
    return at >= 0 ? at : 0
  })
  const [listOpen, setListOpen] = useState(false)
  const [dir, setDir] = useState(0)
  const boxRef = useRef(null)
  const bodyRef = useRef(null)
  const touch = useRef(null)
  const last = slides.length - 1
  const slide = slides[Math.min(i, last)]

  const go = useCallback((n) => {
    setI((cur) => {
      const next = Math.max(0, Math.min(last, typeof n === 'function' ? n(cur) : n))
      setDir(next > cur ? 1 : next < cur ? -1 : 0)
      return next
    })
    setListOpen(false)
  }, [last])
  const goId = useCallback((id) => {
    const at = slides.findIndex((s) => s.id === id)
    if (at >= 0) go(at)
  }, [slides, go])

  // the address bar follows the slide
  const slideId = slide ? slide.id : null
  useEffect(() => { if (slideId !== null) writePresentParam(slideId) }, [slideId])
  // a new slide starts at its top
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0 }, [i])

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target && e.target.tagName) || ''
      const typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)
      if (e.key === 'Escape') { e.preventDefault(); if (listOpen) setListOpen(false); else onClose(); return }
      if (typing) return
      // Space on a focused button presses it; only an unfocused Space turns the page
      const onControl = tag === 'BUTTON' || tag === 'A'
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !onControl)) { e.preventDefault(); go((c) => c + 1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go((c) => c - 1) }
      else if (e.key === 'Home') { e.preventDefault(); go(0) }
      else if (e.key === 'End') { e.preventDefault(); go(last) }
      else if (e.key === 'g' || e.key === 'G') { e.preventDefault(); setListOpen((v) => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, last, listOpen, onClose])

  // Back or Forward to an address without ?present closes the deck
  useEffect(() => {
    const onPop = () => { if (readPresentParam() === null) onClose() }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [onClose])

  // the page behind stays still and out of the tab order; focus returns to
  // whatever opened the deck
  useEffect(() => {
    const root = document.getElementById('root')
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    const opener = document.activeElement
    html.style.overflow = 'hidden'
    if (root) root.setAttribute('inert', '')
    boxRef.current?.focus()
    return () => {
      html.style.overflow = prevOverflow
      if (root) root.removeAttribute('inert')
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY } }
  const onTouchEnd = (e) => {
    const s = touch.current
    touch.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go((c) => c + (dx < 0 ? 1 : -1))
  }

  if (!slide) return null
  const next = slides[i + 1]
  const groups = slides.reduce((acc, s, n) => {
    const g = acc[acc.length - 1]
    if (g && g.group === s.group) g.items.push([s, n])
    else acc.push({ group: s.group, items: [[s, n]] })
    return acc
  }, [])

  return createPortal(
    <div ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${label || title}, presentation`}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-[300] flex flex-col bg-brand-dark text-brand-white font-sans outline-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-brand-yellow/[0.07] blur-3xl" />
      </div>

      {/* top bar: what this is, where you are, the way out */}
      <header className="relative z-10 flex items-center gap-3 border-b border-brand-white/10 px-4 sm:px-8 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {logo}
          <span className="truncate text-xs sm:text-sm font-black uppercase tracking-widest text-brand-white/80">{title}</span>
        </div>
        <button type="button" onClick={() => setListOpen((v) => !v)} aria-expanded={listOpen}
          className="inline-flex items-center gap-2 min-h-10 rounded-full border border-brand-white/15 px-3 sm:px-4 text-xs sm:text-sm font-bold tabular-nums hover:border-brand-yellow/60 hover:text-brand-yellow transition-colors">
          <LayoutGrid className="w-4 h-4" aria-hidden />{i + 1} / {slides.length}
          <span className="sr-only">, show all slides</span>
        </button>
        <button type="button" onClick={onClose} aria-label="Close the presentation"
          className="inline-flex items-center gap-2 min-h-10 min-w-10 justify-center rounded-full px-3 text-sm font-bold text-brand-white/80 hover:bg-brand-white/10 hover:text-brand-white transition-colors">
          <X className="w-5 h-5" aria-hidden /><span className="hidden md:inline text-xs text-brand-gray">Esc</span>
        </button>
      </header>

      {/* the slide (x is clipped: a full-width phone slide starts its slide-in
          24px to the right, which otherwise lets the slide scroll sideways) */}
      <main ref={bodyRef} className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div key={slide.id}
          className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-5 sm:px-10 py-8 sm:py-12"
          style={reducedMotion() ? undefined : { animation: `pm-in-${dir < 0 ? 'back' : 'fwd'} .28s ease-out both` }}>
          {renderSlide(slide, { go, goId, close: onClose, index: i })}
        </div>
      </main>

      {/* bottom bar: back, how far along, next */}
      <footer className="relative z-10 border-t border-brand-white/10">
        <div className="h-0.5 bg-brand-white/10" aria-hidden>
          <div className="h-full bg-brand-yellow transition-[width] duration-300" style={{ width: `${((i + 1) / slides.length) * 100}%` }} />
        </div>
        <div className="flex items-center gap-3 px-4 sm:px-8 py-3">
          <button type="button" onClick={() => go((c) => c - 1)} disabled={i === 0} aria-label="Previous slide"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 rounded-full border border-brand-white/15 px-3 sm:px-4 text-sm font-bold disabled:opacity-30 hover:border-brand-yellow/60 transition-colors">
            <ChevronLeft className="w-5 h-5" aria-hidden /><span className="hidden sm:inline">Back</span>
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-xs sm:text-sm text-brand-gray">{slide.group}</p>
          <button type="button" onClick={() => go((c) => c + 1)} disabled={!next}
            className="inline-flex max-w-[60%] items-center justify-center gap-1.5 min-h-11 rounded-full bg-brand-yellow px-4 sm:px-5 text-sm font-black text-brand-dark disabled:opacity-30 hover:brightness-110 transition">
            <span className="truncate">{next ? <><span className="hidden md:inline font-bold">Next: </span>{next.label}</> : 'End'}</span>
            <ChevronRight className="w-5 h-5 shrink-0" aria-hidden />
          </button>
        </div>
      </footer>

      {/* every slide, grouped: the buyer asks about something, the seller jumps to it */}
      {listOpen && (
        <div className="absolute inset-0 z-20 flex flex-col bg-brand-dark/97 backdrop-blur-md" role="dialog" aria-label="All slides">
          <div className="flex items-center justify-between gap-3 border-b border-brand-white/10 px-4 sm:px-8 py-3">
            <p className="text-sm font-black uppercase tracking-widest">All slides</p>
            <button type="button" onClick={() => setListOpen(false)} aria-label="Close the slide list"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full hover:bg-brand-white/10"><X className="w-5 h-5" aria-hidden /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <div className="mx-auto max-w-6xl sm:columns-2 lg:columns-3 gap-8">
              {groups.map((g, gi) => (
                <div key={`${g.group}-${gi}`} className="mb-6 break-inside-avoid">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand-yellow">{g.group}</p>
                  <ul>
                    {g.items.map(([s, n]) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => go(n)} aria-current={n === i ? 'step' : undefined}
                          className={`flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${n === i ? 'bg-brand-yellow text-brand-dark font-bold' : 'text-brand-white/85 hover:bg-brand-white/[0.06]'}`}>
                          <span className={`w-7 shrink-0 text-right text-xs tabular-nums ${n === i ? 'text-brand-dark/70' : 'text-brand-gray'}`}>{n + 1}</span>
                          <span className="min-w-0">{s.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
