import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { myCarAPI, vehicleAPI } from '../api';

const CurrentVehicleContext = createContext(null);
const emptyState = { vehicles: [], currentVehicle: null, dashboard: null, loading: false, switching: false, error: '' };
export const vehicleLabel = (vehicle) => vehicle
  ? [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || '未命名車輛'
  : '尚未選擇車輛';

export function CurrentVehicleProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState(emptyState);
  const request = useRef(0);
  const owner = useRef(userId);
  const busy = useRef(false);
  owner.current = userId;

  const refreshVehicles = useCallback(async () => {
    if (!userId || busy.current) return false;
    const version = ++request.current;
    const active = () => version === request.current && owner.current === userId;
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const [list, response] = await Promise.all([vehicleAPI.getAll(), myCarAPI.dashboard()]);
      if (!active()) return false;
      const vehicles = list.data;
      const current = response.data.vehicle;
      const currentVehicle = current ? { ...current, ...vehicles.find(v => v.id === current.id) } : null;
      setState(s => ({ ...s, vehicles, currentVehicle, dashboard: response.data, loading: false }));
      return true;
    } catch {
      if (active()) setState(s => ({ ...s, loading: false, error: '車輛載入失敗，請重試' }));
      return false;
    }
  }, [userId]);

  useEffect(() => {
    busy.current = false;
    setState(emptyState);
    if (userId) refreshVehicles();
    return () => { ++request.current; };
  }, [userId, refreshVehicles]);

  const selectVehicle = async (id) => {
    const vehicle = state.vehicles.find(v => v.id === id);
    if (!userId || !vehicle || busy.current) return false;
    if (id === state.currentVehicle?.id) return true;
    busy.current = true;
    const version = ++request.current;
    const active = () => version === request.current && owner.current === userId;
    setState(s => ({ ...s, switching: true, loading: false, error: '' }));
    try {
      await myCarAPI.setCurrentVehicle(id);
      if (!active()) return false;
      setState(s => ({ ...s, currentVehicle: vehicle, switching: false, dashboard: null }));
      return true;
    } catch {
      if (active()) setState(s => ({ ...s, switching: false, error: '切換車輛失敗，已保留原車輛，請重試' }));
      return false;
    } finally {
      if (active()) busy.current = false;
    }
  };
  const visibleState = userId ? state : emptyState;
  return <CurrentVehicleContext.Provider value={{ ...visibleState, refreshVehicles, selectVehicle }}>{children}</CurrentVehicleContext.Provider>;
}

export function useCurrentVehicle() {
  const context = useContext(CurrentVehicleContext);
  if (!context) throw new Error('useCurrentVehicle must be used within CurrentVehicleProvider');
  return context;
}
