import {
  AlertCircle,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Info,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import {
  importAdminCoins,
  type ImportAdminCoinsResponse,
  type ImportCoinRow,
  type ImportCoinRowResult,
} from '../../lib/adminApi'
import { useAuth } from '../../hooks/useAuth'
import { normalizeReleaseDate } from '../../lib/coinCodePreview'
import { normalizeImportHeaderKey, normalizeImportRow } from '../../lib/inputNormalization'

// ── Template field definitions ────────────────────────────────────────────────

type TemplateField = {
  key: string
  label: string
  required: boolean
  recommended?: boolean
  description: string
}

const TEMPLATE_FIELDS: TemplateField[] = [
  // Required
  { key: 'title', label: 'Title', required: true, description: 'Full coin title' },
  { key: 'country', label: 'Country', required: true, description: 'Country of issue' },
  { key: 'year', label: 'Year', required: true, description: '4-digit year, e.g. 2023' },
  { key: 'denomination', label: 'Denomination', required: true, description: 'e.g. 2 Euro, 50 Cent' },
  { key: 'coin_type', label: 'Coin Type', required: true, description: 'e.g. Commemorative, Circulation' },
  { key: 'released_date', label: 'Released Date', required: true, description: 'Official release date. Format: YYYY-MM-DD, YYYYMMDD, DD.MM.YYYY, or DD/MM/YYYY. Used in coin_code.' },
  { key: 'obverse_image_url', label: 'Obverse Image URL', required: false, recommended: true, description: 'Recommended. Full URL to obverse image. Can be added later via the admin queue.' },
  { key: 'reverse_image_url', label: 'Reverse Image URL', required: false, description: 'Optional. Full URL to reverse image. Can be left empty when using a default reverse image.' },
  // Optional
  { key: 'theme', label: 'Theme', required: false, description: 'e.g. Nature, History' },
  { key: 'coin_code', label: 'Coin Code', required: false, description: 'Optional manual override only. Leave empty — WordPress auto-generates from country, year, denomination, coin_type, and released_date.' },
  { key: 'short_description', label: 'Short Description', required: false, description: 'Brief 1–2 sentence summary' },
  { key: 'historical_background', label: 'Historical Background', required: false, description: 'Full historical context' },
  { key: 'mintage', label: 'Mintage', required: false, description: 'Total coins minted, e.g. 5000000' },
  { key: 'mint_mark', label: 'Mint Mark', required: false, description: 'Comma-separated mint marks. Use A,D,F,G,J for all German mints, or a single value like A. Leave empty if unknown.' },
  { key: 'material', label: 'Material', required: false, description: 'e.g. Bimetallic, Silver' },
  { key: 'weight', label: 'Weight (g)', required: false, description: 'Weight in grams, e.g. 8.5' },
  { key: 'diameter', label: 'Diameter (mm)', required: false, description: 'Diameter in mm, e.g. 25.75' },
  { key: 'edge', label: 'Edge', required: false, description: 'e.g. Reeded, Plain' },
  { key: 'designer', label: 'Designer', required: false, description: 'Coin designer or artist name (maps to coin_designer)' },
  { key: 'coin_designer', label: 'Designer / Artist', required: false, description: 'Coin designer or artist name' },
  { key: 'coin_series', label: 'Series', required: false, description: 'Coin series taxonomy term name or slug' },
  { key: 'coin_issue_status', label: 'Issue Status', required: false, description: 'scheduled, released, withdrawn, or cancelled' },
  { key: 'coin_source_name', label: 'Official Source Name', required: false, description: 'Official reference source name' },
  { key: 'coin_source_url', label: 'Official Source URL', required: false, description: 'Official reference URL (http/https)' },
  {
    key: 'gallery_image_urls',
    label: 'Gallery Image URLs',
    required: false,
    description: 'Pipe-separated URLs: url1|url2|url3',
  },
  // ── Extended metadata ──
  { key: 'coin_quality',              label: 'Coin Quality',               required: false, description: 'UNC, BU, Proof, or Circulated.' },
  { key: 'coin_obverse_description',  label: 'Obverse Description',        required: false, description: 'Description of obverse design. Max 5000 characters.' },
  { key: 'coin_reverse_description',  label: 'Reverse Description',        required: false, description: 'Description of reverse design. Max 5000 characters.' },
  { key: 'coin_collector_notes',      label: 'Collector Notes',            required: false, description: 'Additional collector notes. Max 5000 characters.' },
  { key: 'coin_is_published_catalogue', label: 'Published in Catalogue',   required: false, description: '1/0, true/false, yes/no, or on/off.' },
  { key: 'coin_is_featured',          label: 'Featured Coin',              required: false, description: '1/0, true/false, yes/no, or on/off.' },
  { key: 'coin_is_app_enabled',       label: 'App Enabled',                required: false, description: '1/0, true/false, yes/no, or on/off.' },
  { key: 'coin_record_status',        label: 'Record Status',              required: false, description: 'active, hidden, or deprecated.' },
]

const REQUIRED_KEYS = TEMPLATE_FIELDS.filter((f) => f.required).map((f) => f.key)
const TEMPLATE_HEADERS = TEMPLATE_FIELDS.map((f) => f.key)

// ── CSV utilities ─────────────────────────────────────────────────────────────

function buildCsvTemplate(): string {
  const header = TEMPLATE_HEADERS.join(',')
  const exampleRow = TEMPLATE_HEADERS
    .map((key) => STANDARD_SAMPLE_ROWS[0][key] ?? '')
    .map((v) => (v.includes(',') ? `"${v}"` : v))
    .join(',')
  return `${header}\n${exampleRow}\n`
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const DEFAULT_STATUS_FIELDS: Record<string, string> = {
  coin_is_published_catalogue: '1',
  coin_is_featured: '0',
  coin_is_app_enabled: '1',
  coin_record_status: 'active',
  reverse_image_url: '',
  gallery_image_urls: '',
}

const STANDARD_SAMPLE_ROWS: Record<string, string>[] = [
  {
    title: 'German Unity 2 Euro 2023',
    country: 'Germany',
    year: '2023',
    denomination: '2 Euro',
    coin_type: 'Commemorative',
    coin_code: '',
    obverse_image_url: 'https://example.com/de-2023-unity-obverse.jpg',
    theme: 'History',
    short_description: 'Commemorating 33 years of German reunification.',
    historical_background: 'On October 3, 1990, East and West Germany were officially reunified after decades of division.',
    mintage: '6000000',
    mint_mark: 'A',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded with lettering',
    designer: 'Bodo Broschat',
    released_date: '2023-10-03',
    coin_quality: 'BU',
    coin_obverse_description: 'Brandenburg Gate with unity motif and national inscription.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'Popular modern German commemorative; often collected by mint mark.',
    ...DEFAULT_STATUS_FIELDS,
  },
  {
    title: 'Paris 2024 Olympics 2 Euro',
    country: 'France',
    year: '2024',
    denomination: '2 Euro',
    coin_type: 'Commemorative',
    coin_code: '',
    obverse_image_url: 'https://example.com/fr-2024-olympics-obverse.jpg',
    theme: 'Sport',
    short_description: 'Celebrating the Paris 2024 Olympic Games.',
    historical_background: 'France hosted the Summer Olympics in Paris for the third time, marking a major national celebration.',
    mintage: '3000000',
    mint_mark: '',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded',
    designer: 'Joaquin Jimenez',
    released_date: '2024-06-15',
    coin_quality: 'UNC',
    coin_obverse_description: 'Olympic rings with Paris skyline and Games emblem.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'Strong demand among Olympic-themed collectors.',
    ...DEFAULT_STATUS_FIELDS,
  },
  {
    title: 'Dante Alighieri 2 Euro 2023',
    country: 'Italy',
    year: '2023',
    denomination: '2 Euro',
    coin_type: 'Commemorative',
    coin_code: '',
    obverse_image_url: '',
    theme: 'Culture',
    short_description: '700th anniversary of Dante Alighieri.',
    historical_background: 'Dante Alighieri is regarded as the father of the Italian language and one of Europe\'s greatest poets.',
    mintage: '3000000',
    mint_mark: 'R',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded',
    designer: 'Maria Angela Cassol',
    released_date: '2023-09-14',
    coin_quality: 'BU',
    coin_obverse_description: 'Portrait of Dante with manuscript and laurel wreath.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'Rome mint issue; obverse image can be added later.',
    ...DEFAULT_STATUS_FIELDS,
  },
  {
    title: 'UNESCO Cuenca 2 Euro 2022',
    country: 'Spain',
    year: '2022',
    denomination: '2 Euro',
    coin_type: 'Circulation',
    coin_code: '',
    obverse_image_url: 'https://example.com/es-2022-cuenca-obverse.jpg',
    theme: 'UNESCO',
    short_description: 'Historic walled town of Cuenca, UNESCO World Heritage site.',
    historical_background: 'Cuenca is famous for its hanging houses and medieval architecture in Castilla-La Mancha.',
    mintage: '4000000',
    mint_mark: '',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded',
    designer: 'Alfonso Morales',
    released_date: '2022-05-10',
    coin_quality: 'UNC',
    coin_obverse_description: 'Panoramic view of Cuenca old town and gorge.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'Part of Spain\'s UNESCO heritage coin series.',
    ...DEFAULT_STATUS_FIELDS,
  },
  {
    title: 'Erasmus Programme 2 Euro 2024',
    country: 'Netherlands',
    year: '2024',
    denomination: '2 Euro',
    coin_type: 'Commemorative',
    coin_code: '',
    obverse_image_url: 'https://example.com/nl-2024-erasmus-obverse.jpg',
    theme: 'Education',
    short_description: '35 years of the Erasmus student exchange programme.',
    historical_background: 'Erasmus has enabled millions of European students to study abroad since 1987.',
    mintage: '3500000',
    mint_mark: '',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded',
    designer: 'Maarten van Dijk',
    released_date: '2024-01-30',
    coin_quality: 'BU',
    coin_obverse_description: 'Erasmus portrait with open book and exchange motif.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'Useful sample for education-themed imports.',
    ...DEFAULT_STATUS_FIELDS,
  },
]

// ── XLSX builder helpers ──────────────────────────────────────────────────────

type XlsxModule = typeof import('xlsx')

async function loadXlsxModule(): Promise<XlsxModule> {
  return import('xlsx')
}

// Clean header keys — no markers in spreadsheet column names.
// Required/recommended status is shown only in the UI table and Notes sheet.
const HEADER_ROW = TEMPLATE_FIELDS.map((f) => f.key)

function buildCoinsSheet(
  XLSX: XlsxModule,
  dataRows: Record<string, string>[],
) {
  const rows = dataRows.map((row) =>
    TEMPLATE_FIELDS.map((f) => row[f.key] ?? ''),
  )

  const ws = XLSX.utils.aoa_to_sheet([HEADER_ROW, ...rows])

  ws['!cols'] = TEMPLATE_FIELDS.map((f, i) => {
    const maxDataLen = dataRows.reduce((m, r) => Math.max(m, (r[f.key] ?? '').length), 0)
    return { wch: Math.max(HEADER_ROW[i].length, maxDataLen, 12) + 2 }
  })
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  return ws
}

function buildNotesSheet(
  XLSX: XlsxModule,
  exampleRow: Record<string, string>,
  extraNotes: string[][] = [],
) {
  const data: string[][] = [
    ['Field', 'Status', 'Description', 'Example'],
    ...TEMPLATE_FIELDS.map((f) => [
      f.key,
      f.required ? 'Required' : f.recommended ? 'Recommended' : 'Optional',
      f.description,
      exampleRow[f.key] ?? '',
    ]),
    [],
    ['Notes', '', '', ''],
    ['Required fields: title, country, year, denomination, coin_type, released_date — must not be empty.', '', '', ''],
    ['Recommended: obverse_image_url — can be added later if empty.', '', '', ''],
    ['Optional: reverse_image_url — leave empty to use default reverse image.', '', '', ''],
    ['coin_quality — UNC, BU, Proof, or Circulated', '', '', ''],
    ['coin_record_status — active, hidden, or deprecated', '', '', ''],
    ['Boolean fields (coin_is_*) — 1/0, true/false, yes/no, on/off', '', '', ''],
    ['Sample defaults: published=1, featured=0, app_enabled=1, record_status=active', '', '', ''],
    ['gallery_image_urls — separate multiple URLs with a pipe character: url1|url2|url3', '', '', ''],
    ['image URLs — must be a full URL starting with https:// when provided', '', '', ''],
    ['year — 4-digit number between 1800 and 2100', '', '', ''],
    ['released_date — YYYY-MM-DD, YYYYMMDD, DD.MM.YYYY, or DD/MM/YYYY', '', '', ''],
    ['coin_code — optional manual override; leave empty for WordPress auto-generation from country, year, denomination, coin_type, released_date', '', '', ''],
    ['All imported rows are created as drafts — review and publish from the Admin Queue.', '', '', ''],
    ...extraNotes,
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 32 }, { wch: 14 }, { wch: 60 }, { wch: 50 }]
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  return ws
}

async function buildXlsxTemplate(): Promise<void> {
  const XLSX = await loadXlsxModule()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildCoinsSheet(XLSX, STANDARD_SAMPLE_ROWS), 'Coins Import')
  XLSX.utils.book_append_sheet(wb, buildNotesSheet(XLSX, STANDARD_SAMPLE_ROWS[0]), 'Notes')
  XLSX.writeFile(wb, 'coinarchive-import-template.xlsx')
}

