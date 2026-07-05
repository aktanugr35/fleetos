'use client';

import { FormSelect } from '@/components/ui/FormElements';
import { time12To24, time24ToParts, type TimePeriod } from '@/lib/us-time';

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const hour = String(index + 1);
  return { value: hour, label: hour };
});

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => {
  const minute = String(index).padStart(2, '0');
  return { value: minute, label: minute };
});

const PERIOD_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

interface FormTimeInputProps {
  value: string;
  onChange: (value24: string) => void;
}

export function FormTimeInput({ value, onChange }: FormTimeInputProps) {
  const parts = time24ToParts(value || '08:00');

  const updatePart = (field: 'hour' | 'minute' | 'period', nextValue: string) => {
    const next = {
      hour: field === 'hour' ? nextValue : parts.hour,
      minute: field === 'minute' ? nextValue : parts.minute,
      period: (field === 'period' ? nextValue : parts.period) as TimePeriod,
    };
    onChange(time12To24(next.hour, next.minute, next.period));
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <FormSelect
        aria-label="Hour"
        value={parts.hour}
        onChange={(event) => updatePart('hour', event.target.value)}
        options={HOUR_OPTIONS}
      />
      <FormSelect
        aria-label="Minute"
        value={parts.minute}
        onChange={(event) => updatePart('minute', event.target.value)}
        options={MINUTE_OPTIONS}
      />
      <FormSelect
        aria-label="AM or PM"
        value={parts.period}
        onChange={(event) => updatePart('period', event.target.value)}
        options={PERIOD_OPTIONS}
      />
    </div>
  );
}
