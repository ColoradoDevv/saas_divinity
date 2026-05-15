import { useAuthStore } from '@/app/store/auth';
import { useAuthMe } from '@/modules/auth/hooks/useAuthMe';
import {
  md3BodyLargeClass,
  md3BodyMediumClass,
  md3CardClass,
  md3CardRaisedClass,
  md3HeadlineSmallClass,
  md3LabelLargeClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';

export const DashboardPage = () => {
  const persistedUser = useAuthStore((state) => state.user);
  const { data: freshUser, isLoading } = useAuthMe();
  const user = freshUser ?? persistedUser;
  const metrics = [
    {
      label: 'Status',
      value: isLoading ? 'Syncing identity...' : 'Authenticated',
    },
    {
      label: 'Username',
      value: user?.username ?? 'Unavailable',
    },
    {
      label: 'Privileges',
      value: user?.is_staff ? 'Staff account' : 'Standard account',
    },
  ];
  const details = [
    { label: 'ID', value: user?.id ?? '-' },
    { label: 'Email', value: user?.email || 'No email set' },
    { label: 'First name', value: user?.first_name || 'Not provided' },
    { label: 'Last name', value: user?.last_name || 'Not provided' },
  ];

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Authentication flow</span>
        <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>JWT session established</h1>
        <p className={`mt-3 max-w-3xl text-on-surface-variant ${md3BodyLargeClass}`}>
          This page is protected by the router guard and reads the authenticated Django user from
          <code className="mx-1 rounded-full bg-primary-container px-2 py-1 text-on-primary-container">
            /auth/me
          </code>
          .
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className={`${md3CardRaisedClass} p-5`}>
            <span className={`text-on-surface-variant ${md3LabelLargeClass}`}>{metric.label}</span>
            <strong className={`mt-3 block ${md3HeadlineSmallClass}`}>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Current user payload</span>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className={`${md3CardClass} p-5`}>
              <span className={`block text-on-surface-variant ${md3LabelLargeClass}`}>
                {detail.label}
              </span>
              <strong className={`mt-2 block ${md3TitleMediumClass}`}>{detail.value}</strong>
            </div>
          ))}
        </div>

        <div
          className={`mt-6 rounded-[16px] bg-surface-container-high px-5 py-4 text-on-surface-variant ${md3BodyMediumClass}`}
        >
          {isLoading
            ? 'The latest identity payload is synchronizing.'
            : 'All user attributes shown here are coming from the authenticated backend session.'}
        </div>
      </section>
    </div>
  );
};
