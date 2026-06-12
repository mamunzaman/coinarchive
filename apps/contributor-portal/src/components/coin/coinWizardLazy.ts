import { lazy } from 'react'

export const LazyCoinFormFields = lazy(() =>
  import('./CoinFormFields').then((module) => ({ default: module.CoinFormFields })),
)

export const LazyReviewSubmissionStep = lazy(() =>
  import('./ReviewSubmissionStep').then((module) => ({ default: module.ReviewSubmissionStep })),
)
