import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  RemoveFormatting,
} from 'lucide-react'
import { FieldLabelWithHelp } from '../ui/FieldHelpTooltip'

type RichTextFieldProps = {
  label: string
  name?: string
  value: string
  onChange: (html: string) => void
  hint?: string
  helpTooltip?: string
  error?: string
  attention?: string
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function sanitizeRichTextValue(value: string | null | undefined): string {
  return value ?? ''
}

export function normalizeRichTextHtml(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) {
    return ''
  }

  const emptyPatterns = new Set([
    '<p></p>',
    '<p><br></p>',
    '<p><br/></p>',
    '<p><br class="ProseMirror-trailingBreak"></p>',
  ])

  if (emptyPatterns.has(trimmed)) {
    return ''
  }

  if (typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = trimmed
    const text = el.textContent?.replace(/\u00a0/g, ' ').trim() ?? ''
    if (!text) {
      return ''
    }
  }

  return trimmed
}

function isEditorReady(editor: Editor | null): editor is Editor {
  if (!editor || editor.isDestroyed) {
    return false
  }

  try {
    return Boolean(editor.schema)
  } catch {
    return false
  }
}

export function safeGetEditorHtml(editor: Editor | null, fallback = ''): string {
  if (!isEditorReady(editor)) {
    return fallback
  }

  try {
    return normalizeRichTextHtml(editor.getHTML())
  } catch {
    return fallback
  }
}

function safeSetEditorContent(editor: Editor | null, html: string): void {
  if (!isEditorReady(editor)) {
    return
  }

  try {
    editor.commands.setContent(html, { emitUpdate: false })
  } catch {
    // Editor may be tearing down during lazy route/step transitions.
  }
}

type ToolbarButtonProps = {
  label: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolbarButton({
  label,
  isActive = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-white',
        isActive
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-transparent bg-transparent text-navy-muted hover:text-navy',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function RichTextField({
  label,
  name,
  value,
  onChange,
  hint,
  helpTooltip,
  error,
  attention,
  placeholder,
  disabled = false,
  id,
}: RichTextFieldProps) {
  const safeValue = sanitizeRichTextValue(value)
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined
  const attentionId = !error && attention ? `${fieldId}-attention` : undefined
  const describedBy = [errorId, attentionId].filter(Boolean).join(' ')
  const mountedRef = useRef(true)
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(safeValue)

  onChangeRef.current = onChange
  valueRef.current = safeValue

  const editorAttributes = useMemo(() => {
    const attributes: Record<string, string> = {
      class: 'rich-text-editor__content',
      'aria-labelledby': `${fieldId}-label`,
      'data-placeholder': placeholder ?? '',
    }

    if (describedBy) {
      attributes['aria-describedby'] = describedBy
    }

    if (error) {
      attributes['aria-invalid'] = 'true'
    }

    return attributes
  }, [describedBy, error, fieldId, placeholder])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
    ],
    content: safeValue,
    editable: !disabled,
    editorProps: {
      attributes: editorAttributes,
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!mountedRef.current || !isEditorReady(currentEditor)) {
        return
      }

      const html = safeGetEditorHtml(currentEditor, valueRef.current)
      onChangeRef.current(html)
    },
    onBlur: ({ editor: currentEditor }) => {
      if (!mountedRef.current || !isEditorReady(currentEditor)) {
        return
      }

      const html = safeGetEditorHtml(currentEditor, valueRef.current)
      if (html !== valueRef.current) {
        onChangeRef.current(html)
      }
    },
  })

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!mountedRef.current || !isEditorReady(editor)) {
      return
    }

    editor.setEditable(!disabled)
  }, [editor, disabled])

  useEffect(() => {
    if (!mountedRef.current || !isEditorReady(editor)) {
      return
    }

    const current = safeGetEditorHtml(editor, '')
    const next = normalizeRichTextHtml(safeValue)

    if (current !== next) {
      safeSetEditorContent(editor, next)
    }
  }, [editor, safeValue])

  function handleSetLink() {
    if (!isEditorReady(editor) || disabled) {
      return
    }

    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previousUrl || 'https://')

    if (url === null) {
      return
    }

    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  function handleClearFormatting() {
    if (!isEditorReady(editor) || disabled) {
      return
    }

    editor.chain().focus().clearNodes().unsetAllMarks().run()
    onChangeRef.current(safeGetEditorHtml(editor, valueRef.current))
  }

  const shellClass = [
    'rich-text-editor field-control overflow-hidden p-0',
    error ? 'field-control--error' : attention ? 'field-control--attention' : '',
    disabled ? 'opacity-100' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-2">
      <span id={`${fieldId}-label`}>
        <FieldLabelWithHelp htmlFor={fieldId} label={label} helpText={helpTooltip} />
      </span>

      <div className={shellClass}>
        <div
          role="toolbar"
          aria-label={`${label} formatting`}
          className="flex flex-wrap gap-1 border-b border-border/60 bg-white/80 px-2 py-2"
        >
          <ToolbarButton
            label="Bold"
            isActive={editor?.isActive('bold') ?? false}
            disabled={disabled || !isEditorReady(editor)}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            isActive={editor?.isActive('italic') ?? false}
            disabled={disabled || !isEditorReady(editor)}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            isActive={editor?.isActive('bulletList') ?? false}
            disabled={disabled || !isEditorReady(editor)}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Ordered list"
            isActive={editor?.isActive('orderedList') ?? false}
            disabled={disabled || !isEditorReady(editor)}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Link"
            isActive={editor?.isActive('link') ?? false}
            disabled={disabled || !isEditorReady(editor)}
            onClick={handleSetLink}
          >
            <Link2 className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Clear formatting"
            disabled={disabled || !isEditorReady(editor)}
            onClick={handleClearFormatting}
          >
            <RemoveFormatting className="h-4 w-4" aria-hidden />
          </ToolbarButton>
        </div>

        <EditorContent id={fieldId} editor={editor} />
      </div>

      {name ? <input type="hidden" name={name} value={safeValue} readOnly /> : null}

      {error ? (
        <p id={errorId} role="alert" className="field-message field-message--error">
          {error}
        </p>
      ) : null}
      {!error && attention ? (
        <p id={attentionId} className="field-message field-message--attention">
          {attention}
        </p>
      ) : null}
      {!error && !attention && hint ? (
        <p className="field-message field-message--hint">{hint}</p>
      ) : null}
    </div>
  )
}
