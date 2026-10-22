// ============================================================
// CONFIGURATION
// ============================================================

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
    'pdf',
    'doc',
    'docx',
    'ppt',
    'pptx',
    'xlsx',
    'txt',
    'jpg',
    'jpeg',
    'png'
]);


// ============================================================
// DOM ELEMENTS
// ============================================================

const fileInput = document.getElementById('file');
const scanButton = document.getElementById('scan');
const statusBox = document.getElementById('status');
const resultSection = document.getElementById('result');
const drop = document.getElementById('drop');

const filenameBox = document.getElementById('filename');
const summaryBox = document.getElementById('summary');
const fieldsBox = document.getElementById('fields');
const tablesBox = document.getElementById('tables');
const rawBox = document.getElementById('raw');
const downloadButton = document.getElementById('download');

let lastResult = null;


// ============================================================
// STATUS MESSAGE
// ============================================================

function status(message, error = false) {

    statusBox.textContent = message;

    statusBox.classList.toggle(
        'error',
        error
    );
}


// ============================================================
// FILE VALIDATION
// ============================================================

function validate(file) {

    if (!file) {
        return 'Select a file first.';
    }

    const extension = file.name
        .split('.')
        .pop()
        .toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
        return 'Unsupported file type.';
    }

    if (file.size > MAX_BYTES) {
        return 'File exceeds the 10 MB limit.';
    }

    if (file.size === 0) {
        return 'File is empty.';
    }

    return null;
}


// ============================================================
// FILE SELECTED
// ============================================================

function selected() {

    const file = fileInput.files[0];

    if (file) {

        const sizeMB = (
            file.size /
            1024 /
            1024
        ).toFixed(2);

        filenameBox.textContent =
            `${file.name} (${sizeMB} MB)`;

    } else {

        filenameBox.textContent =
            'No file selected';
    }

    const error = file
        ? validate(file)
        : null;

    scanButton.disabled =
        !file || Boolean(error);

    status(error || '');

    resultSection.hidden = true;

    lastResult = null;
}


// ============================================================
// FILE INPUT
// ============================================================

fileInput.addEventListener(
    'change',
    selected
);


// ============================================================
// DRAG AND DROP
// ============================================================

[
    'dragenter',
    'dragover'
].forEach(eventName => {

    drop.addEventListener(
        eventName,
        event => {

            event.preventDefault();

            drop.classList.add('drag');
        }
    );
});


[
    'dragleave',
    'drop'
].forEach(eventName => {

    drop.addEventListener(
        eventName,
        event => {

            event.preventDefault();

            drop.classList.remove('drag');
        }
    );
});


drop.addEventListener(
    'drop',
    event => {

        const files =
            event.dataTransfer.files;

        if (!files.length) {
            return;
        }

        fileInput.files = files;

        selected();
    }
);


// ============================================================
// CREATE FIELD
// ============================================================

function createField(label, value) {

    const card =
        document.createElement('div');

    card.className = 'field';


    const title =
        document.createElement('b');

    title.textContent = label;


    const content =
        document.createElement('span');


    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {

        content.textContent =
            'Not found';

    } else if (
        typeof value === 'object'
    ) {

        content.textContent =
            JSON.stringify(
                value,
                null,
                2
            );

    } else {

        content.textContent =
            String(value);
    }


    card.append(
        title,
        content
    );

    return card;
}


// ============================================================
// RENDER RESULT
// ============================================================

