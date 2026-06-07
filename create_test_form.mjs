import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { writeFileSync } from 'fs';

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595, 842]); // A4

const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

const { width, height } = page.getSize();
const form = pdfDoc.getForm();

// Title
page.drawText('Contact Information Form', {
  x: 50,
  y: height - 80,
  size: 22,
  font: boldFont,
  color: rgb(0.1, 0.1, 0.5),
});

page.drawLine({
  start: { x: 50, y: height - 95 },
  end: { x: width - 50, y: height - 95 },
  thickness: 1.5,
  color: rgb(0.1, 0.1, 0.5),
});

page.drawText('Please fill in all fields below.', {
  x: 50,
  y: height - 120,
  size: 11,
  font,
  color: rgb(0.4, 0.4, 0.4),
});

const fields = [
  { label: 'Full Name',     name: 'name',    y: height - 185 },
  { label: 'Email Address', name: 'email',   y: height - 285 },
  { label: 'Phone Number',  name: 'phone',   y: height - 385 },
  { label: 'Address',       name: 'address', y: height - 485, multiline: true },
];

for (const f of fields) {
  // Label
  page.drawText(f.label, {
    x: 50,
    y: f.y + 5,
    size: 12,
    font: boldFont,
    color: rgb(0.15, 0.15, 0.15),
  });

  // Box background
  const boxH = f.multiline ? 70 : 30;
  page.drawRectangle({
    x: 50,
    y: f.y - boxH,
    width: width - 100,
    height: boxH,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1,
  });

  // Form field
  if (f.multiline) {
    const tf = form.createTextField(f.name);
    tf.setText('');
    tf.enableMultiline();
    tf.addToPage(page, {
      x: 52,
      y: f.y - boxH + 2,
      width: width - 104,
      height: boxH - 4,
      textColor: rgb(0, 0, 0),
      backgroundColor: rgb(0.97, 0.97, 0.97),
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0,
      font,
    });
  } else {
    const tf = form.createTextField(f.name);
    tf.setText('');
    tf.addToPage(page, {
      x: 52,
      y: f.y - boxH + 2,
      width: width - 104,
      height: boxH - 4,
      textColor: rgb(0, 0, 0),
      backgroundColor: rgb(0.97, 0.97, 0.97),
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0,
      font,
    });
  }
}

// Footer
page.drawText('© 2026 Form Assistant Test Document', {
  x: 50,
  y: 40,
  size: 9,
  font,
  color: rgb(0.6, 0.6, 0.6),
});

const pdfBytes = await pdfDoc.save();
writeFileSync('test_form.pdf', pdfBytes);
console.log('test_form.pdf created successfully.');
