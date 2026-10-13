# Vehicle Attendance PDF Generator

A React + TypeScript and Node.js application that fills the official **Daily Manual Attendance Sheet** Word document (`.docx`) and converts it to PDF while preserving 100% of the original document layout, fonts, NAFFCO logo, tables, borders, and signatures.

---

## Architecture Overview

```
                                      ┌────────────────────────────────────────────────┐
                                      │   React + TypeScript Frontend (Vite)          │
                                      │   - 4 Input Fields: Date, Vehicle, In, Out     │
                                      │   - Overnight trip detection & auto-validation │
                                      │   - Automatic PDF download trigger             │
                                      └──────────────────────┬─────────────────────────┘
                                                             │ POST /api/generate-pdf
                                                             ▼
                                      ┌────────────────────────────────────────────────┐
                                      │   Node.js + Express Backend                    │
                                      │   - Preserves source template.docx             │
                                      │   - Injects values into word/document.xml      │
                                      │   - Converts DOCX to PDF via native Word COM   │
                                      │   - Streams high-fidelity PDF back to client   │
                                      └────────────────────────────────────────────────┘
```

---

## 4 Input Fields & Mapping in Word Template

| Field | Input UI Component | Target Location in Original DOCX | Format |
|---|---|---|---|
| **Date** | Date Picker | Header paragraph 2 (`Date: __[Date]___`) | `DD.MM.YYYY` |
| **Vehicle Number** | Text Input (Auto-focused) | Header paragraph 7 (`Plate No _[Vehicle]_`) | As typed (e.g., `TN01AB1234`) |
| **In Time** | Time Picker | Table 1, Row 1 `Time In (HH:MM)` | `h:mm A` (e.g., `8:30 AM`) |
| **Out Time** | Time Picker | Table 1, Row 1 `Time Out (HH:MM)` | `h:mm A` (e.g., `6:00 PM`) |

---

## Features

1. **Original Template Preservation**: The original file [NP18680- Daily Manual Attendance Sheet-21.09.2026.docx](file:///d:/Gk-attendence/New%20folder/NP18680-%20Daily%20Manual%20Attendance%20Sheet-21.09.2026.docx) is never overwritten. All modifications are generated in isolated copies.
2. **Native High-Fidelity Word-to-PDF Conversion**: Converts using native Word COM engine (`convert_to_pdf.ps1`) to ensure tables, signatures, fonts, and headers are identical to Microsoft Word output.
3. **Overnight Trip Detection**: Automatically detects when `Out Time < In Time` (e.g., 20:00 to 05:00) and displays a clear badge indicating valid cross-midnight shift handling.
4. **Instant Consecutive Entry Workflow**: After successful PDF generation and download, the vehicle input is cleared and automatically refocused for rapid multi-vehicle entries.
5. **Session History**: Displays recently generated PDFs and their download timestamps.

---

## How to Run

### 1. Start Backend Server
```powershell
cd "d:\Gk-attendence\New folder\backend"
npm start
```
*Backend runs on `http://localhost:5000`.*

### 2. Start Frontend Dev Server
```powershell
cd "d:\Gk-attendence\New folder\frontend"
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## API Endpoints

- `GET http://localhost:5000/api/health` - Checks backend health and template file availability.
- `POST http://localhost:5000/api/generate-pdf` - Accepts JSON `{ date, vehicleNumber, inTime, outTime }` and streams the converted PDF file attachment.
