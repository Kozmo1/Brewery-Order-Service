import dotenv from "dotenv-safe";

// Load environment variables from .env file based on NODE_ENV or default to .env.local
dotenv.config({ 
    allowEmptyValues: true, 
    path: `.env.${process.env.NODE_ENV || "local"}`, // Load .env.local if NODE_ENV is not set
    example: '.env.example' // Specify the example file explicitly
});

// Set the environment to development if not specified
const ENVIRONMENT = process.env.NODE_ENV ?? "development";

// MongoDB configuration from environment variables
const MONGO_HOST = process.env.MONGO_HOST ?? "";
const MONGO_DATABASE = process.env.MONGO_DATABASE ?? "";
const MONGO_PORT = process.env.MONGO_PORT ?? "";
const MONGO_PASSWORD = process.env.MONGO_PASSWORD ?? ""; 

// Create the MongoDB URL. Note: You might want to handle the password here if needed
const MONGO_URL = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DATABASE}`;

export const config = { // Export the configuration object
    environment: ENVIRONMENT,
    mongo: {
        url: MONGO_URL
    }
};