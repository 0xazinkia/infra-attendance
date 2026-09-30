import React, { useEffect, useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Department, Semester, Section, Student } from '../types';
import { SEMESTERS, SECTIONS } from '../data/mockData';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<number>;
  departments: Department[];
  defaultDepartment: Department;
  defaultSemester: Semester;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  departments,
  defaultDepartment,
  defaultSemester,
}) => {
  const [department, setDepartment] = useState<Department>(defaultDepartment);
  const [semester, setSemester] = useState<Semester>(defaultSemester);
  const [section, setSection] = useState<Section>('A');
  const [rawText, setRawText] = useState(
    `628411, Sakib Al Hasan, 01711002233, Md. Mofizul Islam, 01811002233, Father
628412, Tamim Iqbal Joy, 01911002244, Parvin Akter, 01711002244, Mother
628413, Mushfiqur Rahim, 01611002255, Mahbubur Rahman, 01511002255, Father`
  );
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && defaultDepartment) setDepartment(defaultDepartment);
  }, [isOpen, defaultDepartment]);

  if (!isOpen) return null;

  const handleProcessImport = async () => {
    setErrorMsg(null);
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setErrorMsg('Please paste at least one line of student data.');
      return;
    }

    const parsed: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < 2) {
        setErrorMsg(`Line ${i + 1} has insufficient columns. Need at least Roll, Student Name.`);
        return;
      }

      const roll = parts[0];
      const name = parts[1];
      const studentPhone = parts[2] || '';
      const guardianName = parts[3] || 'Guardian';
      const guardianPhone = parts[4] || parts[2] || '';
      const guardianRelation = (parts[5] as Student['guardianRelation']) || 'Father';

      parsed.push({
        roll,
        name,
        department,
        semester,
        section,
        studentPhone,
        guardianName,
        guardianPhone,
        guardianRelation,
        address: '',
        remarks: 'Batch imported',
      });
    }

    setIsImporting(true);
    try {
      await onImport(parsed);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error importing';
      setErrorMsg(msg);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Batch Student Import</h3>
              <p className="text-xs text-slate-300">
                Quickly add multiple students to the Firebase roster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                {departments.length === 0 && <option value="">No departments configured</option>}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as Semester)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as Section)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Comma-Separated Lines (CSV Format)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Format per line: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800">Roll, Student Name, Student Phone, Guardian Name, Guardian Phone, Relation</code>
            </p>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleProcessImport}
            disabled={isImporting || departments.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isImporting ? 'Importing & Syncing...' : 'Import Students'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
