'use client';

import { useState } from 'react';
import { FormField, FormInput, FormSelect } from '@/components/ui/FormElements';
import { FormTimeInput } from '@/components/ui/FormTimeInput';

export type LoadStopType = 'PICKUP' | 'DELIVERY';

export interface StopFormValue {
  key: string;
  type: LoadStopType;
  zip: string;
  city: string;
  state: string;
  address: string;
  date: string;
  time: string;
  notes: string;
}

export function createEmptyStop(defaultState = 'TX'): StopFormValue {
  return {
    key: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'DELIVERY',
    zip: '',
    city: '',
    state: defaultState,
    address: '',
    date: '',
    time: '08:00',
    notes: '',
  };
}

const STOP_TYPE_OPTIONS = [
  { value: 'DELIVERY', label: 'Drop / Delivery' },
  { value: 'PICKUP', label: 'Extra Pickup' },
];

interface LoadStopsEditorProps {
  stops: StopFormValue[];
  onChange: (stops: StopFormValue[]) => void;
  states: { value: string; label: string }[];
  onLookupZip: (zip: string) => Promise<{ city: string; state: string } | null>;
  errors?: Record<string, string>;
}

export function LoadStopsEditor({
  stops,
  onChange,
  states,
  onLookupZip,
  errors = {},
}: LoadStopsEditorProps) {
  const [lookingUp, setLookingUp] = useState<string | null>(null);
  const [zipErrors, setZipErrors] = useState<Record<string, string>>({});

  const update = (key: string, patch: Partial<StopFormValue>) => {
    onChange(stops.map((stop) => (stop.key === key ? { ...stop, ...patch } : stop)));
  };

  const addStop = () => {
    const lastState = stops[stops.length - 1]?.state;
    onChange([...stops, createEmptyStop(lastState || 'TX')]);
  };

  const removeStop = (key: string) => {
    onChange(stops.filter((stop) => stop.key !== key));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const lookup = async (stop: StopFormValue) => {
    const zip = stop.zip.replace(/\D/g, '').slice(0, 5);
    if (zip.length !== 5) {
      setZipErrors((prev) => ({ ...prev, [stop.key]: 'Enter a 5-digit ZIP code' }));
      return;
    }

    setLookingUp(stop.key);
    try {
      const result = await onLookupZip(zip);
      if (result) {
        update(stop.key, {
          zip,
          city: result.city,
          state: result.state,
          address: `${result.city}, ${result.state} ${zip}`,
        });
        setZipErrors((prev) => ({ ...prev, [stop.key]: '' }));
      } else {
        setZipErrors((prev) => ({ ...prev, [stop.key]: 'ZIP code not found' }));
      }
    } catch {
      setZipErrors((prev) => ({ ...prev, [stop.key]: 'ZIP code not found' }));
    } finally {
      setLookingUp(null);
    }
  };

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--brand-amber)]" />
          <span className="text-xs font-medium text-[var(--brand-amber)]">
            STOPS{stops.length > 0 ? ` (${stops.length})` : ''}
          </span>
          <span className="text-xs text-gray-500">between pickup and final delivery</span>
        </div>
        <button type="button" onClick={addStop} className="btn btn-secondary text-xs px-3 py-1.5">
          + Add Stop
        </button>
      </div>

      {stops.length === 0 ? (
        <p className="text-xs text-gray-500 mt-2">
          No extra stops. Use <strong>Add Stop</strong> for multi-stop loads.
        </p>
      ) : (
        <div className="space-y-3 mt-3">
          {stops.map((stop, index) => (
            <div
              key={stop.key}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Stop {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-30"
                    aria-label={`Move stop ${index + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === stops.length - 1}
                    className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-30"
                    aria-label={`Move stop ${index + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStop(stop.key)}
                    className="btn btn-danger px-2 py-1 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <FormField label="Type">
                  <FormSelect
                    value={stop.type}
                    onChange={(e) => update(stop.key, { type: e.target.value as LoadStopType })}
                    options={STOP_TYPE_OPTIONS}
                  />
                </FormField>
                <FormField label="ZIP Code">
                  <div className="flex gap-2">
                    <FormInput
                      value={stop.zip}
                      onChange={(e) =>
                        update(stop.key, { zip: e.target.value.replace(/\D/g, '').slice(0, 5) })
                      }
                      onBlur={() => {
                        if (stop.zip.replace(/\D/g, '').length === 5) void lookup(stop);
                      }}
                      placeholder="ZIP code"
                      inputMode="numeric"
                      error={!!zipErrors[stop.key]}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary shrink-0 px-3"
                      disabled={lookingUp === stop.key}
                      onClick={() => void lookup(stop)}
                    >
                      {lookingUp === stop.key ? '...' : 'Lookup'}
                    </button>
                  </div>
                  {zipErrors[stop.key] ? (
                    <p className="text-xs text-red-400 mt-1">{zipErrors[stop.key]}</p>
                  ) : null}
                </FormField>
                <FormField label="City" required error={errors[`stop-${index}-city`]}>
                  <FormInput
                    value={stop.city}
                    onChange={(e) => update(stop.key, { city: e.target.value })}
                    placeholder="City"
                    error={!!errors[`stop-${index}-city`]}
                  />
                </FormField>
                <FormField label="State" required>
                  <FormSelect
                    value={stop.state}
                    onChange={(e) => update(stop.key, { state: e.target.value })}
                    options={states}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 md:grid-cols-4">
                <FormField label="Street / facility (optional)" className="col-span-2">
                  <FormInput
                    value={stop.address}
                    onChange={(e) => update(stop.key, { address: e.target.value })}
                    placeholder="Street address or facility name"
                  />
                </FormField>
                <FormField label="Date">
                  <FormInput
                    type="date"
                    value={stop.date}
                    onChange={(e) => update(stop.key, { date: e.target.value })}
                  />
                </FormField>
                <FormField label="Time (ET)">
                  <FormTimeInput
                    value={stop.time}
                    onChange={(value) => update(stop.key, { time: value })}
                  />
                </FormField>
              </div>

              <FormField label="Stop notes (optional)" className="mt-3">
                <FormInput
                  value={stop.notes}
                  onChange={(e) => update(stop.key, { notes: e.target.value })}
                  placeholder="Appointment number, dock, instructions"
                />
              </FormField>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
