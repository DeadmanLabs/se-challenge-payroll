-- schema.sql

-- Create the timekeeping_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS timekeeping_reports (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(255) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Index the report_id for faster searches
CREATE INDEX IF NOT EXISTS idx_report_id ON timekeeping_reports (report_id);

-- Create the timekeeping_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS timekeeping_entries (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(255) REFERENCES timekeeping_reports(report_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours_worked DECIMAL(5, 2) NOT NULL,
    employee_id INTEGER NOT NULL,
    job_group VARCHAR(1) NOT NULL
);

-- Optional: Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_timekeeping_report_id ON timekeeping_entries (report_id);
CREATE INDEX IF NOT EXISTS idx_timekeeping_employee_id ON timekeeping_entries (employee_id);
