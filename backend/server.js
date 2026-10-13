const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const JSZip = require('jszip');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const TEMPLATE_PATH = path.join(__dirname, 'template.docx');
const CONVERT_SCRIPT = path.join(__dirname, 'convert_to_pdf.ps1');
const OUTPUT_DIR = path.join(__dirname, 'output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Format date string (YYYY-MM-DD) into DD.MM.YYYY
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
  }
  return dateStr;
}

/**
 * Format time string (HH:MM in 24hr) into h:mm A or hh:mm A
 */
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parts[1].slice(0, 2);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  }
  return timeStr;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

/**
 * Safely update the 4 fields in word/document.xml while keeping all formatting intact.
 */
function updateDocumentXml(xmlContent, { formattedDate, vehicleNumber, formattedInTime, formattedOutTime }) {
  let updatedXml = xmlContent;
  const safeVeh = escapeXml(vehicleNumber);
  const safeDate = escapeXml(formattedDate);
  const safeIn = escapeXml(formattedInTime);
  const safeOut = escapeXml(formattedOutTime);

  // 1. DATE: Paragraph 2 contains Date: __10.10.2026___
  // Matches Date: __ and the 10.10.2026 runs followed by ___
  const dateRegex = /(<w:t[^>]*>Date:<\/w:t>[\s\S]*?<w:t[^>]*>__<\/w:t>)(?:[\s\S]*?<w:t[^>]*>10<\/w:t>[\s\S]*?<w:t[^>]*>\.<\/w:t>[\s\S]*?<w:t[^>]*>10<\/w:t>[\s\S]*?<w:t[^>]*>\.<\/w:t>[\s\S]*?<w:t[^>]*>202<\/w:t>[\s\S]*?<w:t[^>]*>6<\/w:t>)([\s\S]*?<w:t[^>]*>___<\/w:t>)/;
  if (dateRegex.test(updatedXml)) {
    updatedXml = updatedXml.replace(dateRegex, (match, p1, p2) => {
      return `${p1}<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t>${safeDate}</w:t></w:r>${p2}`;
    });
  }

  // 2. VEHICLE NUMBER: Paragraph 7 contains Plate No _42581_/ _85134_
  const plateRegex = /(<w:t[^>]*>Plate No _<\/w:t><\/w:r>)(?:[\s\S]*?<w:t[^>]*>42581<\/w:t>[\s\S]*?<w:t[^>]*>_\/ _<\/w:t>[\s\S]*?<w:t[^>]*>85134<\/w:t>[\s\S]*?)(<w:r[^>]*><w:rPr>[\s\S]*?<\/w:rPr><w:t[^>]*>_<\/w:t><\/w:r>)/;
  if (plateRegex.test(updatedXml)) {
    updatedXml = updatedXml.replace(plateRegex, (match, p1, p2) => {
      return `${p1}<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t>${safeVeh}</w:t></w:r>${p2}`;
    });
  }

  // 3. TIME IN: In table under 'Time In (HH:MM)' -> originally paraId="401C74F7"
  const inTimeRegex = /(<w:p [^>]*paraId="401C74F7"[\s\S]*?<w:pPr>[\s\S]*?<\/w:pPr>)([\s\S]*?)(<\/w:p>)/;
  if (inTimeRegex.test(updatedXml)) {
    updatedXml = updatedXml.replace(inTimeRegex, (match, p1, oldRuns, p3) => {
      return `${p1}<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t xml:space="preserve"> ${safeIn}</w:t></w:r>${p3}`;
    });
  }

  // 4. TIME OUT: In table under 'Time Out (HH:MM)' -> originally paraId="1F519A27"
  const outTimeRegex = /(<w:p [^>]*paraId="1F519A27"[\s\S]*?<w:pPr>[\s\S]*?<\/w:pPr>)([\s\S]*?)(<\/w:p>)/;
  if (outTimeRegex.test(updatedXml)) {
    updatedXml = updatedXml.replace(outTimeRegex, (match, p1, oldRuns, p3) => {
      return `${p1}<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t xml:space="preserve">${safeOut}</w:t></w:r>${p3}`;
    });
  }

  return updatedXml;
}

/**
 * Execute PowerShell script to convert DOCX to PDF using Word COM
 */
