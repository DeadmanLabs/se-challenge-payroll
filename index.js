const express = require('express');
const multer = require('multer');
const { Client } = require('pg');
const csv = require('csv-parser');
const fs = require('fs');
const util = require('util');
const path = require('path');

const app = express();
const port = 4489;
// Using async file deletion
const unlinkAsync = util.promisify(fs.unlink); 

// Configure middleware for handling file uploads of max size (No DoS attacks)
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Connect to Database
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'timekeeping',
    password: 'password',
    port: 5433
});


/**
 * Processes a CSV file into an array of objects representing each row.
 * @param {string} filePath - The path to the CSV file that is being processed.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of objects defined from the CSV file.
 */
const processCSVFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        let headersValidated = false;
        const requiredHeaders = ['date', 'hours worked', 'employee id', 'job group'];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (headers) => {
                // Validate that all required headers are present
                const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
                if (missingHeaders.length > 0) {
                    reject(new Error(`CSV format error: Missing headers: ${missingHeaders.join(', ')}`));
                }
                headersValidated = true;
            })
            .on('data', (row) => {
                // Check if the row is not empty
                const isEmpty = Object.values(row).every(value => value === undefined || value.trim() === '');
                if (!isEmpty) {
                    results.push(row);
                }
            })
            .on('end', () => {
                if (!headersValidated) {
                    reject(new Error('CSV format error: Headers not found'));
                } else {
                    resolve(results);
                }
            })
            .on('error', (err) => reject(err));
    });
};

/**
 * Calculates the pay period that contains the specified date.
 * @param {Date} date - The date that is within the pay period we are trying to find.
 * @returns {Object} - An object containing the start and end dates of the pay period.
 */
function getPayPeriod(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (date.getDate() <= 15) {
        return {
            startDate: `${year}-${month.toString().padStart(2, '0')}-01`,
            endDate: `${year}-${month.toString().padStart(2, '0')}-15`,
        };
    }

    const lastDayOfMonth = new Date(year, month, 0).getDate();
    return {
        startDate: `${year}-${month.toString().padStart(2, '0')}-16`,
        endDate: `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth}`
    };
}

client.connect();

/**
 * Handles the file upload process and adds the entries to the database.
 * Endpoint: POST /upload
 * Middleware: upload.single('file') - Handles the uploaded file and writes it to disk then provides it via req.file
 * @param {Object} req - The Express.js request object.
 * @param {Object} res - The Express.js response object.
 */
