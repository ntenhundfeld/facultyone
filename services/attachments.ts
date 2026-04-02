import { AttachmentFile } from '../types';

export type AttachmentScope = 'research' | 'teaching' | 'service' | 'personnel';

interface ImportedAttachmentPayload {
  originalName: string;
  storedFileName: string;
  sizeBytes: number;
  copiedAt: string;
}

const getDesktopBridge = () => window.academicDevOpsDesktop ?? null;

const formatFileSize = (sizeBytes: number) => {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${sizeBytes} B`;
};

export const getAttachmentType = (fileName: string): AttachmentFile['type'] => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    return 'pdf';
  }

  if (extension === 'doc' || extension === 'docx' || extension === 'pages') {
    return 'doc';
  }

  if (extension === 'xls' || extension === 'xlsx' || extension === 'csv') {
    return 'xls';
  }

  if (extension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'tif', 'tiff'].includes(extension)) {
    return 'image';
  }

  return 'other';
};

const toAttachmentFile = (payload: ImportedAttachmentPayload, index: number): AttachmentFile => ({
  id: `file-${Date.now()}-${index}`,
  name: payload.originalName,
  type: getAttachmentType(payload.originalName),
  size: formatFileSize(payload.sizeBytes),
  date: payload.copiedAt.split('T')[0] ?? new Date().toISOString().split('T')[0],
  storedFileName: payload.storedFileName,
});

export const importDesktopAttachments = async (options: {
  dataFilePath: string;
  scope: AttachmentScope;
  parentId: string;
}) => {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge) {
    throw new Error('Desktop attachment support is not available in this runtime.');
  }

  const imported = await desktopBridge.importAttachments(options);
  return imported.map((payload, index) => toAttachmentFile(payload, index));
};

export const openDesktopAttachment = async (dataFilePath: string, attachment: AttachmentFile) => {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge) {
    throw new Error('Desktop attachment support is not available in this runtime.');
  }

  if (!attachment.storedFileName) {
    throw new Error('This file entry was created before local attachment storage was enabled.');
  }

  const error = await desktopBridge.openAttachment({
    dataFilePath,
    storedFileName: attachment.storedFileName,
  });

  if (error) {
    throw new Error(error);
  }
};

export const deleteDesktopAttachment = async (dataFilePath: string, attachment: AttachmentFile) => {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge || !attachment.storedFileName) {
    return;
  }

  await desktopBridge.deleteAttachment({
    dataFilePath,
    storedFileName: attachment.storedFileName,
  });
};
