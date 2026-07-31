const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

// Create transport with fallback for local testing
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
  }

  // Fallback for development/testing if SMTP credentials are missing:
  // Returns a fake transport that logs emails to console cleanly
  return {
    sendMail: async (options) => {
      console.log('--------------------------------------------------');
      console.log('📧 [EMAIL DISPATCHED TO PRINCIPAL (DEV MODE)]');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Attachments: ${options.attachments ? options.attachments.length : 0}`);
      console.log('--------------------------------------------------');
      return { messageId: `dev-msg-${Date.now()}` };
    },
  };
};

// Generate PDF Buffer for Email Attachment
const generateAttendancePDFBuffer = ({ departmentName, departmentCode, date, records, summary }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'portrait' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Title & Header
      doc.fontSize(18).fillColor('#1E3A5F').text('Training Management System', { align: 'center' });
      doc.fontSize(14).fillColor('#333').text(`Attendance Report - ${departmentName} (${departmentCode})`, { align: 'center' });
      doc.fontSize(10).fillColor('#666').text(`Date: ${date}`, { align: 'center' });
      doc.moveDown();

      // Summary Box
      doc.rect(40, doc.y, 515, 50).fillAndStroke('#F3F4F6', '#E5E7EB');
      const boxY = doc.y - 45;
      doc.fontSize(9).fillColor('#111827');
      doc.text(`Total Students: ${summary.totalStudents}`, 55, boxY);
      doc.text(`Present: ${summary.present}`, 180, boxY);
      doc.text(`Absent: ${summary.absent}`, 280, boxY);
      doc.text(`Overall Attendance: ${summary.percentage}%`, 390, boxY);
      doc.moveDown(2);

      // Table Header
      const tableTop = doc.y + 10;
      const headers = ['Register No', 'Student Name', 'Morning', 'Afternoon', '%'];
      const colWidths = [110, 200, 70, 70, 65];
      let x = 40;

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E3A5F');
      headers.forEach((h, i) => {
        doc.text(h, x, tableTop, { width: colWidths[i] });
        x += colWidths[i];
      });
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#CBD5E1');

      // Table Rows
      doc.font('Helvetica').fontSize(9).fillColor('#334155');
      records.forEach((r) => {
        const rowY = doc.y + 4;
        if (rowY > 750) {
          doc.addPage({ layout: 'portrait' });
        }
        x = 40;
        const cols = [
          r.student?.registerNumber || '-',
          r.student?.name || '-',
          r.morningSession ? 'Present' : 'Absent',
          r.afternoonSession ? 'Present' : 'Absent',
          `${r.percentage}%`,
        ];
        cols.forEach((col, i) => {
          doc.text(String(col), x, doc.y, { width: colWidths[i] });
          x += colWidths[i];
        });
        doc.moveDown(0.3);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Send Attendance Report Email to Principal
 */
const sendAttendanceEmailToPrincipal = async ({
  principalEmail,
  departmentName,
  departmentCode,
  date,
  records,
  summary,
  customMessage = '',
  senderName = 'Admin',
}) => {
  const pdfBuffer = await generateAttendancePDFBuffer({
    departmentName,
    departmentCode,
    date,
    records,
    summary,
  });

  const transporter = createTransporter();

  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const rowsHtml = records
    .map(
      (r, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 10px 12px; font-family: sans-serif; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${r.student?.registerNumber || '-'}</td>
      <td style="padding: 10px 12px; font-family: sans-serif; font-size: 13px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${r.student?.name || '-'}</td>
      <td style="padding: 10px 12px; font-family: sans-serif; font-size: 13px; border-bottom: 1px solid #e2e8f0; color: ${r.morningSession ? '#16a34a' : '#dc2626'}; font-weight: bold;">${r.morningSession ? 'Present' : 'Absent'}</td>
      <td style="padding: 10px 12px; font-family: sans-serif; font-size: 13px; border-bottom: 1px solid #e2e8f0; color: ${r.afternoonSession ? '#16a34a' : '#dc2626'}; font-weight: bold;">${r.afternoonSession ? 'Present' : 'Absent'}</td>
      <td style="padding: 10px 12px; font-family: sans-serif; font-size: 13px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${r.percentage === 100 ? '#16a34a' : r.percentage === 50 ? '#d97706' : '#dc2626'};">${r.percentage}%</td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Attendance Report</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 25px 30px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; letter-spacing: 0.5px;">Training Management System</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Student Attendance Report for Principal</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #334155; margin-top: 0;">Respected Principal,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Please find below the attendance report summary for the <strong>${departmentName} (${departmentCode})</strong> department on <strong>${formattedDate}</strong>.
          </p>

          ${
            customMessage
              ? `<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #1e40af;">
                  <strong>Note from Admin (${senderName}):</strong> ${customMessage}
                 </div>`
              : ''
          }

          <!-- Summary Metric Cards -->
          <table width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
            <tr>
              <td width="24%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block;">Total Students</span>
                <span style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px; display: block;">${summary.totalStudents}</span>
              </td>
              <td width="1.3%"></td>
              <td width="24%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;">
                <span style="font-size: 11px; text-transform: uppercase; color: #166534; font-weight: bold; display: block;">Present</span>
                <span style="font-size: 20px; font-weight: bold; color: #15803d; margin-top: 4px; display: block;">${summary.present}</span>
              </td>
              <td width="1.3%"></td>
              <td width="24%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center;">
                <span style="font-size: 11px; text-transform: uppercase; color: #991b1b; font-weight: bold; display: block;">Absent</span>
                <span style="font-size: 20px; font-weight: bold; color: #b91c1c; margin-top: 4px; display: block;">${summary.absent}</span>
              </td>
              <td width="1.3%"></td>
              <td width="24%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center;">
                <span style="font-size: 11px; text-transform: uppercase; color: #1e40af; font-weight: bold; display: block;">Attendance %</span>
                <span style="font-size: 20px; font-weight: bold; color: #1d4ed8; margin-top: 4px; display: block;">${summary.percentage}%</span>
              </td>
            </tr>
          </table>

          <!-- Attendance Table -->
          <h3 style="font-size: 15px; color: #1e293b; margin-bottom: 12px; margin-top: 30px;">Student Attendance List</h3>
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr style="background-color: #1e293b; color: #ffffff;">
                  <th style="padding: 10px 12px; font-family: sans-serif; font-size: 12px; text-align: left; font-weight: 600;">Reg No</th>
                  <th style="padding: 10px 12px; font-family: sans-serif; font-size: 12px; text-align: left; font-weight: 600;">Student Name</th>
                  <th style="padding: 10px 12px; font-family: sans-serif; font-size: 12px; text-align: left; font-weight: 600;">Morning</th>
                  <th style="padding: 10px 12px; font-family: sans-serif; font-size: 12px; text-align: left; font-weight: 600;">Afternoon</th>
                  <th style="padding: 10px 12px; font-family: sans-serif; font-size: 12px; text-align: right; font-weight: 600;">%</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="5" style="padding: 15px; text-align: center; color: #94a3b8;">No attendance records found for this date.</td></tr>'}
              </tbody>
            </table>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 25px; line-height: 1.5;">
            📎 A complete PDF copy of this report has also been attached to this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
          Training Management System &copy; ${new Date().getFullYear()} &bull; Sent automatically by System Administrator
        </div>
      </div>
    </body>
    </html>
  `;

  return transporter.sendMail({
    from: process.env.SMTP_FROM || '"TMS Admin" <noreply@tms.edu>',
    to: principalEmail,
    subject: `🎓 Attendance Report: ${departmentName} (${departmentCode}) - ${formattedDate}`,
    html: htmlContent,
    attachments: [
      {
        filename: `Attendance_Report_${departmentCode}_${date}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

module.exports = {
  sendAttendanceEmailToPrincipal,
};
