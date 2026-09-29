import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Student } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onConfirm: (studentId: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  student,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !student) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(student.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Warning Icon & Header */}
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-slate-900">
            Confirm Student Deletion
          </h3>

          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-slate-900 font-semibold">{student.name}</strong> (Roll:{' '}
            <span className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-bold">
              {student.roll}
            </span>
            ) from Infra Polytechnic Institute records?
          </p>

          <div className="mt-4 p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-left text-xs text-rose-800 space-y-1">
            <p className="font-semibold text-rose-900">⚠️ Irreversible Action:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-700">
              <li>This student will be removed from future attendance rosters.</li>
              <li>Row will be removed and synced in Google Sheets.</li>
              <li>Guardian contact ({student.guardianPhone}) will be detached.</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition rounded-lg hover:bg-slate-200"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete Student'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
