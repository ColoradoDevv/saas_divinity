import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { MemberQRCode } from '@/modules/members/components/MemberQRCode';
import {
  md3BodyMediumClass,
  md3HeadlineMediumClass,
  md3OverlineClass,
  md3SurfaceClass,
} from '@/shared/ui/material';

export const PortalQRPage = () => {
  const member = useMemberPortalAuthStore((s) => s.member);

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Portal del miembro</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Mi código QR</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Muéstralo en recepción para tu check-in.
        </p>
      </section>

      <section className={`${md3SurfaceClass} flex flex-col items-center gap-4 p-8`}>
        {member?.member_code ? (
          <>
            <MemberQRCode value={member.member_code} size={220} />
            <p className="text-lg font-semibold tracking-wide text-on-surface">{member.member_code}</p>
          </>
        ) : (
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
            Todavía no tienes un código asignado.
          </p>
        )}
      </section>
    </div>
  );
};
