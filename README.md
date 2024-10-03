# Wave Payroll Report Generator

The **Payroll Report Generator** is a scalable, secure, and extensible API built in **Node.js** that enables CSV file uploads for payroll data processing and provides a REST endpoint for retrieving payroll reports. 

## Technologies Used

This project utilizes several open-source technologies to ensure performance, scalability, and security:

- **Node.js**: The backbone of our backend, handling event-driven and non-blocking operations efficiently.
- **Express**: A fast and minimalist web framework for handling routing and middleware.
- **PostgreSQL**: A relational database used for storing payroll data, offering ACID compliance and excellent support for handling structured data.
- **Multer**: A middleware for handling multipart/form-data, primarily for secure and efficient file uploads.
- **CSV Parser**: To read and parse CSV files, enabling structured data extraction.
- **Jest**: A testing framework that allows us to perform unit and integration testing for all endpoints.
- **Supertest**: An HTTP assertion library used for testing REST API endpoints.

## Why I Used These Technologies

- **Node.js**: Chosen for its asynchronous nature, which is ideal for handling multiple requests concurrently and providing a scalable API.
- **Express**: Enables clean, modular routing and a wide variety of middleware to handle requests and responses efficiently.
- **PostgreSQL**: Ideal for storing and querying structured data, like payroll entries. It ensures data consistency and supports complex queries needed for payroll report generation.
- **Multer**: Provides secure handling of file uploads while enforcing file size and type limitations to protect the server from malicious files.
- **Jest**: Offers a simple yet powerful framework for writing comprehensive unit and integration tests, ensuring the reliability of our API.
- **Supertest**: Integrates seamlessly with Jest to test HTTP endpoints, allowing us to simulate various request scenarios like file uploads and API responses.

## Features

- Secure CSV file upload with real-time validation.
- Data stored in a relational database (PostgreSQL) for querying and reporting.
- REST API for retrieving payroll reports based on uploaded data.
- Automated tests to ensure the API works as expected in all scenarios.
- Scalable architecture for future enhancements and increased traffic.

## Project Structure (Fix)
```
├── index.js      # Main application logic 
├── ensure.js     # Helper appliaction that builds database and tables
├── schema.sql    # Contains schema of the tables created in ensure.js
├── package.json  # Logic for handling business operations 
├── production.js # Production level test that uses the database and proper API calls
├── __tests__     # Unit and integration tests 
|        ├── empty.csv       # Empty CSV file for testing
|        ├── valid.csv       # Valid CSV file for testing 
|        ├── invalid.txt     # Invalid file for testing 
|        ├── report.test.js  # Unit tests of reporting endpoint 
|        └── upload.test.js  # Unit tests of upload endpoint 
└── README.md     # Project documentation
```

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v22.8.0+ 
- [PostgreSQL](https://www.postgresql.org/) v17+ 

### Step-by-step Setup

1. Clone the repository:

    ```sh
    git clone https://github.com/yourorg/payroll-report-generator.git
    cd payroll-report-generator
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

3. Setup the PostgreSQL database:
- Ensure that the server is started with the following details:
    ```sh
    Username: postgres
    Password: password
    Host: 127.0.0.1 / localhost
    Port: 5433
    Database: 'postgres' #Management DB
    ```
    !Note that the above information is NOT SAFE for a production environment
- Create a PostgreSQL database named payroll_db and create tables:
    ```sh
    node ensure.js
    ```
    Output:
    ```bash
    D:\Code>node ensure.js
    Connected to database 'postgres'
    Database 'timekeeping' does not exist. Creating...
    Database 'timekeeping' created successfully.
    Database connection closed.
    Connected to database 'timekeeping' for schema setup.
    Database schema applied successfully.
    Schema setup connection closed.
    ```
4. Run the application:
    ```sh
    npm start
    ```
5. (Optional) Run tests    
    ```sh
    npm test
    ```
    
# Test Coverage
Our tests are designed to ensure that the application handles all expected cases efficiently:

## Unit tests: 
- Verify the correct functionality of individual modules, including pay period calculations and CSV parsing.
- Test the end-to-end behavior of API routes using mock database queries and file uploads.
# Test Scenarios
I have written the following tests:

### Payroll Report API Tests:

- Valid Payroll Report: Verifies that the payroll report is generated correctly when valid data exists.
- Empty Report: Ensures that an empty payroll report is returned when no data exists in the database.
- Database Error Handling: Tests if the API gracefully handles errors from the database.

### File Upload API Tests:

- Successful File Upload: Verifies that a valid CSV file is uploaded and processed correctly.
- Empty CSV File: Ensures that uploading an empty CSV returns an appropriate error message.
- No File Provided: Tests that the server responds with an error when no file is uploaded.
- Non-CSV File Upload: Ensures that attempting to upload a non-CSV file returns an error.

# Example Test Output
```bash

> wavetest@1.0.0 test
> set NODE_ENV=test&& jest

(node:1060) [DEP0044] DeprecationWarning: The `util.isArray` API is deprecated. Please use `Array.isArray()` instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 PASS  __tests__/upload.test.js
 PASS  __tests__/report.test.js

Test Suites: 2 passed, 2 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        0.71 s, estimated 1 s
Ran all test suites.

```

# Question Answers

## 1. How did I test the implementation
I wrote tests through jest for the testing of the backend, as it is the industry standard for node.js applications. Jest can also easily be integrated with GitHub Actions, so using jest for testing allows for futher development of the codebase to be automatically tested and or deployed if needed.
## 2. How would the application change in a production environment
In a production environment, I would be a lot more scrutinous of the database interactions. I only tested for generic database failures for this application, and not specific errors like malformed data or injections, which in a production environment would be very important to ensure a secure applcation. I also have produced this application in a windows environment, which depending on conditions, could cause issues with other platforms. If I was pushing to production, I would have designed the application inside a docker container so that cross-platform compatability would not have been an issue.
## 3. What compromises did I make as a result of timing
If given more time, I most definately would have spent more time writing my unit tests. Currently I only test one successful case, and one case of a few possible errors. This is, in my opinion, not comprihensive enough for an application that would be going into production. I also would want more security features like proper CORS rules and HTTPS communication for a public facing API. The last compromise I will talk about is that I did not write this API inside a docker container or with any sort of scaling framework like nginx. This would be a massive issue for the application as the userbase grows, as a single node.js instance is not intended to handle more than 15,000 requests per second. I would also have liked to add proper logging to the API, so that as a developer, I could get analytics as well as insight into what errors are occuring, as well as when and why.