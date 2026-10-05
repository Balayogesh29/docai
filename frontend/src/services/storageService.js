import { fetchWithAuth } from './api';

export const storageService = {
  /**
   * Uploads a reference file (.pdf, .docx, .txt, .doc up to 10 MB) to Cloud Storage.
   */
  uploadFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`[storageService] Uploading file "${file.name}" (${file.size} bytes)...`);
      const response = await fetchWithAuth('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      console.log(`[storageService] Upload succeeded for "${file.name}":`, response);
      return response;
    } catch (err) {
      console.error(`[storageService] Upload failed for "${file.name}":`, {
        message: err.message,
        status: err.status,
        data: err.data
      });
      throw err;
    }
  },

  /**
   * Lists all files uploaded by the authenticated user in Cloud Storage.
   */
  getFiles: async () => {
    try {
      return await fetchWithAuth('/api/storage/files');
    } catch (err) {
      console.error('[storageService] Failed to list storage files:', err);
      throw err;
    }
  },

  /**
   * Deletes a file by file_id from Cloud Storage.
   */
  deleteFile: async (fileId) => {
    try {
      return await fetchWithAuth(`/api/storage/files/${fileId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error(`[storageService] Failed to delete file ${fileId}:`, err);
      throw err;
    }
  },
};
