'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/ui/FormElements';
import api from '@/lib/api';

interface CreateDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driverId?: string | null;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
].map(s => ({ value: s, label: s }));

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  driverType: 'OWNER_OPERATOR',
  payStructure: 'PERCENTAGE',
  payRate: '',
  deposit: '',
  cdlNumber: '',
  cdlState: 'TX',
  cdlExpiryDate: '',
  medicalCardExpiry: '',
  notes: '',
  llcName: '',
  address: '',
  city: '',
  state: 'TX',
  zip: '',
  exemptFromCompanyFee: false,
  exemptFromCompanyCommission: false,
};

function toDateInput(iso: string): string {
  return iso.split('T')[0];
}

export function CreateDriverModal({ isOpen, onClose, onSuccess, driverId }: CreateDriverModalProps) {
  const isEdit = Boolean(driverId);
  const [loading, setLoading] = useState(false);
  const [loadingDriver, setLoadingDriver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm);
  const [intakeLink, setIntakeLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setErrors({});

    if (!driverId) {
      setForm(emptyForm);
      setIntakeLink(null);
      return;
    }

    setLoadingDriver(true);
    api
      .get(`/drivers/${driverId}`)
      .then((res) => {
        const d = res.data.data;
        let payRateDisplay = String(d.payRate / 100);
        if (d.payStructure === 'PERCENTAGE') {
          payRateDisplay = String(d.payRate / 100);
        }

        setForm({
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          email: d.email || '',
          phone: d.phone || '',
          driverType: d.driverType || 'OWNER_OPERATOR',
          payStructure: d.payStructure || 'PERCENTAGE',
          payRate: payRateDisplay,
          deposit: d.escrowBalance ? (d.escrowBalance / 100).toFixed(2) : '',
          cdlNumber: d.cdlNumber || '',
          cdlState: d.cdlState || 'TX',
          cdlExpiryDate: d.cdlExpiryDate ? toDateInput(d.cdlExpiryDate) : '',
          medicalCardExpiry: d.medicalCardExpiry ? toDateInput(d.medicalCardExpiry) : '',
          notes: d.notes || '',
          llcName: d.llcName || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || 'TX',
          zip: d.zip || '',
          exemptFromCompanyFee: Boolean(d.exemptFromCompanyFee),
          exemptFromCompanyCommission: Boolean(d.exemptFromCompanyCommission),
        });
      })
      .catch(() => {
        setErrors({ _form: 'Could not load driver' });
      })
      .finally(() => setLoadingDriver(false));
  }, [isOpen, driverId]);

  const set = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.cdlNumber.trim()) e.cdlNumber = 'Required';
    if (!form.cdlExpiryDate) e.cdlExpiryDate = 'Required';
    if (!form.medicalCardExpiry) e.medicalCardExpiry = 'Required';
    if (!form.payRate || Number(form.payRate) <= 0) e.payRate = 'Required';
    if (form.deposit && Number(form.deposit) < 0) e.deposit = 'Cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => {
    let payRate = Number(form.payRate);
    if (form.payStructure === 'PERCENTAGE') payRate = payRate * 100;
    else payRate = payRate * 100;

    const escrowBalance = Math.round((parseFloat(form.deposit) || 0) * 100);

    return {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      driverType: form.driverType,
      payStructure: form.payStructure,
      payRate: Math.round(payRate),
      escrowBalance,
      cdlNumber: form.cdlNumber.trim(),
      cdlState: form.cdlState,
      cdlExpiryDate: form.cdlExpiryDate,
      medicalCardExpiry: form.medicalCardExpiry,
      notes: form.notes.trim() || undefined,
      llcName: form.llcName.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state || undefined,
      zip: form.zip.trim() || undefined,
      exemptFromCompanyFee: form.exemptFromCompanyFee,
      exemptFromCompanyCommission: form.exemptFromCompanyCommission,
    };
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = buildPayload();
      if (isEdit && driverId) {
        await api.patch(`/drivers/${driverId}`, payload);
        onSuccess();
        onClose();
      } else {
        const res = await api.post('/drivers', payload);
        const newDriverId = res.data.data?.id as string | undefined;
        if (newDriverId) {
          try {
            const linkRes = await api.post(`/drivers/${newDriverId}/intake-link`);
            setIntakeLink({
              url: linkRes.data.data.url,
              expiresAt: linkRes.data.data.expiresAt,
            });
            onSuccess();
            return;
          } catch {
            onSuccess();
            onClose();
            if (!isEdit) setForm(emptyForm);
            return;
          }
        }
        onSuccess();
        onClose();
        if (!isEdit) setForm(emptyForm);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || (isEdit ? 'Failed to update driver' : 'Failed to create driver');
      setErrors({ _form: msg });
    } finally {
      setLoading(false);
    }
  };

  const copyIntakeLink = async () => {
    if (!intakeLink?.url) return;
    await navigator.clipboard.writeText(intakeLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeAfterIntake = () => {
    setIntakeLink(null);
    setForm(emptyForm);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Driver' : 'Add New Driver'}
      description={isEdit ? 'Update driver information' : 'Enter driver information'}
      size="lg"
    >
      {errors._form && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {errors._form}
        </div>
      )}

      {loadingDriver ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : intakeLink ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm text-emerald-300 font-medium">Driver created successfully</p>
            <p className="text-xs text-gray-400 mt-1">
              Share this link with the driver to complete their DOT application online. No login required.
            </p>
          </div>
          <FormField label="Application link">
            <div className="flex gap-2">
              <FormInput readOnly value={intakeLink.url} className="font-mono text-xs" />
              <button type="button" className="btn btn-secondary shrink-0" onClick={copyIntakeLink}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </FormField>
          <p className="text-xs text-gray-500">
            Link expires {new Date(intakeLink.expiresAt).toLocaleString()}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required error={errors.firstName}>
              <FormInput
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="First name"
                error={!!errors.firstName}
              />
            </FormField>
            <FormField label="Last Name" required error={errors.lastName}>
              <FormInput
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Last name"
                error={!!errors.lastName}
              />
            </FormField>
            <FormField label="Email">
              <FormInput
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="Email address"
              />
            </FormField>
            <FormField label="Phone">
              <FormInput
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="Phone number"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <FormField label="Driver Type" required>
              <FormSelect
                value={form.driverType}
                onChange={(e) => set('driverType', e.target.value)}
                options={[
                  { value: 'OWNER_OPERATOR', label: 'Owner Operator' },
                  { value: 'COMPANY_DRIVER', label: 'Company Driver' },
                ]}
              />
            </FormField>
            <FormField label="Pay Structure" required>
              <FormSelect
                value={form.payStructure}
                onChange={(e) => set('payStructure', e.target.value)}
                options={[
                  { value: 'PERCENTAGE', label: 'Percentage' },
                  { value: 'PER_MILE', label: 'Per Mile' },
                  { value: 'FIXED_SALARY', label: 'Fixed Salary' },
                ]}
              />
            </FormField>
            <FormField
              label={
                form.payStructure === 'PERCENTAGE'
                  ? 'Rate (%)'
                  : form.payStructure === 'PER_MILE'
                    ? 'Rate ($/mi)'
                    : 'Salary ($)'
              }
              required
              error={errors.payRate}
            >
              <FormInput
                type="number"
                step="0.01"
                value={form.payRate}
                onChange={(e) => set('payRate', e.target.value)}
                placeholder={
                  form.payStructure === 'PERCENTAGE'
                    ? 'Percentage rate'
                    : form.payStructure === 'PER_MILE'
                      ? 'Per mile rate'
                      : 'Salary amount'
                }
                error={!!errors.payRate}
              />
            </FormField>
          </div>

          <FormField
            label="Deposit (held balance)"
            error={errors.deposit}
            className="mt-4"
          >
            <FormInput
              type="number"
              step="0.01"
              min="0"
              value={form.deposit}
              onChange={(e) => set('deposit', e.target.value)}
              placeholder="0.00"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Amount held on account — shown on settlement PDF under Deposit
            </p>
          </FormField>

          <div className="mt-6 rounded-lg border border-[var(--border-color)] bg-gray-500/5 p-4 space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Settlement Exemptions
            </h4>
            <p className="text-xs text-gray-500">
              Use for family drivers or special accounts where company fee and commission should not apply.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.exemptFromCompanyFee}
                onChange={(e) => set('exemptFromCompanyFee', e.target.checked)}
              />
              <span>
                <span className="text-sm text-gray-200 block">No company fee</span>
                <span className="text-xs text-gray-500">Weekly company fee from Settings will not be added</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.exemptFromCompanyCommission}
                onChange={(e) => set('exemptFromCompanyCommission', e.target.checked)}
              />
              <span>
                <span className="text-sm text-gray-200 block">No company commission</span>
                <span className="text-xs text-gray-500">Owner operator commission % from Settings will not be deducted</span>
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <FormField label="CDL Number" required error={errors.cdlNumber}>
              <FormInput
                value={form.cdlNumber}
                onChange={(e) => set('cdlNumber', e.target.value)}
                placeholder="CDL number"
                error={!!errors.cdlNumber}
              />
            </FormField>
            <FormField label="CDL State" required>
              <FormSelect value={form.cdlState} onChange={(e) => set('cdlState', e.target.value)} options={US_STATES} />
            </FormField>
            <FormField label="CDL Expiry Date" required error={errors.cdlExpiryDate}>
              <FormInput
                type="date"
                value={form.cdlExpiryDate}
                onChange={(e) => set('cdlExpiryDate', e.target.value)}
                error={!!errors.cdlExpiryDate}
              />
            </FormField>
            <FormField label="Medical Card Expiry" required error={errors.medicalCardExpiry}>
              <FormInput
                type="date"
                value={form.medicalCardExpiry}
                onChange={(e) => set('medicalCardExpiry', e.target.value)}
                error={!!errors.medicalCardExpiry}
              />
            </FormField>
          </div>

          {form.driverType === 'OWNER_OPERATOR' && (
            <>
              <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mt-6 mb-3">
                Business & Address
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="LLC / Business Name">
                  <FormInput
                    value={form.llcName}
                    onChange={(e) => set('llcName', e.target.value)}
                    placeholder="Company name"
                  />
                </FormField>
                <FormField label="Street Address">
                  <FormInput
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="Street address"
                  />
                </FormField>
                <FormField label="City">
                  <FormInput value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City" />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="State">
                    <FormSelect value={form.state} onChange={(e) => set('state', e.target.value)} options={US_STATES} />
                  </FormField>
                  <FormField label="ZIP">
                    <FormInput value={form.zip} onChange={(e) => set('zip', e.target.value)} placeholder="ZIP code" />
                  </FormField>
                </div>
              </div>
            </>
          )}

          <FormField label="Notes" className="mt-4">
            <FormTextarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Optional internal notes"
            />
          </FormField>
        </>
      )}

      <ModalFooter>
        {intakeLink ? (
          <button type="button" onClick={closeAfterIntake} className="btn btn-primary">
            Done
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || loadingDriver}
              className="btn btn-primary"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  {isEdit ? 'Saving...' : 'Creating...'}
                </span>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Driver'
              )}
            </button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
