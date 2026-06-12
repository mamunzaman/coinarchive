export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

export type PasswordCriteria = {
  minLength: boolean
  uppercase: boolean
  lowercase: boolean
  number: boolean
  special: boolean
}

export const PASSWORD_CRITERIA_LABELS: Array<{ key: keyof PasswordCriteria; label: string }> = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'uppercase', label: 'Uppercase letter' },
  { key: 'lowercase', label: 'Lowercase letter' },
  { key: 'number', label: 'Number' },
  { key: 'special', label: 'Special character' },
]

export function getPasswordCriteria(password: string): PasswordCriteria {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

export function getPasswordStrength(password: string): {
  strength: PasswordStrengthLevel
  criteria: PasswordCriteria
  metCount: number
} {
  const criteria = getPasswordCriteria(password)
  const metCount = Object.values(criteria).filter(Boolean).length

  if (!password) {
    return { strength: 'weak', criteria, metCount: 0 }
  }

  if (metCount <= 1) {
    return { strength: 'weak', criteria, metCount }
  }

  if (metCount === 2) {
    return { strength: 'fair', criteria, metCount }
  }

  if (metCount <= 4) {
    return { strength: 'good', criteria, metCount }
  }

  return { strength: 'strong', criteria, metCount }
}

export function getPasswordStrengthLabel(strength: PasswordStrengthLevel): string {
  switch (strength) {
    case 'weak':
      return 'Weak'
    case 'fair':
      return 'Fair'
    case 'good':
      return 'Good'
    case 'strong':
      return 'Strong'
  }
}

export function getPasswordStrengthPercent(metCount: number): number {
  return Math.round((metCount / PASSWORD_CRITERIA_LABELS.length) * 100)
}
