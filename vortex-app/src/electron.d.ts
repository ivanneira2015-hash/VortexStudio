interface ElectronAPI {
  isElectron: true
  openFolder: (path: string) => Promise<void>
  saveFile: (filePath: string, content: string) => Promise<{ ok: boolean }>
  getProjectsDir: () => Promise<string>
  getBuildsDir: () => Promise<string>
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

export {}
