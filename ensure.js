const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database Configuration
const config = {
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'password',
    port: 5433,
};

const targetDB = 'timekeeping';
const schemaFilePath = path.join(__dirname, 'schema.sql');

const client = new Client(config);

async function checkAndCreateDatabase() {
    try {
        await client.connect();
        console.log(`Connected to database '${config.database}'`);

        // Check if the target database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname=$1`, [targetDB]);
        if (res.rowCount === 0) {
            // Database does not exist, create it
            console.log(`Database '${targetDB}' does not exist. Creating...`);
            /*
            // OK so we use an admin account to own the db, but if it doesn't exist, you should uncomment the query below

            await client.query(`
                CREATE ROLE admin WITH
                    LOGIN
                    PASSWORD 'timekeeper_pass'
                    NOSUPERUSER
                    NOCREATEDB
                    NOCREATEROLE
                    NOREPLICATION
            `);
            */
            await client.query(`CREATE DATABASE ${targetDB} OWNER admin`);
            console.log(`Database '${targetDB}' created successfully.`);
        } else {
            console.log(`Database '${targetDB}' already exists.`);
        }
    } catch (error) {
        console.error('Error checking/creating database:', error.message);
        process.exit(1); // Exit with failure
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

async function applySchema() {
    // Connect to newly created database
    const schemaConfig = {
        user: 'admin',
        host: process.env.PGHOST || 'localhost',
        database: targetDB,
        password: 'timekeeper_pass',
        port: 5433,
    };

    const schemaClient = new Client(schemaConfig);

    try {
        await schemaClient.connect();
        console.log(`Connected to database '${targetDB}' for schema setup.`);
        // Install schema
        const schemaSQL = fs.readFileSync(schemaFilePath, 'utf-8');
        await schemaClient.query(schemaSQL);
        console.log('Database schema applied successfully.');
    } catch (error) {
        console.error('Error applying database schema:', error.message);
        process.exit(1); // Exit with failure
    } finally {
        await schemaClient.end();
        console.log('Schema setup connection closed.');
    }
}

async function main() {
    await checkAndCreateDatabase();
    await applySchema();
}

main();
