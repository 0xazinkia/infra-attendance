import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  ShieldAlert, 
  Download, 
  UploadCloud, 
  Filter, 
  PhoneCall,
  GraduationCap,
  MessageSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student, Department, Semester, Section } from '../types';
import { SEMESTERS, SECTIONS } from '../data/mockData';
import { StudentModal } from './StudentModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { BulkImportModal } from './BulkImportModal';
import { GuardianCallModal } from './GuardianCallModal';

export const StudentManager: React.FC = () => {
  const { students, departments, addStudent, updateStudent, deleteStudent, deleteStudents, bulkImportStudents } = useApp();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [callModalStudent, setCallModalStudent] = useState<Student | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedDept && selectedDept !== 'all' && !departments.includes(selectedDept)) setSelectedDept('');
  }, [departments, selectedDept]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!selectedDept && !selectedSemester) return [];

    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.guardianPhone && s.guardianPhone.includes(searchQuery)) ||
        (s.guardianName && s.guardianName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDept = !selectedDept || selectedDept === 'all' || s.department === selectedDept;
      const matchSem = !selectedSemester || selectedSemester === 'all' || s.semester === selectedSemester;
      const matchSec = selectedSection === 'all' || s.section === selectedSection;

      return matchSearch && matchDept && matchSem && matchSec;
    }).sort((first, second) => (Number(first.roll) || 0) - (Number(second.roll) || 0));
  }, [students, searchQuery, selectedDept, selectedSemester, selectedSection]);

  const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIds.includes(student.id));
  const someVisibleSelected = filteredStudents.some((student) => selectedStudentIds.includes(student.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  const toggleVisibleStudents = (shouldSelect: boolean) => {
    const visibleIds = new Set(filteredStudents.map((student) => student.id));
    setSelectedStudentIds((current) => shouldSelect
      ? [...new Set([...current, ...visibleIds])]
      : current.filter((id) => !visibleIds.has(id))
    );
  };

  const handleDeleteSelected = async () => {
    const selectedIds = selectedStudentIds.filter((id) => students.some((student) => student.id === id));
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `Permanently delete ${selectedIds.length} selected student record(s)? Attendance and guardian call history will remain.`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      await deleteStudents(selectedIds);
      setSelectedStudentIds((current) => current.filter((id) => !selectedIds.includes(id)));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not delete the selected student records.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleOpenAdd = () => {
    setStudentToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setStudentToEdit(student);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const handleSaveStudent = async (
    data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (existingId && studentToEdit) {
      await updateStudent({
        ...studentToEdit,
        ...data,
      });
    } else {
      await addStudent(data);
    }
  };

  const exportToCSV = () => {
    if (filteredStudents.length === 0) return;
    const headers = [
      'Roll',
      'Name',
      'Department',
      'Semester',
      'Section',
      'Student Phone',
      'Guardian Name',
      'Guardian Phone',
      'Relation',
      'Remarks',
    ];
    const rows = filteredStudents.map((s) => [
      `"${s.roll}"`,
      `"${s.name}"`,
      `"${s.department}"`,
      `"${s.semester}"`,
      `"${s.section}"`,
      `"${s.studentPhone || ''}"`,
      `"${s.guardianName || ''}"`,
      `"${s.guardianPhone || ''}"`,
      `"${s.guardianRelation || ''}"`,
      `"${s.remarks || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Infra_Polytechnic_Students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Metric summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Student & Guardian Directory (CRUD Portal)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Insert new students, update academic records, and maintain guardian contact numbers in Firebase
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void handleDeleteSelected()}
              disabled={selectedStudentIds.length === 0 || isBulkDeleting}
              title="Permanently delete selected student records"
              className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isBulkDeleting ? 'Deleting...' : `Delete selected (${selectedStudentIds.length})`}</span>
            </button>
            <button
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              <UploadCloud className="w-4 h-4 text-slate-500" />
              <span>Bulk CSV Import</span>
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Student</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4">
          {/* Search query input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll, reg no, or guardian phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="" disabled>Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
              <option value="all">All Department</option>
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="" disabled>Select Semester</option>
              {SEMESTERS.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
              <option value="all">All Semester</option>
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {SECTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
              <option value="all">All Sections</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Student Directory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">
              Showing {filteredStudents.length} of {students.length} Total Students
            </span>
          </div>
          <span className="text-slate-500 text-[11px]">
            Infra Polytechnic Institute • Barishal
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-xs text-slate-500">No students found matching current filters.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('all');
                setSelectedSemester('all');
                setSelectedSection('all');
              }}
              className="mt-3 text-xs font-semibold text-emerald-600 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) => toggleVisibleStudents(event.target.checked)}
                      disabled={filteredStudents.length === 0 || isBulkDeleting}
                      aria-label="Select all filtered students"
                      title="Select all filtered students"
                      className="h-4 w-4 accent-emerald-700"
                    />
                  </th>
                  <th className="py-3 px-4 w-14">S/N</th>
                  <th className="py-3 px-4 w-28">Roll No</th>
                  <th className="py-3 px-4 min-w-[180px]">Student Name</th>
                  <th className="py-3 px-4 min-w-[160px]">Dept / Semester</th>
                  <th className="py-3 px-4 w-20">Section</th>
                  <th className="py-3 px-4 min-w-[140px]">Student Mobile</th>
                  <th className="py-3 px-4 min-w-[200px]">Guardian Contact</th>
                  <th className="py-3 px-4 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={(event) => setSelectedStudentIds((current) => event.target.checked
                          ? [...current, student.id]
                          : current.filter((id) => id !== student.id)
                        )}
                        disabled={isBulkDeleting}
                        aria-label={`Select ${student.name}, roll ${student.roll}`}
                        className="h-4 w-4 accent-emerald-700"
                      />
                    </td>
                    <td className="py-3 px-4 text-slate-500">{index + 1}</td>
                    {/* Roll */}
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {student.roll}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{student.name}</div>
                      {student.remarks && (
                        <span className="text-[10px] text-slate-500 italic block mt-0.5">
                          {student.remarks}
                        </span>
                      )}
                    </td>

                    {/* Department & Semester */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{student.department}</div>
                      <div className="text-[11px] text-slate-500">{student.semester}</div>
                    </td>

                    {/* Section */}
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs">
                        Sec {student.section}
                      </span>
                    </td>

                    {/* Student Mobile */}
                    <td className="py-3 px-4 font-mono">
                      {student.studentPhone ? (
                        <a
                          href={`tel:${student.studentPhone}`}
                          className="flex items-center gap-1 text-slate-700 hover:text-emerald-700"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{student.studentPhone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">None</span>
                      )}
                    </td>

                    {/* Guardian Contact & Calling */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-between gap-1">
                        <div>
                          <div className="font-medium text-slate-800 text-xs">
                            {student.guardianName || 'Guardian'}
                            <span className="text-[10px] text-slate-500 ml-1">
                              ({student.guardianRelation})
                            </span>
                          </div>
                          <div className="font-mono font-bold text-emerald-800 text-xs mt-0.5">
                            {student.guardianPhone || 'No number'}
                          </div>
                        </div>

                        {/* Direct Call Guardian Button */}
                        {student.guardianPhone && (
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${student.guardianPhone}`}
                              title={`Direct Call Guardian (${student.guardianName})`}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => setCallModalStudent(student)}
                              title="Open Call Notice / WhatsApp Helper"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          title="Edit Student Information (Update)"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(student)}
                          title="Delete Student (Destructive operation)"
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
      </div>

      {/* Insert / Update Student Modal */}
      <StudentModal
        isOpen={isModalOpen}
        studentToEdit={studentToEdit}
        defaultDepartment={selectedDept !== 'all' ? (selectedDept as Department) : departments[0] || ''}
        defaultSemester={selectedSemester && selectedSemester !== 'all' ? (selectedSemester as Semester) : SEMESTERS[0]}
        defaultSection={selectedSection !== 'all' ? (selectedSection as Section) : 'A'}
        onClose={() => {
          setIsModalOpen(false);
          setStudentToEdit(null);
        }}
        onSave={handleSaveStudent}
      />

      {/* Delete Confirmation Modal (Required for destructive actions) */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        student={studentToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setStudentToDelete(null);
        }}
        onConfirm={async (id) => {
          await deleteStudent(id);
          setSelectedStudentIds((current) => current.filter((selectedId) => selectedId !== id));
        }}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkOpen}
        departments={departments}
        defaultDepartment={selectedDept !== 'all' ? (selectedDept as Department) : departments[0] || ''}
        defaultSemester={selectedSemester && selectedSemester !== 'all' ? (selectedSemester as Semester) : SEMESTERS[0]}
        onClose={() => setIsBulkOpen(false)}
        onImport={async (newStudents) => {
          return await bulkImportStudents(newStudents);
        }}
      />

      {/* Guardian Call / SMS Dialog */}
      {callModalStudent && (
        <GuardianCallModal
          student={callModalStudent}
          onClose={() => setCallModalStudent(null)}
        />
      )}
    </div>
  );
};
