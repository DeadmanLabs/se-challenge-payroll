const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const BASE_URL = 'http://localhost:4489';

async function runIntegrationTest() {
    let filePath = "";
    try {
        // Generate a unique report_id to prevent conflicts
        const reportId = Date.now().toString();

        // Writing valid CSV to disk
        // White spaces causing issues, so test csv has to be formatted like this
        const csvContent = `date,hours worked,employee id,job group\n2023/04/01,10,1,A\n2023/14/01,5,1,A\n2023/20/01,3,2,B\n2023/20/01,4,1,A`;
        const csvFilePath = path.join(__dirname, 'time-report-4.csv');
        filePath = csvFilePath;
        fs.writeFileSync(csvFilePath, csvContent);

        // Upload the CSV file
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFilePath));

        console.log('Uploading CSV file...');
        const uploadResponse = await axios.post(`${BASE_URL}/upload`, formData, {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('Upload Response:', JSON.stringify(uploadResponse.data));

        // Fetch the payroll report
        console.log('Retrieving payroll report...');
        const reportResponse = await axios.get(`${BASE_URL}/report`);
        console.log('Payroll Report:', JSON.stringify(reportResponse.data, null, 2));

        // Expected Payroll Report based on the uploaded CSV
        const expectedReport = {
            payrollReport: {
                employeeReports: [
                    {
                        employeeId: '1',
                        payPeriod: {
                            startDate: '2023-01-01',
                            endDate: '2023-01-15',
                        },
                        amountPaid: '$450.00',
                    },
                    {
                        employeeId: '1',
                        payPeriod: {
                            startDate: '2023-01-16',
                            endDate: '2023-01-31',
                        },
                        amountPaid: '$120.00',
                    },
                    {
                        employeeId: '2',
                        payPeriod: {
                            startDate: '2023-01-16',
                            endDate: '2023-01-31',
                        },
                        amountPaid: '$60.00',
                    },
                ],
            },
        };

        // Compare the actual report with the expected report
        const actualReport = reportResponse.data;

        // Exact JSON compare
        function comp(obj1, obj2) {
            return JSON.stringify(obj1) === JSON.stringify(obj2);
        }

        if (comp(actualReport, expectedReport)) {
            console.log('✅ Integration Test Passed: Payroll report matches expected output.');
        } else {
            console.error('❌ Integration Test Failed: Payroll report does not match expected output.');
            console.error('Expected:', JSON.stringify(expectedReport, null, 2));
            console.error('Actual:', JSON.stringify(actualReport, null, 2));
        }

        console.log('\nAttempting to upload the same CSV file again to test duplicate handling...');
        try {
            const duplicateFormData = new FormData();
            duplicateFormData.append('file', fs.createReadStream(csvFilePath));

            const duplicateUploadResponse = await axios.post(`${BASE_URL}/upload`, duplicateFormData, {
                headers: duplicateFormData.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                validateStatus: function (status) {
                    // Resolve on status under 500
                    return status < 500;
                }
            });

            console.log('Duplicate Upload Response:', JSON.stringify(duplicateUploadResponse.data));

            // Ensure proper error code
            if (duplicateUploadResponse.status === 409) {
                console.log('✅ Duplicate Upload Test Passed: Server correctly rejected the duplicate report.');
            } else {
                console.error('❌ Duplicate Upload Test Failed: Server did not reject the duplicate report as expected.');
                console.error('Received Status:', duplicateUploadResponse.status);
                console.error('Received Response:', JSON.stringify(duplicateUploadResponse.data, null, 2));
            }
        } catch (duplicateError) {
            console.error('❌ Error during duplicate upload test:', duplicateError.message);
        }

        // Clean up: Remove the test CSV file
        fs.unlinkSync(csvFilePath);

    } catch (error) {
        if (error.response) {
            console.error('❌ Error during integration test:', error);
        } else {
            console.error('❌ Error during integration test:', error);
        }
        if (filePath != "") {
            fs.unlinkSync(filePath);
        }
    }
}

