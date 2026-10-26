import { AttendanceRecord, Student } from '../types';

export interface AttendanceSheetExportDetails {
  department: string;
  semester: string;
  section: string;
  subject: string;
  startMonth: string;
  endMonth: string;
}

const instituteName = 'INFRA POLYTECHNIC INSTITUTE, BARISHAL';
const instituteBoard = 'Under Technical Education Board, Dhaka';

const formatMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const getMonthsInRange = (startMonth: string, endMonth: string) => {
  const [startYear, startMonthNumber] = startMonth.split('-').map(Number);
  const [endYear, endMonthNumber] = endMonth.split('-').map(Number);
  const start = startYear * 12 + startMonthNumber - 1;
  const end = endYear * 12 + endMonthNumber - 1;

  return Array.from({ length: end - start + 1 }, (_, index) => {
    const monthIndex = start + index;
    return `${Math.floor(monthIndex / 12)}-${String((monthIndex % 12) + 1).padStart(2, '0')}`;
  });
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

export const exportAttendanceSheetToExcel = async (
  students: Student[],
  records: AttendanceRecord[],
  details: AttendanceSheetExportDetails
) => {
  if (!records.length) {
    throw new Error('No attendance sessions were found for the selected month or range.');
  }

  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = instituteName;
  workbook.subject = 'Attendance Sheet';
  workbook.title = `Attendance Sheet - ${formatMonth(details.startMonth)} to ${formatMonth(details.endMonth)}`;

  const months = getMonthsInRange(details.startMonth, details.endMonth);
  const latestRecords = new Map<string, AttendanceRecord>();
  records.forEach((record) => {
    const studentKey = record.studentId || record.roll;
    const key = `${record.date}|${studentKey}`;
    const current = latestRecords.get(key);
    if (!current || record.recordedAt >= current.recordedAt) latestRecords.set(key, record);
  });

  const border = {
    top: { style: 'thin' as const, color: { argb: 'FF111111' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF111111' } },
    left: { style: 'thin' as const, color: { argb: 'FF111111' } },
    right: { style: 'thin' as const, color: { argb: 'FF111111' } },
  };
  const fill = (color: string) => ({
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: color },
  });

  months.forEach((month) => {
    const monthRecords = records.filter((record) => record.date.startsWith(month));
    const sessionDates = Array.from(new Set(monthRecords.map((record) => record.date))).sort();
    const sessionReasons = new Map<string, string>();
    monthRecords.forEach((record) => {
      if (record.sessionReason?.trim()) sessionReasons.set(record.date, record.sessionReason.trim());
    });
    const heldSessionDates = sessionDates.filter((date) => !sessionReasons.has(date));
    const dateColumnCount = Math.max(15, sessionDates.length);
    const latestTeacherRecord = monthRecords
      .filter((record) => record.recordedBy?.trim())
      .sort((first, second) => second.recordedAt.localeCompare(first.recordedAt))[0];
    const lastColumn = 5 + dateColumnCount;
    const sheet = workbook.addWorksheet(formatMonth(month), {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 6 }],
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalDpi: 300,
        verticalDpi: 300,
        margins: { left: 0.2, right: 0.2, top: 0.15, bottom: 0.15, header: 0.05, footer: 0.05 },
      },
    });

    sheet.columns = [
      { key: 'serial', width: 6 },
      { key: 'name', width: 28 },
      { key: 'roll', width: 12 },
      ...Array.from({ length: dateColumnCount }, () => ({ width: 5 })),
      { key: 'attendance', width: 8 },
      { key: 'percentage', width: 10 },
    ];
    sheet.columns.forEach((column) => {
      column.style = { font: { name: 'Times New Roman', size: 9 } };
    });

    const mergeRow = (rowNumber: number) => sheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);
    mergeRow(1);
    sheet.getCell('A1').value = instituteName;
    sheet.getCell('A1').font = { name: 'Times New Roman', size: 14, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 21;

    mergeRow(2);
    sheet.getCell('A2').value = instituteBoard;
    sheet.getCell('A2').font = { name: 'Times New Roman', size: 10 };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 16;

    mergeRow(3);
    sheet.getCell('A3').value = `Attendance Sheet ( ${formatMonth(month)} )`;
    sheet.getCell('A3').font = { name: 'Times New Roman', size: 12, bold: true };
    sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(3).height = 18;

    const metadataLabels = [
      `Teacher Name: ${latestTeacherRecord?.recordedBy || '________________'}`,
      `Semester: ${details.semester.replace(/\s*semester/i, '')} (${details.section})`,
      `Subject: ${details.subject}`,
      `Department: ${details.department.trim().split(/\s+/)[0] || details.department}`,
      `Total Class: ${heldSessionDates.length}`,
    ];
    const metadataBoundaries = [
      1,
      Math.round(lastColumn * 0.2) + 1,
      Math.round(lastColumn * 0.35) + 1,
      Math.round(lastColumn * 0.65) + 1,
      Math.round(lastColumn * 0.9) + 1,
      lastColumn + 1,
    ];
    metadataLabels.forEach((label, index) => {
      const startColumn = metadataBoundaries[index];
      const endColumn = metadataBoundaries[index + 1] - 1;
      if (endColumn > startColumn) sheet.mergeCells(4, startColumn, 4, endColumn);
      const cell = sheet.getCell(4, startColumn);
      cell.value = label;
      cell.font = { name: 'Times New Roman', size: 8, bold: true };
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
      for (let columnNumber = startColumn; columnNumber <= endColumn; columnNumber++) {
        sheet.getCell(4, columnNumber).fill = fill('FFD9D9D9');
        sheet.getCell(4, columnNumber).border = {
          ...border,
          top: { style: 'medium', color: { argb: 'FF111111' } },
          bottom: { style: 'medium', color: { argb: 'FF111111' } },
        };
      }
    });
    sheet.getRow(4).height = 24;

    sheet.mergeCells(5, 1, 5, 3);
    const dateLabelCell = sheet.getCell('A5');
    dateLabelCell.value = 'Date';
    dateLabelCell.font = { name: 'Times New Roman', size: 10, bold: true };
    dateLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let columnNumber = 1; columnNumber <= 3; columnNumber++) {
      sheet.getCell(5, columnNumber).border = border;
    }
    const dateHeaderRow = sheet.getRow(5);
    for (let columnNumber = 4; columnNumber <= lastColumn; columnNumber++) {
      const cell = dateHeaderRow.getCell(columnNumber);
      const dateIndex = columnNumber - 4;
      if (dateIndex < dateColumnCount && sessionDates[dateIndex]) {
        cell.value = new Date(`${sessionDates[dateIndex]}T00:00:00.000Z`);
        cell.numFmt = 'd-mmm';
      }
      cell.font = { name: 'Times New Roman', size: 8, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
      cell.fill = fill('FFD9D9D9');
      cell.border = border;
    }
    dateHeaderRow.height = 42;

    const headerRow = sheet.getRow(6);
    headerRow.values = [
      'Sl',
      "Student's Name",
      'Student ID',
      ...Array.from({ length: dateColumnCount }, (_, index) =>
        sessionDates[index] ? `C${index + 1}` : ''
      ),
      'Att.',
      'Percent.',
    ];
    headerRow.height = 20;
    headerRow.eachCell((cell, columnNumber) => {
      cell.font = { name: 'Times New Roman', size: 9, bold: true };
      cell.fill = fill('FFD9D9D9');
      cell.border = border;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    students.forEach((student, index) => {
      const attendanceByDate = sessionDates.map((date) =>
        latestRecords.get(`${date}|${student.id}`) ||
        latestRecords.get(`${date}|${student.roll}`)
      );
      const presentCount = attendanceByDate.filter((record, dateIndex) =>
        record?.status === 'present' && !sessionReasons.has(sessionDates[dateIndex])
      ).length;
      const percentage = heldSessionDates.length ? Math.round((presentCount / heldSessionDates.length) * 100) : 0;
      const row = sheet.addRow([
        index + 1,
        student.name,
        student.roll,
        ...Array.from({ length: dateColumnCount }, (_, dateIndex) =>
          attendanceByDate[dateIndex]?.status === 'present' && !sessionReasons.has(sessionDates[dateIndex]) ? 'P' : ''
        ),
        presentCount,
        heldSessionDates.length ? percentage / 100 : null,
      ]);
      row.height = 15;
      row.eachCell((cell, columnNumber) => {
        cell.font = { name: 'Times New Roman', size: 9, color: { argb: 'FF111111' } };
        cell.alignment = {
          horizontal: columnNumber === 2 ? 'left' : 'center',
          vertical: 'middle',
          wrapText: columnNumber === 2,
        };
        cell.border = border;
        if (index % 2 === 1) cell.fill = fill('FFF1F1F1');
        if (columnNumber >= 4 && columnNumber < lastColumn - 1) {
          cell.font = { name: 'Times New Roman', size: 9, bold: cell.value === 'P', color: { argb: 'FF111111' } };
        }
      });

      const attendanceCell = row.getCell(lastColumn - 1);
      attendanceCell.fill = fill(heldSessionDates.length === 0 ? 'FFD9D9D9' : presentCount ? 'FF9BD18B' : 'FFF47777');
      attendanceCell.font = { name: 'Times New Roman', size: 9, bold: true };
      const percentageCell = row.getCell(lastColumn);
      percentageCell.numFmt = '0%';
      percentageCell.fill = fill(heldSessionDates.length === 0 ? 'FFD9D9D9' : percentage >= 75 ? 'FF9BD18B' : 'FFF47777');
      percentageCell.font = { name: 'Times New Roman', size: 9, bold: true };
    });

    if (students.length > 0) {
      sessionDates.forEach((date, dateIndex) => {
        const reason = sessionReasons.get(date);
        if (!reason) return;
        const columnNumber = 4 + dateIndex;
        const firstStudentRow = 7;
        const lastStudentRow = firstStudentRow + students.length - 1;
        if (students.length > 1) {
          sheet.mergeCells(firstStudentRow, columnNumber, lastStudentRow, columnNumber);
        }
        const cell = sheet.getCell(firstStudentRow, columnNumber);
        cell.value = `No Class: ${reason}`;
        cell.font = { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FF333333' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: true };
        cell.fill = fill('FFD9D9D9');
        cell.border = border;
      });
    }

    const signatureRowNumber = students.length + 8;
    const leftSignatureEnd = Math.floor(lastColumn / 2);
    const rightSignatureStart = leftSignatureEnd + 1;
    sheet.mergeCells(signatureRowNumber, 1, signatureRowNumber, leftSignatureEnd);
    sheet.getCell(signatureRowNumber, 1).value = '______________________________';
    sheet.getCell(signatureRowNumber, 1).alignment = { horizontal: 'center' };
    sheet.mergeCells(signatureRowNumber, rightSignatureStart, signatureRowNumber, lastColumn);
    sheet.getCell(signatureRowNumber, rightSignatureStart).value = '______________________________';
    sheet.getCell(signatureRowNumber, rightSignatureStart).alignment = { horizontal: 'center' };
    sheet.mergeCells(signatureRowNumber + 1, 1, signatureRowNumber + 1, leftSignatureEnd);
    sheet.getCell(signatureRowNumber + 1, 1).value = 'Department Head Signature';
    sheet.getCell(signatureRowNumber + 1, 1).alignment = { horizontal: 'center' };
    sheet.mergeCells(signatureRowNumber + 1, rightSignatureStart, signatureRowNumber + 1, lastColumn);
    sheet.getCell(signatureRowNumber + 1, rightSignatureStart).value = 'Principal Signature';
    sheet.getCell(signatureRowNumber + 1, rightSignatureStart).alignment = { horizontal: 'center' };

    sheet.pageSetup.printArea = `A1:${sheetColumnName(lastColumn)}${signatureRowNumber + 1}`;
    sheet.pageSetup.printTitlesRow = '1:6';
    sheet.pageSetup.horizontalCentered = true;
    sheet.headerFooter.oddFooter = '';
  });

  const fileSlug = [details.department, details.semester, details.section, details.startMonth, details.endMonth]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(
    new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `attendance-sheet-${fileSlug}.xlsx`
  );
};

const sheetColumnName = (column: number) => {
  let name = '';
  let currentColumn = column;
  while (currentColumn > 0) {
    const remainder = (currentColumn - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    currentColumn = Math.floor((currentColumn - 1) / 26);
  }
  return name;
};
