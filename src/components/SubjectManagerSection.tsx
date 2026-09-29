import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  RotateCcw,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SubjectItem, Department, Semester } from '../types';
import { DEPARTMENTS, SEMESTERS } from '../data/mockData';

export const SubjectManagerSection: React.FC = () => {
  const {
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    seedPresetSubjects,
    clearAllSubjects,
    sheetStatus,
  } = useApp();

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('Computer Technology');
  const [selectedSem, setSelectedSem] = useState<string>('4th Semester');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  // Form State
  const [formDept, setFormDept] = useState<Department>('Computer Technology');
  const [formSem, setFormSem] = useState<Semester>('4th Semester');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchDept = selectedDept === 'all' || s.department === selectedDept;
      const matchSem = selectedSem === 'all' || s.semester === selectedSem;
      const matchSearch =
        searchQuery.trim() === '' ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSem && matchSearch;
    });
  }, [subjects, selectedDept, selectedSem, searchQuery]);

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingSubject(null);
    setFormDept(selectedDept !== 'all' ? (selectedDept as Department) : 'Computer Technology');
    setFormSem(selectedSem !== 'all' ? (selectedSem as Semester) : '4th Semester');
    setFormCode('');
    setFormName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (subject: SubjectItem) => {
    setEditingSubject(subject);
    setFormDept(subject.department);
    setFormSem(subject.semester);
    setFormCode(subject.code);
    setFormName(subject.name);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle save (Add or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCode.trim()) {
      setFormError('Subject code is required (e.g. 66641).');
      return;
    }
    if (!formName.trim()) {
      setFormError('Subject title/name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubject) {
        await updateSubject({
          ...editingSubject,
          code: formCode.trim(),
          name: formName.trim(),
          department: formDept,
          semester: formSem,
        });
        showFeedback('success', `Subject "${formName.trim()}" updated successfully.`);
      } else {
        await addSubject(formCode.trim(), formName.trim(), formDept, formSem);
        showFeedback('success', `Subject "${formName.trim()}" added successfully.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving subject';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSubject(subjectToDelete.id);
      showFeedback('success', `Subject [${subjectToDelete.code}] deleted.`);
      setSubjectToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting subject';
      showFeedback('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4 text-teal-700" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Department & Semester Subject Management
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamically add, update, and delete academic courses and subjects. Configured subjects are used for daily attendance and automatically synced with Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Subject</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`mt-4 p-3 rounded-xl flex items-center gap-2.5 text-xs animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Department */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Department
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">All Departments ({DEPARTMENTS.length})</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Semester */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Semester
          </label>
          <select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">All Semesters (1st - 8th)</option>
            {SEMESTERS.map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Search Code / Title
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. 66641 or OOP"
              className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Total Badge & Quick Reset */}
        <div className="flex flex-col justify-end">
          <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-white border border-slate-200">
            <span className="text-slate-500 font-medium">Subjects found:</span>
            <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {filteredSubjects.length} of {subjects.length}
            </span>
          </div>
        </div>
      </div>

      {/* Subjects Table / List */}
      <div className="mt-4 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
        {filteredSubjects.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">No subjects found for current filter</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedDept !== 'all' ? selectedDept : 'All departments'} •{' '}
                {selectedSem !== 'all' ? selectedSem : 'All semesters'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleOpenAdd}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Subject</span>
              </button>

              {subjects.length === 0 && (
                <button
                  onClick={seedPresetSubjects}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Seed Standard BTEB Subjects</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-28">Subject Code</th>
                  <th className="py-3 px-4 min-w-[220px]">Subject Name / Course Title</th>
                  <th className="py-3 px-4 min-w-[180px]">Department</th>
                  <th className="py-3 px-4 w-32">Semester</th>
                  <th className="py-3 px-4 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {sub.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {sub.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {sub.department}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[11px] border border-emerald-100">
                        {sub.semester}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          title="Edit Subject"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSubjectToDelete(sub)}
                          title="Delete Subject"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info & Optional seed actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Total {subjects.length} active subject{subjects.length === 1 ? '' : 's'} registered in system
            </span>
            {sheetStatus.spreadsheetId && (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                • <FileSpreadsheet className="w-3 h-3 text-emerald-600 inline" /> Synced with Google Sheets
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {subjects.length < 5 && (
              <button
                onClick={seedPresetSubjects}
                className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Preset Standard BTEB Subjects</span>
              </button>
            )}
            {subjects.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all subjects? This cannot be undone.')) {
                    clearAllSubjects();
                  }
                }}
                className="text-slate-400 hover:text-rose-600 hover:underline transition text-[11px]"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {editingSubject ? 'Edit Subject Details' : 'Add New Academic Subject'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {editingSubject ? 'Modify subject code or course title' : 'Enter subject information for attendance'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Department
                </label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value as Department)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Semester
                </label>
                <select
                  value={formSem}
                  onChange={(e) => setFormSem(e.target.value as Semester)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {SEMESTERS.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Code */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Subject Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. 66641"
                  className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Subject Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Subject Title / Course Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Object Oriented Programming (Java/Python)"
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingSubject
                    ? 'Update Subject'
                    : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Subject?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to delete this course from the curriculum?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-800">
                [{subjectToDelete.code}] {subjectToDelete.name}
              </p>
              <p className="text-slate-500 text-[11px]">
                {subjectToDelete.department} • {subjectToDelete.semester}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
