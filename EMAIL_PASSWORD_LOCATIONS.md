# Email and Password Locations in Backend

## 1. User Model (`models/User.js`)

**Schema Definition:**
```javascript
email: {
  type: String,
  required: true,
  unique: true,
  trim: true,
  lowercase: true  // Automatically converts to lowercase
}

password: {
  type: String,
  required: true,
  minlength: 6
}
```

**Password Security:**
- Passwords are hashed using `bcrypt` before saving
- Salt rounds: 10
- Pre-save hook automatically hashes password
- `comparePassword()` method for verification
- Password excluded from JSON responses

## 2. Auth Routes (`routes/authRoutes.js`)

### Login Endpoint: `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "admin@gmail.com",
  "password": "admin123"
}
```

**Process:**
1. Validates email and password are provided
2. Finds user by email (case-insensitive)
3. Checks if account is active
4. Verifies password using bcrypt
5. Updates last login timestamp
6. Generates JWT token
7. Sets HTTP-only cookie
8. Returns user data (without password)

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@gmail.com",
    "role": "admin",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

### Check Auth Endpoint: `GET /api/auth/check`

Returns current user info (email included) if authenticated.

### Get Users Endpoint: `GET /api/auth/users`

Returns all users with password excluded (`.select('-password')`).

## 3. Season Ticket Model (`models/SeasonTicketMember.js`)

**Optional Fields:**
```javascript
phone: String,
email: String  // Optional contact email for season ticket holders
```

## Security Features

✅ **Password Hashing:** bcrypt with salt rounds 10
✅ **Case-Insensitive Email:** Automatically lowercased
✅ **Password Excluded:** Never sent in API responses
✅ **HTTP-Only Cookies:** Token stored securely
✅ **Account Status:** Can deactivate users
✅ **Last Login Tracking:** Monitors user activity

## Default Credentials

**Admin Account:**
- Email: `admin@gmail.com`
- Password: `admin123`
- Role: `admin`

Created via: `backend-nodejs/scripts/createAdmin.js`

## Database Collection

**Collection Name:** `users`
**Fields:**
- `_id` (ObjectId)
- `username` (String, unique)
- `email` (String, unique, lowercase)
- `password` (String, hashed)
- `role` (String: admin/operator/viewer)
- `isActive` (Boolean)
- `lastLogin` (Date)
- `createdAt` (Date)

## API Endpoints Using Email/Password

1. **POST /api/auth/login** - Login with email & password
2. **GET /api/auth/check** - Returns user with email
3. **GET /api/auth/users** - Lists all users (admin only)

## Password Requirements

- Minimum length: 6 characters
- Hashed before storage
- Cannot be retrieved (one-way hash)
- Must use comparePassword() method to verify
