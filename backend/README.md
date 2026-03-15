# BathroomTosh Backend API

Node.js + Express + MongoDB backend for the BathroomTosh facility management system.

## Prerequisites

- Node.js 16+ 
- MongoDB 5.0+ (local or Atlas)
- npm or yarn

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (already provided):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/bathroom-tosh
JWT_SECRET=your_super_secret_jwt_key_change_in_production
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

## Running the Server

### Development (with hot reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

Server will run on `http://localhost:5000`

## MongoDB Setup

### Local MongoDB
```bash
# Windows
mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Update `MONGODB_URI` in `.env` with your connection string

## Database Initialization

Demo users are automatically created on first run:
- **Admin**: admin / admin123 (TECH_ADMIN)
- **Manager**: manager / manager123 (MANAGER)
- **Supervisor**: supervisor / supervisor123 (SUPERVISOR)
- **Staff**: staff / staff123 (STAFF)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (requires token)
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users (Admin/Manager only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/role` - Update user role (Admin only)
- `GET /api/users/:id/effective-role` - Get effective role with acting assignment

### Tasks
- `GET /api/tasks/user/:userId` - Get user's tasks
- `POST /api/tasks` - Create task (Supervisor+)
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id/status` - Update task status
- `POST /api/tasks/:id/notes` - Add note to task
- `POST /api/tasks/:taskId/notes/:noteId/comments` - Add comment to note

### Leave Requests
- `POST /api/leave-requests` - Submit leave request
- `GET /api/leave-requests/pending` - Get pending requests (Manager+)
- `GET /api/leave-requests/user/:userId` - Get user's leave requests
- `PATCH /api/leave-requests/:id/approve` - Approve request
- `PATCH /api/leave-requests/:id/reject` - Reject request

### Acting Roles
- `POST /api/acting-roles` - Initiate acting role delegation
- `GET /api/acting-roles/active` - Get active delegations
- `GET /api/acting-roles/user/:userId` - Get user's delegations
- `PATCH /api/acting-roles/:id/revoke` - Revoke delegation
- `POST /api/acting-roles/check-expiry` - Check and expire old assignments

### Audit Logs
- `GET /api/audit-logs` - Get all logs (Admin only)
- `GET /api/audit-logs/user/:userId` - Get user's logs
- `POST /api/audit-logs/search` - Search logs (Admin only)
- `GET /api/audit-logs/stats` - Get log statistics (Admin only)

### Health
- `GET /api/health` - API health check

## Authentication

Include JWT token in request headers:
```
Authorization: Bearer <token>
```

## Project Structure

```
backend/
├── src/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth middleware
│   └── server.js        # Express app setup
├── .env                 # Environment variables
└── package.json         # Dependencies
```

## Error Handling

All endpoints return JSON with format:
```json
{
  "success": true/false,
  "message": "...",
  "data": {}
}
```

## Notes

- All passwords are hashed using bcryptjs before storage
- JWT tokens expire after 24 hours
- Audit logs track all critical actions
- MongoDB collections are automatically created
- CORS is enabled for frontend at http://localhost:4200

## Development

To extend the API:

1. Create models in `src/models/`
2. Create routes in `src/routes/`
3. Register routes in `src/server.js`
4. Add authentication middleware as needed

## Support

For issues, check logs in terminal where server is running.