function convertDocxToPdf(docxPath, pdfPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-ExecutionPolicy', 'Bypass',
      '-File', CONVERT_SCRIPT,
      '-DocxPath', docxPath,
      '-PdfPath', pdfPath
    ];

    execFile('powershell', args, (error, stdout, stderr) => {
      if (error) {
        console.error('PowerShell execution failed:', error, stderr);
        return reject(new Error(stderr || error.message));
      }
      if (!fs.existsSync(pdfPath)) {
        return reject(new Error('PDF output file was not generated.'));
      }
      resolve();
    });
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    templateExists: fs.existsSync(TEMPLATE_PATH),
    converterScriptExists: fs.existsSync(CONVERT_SCRIPT),
  });
});

// Dynamically resolve python executable (python3 on Linux/Render/Railway/Docker, or custom path on Windows)
const PYTHON_EXE = process.env.PYTHON_PATH || (process.platform === 'win32' && fs.existsSync('C:\\Users\\ELCOT\\AppData\\Local\\Programs\\Python\\Python312\\python.exe')
  ? 'C:\\Users\\ELCOT\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'
  : (process.platform === 'win32' ? 'python' : 'python3'));
const PYTHON_SCRIPT = path.join(__dirname, 'generate_doc.py');

/**
 * Execute Python script to generate PDF document
 */
function runPythonDocGenerator(mode, payload, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      PYTHON_SCRIPT,
      mode,
      TEMPLATE_PATH,
      outputPath,
      JSON.stringify(payload)
    ];

    execFile(PYTHON_EXE, args, (error, stdout, stderr) => {
      if (error) {
        console.error('Python generator error:', error, stderr);
        return reject(new Error(stderr || error.message));
      }
      if (!fs.existsSync(outputPath)) {
        return reject(new Error('Python output file was not generated.'));
      }
      resolve();
    });
  });
}

// PDF Generation Endpoint (JSON)
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { date, vehicleNumber, inTime, outTime } = req.body;

    if (!date || !vehicleNumber || !inTime || !outTime) {
      return res.status(400).json({ error: 'All four fields (date, vehicleNumber, inTime, outTime) are required.' });
    }

    const cleanVehicle = vehicleNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = date.trim();
    const formattedDate = formatDate(safeDate);
    const downloadFilename = `NP18680- Daily Manual Attendance Sheet-${formattedDate}.pdf`;
    const tempOutFile = path.join(OUTPUT_DIR, `py_${cleanVehicle}_${Date.now()}.pdf`);

    // Call Python script to create the PDF document
    await runPythonDocGenerator('pdf', req.body, tempOutFile);

    const pdfBuffer = fs.readFileSync(tempOutFile);
    fs.unlinkSync(tempOutFile);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Error generating PDF via Python:', err);
    res.status(500).json({ error: 'Python PDF generation failed: ' + err.message });
  }
});

// PDF Native Form Submission Endpoint (Uses Python)
app.post('/api/generate-pdf-form', async (req, res) => {
  try {
    let payload = req.body;
    if (req.body.payload) {
      try {
        payload = JSON.parse(req.body.payload);
      } catch (e) {
        // use req.body
      }
    }

    const { date, vehicleNumber, inTime, outTime } = payload;

    if (!date || !vehicleNumber || !inTime || !outTime) {
      return res.status(400).send('All four fields (date, vehicleNumber, inTime, outTime) are required.');
    }

    const cleanVehicle = vehicleNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = date.trim();
    const formattedDate = formatDate(safeDate);
    const downloadFilename = `NP18680- Daily Manual Attendance Sheet-${formattedDate}.pdf`;
    const tempOutFile = path.join(OUTPUT_DIR, `py_form_${cleanVehicle}_${Date.now()}.pdf`);

    // Call Python script to create the PDF document
    await runPythonDocGenerator('pdf', payload, tempOutFile);

    const pdfBuffer = fs.readFileSync(tempOutFile);
    fs.unlinkSync(tempOutFile);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Error generating PDF via Python form:', err);
    res.status(500).send('Python PDF generation failed: ' + err.message);
  }
});

// Direct Download Endpoint (Standard HTTP GET attachment)
app.get('/api/download/:file', (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(OUTPUT_DIR, fileName);
  const clientFileName = req.query.filename || fileName;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found or already downloaded.');
  }

  res.download(filePath, clientFileName, (err) => {
    if (err) {
      console.error('Error sending download:', err);
    }
    // Clean up temporary files 10 seconds after download finishes
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        // ignore
      }
    }, 10000);
  });
});

// Serve built frontend assets if available (Production deployment mode)
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
