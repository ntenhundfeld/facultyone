import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('academicDevOpsDesktop', {
  isDesktop: true,
  getDefaultDataFileInfo: () => ipcRenderer.invoke('storage:getDefaultDataFileInfo'),
  ensureDataFile: options => ipcRenderer.invoke('storage:ensureDataFile', options),
  readDataFile: filePath => ipcRenderer.invoke('storage:readDataFile', filePath),
  writeDataFile: (filePath, contents) =>
    ipcRenderer.invoke('storage:writeDataFile', {
      path: filePath,
      contents,
    }),
  chooseDataFile: options => ipcRenderer.invoke('storage:chooseDataFile', options),
});
