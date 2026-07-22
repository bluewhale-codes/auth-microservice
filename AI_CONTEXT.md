# Project Architecture Guide

## 1. What this project is
This repository is a Node.js + Express backend for authentication, user management, and profile-related workflows. It is structured as a modular monolithic API rather than a microservice system.

## 2. Tech stack
- Runtime: Node.js
- Framework: Express
- Database: PostgreSQL
- Database client: pg
- Authentication: JWT + bcrypt/bcryptjs
- Email/OTP: Resend
- File uploads: Multer, Cloudinary, Streamifier
- Other utilities: dotenv, cors, helmet, cookie-parser, express-rate-limit

## 3. Database used
This project uses PostgreSQL as its primary database.

Important details:
- The connection is managed in config/db.js using a pg Pool.
- The database URL is loaded from process.env.DATABASE_URL.
- Connection pooling is enabled and SSL is configured for the connection.
- The query layer is split into repository modules, which keeps DB access isolated from controllers and services.

## 4. High-level architecture
The project follows a layered architecture:

1. Routes layer
   - Receives HTTP requests
   - Maps endpoints to controller functions

2. Controller layer
   - Handles request/response flow
   - Calls services and prepares API responses

3. Service layer
   - Contains business logic
   - Coordinates validation, auth, OTP, profile, and repository operations

4. Repository layer
   - Performs database operations using SQL queries
   - Keeps database logic out of controllers

5. Middleware and utilities
   - Handles auth, validation, error handling, uploads, rate limiting, and shared helpers

6. Infrastructure/config layer
   - Manages environment variables, database connection, and app startup

## 5. Main entry points
- server.js
  - Starts the server and connects to the database before listening
- index.js
  - Creates the Express app, registers middleware, mounts routes, and attaches global error handling
- package.json
  - Defines dependencies and startup scripts

## 6. Folder-by-folder explanation

### Root files
- server.js
  - Starts the application and calls connectToDB()
- index.js
  - Configures the Express app and mounts API routes
- package.json
  - Lists project dependencies and scripts

### config/
- db.js
  - Creates and exports the PostgreSQL connection pool
  - Exposes connectToDB(), query(), and transaction()
- env.js
  - Centralizes environment configuration and shared constants

### Routes/
- authRoutes.js
  - Defines authentication and user-related endpoints

### Controller/
- auth_controller.js
  - Handles incoming auth requests and passes them to services

### services/
- auth.service.js
  - Core authentication business logic
- workerAuth.service.js
  - Worker-specific auth logic
- email.service.js
  - Email/OTP-related operations
- cloudinary.service.js
  - File upload integration to Cloudinary

### repositories/
- user.repository.js
  - User-related database access
- student.repository.js
  - Student-related DB access
- workerMaster.repository.js
  - Worker-related DB access
- studentProfile.repository.js / workerProfile.repository.js / facultyProfile.repository.js
  - Profile-specific repository logic
- otp.repository.js / workerOtp.repository.js
  - OTP storage and verification access

### validators/
- auth.validator.js
  - Validation for auth payloads
- student.validator.js, worker.validator.js, faculty.validator.js, login.validator.js, refreshToken.validator.js
  - Domain-specific request validation

### middleware/
- auth.js
  - Authentication middleware
- catchAsyncError.js
  - Wraps async code and forwards errors safely
- errors.js
  - Global error-handling middleware
- multer.js, uploadImage.js, uploadToCloudinary.js, uploadScript.js
  - File upload and processing middleware
- rateLimiter.js
  - Request throttling middleware

### utils/
- constants.js
  - Shared HTTP status codes, error messages, and reusable values
- errorhandler.js
  - Custom error class for consistent API errors
- jwt.js
  - JWT generation and verification helpers
- password.js
  - Password hashing and comparison
- otp.js
  - OTP helpers

## 7. Request flow example
A typical request follows this path:

Request -> Route -> Controller -> Service -> Repository -> PostgreSQL -> Response

Example for authentication:
1. Client sends a request to an auth endpoint
2. Route forwards it to the controller
3. Controller validates input and calls the service
4. Service applies business rules and calls repository functions
5. Repository executes PostgreSQL queries
6. The service returns a response, which the controller sends back to the client

## 8. Current functional areas
- User registration and login
- JWT-based authentication and refresh-token flow
- OTP verification
- Student, worker, and faculty profile handling
- Cloudinary-based identity image uploads
- Role-based access patterns

## 9. AI guidance for this codebase
When working in this repository:
- Prefer updating the service layer for business logic
- Prefer updating repository modules for database queries
- Prefer updating validator files for input validation rules
- Keep error handling consistent with the existing middleware and ErrorHandler pattern
- Avoid placing raw SQL directly inside controllers when possible
- Follow the existing layered structure rather than introducing ad-hoc logic
