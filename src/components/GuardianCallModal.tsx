import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MessageSquare, 
  Check, 
  Copy, 
  Clock, 
  User, 
  AlertTriangle,
  Send,
  Building,
  Save
} from 'lucide-react';
import { Student } from '../types';
import { useApp } from '../context/AppContext';

interface GuardianCallModalProps {
  student: Student;
  currentSubject?: string;
  attendanceDate?: string;
  onClose: () => void;
}

export const GuardianCallModal: React.FC<GuardianCallModalProps> = ({
  student,
  currentSubject = 'General Class',
  attendanceDate = new Date().toISOString().split('T')[0],
  onClose,
}) => {
  const { addCallLog } = useApp();
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'answered' | 'unreachable' | 'switched_off' | 'left_message' | 'promised_attendance'>('answered');
  const [reason, setReason] = useState<string>('Absent in Class');
  const [facultyNote, setFacultyNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Clean phone number for WhatsApp (remove leading 0 and prepend 880 for Bangladesh)
  const rawGuardianPhone = student.guardianPhone.replace(/[^0-9]/g, '');
  const cleanPhoneForWa = rawGuardianPhone.startsWith('880')
    ? rawGuardianPhone
    : rawGuardianPhone.startsWith('0')
    ? `880${rawGuardianPhone.substring(1)}`
    : `880${rawGuardianPhone}`;

  // Pre-configured SMS / WhatsApp templates
  const banglaTemplate = `সম্মানিত অভিভাবক, আপনার সন্তান ${student.name} (রোল: ${student.roll}, ডিপার্টমেন্ট: ${student.department}) আজ ${attendanceDate} তারিখে ইনফ্রা পলিটেকনিক ইনস্টিটিউট-এ "${currentSubject}" ক্লাসে অনুপস্থিত রয়েছে। অনুগ্রহ করে অনুপস্থিতির কারণ জানান বা অফিসে যোগাযোগ করুন। ধন্যবাদ, ইনফ্রা পলিটেকনিক প্রশাসন।`;

  const englishTemplate = `Dear Guardian, your ward ${student.name} (Roll: ${student.roll}, Dept: ${student.department}) was marked ABSENT today (${attendanceDate}) in "${currentSubject}" class at Infra Polytechnic Institute. Please ensure regular attendance. - IPI Administration`;

  const urgentTemplate = `জরুরী নোটিশ: ইনফ্রা পলিটেকনিক ইনস্টিটিউটের শিক্ষার্থী ${student.name} (রোল: ${student.roll})-এর ক্লাসে উপস্থিতি কম। অভিভাবককে অতিসত্বর সংশ্লিষ্ট বিভাগীয় প্রধানের (HoD) সাথে সাক্ষাত করার অনুরোধ করা হচ্ছে।`;

  const copyToClipboard = (text: string, templateKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(templateKey);
    setTimeout(() => setCopiedTemplate(null), 2500);
  };

  const handleSaveCallLog = async () => {
    setIsSaving(true);
    try {
      await addCallLog({
        studentId: student.id,
        studentName: student.name,
        roll: student.roll,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        reason,
        status: callStatus,
        note: facultyNote || `Call made regarding ${reason} on ${attendanceDate}`,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error logging call:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Phone className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Guardian Direct Helpline</h3>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  Infra Polytechnic
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Contact guardian regarding absence, performance or academic notices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Student & Guardian Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Student Details
              </span>
              <h4 className="text-base font-bold text-slate-800 mt-0.5">{student.name}</h4>
              <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                <p>
                  <strong className="text-slate-700">Roll:</strong>{' '}
                  <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                    {student.roll}
                  </span>
                </p>
                <p>
                  {student.department} • {student.semester}
                </p>
                <p>
                  Section: {student.section}
                </p>
                {student.studentPhone && (
                  <p className="flex items-center gap-1.5 text-slate-700 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Student Mobile: {student.studentPhone}</span>
                    <a
                      href={`tel:${student.studentPhone}`}
                      className="text-emerald-600 hover:underline font-medium text-[11px]"
                    >
                      (Call)
                    </a>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                    Guardian Information
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
                    {student.guardianRelation}
                  </span>
                </div>
                <h5 className="text-sm font-bold text-slate-800 mt-1">{student.guardianName}</h5>
                <p className="text-base font-mono font-bold text-slate-900 mt-0.5">
                  {student.guardianPhone || 'No number provided'}
                </p>
              </div>

              {/* Direct Calling Buttons */}
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={`tel:${student.guardianPhone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg text-xs transition shadow-sm"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Now</span>
                </a>
                <a
                  href={`https://wa.me/${cleanPhoneForWa}?text=${encodeURIComponent(banglaTemplate)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg text-xs transition shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Notice Templates for Absentee Notification */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>Instant Absentee SMS / Notice Templates</span>
              </label>
              <span className="text-[11px] text-slate-500">Click to copy & paste into SMS/WhatsApp</span>
            </div>

            <div className="space-y-2.5">
              {/* Bangla template */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    🇧🇩 বাংলা নোটিশ (অনুপস্থিতি বার্তা)
                  </span>
                  <button
                    onClick={() => copyToClipboard(banglaTemplate, 'bn')}
                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded transition"
                  >
                    {copiedTemplate === 'bn' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">{banglaTemplate}</p>
              </div>

              {/* English template */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    🇬🇧 English Notice (Absentee Warning)
                  </span>
                  <button
                    onClick={() => copyToClipboard(englishTemplate, 'en')}
                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded transition"
                  >
                    {copiedTemplate === 'en' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">{englishTemplate}</p>
              </div>
            </div>
          </div>

          {/* Call Outcome Logging Section */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Log Guardian Call Outcome (Syncs to Google Sheets)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Call Purpose</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Absent in Class">Absent in Class (আজ অনুপস্থিত)</option>
                  <option value="Repeated Absence">Repeated Absence (ধারাবাহিক অনুপস্থিতি)</option>
                  <option value="Short Attendance (<75%)">Short Attendance (&lt;75% বোর্ড পরীক্ষা ঝুঁকি)</option>
                  <option value="Disciplinary or Conduct">Disciplinary / আচরণ সংক্রান্ত</option>
                  <option value="General Inquiry">General Academic Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Call Status / Outcome</label>
                <select
                  value={callStatus}
                  onChange={(e) => setCallStatus(e.target.value as any)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                >
                  <option value="answered">✅ Answered - Spoke with Guardian</option>
                  <option value="promised_attendance">🤝 Promised to Attend Next Class</option>
                  <option value="left_message">💬 Left SMS/WhatsApp Message</option>
                  <option value="unreachable">⚠️ Unreachable / Did Not Answer</option>
                  <option value="switched_off">❌ Phone Switched Off</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Faculty Note / Conversation Remarks (Optional)
              </label>
              <textarea
                value={facultyNote}
                onChange={(e) => setFacultyNote(e.target.value)}
                placeholder="e.g., Father informed student is recovering from viral fever, will attend Monday with medical certificate..."
                rows={2}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition"
          >
            Close
          </button>

          <button
            onClick={handleSaveCallLog}
            disabled={isSaving || savedSuccess}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition ${
              savedSuccess
                ? 'bg-emerald-700'
                : 'bg-slate-900 hover:bg-slate-800'
            } disabled:opacity-50`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Logged & Saved!</span>
              </>
            ) : isSaving ? (
              <span>Saving log...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Call Log to Google Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
