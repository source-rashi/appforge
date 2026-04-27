# AppForge Deployment Guide

This document outlines the environment variables that must be configured in the Railway dashboard for the AppForge platform to function correctly in production.

## API Service (`appforge-api`)

These environment variables must be set for the API service:

- `DATABASE_URL`: Connection string for PostgreSQL. (Railway will automatically inject this if you add a PostgreSQL plugin to your project).
- `JWT_SECRET`: Secret key used for signing JSON Web Tokens. Generate a secure random string using: `openssl rand -base64 32`
- `PORT`: The port the API will listen on. (Railway injects this automatically, but it defaults to `4000` if absent).
- `FRONTEND_URL`: The full URL of your deployed Web service (e.g., `https://appforge-web-production.up.railway.app`). This is required to configure CORS appropriately.

**Optional Email Configuration:**
If these are not provided, emails (like notifications and password resets) will be output to the console log instead of being sent.
- `SMTP_HOST`: Your SMTP server host.
- `SMTP_PORT`: Your SMTP server port.
- `SMTP_USER`: SMTP username.
- `SMTP_PASS`: SMTP password.

## Web Service (`appforge-web`)

These environment variables must be set for the Web frontend:

- `NEXT_PUBLIC_API_URL`: The full URL of your deployed API service (e.g., `https://appforge-api-production.up.railway.app`). This tells the frontend where to make API requests.
- `PORT`: The port the Web server will listen on. (Railway injects this automatically).