app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    if (path.extname(file.originalname).toLowerCase() !== '.csv') {
        await unlinkAsync(file.path);
        return res.status(400).json({ error: 'Only CSV files are allowed' });
    }
    try {
        // Extract the report_id from the filename
        const fileName = path.basename(file.originalname, '.csv'); // e.g., 'time-report-42'
        const match = fileName.match(/^time-report-(\d+)$/); // Regex to extract the numeric ID

        // Validate the filename format
        if (!match) {
            await unlinkAsync(file.path); // Clean up uploaded file
            return res.status(400).json({ error: 'Invalid file name format. Expected format: time-report-x.csv' });
        }

        const reportId = match[1]; // Extracted report_id from filename

        // Check if the report_id already exists
        const existingReport = await client.query('SELECT * FROM timekeeping_reports WHERE report_id = $1', [reportId]);
        if (JSON.stringify(existingReport) !== "{}" && existingReport.rows.length > 0) {
            await unlinkAsync(file.path); // Clean up uploaded file
            return res.status(409).json({ error: 'Report ID already exists' });
        }

        const results = await processCSVFile(file.path); // Process the CSV asynchronously
        if (!Array.isArray(results) || results.length === 0) {
            console.error(JSON.stringify(results));
            await unlinkAsync(file.path);
            return res.status(400).json({ error: 'Invalid CSV format: File Empty' });
        }

        // Begin database transaction. This allows us to ensure that the full file gets inserted in case of an error
        await client.query('BEGIN');
        // Track the report that was uploaded and its ID
        await client.query(
            'INSERT INTO timekeeping_reports (report_id, filename) VALUES ($1, $2)',
            [reportId, file.originalname]
        );

        // Async insert of elements, this ensures that we don't waste time inserting sequentially
        const insertPromises = results.map(row => {
            const { date, "hours worked": hours_worked, "employee id": employee_id, "job group": job_group } = row;

            if (!date || hours_worked === undefined || employee_id === undefined || !job_group) {
                console.error(`raw: ${JSON.stringify(row)}`)
                console.error(`date: ${date}\nhours_worked: ${hours_worked}\nemployee_id: ${employee_id}\njob_group: ${job_group}`)
                throw new Error('CSV format error: Missing required fields in one or more rows');
            }
            // Parse and reformat the date from DD/MM/YYYY to YYYY-MM-DD
            const dateParts = date.split('/');
            if (dateParts.length !== 3) {
                throw new Error(`CSV format error: Invalid date format in row: ${JSON.stringify(row)}`);
            }
            const [day, month, year] = dateParts;
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            return client.query(
                'INSERT INTO timekeeping_entries (report_id, date, hours_worked, employee_id, job_group) VALUES ($1, $2, $3, $4, $5)',
                [reportId, formattedDate, hours_worked, employee_id, job_group]
            );
        });
        // Ensure that all inserts completed
        await Promise.all(insertPromises);
        // Write changes to database
        await client.query('COMMIT');
        
        await unlinkAsync(file.path); // Clean up uploaded file after processing
        res.status(201).json({ message: 'File uploaded and data stored successfully' });
    } catch (error) {
        // In case of a failure, remove all changes to the database
        await client.query('ROLLBACK');
        console.error('Error processing file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Define pay rates for the job groups
const jobGroupRates = {
    A: 30,
    B: 20
};

/**
 * Generates and returns the payroll report based on the timekeeping entries.
 * Endpoint: GET /report
 * @param {Object} req - The Express.js request object.
 * @param {Object} res - The Express.js response object.
 */
app.get('/report', async (req, res) => {
    try {
        const query = `
            SELECT date, hours_worked, employee_id, job_group
            FROM timekeeping_entries
            ORDER BY employee_id, date;
        `;
        const result = await client.query(query);
        const timekeepingData = result.rows;

        const payrollReport = { employeeReports: [] };
        const employeePayData = {};

        // Combine the entries for each employee per pay period
        timekeepingData.forEach((row) => {
            const employeeId = row.employee_id;
            const hoursWorked = row.hours_worked;
            const jobGroup = row.job_group;
            const payRate = jobGroupRates[jobGroup];
            const date = new Date(row.date);

            const payPeriod = getPayPeriod(date);

            const key = `${employeeId}-${payPeriod.startDate}-${payPeriod.endDate}`;
            if (!employeePayData[key]) {
                employeePayData[key] = {
                    employeeId,
                    payPeriod,
                    amountPaid: 0
                };
            }
            // Calculate and sum the amount paid
            employeePayData[key].amountPaid += hoursWorked * payRate;
        });
        // format report
        for (const key in employeePayData) {
            const employeeData = employeePayData[key];
            payrollReport.employeeReports.push({
                employeeId: employeeData.employeeId.toString(),
                payPeriod: employeeData.payPeriod,
                amountPaid: `$${employeeData.amountPaid.toFixed(2)}`
            });
        }
        // sort report
        payrollReport.employeeReports.sort((a, b) => {
            if (a.employeeId === b.employeeId) {
                return new Date(a.payPeriod.startDate) - new Date(b.payPeriod.startDate);
            }
            return a.employeeId - b.employeeId;
        });
        res.json({ payrollReport });
    } catch (error) {
        console.error('Error retrieving payroll report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

/* 
    This is to start the server when not in test mode. Jest doesn't use the actual server functionality, 
    it only executes the raw endpoint and checks the response. If you check package.json, you can see how
    we bypass this when running jest tests.
*/ 
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

module.exports = app;