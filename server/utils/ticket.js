const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateQR = async (text) => {
    return await QRCode.toBuffer(text, { width: 300, margin: 1 });
};

/**
 * Poori invoice ke saath PDF buffer banata hai
 */
exports.generateInvoicePDF = (bookingDoc, event, passDetailsList, buyerInfo) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const margin = 50;
        const contentWidth = pageWidth - margin * 2;

        // ---------- Header banner ----------
        doc.rect(0, 0, pageWidth, 130).fill('#1a1120');
        doc.fillColor('#f3b94d')
            .font('Helvetica-Bold')
            .fontSize(26)
            .text('EVENTORA', margin, 40);
        doc.fillColor('#9c94bd')
            .font('Helvetica')
            .fontSize(10)
            .text('OFFICIAL BOOKING INVOICE', margin, 72);

        doc.fillColor('#f5f1e8')
            .font('Helvetica-Bold')
            .fontSize(11)
            .text(`Ticket No: ${bookingDoc.TktCod}`, margin, 95);

        doc.y = 150;

        // ---------- Bill To / Event Info (2 columns) ----------
        const colWidth = contentWidth / 2 - 10;

        doc.fillColor('#888').font('Helvetica-Bold').fontSize(9).text('BILLED TO', margin, doc.y);
        const billToY = doc.y + 14;
        doc.fillColor('#1a1120').font('Helvetica-Bold').fontSize(12).text(buyerInfo.name || '-', margin, billToY);
        doc.fillColor('#444').font('Helvetica').fontSize(10)
            .text(buyerInfo.email || '-', margin, billToY + 16)
            .text(buyerInfo.phone || '-', margin, billToY + 30);

        const rightColX = margin + colWidth + 20;
        doc.fillColor('#888').font('Helvetica-Bold').fontSize(9).text('EVENT DETAILS', rightColX, 150);
        doc.fillColor('#1a1120').font('Helvetica-Bold').fontSize(12).text(event.title, rightColX, 164);
        doc.fillColor('#444').font('Helvetica').fontSize(10)
            .text(`Date: ${new Date(event.date).toLocaleDateString()}`, rightColX, 180)
            .text(`Location: ${event.location || '-'}`, rightColX, 194);

        doc.y = 235;

        // ---------- Divider ----------
        doc.strokeColor('#e5e0d8').lineWidth(1).moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
        doc.moveDown(1.5);

        // ---------- Pass table header ----------
        const tableTop = doc.y;
        const col1 = margin;           // Pass name
        const col2 = margin + 240;     // Qty
        const col3 = margin + 320;     // Rate
        const col4 = margin + 420;     // Amount

        doc.rect(margin, tableTop, contentWidth, 26).fill('#1a1120');
        doc.fillColor('#f3b94d').font('Helvetica-Bold').fontSize(9);
        doc.text('PASS TYPE', col1 + 12, tableTop + 8);
        doc.text('QTY', col2, tableTop + 8);
        doc.text('RATE', col3, tableTop + 8);
        doc.text('AMOUNT', col4, tableTop + 8);

        let rowY = tableTop + 26;

        passDetailsList.forEach((p, i) => {
            const rowHeight = 28;
            if (i % 2 === 1) {
                doc.rect(margin, rowY, contentWidth, rowHeight).fill('#f7f5f0');
            }
            doc.fillColor('#1a1120').font('Helvetica').fontSize(10.5);
            doc.text(p.name, col1 + 12, rowY + 9);
            doc.text(String(p.qty), col2, rowY + 9);
            doc.text(`Rs. ${p.rate}`, col3, rowY + 9);
            doc.font('Helvetica-Bold').text(`Rs. ${p.qty * p.rate}`, col4, rowY + 9);
            rowY += rowHeight;
        });

        // table border
        doc.strokeColor('#e5e0d8').lineWidth(1).rect(margin, tableTop, contentWidth, rowY - tableTop).stroke();

        doc.y = rowY + 20;

        // ---------- Totals box ----------
        const totalsBoxWidth = 220;
        const totalsBoxX = pageWidth - margin - totalsBoxWidth;
        let totalsY = doc.y;

        const subtotal = passDetailsList.reduce((sum, p) => sum + p.qty * p.rate, 0);

        doc.fontSize(10).fillColor('#555').font('Helvetica');
        doc.text('Subtotal', totalsBoxX, totalsY);
        doc.text(`Rs. ${subtotal}`, totalsBoxX + 120, totalsY, { width: 100, align: 'right' });
        totalsY += 18;

        if (bookingDoc.discount > 0) {
            doc.fillColor('#65a668').text(`Discount (${bookingDoc.PromoCod})`, totalsBoxX, totalsY);
            doc.text(`- Rs. ${bookingDoc.discount}`, totalsBoxX + 120, totalsY, { width: 100, align: 'right' });
            totalsY += 18;
        }

        doc.strokeColor('#1a1120').lineWidth(1).moveTo(totalsBoxX, totalsY + 2).lineTo(pageWidth - margin, totalsY + 2).stroke();
        totalsY += 12;

        doc.fillColor('#1a1120').font('Helvetica-Bold').fontSize(14);
        doc.text('TOTAL PAID', totalsBoxX, totalsY);
        doc.text(`Rs. ${bookingDoc.amount}`, totalsBoxX + 100, totalsY, { width: 120, align: 'right' });

        doc.y = totalsY + 50;

        // ---------- Footer ----------
        doc.strokeColor('#e5e0d8').lineWidth(1).moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
        doc.moveDown(1);
        doc.fillColor('#999').font('Helvetica').fontSize(9)
            .text('Please show the QR code sent separately (in this email) at entry for scanning.', margin, doc.y, { width: contentWidth, align: 'center' })
            .moveDown(0.3)
            .text(`Booking Date: ${new Date(bookingDoc.createdAt || Date.now()).toLocaleString()}`, { width: contentWidth, align: 'center' })
            .moveDown(0.3)
            .fillColor('#bbb')
            .text('This is a system-generated invoice from Eventora.', { width: contentWidth, align: 'center' });

        doc.end();
    });
};

/**
 * PDF buffer ko public/customers folder mein save karta hai
 * Naming: phoneOrIdentifier_YYYYMMDD_HHMMSS.pdf
 * Returns: saved file ka absolute path
 */
exports.saveInvoiceToDisk = (pdfBuffer, identifier) => {
    const dir = path.resolve(__dirname, '../public/customers');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeIdentifier = String(identifier).replace(/[^a-zA-Z0-9]/g, '');

    const filename = `${safeIdentifier}_${dateStr}_${timeStr}.pdf`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, pdfBuffer);
    return { filename, filepath };
};