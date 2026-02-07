/**
 * React Component for Silent Printing
 *
 * This component demonstrates how to integrate with the
 * Local Print Agent system from a React frontend
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Printer configuration hook
export function usePrinters() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrinters() {
      try {
        const response = await axios.get('/api/v2/printer-profiles', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setPrinters(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch printers:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPrinters();
  }, []);

  return { printers, loading };
}

// Print button component
export function PrintButton({
  documentId,
  documentType,
  printerProfile = 'default',
  copies = 1,
  orientation = 'portrait',
  pageSize = 'A4',
  onSuccess,
  onError,
  className = 'btn btn-primary'
}) {
  const [status, setStatus] = useState('idle'); // idle | creating | polling | completed | error
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  const handlePrint = async () => {
    try {
      setStatus('creating');
      setError(null);
      setProgress('Creating print job...');

      // Create print job
      const response = await axios.post('/api/v2/print-job', {
        documentId,
        documentType,
        printerProfile,
        copies,
        orientation,
        pageSize,
        agentId: 'default', // Or get from user settings
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const { jobId } = response.data.data;
      setStatus('polling');
      setProgress('Sending to printer...');

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes (60 * 2 seconds)

      const pollInterval = setInterval(async () => {
        attempts++;

        try {
          const statusRes = await axios.get(`/api/v2/print-job/${jobId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });

          const jobStatus = statusRes.data.data.status;
          const jobData = statusRes.data.data;

          if (jobStatus === 'completed') {
            clearInterval(pollInterval);
            setStatus('completed');
            setProgress('Print successful!');

            if (onSuccess) {
              onSuccess(jobData);
            }

            // Reset after 3 seconds
            setTimeout(() => {
              setStatus('idle');
              setProgress('');
            }, 3000);

          } else if (jobStatus === 'failed') {
            clearInterval(pollInterval);
            const errorMsg = jobData.errorMessage || 'Print failed';
            setError(errorMsg);
            setStatus('error');

            if (onError) {
              onError(new Error(errorMsg));
            }

            // Reset after 5 seconds
            setTimeout(() => {
              setStatus('idle');
              setError(null);
            }, 5000);

          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            const timeoutMsg = 'Print timeout - check if agent is running';
            setError(timeoutMsg);
            setStatus('error');

            if (onError) {
              onError(new Error(timeoutMsg));
            }
          }
        } catch (err) {
          console.error('Poll error:', err);
          // Continue polling despite errors
        }
      }, 2000); // Poll every 2 seconds

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create print job';
      setError(errorMsg);
      setStatus('error');

      if (onError) {
        onError(err);
      }

      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 5000);
    }
  };

  return (
    <div className="print-button-container">
      <button
        onClick={handlePrint}
        disabled={status !== 'idle'}
        className={className}
      >
        {status === 'creating' && '⏳ Creating...'}
        {status === 'polling' && '🖨️ Printing...'}
        {status === 'completed' && '✓ Printed'}
        {status === 'error' && '✗ Failed'}
        {status === 'idle' && '🖨️ Print'}
      </button>

      {progress && status !== 'error' && (
        <div className="text-muted small mt-1">
          {progress}
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-2 small">
          <strong>Print Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

// Advanced print dialog with options
export function PrintDialog({
  documentId,
  documentType,
  isOpen,
  onClose,
  onSuccess
}) {
  const { printers, loading } = usePrinters();
  const [selectedPrinter, setSelectedPrinter] = useState('default');
  const [copies, setCopies] = useState(1);
  const [orientation, setOrientation] = useState('portrait');
  const [pageSize, setPageSize] = useState('A4');

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Print Settings</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Printer Selection */}
            <div className="mb-3">
              <label className="form-label">Printer</label>
              <select
                className="form-select"
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                disabled={loading}
              >
                <option value="default">Default Printer</option>
                {printers.map(printer => (
                  <option key={printer.id} value={printer.name}>
                    {printer.name} {printer.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Copies */}
            <div className="mb-3">
              <label className="form-label">Copies</label>
              <input
                type="number"
                className="form-control"
                min="1"
                max="10"
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Orientation */}
            <div className="mb-3">
              <label className="form-label">Orientation</label>
              <div className="btn-group w-100">
                <button
                  className={`btn ${orientation === 'portrait' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setOrientation('portrait')}
                >
                  Portrait
                </button>
                <button
                  className={`btn ${orientation === 'landscape' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setOrientation('landscape')}
                >
                  Landscape
                </button>
              </div>
            </div>

            {/* Page Size */}
            <div className="mb-3">
              <label className="form-label">Page Size</label>
              <select
                className="form-select"
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
                <option value="Legal">Legal (8.5 × 14 in)</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <PrintButton
              documentId={documentId}
              documentType={documentType}
              printerProfile={selectedPrinter}
              copies={copies}
              orientation={orientation}
              pageSize={pageSize}
              onSuccess={(data) => {
                onSuccess && onSuccess(data);
                setTimeout(() => onClose(), 2000);
              }}
              className="btn btn-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Usage example
export default function DocumentViewer({ document }) {
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  return (
    <div>
      <div className="document-header">
        <h2>{document.title}</h2>

        {/* Simple print button */}
        <PrintButton
          documentId={document.id}
          documentType="sertifikasi"
          onSuccess={() => alert('Document printed successfully!')}
          onError={(err) => alert(`Print failed: ${err.message}`)}
        />

        {/* Or advanced print dialog */}
        <button
          className="btn btn-outline-primary ms-2"
          onClick={() => setShowPrintDialog(true)}
        >
          Print with Options
        </button>
      </div>

      <PrintDialog
        documentId={document.id}
        documentType="sertifikasi"
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onSuccess={() => {
          alert('Document printed!');
        }}
      />

      <div className="document-content">
        {/* Your document content */}
      </div>
    </div>
  );
}

/**
 * Batch printing example
 */
export function BatchPrint({ documentIds, documentType }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleBatchPrint = async () => {
    setStatus('printing');
    setProgress({ current: 0, total: documentIds.length });

    for (let i = 0; i < documentIds.length; i++) {
      try {
        const response = await axios.post('/api/v2/print-job', {
          documentId: documentIds[i],
          documentType,
          printerProfile: 'default',
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        setProgress({ current: i + 1, total: documentIds.length });

        // Small delay between jobs
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Failed to print document ${documentIds[i]}:`, error);
      }
    }

    setStatus('completed');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div>
      <button
        onClick={handleBatchPrint}
        disabled={status !== 'idle'}
        className="btn btn-primary"
      >
        {status === 'idle' && `Print All (${documentIds.length})`}
        {status === 'printing' && `Printing ${progress.current}/${progress.total}...`}
        {status === 'completed' && '✓ All Printed'}
      </button>
    </div>
  );
}
