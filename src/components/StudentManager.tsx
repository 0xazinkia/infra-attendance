import React, { useState, useMemo } from 'react';
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
import { DEPARTMENTS, SEMESTERS, SECTIONS } from '../data/mockData';
import { StudentModal } from './StudentModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { BulkImportModal } from './BulkImportModal';
import { GuardianCallModal } from './GuardianCallModal';

export const StudentManager: React.FC = () => {
  const { students, addStudent, updateStudent, deleteStudent, bulkImportStudents } = useApp();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [callModalStudent, setCallModalStudent] = useState<Student | null>(null);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.guardianPhone && s.guardianPhone.includes(searchQuery)) ||
        (s.guardianName && s.guardianName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDept = selectedDept === 'all' || s.department === selectedDept;
      const matchSem = selectedSemester === 'all' || s.semester === selectedSemester;
      const matchSec = selectedSection === 'all' || s.section === selectedSection;

      return matchSearch && matchDept && matchSem && matchSec;
    });
  }, [students, searchQuery, selectedDept, selectedSemester, selectedSection]);

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
              Insert new students, update academic records, maintain guardian contact numbers & sync with Google Sheets
            </p>
          </div>

          <div className="flex items-center gap-2">
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
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Semesters</option>
              {SEMESTERS.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Sections</option>
              {SECTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
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
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition">
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
        defaultDepartment={selectedDept !== 'all' ? (selectedDept as Department) : 'Computer Technology'}
        defaultSemester={selectedSemester !== 'all' ? (selectedSemester as Semester) : '4th Semester'}
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
        }}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkOpen}
        defaultDepartment={selectedDept !== 'all' ? (selectedDept as Department) : 'Computer Technology'}
        defaultSemester={selectedSemester !== 'all' ? (selectedSemester as Semester) : '4th Semester'}
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
