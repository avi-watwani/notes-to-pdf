/** Shared auth form styles (reference: borderless fields, navy pill CTA) */
export const authInputClass =
  'w-full rounded-xl border-0 bg-neutral-100 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-none ring-0 transition focus:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#10214d]/25 disabled:opacity-50';

/** Tighter vertical padding for dense forms (e.g. signup step 2) */
export const authInputCompactClass =
  'w-full rounded-xl border-0 bg-neutral-100 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-none ring-0 transition focus:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#10214d]/25 disabled:opacity-50';

export const authPrimaryButtonClass =
  'w-full rounded-full bg-[#10214d] py-3.5 text-sm font-medium text-white transition hover:bg-[#0c1a3d] focus:outline-none focus:ring-2 focus:ring-[#10214d]/35 focus:ring-offset-2 disabled:opacity-50';

export const authLinkMutedClass = 'text-sm text-neutral-500 hover:text-neutral-700 hover:underline';

export const authLinkAccentClass = 'font-medium text-[#10214d] hover:underline';

/** Journal / calendar toolbars — rounded pills, consistent with auth CTA */
export const appButtonPrimary =
  'inline-flex items-center justify-center rounded-full bg-[#10214d] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0c1a3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10214d]/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 sm:px-6';

export const appButtonSecondary =
  'inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10214d]/20 focus-visible:ring-offset-2 sm:px-6';

export const appButtonGhost =
  'inline-flex items-center justify-center rounded-full bg-neutral-100 px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10214d]/15 focus-visible:ring-offset-2 sm:px-6';

export const appButtonDanger =
  'inline-flex items-center justify-center rounded-full border border-red-200/90 bg-white px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-2 sm:px-6';

/** Segmented month control (calendar) */
export const appSegmentGroup =
  'inline-flex flex-wrap items-center justify-center gap-0.5 rounded-full border border-neutral-200/80 bg-white p-1 shadow-sm';

export const appSegmentButton =
  'rounded-full px-3.5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10214d]/25 focus-visible:ring-offset-0 sm:px-5';

export const appSegmentAccent =
  'rounded-full bg-neutral-100 px-3.5 py-2 text-sm font-semibold text-[#10214d] transition hover:bg-neutral-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10214d]/25 focus-visible:ring-offset-0 sm:px-5';
