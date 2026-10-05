import { fetchWithAuth } from './api';

export const documentService = {
  /**
   * Retrieves all documents belonging to the authenticated user from Firestore.
   */
  getDocuments: async () => {
    return await fetchWithAuth('/api/documents');
  },

  /**
   * Retrieves a single document by ID from Firestore.
   */
  getDocumentById: async (id) => {
    return await fetchWithAuth(`/api/documents/${id}`);
  },

  /**
   * Creates a new document in Firestore.
   * docData: { title: string, doc_type?: string, content?: dict|list|string }
   */
  createDocument: async (docData) => {
    return await fetchWithAuth('/api/documents', {
      method: 'POST',
      body: JSON.stringify(docData),
    });
  },

  /**
   * Updates an existing document in Firestore.
   * docData: { title?: string, doc_type?: string, content?: dict|list|string }
   */
  updateDocument: async (id, docData) => {
    return await fetchWithAuth(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(docData),
    });
  },

  /**
   * Deletes a document by ID from Firestore.
   */
  deleteDocument: async (id) => {
    return await fetchWithAuth(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  },
};
