export function isApprovedContributorStatus(status?: string): boolean {
  return status === 'approved'
}

export function isPendingApprovalContributorStatus(status?: string): boolean {
  return status === 'pending' || status === 'pending_approval'
}

export function isRejectedContributorStatus(status?: string): boolean {
  return status === 'rejected'
}
