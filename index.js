const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

const patterns = {
    // New pattern for general numbers - needs to come first to avoid conflicting with specific patterns
    numbers: /(?<!\w)(?!000)\d+(?:\.\d+)?(?!\w)/g,  // Matches standalone numbers, avoiding specific PIIs

    ssn: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
    phoneNumber: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    dateOfBirth: /\b(0[1-9]|1[0-2])[-./](0[1-9]|[12]\d|3[01])[-./]\d{4}\b/g,
    driverLicense: /\b[A-Z]\d{7}\b/g, // Basic pattern - varies by state
    creditCard: /\b\d{4}[-.]?\d{4}[-.]?\d{4}[-.]?\d{4}\b/g,
    medicalRecordNumber: /\bMRN:?\s*\d{6,10}\b/gi,
    name: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    address: /\b\d{1,6}\s+(?:[A-Za-z0-9\.-]+\s){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Trail|Trl|Way|Place|Pl|Square|Sq)\b/gi,
};


const anonymizers = {
    numbers: (number) => {
        // Preserve decimal points and leading zeros
        if (number.includes('.')) {
            const [whole, decimal] = number.split('.');
            return '0'.repeat(whole.length) + '.' + '0'.repeat(decimal.length);
        }
        return '0'.repeat(number.length);
    },

    ssn: () => "999-99-9999",
    phoneNumber: () => "555-555-5555",
    email: (email) => {
        const [username, domain] = email.split('@@');
        return `anonymous${Math.floor(Math.random() * 999)}@example.com`;
    },
    dateOfBirth: (dob) => {
        const parts = dob.split(/[-./]/);
        return `${parts[0]}/${parts[1]}/1990`;
    },
    driverLicense: () => "X9999999",
    creditCard: () => "4444-4444-4444-4444",
    medicalRecordNumber: () => `MRN: ${Math.floor(Math.random() * 9000000) + 1000000}`,
    name: (name) => {
        const nameWords = name.split(' ');
        if (nameWords.length === 1) {
            return "FN";
        }
        return nameWords.length === 2 ? "FN LN" : "FN MN LN";
    },
    address: () => "123 Privacy Street",
};

const pdfViewer = document.getElementById('pdf-viewer');
    let pdfDocument = null;
    let allPageText = '';

document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const typedarray = new Uint8Array(e.target.result);
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                pdfDocument = pdf;
                displayPDFContent();
            });
        };
        reader.readAsArrayBuffer(file);
    }
});

async function displayPDFContent() {
    pdfViewer.innerHTML = '';
    allPageText = '';

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const textContent = await page.getTextContent();
        textContent.items.forEach(item => {item.str = anonymizeText(item.str);});

        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page';
        pageDiv.style.width = `${viewport.width}px`;
        pageDiv.style.height = `${viewport.height}px`;
        pageDiv.style.position = 'relative';
        //pageDiv.style.marginBottom = '20px'; // Add some space between pages

        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'text-layer';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.position = 'absolute';

        textContent.items.forEach(item => {
            const span = document.createElement('span');
            span.textContent = item.str + ' ';
            span.style.position = 'absolute';
            span.style.left = `${item.transform[4]}px`;
            span.style.top = `${viewport.height - item.transform[5]}px`;
            span.style.fontSize = `${item.transform[0]}px`;
            span.style.fontFamily = item.fontName;
            textLayerDiv.appendChild(span);

            allPageText += item.str + ' ';
        });

        pageDiv.appendChild(textLayerDiv);
        pdfViewer.appendChild(pageDiv);
    }
}

function anonymizeText(text) {
    let anonymizedText = text;

    for (const [type, pattern] of Object.entries(patterns)) {
        if (type !== 'numbers') {  // Skip general numbers for now
            anonymizedText = anonymizedText.replace(pattern, (match) => {
                return anonymizers[type](match);
            });
        }
    }

    // Process remaining numbers last
    anonymizedText = anonymizedText.replace(patterns.numbers, anonymizers.numbers);

    return anonymizedText;
}

function displayText(text) {
    const pdfViewer = document.getElementById('pdf-viewer');
    pdfViewer.textContent = text;
}