import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, GraduationCap, Phone, ShieldCheck, MapPin } from 'lucide-react';
import { Student, Department, Semester, Section } from '../types';
import { useApp } from '../context/AppContext';
import { SEMESTERS, SECTIONS } from '../data/mockData';

interface StudentModalProps {
  isOpen: boolean;
  studentToEdit?: Student | null;
  defaultDepartment?: Department;
  defaultSemester?: Semester;
  defaultSection?: Section;
  onClose: () => void;
  onSave: (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<void>;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  studentToEdit,
  defaultDepartment = '',
  defaultSemester = SEMESTERS[0],
  defaultSection = 'A',
  onClose,
  onSave,
}) => {
  const { departments } = useApp();
  const isEditing = Boolean(studentToEdit);

  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [department, setDepartment] = useState<Department>(defaultDepartment);
  const [semester, setSemester] = useState<Semester>(defaultSemester);
  const [section, setSection] = useState<Section>(defaultSection);
  const [studentPhone, setStudentPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelation, setGuardianRelation] = useState<Student['guardianRelation']>('Father');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name);
      setRoll(studentToEdit.roll);
      setDepartment(studentToEdit.department);
      setSemester(studentToEdit.semester);
      setSection(studentToEdit.section);
      setStudentPhone(studentToEdit.studentPhone || '');
      setGuardianName(studentToEdit.guardianName || '');
      setGuardianPhone(studentToEdit.guardianPhone || '');
      setGuardianRelation(studentToEdit.guardianRelation || 'Father');
      setAddress(studentToEdit.address || '');
      setRemarks(studentToEdit.remarks || '');
    } else {
      setName('');
      setRoll('');
      setDepartment(defaultDepartment);
      setSemester(defaultSemester);
      setSection(defaultSection);
      setStudentPhone('');
      setGuardianName('');
      setGuardianPhone('');
      setGuardianRelation('Father');
      setAddress('');
      setRemarks('');
    }
    setErrors({});
  }, [studentToEdit, isOpen, defaultDepartment, defaultSemester, defaultSection]);

  if (!isOpen) return null;

  const validate = () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = 'Student Name is required';
    if (!roll.trim()) err.roll = 'Board Roll number is required';
    if (!department) err.department = 'Add a department before enrolling students';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave(
        {
          name: name.trim(),
          roll: roll.trim(),
          department,
          semester,
          section,
          studentPhone: studentPhone.trim(),
          guardianName: guardianName.trim(),
          guardianPhone: guardianPhone.trim(),
          guardianRelation,
          address: address.trim(),
          remarks: remarks.trim(),
        },
        studentToEdit?.id
      );
      onClose();
    } catch (error) {
      console.error('Failed to save student:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              {isEditing ? <Save className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? 'Update Student Record' : 'Enroll New Student'}
              </h3>
              <p className="text-xs text-slate-300">
                Infra Polytechnic Institute • Student & Guardian Profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Academic Info Group */}
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Academic Enrollment</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Tech *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                  {department && !departments.includes(department) && <option value={department}>{department} (archived)</option>}
                  {departments.length === 0 && <option value="">No departments configured</option>}
                </select>
                {errors.department && <span className="text-[11px] text-rose-600 mt-0.5 block">{errors.department}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Semester *</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as Semester)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {SEMESTERS.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Section *</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value as Section)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Student Personal Info */}
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Student Information
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Student Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed Shanto"
                  className={`w-full text-xs bg-slate-50 border rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                    errors.name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.name && <span className="text-[11px] text-rose-600 mt-0.5 block">{errors.name}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    BTEB Board Roll No *
                  </label>
                  <input
                    type="text"
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    placeholder="e.g. 628401"
                    className={`w-full font-mono text-xs bg-slate-50 border rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                      errors.roll ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                  {errors.roll && <span className="text-[11px] text-rose-600 mt-0.5 block">{errors.roll}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="tel"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full pl-8 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guardian Calling Info */}
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-rose-700">
              <ShieldCheck className="w-4 h-4" />
              <span>Guardian Helpline Information (For Absentee Notice & Calls)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guardian Name (Optional)
                </label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="e.g. Md. Rafiqul Islam"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guardian Phone (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-rose-500">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="018XXXXXXXX"
                    className="w-full pl-8 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                <select
                  value={guardianRelation}
                  onChange={(e) => setGuardianRelation(e.target.value as Student['guardianRelation'])}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Guardian">Legal Guardian</option>
                </select>
              </div>
            </div>
          </div>

          {/* Remarks & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Residential Address / Hostel
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Rupatali, Barishal"
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Faculty Note / Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. CR, Hostel Resident"
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (departments.length === 0 && !studentToEdit)}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Student' : 'Save Student'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
