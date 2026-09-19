import { useCallback, useEffect, useRef, useState } from 'react';

import { useOrgStore } from '@/app/store/org';
import { useMembers } from '@/modules/members/hooks/useMembers';
import type { Member } from '@/modules/members/types';
import { PlaceholderPage } from '@/shared/components/PlaceholderPage';
import { useToast } from '@/shared/hooks/useToast';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import {
  md3BodyMediumClass,
  md3FilledButtonClass,
  md3HeadlineMediumClass,
  md3InputLabelClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import { computeFaceDescriptor, isFaceMatch } from '@/shared/utils/faceRecognition';
import { useCheckIn, useTodayAttendance } from '../hooks/useAttendance';
import type { CheckInMethod, SubscriptionCheckStatus } from '../types';

type Tab = 'code' | 'manual' | 'face';

const METHOD_LABELS: Record<CheckInMethod, string> = {
  code: 'Código/QR',
  manual: 'Manual',
  face: 'Rostro',
  fingerprint: 'Huella digital',
};

const RESULT_CONFIG: Record<SubscriptionCheckStatus, { label: string; cls: string }> = {
  active:          { label: 'Membresía activa',   cls: 'bg-tertiary-container text-on-tertiary-container' },
  frozen:          { label: 'Membresía congelada', cls: 'bg-secondary-container text-on-secondary-container' },
  expired:         { label: 'Membresía vencida',  cls: 'bg-error-container text-on-error-container' },
  cancelled:       { label: 'Sin membresía activa', cls: 'bg-error-container text-on-error-container' },
  no_subscription: { label: 'Sin membresía registrada', cls: 'bg-surface-container text-on-surface-variant' },
};

// ─── Tab: código / QR ─────────────────────────────────────────────────────────

const CodeCheckInPanel = () => {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const checkIn = useCheckIn();
  const [result, setResult] = useState<{ name: string; status: SubscriptionCheckStatus } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError('');
    try {
      const res = await checkIn.mutateAsync({ method: 'code', member_code: code.trim() });
      setResult({ name: res.checkin.member_name, status: res.subscription_status });
    } catch (err) {
      setResult(null);
      setError(getApiErrorMessage(err, 'No se encontró un miembro con ese código.'));
    } finally {
      setCode('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-5">
      <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
        Escaneá el código del carnet con un lector (funciona como teclado) o escribilo manualmente.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          ref={inputRef}
          className={`${md3TextFieldClass} flex-1 text-center text-lg tracking-widest`}
          placeholder="Código de miembro"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
        />
        <button type="submit" className={md3FilledButtonClass} disabled={checkIn.isPending}>
          {checkIn.isPending ? '...' : 'Check-in'}
        </button>
      </form>

      {error && <p className="text-error">{error}</p>}

      {result && (
        <div className={`rounded-[16px] p-5 ${RESULT_CONFIG[result.status].cls}`}>
          <p className="text-lg font-semibold">{result.name}</p>
          <p className="mt-1 text-sm font-medium">{RESULT_CONFIG[result.status].label}</p>
        </div>
      )}
    </div>
  );
};

// ─── Tab: búsqueda manual ─────────────────────────────────────────────────────

const ManualCheckInPanel = () => {
  const [search, setSearch] = useState('');
  const { data } = useMembers(1, search, 'active');
  const checkIn = useCheckIn();
  const [result, setResult] = useState<{ id: number; name: string; status: SubscriptionCheckStatus } | null>(null);
  const [error, setError] = useState('');

  const members = data?.results ?? [];

  const handlePick = async (memberId: number, name: string) => {
    setError('');
    try {
      const res = await checkIn.mutateAsync({ method: 'manual', member_id: memberId });
      setResult({ id: memberId, name, status: res.subscription_status });
      setSearch('');
    } catch (err) {
      setResult(null);
      setError(getApiErrorMessage(err, 'No se pudo registrar el check-in.'));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className={md3InputLabelClass}>Buscar miembro</label>
        <input
          className={md3TextFieldClass}
          placeholder="Nombre o correo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {search && (
        <div className="divide-y divide-outline-variant/40 rounded-[16px] border border-outline-variant">
          {members.length === 0 ? (
            <p className={`p-4 text-center text-on-surface-variant ${md3BodyMediumClass}`}>Sin resultados.</p>
          ) : members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handlePick(m.id, m.full_name)}
              disabled={checkIn.isPending}
              className="flex w-full items-center justify-between p-4 text-left transition hover:bg-on-surface/4"
            >
              <span className="font-medium text-on-surface">{m.full_name}</span>
              <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>{m.email}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-error">{error}</p>}

      {result && (
        <div className={`rounded-[16px] p-5 ${RESULT_CONFIG[result.status].cls}`}>
          <p className="text-lg font-semibold">{result.name}</p>
          <p className="mt-1 text-sm font-medium">{RESULT_CONFIG[result.status].label}</p>
        </div>
      )}
    </div>
  );
};

// ─── Tab: reconocimiento facial (verificación 1:1) ────────────────────────────

type FaceStatus = 'idle' | 'no_descriptor' | 'camera_error' | 'camera' | 'checking' | 'match' | 'no_match';

const FaceCheckInPanel = () => {
  const [search, setSearch] = useState('');
  const { data } = useMembers(1, search, 'active');
  const checkIn = useCheckIn();
  const showToast = useToast();

  const [selected, setSelected] = useState<Member | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('idle');
  const [result, setResult] = useState<SubscriptionCheckStatus | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const members = data?.results ?? [];

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleSelect = async (member: Member) => {
    setSelected(member);
    setSearch('');
    setResult(null);

    if (!member.face_descriptor) {
      setFaceStatus('no_descriptor');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setFaceStatus('camera');
    } catch {
      setFaceStatus('camera_error');
    }
  };

  const handleVerify = async () => {
    if (!selected?.face_descriptor || !videoRef.current) return;
    setFaceStatus('checking');

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);

    const liveDescriptor = await computeFaceDescriptor(canvas);
    const matched = !!liveDescriptor && isFaceMatch(liveDescriptor, selected.face_descriptor);
    setFaceStatus(matched ? 'match' : 'no_match');
  };

  const handleCheckIn = async () => {
    if (!selected) return;
    try {
      const res = await checkIn.mutateAsync({ method: 'face', member_id: selected.id });
      setResult(res.subscription_status);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'No se pudo registrar el check-in.'), 'error');
    } finally {
      stopCamera();
      setSelected(null);
      setFaceStatus('idle');
    }
  };

  const handleReset = () => {
    stopCamera();
    setSelected(null);
    setFaceStatus('idle');
  };

  return (
    <div className="space-y-5">
      {!selected ? (
        <>
          <div>
            <label className={md3InputLabelClass}>Buscar miembro para verificar</label>
            <input
              className={md3TextFieldClass}
              placeholder="Nombre o correo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <div className="divide-y divide-outline-variant/40 rounded-[16px] border border-outline-variant">
              {members.length === 0 ? (
                <p className={`p-4 text-center text-on-surface-variant ${md3BodyMediumClass}`}>Sin resultados.</p>
              ) : members.map((m) => (
                <button key={m.id} type="button" onClick={() => handleSelect(m)}
                  className="flex w-full items-center justify-between p-4 text-left transition hover:bg-on-surface/4">
                  <span className="font-medium text-on-surface">{m.full_name}</span>
                  <span className={`text-on-surface-variant ${md3BodyMediumClass}`}>{m.email}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>
            Verificando a <span className="font-medium text-on-surface">{selected.full_name}</span>
          </p>

          {faceStatus === 'no_descriptor' ? (
            <p className="text-error">
              Este miembro no tiene rostro registrado (falta capturarle una foto en su ficha).
            </p>
          ) : faceStatus === 'camera_error' ? (
            <p className="text-error">
              No se pudo acceder a la cámara. Revisa que el navegador tenga permiso de cámara y que ningún otro
              programa la esté usando, luego intenta de nuevo.
            </p>
          ) : (
            <div className="relative mx-auto aspect-[4/3] max-w-sm overflow-hidden rounded-[16px] bg-surface-container">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              {faceStatus === 'match' && (
                <div className="absolute inset-0 flex items-center justify-center bg-tertiary-container/80">
                  <p className="text-lg font-semibold text-on-tertiary-container">✓ Coincide</p>
                </div>
              )}
              {faceStatus === 'no_match' && (
                <div className="absolute inset-0 flex items-center justify-center bg-error-container/80">
                  <p className="text-lg font-semibold text-on-error-container">No coincide</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {faceStatus === 'camera' && (
              <button type="button" onClick={handleVerify} className={md3FilledButtonClass}>Verificar rostro</button>
            )}
            {faceStatus === 'checking' && (
              <span className="text-on-surface-variant">Analizando...</span>
            )}
            {faceStatus === 'match' && (
              <button type="button" onClick={handleCheckIn} disabled={checkIn.isPending} className={md3FilledButtonClass}>
                {checkIn.isPending ? 'Guardando...' : 'Confirmar check-in'}
              </button>
            )}
            {faceStatus === 'no_match' && (
              <>
                <button type="button" onClick={() => setFaceStatus('camera')} className={md3OutlinedButtonClass}>Reintentar</button>
                <button type="button" onClick={handleCheckIn} disabled={checkIn.isPending} className={md3OutlinedButtonClass}>
                  Marcar de todas formas
                </button>
              </>
            )}
            <button type="button" onClick={handleReset} className={md3OutlinedButtonClass}>Cancelar</button>
          </div>
        </div>
      )}

      {result && (
        <div className={`rounded-[16px] p-5 ${RESULT_CONFIG[result].cls}`}>
          <p className="text-sm font-medium">{RESULT_CONFIG[result].label}</p>
        </div>
      )}
    </div>
  );
};

// ─── Check-ins de hoy ─────────────────────────────────────────────────────────

const TodayList = () => {
  const { data: checkins = [], isLoading } = useTodayAttendance();

  return (
    <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
      <h2 className={`mb-4 ${md3TitleMediumClass}`}>Check-ins de hoy ({checkins.length})</h2>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        </div>
      ) : checkins.length === 0 ? (
        <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Todavía no hay check-ins hoy.</p>
      ) : (
        <div className="divide-y divide-outline-variant/40">
          {checkins.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-on-surface">{c.member_name}</span>
                <span className="flex-shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                  {METHOD_LABELS[c.method]}
                </span>
              </div>
              <span className={`flex-shrink-0 text-on-surface-variant ${md3BodyMediumClass}`}>
                {c.checked_in_at ? new Date(c.checked_in_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const GymAttendancePage = () => {
  const [tab, setTab] = useState<Tab>('code');

  return (
    <div className="space-y-6">
      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Gestión</span>
        <h1 className={`mt-2 ${md3HeadlineMediumClass}`}>Asistencia</h1>

        <div className="mt-5 flex flex-wrap gap-2">
          {(['code', 'manual', 'face'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                tab === t
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant text-on-surface-variant hover:bg-on-surface/8'
              }`}
            >
              {t === 'code' ? 'Código / QR' : t === 'manual' ? 'Búsqueda manual' : 'Reconocimiento facial'}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'code' ? <CodeCheckInPanel /> : tab === 'manual' ? <ManualCheckInPanel /> : <FaceCheckInPanel />}
        </div>
      </section>

      <TodayList />
    </div>
  );
};

export const AttendancePage = () => {
  const organization = useOrgStore((state) => state.organization);

  if (organization?.business_type !== 'gym') {
    return <PlaceholderPage title="Asistencia" />;
  }

  return <GymAttendancePage />;
};
