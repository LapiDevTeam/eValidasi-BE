// ============================================
// React Components for Silent Printing
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ============================================
// 1. Simple Print Button Component
// ============================================
export const PrintButton = ({
  documentId,
  documentType = 'document',
  printerProfile = 'default',
  copies = 1,
  onSuccess,
  onError,
  children = '🖨️ Print'
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handlePrint = async () => {
    setLoading(true);
    setStatus('Creating print job...');

    try {
      // Create print job
      const response = await axios.post(`${API_URL}/v2/print-job`, {
        documentId,
        documentType,
        printerProfile,
        copies
      });

      const jobId = response.data.data.jobId;
      setStatus(`Job created: ${jobId}`);

      // Poll for completion
      await pollJobStatus(jobId);

      setStatus('Printed successfully!');
      onSuccess?.(jobId);
    } catch (error) {
      setStatus('Print failed');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId) => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/v2/print-job/${jobId}`);
          const status = response.data.data.status;

          if (status === 'completed') {
            clearInterval(interval);
            resolve();
          } else if (status === 'failed') {
            clearInterval(interval);
            reject(new Error(response.data.data.errorMessage || 'Print failed'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 1000);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Timeout waiting for print agent'));
      }, 30000);
    });
  };

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      style={{
        padding: '10px 20px',
        background: loading ? '#ccc' : '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '600'
      }}
    >
      {loading ? '⏳ Printing...' : children}
      {status && <div style={{ fontSize: '12px', marginTop: '5px' }}>{status}</div>}
    </button>
  );
};

// ============================================
// 2. Advanced Print Dialog Component
// ============================================
export const PrintDialog = ({
  documentId,
  documentType = 'document',
  isOpen,
  onClose,
  onSuccess
}) => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('default');
  const [copies, setCopies] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    if (isOpen) {
      loadPrinters();
    }
  }, [isOpen]);

  const loadPrinters = async () => {
    try {
      const response = await axios.get(`${API_URL}/v2/print-job/printer-profiles`);
      setPrinters(response.data.data.printers || []);
    } catch (error) {
      console.error('Failed to load printers:', error);
    }
  };

  const handlePrint = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Creating print job...' });

    try {
      const response = await axios.post(`${API_URL}/v2/print-job`, {
        documentId,
        documentType,
        printerProfile: selectedPrinter,
        copies
      });

      const jobId = response.data.data.jobId;
      setStatus({ type: 'info', message: `Waiting for print agent... (${jobId})` });

      await pollJobStatus(jobId);

      setStatus({ type: 'success', message: '✅ Printed successfully!' });
      setTimeout(() => {
        onSuccess?.(jobId);
        onClose?.();
      }, 1500);
    } catch (error) {
      setStatus({
        type: 'error',
        message: `❌ ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const response = await axios.get(`${API_URL}/v2/print-job/${jobId}`);
          const jobStatus = response.data.data.status;

          if (jobStatus === 'completed') {
            clearInterval(interval);
            resolve();
          } else if (jobStatus === 'failed') {
            clearInterval(interval);
            reject(new Error(response.data.data.errorMessage || 'Print failed'));
          } else if (attempts >= 30) {
            clearInterval(interval);
            reject(new Error('Print agent timeout'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 1000);
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>🖨️ Print Document</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
            Document ID
          </label>
          <input
            type="text"
            value={documentId}
            disabled
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              background: '#f5f5f5'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
            Printer
          </label>
          <select
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px'
            }}
          >
            <option value="default">Default Printer</option>
            {printers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
            Copies
          </label>
          <input
            type="number"
            value={copies}
            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={loading}
            min="1"
            max="10"
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px'
            }}
          />
        </div>

        {status.message && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            background: status.type === 'error' ? '#fee' : status.type === 'success' ? '#efe' : '#eef',
            color: status.type === 'error' ? '#c00' : status.type === 'success' ? '#0a0' : '#06c',
            fontSize: '14px'
          }}>
            {status.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {loading ? '⏳ Printing...' : '🖨️ Print'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 3. Custom Hook for Print Jobs
// ============================================
export const usePrintJob = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);

  const createPrintJob = async (documentId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/v2/print-job`, {
        documentId,
        documentType: options.documentType || 'document',
        printerProfile: options.printerProfile || 'default',
        copies: options.copies || 1
      });

      const newJobId = response.data.data.jobId;
      setJobId(newJobId);

      if (options.waitForCompletion) {
        await pollJobStatus(newJobId);
      }

      return newJobId;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId) => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/v2/print-job/${jobId}`);
          const status = response.data.data.status;

          if (status === 'completed') {
            clearInterval(interval);
            resolve(response.data.data);
          } else if (status === 'failed') {
            clearInterval(interval);
            reject(new Error(response.data.data.errorMessage || 'Print failed'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Timeout'));
      }, 30000);
    });
  };

  const getJobStatus = async (jobId) => {
    try {
      const response = await axios.get(`${API_URL}/v2/print-job/${jobId}`);
      return response.data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    loading,
    error,
    jobId,
    createPrintJob,
    getJobStatus
  };
};

// ============================================
// 4. Example Usage in a Page Component
// ============================================
export const ExamplePage = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { createPrintJob, loading } = usePrintJob();

  // Simple print button usage
  const handleQuickPrint = () => {
    createPrintJob('DOC-12345', {
      documentType: 'certificate',
      waitForCompletion: true
    })
      .then(() => alert('Printed!'))
      .catch((err) => alert('Error: ' + err.message));
  };

  return (
    <div style={{ padding: '40px' }}>
      <h1>Silent Print Examples</h1>

      {/* Method 1: Simple Button */}
      <div style={{ margin: '20px 0' }}>
        <h3>Method 1: Simple Print Button</h3>
        <PrintButton
          documentId="DOC-12345"
          documentType="certificate"
          printerProfile="default"
          copies={1}
          onSuccess={(jobId) => console.log('Success!', jobId)}
          onError={(error) => console.error('Error!', error)}
        />
      </div>

      {/* Method 2: Print Dialog */}
      <div style={{ margin: '20px 0' }}>
        <h3>Method 2: Print Dialog</h3>
        <button onClick={() => setShowDialog(true)}>
          Open Print Dialog
        </button>
        <PrintDialog
          documentId="DOC-12345"
          documentType="certificate"
          isOpen={showDialog}
          onClose={() => setShowDialog(false)}
          onSuccess={(jobId) => alert(`Printed! Job: ${jobId}`)}
        />
      </div>

      {/* Method 3: Custom Hook */}
      <div style={{ margin: '20px 0' }}>
        <h3>Method 3: Custom Hook</h3>
        <button onClick={handleQuickPrint} disabled={loading}>
          {loading ? 'Printing...' : 'Quick Print'}
        </button>
      </div>
    </div>
  );
};
