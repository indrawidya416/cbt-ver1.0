# -*- coding: utf-8 -*-
import json, os, csv, uuid
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from data_siswa_mi import DATA, KELAS, SEKOLAH, SANDI, semua, rekap

OUT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(OUT, 'per-kelas'), exist_ok=True)

HEADER = ['NIS', 'Nama', 'Sekolah', 'Kelas', 'JK', 'Password']
WIDTHS = [12, 48, 18, 8, 6, 11]

HEAD_FILL = PatternFill('solid', fgColor='0F766E')
HEAD_FONT = Font(bold=True, color='FFFFFF', size=11)
THIN = Side(style='thin', color='CBD5E1')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
L_FILL = PatternFill('solid', fgColor='E0F2FE')
P_FILL = PatternFill('solid', fgColor='FCE7F3')


def sheet_rows(rows):
    return [HEADER] + [[nis, nama, SEKOLAH, kelas, jk, SANDI] for nis, nama, jk in rows]


def style_sheet(ws, n_rows, with_kelas=True):
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = f'A1:F{n_rows + 1}'
    for c in range(1, len(HEADER) + 1):
        cell = ws.cell(row=1, column=c)
        cell.fill = HEAD_FILL
        cell.font = HEAD_FONT
        cell.alignment = Alignment(horizontal='center', vertical='center')
        ws.column_dimensions[get_column_letter(c)].width = WIDTHS[c - 1]
    ws.row_dimensions[1].height = 22
    for r in range(2, n_rows + 2):
        for c in range(1, len(HEADER) + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = BORDER
            if c == 1:
                cell.number_format = '@'
                cell.alignment = Alignment(horizontal='center')
            elif c in (4, 5):
                cell.alignment = Alignment(horizontal='center')
            jk = ws.cell(row=r, column=5).value
            if jk == 'L':
                cell.fill = L_FILL
            elif jk == 'P':
                cell.fill = P_FILL


def save_wb(wb, filename):
    path = os.path.join(OUT, filename)
    wb.save(path)
    return path


# 1) Satu file gabungan (hanya 1 sheet -> langsung bisa diimpor aplikasi)
wb = Workbook()
ws = wb.active
ws.title = 'Data Siswa'
all_rows = [(k, n, nm, jk) for k, n, nm, jk in semua()]
for i, (kelas, nis, nama, jk) in enumerate(all_rows, start=2):
    ws.cell(row=i, column=1, value=nis)
    ws.cell(row=i, column=2, value=nama)
    ws.cell(row=i, column=3, value=SEKOLAH)
    ws.cell(row=i, column=4, value=kelas)
    ws.cell(row=i, column=5, value=jk)
    ws.cell(row=i, column=6, value=SANDI)
for c, h in enumerate(HEADER, start=1):
    ws.cell(row=1, column=c, value=h)
style_sheet(ws, len(all_rows))
path_all = save_wb(wb, 'Import-Siswa-MI-Islamiyah-4A-6B.xlsx')

# 2) File per kelas
for kelas in KELAS:
    wb = Workbook()
    ws = wb.active
    ws.title = f'Kelas {kelas}'
    ws.append(HEADER)
    for nis, nama, jk in DATA[kelas]:
        ws.append([nis, nama, SEKOLAH, kelas, jk, SANDI])
    style_sheet(ws, len(DATA[kelas]))
    save_wb(wb, f'per-kelas/Import-Siswa-MI-{kelas}.xlsx')

# 3) CSV gabungan
csv_path = os.path.join(OUT, 'Import-Siswa-MI-Islamiyah-4A-6B.csv')
with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(HEADER)
    for kelas, nis, nama, jk in all_rows:
        w.writerow([nis, nama, SEKOLAH, kelas, jk, SANDI])

# 4) JSON (untuk push ke Google Sheets)
now = datetime.now().isoformat(timespec='seconds')
students = []
for kelas, nis, nama, jk in all_rows:
    students.append({
        'id': 'std_' + uuid.uuid5(uuid.NAMESPACE_URL, 'sukma-mi-' + nis).hex[:12],
        'nis': nis,
        'name': nama,
        'school': SEKOLAH,
        'className': kelas,
        'gender': jk,
        'password': SANDI,
        'createdAt': now,
    })
json_path = os.path.join(OUT, 'siswa-mi-4-6.json')
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump({
        'school': SEKOLAH,
        'generatedAt': now,
        'count': len(students),
        'students': students,
    }, f, ensure_ascii=False, indent=1)

# 5) Rekap
wb = Workbook()
ws = wb.active
ws.title = 'Rekap per Kelas'
ws.append(['Kelas', 'Jumlah Siswa', 'Laki-laki (L)', 'Perempuan (P)'])
for r in rekap():
    ws.append([r['kelas'], r['jumlah'], r['l'], r['p']])
ws.append(['TOTAL', sum(r['jumlah'] for r in rekap()), sum(r['l'] for r in rekap()), sum(r['p'] for r in rekap())])
for c in range(1, 5):
    cell = ws.cell(row=1, column=c)
    cell.fill = HEAD_FILL
    cell.font = HEAD_FONT
    cell.alignment = Alignment(horizontal='center')
    ws.column_dimensions[get_column_letter(c)].width = 16
last = ws.max_row
for c in range(1, 5):
    ws.cell(row=last, column=c).font = Font(bold=True)
    ws.cell(row=last, column=c).fill = PatternFill('solid', fgColor='CCFBF1')
for r in range(2, last):
    for c in range(1, 5):
        ws.cell(row=r, column=c).border = BORDER
        ws.cell(row=r, column=c).alignment = Alignment(horizontal='center')

ws2 = wb.create_sheet('Daftar Semua Siswa')
ws2.append(HEADER[:5])
for kelas, nis, nama, jk in all_rows:
    ws2.append([nis, nama, SEKOLAH, kelas, jk])
style_sheet(ws2, len(all_rows))
save_wb(wb, 'Rekap-Siswa-MI-Islamiyah-4A-6B.xlsx')

print('file dibuat:')
for f in sorted(os.listdir(OUT)):
    if f.endswith(('.xlsx', '.csv', '.json')):
        print(' -', f, round(os.path.getsize(os.path.join(OUT, f)) / 1024, 1), 'KB')
print('per-kelas:', sorted(os.listdir(os.path.join(OUT, 'per-kelas'))))
