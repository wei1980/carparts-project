// src/components/CurrentVehiclePicker.jsx — 全站目前車輛切換器（手機/桌面共用）
import { useNavigate } from 'react-router-dom';
import { useCurrentVehicle, vehicleLabel } from '../context/CurrentVehicleContext';

export const DESKTOP_VEHICLE_SELECT_LABEL = '目前車輛（桌面）';
export const MOBILE_VEHICLE_SELECT_LABEL = '目前車輛（手機）';

export default function CurrentVehiclePicker({ mobile = false }) {
  const { vehicles, currentVehicle, loading, switching, error, refreshVehicles, selectVehicle } = useCurrentVehicle();
  const navigate = useNavigate();
  const label = mobile ? MOBILE_VEHICLE_SELECT_LABEL : DESKTOP_VEHICLE_SELECT_LABEL;

  if (loading && !currentVehicle) {
    return (
      <select aria-label={label} disabled className="field w-full max-w-full opacity-60" value="">
        <option>載入中…</option>
      </select>
    );
  }
  if (error && !currentVehicle) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-300">
        <span role="alert">{error}</span>
        <button onClick={() => refreshVehicles()} className="underline underline-offset-2 hover:text-red-200">重試</button>
      </div>
    );
  }
  if (!currentVehicle) {
    return (
      <button onClick={() => navigate('/my-car')} className="text-sm font-bold text-blue-300 hover:text-blue-200 underline underline-offset-2">
        尚未選擇車輛，前往新增 →
      </button>
    );
  }
  return (
    <div className="flex min-w-0 w-full flex-col gap-1">
    {error && <div className="text-xs text-red-300"><span role="alert">{error}</span> <button onClick={() => refreshVehicles()}>重試</button></div>}
    {switching && <span role="status" className="text-xs">切換中…</span>}
    <select
      aria-label={label}
      value={currentVehicle.id}
      disabled={switching || loading}
      onChange={async (event) => {
        const ok = await selectVehicle(event.target.value);
        if (!ok) event.target.value = currentVehicle.id;
      }}
      title={switching ? '切換中…' : vehicleLabel(currentVehicle)}
      className="field w-full max-w-full font-medium"
    >
      {vehicles.map(v => <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>)}
    </select>

    </div>
  );
}
