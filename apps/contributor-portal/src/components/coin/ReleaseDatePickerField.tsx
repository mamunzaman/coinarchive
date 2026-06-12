import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { FieldLabelWithHelp } from '../ui/FieldHelpTooltip'

type ReleaseDatePickerFieldProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  required?: boolean
  hint?: string
  error?: string
}

function parseIsoDate(value: string): Date | undefined {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return undefined
  }

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }

  return date
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function buildDatePreservingDay(baseDate: Date, year: number, monthIndex: number): Date {
  const day = Math.min(baseDate.getDate(), getDaysInMonth(year, monthIndex))
  return new Date(year, monthIndex, day)
}

function getScrollableAncestors(element: HTMLElement): HTMLElement[] {
  const ancestors: HTMLElement[] = []
  let parent = element.parentElement

  while (parent) {
    const style = window.getComputedStyle(parent)
    const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY)
    const canScrollX = /(auto|scroll|overlay)/.test(style.overflowX)

    if (
      (canScrollY && parent.scrollHeight > parent.clientHeight) ||
      (canScrollX && parent.scrollWidth > parent.clientWidth)
    ) {
      ancestors.push(parent)
    }

    parent = parent.parentElement
  }

  return ancestors
}

export function ReleaseDatePickerField({
  label,
  name,
  value,
  onChange,
  onBlur,
  disabled = false,
  required = false,
  hint,
  error,
}: ReleaseDatePickerFieldProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => parseIsoDate(value), [value])
  const [month, setMonth] = useState<Date>(selected ?? new Date())
  const rootRef = useRef<HTMLDivElement>(null)
  const fieldId = name
  const errorId = error ? `${fieldId}-error` : undefined
  const hintId = !error && hint ? `${fieldId}-hint` : undefined
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(
    () =>
      Array.from({ length: currentYear + 2 - 1999 + 1 }, (_, index) => currentYear + 2 - index),
    [currentYear],
  )
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2024, index, 1)),
      ),
    [i18n.language],
  )

  useEffect(() => {
    if (selected) {
      setMonth(selected)
    }
  }, [selected])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    function handleScroll() {
      setOpen(false)
    }

    const scrollableAncestors = rootRef.current ? getScrollableAncestors(rootRef.current) : []

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, { passive: true })
    scrollableAncestors.forEach((ancestor) => {
      ancestor.addEventListener('scroll', handleScroll, { passive: true })
    })

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll)
      scrollableAncestors.forEach((ancestor) => {
        ancestor.removeEventListener('scroll', handleScroll)
      })
    }
  }, [open])

  function handleSelect(date: Date | undefined) {
    if (!date) {
      return
    }

    onChange(formatIsoDate(date))
    setOpen(false)
  }

  function handleMonthChange(monthIndex: number) {
    setMonth((current) => buildDatePreservingDay(selected ?? current, current.getFullYear(), monthIndex))
  }

  function handleYearChange(year: number) {
    setMonth((current) => buildDatePreservingDay(selected ?? current, year, current.getMonth()))
  }

  function handleToday() {
    const today = new Date()
    setMonth(today)
    onChange(formatIsoDate(today))
    setOpen(false)
  }

  function handleCurrentYear() {
    setMonth((current) =>
      buildDatePreservingDay(selected ?? current, currentYear, current.getMonth()),
    )
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-2">
      <FieldLabelWithHelp htmlFor={fieldId} label={label} />
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? hintId}
          className={[
            'field-control w-full pr-20',
            error ? 'field-control--error' : '',
          ].join(' ')}
        />
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
            className="absolute right-11 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-navy-muted transition hover:bg-muted hover:text-navy disabled:opacity-50"
            aria-label={t('releaseDate.clear')}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
          aria-label={open ? t('releaseDate.closeCalendar') : t('releaseDate.openCalendar')}
          aria-expanded={open}
          aria-controls={`${fieldId}-calendar`}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="field-message field-message--error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="field-message field-message--hint">
          {hint}
        </p>
      ) : null}

      {open ? (
        <div
          id={`${fieldId}-calendar`}
          role="dialog"
          aria-label={t('releaseDate.choose')}
          className="absolute left-0 top-full z-40 mt-2 max-h-[min(32rem,calc(100vh-8rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border/70 bg-white p-3 shadow-[var(--shadow-card)]"
        >
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
            <select
              value={month.getMonth()}
              onChange={(event) => handleMonthChange(Number(event.target.value))}
              className="field-control min-h-10 rounded-xl px-3 py-2 text-sm"
              aria-label={t('releaseDate.selectMonth')}
            >
              {monthOptions.map((monthName, index) => (
                <option key={monthName} value={index}>
                  {monthName}
                </option>
              ))}
            </select>
            <select
              value={month.getFullYear()}
              onChange={(event) => handleYearChange(Number(event.target.value))}
              className="field-control min-h-10 rounded-xl px-3 py-2 text-sm"
              aria-label={t('releaseDate.selectYear')}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <DayPicker
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            onSelect={handleSelect}
            showOutsideDays
            classNames={{
              root: 'w-full',
              months: 'space-y-4',
              month_caption: 'sr-only',
              caption_label: 'text-sm font-semibold text-navy',
              nav: 'hidden',
              button_previous: 'inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted',
              button_next: 'inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted',
              month_grid: 'w-full border-collapse',
              weekday: 'py-1 text-center text-[11px] font-semibold text-navy-muted',
              day: 'p-0 text-center',
              day_button:
                'h-10 w-10 rounded-lg text-sm text-navy transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/25',
              selected: 'font-semibold',
              today: 'font-semibold text-primary',
              outside: 'text-navy-muted/40',
            }}
            modifiersClassNames={{
              selected: '[&>button]:bg-primary [&>button]:text-white [&>button]:hover:bg-primary',
            }}
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={handleToday}
              className="min-h-9 rounded-lg border border-primary/25 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary/15"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleCurrentYear}
              className="min-h-9 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-navy transition hover:bg-muted"
            >
              Current year
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="min-h-9 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-navy transition hover:bg-muted"
            >
              Clear selected date
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
