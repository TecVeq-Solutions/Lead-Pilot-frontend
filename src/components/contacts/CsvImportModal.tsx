import React, { useState } from 'react';
import { Upload, X, CheckCircle, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export interface ImportError {
  row: number;
  error: string;
}

export interface ImportSummary {
  status: string;
  total_rows: number;
  imported_rows: number;
  updated_rows: number;
  failed_rows: number;
  errors: ImportError[];
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
      setSummary(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    setSummary(null);

    const formData = new FormData();
    formData.append('csv_file', file);

    try {
      const res = await api.post('/contacts/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.status === 'success') {
        setSummary(res.data.data);
        if (onImportComplete) {
          onImportComplete();
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to import CSV file.';
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-poppins">
      <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#CBD5E1]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ECFDF5] text-[#059669] rounded-xl border border-[#A7F3D0]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0F172A]">Bulk CSV Contact Importer</h2>
              <p className="text-xs font-semibold text-[#475569]">E.164 Phone Normalization & Tenant Deduplication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!summary ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#0F9F8F] rounded-xl p-8 text-center bg-[#F8FAFC] transition-colors">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <div className="text-sm font-extrabold text-[#0F172A] mb-1">
                {file ? file.name : 'Select or drop your CSV file'}
              </div>
              <div className="text-xs font-semibold text-[#475569] mb-4">
                Supported format: .csv (Max 5MB, up to 10,000 contacts per upload)
              </div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] text-xs font-extrabold text-[#0F172A] rounded-lg cursor-pointer inline-block transition-colors shadow-xs"
              >
                Browse CSV File
              </label>
            </div>

            {errorMessage && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs font-bold text-[#B91C1C] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-[#CBD5E1]">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-white text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors border border-[#CBD5E1]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] disabled:opacity-50 text-white text-xs font-extrabold rounded-lg flex items-center gap-2 shadow-sm transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing CSV...
                  </>
                ) : (
                  'Start Import Job'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs font-bold text-[#047857] flex items-center gap-3">
              <CheckCircle className="w-6 h-6 shrink-0 text-[#059669]" />
              <div>
                <div className="font-black text-[#0F172A] text-sm mb-0.5">CSV Import Completed</div>
                <div>Processed {summary.total_rows} total row records.</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 text-center">
                <div className="text-xs font-extrabold text-[#475569]">Created</div>
                <div className="text-xl font-black text-[#059669]">{summary.imported_rows}</div>
              </div>
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 text-center">
                <div className="text-xs font-extrabold text-[#475569]">Updated</div>
                <div className="text-xl font-black text-[#2563EB]">{summary.updated_rows}</div>
              </div>
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 text-center">
                <div className="text-xs font-extrabold text-[#475569]">Failed</div>
                <div className="text-xl font-black text-[#DC2626]">{summary.failed_rows}</div>
              </div>
            </div>

            {summary.errors && summary.errors.length > 0 && (
              <div>
                <div className="text-xs font-extrabold text-[#B91C1C] mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Row Error Summary Report:
                </div>
                <div className="max-h-40 overflow-y-auto bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-3 text-xs font-mono space-y-1">
                  {summary.errors.map((err, i) => (
                    <div key={i} className="text-[#B91C1C] border-b border-[#FCA5A5]/40 pb-1 font-bold">
                      Row {err.row}: {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#CBD5E1]">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-xs font-extrabold rounded-lg shadow-sm transition-colors"
              >
                Close Importer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
