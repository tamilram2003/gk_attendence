import sys
import json
import os
import zipfile
import re
import tempfile
from docx2pdf import convert

def format_date(date_str):
    if not date_str:
        return ""
    parts = date_str.split("-")
    if len(parts) == 3:
        return f"{parts[2].zfill(2)}.{parts[1].zfill(2)}.{parts[0]}"
    return date_str

def format_time_12h(time_str):
    if not time_str:
        return ""
    parts = time_str.split(":")
    if len(parts) >= 2:
        hour = int(parts[0])
        minute = parts[1][:2]
        ampm = "PM" if hour >= 12 else "AM"
        hour = hour % 12
        if hour == 0:
            hour = 12
        return f"{hour}:{minute} {ampm}"
    return time_str

def escape_xml(s):
    return (str(s)
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&apos;'))

def generate_word_document(template_path, output_path, data):
    date_val = data.get("date", "")
    vehicle_val = data.get("vehicleNumber", "")
    in_time_val = data.get("inTime", "")
    out_time_val = data.get("outTime", "")

    fmt_date = escape_xml(format_date(date_val))
    fmt_veh = escape_xml(vehicle_val.strip())
    fmt_in = escape_xml(format_time_12h(in_time_val))
    fmt_out = escape_xml(format_time_12h(out_time_val))

    with zipfile.ZipFile(template_path, 'r') as zin:
        xml_content = zin.read('word/document.xml').decode('utf-8')

        # 1. Update Date
        date_pattern = re.compile(
            r'(<w:t[^>]*>Date:<\/w:t>[\s\S]*?<w:t[^>]*>__<\/w:t>)'
            r'(?:[\s\S]*?<w:t[^>]*>10<\/w:t>[\s\S]*?<w:t[^>]*>\.<\/w:t>[\s\S]*?<w:t[^>]*>10<\/w:t>[\s\S]*?<w:t[^>]*>\.<\/w:t>[\s\S]*?<w:t[^>]*>202<\/w:t>[\s\S]*?<w:t[^>]*>6<\/w:t>)'
            r'([\s\S]*?<w:t[^>]*>___<\/w:t>)'
        )
        xml_content = date_pattern.sub(
            rf'\g<1><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t>{fmt_date}</w:t></w:r>\g<2>',
            xml_content
        )

        # 2. Update Vehicle Number
        plate_pattern = re.compile(
            r'(<w:t[^>]*>Plate No _<\/w:t><\/w:r>)'
            r'(?:[\s\S]*?<w:t[^>]*>42581<\/w:t>[\s\S]*?<w:t[^>]*>_\/ _<\/w:t>[\s\S]*?<w:t[^>]*>85134<\/w:t>[\s\S]*?)'
            r'(<w:r[^>]*><w:rPr>[\s\S]*?<\/w:rPr><w:t[^>]*>_<\/w:t><\/w:r>)'
        )
        xml_content = plate_pattern.sub(
            rf'\g<1><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t>{fmt_veh}</w:t></w:r>\g<2>',
            xml_content
        )

        # 3. Update In Time (Row 1 cell paraId="401C74F7")
        in_time_pattern = re.compile(
            r'(<w:p [^>]*paraId="401C74F7"[\s\S]*?<w:pPr>[\s\S]*?<\/w:pPr>)([\s\S]*?)(<\/w:p>)'
        )
        xml_content = in_time_pattern.sub(
            rf'\g<1><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t xml:space="preserve"> {fmt_in}</w:t></w:r>\g<3>',
            xml_content
        )

        # 4. Update Out Time (Row 1 cell paraId="1F519A27")
        out_time_pattern = re.compile(
            r'(<w:p [^>]*paraId="1F519A27"[\s\S]*?<w:pPr>[\s\S]*?<\/w:pPr>)([\s\S]*?)(<\/w:p>)'
        )
        xml_content = out_time_pattern.sub(
            rf'\g<1><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t xml:space="preserve">{fmt_out}</w:t></w:r>\g<3>',
            xml_content
        )

        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == 'word/document.xml':
                    zout.writestr(item, xml_content.encode('utf-8'))
                else:
                    zout.writestr(item, zin.read(item.filename))

import subprocess
import shutil

def convert_to_pdf_cross_platform(docx_path, pdf_path):
    """
    Cross-platform converter:
    - On Windows with Word: uses docx2pdf (MS Word COM)
    - On Linux/Cloud (Render/Railway/Docker): uses headless LibreOffice (soffice)
    """
    # 1. Check for LibreOffice (soffice) command first (Standard on Linux Cloud Hosts)
    soffice_cmd = shutil.which('libreoffice') or shutil.which('soffice')
    if soffice_cmd:
        out_dir = os.path.dirname(os.path.abspath(pdf_path))
        cmd = [
            soffice_cmd,
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', out_dir,
            os.path.abspath(docx_path)
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        # LibreOffice outputs <basename>.pdf in out_dir
        expected_pdf = os.path.join(out_dir, os.path.splitext(os.path.basename(docx_path))[0] + '.pdf')
        if os.path.exists(expected_pdf) and expected_pdf != os.path.abspath(pdf_path):
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            shutil.move(expected_pdf, pdf_path)
        return

    # 2. Fallback to Windows MS Word automation via docx2pdf
    if sys.platform == 'win32':
        from docx2pdf import convert
        convert(os.path.abspath(docx_path), os.path.abspath(pdf_path))
        return

    raise RuntimeError("No suitable DOCX to PDF converter found. Please install LibreOffice on your Linux host (apt-get install libreoffice).")

def generate_pdf_document(template_path, output_pdf_path, data):
    output_pdf_full = os.path.abspath(output_pdf_path)
    temp_dir = tempfile.gettempdir()
    temp_docx = os.path.join(temp_dir, f"temp_word_{os.getpid()}_{abs(hash(output_pdf_path))}.docx")
    try:
        generate_word_document(template_path, temp_docx, data)
        convert_to_pdf_cross_platform(temp_docx, output_pdf_full)
    finally:
        if os.path.exists(temp_docx):
            try:
                os.remove(temp_docx)
            except Exception:
                pass

if __name__ == '__main__':
    if len(sys.argv) < 5:
        print("Usage: python generate_doc.py <mode: docx|pdf> <template_path> <output_path> <json_data>")
        sys.exit(1)

    mode = sys.argv[1].lower()
    template_file = sys.argv[2]
    output_file = sys.argv[3]
    data_json = json.loads(sys.argv[4])

    if mode == 'pdf':
        generate_pdf_document(template_file, output_file, data_json)
    else:
        generate_word_document(template_file, output_file, data_json)

    print("SUCCESS")