function render(data) {

    lastResult = data;

    resultSection.hidden = false;


    // --------------------------------------------------------
    // DOCUMENT SUMMARY
    // --------------------------------------------------------

    const documentType =
        data.document_type ||
        'Other Document';

    const category =
        data.category ||
        'Other';


    let summary =
        `${documentType} · ${category}`;


    if (data.notes) {

        summary +=
            ` · ${data.notes}`;
    }


    summaryBox.textContent =
        summary;


    // --------------------------------------------------------
    // STRUCTURED FIELDS
    // --------------------------------------------------------

    fieldsBox.replaceChildren();


    const fields =
        data.fields || {};


    Object.entries(fields).forEach(
        ([key, value]) => {

            const label = key
                .replaceAll('_', ' ');

            fieldsBox.appendChild(
                createField(
                    label,
                    value
                )
            );
        }
    );


    // --------------------------------------------------------
    // TABLES
    // --------------------------------------------------------

    tablesBox.replaceChildren();


    const tables =
        Array.isArray(data.tables)
            ? data.tables
            : [];


    tables.forEach(
        (tableData, index) => {

            const wrapper =
                document.createElement('div');

            wrapper.className =
                'table-scroll';


            // ------------------------------------------------
            // TABLE TITLE
            // ------------------------------------------------

            const heading =
                document.createElement('h4');

            heading.textContent =
                tableData.title ||
                `Table ${index + 1}`;

            wrapper.appendChild(
                heading
            );


            // ------------------------------------------------
            // CREATE TABLE
            // ------------------------------------------------

            const table =
                document.createElement('table');


            const headers =
                Array.isArray(
                    tableData.headers
                )
                    ? tableData.headers
                    : [];


            const rows =
                Array.isArray(
                    tableData.rows
                )
                    ? tableData.rows
                    : [];


            // ------------------------------------------------
            // HEADERS
            // ------------------------------------------------

            if (headers.length) {

                const thead =
                    document.createElement('thead');

                const headerRow =
                    document.createElement('tr');


                headers.forEach(
                    header => {

                        const th =
                            document.createElement('th');

                        th.textContent =
                            String(
                                header ?? ''
                            );

                        headerRow.appendChild(
                            th
                        );
                    }
                );


                thead.appendChild(
                    headerRow
                );

                table.appendChild(
                    thead
                );
            }


            // ------------------------------------------------
            // ROWS
            // ------------------------------------------------

            const tbody =
                document.createElement('tbody');


            rows.forEach(
                row => {

                    const tableRow =
                        document.createElement('tr');


                    const values =
                        Array.isArray(row)
                            ? row
                            : [row];


                    values.forEach(
                        value => {

                            const td =
                                document.createElement('td');

                            td.textContent =
                                String(
                                    value ?? ''
                                );

                            tableRow.appendChild(
                                td
                            );
                        }
                    );


                    tbody.appendChild(
                        tableRow
                    );
                }
            );


            table.appendChild(
                tbody
            );


            wrapper.appendChild(
                table
            );


            tablesBox.appendChild(
                wrapper
            );
        }
    );


    // --------------------------------------------------------
    // RAW TEXT
    // --------------------------------------------------------

    rawBox.textContent =
        data.raw_text || '';
}


// ============================================================
// SCAN DOCUMENT
// ============================================================

scanButton.addEventListener(
    'click',
    async () => {

        const file =
            fileInput.files[0];


        const validationError =
            validate(file);


        if (validationError) {

            status(
                validationError,
                true
            );

            return;
        }


        scanButton.disabled = true;

        resultSection.hidden = true;


        status(
            'Reading document and analyzing with Amazon Bedrock…'
        );


        try {

            // ------------------------------------------------
            // PREPARE FILE
            // ------------------------------------------------

            const body =
                new FormData();


            body.append(
                'file',
                file
            );


            // ------------------------------------------------
            // SEND DOCUMENT
            //
            // No API_BASE is used.
            //
            // AWS Amplify will receive /api/scan and later
            // forward it to our Python backend.
            // ------------------------------------------------

            const response =
                await fetch(
                    '/api/scan',
                    {
                        method: 'POST',
                        body: body
                    }
                );


            // ------------------------------------------------
            // READ RESPONSE SAFELY
            // ------------------------------------------------

            let payload;


            try {

                payload =
                    await response.json();

            } catch {

                throw new Error(
                    'The backend returned an invalid response.'
                );
            }


            // ------------------------------------------------
            // HANDLE BACKEND ERRORS
            // ------------------------------------------------

            if (!response.ok) {

                throw new Error(
                    payload.detail ||
                    'Document scan failed.'
                );
            }


            // ------------------------------------------------
            // DISPLAY RESULT
            // ------------------------------------------------

            render(payload);


            status(
                'Scan complete. Review important fields against the original document.'
            );

        } catch (error) {

            console.error(
                'Document scan failed:',
                error
            );


            status(
                error.message ||
                'Unable to scan document.',
                true
            );

        } finally {

            scanButton.disabled =
                false;
        }
    }
);


// ============================================================
// DOWNLOAD JSON
// ============================================================

downloadButton.addEventListener(
    'click',
    () => {

        if (!lastResult) {

            status(
                'No scan result is available to download.',
                true
            );

            return;
        }


        const json =
            JSON.stringify(
                lastResult,
                null,
                2
            );


        const blob =
            new Blob(
                [json],
                {
                    type: 'application/json'
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement('a');


        link.href =
            url;

        link.download =
            'document-extraction.json';


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        setTimeout(
            () => {

                URL.revokeObjectURL(
                    url
                );

            },
            1000
        );
    }
);