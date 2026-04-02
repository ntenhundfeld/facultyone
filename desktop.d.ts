export {};

declare global {
  interface Window {
    academicDevOpsDesktop?: {
      isDesktop: true;
      getDefaultDataFileInfo: () => Promise<{ path: string; name: string }>;
      ensureDataFile: (options: {
        path?: string;
        initialContents: string;
      }) => Promise<{ path: string; name: string; contents: string; created: boolean }>;
      readDataFile: (filePath: string) => Promise<string>;
      writeDataFile: (filePath: string, contents: string) => Promise<void>;
      chooseDataFile: (options?: {
        defaultPath?: string;
        suggestedName?: string;
      }) => Promise<{ path: string; name: string } | null>;
      importAttachments: (options: {
        dataFilePath: string;
        scope: 'research' | 'teaching' | 'service' | 'personnel';
        parentId: string;
      }) => Promise<Array<{
        originalName: string;
        storedFileName: string;
        sizeBytes: number;
        copiedAt: string;
      }>>;
      openAttachment: (options: {
        dataFilePath: string;
        storedFileName: string;
      }) => Promise<string>;
      deleteAttachment: (options: {
        dataFilePath: string;
        storedFileName: string;
      }) => Promise<void>;
    };
  }
}
