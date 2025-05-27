"use client";

import React, { useState, useEffect } from 'react';
import './admin.css';

interface Document {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  size?: number;
  uploadedAt?: string;
  metadata?: {
    type?: string;
    source?: string;
    year?: string;
    description?: string;
  };
}

interface VectorStoreStats {
  totalFiles: number;
  completedFiles: number;
  processingFiles: number;
  failedFiles: number;
}

export default function AdminPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<VectorStoreStats | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, setUploadProgress] = useState<Record<string, number>>({});
  const [newDocMetadata, setNewDocMetadata] = useState({
    type: 'guidelines',
    source: 'house',
    year: new Date().getFullYear().toString(),
    description: ''
  });

  // Document type options
  const documentTypes = [
    { value: 'guidelines', label: 'Guidelines & Procedures' },
    { value: 'appropriations', label: 'Appropriations Bills' },
    { value: 'committee-report', label: 'Committee Reports' },
    { value: 'policy', label: 'Policy Documents' },
    { value: 'legislation', label: 'Legislation' },
    { value: 'analysis', label: 'Analysis & Research' },
    { value: 'other', label: 'Other' }
  ];

  const documentSources = [
    { value: 'house', label: 'House of Representatives' },
    { value: 'senate', label: 'Senate' },
    { value: 'crs', label: 'Congressional Research Service' },
    { value: 'gao', label: 'Government Accountability Office' },
    { value: 'omb', label: 'Office of Management and Budget' },
    { value: 'agency', label: 'Federal Agency' },
    { value: 'other', label: 'Other' }
  ];

  // Load documents and stats on component mount
  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, []);

  async function fetchDocuments() {
    try {
      const response = await fetch('/api/admin/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch('/api/admin/vector-store-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      // Add document to UI immediately
      const newDoc: Document = {
        id: tempId,
        filename: file.name,
        status: 'uploading',
        size: file.size,
        metadata: { ...newDocMetadata }
      };
      
      setDocuments(prev => [...prev, newDoc]);
      setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('metadata', JSON.stringify(newDocMetadata));

        const response = await fetch('/api/admin/upload-document', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          
          // Update document with real ID and processing status
          setDocuments(prev => prev.map(doc => 
            doc.id === tempId 
              ? { 
                  ...doc, 
                  id: result.fileId, 
                  status: 'processing',
                  uploadedAt: new Date().toISOString()
                }
              : doc
          ));

          // Start polling for processing status
          pollDocumentStatus(result.fileId);
        } else {
          // Handle upload error
          setDocuments(prev => prev.map(doc => 
            doc.id === tempId ? { ...doc, status: 'failed' } : doc
          ));
        }
      } catch (error) {
        console.error('Upload error:', error);
        setDocuments(prev => prev.map(doc => 
          doc.id === tempId ? { ...doc, status: 'failed' } : doc
        ));
      }

      setUploadProgress(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [tempId]: _unused, ...rest } = prev;
        return rest;
      });
    }

    setIsUploading(false);
    
    // Clear the file input
    event.target.value = '';
  }

  async function pollDocumentStatus(fileId: string) {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/admin/document-status/${fileId}`);
        if (response.ok) {
          const { status } = await response.json();
          
          setDocuments(prev => prev.map(doc => 
            doc.id === fileId ? { ...doc, status } : doc
          ));

          if (status === 'completed' || status === 'failed') {
            fetchStats(); // Refresh stats
            return;
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 10000); // Poll every 10 seconds
      }
    };

    setTimeout(poll, 2000); // Start polling after 2 seconds
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/admin/documents/${documentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        fetchStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  function getStatusIcon(status: Document['status']) {
    switch (status) {
      case 'uploading': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>📚 Document Management</h1>
        <p>Manage documents in your Mosaic knowledge base</p>
      </header>

      {/* Statistics Panel */}
      {stats && (
        <div className="stats-panel">
          <div className="stat-card">
            <div className="stat-number">{stats.totalFiles}</div>
            <div className="stat-label">Total Files</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.completedFiles}</div>
            <div className="stat-label">Ready</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.processingFiles}</div>
            <div className="stat-label">Processing</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.failedFiles}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="upload-section">
        <h2>📤 Upload New Documents</h2>
        
        <div className="upload-metadata">
          <div className="metadata-row">
            <div className="metadata-field">
              <label htmlFor="doc-type">Document Type</label>
              <select 
                id="doc-type"
                value={newDocMetadata.type}
                onChange={(e) => setNewDocMetadata(prev => ({ ...prev, type: e.target.value }))}
              >
                {documentTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="metadata-field">
              <label htmlFor="doc-source">Source</label>
              <select 
                id="doc-source"
                value={newDocMetadata.source}
                onChange={(e) => setNewDocMetadata(prev => ({ ...prev, source: e.target.value }))}
              >
                {documentSources.map(source => (
                  <option key={source.value} value={source.value}>{source.label}</option>
                ))}
              </select>
            </div>

            <div className="metadata-field">
              <label htmlFor="doc-year">Year</label>
              <input 
                type="number" 
                id="doc-year"
                value={newDocMetadata.year}
                onChange={(e) => setNewDocMetadata(prev => ({ ...prev, year: e.target.value }))}
                min="2000"
                max="2030"
              />
            </div>
          </div>

          <div className="metadata-field">
            <label htmlFor="doc-description">Description (Optional)</label>
            <input 
              type="text" 
              id="doc-description"
              placeholder="Brief description of the document"
              value={newDocMetadata.description}
              onChange={(e) => setNewDocMetadata(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="upload-area">
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileUpload}
            disabled={isUploading}
            style={{ display: 'none' }}
          />
          
          <label htmlFor="file-upload" className={`upload-button ${isUploading ? 'disabled' : ''}`}>
            {isUploading ? '⏳ Uploading...' : '📁 Choose Files'}
          </label>
          
          <div className="upload-help">
            Supported formats: PDF, Word, Text, Markdown
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="documents-section">
        <h2>📋 Document Library</h2>
        
        {documents.length === 0 ? (
          <div className="empty-state">
            <p>No documents uploaded yet.</p>
            <p>Upload your first document to get started!</p>
          </div>
        ) : (
          <div className="documents-table">
            <div className="table-header">
              <div className="col-status">Status</div>
              <div className="col-filename">Filename</div>
              <div className="col-type">Type</div>
              <div className="col-source">Source</div>
              <div className="col-size">Size</div>
              <div className="col-uploaded">Uploaded</div>
              <div className="col-actions">Actions</div>
            </div>
            
            {documents.map(doc => (
              <div key={doc.id} className="table-row">
                <div className="col-status">
                  <span className={`status-badge ${doc.status}`}>
                    {getStatusIcon(doc.status)} {doc.status}
                  </span>
                </div>
                <div className="col-filename">
                  <div className="filename">{doc.filename}</div>
                  {doc.metadata?.description && (
                    <div className="description">{doc.metadata.description}</div>
                  )}
                </div>
                <div className="col-type">{doc.metadata?.type}</div>
                <div className="col-source">{doc.metadata?.source}</div>
                <div className="col-size">
                  {doc.size ? formatFileSize(doc.size) : '-'}
                </div>
                <div className="col-uploaded">
                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '-'}
                </div>
                <div className="col-actions">
                  {doc.status === 'completed' && (
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      title="Delete document"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}