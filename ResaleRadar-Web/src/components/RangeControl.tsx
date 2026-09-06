import { RANGE_PRESETS, type RangeUnit } from '../../shared/range';

interface Props {
  unit: RangeUnit;
  count: number;
  onChange: (unit: RangeUnit, count: number) => void;
}

export function RangeControl({ unit, count, onChange }: Props) {
  return (
    <div className="range-control">
      <div className="segmented" role="group" aria-label="Range unit">
        {(['weeks', 'months'] as RangeUnit[]).map((option) => (
          <button
            key={option}
            type="button"
            className="segment"
            aria-pressed={unit === option}
            onClick={() => onChange(option, RANGE_PRESETS[option].includes(count) ? count : RANGE_PRESETS[option][0])}
          >
            {option === 'weeks' ? 'Weeks' : 'Months'}
          </button>
        ))}
      </div>

      <label className="field inline">
        <span className="field-label">Range</span>
        <select
          value={count}
          onChange={(event) => onChange(unit, Number(event.target.value))}
          aria-label={`Number of ${unit}`}
        >
          {RANGE_PRESETS[unit].map((preset) => (
            <option key={preset} value={preset}>
              {preset === 1 ? `Last ${unit === 'weeks' ? 'week' : 'month'}` : `Last ${preset} ${unit}`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
