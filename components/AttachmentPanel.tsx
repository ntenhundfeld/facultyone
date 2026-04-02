import React from 'react';
import { AlertCircle, Download, FileText, Trash2, Upload } from 'lucide-react';
import { AttachmentFile } from '../types';

interface AttachmentPanelProps {
  title: string;
  attachments: AttachmentFile[];
  emptyMessage: string;
  onUpload: () => void;
  onOpen: (attachment: AttachmentFile) => void;
  onDelete: (attachment: AttachmentFile) => void;
  uploadDisabled?: boolean;
  uploadHint?: string | null;
  error?: string | null;
  isBusy?: boolean;
  busyFileId?: string | null;
  accentClassName?: string;
  className?: string;
}

export const AttachmentPanel: React.FC<AttachmentPanelProps> = ({
  title,
  attachments,
  emptyMessage,
  onUpload,
  onOpen,
  onDelete,
  uploadDisabled = false,
  uploadHint = null,
  error = null,
  isBusy = false,
  busyFileId = null,
  accentClassName = 'text-amber-500 dark:text-amber-400',
  className = '',
}) => (
  <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}>
    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
      <h3 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
        <FileText size={18} className={accentClassName} />
        {title}
      </h3>
      <button
        onClick={onUpload}
        disabled={uploadDisabled || isBusy}
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
      >
        <Upload size={14} />
        Upload
      </button>
    </div>

    {(uploadHint || error) && (
      <div className="space-y-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-900/70">
        {uploadHint && <p className="text-slate-500 dark:text-slate-400">{uploadHint}</p>}
        {error && (
          <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    )}

    <div className="space-y-3 p-4">
      {attachments.length === 0 && <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</div>}
      {attachments.map(attachment => {
        const isLegacyEntry = !attachment.storedFileName;
        const isActive = busyFileId === attachment.id;

        return (
          <div
            key={attachment.id}
            className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-shadow hover:shadow-sm dark:border-slate-700"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {attachment.type}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{attachment.name}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {attachment.size} • {attachment.date}
                {isLegacyEntry ? ' • metadata only' : ''}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => onOpen(attachment)}
                disabled={isLegacyEntry || isActive}
                className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                title={isLegacyEntry ? 'Not available for older metadata-only entries' : 'Open file'}
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => onDelete(attachment)}
                disabled={isActive}
                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                title="Delete file"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
