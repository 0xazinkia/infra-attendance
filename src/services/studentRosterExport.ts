import { Student } from '../types';

export interface StudentRosterExportDetails {
  department: string;
  semester: string;
  section: string;
}

const instituteName = 'Infra Polytechnic Institute';
const instituteLocation = 'Barishal';
const reportTitle = 'STUDENT & GUARDIAN CONTACT ROSTER';
const headers = ['S/N', 'Roll No', 'Student Name', 'Personal Number', 'Guardian Number'];

const getFileName = (details: StudentRosterExportDetails, extension: string) => {
  const slug = [details.department, details.semester, details.section]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `student-roster-${slug}.${extension}`;
};

const downloadFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const exportStudentRosterToExcel = async (
  students: Student[],
  details: StudentRosterExportDetails
) => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = instituteName;
  workbook.subject = reportTitle;
  workbook.title = `${reportTitle} - ${details.department} - ${details.semester}`;

  const sheet = workbook.addWorksheet('Student Roster', {
    views: [{ state: 'frozen', ySplit: 7 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [
    { key: 'serial', width: 9 },
    { key: 'roll', width: 16 },
    { key: 'name', width: 34 },
    { key: 'personal', width: 22 },
    { key: 'guardian', width: 22 },
  ];

  sheet.mergeCells('A1:E1');
  sheet.getCell('A1').value = instituteName;
  sheet.getCell('A1').font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  sheet.getRow(1).height = 32;

  sheet.mergeCells('A2:E2');
  sheet.getCell('A2').value = `${instituteLocation} | Student Attendance Portal`;
  sheet.getCell('A2').font = { name: 'Aptos', size: 10, color: { argb: 'FF475569' } };
  sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 22;

  sheet.mergeCells('A3:E3');
  sheet.getCell('A3').value = reportTitle;
  sheet.getCell('A3').font = { name: 'Aptos', size: 12, bold: true, color: { argb: 'FF047857' } };
  sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 24;

  sheet.getCell('A5').value = 'Department';
  sheet.getCell('B5').value = details.department;
  sheet.getCell('C5').value = 'Semester';
  sheet.getCell('D5').value = details.semester;
  sheet.getCell('E5').value = `Section: ${details.section}`;
  sheet.mergeCells('A6:E6');
  sheet.getCell('A6').value = `Total Students: ${students.length}`;

  [5, 6].forEach((rowNumber) => {
    const row = sheet.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.font = { name: 'Aptos', size: 10, bold: rowNumber === 5, color: { argb: 'FF334155' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber === 5 ? 'FFF1F5F9' : 'FFF8FAFC' } };
      cell.alignment = { vertical: 'middle' };
    });
    row.height = 22;
  });

  const headerRow = sheet.getRow(8);
  headerRow.values = headers;
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF065F46' } } };
  });

  students.forEach((student, index) => {
    const row = sheet.addRow([
      index + 1,
      student.roll,
      student.name,
      student.studentPhone || '',
      student.guardianPhone || '',
    ]);
    row.height = 22;
    row.eachCell((cell, columnNumber) => {
      cell.font = { name: 'Aptos', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: columnNumber < 3 ? 'center' : 'left', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  sheet.autoFilter = { from: 'A8', to: `E${8 + students.length}` };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(
    new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    getFileName(details, 'xlsx')
  );
};

export const exportStudentRosterToDocx = async (
  students: Student[],
  details: StudentRosterExportDetails
) => {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    PageOrientation,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import('docx');
  const docxBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
  };
  const columnWidths = [8, 13, 30, 24, 25];
  const createRosterCell = (text: string, index: number, isHeader = false) => new TableCell({
    width: { size: columnWidths[index], type: WidthType.PERCENTAGE },
    margins: { top: 100, bottom: 100, left: 110, right: 110 },
    borders: docxBorders,
    ...(isHeader ? { shading: { type: ShadingType.CLEAR, fill: '047857' } } : {}),
    children: [
      new Paragraph({
        alignment: isHeader || index < 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: isHeader,
            color: isHeader ? 'FFFFFF' : '1E293B',
            font: 'Arial',
            size: 18,
          }),
        ],
      }),
    ],
  });
  const createRosterRow = (values: string[], isHeader = false) => new TableRow({
    tableHeader: isHeader,
    children: values.map((value, index) => createRosterCell(value, index, isHeader)),
  });
  const tableRows = [
    createRosterRow(headers, true),
    ...students.map((student, index) => createRosterRow([
      String(index + 1),
      student.roll,
      student.name,
      student.studentPhone || '-',
      student.guardianPhone || '-',
    ])),
  ];

  const document = new Document({
    creator: instituteName,
    title: `${reportTitle} - ${details.department} - ${details.semester}`,
    description: `${instituteName} student contact roster`,
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 20, color: '1E293B' },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `${instituteName} | ${instituteLocation} | ${students.length} students`, size: 16, color: '64748B' }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: instituteName, bold: true, font: 'Arial', size: 36, color: '0F172A' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: `${instituteLocation} | Student Attendance Portal`, font: 'Arial', size: 20, color: '64748B' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 180 },
          children: [new TextRun({ text: reportTitle, bold: true, font: 'Arial', size: 26, color: '047857' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Department: ', bold: true }),
            new TextRun({ text: details.department }),
            new TextRun({ text: '     Semester: ', bold: true }),
            new TextRun({ text: details.semester }),
            new TextRun({ text: '     Section: ', bold: true }),
            new TextRun({ text: details.section }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 180 },
          children: [new TextRun({ text: `Total Students: ${students.length}`, color: '475569', size: 18 })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
      ],
    }],
  });

  downloadFile(await Packer.toBlob(document), getFileName(details, 'docx'));
};
