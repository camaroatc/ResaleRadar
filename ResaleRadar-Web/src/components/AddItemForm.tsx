import { useId, useState, type FormEvent } from 'react';
import { PLATFORMS, type Platform } from '../../shared/inventory';
import type { FieldError } from '../../shared/validation';
import { InventoryValidationError, type NewItemDraft } from '../data/inventoryRepository';

interface Props {
  onCreate: (draft: NewItemDraft) => Promise<unknown>;
  disabled: boolean;
}

const EMPTY = { title: '', listPrice: '', platform: 'ebay' as Platform, cogs: '' };

export function AddItemForm({ onCreate, disabled }: Props) {
  const formId = useId();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const errorFor = (field: string) => errors.find((error) => error.field === field)?.message;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setStatus(null);
    try {
      await onCreate({
        title: values.title,
        listPrice: values.listPrice,
        platform: values.platform,
        cogs: values.cogs,
        clientRequestId: crypto.randomUUID(),
      });
      setValues(EMPTY);
      setStatus('Item added.');
    } catch (error) {
      if (error instanceof InventoryValidationError) {
        setErrors(error.errors);
      } else {
        setErrors([{ field: '', code: 'unknown', message: (error as Error).message }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="add-item-form" onSubmit={submit} aria-label="Add inventory item">
      <label className="field grow">
        <span className="field-label">Item title</span>
        <input
          id={`${formId}-title`}
          value={values.title}
          onChange={(event) => setValues({ ...values, title: event.target.value })}
          placeholder="Nikon FE 35mm Camera Body"
          aria-invalid={Boolean(errorFor('title'))}
          aria-describedby={errorFor('title') ? `${formId}-title-error` : undefined}
          disabled={disabled}
        />
        {errorFor('title') && (
          <span className="field-error" id={`${formId}-title-error`}>
            {errorFor('title')}
          </span>
        )}
      </label>

      <label className="field">
        <span className="field-label">List price</span>
        <input
          inputMode="decimal"
          value={values.listPrice}
          onChange={(event) => setValues({ ...values, listPrice: event.target.value })}
          placeholder="129.99"
          aria-invalid={Boolean(errorFor('listPrice'))}
          aria-describedby={errorFor('listPrice') ? `${formId}-price-error` : undefined}
          disabled={disabled}
        />
        {errorFor('listPrice') && (
          <span className="field-error" id={`${formId}-price-error`}>
            {errorFor('listPrice')}
          </span>
        )}
      </label>

      <label className="field">
        <span className="field-label">
          COGS <span className="field-hint">optional</span>
        </span>
        <input
          inputMode="decimal"
          value={values.cogs}
          onChange={(event) => setValues({ ...values, cogs: event.target.value })}
          placeholder="0.00"
          aria-invalid={Boolean(errorFor('cogs'))}
          disabled={disabled}
        />
        {errorFor('cogs') && <span className="field-error">{errorFor('cogs')}</span>}
      </label>

      <label className="field">
        <span className="field-label">Platform</span>
        <select
          value={values.platform}
          onChange={(event) => setValues({ ...values, platform: event.target.value as Platform })}
          aria-invalid={Boolean(errorFor('platform'))}
          disabled={disabled}
        >
          {PLATFORMS.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
        {errorFor('platform') && <span className="field-error">{errorFor('platform')}</span>}
      </label>

      <button type="submit" className="button primary" disabled={disabled || submitting}>
        {submitting ? 'Adding…' : 'Add item'}
      </button>

      <p className="form-status" role="status">
        {status ?? errorFor('') ?? ''}
      </p>
    </form>
  );
}
