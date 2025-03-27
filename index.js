const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 52175;

app.use(cors());
app.use(express.static('public'));

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

app.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        const inputPath = req.file.path;
        const pdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const originalPageCount = pdfDoc.getPageCount();
        let pageCount = originalPageCount;
        
        // Add blank pages at the END if needed to make total pages multiple of 4
        const blankPagesNeeded = (4 - (pageCount % 4)) % 4;
        if (blankPagesNeeded > 0) {
            // Always add blank pages at the end
            for (let i = 0; i < blankPagesNeeded; i++) {
                // Insert completely blank page at the end
                pdfDoc.addPage();
                pageCount++;
            }
        }
        
        // Standard booklet page ordering (8,1,2,7,6,3,4,5 for 8-page example)
        const pageOrder = [];
        const totalPages = pageCount;
        const totalSheets = Math.ceil(totalPages / 4);
        
        for (let sheet = 0; sheet < totalSheets; sheet++) {
            const first = totalPages - (sheet * 2) - 1;
            const second = sheet * 2;
            const third = second + 1;
            const fourth = first - 1;
            
            // Add pages in proper booklet order
            if (first >= 0 && first < totalPages) pageOrder.push(first);
            if (second >= 0 && second < totalPages) pageOrder.push(second);
            if (third >= 0 && third < totalPages) pageOrder.push(third);
            if (fourth >= 0 && fourth < totalPages) pageOrder.push(fourth);
        }

        // Create new PDF with booklet order
        const newPdf = await PDFDocument.create();
        for (const pageNum of pageOrder) {
            const [page] = await newPdf.copyPages(pdfDoc, [pageNum]);
            newPdf.addPage(page);
        }

        const newPdfBytes = await newPdf.save();
        const outputPath = path.join('public', 'booklet.pdf');
        fs.writeFileSync(outputPath, newPdfBytes);
        
        res.json({ success: true, url: '/booklet.pdf' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});