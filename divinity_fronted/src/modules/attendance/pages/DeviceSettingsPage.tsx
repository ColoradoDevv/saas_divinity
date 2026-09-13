import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrgStore } from '@/app/store/org';
import { useToast } from '@/shared/hooks/useToast';
import {
  md3BodyMediumClass,
  md3ErrorBannerClass,
  md3FilledButtonClass,
  md3HeadlineSmallClass,
  md3InputLabelClass,
  md3OutlinedButtonClass,
  md3OverlineClass,
  md3SurfaceClass,
  md3TextFieldClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';
import {
  useBiometricDevices,
  useCreateDevice,
  useRotateDeviceKey,
  useUpdateDevice,
} from '../hooks/useAttendance';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ─── Aviso de clave nueva (solo se ve una vez) ─────────────────────────────────

const DeviceKeyReveal = ({ deviceKey, onClose }: { deviceKey: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deviceKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — el usuario puede seleccionar y copiar manualmente
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`${md3SurfaceClass} w-full max-w-lg p-6 sm:p-8`}>
        <h3 className={md3TitleMediumClass}>Clave del dispositivo</h3>
        <p className={`mt-2 text-error ${md3BodyMediumClass}`}>
          Guárdala ahora — no se puede volver a ver. Si la pierdes, tendrás que rotarla (invalida la anterior).
        </p>
        <div className="mt-4 break-all rounded-2xl border border-outline-variant bg-surface-container p-4 font-mono text-sm text-on-surface">
          {deviceKey}
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={handleCopy} className={md3FilledButtonClass}>
            {copied ? 'Copiado ✓' : 'Copiar'}
          </button>
          <button type="button" onClick={onClose} className={md3OutlinedButtonClass}>
            Ya la guardé
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Panel "Cómo conectar tu equipo" ────────────────────────────────────────────

const ConnectionInstructions = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[16px] border border-outline-variant p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-medium text-on-surface">Cómo conectar tu equipo (terminal o lector USB)</span>
        <span className="text-on-surface-variant">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className={`mt-4 space-y-3 text-on-surface-variant ${md3BodyMediumClass}`}>
          <p>
            Cualquier terminal biométrico o el agente local de un lector USB debe poder hacer esta única
            petición cuando alguien marca su huella:
          </p>
          <pre className="overflow-x-auto rounded-xl bg-surface-container p-3 font-mono text-xs text-on-surface">
{`POST ${API_BASE_URL}/attendance/devices/events/
Authorization: Bearer <clave del dispositivo>
Content-Type: application/json

{ "external_user_id": "<id que el equipo asignó al enrolar a esa persona>" }`}
          </pre>
          <p>
            Si tu terminal soporta configurar una URL de notificación/push, apúntala directo acá. Si es un
            lector USB sin esa opción, hace falta un agente local instalado en la PC de recepción que hable
            con el SDK del fabricante y haga esta misma petición.
          </p>
          <p>
            Antes de que un miembro pueda marcar, hay que enrolarlo desde su ficha (Miembros → el miembro →
            "Huella digital"), indicando el mismo id que el equipo le asignó al tomarle la huella ahí.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Formulario de nuevo dispositivo ────────────────────────────────────────────

const NewDeviceForm = ({ onCreated, onCancel }: { onCreated: (key: string) => void; onCancel: () => void }) => {
  const createDevice = useCreateDevice();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    try {
      const device = await createDevice.mutateAsync(name);
      onCreated(device.device_key);
    } catch {
      setError('No se pudo crear el dispositivo.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[16px] border border-outline-variant p-4">
      <div>
        <label className={md3InputLabelClass}>Nombre *</label>
        <input
          required
          className={md3TextFieldClass}
          placeholder="ej: Recepción — ZKTeco"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {error && <p className={md3ErrorBannerClass}>{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={createDevice.isPending} className={md3FilledButtonClass}>
          {createDevice.isPending ? 'Creando...' : 'Crear dispositivo'}
        </button>
        <button type="button" onClick={onCancel} className={md3OutlinedButtonClass}>Cancelar</button>
      </div>
    </form>
  );
};

// ─── Página principal ───────────────────────────────────────────────────────────

export const DeviceSettingsPage = () => {
  const navigate = useNavigate();
  const role = useOrgStore((state) => state.role);
  const showToast = useToast();

  useEffect(() => {
    if (role && role !== 'admin') navigate('/dashboard', { replace: true });
  }, [role, navigate]);

  const { data: devices = [], isLoading } = useBiometricDevices();
  const updateDevice = useUpdateDevice();
  const rotateKey = useRotateDeviceKey();

  const [showNewForm, setShowNewForm] = useState(false);
  const [revealKey, setRevealKey] = useState<string | null>(null);

  if (role && role !== 'admin') return null;

  const handleRotate = async (id: number) => {
    const device = await rotateKey.mutateAsync(id);
    setRevealKey(device.device_key);
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await updateDevice.mutateAsync({ id, data: { is_active: !isActive } });
    showToast(isActive ? 'Dispositivo desactivado.' : 'Dispositivo reactivado.');
  };

  return (
    <div className="space-y-8">
      {revealKey && <DeviceKeyReveal deviceKey={revealKey} onClose={() => setRevealKey(null)} />}

      <section className={`${md3SurfaceClass} p-6 sm:p-8`}>
        <span className={md3OverlineClass}>Configuración</span>
        <h1 className={`mt-3 ${md3HeadlineSmallClass}`}>Dispositivos biométricos</h1>
        <p className={`mt-2 max-w-2xl text-on-surface-variant ${md3BodyMediumClass}`}>
          Terminales de huella digital o lectores USB que pueden registrar check-ins automáticamente.
        </p>
      </section>

      <section className={`${md3SurfaceClass} p-6 sm:p-8 space-y-4`}>
        <ConnectionInstructions />

        <div className="flex items-center justify-between gap-4">
          <h2 className={md3TitleMediumClass}>Dispositivos</h2>
          {!showNewForm && (
            <button type="button" onClick={() => setShowNewForm(true)} className={md3FilledButtonClass}>
              + Nuevo dispositivo
            </button>
          )}
        </div>

        {showNewForm && (
          <NewDeviceForm
            onCreated={(key) => { setShowNewForm(false); setRevealKey(key); }}
            onCancel={() => setShowNewForm(false)}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </div>
        ) : devices.length === 0 ? (
          <p className={`text-on-surface-variant ${md3BodyMediumClass}`}>Aún no hay dispositivos. Crea el primero.</p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-outline-variant p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-on-surface">{d.name}</p>
                    {!d.is_active && (
                      <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                        Desactivado
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-on-surface-variant ${md3BodyMediumClass}`}>
                    {d.last_seen_at
                      ? `Último evento: ${new Date(d.last_seen_at).toLocaleString('es')}`
                      : 'Todavía no recibió ningún evento'}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button type="button" onClick={() => handleRotate(d.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-on-surface/8 transition">
                    Rotar clave
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(d.id, d.is_active)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      d.is_active ? 'text-error hover:bg-error/8' : 'text-primary hover:bg-primary/8'
                    }`}
                  >
                    {d.is_active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