// ── German-only XLSX template ─────────────────────────────────────────────────

// ── German ACF Mint Variants repeater columns ─────────────────────────────────
// ACF select values use city names, not letter codes.
// Up to 5 mint variants per coin (mint_1 … mint_5).

type GermanMintExtra = { key: string; header: string }
const GERMAN_MINT_EXTRA_COLS: GermanMintExtra[] = [
  { key: 'mint_1_code',     header: 'mint_1_code'     },
  { key: 'mint_1_mintage',  header: 'mint_1_mintage'  },
  { key: 'mint_1_notes',    header: 'mint_1_notes'    },
  { key: 'mint_2_code',     header: 'mint_2_code'     },
  { key: 'mint_2_mintage',  header: 'mint_2_mintage'  },
  { key: 'mint_2_notes',    header: 'mint_2_notes'    },
  { key: 'mint_3_code',     header: 'mint_3_code'     },
  { key: 'mint_3_mintage',  header: 'mint_3_mintage'  },
  { key: 'mint_3_notes',    header: 'mint_3_notes'    },
  { key: 'mint_4_code',     header: 'mint_4_code'     },
  { key: 'mint_4_mintage',  header: 'mint_4_mintage'  },
  { key: 'mint_4_notes',    header: 'mint_4_notes'    },
  { key: 'mint_5_code',     header: 'mint_5_code'     },
  { key: 'mint_5_mintage',  header: 'mint_5_mintage'  },
  { key: 'mint_5_notes',    header: 'mint_5_notes'    },
]

