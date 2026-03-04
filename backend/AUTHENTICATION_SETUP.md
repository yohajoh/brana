# Brana Authentication Setup Guide

This guide provides instructions on how to set up the authentication system for the Brana project.

## 1. Environment Variables

Ensure your `.env` file in the `backend` directory contains the following variables:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Authentication
JWT_SECRET=your_random_secret_string
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Mailing (Mailtrap is recommended for dev)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_user
EMAIL_PASS=your_mailtrap_pass
EMAIL_FROM=noreply@brana.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

## 2. Google OAuth Setup

To enable "Continue with Google":

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project.
3.  Navigate to **APIs & Services > Credentials**.
4.  Click **Create Credentials > OAuth client ID**.
5.  If prompted, configure the Consent Screen (Internal for testing, Public for production).
6.  Select **Web application** as the application type.
7.  Add `http://localhost:5000` to **Authorized JavaScript origins**.
8.  Add `http://localhost:5000/api/auth/google/callback` to **Authorized redirect URIs**.
9.  Copy the **Client ID** and **Client Secret** into your `.env` file.

## 3. Mailing Service

For development, use [Mailtrap](https://mailtrap.io/):

1.  Create an account and a new inbox.
2.  Copy the SMTP credentials into the `EMAIL_USER` and `EMAIL_PASS` fields in `.env`.

## 4. API Request Reference

This reference provides detailed information for every API endpoint, including request methods, URLs, authentication requirements, and comprehensive JSON request bodies.

---

### 🔐 Authentication & User Profile

#### **1. User Signup**
Registers a new user. The user will need to confirm their email before logging in.
- **Method:** `POST`
- **URL:** `/api/auth/signup`
- **Auth Required:** No
- **Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "strongpassword123"
}
```

#### **2. Confirm Email**
Confirms a user's email address using the token sent via email.
- **Method:** `GET`
- **URL:** `/api/auth/confirm-email/:token`
- **Auth Required:** No
- **Payload:** Token is passed in the URL.

#### **3. User Login**
Authenticates a user and returns a JWT cookie.
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Auth Required:** No
- **Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "strongpassword123"
}
```

#### **4. User Logout**
Logs out the current user by clearing the JWT cookie.
- **Method:** `GET`
- **URL:** `/api/auth/logout`
- **Auth Required:** Yes

#### **5. Get Current User (Me)**
Retrieves the profile of the currently logged-in user.
- **Method:** `GET`
- **URL:** `/api/auth/me`
- **Auth Required:** Yes

#### **6. Update Profile**
Updates the current user's personal information.
- **Method:** `PATCH`
- **URL:** `/api/auth/update-me`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "name": "John Updated",
  "phone": "+251912345678"
}
```

#### **7. Update Password**
Updates the current user's password.
- **Method:** `PATCH`
- **URL:** `/api/auth/update-password`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "current_password": "strongpassword123",
  "new_password": "newsecurepassword456"
}
```

#### **8. Forgot Password**
Triggers a password reset email.
- **Method:** `POST`
- **URL:** `/api/auth/forgot-password`
- **Auth Required:** No
- **Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

#### **9. Reset Password**
Resets the password using a token from the forgot-password email.
- **Method:** `POST`
- **URL:** `/api/auth/reset-password/:token`
- **Auth Required:** No
- **Request Body:**
```json
{
  "password": "newsecurepassword456"
}
```

#### **10. Google Authentication**
Initiates Google OAuth flow.
- **Method:** `GET`
- **URL:** `/api/auth/google`
- **Auth Required:** No

---

### 🛡️ Admin User Management

#### **1. Get All Users**
Retrieves a list of all registered users.
- **Method:** `GET`
- **URL:** `/api/auth/users`
- **Auth Required:** Yes (Admin Only)

#### **2. Block User**
Blocks a user from accessing the system.
- **Method:** `PATCH`
- **URL:** `/api/auth/users/:id/block`
- **Auth Required:** Yes (Admin Only)

#### **3. Unblock User**
Unblocks a previously blocked user.
- **Method:** `PATCH`
- **URL:** `/api/auth/users/:id/unblock`
- **Auth Required:** Yes (Admin Only)

---

### 📚 Book Management

#### **1. List All Books**
Retrieves a list of all books in the library.
- **Method:** `GET`
- **URL:** `/api/books`
- **Auth Required:** No

#### **2. Get Book Details**
Retrieves detailed information about a specific book.
- **Method:** `GET`
- **URL:** `/api/books/:id`
- **Auth Required:** Yes

#### **3. Add New Book**
Adds a new book to the library (Admin capability).
- **Method:** `POST`
- **URL:** `/api/books`
- **Auth Required:** Yes (Admin Only)
- **Request Body:**
```json
{
  "title": "Introduction to Algorithms",
  "author_id": "uuid-of-author-here",
  "category_id": "uuid-of-category-here",
  "description": "A comprehensive guide to algorithm design and analysis.",
  "cover_image_url": "https://example.com/covers/algo.jpg",
  "copies": 5,
  "available": 5
}
```

---

## 5. Testing Workflow

1.  **Signup**: Send `POST /api/auth/signup`. Check your Mailtrap inbox for the confirmation token.
2.  **Confirm**: Send `GET /api/auth/confirm-email/<token_from_email>`.
3.  **Login**: Send `POST /api/auth/login`. The server will set a `token` cookie in your client.
4.  **Authorized Requests**: For all "Protected" routes, ensure your client sends the `token` cookie (handled automatically by most browsers and Postman when "Include Cookies" is on).
5.  **Admin Testing**: 
    - Ensure your user has the `ADMIN` role in the database.
    - You can then test endpoints in the "Admin User Management" and "Book Management (Add Book)" sections.
