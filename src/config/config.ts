import dotenv from "dotenv-safe";

// Load environment variables from .env file based on NODE_ENV or default to .env.local
dotenv.config({
    allowEmptyValues: true,
    path: `.env.${process.env.NODE_ENV || "local"}`,
    example: ".env.example",
});

// Set the environment to development if not specified
const ENVIRONMENT = process.env.NODE_ENV ?? "development";

// Set the Brewery_DB_Service API URL
const BREWERY_API_URL = process.env.BREWERY_API_URL ?? "http://localhost:5089";

export interface Config {
    environment: string;
    breweryApiUrl: string;
    jwtSecret?: string;
}

export const config: Config = {
    environment: ENVIRONMENT,
    breweryApiUrl: BREWERY_API_URL,
    jwtSecret: process.env.JWT_SECRET,
};