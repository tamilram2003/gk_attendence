import sys
import json
import os
import zipfile
import re

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

    # Read the docx as a zip package
    with zipfile.ZipFile(template_path, 'r') as zin:
        xml_content = zin.read('word/document.xml').decode('utf-8')

        # 1. Update Date
        date_pattern = re.compile(r'(<w:t[^>]*>Date:<\/w:t>[\s\S]*?<w:t[^>]*>__<\/w:t>)(?:[\s\S]*?<w:t[^>]*>10<\/w:t>[\s\S]*?<w:t[^>]*>\.<\/w:t>[\s\S]*?<w:t[^>]*>10<\/w:t>[\s\S]*?<w:t[^>]*>\.<\/w:t>[\s\S]*?<w:t[^>]*>202<\/w:t>[\s\S]*?<w:t[^>]*>6<\/w:t>)([\s\S]*?<w:t[^>]*>___<\/w:t>)')
        xml_content = date_pattern.sub(rf'\g<1><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t>{fmt_date}</w:t></w:r>\g<2>', xml_content)

        # 2. Update Vehicle Number
        plate_pattern = re.compile(r'(<w:t[^>]*>Plate No _<\/w:t><\/w:r>)(?:[\s\S]*?<w:t[^>]*>42581<\/w:t>[\s\S]*?<w:t[^>]*>_\/ _<\/w:t>[\s\S]*?<w:t[^>]*>85134<\/w:t>[\s\S]*?)(<w:r[^>]*><w:rPr>[\s\S]*?<\/w:rPr><w:t[^>]*>_<\/w:t><\/w:r>)')
        xml_content = plate_pattern.sub(rf'\g<1><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t>{fmt_veh}</w:t></w:r>\g<2>', xml_content)

        # 3. Update In Time (Row 1 cell paraId="401C74F7")
        in_time_pattern = re.compile(r'(<w:p [^>]*paraId="401C74F7"[\s\S]*?<w:pPr>[\s\S]*?<\/w:pPr>)([\s\S]*?)(<\/w:p>)')
        xml_content = in_time_pattern.sub(rf'\g<1><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t xml:space="preserve"> {fmt_in}</w:t></w:r>\g<3>', xml_content)

        # 4. Update Out Time (Row 1 cell paraId="1F519A27")
        out_time_pattern = re.compile(r'(<w:p [^>]*paraId="1F519A27"[\s\S]*?<w:pPr>[\s\S]*?<\/w:pPr>)([\s\S]*?)(<\/w:p>)')
        xml_content = out_time_pattern.sub(rf'\g<1><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/><w:lang w:eastAsia="en-AE"/></w:rPr><w:t xml:space="preserve">{fmt_out}</w:t></w:r>\g<3>', xml_content)

        # Write output docx
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == 'word/document.xml':
                    zout.writestr(item, xml_content.encode('utf-8'))
                else:
                    zout.writestr(item, zin.read(item.filename))

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python generate_docx.py <template_path> <output_path> <json_data>")
        sys.exit(1)

    template_file = sys.argv[1]
    output_file = sys.argv[2]
    data_json = json.loads(sys.argv[3])

    generate_word_document(template_file, output_file, data_json)
    print("SUCCESS")