// One row per coin — mint variants use mint_1 … mint_5 repeater columns.
const GERMAN_MINT_ROWS: Record<string, string>[] = [
  {
    title: 'German Reunification 2 Euro 2023',
    country: 'Germany',
    year: '2023',
    denomination: '2 Euro',
    coin_type: 'Commemorative',
    coin_code: '',
    mint_mark: '',
    theme: 'History',
    short_description: 'Commemorating 33 years of German reunification.',
    historical_background: 'On October 3, 1990, East and West Germany were officially reunified. Struck at all five federal mints.',
    mintage: '6000000',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded with lettering',
    designer: 'Bodo Broschat',
    obverse_image_url: 'https://example.com/de-2023-reunification-obverse.jpg',
    released_date: '2023-10-03',
    coin_quality: 'BU',
    coin_obverse_description: 'Brandenburg Gate with unity motif and national inscription.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'All-mint example: Berlin, Munich, Stuttgart, Karlsruhe, Hamburg.',
    ...DEFAULT_STATUS_FIELDS,
    mint_1_code: 'Berlin',    mint_1_mintage: '1200000', mint_1_notes: 'Berlin mint (A)',
    mint_2_code: 'Munich',    mint_2_mintage: '1200000', mint_2_notes: 'Munich mint (D)',
    mint_3_code: 'Stuttgart', mint_3_mintage: '1200000', mint_3_notes: 'Stuttgart mint (F)',
    mint_4_code: 'Karlsruhe', mint_4_mintage: '1200000', mint_4_notes: 'Karlsruhe mint (G)',
    mint_5_code: 'Hamburg',   mint_5_mintage: '1200000', mint_5_notes: 'Hamburg mint (J)',
  },
  {
    title: 'Brandenburg Gate 2 Euro 2022',
    country: 'Germany',
    year: '2022',
    denomination: '2 Euro',
    coin_type: 'Commemorative',
    coin_code: '',
    mint_mark: '',
    theme: 'Architecture',
    short_description: 'The Brandenburg Gate — symbol of German and European unity.',
    historical_background: 'The Brandenburg Gate became a symbol of division during the Cold War and reunification after 1989.',
    mintage: '3600000',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded with lettering',
    designer: 'Heinz Hoyer',
    obverse_image_url: 'https://example.com/de-2022-gate-obverse.jpg',
    released_date: '2022-06-01',
    coin_quality: 'UNC',
    coin_obverse_description: 'Brandenburg Gate with quadriga and city skyline.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'Three-mint example: Berlin, Munich, Hamburg.',
    ...DEFAULT_STATUS_FIELDS,
    mint_1_code: 'Berlin',  mint_1_mintage: '1200000', mint_1_notes: 'Berlin mint (A)',
    mint_2_code: 'Munich',  mint_2_mintage: '1200000', mint_2_notes: 'Munich mint (D)',
    mint_3_code: 'Hamburg', mint_3_mintage: '1200000', mint_3_notes: 'Hamburg mint (J)',
    mint_4_code: '', mint_4_mintage: '', mint_4_notes: '',
    mint_5_code: '', mint_5_mintage: '', mint_5_notes: '',
  },
  {
    title: 'Bundesrat 2 Euro 2024',
    country: 'Germany',
    year: '2024',
    denomination: '2 Euro',
    coin_type: 'Commemorative',
    coin_code: '',
    mint_mark: '',
    theme: 'Politics',
    short_description: '75 years of the German Bundesrat.',
    historical_background: 'The Bundesrat represents Germany\'s sixteen federal states in national legislation.',
    mintage: '3600000',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded with lettering',
    designer: 'André Witting',
    obverse_image_url: '',
    released_date: '2024-09-01',
    coin_quality: 'BU',
    coin_obverse_description: 'Bundesrat chamber with federal eagle motif.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'Three-mint example: Stuttgart, Karlsruhe, Hamburg.',
    ...DEFAULT_STATUS_FIELDS,
    mint_1_code: 'Stuttgart', mint_1_mintage: '1200000', mint_1_notes: 'Stuttgart mint (F)',
    mint_2_code: 'Karlsruhe', mint_2_mintage: '1200000', mint_2_notes: 'Karlsruhe mint (G)',
    mint_3_code: 'Hamburg',   mint_3_mintage: '1200000', mint_3_notes: 'Hamburg mint (J)',
    mint_4_code: '', mint_4_mintage: '', mint_4_notes: '',
    mint_5_code: '', mint_5_mintage: '', mint_5_notes: '',
  },
  {
    title: 'Berlin Wall Memorial 2 Euro 2023',
    country: 'Germany',
    year: '2023',
    denomination: '2 Euro',
    coin_type: 'Commemorative',
    coin_code: '',
    mint_mark: '',
    theme: 'History',
    short_description: 'Commemorating the fall of the Berlin Wall.',
    historical_background: 'The Berlin Wall divided the city from 1961 until its fall on November 9, 1989.',
    mintage: '1200000',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded with lettering',
    designer: 'Stefanie Lindner',
    obverse_image_url: 'https://example.com/de-2023-wall-obverse.jpg',
    released_date: '2023-11-09',
    coin_quality: 'UNC',
    coin_obverse_description: 'Wall segments with broken barrier and dove of peace.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'Single-mint example: Berlin only.',
    ...DEFAULT_STATUS_FIELDS,
    mint_1_code: 'Berlin', mint_1_mintage: '1200000', mint_1_notes: 'Berlin mint (A)',
    mint_2_code: '', mint_2_mintage: '', mint_2_notes: '',
    mint_3_code: '', mint_3_mintage: '', mint_3_notes: '',
    mint_4_code: '', mint_4_mintage: '', mint_4_notes: '',
    mint_5_code: '', mint_5_mintage: '', mint_5_notes: '',
  },
  {
    title: 'Bavarian Heritage 2 Euro 2024',
    country: 'Germany',
    year: '2024',
    denomination: '2 Euro',
    coin_type: 'Commemorative',
    coin_code: '',
    mint_mark: '',
    theme: 'Federal States',
    short_description: 'Celebrating Bavarian cultural heritage.',
    historical_background: 'Bavaria is Germany\'s largest federal state, known for its traditions, castles, and alpine culture.',
    mintage: '1200000',
    material: 'Bimetallic',
    weight: '8.5',
    diameter: '25.75',
    edge: 'Reeded with lettering',
    designer: 'Klaus Lindner',
    obverse_image_url: 'https://example.com/de-2024-bavaria-obverse.jpg',
    released_date: '2024-03-15',
    coin_quality: 'BU',
    coin_obverse_description: 'Neuschwanstein Castle with Bavarian lozenge pattern.',
    coin_reverse_description: 'Common 2 Euro reverse design',
    coin_collector_notes: 'Single-mint example: Munich only.',
    ...DEFAULT_STATUS_FIELDS,
    mint_1_code: 'Munich', mint_1_mintage: '1200000', mint_1_notes: 'Munich mint (D)',
    mint_2_code: '', mint_2_mintage: '', mint_2_notes: '',
    mint_3_code: '', mint_3_mintage: '', mint_3_notes: '',
    mint_4_code: '', mint_4_mintage: '', mint_4_notes: '',
    mint_5_code: '', mint_5_mintage: '', mint_5_notes: '',
  },
]

// Builds the Coins Import sheet for the German template, appending the
// mint_N repeater columns after the standard TEMPLATE_FIELDS columns.
function buildGermanCoinsSheet(XLSX: XlsxModule) {
  const extraHeaders = GERMAN_MINT_EXTRA_COLS.map((c) => c.header)
  const fullHeaderRow = [...HEADER_ROW, ...extraHeaders]

  const rows = GERMAN_MINT_ROWS.map((row) => {
    const standardCells = TEMPLATE_FIELDS.map((f) => row[f.key] ?? '')
    const extraCells = GERMAN_MINT_EXTRA_COLS.map((c) => row[c.key] ?? '')
    return [...standardCells, ...extraCells]
  })

  const ws = XLSX.utils.aoa_to_sheet([fullHeaderRow, ...rows])

  const standardWidths = TEMPLATE_FIELDS.map((f, i) => {
    const maxDataLen = GERMAN_MINT_ROWS.reduce((m, r) => Math.max(m, (r[f.key] ?? '').length), 0)
    return { wch: Math.max(HEADER_ROW[i].length, maxDataLen, 12) + 2 }
  })
  const extraWidths = GERMAN_MINT_EXTRA_COLS.map((c) => {
    const maxDataLen = GERMAN_MINT_ROWS.reduce((m, r) => Math.max(m, (r[c.key] ?? '').length), 0)
    return { wch: Math.max(c.header.length, maxDataLen, 14) + 2 }
  })
  ws['!cols'] = [...standardWidths, ...extraWidths]
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  return ws
}

