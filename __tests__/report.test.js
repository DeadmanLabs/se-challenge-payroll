const request = require('supertest');
const app = require('../index');

// Mocking the 'pg' module to prevent database intractions during the tests
jest.mock('pg', () => {
    // Create function mocks to track calls
    const mClient = {
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn()
    };
    // Provides mocked Client  constructor so we use mocks instead of the real client object
    return { Client: jest.fn(() => mClient) };
});

// "Import" the mocked Client
const { Client } = require('pg');
// "Create" the mocked Client
const mockClient = new Client();

describe('Payroll Report API Tests', () => {
    beforeAll(() => {
        // Mock console.error to supress error messages during tests
        jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
    });
    
    afterAll(() => {
        // Restore functionality to error.console when tests have completed. Not really necissary, but could be important for CI/CD
        global.console.error.mockRestore();
    });
    
    beforeEach(() => {
        // Clear all mock data before each test, prevents tests impacting each other
        jest.clearAllMocks();
    });
    afterEach(() => {
        // Clear all mock data after each test, more percautionary, but same goal as above
        jest.clearAllMocks();
    });

    test('Should return a valid payroll report for a set of records', async () => {
        // Mocking database response for report endpoint
        mockClient.query.mockResolvedValue({
            rows: [
                { date: '2023-01-04', hours_worked: 10, employee_id: 1, job_group: 'A' },
                { date: '2023-01-14', hours_worked: 5, employee_id: 1, job_group: 'A' },
                { date: '2023-01-20', hours_worked: 3, employee_id: 2, job_group: 'B' },
                { date: '2023-01-20', hours_worked: 4, employee_id: 1, job_group: 'A' },
            ]
        });
        const response = await request(app).get('/report');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            payrollReport: {
                employeeReports: [
                    {
                        employeeId: '1',
                        payPeriod: {
                            startDate: '2023-01-01',
                            endDate: '2023-01-15',
                        },
                        amountPaid: '$450.00'
                    },
                    {
                        employeeId: '1',
                        payPeriod: {
                            startDate: '2023-01-16',
                            endDate: '2023-01-31',
                        },
                        amountPaid: '$120.00'
                    },
                    {
                        employeeId: '2',
                        payPeriod: {
                            startDate: '2023-01-16',
                            endDate: '2023-01-31'
                        },
                        amountPaid: '$60.00'
                    }
                ]
            }
        });
    });

    test('Should return an empty report when there is no data', async () => {
        // Mock the database response if there are no records for the report endpoint
        mockClient.query.mockResolvedValue({
            rows: [],
        });
        const response = await request(app).get('/report');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            payrollReport: {
                employeeReports: []
            }
        });
    });

    test('Should handle database errors gracefully', async () => {
        // Mock a database error to ensure error handling
        mockClient.query.mockRejectedValue(new Error('Database error'));
        const response = await request(app).get('/report');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            error: 'Internal server error'
        });
    });
});

/*

Mikes Notes

Note that we do not handle specific database errors, only what happens if any error occurs

*/