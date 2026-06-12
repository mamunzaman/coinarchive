import { Button } from '../ui/Button'
import { FieldLabelWithHelp } from '../ui/FieldHelpTooltip'
import { ChevronDown, ChevronUp, GripVertical, Trash2, X } from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from '../ui/SelectField'
import { TextAreaField } from '../ui/TextAreaField'
import { TextField } from '../ui/TextField'
import {
  normalizeIntegerInput,
  normalizeMintMarksAvailableInput,
} from '../../lib/coinFormNormalize'
import { useCoinFormFieldNormalize } from '../../hooks/useCoinFormFieldNormalize'
import { FIELD_HELP } from '../../lib/fieldHelpContent'
import {
  createEmptyMintVariantRow,
  ensureMintVariantClientIds,
  getMintMarkLabel,
  isKnownMintMarkCode,
  MINT_MARK_CODE_OPTIONS,
  normalizeMintMarkCode,
  type CoinFormValues,
  type MintVariantRow,
} from '../../types/coinForm'

type MintInformationFieldsProps = {
  values: Pick<
    CoinFormValues,
    'hasMintVariants' | 'singleMintMark' | 'mintMarksAvailable' | 'mintVariants'
  >
  onFieldChange: <K extends keyof CoinFormValues>(field: K, value: CoinFormValues[K]) => void
  onMintVariantsChange: (variants: MintVariantRow[]) => void
  onHasMintVariantsChange: (hasMintVariants: boolean) => void
  disabled?: boolean
  hideHeading?: boolean
  sectionAttentionMessages?: string[]
  mintMarksAvailableError?: string
}

const MAX_MINT_VARIANTS = 5
const ADD_ROW_BUTTON_CLASS =
  'w-full !min-h-9 !px-3.5 !py-2 text-xs sm:ml-auto sm:w-auto sm:shrink-0'

function getMintMarkCodeSelectOptions(
  currentValue: string,
  selectLabel: string,
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [
    { value: '', label: selectLabel },
    ...MINT_MARK_CODE_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ]

  const trimmed = currentValue.trim()
  const normalized = normalizeMintMarkCode(trimmed)

  if (trimmed && !isKnownMintMarkCode(normalized) && normalized === trimmed) {
    options.push({ value: trimmed, label: trimmed })
  }

  return options
}

function formatMintageDisplay(value: string): string {
  const normalized = normalizeIntegerInput(value)
  if (!normalized) {
    return ''
  }

  const parsed = Number.parseInt(normalized, 10)
  if (Number.isNaN(parsed)) {
    return normalized
  }

  return parsed.toLocaleString()
}

function buildVariantRowContent(
  row: MintVariantRow,
  labels: {
    variant: string
    noMark: string
    notes: string
    empty: string
  },
): { title: string; subtitle: string } {
  const markCode = normalizeMintMarkCode(row.mintMarkCode)
  const markLabel = getMintMarkLabel(markCode) || markCode.trim()
  const mintage = formatMintageDisplay(row.mintMintage)
  const hasNotes = Boolean(row.mintNotes.trim())

  if (!markLabel && !mintage && !hasNotes) {
    return { title: labels.variant, subtitle: labels.empty }
  }

  const subtitleParts: string[] = []
  if (markLabel) {
    subtitleParts.push(markLabel)
  } else if (!mintage && !hasNotes) {
    subtitleParts.push(labels.noMark)
  }

  if (mintage) {
    subtitleParts.push(mintage)
  }

  if (hasNotes) {
    subtitleParts.push(labels.notes)
  }

  return {
    title: labels.variant,
    subtitle: subtitleParts.join(' · '),
  }
}

function getRowClientId(row: MintVariantRow, index: number): string {
  return row.clientId ?? `mint-row-${index}`
}

function reorderRows(rows: MintVariantRow[], fromIndex: number, toIndex: number): MintVariantRow[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return rows
  }

  const next = [...rows]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return ensureMintVariantClientIds(next)
}

function computeReorderTarget(fromIndex: number, insertIndex: number): number {
  if (insertIndex > fromIndex) {
    return insertIndex - 1
  }

  return insertIndex
}

