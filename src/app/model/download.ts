/**
 * Handing a file the app built (an audit export, an import's failed rows) to the browser as a
 * download. One place, so every export names and types its file the same way.
 */
export interface DownloadFile {
  filename: string;
  contentType: string;
  content: string;
}

export const saveFile = (file: DownloadFile) => {
  const url = URL.createObjectURL(new Blob([file.content], { type: file.contentType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
};
