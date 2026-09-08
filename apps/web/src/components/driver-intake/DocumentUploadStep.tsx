'use client';

import { useMemo, useState } from 'react';
import publicApi from '@/lib/public-api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { compressImageFile, formatFileSize, ImageCompressionError } from '@/lib/image-compression';

export interface RequiredDocument {
  category: string;
  title: string;
}

interface Props {
  token: string;
  companyName?: string;
  driverName?: string;
  requiredDocuments: RequiredDocument[];
  onComplete: () => void;
}

/** Kept under nginx's default 1 MB body limit even when photos are sent one at a time. */
const MAX_FILE_BYTES = 800 * 1024;

const DEFAULT_DOCS: RequiredDocument[] = [
  { category: 'driverLicenseFront', title: "Driver's License (Front)" },
  { category: 'driverLicenseBack', title: "Driver's License (Back)" },
  { category: 'medicalCard', title: 'Medical Card' },
  { category: 'passport', title: 'Passport' },
  { category: 'workAuthorization', title: 'Work Authorization (Visa / Green Card)' },
];

export function DocumentUploadStep({
  token,
  companyName,
  driverName,
  requiredDocuments,
  onComplete,
}: Props) {
  const docs = requiredDocuments.length > 0 ? requiredDocuments : DEFAULT_DOCS;
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [preparing, setPreparing] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allSelected = useMemo(
    () => docs.every((d) => Boolean(files[d.category])),
    [docs, files],
  );
  const busy = submitting || Object.values(preparing).some(Boolean);

  const handleFile = async (category: string, fileList: FileList | null) => {
    const picked = fileList?.[0] ?? null;
    setError(null);

    if (!picked) {
      setFiles((prev) => ({ ...prev, [category]: null }));
      setPreviews((prev) => {
        if (prev[category]) URL.revokeObjectURL(prev[category]);
        return { ...prev, [category]: '' };
      });
      return;
    }

    setPreparing((prev) => ({ ...prev, [category]: true }));
    try {
      const file = await compressImageFile(picked);
      if (file.size > MAX_FILE_BYTES) {
        setError(
          `“${docs.find((d) => d.category === category)?.title ?? 'This photo'}” is still too large (${formatFileSize(file.size)}). Please retake it.`,
        );
        return;
      }
      setFiles((prev) => ({ ...prev, [category]: file }));
      setPreviews((prev) => {
        if (prev[category]) URL.revokeObjectURL(prev[category]);
        return { ...prev, [category]: URL.createObjectURL(file) };
      });
    } catch (err) {
      setError(
        err instanceof ImageCompressionError
          ? err.message
          : 'Could not prepare that photo. Please try a different picture.',
      );
    } finally {
      setPreparing((prev) => ({ ...prev, [category]: false }));
    }
  };

  const handleSubmit = async () => {
    if (!allSelected) {
      setError('Please add a photo for every document.');
      return;
    }
    const selected = docs.map((d) => files[d.category]).filter((f): f is File => Boolean(f));
    const oversized = selected.find((file) => file.size > MAX_FILE_BYTES);
    if (oversized) {
      setError(
        `One of the photos is still too large (${formatFileSize(oversized.size)}). Please retake it with a lower camera resolution.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // One photo per request. Five originals in a single POST is what nginx rejects with 413.
      for (let i = 0; i < docs.length; i += 1) {
        const d = docs[i];
        const file = files[d.category];
        if (!file) continue;
        setUploadProgress(`Uploading ${i + 1} of ${docs.length}…`);
        const formData = new FormData();
        formData.append(d.category, file);
        await publicApi.post(`/public/driver-intake/${token}/documents`, formData);
      }
      onComplete();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not upload documents'));
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const completed = docs.filter((d) => files[d.category]).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-28">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-sky-700 font-semibold mb-1">Final step</p>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Upload your documents</h1>
        <p className="text-slate-800 mt-1 text-sm font-medium">
          {driverName ? `${driverName}, ` : ''}please add clear photos of the documents below
          {companyName ? ` for ${companyName}` : ''}. All are required.
        </p>
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300"
            style={{ width: `${(completed / docs.length) * 100}%` }}
          />
        </div>
        <p className="text-xs font-medium text-slate-700 mt-2">{completed} of {docs.length} added</p>
      </header>

      {error ? (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="space-y-4">
        {docs.map((d) => {
          const preview = previews[d.category];
          const file = files[d.category];
          const selected = Boolean(file);
          const isPreparing = Boolean(preparing[d.category]);
          return (
            <div
              key={d.category}
              className={`rounded-2xl border p-4 transition-colors ${
                selected ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{d.title}</p>
                  <p className="text-xs text-slate-700 mt-0.5 truncate">
                    {isPreparing
                      ? 'Preparing photo…'
                      : file
                        ? `${file.name} · ${formatFileSize(file.size)}`
                        : 'JPG or PNG · a phone photo is fine'}
                  </p>
                </div>
                <label className="shrink-0 cursor-pointer">
                  <span
                    className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
                      selected
                        ? 'bg-white border border-slate-300 text-slate-700'
                        : 'bg-sky-600 text-white'
                    }`}
                  >
                    {selected ? 'Change' : 'Add photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => void handleFile(d.category, e.target.files)}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm disabled:opacity-60"
          >
            {uploadProgress ?? (submitting ? 'Uploading…' : 'Finish & submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
