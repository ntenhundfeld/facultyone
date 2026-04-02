import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmPreferenceChange?: (dontAskAgain: boolean) => void;
  itemName: string;
  itemType: string; // e.g., "Faculty Member", "Project", "Course"
  confirmCategoryLabel: string;
  requireTyping?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onConfirmPreferenceChange,
  itemName,
  itemType,
  confirmCategoryLabel,
  requireTyping = false,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const confirmationString = `delete ${itemName}`;

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setDontAskAgain(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = !requireTyping || confirmationInput === confirmationString;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden border border-red-200 dark:border-red-900 flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-red-50 dark:bg-red-900/20">
          <h3 className="font-bold text-lg text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle size={20} />
            Delete {itemType}
          </h3>
          <button 
            onClick={onClose} 
            className="text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
          </p>
          
          {requireTyping && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type <strong>{confirmationString}</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={confirmationString}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                autoFocus
              />
            </div>
          )}

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <span>Don&apos;t ask again for {confirmCategoryLabel}</span>
          </label>

          <div className="pt-2 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (isConfirmed) {
                    onConfirm();
                    onConfirmPreferenceChange?.(dontAskAgain);
                    onClose();
                }
              }}
              disabled={!isConfirmed}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-white ${
                isConfirmed 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-red-300 dark:bg-red-900/50 cursor-not-allowed'
              }`}
            >
              Delete Forever
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