async function runIntegration() {
    try {
        const BASE_URL = 'http://localhost:4489';
        const csvFilePath = path.join(__dirname, 'time-report-42.csv');
        if (!fs.existsSync(csvFilePath)) {
            throw new Error(`CSV file not found at path: ${csvFilePath}`);
        }
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFilePath));
        console.log('Uploading time-report-42.csv...');
        const uploadResponse = await axios.post(`${BASE_URL}/upload`, formData, {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            validateStatus: function (status) {
                return status < 500;
            }
        });
        console.log('Upload Response:', JSON.stringify(uploadResponse.data));

        if (uploadResponse.status === 201 && uploadResponse.data.message === 'File uploaded and data stored successfully') {
            console.log('✅ Integration Test Passed: CSV file uploaded successfully.');
        } else {
            console.error('❌ Integration Test Failed: Upload did not behave as expected.');
            console.error('Received Status:', uploadResponse.status);
            console.error('Received Response:', JSON.stringify(uploadResponse.data, null, 2));
            return; // Exit the test as the upload did not succeed as expected
        }

        // Fetch the payroll report
        console.log('Retrieving payroll report...');
        const reportResponse = await axios.get(`${BASE_URL}/report`);
        console.log('Payroll Report:', JSON.stringify(reportResponse.data, null, 2));
        const expectedReport = {
            payrollReport: {
                employeeReports: [
                    // Employee 1
                    {
                        employeeId: '1',
                        payPeriod: {
                            startDate: '2023-11-01',
                            endDate: '2023-11-15',
                        },
                        amountPaid: '$225.00',
                    },
                    {
                        employeeId: '1',
                        payPeriod: {
                            startDate: '2023-11-16',
                            endDate: '2023-11-30',
                        },
                        amountPaid: '$330.00',
                    },
                    {
                        employeeId: '1',
                        payPeriod: {
                            startDate: '2023-12-01',
                            endDate: '2023-12-15',
                        },
                        amountPaid: '$225.00',
                    },
                    {
                        employeeId: '1',
                        payPeriod: {
                            startDate: '2023-12-16',
                            endDate: '2023-12-31',
                        },
                        amountPaid: '$330.00',
                    },
                    // Employee 2
                    {
                        employeeId: '2',
                        payPeriod: {
                            startDate: '2023-11-01',
                            endDate: '2023-11-15',
                        },
                        amountPaid: '$620.00',
                    },
                    {
                        employeeId: '2',
                        payPeriod: {
                            startDate: '2023-12-01',
                            endDate: '2023-12-15',
                        },
                        amountPaid: '$620.00',
                    },
                    // Employee 3
                    {
                        employeeId: '3',
                        payPeriod: {
                            startDate: '2023-11-01',
                            endDate: '2023-11-15',
                        },
                        amountPaid: '$885.00',
                    },
                    {
                        employeeId: '3',
                        payPeriod: {
                            startDate: '2023-12-01',
                            endDate: '2023-12-15',
                        },
                        amountPaid: '$705.00',
                    },
                    // Employee 4
                    {
                        employeeId: '4',
                        payPeriod: {
                            startDate: '2023-11-01',
                            endDate: '2023-11-15',
                        },
                        amountPaid: '$100.00',
                    },
                    {
                        employeeId: '4',
                        payPeriod: {
                            startDate: '2023-11-16',
                            endDate: '2023-11-30',
                        },
                        amountPaid: '$300.00',
                    },
                    {
                        employeeId: '4',
                        payPeriod: {
                            startDate: '2023-12-01',
                            endDate: '2023-12-15',
                        },
                        amountPaid: '$100.00',
                    },
                    {
                        employeeId: '4',
                        payPeriod: {
                            startDate: '2023-12-16',
                            endDate: '2023-12-31',
                        },
                        amountPaid: '$400.00',
                    },
                ],
            },
        };
        
        // Compare the actual report with the expected report
        const actualReport = reportResponse.data;

        // Exact JSON compare
        function comp(obj1, obj2) {
            return JSON.stringify(obj1) === JSON.stringify(obj2);
        }

        if (comp(actualReport, expectedReport)) {
            console.log('✅ Integration Test Passed: Payroll report matches expected output.');
        } else {
            console.error('❌ Integration Test Failed: Payroll report does not match expected output.');
            console.error('Expected:', JSON.stringify(expectedReport, null, 2));
            console.error('Actual:', JSON.stringify(actualReport, null, 2));
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ Error during integration test:', {
                status: error.response.status,
                data: error.response.data
            });
        } else {
            console.error('❌ Error during integration test:', error.message);
        }
    }
}

//runIntegrationTest();
runIntegration();