function MintVariantDropIndicator({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className={[
        'overflow-hidden px-2 transition-all duration-200 ease-out',
        visible ? 'max-h-3 py-1 opacity-100' : 'max-h-0 py-0 opacity-0',
      ].join(' ')}
    >
      <div className="h-0.5 rounded-full bg-primary/75 shadow-[0_0_0_3px_rgba(20,184,166,0.12)]" />
    </div>
  )
}

export function MintInformationFields({
  values,
  onFieldChange,
  onMintVariantsChange,
  onHasMintVariantsChange,
  disabled = false,
  hideHeading = false,
  sectionAttentionMessages = [],
  mintMarksAvailableError,
}: MintInformationFieldsProps) {
  const { t } = useTranslation()
  const mintMarksFieldId = useId()
  const mintMarksHelpId = useId()
  const hasSectionAttention = sectionAttentionMessages.length > 0
  const { changeField, blurField, formatHint } = useCoinFormFieldNormalize({ onFieldChange })
  const [openVariantClientId, setOpenVariantClientId] = useState<string | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const listRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{ sourceIndex: number | null; insertIndex: number | null }>({
    sourceIndex: null,
    insertIndex: null,
  })

  const variantCount = values.mintVariants.length
  const atMaxVariants = variantCount >= MAX_MINT_VARIANTS
  const showVariantRows = variantCount > 0

  useEffect(() => {
    if (!values.hasMintVariants) {
      return
    }

    if (
      openVariantClientId &&
      !values.mintVariants.some((row, index) => getRowClientId(row, index) === openVariantClientId)
    ) {
      setOpenVariantClientId(null)
    }
  }, [openVariantClientId, values.hasMintVariants, values.mintVariants])

  function resolveDropInsertIndex(clientY: number): number {
    for (let index = 0; index < values.mintVariants.length; index += 1) {
      const rowId = getRowClientId(values.mintVariants[index], index)
      const element = rowRefs.current.get(rowId)
      if (!element) {
        continue
      }

      const rect = element.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) {
        return index
      }
    }

    return values.mintVariants.length
  }

  function clearDragState() {
    setActiveDragId(null)
    setDropInsertIndex(null)
  }

  useEffect(() => {
    if (activeDragId === null) {
      return
    }

    function handlePointerMove(event: PointerEvent) {
      const insertIndex = resolveDropInsertIndex(event.clientY)
      dragStateRef.current.insertIndex = insertIndex
      setDropInsertIndex(insertIndex)
    }

    function handlePointerUp() {
      const { sourceIndex, insertIndex } = dragStateRef.current

      if (sourceIndex !== null && insertIndex !== null) {
        const targetIndex = computeReorderTarget(sourceIndex, insertIndex)
        if (targetIndex !== sourceIndex) {
          onMintVariantsChange(reorderRows(values.mintVariants, sourceIndex, targetIndex))
        }
      }

      dragStateRef.current = { sourceIndex: null, insertIndex: null }
      clearDragState()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [activeDragId, onMintVariantsChange, values.mintVariants])

  function isNotesExpanded(row: MintVariantRow, index: number): boolean {
    const rowId = getRowClientId(row, index)
    return expandedNotes[rowId] ?? Boolean(row.mintNotes.trim())
  }

  function toggleNotes(row: MintVariantRow, index: number) {
    const rowId = getRowClientId(row, index)
    setExpandedNotes((current) => ({
      ...current,
      [rowId]: !isNotesExpanded(row, index),
    }))
  }

  function updateVariantRow(index: number, field: keyof MintVariantRow, value: string) {
    onMintVariantsChange(
      values.mintVariants.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    )
  }

  function changeMintMarkCode(index: number, value: string) {
    updateVariantRow(index, 'mintMarkCode', normalizeMintMarkCode(value))
  }

  function blurVariantField(index: number, field: keyof MintVariantRow, value: string) {
    const normalized =
      field === 'mintMintage'
        ? normalizeIntegerInput(value)
        : value.trim().replace(/\s+/g, ' ')

    if (normalized !== value) {
      updateVariantRow(index, field, normalized)
    }
  }

  function addVariantRow() {
    if (atMaxVariants) {
      return
    }

    const addedRow = createEmptyMintVariantRow()
    onMintVariantsChange([addedRow, ...values.mintVariants])
    setOpenVariantClientId(addedRow.clientId ?? null)
  }

  function removeVariantRow(index: number) {
    const rowId = getRowClientId(values.mintVariants[index], index)
    const next = values.mintVariants.filter((_, rowIndex) => rowIndex !== index)
    onMintVariantsChange(next)

    if (openVariantClientId === rowId) {
      setOpenVariantClientId(null)
    }

    setExpandedNotes((current) => {
      const rebuilt = { ...current }
      delete rebuilt[rowId]
      return rebuilt
    })
  }

  function moveVariantRow(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= variantCount || fromIndex === toIndex) {
      return
    }

    onMintVariantsChange(reorderRows(values.mintVariants, fromIndex, toIndex))
  }

  function startPointerDrag(
    index: number,
    rowId: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    if (disabled) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = { sourceIndex: index, insertIndex: index }
    setActiveDragId(rowId)
    setDropInsertIndex(index)
  }

  function toggleVariantAccordion(row: MintVariantRow, index: number) {
    const rowId = getRowClientId(row, index)
    setOpenVariantClientId((current) => (current === rowId ? null : rowId))
  }

  const addMintRowButton = (
    <Button
      type="button"
      variant="primary"
      disabled={disabled || atMaxVariants}
      onClick={addVariantRow}
      className={ADD_ROW_BUTTON_CLASS}
      title={atMaxVariants ? t('mint.maxVariantsReached') : undefined}
      aria-label={t('mint.addMintRowAria')}
      aria-disabled={disabled || atMaxVariants}
    >
      {t('mint.addMintRow')}
    </Button>
  )

  return (
    <section
      className={[
        'flex flex-col gap-3',
        hasSectionAttention ? 'rounded-xl border border-amber-200/80 bg-amber-50/30 p-3' : '',
      ].join(' ')}
    >
      {!hideHeading ? (
        <div className="border-b border-border/60 pb-3">
          <h2 className="font-serif text-lg font-semibold text-navy">{t('mint.title')}</h2>
          <p className="mt-0.5 text-sm text-navy-muted">{t('mint.description')}</p>
        </div>
      ) : null}

      {hasSectionAttention ? (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2">
          <p className="text-[11px] font-semibold text-amber-900">{t('form.needsAttention')}</p>
          {sectionAttentionMessages.map((message) => (
            <p key={message} className="mt-0.5 text-[11px] leading-snug text-amber-800">
              {message}
            </p>
          ))}
        </div>
      ) : null}

      <label className="flex min-h-10 items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2">
        <input
          type="checkbox"
          name="has_mint_variants"
          checked={values.hasMintVariants}
          onChange={(event) => onHasMintVariantsChange(event.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
        />
        <span className="text-sm font-medium text-navy">{t('mint.hasVariants')}</span>
      </label>

      {!values.hasMintVariants ? (
        <TextField
          label={t('mint.singleMintMark')}
          name="single_mint_mark"
          placeholder={t('mint.singleMintMarkPlaceholder')}
          value={values.singleMintMark}
          onChange={(event) => changeField('singleMintMark', event.target.value)}
          onBlur={() => blurField('singleMintMark', values.singleMintMark)}
          autoFormatHint={formatHint('singleMintMark')}
          disabled={disabled}
          helpTooltip={FIELD_HELP.mintMark}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <FieldLabelWithHelp
              htmlFor={mintMarksFieldId}
              label={t('mint.marksAvailable')}
            />
            <p id={mintMarksHelpId} className="text-xs leading-snug text-navy-muted">
              {t('mint.marksAvailableHelp')}
            </p>
            <input
              id={mintMarksFieldId}
              name="mint_marks_available"
              type="text"
              placeholder={t('mint.marksAvailablePlaceholder')}
              value={values.mintMarksAvailable}
              onChange={(event) =>
                changeField(
                  'mintMarksAvailable',
                  normalizeMintMarksAvailableInput(event.target.value),
                )
              }
              onBlur={() => blurField('mintMarksAvailable', values.mintMarksAvailable)}
              disabled={disabled}
              aria-describedby={mintMarksHelpId}
              aria-invalid={mintMarksAvailableError ? true : undefined}
              className={[
                'field-control mt-0.5',
                mintMarksAvailableError ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : '',
              ].join(' ')}
            />
            {mintMarksAvailableError ? (
              <p className="text-[11px] leading-snug text-red-600">{mintMarksAvailableError}</p>
            ) : null}
            {formatHint('mintMarksAvailable') ? (
              <p className="text-[11px] leading-snug text-navy-muted/80">
                {formatHint('mintMarksAvailable')}
              </p>
            ) : null}
          </div>

          {!showVariantRows ? (
            <div className="rounded-lg border border-border/35 bg-gradient-to-b from-white to-muted/20 px-3.5 py-3 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:text-left">
              <p className="text-sm font-medium text-navy">{t('mint.emptyVariants')}</p>
              <p className="mt-1 text-xs leading-snug text-navy-muted">
                {t('mint.emptyVariantsHint')}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {showVariantRows ? (
              <p className="text-sm text-navy-muted">
                {t('mint.variantsAdded', { count: variantCount })}
              </p>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}
            {addMintRowButton}
          </div>

          {atMaxVariants ? (
            <p className="text-[11px] text-navy-muted">{t('mint.maxVariantsReached')}</p>
          ) : null}

          {showVariantRows ? (
            <div ref={listRef} className="flex flex-col gap-1.5">
              <p className="mb-0.5 text-sm font-medium text-navy">{t('mint.variants')}</p>

              {values.mintVariants.map((row, index) => {
                const rowId = getRowClientId(row, index)
                const isOpen = openVariantClientId === rowId
                const notesExpanded = isNotesExpanded(row, index)
                const rowContent = buildVariantRowContent(row, {
                  variant: t('mint.variant', { number: index + 1 }),
                  noMark: t('mint.summaryNoMark'),
                  notes: t('mint.summaryNotes'),
                  empty: t('mint.summaryEmpty'),
                })
                const panelId = `mint-variant-panel-${rowId}`
                const headerId = `mint-variant-header-${rowId}`
                const isDragging = activeDragId === rowId
                const showDropBefore = activeDragId !== null && dropInsertIndex === index

                return (
                  <Fragment key={rowId}>
                    <MintVariantDropIndicator visible={showDropBefore} />
                    <div
                      ref={(element) => {
                        if (element) {
                          rowRefs.current.set(rowId, element)
                        } else {
                          rowRefs.current.delete(rowId)
                        }
                      }}
                      data-mint-row={rowId}
                      className={[
                        'group/mint-row overflow-hidden rounded-lg border bg-white/90',
                        'transition-[transform,box-shadow,border-color,background-color,opacity] duration-200 ease-out',
                        isDragging
                          ? 'relative z-10 scale-[1.01] border-primary/35 bg-white shadow-lg shadow-primary/10'
                          : 'border-border/35 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-border/50 hover:bg-white hover:shadow-[0_2px_6px_rgba(15,23,42,0.05)]',
                      ].join(' ')}
                    >
                      <div className="flex min-w-0 items-center gap-0.5 px-1.5 py-1 sm:gap-1 sm:px-2 sm:py-1.5">
                        <button
                          type="button"
                          disabled={disabled}
                          aria-label={t('mint.dragHandle')}
                          title={t('mint.dragHandle')}
                          onPointerDown={(event) => startPointerDrag(index, rowId, event)}
                          className={[
                            'inline-flex h-8 w-7 shrink-0 touch-none items-center justify-center rounded-md text-navy-muted/50 transition-colors',
                            'hover:bg-muted/40 hover:text-navy-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
                            isDragging ? 'cursor-grabbing text-navy-muted' : 'cursor-grab',
                            disabled ? 'opacity-50' : '',
                          ].join(' ')}
                        >
                          <GripVertical className="h-3.5 w-3.5" aria-hidden />
                        </button>

                      <button
                        id={headerId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        disabled={disabled}
                        onClick={() => toggleVariantAccordion(row, index)}
                        className="flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
                      >
                        <ChevronDown
                          className={[
                            'mt-0.5 h-3.5 w-3.5 shrink-0 self-start text-navy-muted transition-transform',
                            isOpen ? 'rotate-180' : '',
                          ].join(' ')}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium leading-tight text-navy">
                            {rowContent.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs leading-snug text-navy-muted">
                            {rowContent.subtitle}
                          </span>
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover/mint-row:opacity-100 sm:group-focus-within/mint-row:opacity-100">
                        <button
                          type="button"
                          disabled={disabled || index === 0}
                          onClick={() => moveVariantRow(index, index - 1)}
                          aria-label={t('mint.moveUp')}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-navy-muted/70 transition-colors hover:bg-muted/40 hover:text-navy focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          disabled={disabled || index === variantCount - 1}
                          onClick={() => moveVariantRow(index, index + 1)}
                          aria-label={t('mint.moveDown')}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-navy-muted/70 transition-colors hover:bg-muted/40 hover:text-navy focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removeVariantRow(index)}
                        aria-label={t('mint.removeVariant')}
                        className="ml-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-navy-muted/70 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>

                    {isOpen ? (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={headerId}
                        className="space-y-2.5 border-t border-border/35 px-3 pb-3 pt-2.5"
                      >
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <SelectField
                            label={t('mint.markCode')}
                            name={`mint_variants_${index}_mint_mark_code`}
                            value={normalizeMintMarkCode(row.mintMarkCode)}
                            options={getMintMarkCodeSelectOptions(
                              row.mintMarkCode,
                              t('mint.selectMintMark'),
                            )}
                            onChange={(event) => changeMintMarkCode(index, event.target.value)}
                            disabled={disabled}
                            helpTooltip={FIELD_HELP.mintMark}
                          />

                          <div className="flex flex-col gap-2">
                            <FieldLabelWithHelp
                              htmlFor={`mint_variants_${index}_mint_mintage`}
                              label={t('mint.mintage')}
                              helpText={FIELD_HELP.mintage}
                            />
                            <div className="relative">
                              <input
                                id={`mint_variants_${index}_mint_mintage`}
                                name={`mint_variants_${index}_mint_mintage`}
                                type="text"
                                inputMode="numeric"
                                value={row.mintMintage}
                                onChange={(event) =>
                                  updateVariantRow(index, 'mintMintage', event.target.value)
                                }
                                onBlur={() =>
                                  blurVariantField(index, 'mintMintage', row.mintMintage)
                                }
                                disabled={disabled}
                                className="field-control w-full pr-9"
                              />
                              {row.mintMintage.trim() ? (
                                <button
                                  type="button"
                                  disabled={disabled}
                                  aria-label={t('mint.clearMintage')}
                                  onClick={() => updateVariantRow(index, 'mintMintage', '')}
                                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-navy-muted transition-colors hover:bg-muted hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div>
                          {notesExpanded ? (
                            <div className="space-y-1.5">
                              <TextAreaField
                                label={t('mint.notesOptional')}
                                name={`mint_variants_${index}_mint_notes`}
                                rows={2}
                                value={row.mintNotes}
                                onChange={(event) =>
                                  updateVariantRow(index, 'mintNotes', event.target.value)
                                }
                                disabled={disabled}
                              />
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => toggleNotes(row, index)}
                                className="text-xs font-medium text-navy-muted transition-colors hover:text-navy"
                              >
                                {t('mint.hideNotes')}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleNotes(row, index)}
                              className="text-xs font-medium text-primary transition-colors hover:text-primary-hover"
                            >
                              {t('mint.showNotes')}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                    </div>
                  </Fragment>
                )
              })}
              <MintVariantDropIndicator
                visible={activeDragId !== null && dropInsertIndex === variantCount}
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