const GERMAN_MINTS_TABLE: string[][] = [
  ['ACF Select Value', 'Mint Letter', 'Mint Name', 'City'],
  ['Berlin',    'A', 'Staatliche Münze Berlin',              'Berlin'   ],
  ['Munich',    'D', 'Bayerisches Hauptmünzamt',             'München'  ],
  ['Stuttgart', 'F', 'Staatliche Münzen Baden-Württemberg',  'Stuttgart'],
  ['Karlsruhe', 'G', 'Staatliche Münzen Baden-Württemberg',  'Karlsruhe'],
  ['Hamburg',   'J', 'Hamburgische Münze',                   'Hamburg'  ],
  [],
  ['Column usage in Coins Import sheet', '', '', ''],
  ['mint_1_code — mint_5_code',     'ACF select value (city name)',  '', ''],
  ['mint_1_mintage — mint_5_mintage','Mintage for this specific mint','', ''],
  ['mint_1_notes — mint_5_notes',   'Optional notes (e.g. Berlin mint (A))','',''],
  [],
  ['Sample row mint counts', '', '', ''],
  ['Row 1', '5 mints — Berlin, Munich, Stuttgart, Karlsruhe, Hamburg', '', ''],
  ['Row 2', '3 mints — Berlin, Munich, Hamburg', '', ''],
  ['Row 3', '3 mints — Stuttgart, Karlsruhe, Hamburg', '', ''],
  ['Row 4', '1 mint — Berlin', '', ''],
  ['Row 5', '1 mint — Munich', '', ''],
  [],
  ['Rules', '', '', ''],
  ['One Excel row = one coin post. Do NOT create one row per mint.', '', '', ''],
  ['Use mint_1 … mint_5 for up to 5 variants. Leave unused slots empty.', '', '', ''],
  ['mint_mark column should be left empty when using repeater columns.', '', '', ''],
  ['coin_code must NOT include mint information.', '', '', ''],
  ['coin_code format: COUNTRY-YEAR-DENOMINATION-TYPE-RELEASEDATE-SUFFIX', '', '', ''],
]

async function buildXlsxGermanTemplate(): Promise<void> {
  const XLSX = await loadXlsxModule()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildGermanCoinsSheet(XLSX), 'Coins Import')

  const wsMints = XLSX.utils.aoa_to_sheet(GERMAN_MINTS_TABLE)
  wsMints['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 40 }, { wch: 14 }]
  wsMints['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsMints, 'German Mints')

  XLSX.utils.book_append_sheet(
    wb,
    buildNotesSheet(XLSX, GERMAN_MINT_ROWS[0], [
      [],
      ['German mint examples (Coins Import sheet)', '', '', ''],
      ['Row 1 — 5 mints', 'Berlin, Munich, Stuttgart, Karlsruhe, Hamburg', '', ''],
      ['Row 2 — 3 mints', 'Berlin, Munich, Hamburg', '', ''],
      ['Row 3 — 3 mints', 'Stuttgart, Karlsruhe, Hamburg', '', ''],
      ['Row 4 — 1 mint', 'Berlin', '', ''],
      ['Row 5 — 1 mint', 'Munich', '', ''],
      ['mint_1_code uses ACF city names (Berlin, Munich, not A/D letters)', '', '', ''],
    ]),
    'Notes',
  )

  XLSX.writeFile(wb, 'coinarchive-import-template-germany.xlsx')
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Strip BOM from start of file
  const cleaned = text.replace(/^\uFEFF/, '')
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const rawHeaders = parseCsvLine(lines[0]).map((h) => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const raw: Record<string, string> = {}
    rawHeaders.forEach((h, idx) => {
      raw[h] = (values[idx] ?? '').trim()
    })
    rows.push(normalizeImportRow(raw))
  }

  // Return normalised headers so missing-column check works
  const headers = rows.length > 0 ? Object.keys(rows[0]) : rawHeaders.map(normalizeImportHeaderKey)
  return { headers, rows }
}

// ── Validation ────────────────────────────────────────────────────────────────

type RowError = { field: string; message: string }

type ParsedRow = {
  index: number
  data: Record<string, string>
  errors: RowError[]
}

function normalizeTitleKey(title: string): string {
  return title.trim().toLowerCase()
}

function validateRow(
  data: Record<string, string>,
  index: number,
  coinCodes: Map<string, number>,
  duplicateTitleRows: Map<string, number[]>,
): RowError[] {
  const errors: RowError[] = []

  // Missing required fields
  for (const key of REQUIRED_KEYS) {
    if (!data[key]?.trim()) {
      const field = TEMPLATE_FIELDS.find((f) => f.key === key)
      errors.push({ field: key, message: `${field?.label ?? key} is required.` })
    }
  }

  // Year validation
  const year = data['year']?.trim()
  if (year) {
    const yearNum = Number(year)
    if (!/^\d{4}$/.test(year) || yearNum < 1800 || yearNum > 2100) {
      errors.push({ field: 'year', message: 'Year must be a 4-digit number between 1800 and 2100.' })
    }
  }

  // URL format validation (only when a value is provided)
  for (const key of ['obverse_image_url', 'reverse_image_url', 'gallery_image_urls']) {
    const raw = data[key]?.trim()
    if (!raw) continue
    // gallery_image_urls is pipe-separated — check each segment
    const urls = key === 'gallery_image_urls' ? raw.split('|').map((u) => u.trim()) : [raw]
    for (const url of urls) {
      if (url && !url.startsWith('http')) {
        errors.push({ field: key, message: `${key} must be a valid URL starting with http (got: ${url.slice(0, 60)}).` })
        break
      }
    }
  }

  // Duplicate title within file (case-insensitive, trimmed)
  const titleKey = normalizeTitleKey(data['title'] ?? '')
  if (titleKey) {
    const matchingRows = duplicateTitleRows.get(titleKey) ?? []
    if (matchingRows.length > 1) {
      const otherRow = matchingRows.find((rowIndex) => rowIndex !== index)
      if (otherRow !== undefined) {
        errors.push({
          field: 'title',
          message: `Duplicate title also used on row ${otherRow + 1}. Titles must be unique in one import.`,
        })
      }
    }
  }

  // Duplicate coin_code within file
  const coinCode = data['coin_code']?.trim()
  if (coinCode) {
    const firstOccurrence = coinCodes.get(coinCode)
    if (firstOccurrence !== undefined && firstOccurrence !== index) {
      errors.push({ field: 'coin_code', message: `Duplicate coin_code "${coinCode}" (first seen at row ${firstOccurrence + 1}).` })
    }
  }

  const releasedDate = data['released_date']?.trim()
  if (!releasedDate) {
    errors.push({ field: 'released_date', message: 'Released date is required.' })
  } else if (!normalizeReleaseDate(releasedDate)) {
    errors.push({
      field: 'released_date',
      message: 'Released date must be YYYY-MM-DD, YYYYMMDD, DD.MM.YYYY, or DD/MM/YYYY.',
    })
  }

  // coin_quality — UNC, BU, Proof, Circulated
  const coinQuality = data['coin_quality']?.trim()
  if (coinQuality && !['unc', 'bu', 'proof', 'circulated'].includes(coinQuality.toLowerCase())) {
    errors.push({ field: 'coin_quality', message: 'Use UNC, BU, Proof, or Circulated.' })
  }

  // boolean flags
  const BOOL_VALUES = ['1', '0', 'true', 'false', 'yes', 'no', 'on', 'off']
  for (const boolField of ['coin_is_published_catalogue', 'coin_is_featured', 'coin_is_app_enabled'] as const) {
    const val = data[boolField]?.trim().toLowerCase()
    if (val && !BOOL_VALUES.includes(val)) {
      errors.push({ field: boolField, message: `${boolField} must be 1/0, true/false, yes/no, or on/off.` })
    }
  }

  // coin_issue_status — scheduled, released, withdrawn, cancelled
  const issueStatus = data['coin_issue_status']?.trim().toLowerCase()
  if (
    issueStatus &&
    !['scheduled', 'released', 'withdrawn', 'cancelled'].includes(issueStatus)
  ) {
    errors.push({
      field: 'coin_issue_status',
      message: 'Issue status must be: scheduled, released, withdrawn, or cancelled.',
    })
  }

  const sourceUrl = data['coin_source_url']?.trim()
  if (sourceUrl && !/^https?:\/\/.+/i.test(sourceUrl)) {
    errors.push({ field: 'coin_source_url', message: 'Source URL must start with http:// or https://.' })
  }

  // coin_record_status — active, hidden, deprecated
  const recordStatus = data['coin_record_status']?.trim().toLowerCase()
  if (recordStatus && !['active', 'hidden', 'deprecated'].includes(recordStatus)) {
    errors.push({ field: 'coin_record_status', message: 'Record status must be: active, hidden, or deprecated.' })
  }

  // description fields — max 5000 chars
  for (const descField of ['coin_obverse_description', 'coin_reverse_description', 'coin_collector_notes'] as const) {
    const val = data[descField]?.trim()
    if (val && val.length > 5000) {
      errors.push({ field: descField, message: `${descField} exceeds 5000 characters (${val.length}).` })
    }
  }

  return errors
}

function validateRows(rows: Record<string, string>[]): ParsedRow[] {
  const coinCodes = new Map<string, number>()
  const duplicateTitleRows = new Map<string, number[]>()

  rows.forEach((row, i) => {
    const code = row['coin_code']?.trim()
    if (code && !coinCodes.has(code)) {
      coinCodes.set(code, i)
    }

    const titleKey = normalizeTitleKey(row['title'] ?? '')
    if (titleKey) {
      const existing = duplicateTitleRows.get(titleKey) ?? []
      existing.push(i)
      duplicateTitleRows.set(titleKey, existing)
    }
  })

  return rows.map((data, i) => ({
    index: i,
    data,
    errors: validateRow(data, i, coinCodes, duplicateTitleRows),
  }))
}

function isDuplicateTitleError(error: RowError): boolean {
  return error.field === 'title' && error.message.startsWith('Duplicate title')
}

function isDuplicateCoinCodeError(error: RowError): boolean {
  return error.field === 'coin_code' && error.message.includes('Duplicate coin_code')
}

function getValidationSummary(rows: ParsedRow[]) {
  const validCount = rows.filter((r) => r.errors.length === 0).length
  const invalidCount = rows.length - validCount
  const duplicateTitleCount = rows.filter((r) => r.errors.some(isDuplicateTitleError)).length
  const duplicateCoinCodeCount = rows.filter((r) => r.errors.some(isDuplicateCoinCodeError)).length
  const hasDuplicateTitles = duplicateTitleCount > 0
  const hasDuplicateCoinCodes = duplicateCoinCodeCount > 0

  return {
    validCount,
    invalidCount,
    duplicateTitleCount,
    duplicateCoinCodeCount,
    hasDuplicateTitles,
    hasDuplicateCoinCodes,
  }
}

type ImportErrorExplanation = {
  title: string
  message: string
}

function explainImportError(rawMessage: string): ImportErrorExplanation {
  const lower = rawMessage.toLowerCase()

  if (rawMessage.includes('Duplicate coin_code') || lower.includes('duplicate coin code')) {
    return {
      title: 'Duplicate coin code',
      message:
        'This coin_code already exists in the catalogue. Coin codes are unique IDs used by the app and user collections. To import this as a separate coin, change the coin_code in the XLSX file.',
    }
  }

  if (lower.includes('coin_quality')) {
    return {
      title: 'Invalid value',
      message:
        'One value has the wrong format or is not allowed. Check the field value in the XLSX file. Allowed values: UNC, BU, Proof, Circulated.',
    }
  }

  if (lower.includes('record_status')) {
    return {
      title: 'Invalid value',
      message:
        'One value has the wrong format or is not allowed. Check the field value in the XLSX file. Allowed values: active, hidden, deprecated.',
    }
  }

  if (lower.includes('missing')) {
    return {
      title: 'Missing required field',
      message: 'One required field is empty. Fill the required column in your XLSX file and import again.',
    }
  }

  if (lower.includes('invalid')) {
    return {
      title: 'Invalid value',
      message: 'One value has the wrong format or is not allowed. Check the field value in the XLSX file.',
    }
  }

  if (lower.includes('image') || lower.includes('download') || lower.includes('sideload')) {
    return {
      title: 'Image download issue',
      message:
        'Coin was created if the row succeeded, but one or more images could not be downloaded. Check the image URL or host permissions.',
    }
  }

  return { title: 'Import error', message: rawMessage }
}

function detectMostCommonFailureReason(messages: string[]): string | null {
  const counts = {
    'Duplicate coin code': 0,
    'Missing required field': 0,
    'Invalid value': 0,
    'Image download issue': 0,
  }

  for (const raw of messages) {
    const { title } = explainImportError(raw)
    if (title in counts) {
      counts[title as keyof typeof counts] += 1
    }
  }

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).find(([, n]) => n > 0)
  return top ? top[0] : null
}

