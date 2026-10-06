import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, UploadCloud, X } from 'lucide-react';
import { Department, Section, Semester } from '../types';
import { SECTIONS, SEMESTERS } from '../data/mockData';

export interface StudentContactImportRow {
  roll: string;
  studentPhone: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  rowNumber: number;
}

export interface StudentContactImportFailure {
  roll: string;
  rowNumber: number;
  reason: string;
}

export interface StudentContactImportResult {
  savedCount: number;
  failures: StudentContactImportFailure[];
}

export interface StudentContactImportScope {
  department: Department;
  semester: Semester;
  section: Section;
}

interface BulkNumberImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  defaultDepartment: Department;
  defaultSemester: Semester;
  defaultSection: Section;
  onImport: (
    rows: StudentContactImportRow[],
    failures: StudentContactImportFailure[],
    scope: StudentContactImportScope
  ) => Promise<StudentContactImportResult>;
}

interface CsvRecord {
  cells: string[];
  lineNumber: number;
}

const parseCsv = (input: string): CsvRecord[] => {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let field = '';
  let inQuotes = false;
  let lineNumber = 1;
  let recordLineNumber = 1;

  for (let index = 0; index < input.length; index++) {
    const character = input[index];

    if (inQuotes) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else if (character === '\r' || character === '\n') {
        field += '\n';
        if (character === '\r' && input[index + 1] === '\n') index++;
        lineNumber++;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) throw new Error(`Invalid quote in CSV near line ${lineNumber}.`);
      inQuotes = true;
    } else if (character === ',') {
      cells.push(field.trim());
      field = '';
    } else if (character === '\r' || character === '\n') {
      cells.push(field.trim());
      if (cells.some(Boolean)) records.push({ cells, lineNumber: recordLineNumber });
      cells = [];
      field = '';
      if (character === '\r' && input[index + 1] === '\n') index++;
      lineNumber++;
      recordLineNumber = lineNumber;
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error('CSV has an unclosed quoted value.');
  cells.push(field.trim());
  if (cells.some(Boolean)) records.push({ cells, lineNumber: recordLineNumber });
  return records;
};

const normalizeHeader = (value: string): string => value.trim().toLowerCase().replace(/[^a-z]/g, '');

const headerAliases: Record<string, keyof Omit<StudentContactImportRow, 'rowNumber'>> = {
  roll: 'roll',
  rollno: 'roll',
  classroll: 'roll',
  boardroll: 'roll',
  studentnumber: 'studentPhone',
  studentphone: 'studentPhone',
  studentmobile: 'studentPhone',
  guardianname: 'guardianName',
  guardiannumber: 'guardianPhone',
  guardianphone: 'guardianPhone',
  relation: 'guardianRelation',
  guardianrelation: 'guardianRelation',
};

const parseImportRows = (input: string) => {
  const records = parseCsv(input.replace(/^\uFEFF/, ''));
  const failures: StudentContactImportFailure[] = [];
  if (records.length === 0) throw new Error('The selected CSV file is empty.');

  const firstRow = records[0];
  const firstCell = normalizeHeader(firstRow.cells[0] || '');
  const hasHeader = ['roll', 'rollno', 'classroll', 'boardroll'].includes(firstCell);
  let columnIndexes = {
    roll: 0,
    studentPhone: 1,
    guardianName: 2,
    guardianPhone: 3,
    guardianRelation: 4,
  };
  let dataRecords = records;

  if (hasHeader) {
    const indexes: Partial<Record<keyof typeof columnIndexes, number>> = {};
    firstRow.cells.forEach((cell, index) => {
      const key = headerAliases[normalizeHeader(cell)];
      if (key && indexes[key] === undefined) indexes[key] = index;
    });
    const requiredColumns: (keyof typeof columnIndexes)[] = [
      'roll',
      'studentPhone',
      'guardianName',
      'guardianPhone',
      'guardianRelation',
    ];
    const missingColumns = requiredColumns.filter((column) => indexes[column] === undefined);
    if (missingColumns.length > 0) {
      throw new Error(`CSV header is missing required columns: ${missingColumns.join(', ')}.`);
    }
    columnIndexes = { ...columnIndexes, ...indexes };
    dataRecords = records.slice(1);
  }

  const rows: StudentContactImportRow[] = [];
  dataRecords.forEach(({ cells, lineNumber }) => {
    if (cells.length < 5) {
      failures.push({
        roll: cells[columnIndexes.roll] || '',
        rowNumber: lineNumber,
        reason: 'Expected five columns: Roll, Student Number, Guardian Name, Guardian Number, Relation.',
      });
      return;
    }

    rows.push({
      roll: cells[columnIndexes.roll] || '',
      studentPhone: cells[columnIndexes.studentPhone] || '',
      guardianName: cells[columnIndexes.guardianName] || '',
      guardianPhone: cells[columnIndexes.guardianPhone] || '',
      guardianRelation: cells[columnIndexes.guardianRelation] || '',
      rowNumber: lineNumber,
    });
  });
  return { rows, failures };
};

export const BulkNumberImportModal: React.FC<BulkNumberImportModalProps> = ({
  isOpen,
  onClose,
  departments,
  defaultDepartment,
  defaultSemester,
  defaultSection,
  onImport,
}) => {
  const [department, setDepartment] = useState<Department>(defaultDepartment);
  const [semester, setSemester] = useState<Semester>(defaultSemester);
  const [section, setSection] = useState<Section>(defaultSection);
  const [rawText, setRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<StudentContactImportResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDepartment(defaultDepartment);
      setSemester(defaultSemester);
      setSection(defaultSection);
      setRawText('');
      setErrorMessage(null);
      setResult(null);
    }
  }, [isOpen, defaultDepartment, defaultSemester, defaultSection]);

  if (!isOpen) return null;

  const handleImport = async () => {
    setErrorMessage(null);
    if (!rawText.trim()) {
      setErrorMessage('Paste at least one CSV row to continue.');
      return;
    }

    setIsImporting(true);
    try {
      const parsed = parseImportRows(rawText);
      setResult(await onImport(parsed.rows, parsed.failures, { department, semester, section }));
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not import the CSV file.');
    } finally {
      setIsImporting(false);
    }
  };

  const startAnotherImport = () => {
    setRawText('');
    setErrorMessage(null);
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-number-import-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-slate-900 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-400/30 bg-teal-500/20 text-teal-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 id="bulk-number-import-title" className="text-base font-bold">
                Bulk Student Number Import
              </h3>
              <p className="text-xs text-slate-300">Update existing students by matching their roll.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bulk number import"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="overflow-y-auto p-6">
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />
                Import complete
              </div>
              <p className="mt-1 text-xs text-emerald-800">
                Contact details saved for {result.savedCount} student(s).
              </p>
            </div>

            {result.failures.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                  <AlertCircle className="h-4 w-4" />
                  {result.failures.length} row(s) were not saved
                </div>
                <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                  {result.failures.map((failure, index) => (
                    <div key={`${failure.rowNumber}-${failure.roll}-${index}`} className="p-3 text-xs">
                      <p className="font-semibold text-slate-800">
                        CSV row {failure.rowNumber}{failure.roll ? ` · Roll ${failure.roll}` : ''}
                      </p>
                      <p className="mt-1 text-rose-700">{failure.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                Every valid CSV row matched and was saved.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={startAnotherImport}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Import another file
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="bulk-number-department" className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                    Department
                  </label>
                  <select
                    id="bulk-number-department"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    disabled={departments.length === 0}
                    className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                  >
                    {departments.map((item) => <option key={item} value={item}>{item}</option>)}
                    {departments.length === 0 && <option value="">No departments configured</option>}
                  </select>
                </div>
                <div>
                  <label htmlFor="bulk-number-semester" className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                    Semester
                  </label>
                  <select
                    id="bulk-number-semester"
                    value={semester}
                    onChange={(event) => setSemester(event.target.value as Semester)}
                    className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {SEMESTERS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="bulk-number-section" className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                    Section
                  </label>
                  <select
                    id="bulk-number-section"
                    value={section}
                    onChange={(event) => setSection(event.target.value as Section)}
                    className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {SECTIONS.map((item) => <option key={item} value={item}>Section {item}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="bulk-number-csv" className="block text-xs font-bold uppercase tracking-wide text-slate-700">
                  Comma-Separated Lines (CSV Format)
                </label>
                <p className="mb-2 mt-1 text-[11px] text-slate-500">
                  Format per line: <code className="rounded bg-slate-100 px-1 py-0.5 text-emerald-800">Roll, Student Number, Guardian Name, Guardian Number, Relation</code>.
                  Header row is optional. Leave a contact value blank to keep the existing value.
                </p>
                <textarea
                  id="bulk-number-csv"
                  rows={8}
                  value={rawText}
                  onChange={(event) => {
                    setRawText(event.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder={'Roll, Student Number, Guardian Name, Guardian Number, Relation\n628411, 01711002233, Md. Mofizul Islam, 01811002233, Father\n628412, 01911002244, Parvin Akter, 01711002244, Mother'}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  Rolls are matched only within the selected department, semester, and section. Unmatched or invalid rows will appear in the result.
                </p>
              </div>
              {errorMessage && (
                <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={isImporting || departments.length === 0}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                {isImporting ? 'Matching and saving...' : 'Import contact details'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
