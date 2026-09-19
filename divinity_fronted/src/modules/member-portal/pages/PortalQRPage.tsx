import { useMemberPortalAuthStore } from '@/app/store/memberPortalAuth';
import { MemberQRCode } from '@/modules/members/components/MemberQRCode';
import { md3BodyMediumClass, md3HeadlineMediumClass } from '@/shared/ui/material';

export const PortalQRPage = () => {
  const member = useMemberPortalAuthStore((s) => s.member);

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className={md3HeadlineMediumClass}>Mi código QR</h1>
        <p className={`mt-1 text-on-surface-variant ${md3BodyMediumClass}`}>
          Muéstralo en recepción para tu check-in.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-primary via-primary to-secondary p-6 text-on-primary shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/10" />

        <div className="relative text-center">
          <p className="text-sm font-medium text-on-primary/80">{member?.organization_name}</p>
          <p className="mt-0.5 text-lg font-semibold">{member?.full_name}</p>
        </div>

        {member?.member_code ? (
          <div className="relative mt-5 flex flex-col items-center gap-4">
            <div className="rounded-[20px] bg-white p-4 shadow-inner">
              <MemberQRCode value={member.member_code} size={220} />
            </div>
            <p className="text-base font-semibold tracking-[0.15em] text-on-primary">{member.member_code}</p>
          </div>
        ) : (
          <p className="relative mt-6 text-center text-on-primary/85">
            Todavía no tienes un código asignado.
          </p>
        )}
      </div>
    </div>
  );
};
