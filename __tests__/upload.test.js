const request = require('supertest');
const path = require('path');
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

describe('File Upload API Tests', () => {
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
        // Here we ensure that the end method is called after each test.
        mockClient.end();
    });

    test('Should successfully upload a valid CSV file', async () => {
        // Mock the database query responding no existing report_id
        mockClient.query.mockResolvedValue({});
        mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // This simulates no existing report
            .mockResolvedValueOnce({}); // This simulates a successful insertion

        const response = await request(app).post('/upload').attach('file', path.resolve(__dirname, 'time-report-1.csv'));

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            message: 'File uploaded and data stored successfully'
        });
    }, 30000);

    test('Should fail to upload an empty CSV file', async () => {
        const response = await request(app).post('/upload').attach('file', path.resolve(__dirname, 'time-report-2.csv'));

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'Invalid CSV format: File Empty'
        });
    });

    test('Should fail to upload with no file provided', async () => {
        const response = await request(app).post('/upload');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'No file uploaded'
        });
    });

    test('Should fail to upload a non-CSV file', async () => {
        const response = await request(app).post('/upload').attach('file', path.resolve(__dirname, 'time-report-3.txt'));

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'Only CSV files are allowed'
        });
    });
});

/*

Mikes Notes

Note that we do not test non-csv data with a .csv ending
Note that we do not test database functionality or error handling


*/