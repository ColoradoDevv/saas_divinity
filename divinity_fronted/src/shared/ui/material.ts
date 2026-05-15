export const md3PageClass = 'mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8';

export const md3SurfaceClass =
  'rounded-[28px] border border-outline-variant bg-surface-container-low text-on-surface shadow-[0_1px_2px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]';

export const md3SurfaceHighClass =
  'rounded-[28px] border border-outline-variant/80 bg-surface-container text-on-surface shadow-[0_1px_2px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)]';

export const md3CardClass =
  'rounded-[16px] border border-outline-variant/70 bg-surface-container-high text-on-surface';

export const md3CardRaisedClass =
  'rounded-[16px] border border-outline-variant/60 bg-surface-container-highest text-on-surface shadow-[0_1px_3px_rgba(0,0,0,0.12)]';

export const md3OverlineClass =
  'text-[0.6875rem] leading-4 font-medium tracking-[0.03125rem] text-primary uppercase';

export const md3HeadlineLargeClass = 'text-[2rem] leading-10 font-normal tracking-normal';
export const md3HeadlineMediumClass = 'text-[1.75rem] leading-9 font-normal tracking-normal';
export const md3HeadlineSmallClass = 'text-[1.5rem] leading-8 font-normal tracking-normal';
export const md3TitleLargeClass = 'text-[1.375rem] leading-7 font-medium tracking-normal';
export const md3TitleMediumClass = 'text-base leading-6 font-medium tracking-[0.009rem]';
export const md3BodyLargeClass = 'text-base leading-6 font-normal tracking-[0.031rem]';
export const md3BodyMediumClass = 'text-sm leading-5 font-normal tracking-[0.016rem]';
export const md3BodySmallClass = 'text-xs leading-4 font-normal tracking-[0.025rem]';
export const md3LabelLargeClass = 'text-sm leading-5 font-medium tracking-[0.006rem]';
export const md3LabelMediumClass = 'text-xs leading-4 font-medium tracking-[0.031rem]';

export const md3FilledButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium tracking-[0.006rem] cursor-pointer text-on-primary shadow-[0_1px_2px_rgba(0,0,0,0.3),0_1px_3px_1px_rgba(0,0,0,0.15)] transition hover:bg-primary/95 hover:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_4px_8px_3px_rgba(0,0,0,0.15)] disabled:cursor-not-allowed disabled:bg-on-surface/12 disabled:text-on-surface/38';

export const md3TonalButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 cursor-pointer rounded-full bg-secondary-container px-6 text-sm font-medium tracking-[0.006rem] text-on-secondary-container transition hover:shadow-[0_1px_3px_rgba(0,0,0,0.18)]';

export const md3OutlinedButtonClass =
  'inline-flex h-10 items-center justify-center cursor-pointer gap-2 rounded-full border border-outline px-6 text-sm font-medium tracking-[0.006rem] text-primary transition hover:bg-primary/8';

export const md3TextButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 cursor-pointer rounded-full px-4 text-sm font-medium tracking-[0.006rem] text-primary transition hover:bg-primary/8';

export const md3DestructiveButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-error px-6 text-sm font-medium tracking-[0.006rem] text-on-error transition hover:bg-error/95';

export const md3InputLabelClass =
  'mb-1 block pl-4 text-xs leading-4 font-medium tracking-[0.031rem] text-on-surface-variant';

export const md3TextFieldClass =
  'h-14 w-full rounded-[4px] border border-outline bg-surface-container-highest px-4 text-base leading-6 text-on-surface outline-none transition placeholder:text-on-surface-variant focus:border-primary focus:ring-[3px] focus:ring-primary/20';

export const md3SupportTextClass =
  'mt-1 pl-4 text-xs leading-4 tracking-[0.025rem] text-on-surface-variant';

export const md3ErrorBannerClass =
  'rounded-[16px] border border-error/20 bg-error-container px-4 py-3 text-sm leading-5 tracking-[0.016rem] text-on-error-container';

export const md3SuccessBannerClass =
  'rounded-[16px] border border-primary/15 bg-primary-container px-4 py-3 text-sm leading-5 tracking-[0.016rem] text-on-primary-container';

export const md3InfoBannerClass =
  'rounded-[16px] border border-secondary/15 bg-secondary-container px-4 py-3 text-sm leading-5 tracking-[0.016rem] text-on-secondary-container';

export const md3NavItemClass = (isActive: boolean) =>
  [
    'flex min-h-14 items-center rounded-full px-4 transition',
    isActive
      ? 'bg-secondary-container text-on-secondary-container'
      : 'text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface',
  ].join(' ');