function formatPreviewIssue(err: RowError): { main: string; hint?: string } {
  const main = `${err.field}: ${err.message}`

  if (isDuplicateCoinCodeError(err)) {
    return { main, hint: 'coin_code must be unique inside this XLSX.' }
  }

  if (isDuplicateTitleError(err)) {
    return { main, hint: 'Titles must be unique inside this XLSX to avoid accidental repeated rows.' }
  }

  return { main }
}

// ── Step card component ───────────────────────────────────────────────────────

function StepCard({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-[#F9FAFB] px-5 py-3.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[11px] font-bold text-white">
          {step}
        </span>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({
  onFile,
  file,
  onClear,
  disabled = false,
}: {
  onFile: (file: File) => void
  file: File | null
  onClear: () => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (disabled) return
      const dropped = e.dataTransfer.files[0]
      if (dropped && /\.(csv|xlsx)$/i.test(dropped.name)) {
        onFile(dropped)
      }
    },
    [disabled, onFile],
  )

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 shrink-0 text-teal-500" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-teal-800">{file.name}</p>
            <p className="text-[11px] text-teal-600">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          title="Remove file"
          className="rounded-lg p-1 text-teal-400 transition-colors hover:bg-teal-100 hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { if (!disabled) { e.preventDefault(); setIsDragOver(true) } }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => { if (!disabled) inputRef.current?.click() }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click()
      }}
      className={[
        'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
          : 'cursor-pointer',
        !disabled && (isDragOver
          ? 'border-teal-400 bg-teal-50'
          : 'border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-teal-50/40'),
      ].join(' ')}
    >
      <Upload className={['h-8 w-8', isDragOver ? 'text-teal-400' : 'text-slate-300'].join(' ')} aria-hidden />
      <div>
        <p className="text-sm font-semibold text-slate-700">
          Drag & drop your file here
        </p>
        <p className="mt-0.5 text-xs text-slate-400">or click to browse — CSV or XLSX</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f && !disabled) onFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ── Preview table ─────────────────────────────────────────────────────────────

const PREVIEW_COLS: Array<keyof Record<string, string>> = [
  'title', 'country', 'year', 'denomination', 'coin_type', 'coin_series', 'released_date',
  'coin_designer', 'coin_issue_status', 'coin_code', 'coin_quality', 'coin_record_status', 'coin_is_app_enabled',
]

const PREVIEW_COL_MIN_WIDTH: Record<string, string> = {
  title: 'min-w-[220px]',
  country: 'min-w-[120px]',
  year: 'min-w-[80px]',
  denomination: 'min-w-[120px]',
  coin_type: 'min-w-[140px]',
  coin_series: 'min-w-[160px]',
  coin_designer: 'min-w-[140px]',
  coin_issue_status: 'min-w-[140px]',
  coin_code: 'min-w-[280px]',
  released_date: 'min-w-[120px]',
  coin_quality: 'min-w-[110px]',
  coin_record_status: 'min-w-[140px]',
  coin_is_app_enabled: 'min-w-[120px]',
}

const PREVIEW_TRUNCATE_COLS = new Set(['title', 'coin_code'])

function previewColClass(col: string): string {
  const min = PREVIEW_COL_MIN_WIDTH[col] ?? ''
  const max = PREVIEW_TRUNCATE_COLS.has(col) ? min.replace('min-w-', 'max-w-') : ''
  return [min, max].filter(Boolean).join(' ')
}

