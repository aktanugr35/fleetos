'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import publicApi from '@/lib/public-api';
import {
  WIZARD_STEPS,
  US_STATES,
  createEmptyDriverIntakeForm,
  type DriverIntakeForm,
  type YesNo,
} from '@/lib/driver-intake-form';
import { getApiErrorMessage } from '@/lib/api-errors';
import { DocumentUploadStep, type RequiredDocument } from './DocumentUploadStep';

interface CompanyInfo {
  name: string;
  dotNumber: string;
  logoUrl?: string | null;
}

interface DriverHint {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface Props {
  token: string;
}

function YesNoGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNo;
  onChange: (v: YesNo) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-700 mb-3">{label}</p>
      <div className="flex gap-3">
        {(['NO', 'YES'] as YesNo[]).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              value === opt
                ? opt === 'YES'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-sky-50 border-sky-400 text-sky-900'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {opt === 'YES' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500';

type Phase = 'form' | 'documents' | 'done';

export function DriverApplicationWizard({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [form, setForm] = useState<DriverIntakeForm>(() => createEmptyDriverIntakeForm());

  useEffect(() => {
    publicApi
      .get(`/public/driver-intake/${token}`)
      .then((res) => {
        const data = res.data.data;
        setCompany(data.company);
        setExpiresAt(data.expiresAt);
        setRequiredDocuments(data.requiredDocuments ?? []);
        setForm(createEmptyDriverIntakeForm(data.driverHint));
        if (data.formSubmitted) setPhase('documents');
      })
      .catch((err) => setError(getApiErrorMessage(err, 'This application link is invalid or expired')))
      .finally(() => setLoading(false));
  }, [token]);

  const patch = useCallback(<K extends keyof DriverIntakeForm>(key: K, value: DriverIntakeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key as string]: '' }));
  }, []);

  const validateStep = (index: number): boolean => {
    const e: Record<string, string> = {};
    if (index === 0) {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim()) e.lastName = 'Required';
      form.residency.forEach((r, i) => {
        if (i > 0) {
          const any = [r.street, r.city, r.state, r.zip, r.years].some((v) => v.trim());
          if (!any) return;
        }
        if (!r.street.trim()) e[`residency.${i}.street`] = 'Required';
        if (!r.city.trim()) e[`residency.${i}.city`] = 'Required';
        if (r.state.length !== 2) e[`residency.${i}.state`] = '2-letter state';
        if (!r.zip.trim()) e[`residency.${i}.zip`] = 'Required';
        if (!r.years.trim()) e[`residency.${i}.years`] = 'Required';
      });
      if (!form.dateOfBirth) e.dateOfBirth = 'Required';
      if (!form.socialSecurityNumber.trim()) e.socialSecurityNumber = 'Required';
      if (!form.telephone.trim()) e.telephone = 'Required';
      if (!form.email.trim()) e.email = 'Required';
      if (!form.emergencyContactName.trim()) e.emergencyContactName = 'Required';
      if (!form.emergencyContactPhone.trim()) e.emergencyContactPhone = 'Required';
      if (!form.emergencyContactRelation.trim()) e.emergencyContactRelation = 'Required';
    }
    if (index === 1) {
      const rq = form.requiredQuestions;
      const anyYes = Object.entries(rq)
        .filter(([k]) => k !== 'explanation')
        .some(([, v]) => v === 'YES');
      if (anyYes && !rq.explanation.trim()) e['requiredQuestions.explanation'] = 'Required when any answer is Yes';
    }
    if (index === 2) {
      if (form.licenseState.length !== 2) e.licenseState = 'Required';
      if (!form.licenseNumber.trim()) e.licenseNumber = 'Required';
      if (!form.licenseType.trim()) e.licenseType = 'Required';
      if (!form.licenseExpiration) e.licenseExpiration = 'Required';
      if (!form.licenseCertificationAccepted) e.licenseCertificationAccepted = 'You must certify';
    }
    if (index === 4) {
      form.employments.forEach((emp, i) => {
        if (!emp.employerName.trim()) e[`employments.${i}.employerName`] = 'Required';
        if (!emp.address.trim()) e[`employments.${i}.address`] = 'Required';
        if (!emp.positionHeld.trim()) e[`employments.${i}.positionHeld`] = 'Required';
        if (!emp.dateFrom) e[`employments.${i}.dateFrom`] = 'Required';
        if (!emp.dateTo) e[`employments.${i}.dateTo`] = 'Required';
        if (!emp.reasonForLeaving.trim()) e[`employments.${i}.reasonForLeaving`] = 'Required';
      });
    }
    if (index === 5) {
      if (!form.authorizationAccepted) e.authorizationAccepted = 'Required';
      if (!form.finalCertificationAccepted) e.finalCertificationAccepted = 'Required';
      if (!form.applicantSignature.trim()) e.applicantSignature = 'Required';
      if (!form.signatureDate) e.signatureDate = 'Required';
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep(5)) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        licenseCertificationAccepted: true,
        authorizationAccepted: true,
        finalCertificationAccepted: true,
        accidents: form.noAccidents ? [] : form.accidents,
        convictions: form.noConvictions ? [] : form.convictions,
      };
      await publicApi.post(`/public/driver-intake/${token}`, payload);
      setError(null);
      setPhase('documents');
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to submit application'));
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(() => ((step + 1) / WIZARD_STEPS.length) * 100, [step]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center text-2xl">⚠️</div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Link unavailable</h1>
          <p className="text-slate-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center text-2xl">✓</div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">All done</h1>
          <p className="text-slate-600 text-sm">
            Thank you, {form.firstName}. Your DOT driver application and documents have been sent to {company?.name}.
            You may close this page.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'documents') {
    return (
      <DocumentUploadStep
        token={token}
        companyName={company?.name}
        driverName={form.firstName}
        requiredDocuments={requiredDocuments}
        onComplete={() => {
          setPhase('done');
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-sky-700 font-semibold mb-1">
              USDOT #{company?.dotNumber}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Driver Application for DOT Certification
            </h1>
            <p className="text-slate-600 mt-1 text-sm">{company?.name}</p>
          </div>
          {company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt="" className="h-12 w-auto object-contain rounded" />
          ) : null}
        </div>

        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-3 text-xs text-slate-500">
          <span>Step {step + 1} of {WIZARD_STEPS.length}</span>
          <span>{WIZARD_STEPS[step].title}</span>
        </div>
        {expiresAt ? (
          <p className="text-xs text-slate-400 mt-2">Link expires {new Date(expiresAt).toLocaleDateString()}</p>
        ) : null}
      </header>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">{WIZARD_STEPS[step].title}</h2>
          <p className="text-sm text-slate-500">{WIZARD_STEPS[step].subtitle}</p>
        </div>

        {error ? (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        ) : null}

        {step === 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First name" required error={fieldErrors.firstName}>
                <input className={inputClass} value={form.firstName} onChange={(e) => patch('firstName', e.target.value)} />
              </Field>
              <Field label="Middle name">
                <input className={inputClass} value={form.middleName} onChange={(e) => patch('middleName', e.target.value)} />
              </Field>
              <Field label="Maiden name">
                <input className={inputClass} value={form.maidenName} onChange={(e) => patch('maidenName', e.target.value)} />
              </Field>
              <Field label="Last name" required error={fieldErrors.lastName}>
                <input className={inputClass} value={form.lastName} onChange={(e) => patch('lastName', e.target.value)} />
              </Field>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Residency (past 3 years)</h3>
              <p className="text-xs text-slate-500 mb-3">
                Address 1 is required. Add addresses 2 and 3 only if you lived elsewhere during the past 3 years.
              </p>
              <div className="space-y-4">
                {form.residency.map((r, i) => {
                  const optional = i > 0;
                  return (
                  <div key={i} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                      Address {i + 1}{optional ? ' (optional)' : ''}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Street" required={!optional} error={fieldErrors[`residency.${i}.street`]}>
                        <input
                          className={inputClass}
                          value={r.street}
                          onChange={(e) => {
                            const next = [...form.residency];
                            next[i] = { ...next[i], street: e.target.value };
                            patch('residency', next);
                          }}
                        />
                      </Field>
                      <Field label="City" required={!optional} error={fieldErrors[`residency.${i}.city`]}>
                        <input
                          className={inputClass}
                          value={r.city}
                          onChange={(e) => {
                            const next = [...form.residency];
                            next[i] = { ...next[i], city: e.target.value };
                            patch('residency', next);
                          }}
                        />
                      </Field>
                      <Field label="State" required={!optional} error={fieldErrors[`residency.${i}.state`]}>
                        <select
                          className={inputClass}
                          value={r.state}
                          onChange={(e) => {
                            const next = [...form.residency];
                            next[i] = { ...next[i], state: e.target.value };
                            patch('residency', next);
                          }}
                        >
                          <option value="">Select</option>
                          {US_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="ZIP" required={!optional} error={fieldErrors[`residency.${i}.zip`]}>
                        <input
                          className={inputClass}
                          value={r.zip}
                          onChange={(e) => {
                            const next = [...form.residency];
                            next[i] = { ...next[i], zip: e.target.value };
                            patch('residency', next);
                          }}
                        />
                      </Field>
                      <Field label="Years at address" required={!optional} error={fieldErrors[`residency.${i}.years`]}>
                        <input
                          className={inputClass}
                          value={r.years}
                          onChange={(e) => {
                            const next = [...form.residency];
                            next[i] = { ...next[i], years: e.target.value };
                            patch('residency', next);
                          }}
                        />
                      </Field>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Date of birth" required error={fieldErrors.dateOfBirth}>
                <input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => patch('dateOfBirth', e.target.value)} />
              </Field>
              <Field label="Social Security Number" required error={fieldErrors.socialSecurityNumber}>
                <input className={inputClass} value={form.socialSecurityNumber} onChange={(e) => patch('socialSecurityNumber', e.target.value)} placeholder="XXX-XX-XXXX" />
              </Field>
              <Field label="Telephone" required error={fieldErrors.telephone}>
                <input className={inputClass} value={form.telephone} onChange={(e) => patch('telephone', e.target.value)} />
              </Field>
              <Field label="Email" required error={fieldErrors.email}>
                <input type="email" className={inputClass} value={form.email} onChange={(e) => patch('email', e.target.value)} />
              </Field>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Emergency contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name" required error={fieldErrors.emergencyContactName}>
                  <input className={inputClass} value={form.emergencyContactName} onChange={(e) => patch('emergencyContactName', e.target.value)} />
                </Field>
                <Field label="Phone" required error={fieldErrors.emergencyContactPhone}>
                  <input className={inputClass} value={form.emergencyContactPhone} onChange={(e) => patch('emergencyContactPhone', e.target.value)} />
                </Field>
                <Field label="Email">
                  <input type="email" className={inputClass} value={form.emergencyContactEmail} onChange={(e) => patch('emergencyContactEmail', e.target.value)} />
                </Field>
                <Field label="Relation" required error={fieldErrors.emergencyContactRelation}>
                  <input className={inputClass} value={form.emergencyContactRelation} onChange={(e) => patch('emergencyContactRelation', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 mb-4">
              Answer each question honestly. If you answer Yes to any item, an explanation is required below.
            </p>
            <YesNoGroup label="A. Have you ever been denied a license, permit, or privilege to operate a motor vehicle?" value={form.requiredQuestions.deniedLicense} onChange={(v) => patch('requiredQuestions', { ...form.requiredQuestions, deniedLicense: v })} />
            <YesNoGroup label="B. Has any license, permit, or privilege ever been suspended or revoked?" value={form.requiredQuestions.suspendedRevoked} onChange={(v) => patch('requiredQuestions', { ...form.requiredQuestions, suspendedRevoked: v })} />
            <YesNoGroup label="C. Have you ever been convicted of a crime involving a CMV?" value={form.requiredQuestions.cmvCriminalConviction} onChange={(v) => patch('requiredQuestions', { ...form.requiredQuestions, cmvCriminalConviction: v })} />
            <YesNoGroup label="D. Have you ever been convicted of a felony?" value={form.requiredQuestions.felonyConviction} onChange={(v) => patch('requiredQuestions', { ...form.requiredQuestions, felonyConviction: v })} />
            <YesNoGroup label="E. Have you ever refused a DOT-required drug or alcohol test?" value={form.requiredQuestions.refusedDrugAlcoholTest} onChange={(v) => patch('requiredQuestions', { ...form.requiredQuestions, refusedDrugAlcoholTest: v })} />
            <YesNoGroup label="F. Have you ever tested positive on a DOT drug or alcohol test?" value={form.requiredQuestions.positiveDrugAlcoholTest} onChange={(v) => patch('requiredQuestions', { ...form.requiredQuestions, positiveDrugAlcoholTest: v })} />
            <YesNoGroup label="G. Have you ever had a positive pre-employment test for a job you did not obtain?" value={form.requiredQuestions.positivePreEmploymentTest} onChange={(v) => patch('requiredQuestions', { ...form.requiredQuestions, positivePreEmploymentTest: v })} />
            <Field label="Explanation (if any Yes above)" error={fieldErrors['requiredQuestions.explanation']}>
              <textarea
                className={`${inputClass} min-h-[100px]`}
                value={form.requiredQuestions.explanation}
                onChange={(e) => patch('requiredQuestions', { ...form.requiredQuestions, explanation: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              I certify that I have read and understand the driver license requirements in 49 CFR Parts 383 and 391.
              The license information below is the only license I will possess.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="License state" required error={fieldErrors.licenseState}>
                <select className={inputClass} value={form.licenseState} onChange={(e) => patch('licenseState', e.target.value)}>
                  <option value="">Select</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="License number" required error={fieldErrors.licenseNumber}>
                <input className={inputClass} value={form.licenseNumber} onChange={(e) => patch('licenseNumber', e.target.value)} />
              </Field>
              <Field label="License type / class" required error={fieldErrors.licenseType}>
                <input className={inputClass} value={form.licenseType} onChange={(e) => patch('licenseType', e.target.value)} placeholder="e.g. Class A CDL" />
              </Field>
              <Field label="Expiration date" required error={fieldErrors.licenseExpiration}>
                <input type="date" className={inputClass} value={form.licenseExpiration} onChange={(e) => patch('licenseExpiration', e.target.value)} />
              </Field>
            </div>
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.licenseCertificationAccepted}
                onChange={(e) => patch('licenseCertificationAccepted', e.target.checked)}
              />
              <span className="text-sm text-slate-700">I certify the above license information is accurate and complete.</span>
            </label>
            {fieldErrors.licenseCertificationAccepted ? (
              <p className="text-xs text-red-600">{fieldErrors.licenseCertificationAccepted}</p>
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Driving experience</h3>
                <button
                  type="button"
                  className="text-xs text-sky-700 font-medium"
                  onClick={() =>
                    patch('drivingExperience', [
                      ...form.drivingExperience,
                      { equipmentClass: '', equipmentType: '', dateFrom: '', dateTo: '', approxMiles: '' },
                    ])
                  }
                >
                  + Add row
                </button>
              </div>
              {form.drivingExperience.map((row, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                  <input className={inputClass} placeholder="Class" value={row.equipmentClass} onChange={(e) => {
                    const next = [...form.drivingExperience];
                    next[i] = { ...next[i], equipmentClass: e.target.value };
                    patch('drivingExperience', next);
                  }} />
                  <input className={inputClass} placeholder="Equipment" value={row.equipmentType} onChange={(e) => {
                    const next = [...form.drivingExperience];
                    next[i] = { ...next[i], equipmentType: e.target.value };
                    patch('drivingExperience', next);
                  }} />
                  <input type="date" className={inputClass} value={row.dateFrom} onChange={(e) => {
                    const next = [...form.drivingExperience];
                    next[i] = { ...next[i], dateFrom: e.target.value };
                    patch('drivingExperience', next);
                  }} />
                  <input type="date" className={inputClass} value={row.dateTo} onChange={(e) => {
                    const next = [...form.drivingExperience];
                    next[i] = { ...next[i], dateTo: e.target.value };
                    patch('drivingExperience', next);
                  }} />
                  <input className={inputClass} placeholder="Miles" value={row.approxMiles} onChange={(e) => {
                    const next = [...form.drivingExperience];
                    next[i] = { ...next[i], approxMiles: e.target.value };
                    patch('drivingExperience', next);
                  }} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.noAccidents}
                  onChange={(e) => patch('noAccidents', e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-800">No accidents in the past 3 years</span>
              </label>
              {!form.noAccidents && (
                <>
                  <button
                    type="button"
                    className="text-xs text-sky-700 font-medium mb-2"
                    onClick={() =>
                      patch('accidents', [
                        ...form.accidents,
                        { dates: '', nature: '', fatalities: '', injuries: '', chemicalSpills: '' },
                      ])
                    }
                  >
                    + Add accident
                  </button>
                  {form.accidents.map((a, i) => (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                      <input className={inputClass} placeholder="Dates" value={a.dates} onChange={(e) => {
                        const next = [...form.accidents];
                        next[i] = { ...next[i], dates: e.target.value };
                        patch('accidents', next);
                      }} />
                      <input className={inputClass} placeholder="Nature" value={a.nature} onChange={(e) => {
                        const next = [...form.accidents];
                        next[i] = { ...next[i], nature: e.target.value };
                        patch('accidents', next);
                      }} />
                      <input className={inputClass} placeholder="Fatalities" value={a.fatalities} onChange={(e) => {
                        const next = [...form.accidents];
                        next[i] = { ...next[i], fatalities: e.target.value };
                        patch('accidents', next);
                      }} />
                      <input className={inputClass} placeholder="Injuries" value={a.injuries} onChange={(e) => {
                        const next = [...form.accidents];
                        next[i] = { ...next[i], injuries: e.target.value };
                        patch('accidents', next);
                      }} />
                      <input className={inputClass} placeholder="Chemical spills" value={a.chemicalSpills} onChange={(e) => {
                        const next = [...form.accidents];
                        next[i] = { ...next[i], chemicalSpills: e.target.value };
                        patch('accidents', next);
                      }} />
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.noConvictions}
                  onChange={(e) => patch('noConvictions', e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-800">No traffic convictions in the past 3 years</span>
              </label>
              {!form.noConvictions && (
                <>
                  <button
                    type="button"
                    className="text-xs text-sky-700 font-medium mb-2"
                    onClick={() =>
                      patch('convictions', [
                        ...form.convictions,
                        { dateConvicted: '', violation: '', state: '', penalty: '' },
                      ])
                    }
                  >
                    + Add conviction
                  </button>
                  {form.convictions.map((c, i) => (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                      <input type="date" className={inputClass} value={c.dateConvicted} onChange={(e) => {
                        const next = [...form.convictions];
                        next[i] = { ...next[i], dateConvicted: e.target.value };
                        patch('convictions', next);
                      }} />
                      <input className={inputClass} placeholder="Violation" value={c.violation} onChange={(e) => {
                        const next = [...form.convictions];
                        next[i] = { ...next[i], violation: e.target.value };
                        patch('convictions', next);
                      }} />
                      <input className={inputClass} placeholder="State" value={c.state} onChange={(e) => {
                        const next = [...form.convictions];
                        next[i] = { ...next[i], state: e.target.value };
                        patch('convictions', next);
                      }} />
                      <input className={inputClass} placeholder="Penalty" value={c.penalty} onChange={(e) => {
                        const next = [...form.convictions];
                        next[i] = { ...next[i], penalty: e.target.value };
                        patch('convictions', next);
                      }} />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Field label="Explain any employment gaps (optional)">
              <textarea
                className={`${inputClass} min-h-[80px]`}
                value={form.employmentGapsExplanation}
                onChange={(e) => patch('employmentGapsExplanation', e.target.value)}
              />
            </Field>
            {form.employments.map((emp, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employer {i + 1}</p>
                  {form.employments.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() => patch('employments', form.employments.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Employer name" required error={fieldErrors[`employments.${i}.employerName`]}>
                    <input className={inputClass} value={emp.employerName} onChange={(e) => {
                      const next = [...form.employments];
                      next[i] = { ...next[i], employerName: e.target.value };
                      patch('employments', next);
                    }} />
                  </Field>
                  <Field label="Address" required error={fieldErrors[`employments.${i}.address`]}>
                    <input className={inputClass} value={emp.address} onChange={(e) => {
                      const next = [...form.employments];
                      next[i] = { ...next[i], address: e.target.value };
                      patch('employments', next);
                    }} />
                  </Field>
                  <Field label="Position held" required error={fieldErrors[`employments.${i}.positionHeld`]}>
                    <input className={inputClass} value={emp.positionHeld} onChange={(e) => {
                      const next = [...form.employments];
                      next[i] = { ...next[i], positionHeld: e.target.value };
                      patch('employments', next);
                    }} />
                  </Field>
                  <Field label="From" required error={fieldErrors[`employments.${i}.dateFrom`]}>
                    <input type="date" className={inputClass} value={emp.dateFrom} onChange={(e) => {
                      const next = [...form.employments];
                      next[i] = { ...next[i], dateFrom: e.target.value };
                      patch('employments', next);
                    }} />
                  </Field>
                  <Field label="To" required error={fieldErrors[`employments.${i}.dateTo`]}>
                    <input type="date" className={inputClass} value={emp.dateTo} onChange={(e) => {
                      const next = [...form.employments];
                      next[i] = { ...next[i], dateTo: e.target.value };
                      patch('employments', next);
                    }} />
                  </Field>
                  <Field label="Reason for leaving" required error={fieldErrors[`employments.${i}.reasonForLeaving`]}>
                    <input className={inputClass} value={emp.reasonForLeaving} onChange={(e) => {
                      const next = [...form.employments];
                      next[i] = { ...next[i], reasonForLeaving: e.target.value };
                      patch('employments', next);
                    }} />
                  </Field>
                </div>
                <YesNoGroup
                  label="Were you subject to FMCSRs while employed?"
                  value={emp.subjectToFmcsr}
                  onChange={(v) => {
                    const next = [...form.employments];
                    next[i] = { ...next[i], subjectToFmcsr: v };
                    patch('employments', next);
                  }}
                />
                <YesNoGroup
                  label="Did you perform safety-sensitive functions subject to DOT testing?"
                  value={emp.safetySensitiveFunction}
                  onChange={(v) => {
                    const next = [...form.employments];
                    next[i] = { ...next[i], safetySensitiveFunction: v };
                    patch('employments', next);
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-sky-700 font-medium"
              onClick={() =>
                patch('employments', [
                  ...form.employments,
                  {
                    employerName: '',
                    address: '',
                    positionHeld: '',
                    dateFrom: '',
                    dateTo: '',
                    reasonForLeaving: '',
                    employmentGaps: '',
                    subjectToFmcsr: 'NO',
                    safetySensitiveFunction: 'NO',
                    previousEmployerEmail: '',
                    previousEmployerPhone: '',
                  },
                ])
              }
            >
              + Add employer
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed">
              <p className="mb-2">
                I authorize {company?.name} and its agents to obtain Motor Vehicle Records, PSP reports,
                and employment history as required by 49 CFR 391.23 and §40.25(g).
              </p>
              <p>
                I certify that all information in this application is true and complete to the best of my knowledge.
              </p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 p-4">
              <input type="checkbox" className="mt-1" checked={form.authorizationAccepted} onChange={(e) => patch('authorizationAccepted', e.target.checked)} />
              <span className="text-sm text-slate-700">I authorize the inquiries described above.</span>
            </label>
            {fieldErrors.authorizationAccepted ? <p className="text-xs text-red-600">{fieldErrors.authorizationAccepted}</p> : null}
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 p-4">
              <input type="checkbox" className="mt-1" checked={form.finalCertificationAccepted} onChange={(e) => patch('finalCertificationAccepted', e.target.checked)} />
              <span className="text-sm text-slate-700">I certify this application is truthful and complete.</span>
            </label>
            {fieldErrors.finalCertificationAccepted ? <p className="text-xs text-red-600">{fieldErrors.finalCertificationAccepted}</p> : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Signature (type full legal name)" required error={fieldErrors.applicantSignature}>
                <input className={inputClass} value={form.applicantSignature} onChange={(e) => patch('applicantSignature', e.target.value)} />
              </Field>
              <Field label="Date" required error={fieldErrors.signatureDate}>
                <input type="date" className={inputClass} value={form.signatureDate} onChange={(e) => patch('signatureDate', e.target.value)} />
              </Field>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 disabled:opacity-40"
          >
            Back
          </button>
          {step < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium shadow-sm"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
