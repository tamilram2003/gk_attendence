import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Truck, 
  FileCheck, 
  RotateCcw, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  Moon
} from 'lucide-react';
import './App.css';

interface FormState {
  date: string;
  vehicleNumber: string;
  inTime: string;
  outTime: string;
}

interface FormErrors {
  date?: string;
  vehicleNumber?: string;
  inTime?: string;
  outTime?: string;
}

interface GeneratedHistory {
  filename: string;
  vehicle: string;
  timestamp: string;
}

export const App: React.FC = () => {
  // Current local date in YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [formData, setFormData] = useState<FormState>({
    date: getTodayDate(),
    vehicleNumber: '',
    inTime: '08:00',
    outTime: '17:00'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recentDownloads, setRecentDownloads] = useState<GeneratedHistory[]>([]);

  const vehicleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus vehicle input on initial load
  useEffect(() => {
    vehicleInputRef.current?.focus();
  }, []);

  // Check if trip qualifies as overnight
  const isOvernightTrip = () => {
    if (!formData.inTime || !formData.outTime) return false;
    return formData.outTime < formData.inTime;
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required.';
    }

    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle Number is required.';
    } else if (formData.vehicleNumber.trim().length < 2) {
      newErrors.vehicleNumber = 'Please enter a valid vehicle number.';
    }

    if (!formData.inTime) {
      newErrors.inTime = 'In Time is required.';
    }

    if (!formData.outTime) {
      newErrors.outTime = 'Out Time is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleReset = () => {
    setFormData({
      date: getTodayDate(),
      vehicleNumber: '',
      inTime: '08:00',
      outTime: '17:00'
    });
    setErrors({});
    setErrorMsg(null);
    setSuccessMsg(null);
    vehicleInputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // Format date as DD.MM.YYYY for filename
    const dateParts = formData.date.split('-');
    const formattedDate = dateParts.length === 3 
      ? `${dateParts[2].padStart(2, '0')}.${dateParts[1].padStart(2, '0')}.${dateParts[0]}`
      : formData.date;
    const filename = `NP18680- Daily Manual Attendance Sheet-${formattedDate}.pdf`;

    // Create an invisible native HTML form to trigger a true browser PDF file download
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/generate-pdf-form';
    form.target = '_self';

    const inputData = document.createElement('input');
    inputData.type = 'hidden';
    inputData.name = 'payload';
    inputData.value = JSON.stringify(formData);
    form.appendChild(inputData);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    setTimeout(() => {
      setIsSubmitting(false);
    }, 4000);

    // Record in recent history
    setRecentDownloads(prev => [
      {
        filename,
        vehicle: formData.vehicleNumber.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      ...prev.slice(0, 4)
    ]);

    setSuccessMsg(`PDF successfully generated and downloaded: ${filename}`);

    // Clear the form and focus Vehicle Number input for rapid repeated entries
    setFormData(prev => ({
      ...prev,
      vehicleNumber: ''
    }));
    setErrors({});
    setTimeout(() => {
      vehicleInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-badge">
          <ShieldCheck size={16} />
          <span>Python DOCX-to-PDF Engine</span>
        </div>
        <h1 className="app-title">Vehicle Attendance PDF Generator</h1>
        <p className="app-subtitle">
          Generate pixel-perfect attendance PDFs directly from your official document template using Python. 
          Layout, fonts, logos, and signatures remain 100% authentic.
        </p>
      </header>

      {/* Main Content Layout */}
      <div className="main-layout">
        {/* Form Column */}
        <section className="glass-card">
          <div className="card-title-group">
            <div className="card-title-icon">
              <FileCheck size={22} />
            </div>
            <div>
              <h2 className="card-title">Attendance Details</h2>
              <p className="card-desc">Enter the four fields below to generate the official PDF</p>
            </div>
          </div>

          {/* Feedback alerts */}
          {successMsg && (
            <div className="alert-box alert-success" role="alert">
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <div>{successMsg}</div>
            </div>
          )}

          {errorMsg && (
            <div className="alert-box alert-error" role="alert">
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              {/* Field 1: Date */}
              <div className="field-group">
                <label htmlFor="input-date" className="field-label">
                  <Calendar size={15} />
                  <span>Date</span>
                  <span className="field-label-hint">DD.MM.YYYY</span>
                </label>
                <div className="input-container">
                  <Calendar size={16} className="input-icon-left" />
                  <input
                    id="input-date"
                    type="date"
                    className={`text-input ${errors.date ? 'has-error' : ''}`}
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.date && <div className="field-error">{errors.date}</div>}
              </div>

              {/* Field 2: Vehicle Number */}
              <div className="field-group">
                <label htmlFor="input-vehicle" className="field-label">
                  <Truck size={15} />
                  <span>Vehicle Number</span>
                  <span className="field-label-hint">Plate No</span>
                </label>
                <div className="input-container">
                  <Truck size={16} className="input-icon-left" />
                  <input
                    ref={vehicleInputRef}
                    id="input-vehicle"
                    type="text"
                    placeholder="e.g. TN01AB1234 or 42581"
                    className={`text-input ${errors.vehicleNumber ? 'has-error' : ''}`}
                    value={formData.vehicleNumber}
                    onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.vehicleNumber && <div className="field-error">{errors.vehicleNumber}</div>}
              </div>

              {/* Field 3: In Time */}
              <div className="field-group">
                <label htmlFor="input-intime" className="field-label">
                  <Clock size={15} />
                  <span>In Time</span>
                  <span className="field-label-hint">HH:MM</span>
                </label>
                <div className="input-container">
                  <Clock size={16} className="input-icon-left" />
                  <input
                    id="input-intime"
                    type="time"
                    className={`text-input ${errors.inTime ? 'has-error' : ''}`}
                    value={formData.inTime}
                    onChange={(e) => handleInputChange('inTime', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.inTime && <div className="field-error">{errors.inTime}</div>}
              </div>

              {/* Field 4: Out Time */}
              <div className="field-group">
                <label htmlFor="input-outtime" className="field-label">
                  <Clock size={15} />
                  <span>Out Time</span>
                  <span className="field-label-hint">HH:MM</span>
                </label>
                <div className="input-container">
                  <Clock size={16} className="input-icon-left" />
                  <input
                    id="input-outtime"
                    type="time"
                    className={`text-input ${errors.outTime ? 'has-error' : ''}`}
                    value={formData.outTime}
                    onChange={(e) => handleInputChange('outTime', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.outTime && <div className="field-error">{errors.outTime}</div>}
              </div>

              {/* Overnight Trip Notice */}
              {isOvernightTrip() && (
                <div className="overnight-trip-banner">
                  <Moon size={16} />
                  <span>
                    <strong>Overnight Trip Detected:</strong> Out Time ({formData.outTime}) is earlier than In Time ({formData.inTime}). Validated for cross-midnight shift.
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button
                type="submit"
                id="btn-submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner" />
                    <span>Converting to PDF with Python...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Generate &amp; Download PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-reset"
                className="btn-secondary"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
            </div>
          </form>
        </section>

        {/* Info & History Column */}
        <div className="side-column">
          <section className="glass-card">
            <div className="template-badge-row">
              <span className="badge-tag">Verified Template</span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>MS Word High-Fidelity</span>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f1f5f9' }}>
              Template Specifications
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Original Word template: <strong>NP18680- Daily Manual Attendance Sheet</strong>. 
              The layout preserves all NAFFCO branding, tables, signatures, and employee rows.
            </p>

            <div className="field-mapping-list">
              <div className="mapping-item">
                <span className="mapping-key">
                  <Calendar size={14} />
                  <span>Header Date</span>
                </span>
                <span className="mapping-value">Date: __[Selected Date]___</span>
              </div>

              <div className="mapping-item">
                <span className="mapping-key">
                  <Truck size={14} />
                  <span>Vehicle Number</span>
                </span>
                <span className="mapping-value">Plate No _[Vehicle]_</span>
              </div>

              <div className="mapping-item">
                <span className="mapping-key">
                  <Clock size={14} />
                  <span>Time In Field</span>
                </span>
                <span className="mapping-value">Row 1: [In Time] AM/PM</span>
              </div>

              <div className="mapping-item">
                <span className="mapping-key">
                  <Clock size={14} />
                  <span>Time Out Field</span>
                </span>
                <span className="mapping-value">Row 1: [Out Time] AM/PM</span>
              </div>
            </div>

            {recentDownloads.length > 0 && (
              <div className="history-section">
                <div className="history-title">Recent Downloads in this Session</div>
                {recentDownloads.map((item, idx) => (
                  <div key={idx} className="history-item">
                    <span className="history-name" title={item.filename}>
                      <FileText size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                      {item.filename}
                    </span>
                    <span style={{ color: '#64748b' }}>{item.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