function PreviewTable({ rows }: { rows: ParsedRow[] }) {
  const {
    validCount,
    invalidCount,
    duplicateTitleCount,
    duplicateCoinCodeCount,
    hasDuplicateTitles,
    hasDuplicateCoinCodes,
  } = getValidationSummary(rows)

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600" role="status">
        <span className="font-semibold text-teal-700">{validCount} valid</span>
        {' · '}
        <span className={invalidCount > 0 ? 'font-semibold text-red-600' : 'text-slate-500'}>
          {invalidCount} invalid
        </span>
        {duplicateTitleCount > 0 ? (
          <>
            {' · '}
            <span className="font-semibold text-amber-700">
              {duplicateTitleCount} duplicate title{duplicateTitleCount === 1 ? '' : 's'}
            </span>
          </>
        ) : null}
        {duplicateCoinCodeCount > 0 ? (
          <>
            {' · '}
            <span className="font-semibold text-amber-700">
              {duplicateCoinCodeCount} duplicate coin code{duplicateCoinCodeCount === 1 ? '' : 's'}
            </span>
          </>
        ) : null}
      </p>

      {hasDuplicateTitles ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900"
        >
          Duplicate titles found. Titles must be unique inside this XLSX to avoid accidental repeated rows.
        </div>
      ) : null}

      {hasDuplicateCoinCodes ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900"
        >
          Duplicate coin_code values found. coin_code must be unique inside this XLSX and across WordPress.
        </div>
      ) : null}

      <div className="max-w-full overflow-x-auto rounded-xl border border-[rgba(15,23,42,0.08)]">
        <table className="w-max text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-[#F9FAFB]">
              <th className="min-w-[44px] whitespace-nowrap py-2 pl-3 pr-2 font-semibold uppercase tracking-widest text-slate-400">#</th>
              {PREVIEW_COLS.map((col) => (
                <th
                  key={col}
                  className={[
                    'whitespace-nowrap py-2 pr-3 font-semibold uppercase tracking-widest text-slate-400',
                    previewColClass(col),
                  ].join(' ')}
                >
                  {col.replace(/_url$/, '').replace(/_/g, ' ')}
                </th>
              ))}
              <th className="min-w-[260px] py-2 pr-3 font-semibold uppercase tracking-widest text-slate-400">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(15,23,42,0.05)]">
            {rows.map((row) => {
              const hasError = row.errors.length > 0
              return (
                <tr
                  key={row.index}
                  className={hasError ? 'bg-red-50' : 'bg-white hover:bg-slate-50/60'}
                >
                  <td className="min-w-[44px] whitespace-nowrap py-2 pl-3 pr-2 text-slate-400">{row.index + 1}</td>
                  {PREVIEW_COLS.map((col) => {
                    const fieldError = row.errors.find((e) => e.field === col)
                    const value = row.data[col] ?? ''
                    const truncate = PREVIEW_TRUNCATE_COLS.has(col)
                    const cellClass = ['py-2 pr-3 align-top', previewColClass(col)].join(' ')

                    return (
                      <td key={col} className={cellClass}>
                        {fieldError ? (
                          <span
                            className={[
                              'block font-medium text-red-600',
                              truncate ? 'truncate whitespace-nowrap' : 'whitespace-nowrap',
                            ].join(' ')}
                            title={value ? `${value} — ${fieldError.message}` : fieldError.message}
                          >
                            {value || <em className="opacity-60">empty</em>}
                          </span>
                        ) : value ? (
                          <span
                            className={[
                              'block text-slate-700',
                              truncate ? 'truncate whitespace-nowrap' : 'whitespace-nowrap',
                            ].join(' ')}
                            title={value}
                          >
                            {value}
                          </span>
                        ) : (
                          <span className="whitespace-nowrap text-slate-300">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="min-w-[260px] max-w-[360px] py-2 pr-3 align-top">
                    {row.errors.length > 0 ? (
                      <ul className="space-y-0.5">
                        {row.errors.map((err, i) => {
                          const issue = formatPreviewIssue(err)
                          return (
                            <li key={i} className="break-words text-red-600">
                              {issue.main}
                              {issue.hint ? (
                                <span className="mt-0.5 block text-[11px] text-red-500">{issue.hint}</span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <span className="text-teal-500">✓</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Import result summary ─────────────────────────────────────────────────────

function ImageFlag({ ok, label }: { ok: boolean | undefined; label: string }) {
  if (ok === undefined) return <span className="text-slate-300" title={label}>—</span>
  return ok
    ? <span className="font-semibold text-teal-600" title={`${label}: imported`}>✓</span>
    : <span className="font-semibold text-red-500" title={`${label}: not imported`}>✗</span>
}

type ImportRowOutcome = {
  isFailed: boolean
  isCreated: boolean
  statusLabel: 'Failed' | 'Created' | 'Unknown'
}

function resolveImportRowOutcome(row: ImportCoinRowResult): ImportRowOutcome {
  const statusLower = row.status != null ? String(row.status).toLowerCase() : ''
  const hasErrors = (row.errors?.length ?? 0) > 0
  const hasMessage = Boolean(row.message?.trim())
  const hasSubmissionId = row.submission_id != null

  const isFailed =
    statusLower === 'failed' ||
    row.success === false ||
    (hasMessage && !hasSubmissionId) ||
    hasErrors

  if (isFailed) {
    return { isFailed: true, isCreated: false, statusLabel: 'Failed' }
  }

  const isCreated =
    statusLower === 'created' ||
    row.success === true ||
    hasSubmissionId

  if (isCreated) {
    return { isFailed: false, isCreated: true, statusLabel: 'Created' }
  }

  return { isFailed: false, isCreated: false, statusLabel: 'Unknown' }
}

function ImportStatusBadge({ label }: { label: ImportRowOutcome['statusLabel'] }) {
  if (label === 'Failed') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">
        Failed
      </span>
    )
  }

  if (label === 'Created') {
    return (
      <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-200">
        Created
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
      Unknown
    </span>
  )
}

function ImportResultCard({
  result,
  parsedRows,
  onReset,
}: {
  result: ImportAdminCoinsResponse
  parsedRows: ParsedRow[]
  onReset: () => void
}) {
  const rows = result.results ?? []
  const validParsedRows = parsedRows.filter((row) => row.errors.length === 0)

  const skippedCount = parsedRows.filter((r) => r.errors.length > 0).length
  const rowsWithImageIssues = rows.filter((r) => {
    const outcome = resolveImportRowOutcome(r)
    return outcome.isCreated && (
      r.obverse_imported === false ||
      r.reverse_imported === false ||
      (r.image_errors && r.image_errors.length > 0)
    )
  })
  const imageWarningCount = rowsWithImageIssues.length
  const hasImageWarnings = imageWarningCount > 0
  const hasImageData = rows.some(
    (r) => r.obverse_imported !== undefined || r.reverse_imported !== undefined || r.gallery_imported !== undefined,
  )
  const failedRows = rows.filter((r) => resolveImportRowOutcome(r).isFailed)
  const resolvedFailedCount = failedRows.length
  const duplicateBlockedCount = result.summary.duplicate_blocked ?? 0
  const showStatusMismatchWarning = result.summary.failed > 0 && resolvedFailedCount === 0
  const mostCommonFailureReason = detectMostCommonFailureReason(
    failedRows.map((r) => r.message ?? r.errors?.join(' ') ?? '').filter(Boolean),
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 bg-[#F9FAFB] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-800">Import complete</h2>
      </div>
      <div className="space-y-4 px-5 py-5">

        <p className="text-sm text-slate-700" role="status">
          Import finished:{' '}
          <span className="font-semibold text-teal-700">{result.summary.created} created</span>
          {' · '}
          <span className={result.summary.failed > 0 ? 'font-semibold text-red-600' : 'text-slate-600'}>
            {result.summary.failed} failed
          </span>
          {duplicateBlockedCount > 0 ? (
            <>
              {' · '}
              <span className="font-semibold text-red-700">
                {duplicateBlockedCount} duplicate blocked
              </span>
            </>
          ) : null}
          {skippedCount > 0 ? (
            <>
              {' · '}
              <span className="font-semibold text-slate-600">{skippedCount} skipped before import</span>
            </>
          ) : null}
          .
          {imageWarningCount > 0 ? (
            <>
              {' '}
              <span className="font-semibold text-amber-700">
                {imageWarningCount} row{imageWarningCount === 1 ? '' : 's'} with image warnings.
              </span>
            </>
          ) : null}
        </p>

        {result.summary.failed > 0 ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <p className="font-semibold text-red-800">Some rows were not imported</p>
            <p className="mt-1 text-red-700">
              {result.summary.created} created · {result.summary.failed} failed
              {skippedCount > 0 ? ` · ${skippedCount} skipped before import` : ''}
            </p>
            {mostCommonFailureReason ? (
              <p className="mt-1 text-xs text-red-600">
                Most common reason: {mostCommonFailureReason}
              </p>
            ) : null}
          </div>
        ) : null}

        {showStatusMismatchWarning ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
          >
            Import summary reports failed rows, but the row details did not include a failed status.
          </div>
        ) : null}

        {/* Summary tiles */}
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{result.summary.created}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-teal-500">Created</p>
          </div>
          {result.summary.failed > 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-red-500">{result.summary.failed}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-red-400">Failed</p>
            </div>
          ) : null}
          {duplicateBlockedCount > 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-red-600">{duplicateBlockedCount}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-red-500">
                Duplicate blocked
              </p>
            </div>
          ) : null}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-slate-600">{result.summary.total}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Total sent</p>
          </div>
        </div>

        {result.batch_id ? (
          <p className="text-[11px] text-slate-400">
            Batch ID: <span className="font-mono">{result.batch_id}</span>
          </p>
        ) : null}

        {/* Image warning banner */}
        {hasImageWarnings ? (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            <div>
              <p className="font-semibold">
                {imageWarningCount} row{imageWarningCount === 1 ? '' : 's'} with image import issues
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Coin was created but one or more images could not be downloaded. Check the image URL or host permissions. Review the table below.
              </p>
            </div>
          </div>
        ) : null}

        {/* Per-row results table */}
        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[rgba(15,23,42,0.07)]">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-[#F9FAFB]">
                  <th className="py-2 pl-3 pr-2 font-semibold uppercase tracking-widest text-slate-400">#</th>
                  <th className="py-2 pr-3 font-semibold uppercase tracking-widest text-slate-400">Title</th>
                  <th className="min-w-[280px] py-2 pr-3 font-semibold uppercase tracking-widest text-slate-400">Coin code</th>
                  <th className="py-2 pr-3 font-semibold uppercase tracking-widest text-slate-400">Status</th>
                  {hasImageData ? (
                    <>
                      <th className="py-2 pr-3 font-semibold uppercase tracking-widest text-slate-400">Obverse</th>
                      <th className="py-2 pr-3 font-semibold uppercase tracking-widest text-slate-400">Reverse</th>
                      <th className="py-2 pr-3 font-semibold uppercase tracking-widest text-slate-400">Gallery</th>
                    </>
                  ) : null}
                  <th className="py-2 pr-3 font-semibold uppercase tracking-widest text-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(15,23,42,0.05)]">
                {rows.map((r, rowIdx) => {
                  const original =
                    validParsedRows[r.row_index] ??
                    parsedRows.find((p) => p.index === r.row_index)
                  const displayRowNumber = (original?.index ?? r.row_index) + 1
                  const title = original?.data['title'] || `Row ${displayRowNumber}`
                  const outcome = resolveImportRowOutcome(r)
                  const hasImgErr = (r.image_errors?.length ?? 0) > 0
                  const rowHasIssue =
                    outcome.isFailed ||
                    outcome.statusLabel === 'Unknown' ||
                    (outcome.isCreated && (
                      r.obverse_imported === false ||
                      r.reverse_imported === false ||
                      hasImgErr
                    ))

                  const importCoinCode = r.coin_code?.trim() || r.unique_code?.trim() || ''

                  return (
                    <tr
                      key={`${r.row_index}-${rowIdx}`}
                      className={rowHasIssue ? 'bg-amber-50/60' : 'bg-white hover:bg-slate-50/50'}
                    >
                      <td className="py-2 pl-3 pr-2 text-slate-400">{displayRowNumber}</td>
                      <td className="max-w-[200px] py-2 pr-3">
                        <span className="truncate font-medium text-slate-700" title={title}>
                          {title.length > 40 ? `${title.slice(0, 40)}…` : title}
                        </span>
                        {r.submission_id ? (
                          <span className="ml-1.5 text-slate-400">#{r.submission_id}</span>
                        ) : null}
                      </td>
                      <td className="min-w-[280px] max-w-[360px] py-2 pr-3">
                        {importCoinCode ? (
                          <span className="block truncate font-mono text-slate-700" title={importCoinCode}>
                            {importCoinCode}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <ImportStatusBadge label={outcome.statusLabel} />
                      </td>
                      {hasImageData ? (
                        <>
                          <td className="py-2 pr-3 text-center">
                            <ImageFlag ok={r.obverse_imported} label="Obverse" />
                          </td>
                          <td className="py-2 pr-3 text-center">
                            <ImageFlag ok={r.reverse_imported} label="Reverse" />
                          </td>
                          <td className="py-2 pr-3">
                            {r.gallery_imported !== undefined ? (
                              <span className={r.gallery_imported > 0 ? 'text-teal-600' : 'text-slate-400'}>
                                {r.gallery_imported}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </>
                      ) : null}
                      <td className="min-w-[260px] max-w-[360px] py-2 pr-3 align-top">
                        {outcome.isFailed ? (() => {
                          const rawMessage = r.message ?? r.errors?.join(' ') ?? ''
                          const explained = explainImportError(rawMessage || 'Import failed.')
                          return (
                            <div className="space-y-1">
                              <p className="font-semibold text-red-700">{explained.title}</p>
                              <p className="break-words text-red-600">{explained.message}</p>
                              {rawMessage && explained.message !== rawMessage ? (
                                <p className="text-[11px] text-slate-500">Details: {rawMessage}</p>
                              ) : null}
                              {r.duplicate?.post_id ? (
                                <p className="text-[11px] text-slate-600">
                                  Existing coin #{r.duplicate.post_id}
                                  {r.duplicate.title ? `: ${r.duplicate.title}` : ''}
                                  {r.duplicate.reason
                                    ? ` (${r.duplicate.reason.replace(/_/g, ' ')})`
                                    : ''}
                                </p>
                              ) : null}
                            </div>
                          )
                        })() : null}
                        {outcome.statusLabel === 'Unknown' ? (
                          <p className="text-amber-700">
                            Backend did not return a clear row status. Check the import summary or WordPress admin queue.
                          </p>
                        ) : null}
                        {outcome.isCreated && hasImgErr ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-amber-800">Image download issue</p>
                            <p className="text-amber-700">
                              Coin was created, but one or more images could not be downloaded. Check the image URL or host permissions.
                            </p>
                            <ul className="space-y-0.5">
                              {r.image_errors!.map((e, i) => (
                                <li key={i} className="text-[11px] text-amber-700">{e}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {outcome.isCreated && !hasImgErr && r.obverse_imported === false ? (
                          <div className="space-y-0.5">
                            <p className="font-semibold text-amber-800">Image download issue</p>
                            <p className="text-amber-700">Obverse image could not be downloaded.</p>
                          </div>
                        ) : null}
                        {outcome.isCreated && !hasImgErr && r.reverse_imported === false ? (
                          <div className="space-y-0.5">
                            <p className="font-semibold text-amber-800">Image download issue</p>
                            <p className="text-amber-700">Reverse image could not be downloaded.</p>
                          </div>
                        ) : null}
                        {!rowHasIssue ? <span className="text-slate-300">—</span> : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/admin/submissions"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View admin queue
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Import another file
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminImportPage() {
  const { token } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [missingColumns, setMissingColumns] = useState<string[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportAdminCoinsResponse | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleFile(selected: File) {
    setFile(selected)
    setParseError(null)
    setMissingColumns([])
    setParsedRows(null)
    setImportError(null)
    setImportResult(null)
    setShowConfirm(false)

    const isXlsx = /\.(xlsx|xls)$/i.test(selected.name)
    setIsParsing(true)

    const reader = new FileReader()

    reader.onerror = () => {
      setParseError('Failed to read the file.')
      setIsParsing(false)
    }

    if (isXlsx) {
      reader.onload = (e) => {
        void (async () => {
          try {
            const XLSX = await loadXlsxModule()
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const sheetName = wb.SheetNames[0]
          if (!sheetName) {
            setParseError('XLSX file has no sheets.')
            return
          }
          const ws = wb.Sheets[sheetName]
          const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
            defval: '',
            raw: false,
          })
          if (rawRows.length === 0) {
            setParseError('The XLSX sheet appears to be empty or has no data rows.')
            return
          }
          const normalised = rawRows.map(normalizeImportRow)
          const headers = Object.keys(normalised[0] ?? {})
          const missing = REQUIRED_KEYS.filter((k) => !headers.includes(k))
          if (missing.length > 0) setMissingColumns(missing)
          setParsedRows(validateRows(normalised))
          } catch {
            setParseError('Could not parse the XLSX file. Make sure it is a valid Excel workbook.')
          } finally {
            setIsParsing(false)
          }
        })()
      }
      reader.readAsArrayBuffer(selected)
    } else {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          if (!text) {
            setParseError('Could not read the file.')
            return
          }
          const { headers, rows } = parseCsvText(text)
          if (headers.length === 0) {
            setParseError('The CSV file appears to be empty or has no header row.')
            return
          }
          const missing = REQUIRED_KEYS.filter((k) => !headers.includes(k))
          if (missing.length > 0) setMissingColumns(missing)
          setParsedRows(validateRows(rows))
        } finally {
          setIsParsing(false)
        }
      }
      reader.readAsText(selected)
    }
  }

  function handleClear() {
    setFile(null)
    setParsedRows(null)
    setParseError(null)
    setMissingColumns([])
    setIsParsing(false)
    setImportError(null)
    setImportResult(null)
    setShowConfirm(false)
  }

  async function handleImport() {
    if (isImporting) return
    if (!parsedRows) return
    if (!token) {
      setImportError('Admin session expired or not authorized. Please log out and log in again.')
      return
    }

    const validRows: ImportCoinRow[] = parsedRows
      .filter((r) => r.errors.length === 0)
      .map((r) => normalizeImportRow(r.data))

    if (validRows.length === 0) return

    if (import.meta.env.DEV && validRows[0]) {
      console.info('[import] first valid row payload', validRows[0])
      const imageKeys = ['obverse_image_url', 'reverse_image_url', 'gallery_image_urls']
      const missing = imageKeys.filter((k) => !validRows[0][k])
      if (missing.length) {
        console.warn('[import] image keys missing from first row:', missing)
      }
    }

    setIsImporting(true)
    setImportError(null)
    setShowConfirm(false)

    try {
      const result = await importAdminCoins(validRows, token)
      setImportResult(result)
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : 'Import failed. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  const validationSummary = parsedRows ? getValidationSummary(parsedRows) : null
  const validRowCount = validationSummary?.validCount ?? 0
  const hasValidRows = validRowCount > 0
  const hasDuplicateTitles = validationSummary?.hasDuplicateTitles ?? false
  const hasDuplicateCoinCodes = validationSummary?.hasDuplicateCoinCodes ?? false
  const totalRows = parsedRows?.length ?? 0
  const canImport = hasValidRows && !hasDuplicateTitles && !hasDuplicateCoinCodes && !parseError && !isParsing
  const isXlsxFile = file ? /\.(xlsx|xls)$/i.test(file.name) : false

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 pb-12">

      {/* ── Header ── */}
      <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)] sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-500">
          Administration
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-slate-800 sm:text-3xl">
          Bulk import coins
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Upload CSV files to create coin drafts quickly. Download the template, fill in your data, then upload.
        </p>
      </div>

      {/* ── Step 1: Download template ── */}
      <StepCard step={1} title="Download template">
        <p className="mb-1.5 text-sm text-slate-500">
          Use the official template to ensure all fields are in the correct format.
        </p>
        <p className="mb-4 text-xs text-slate-400">
          Only core identity fields are required. Images can be added later. Obverse image is recommended. Reverse image is optional.
          Leave coin_code empty to auto-generate it. Only fill it when you need a manual override.
        </p>

        <div className="mb-5 overflow-hidden rounded-xl border border-[rgba(15,23,42,0.06)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="py-2 pl-3 pr-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Field</th>
                <th className="py-2 pr-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Status</th>
                <th className="py-2 pr-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(15,23,42,0.05)]">
              {TEMPLATE_FIELDS.map((field) => (
                <tr key={field.key} className="hover:bg-slate-50/60">
                  <td className="py-1.5 pl-3 pr-2 font-mono text-slate-700">{field.key}</td>
                  <td className="py-1.5 pr-2">
                    {field.required ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">
                        Required
                      </span>
                    ) : field.recommended ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                        Recommended
                      </span>
                    ) : (
                      <span className="text-slate-400">Optional</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-500">{field.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {/* XLSX buttons grouped */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void buildXlsxTemplate()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden />
                Download Standard XLSX template
              </button>
              <button
                type="button"
                onClick={() => void buildXlsxGermanTemplate()}
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 shadow-sm transition-colors hover:bg-teal-100"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden />
                Download German-only XLSX template
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Use the German-only template when importing German coins with mint marks.
            </p>
          </div>

          {/* CSV fallback */}
          <button
            type="button"
            onClick={() => downloadCsv(buildCsvTemplate(), 'coinarchive-import-template.csv')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download CSV template
          </button>
        </div>
      </StepCard>

      {/* ── Step 2: Upload ── */}
      <StepCard step={2} title="Upload CSV file">
        <p className="mb-4 text-sm text-slate-500">
          Upload your completed CSV or XLSX file. The first sheet will be parsed automatically.
        </p>
        <p className="mb-4 text-xs text-slate-400">
          Rows are cleaned for spacing, casing, and URL tracking parameters before validation.
        </p>

        <UploadZone onFile={handleFile} file={file} onClear={handleClear} disabled={isParsing} />

        {parseError ? (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {parseError}
          </div>
        ) : null}

        {missingColumns.length > 0 ? (
          <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Missing required columns in file:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs font-mono">
              {missingColumns.map((col) => (
                <li key={col}>{col}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">Make sure your CSV headers match the template exactly.</p>
          </div>
        ) : null}

        {isParsing ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-600" role="status" aria-live="polite">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-teal-400" aria-hidden />
            {isXlsxFile ? 'Parsing XLSX file…' : 'Parsing CSV file…'}
          </p>
        ) : null}
      </StepCard>

      {/* ── Step 3: Preview & validate ── */}
      {parsedRows !== null && !parseError ? (
        <StepCard step={3} title="Preview & validate">
          {parsedRows.length === 0 ? (
            <p className="text-sm text-slate-400">No data rows found. Check your CSV file.</p>
          ) : (
            <PreviewTable rows={parsedRows} />
          )}
        </StepCard>
      ) : null}

      {/* ── Step 4: Import ── */}
      {!importResult ? (
        <StepCard step={4} title="Import as drafts">
          <p className="text-sm text-slate-500">
            Only valid rows will be sent. Invalid rows are skipped. Coin drafts will be created in the admin queue.
          </p>

          {parsedRows !== null && !parseError ? (
            <p className="mt-2 text-sm">
              <span className="font-semibold text-teal-700">{validRowCount}</span>
              {' '}of{' '}
              <span className="font-semibold text-slate-700">{totalRows}</span>
              {' '}rows ready to import.
              {totalRows - validRowCount > 0 ? (
                <span className="ml-1.5 text-red-500">
                  {totalRows - validRowCount} row{totalRows - validRowCount === 1 ? '' : 's'} with errors will be skipped.
                </span>
              ) : null}
            </p>
          ) : null}

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span>
              Leave coin_code empty to auto-generate it. Only fill it when you need a manual override.
            </span>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Image URLs are downloaded during import. Failed image downloads are reported per row but do not block coin creation.
          </div>

          {importError ? (
            <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {importError}
            </div>
          ) : null}

          {hasDuplicateTitles ? (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              Duplicate titles must be resolved before importing. Titles must be unique inside this XLSX to avoid accidental repeated rows.
            </div>
          ) : null}

          {hasDuplicateCoinCodes ? (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              Duplicate coin_code values must be resolved before importing. coin_code must be unique inside this XLSX and across WordPress.
            </div>
          ) : null}

          {isImporting ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-600" role="status" aria-live="polite">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-teal-400" aria-hidden />
              Importing {validRowCount} valid row{validRowCount === 1 ? '' : 's'}…
            </p>
          ) : showConfirm ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                Import {validRowCount} valid row{validRowCount === 1 ? '' : 's'} as draft submissions?
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Invalid rows will not be sent. This action cannot be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => void handleImport()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Confirm import
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => setShowConfirm(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <button
                type="button"
                disabled={!canImport || isImporting}
                onClick={() => setShowConfirm(true)}
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors',
                  canImport && !isImporting
                    ? 'bg-teal-500 text-white hover:bg-teal-600'
                    : 'cursor-not-allowed bg-slate-200 text-slate-400',
                ].join(' ')}
              >
                <Upload className="h-4 w-4" aria-hidden />
                {hasValidRows
                  ? `Import ${validRowCount} valid row${validRowCount === 1 ? '' : 's'} as draft${validRowCount === 1 ? '' : 's'}`
                  : 'Import valid rows as drafts'}
              </button>
            </div>
          )}
        </StepCard>
      ) : null}

      {/* ── Import result ── */}
      {importResult ? (
        <ImportResultCard
          result={importResult}
          parsedRows={parsedRows ?? []}
          onReset={handleClear}
        />
      ) : null}
    </div>
  )
}
