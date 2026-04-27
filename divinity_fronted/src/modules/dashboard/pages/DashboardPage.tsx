import { useAuthStore } from '@/app/store/auth';
import { useAuthMe } from '@/modules/auth/hooks/useAuthMe';

export const DashboardPage = () => {
  const persistedUser = useAuthStore((state) => state.user);
  const { data: freshUser, isLoading } = useAuthMe();
  const user = freshUser ?? persistedUser;

  return (
    <>
      <section className="panel">
        <span className="eyebrow">Authentication flow</span>
        <h1>JWT session established</h1>
        <p>
          This page is protected by the router guard and reads the authenticated Django user from
          <code>/auth/me</code>.
        </p>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>Status</span>
          <strong>{isLoading ? 'Syncing identity...' : 'Authenticated'}</strong>
        </article>
        <article className="metric-card">
          <span>Username</span>
          <strong>{user?.username ?? 'Unavailable'}</strong>
        </article>
        <article className="metric-card">
          <span>Privileges</span>
          <strong>{user?.is_staff ? 'Staff account' : 'Standard account'}</strong>
        </article>
      </section>

      <section className="panel">
        <span className="eyebrow">Current user payload</span>
        <div className="details-grid">
          <div className="detail-item">
            <span>ID</span>
            <strong>{user?.id ?? '-'}</strong>
          </div>
          <div className="detail-item">
            <span>Email</span>
            <strong>{user?.email || 'No email set'}</strong>
          </div>
          <div className="detail-item">
            <span>First name</span>
            <strong>{user?.first_name || 'Not provided'}</strong>
          </div>
          <div className="detail-item">
            <span>Last name</span>
            <strong>{user?.last_name || 'Not provided'}</strong>
          </div>
        </div>
      </section>
    </>
  );
};
