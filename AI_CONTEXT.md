# Project Architecture Guide

## 1. What this project is
This is a Node.js + Express authentication service with PostgreSQL. Its main purpose is to handle user registration and login, issue JWT tokens, and expose authentication routes.

## 2. High-level architecture
The project follows a layered structure:

1. Routes layer
   - Receives HTTP requests
   - Maps endpoints to controllers

2. Controller layer
   - Validates input
   - Calls service logic
   - Formats responses

3. Service layer
   - Contains business rules
   - Coordinates repository calls

4. Repository layer
   - Performs database queries only

5. Database layer
   - PostgreSQL via the pg package

## 3. Main entry points
- server.js
  - Starts the app and connects to the database
- index.js
  - Creates and configures the Express app
  - Registers routes and global middleware
- package.json
  - Defines scripts and dependencies

## 4. Folder-by-folder explanation

### Root files
- server.js
  - Starts the server and calls connectToDB()
- index.js
  - App configuration, middleware, route mounting, and global error middleware
- package.json
  - Project metadata, scripts, and installed packages

### config/
- db.js
  - Creates and exports the PostgreSQL pool
  - Provides connectToDB() for startup connection testing
- env.js
  - Centralizes environment variables and validation
  - Defines allowed roles and default role

### Routes/
- authRoutes.js
  - Defines authentication endpoints:
    - POST /api/createUser
    - POST /api/login

### Controller/
- auth_controller.js
  - Contains controller functions for registration and login
  - Handles request validation, service calls, and response formatting
  - Note: some older inline DB logic still exists alongside the newer service-based logic

### services/
- auth.service.js
  - Main business logic for authentication
  - Uses repository functions instead of querying the database directly

### repositories/
- user.repository.js
  - Database access layer for user-related operations
  - Contains functions such as:
    - findUserByEmail
    - createUser
    - findUserById

### validators/
- auth.validator.js
  - Validates registration and login payloads
  - Includes sanitization helpers

### middleware/
- auth.js
  - Authentication middleware (currently incomplete/legacy)
- catchAsyncError.js
  - Wrapper to catch async errors and pass them to next()
- errors.js
  - Global error handling middleware
- multer.js, uploadImage.js, uploadToCloudinary.js, etc.
  - These are present but not part of the current auth flow; they appear to support file/image uploads

### utils/
- constants.js
  - Shared constants like HTTP status codes, validation messages, regex patterns
- errorhandler.js
  - Custom ErrorHandler class for consistent errors
- jwt.js
  - JWT generation and verification helpers
- password.js
  - Password hashing and comparison helpers

## 5. Request flow for registration
Flow for user registration:
1. Client sends POST request to /api/createUser
2. authRoutes.js forwards the request to registerUser controller
3. Controller validates input
4. Controller calls authService.registerUser()
5. Service checks if email already exists
6. Service hashes password
7. Repository inserts user into PostgreSQL
8. Service generates JWT token
9. Controller returns success JSON with user and token

## 6. Request flow for login
Flow for login:
1. Client sends POST request to /api/login
2. authRoutes.js forwards to loginUser controller
3. Controller validates input
4. Controller calls authService.loginUser()
5. Service looks up user by email in the repository
6. Service compares password using bcrypt
7. Service generates JWT token
8. Controller returns success JSON with user and token

## 7. Database design assumptions
The current code expects a PostgreSQL table named users.

Likely columns used by the code:
- id
- name
- email
- password_hash
- role
- created_at
- updated_at
- is_active

The repository layer uses parameterized SQL queries, which is the correct and safe pattern.

## 8. Important implementation notes for AI
- The intended architecture is:
  Controller -> Service -> Repository -> Database
- There is some legacy or duplicate code in auth_controller.js that directly uses pool.query()
- The newer service/repository pattern is the cleaner and preferred structure
- Authentication uses JWT and cookies
- Error handling is centralized through middleware and the ErrorHandler class
- Validation logic is separated into validators/auth.validator.js

## 9. Suggested mental model for AI
When working on this project, think of it as:
- authRoutes.js = API entry points
- auth_controller.js = HTTP layer
- auth.service.js = business rules layer
- user.repository.js = DB layer
- config/db.js and config/env.js = infrastructure layer

## 10. Example of the current data flow
Request -> Route -> Controller -> Service -> Repository -> PostgreSQL -> Response

## 11. Practical guidance
If you are modifying authentication behavior:
- Prefer changing auth.service.js for business logic
- Prefer changing user.repository.js for database access
- Prefer changing auth.validator.js for validation rules
- Avoid putting raw SQL directly in controllers when possible
