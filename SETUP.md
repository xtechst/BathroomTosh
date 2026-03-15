# BathroomTosh Full Stack Setup Guide

Complete setup instructions for the BathroomTosh facility management system with Angular frontend and Node.js/MongoDB backend.

## Prerequisites

- Node.js 16+ (for backend)
- MongoDB 5.0+ (local or Atlas cloud)
- npm or yarn
- Git

## Project Structure

```
BathroomTosh/
├── src/                    # Angular frontend
│   ├── app/
│   ├── environments/       # API configuration
│   └── main.ts
├── backend/                # Express.js API server
│   ├── src/
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Auth middleware
│   │   └── server.js
│   ├── package.json
│   └── .env
├── angular.json
├── package.json
└── README.md
```

## Database Setup

### Option 1: Local MongoDB

**Windows:**
```bash
# Install MongoDB
# Download from https://www.mongodb.com/try/download/community

# Start MongoDB
mongod
```

**macOS (with Homebrew):**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
sudo apt-get install mongodb
sudo systemctl start mongod
```

### Option 2: MongoDB Atlas (Cloud)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create account and sign in
3. Create a cluster
4. Get connection string
5. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bathroom-tosh
   ```

## Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Start development server
node src/server.js

# Or with auto-reload (if nodemon is installed)
npm run dev
```

Server will run on `http://localhost:5000`

**Demo Credentials (auto-created on first launch):**
- Admin: `admin` / `admin123`
- Manager: `manager` / `manager123`
- Supervisor: `supervisor` / `supervisor123`
- Staff: `staff` / `staff123`

## Frontend Setup

```bash
# Navigate to project root (if not already there)
cd ..

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will run on `http://localhost:4200`

## Running Both Simultaneously

**Terminal 1 - Backend:**
```bash
cd backend
node src/server.js
```

**Terminal 2 - Frontend:**
```bash
npm start
```

## API Endpoints

All endpoints require JWT token in `Authorization: Bearer <token>` header (except `/api/auth/login`).

### Authentication
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users (Admin/Manager)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/role` - Update user role (Admin)
- `GET /api/users/:id/effective-role` - Get role with acting assignment

### Tasks
- `GET /api/tasks/user/:userId` - Get user's tasks
- `POST /api/tasks` - Create task (Supervisor+)
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id/status` - Update task status
- `POST /api/tasks/:id/notes` - Add note to task
- `POST /api/tasks/:taskId/notes/:noteId/comments` - Add comment

### Leave Requests
- `POST /api/leave-requests` - Submit leave request
- `GET /api/leave-requests/pending` - Get pending (Manager+)
- `GET /api/leave-requests/user/:userId` - Get user's requests
- `PATCH /api/leave-requests/:id/approve` - Approve (Manager+)
- `PATCH /api/leave-requests/:id/reject` - Reject (Manager+)

### Acting Roles
- `POST /api/acting-roles` - Initiate delegation
- `GET /api/acting-roles/active` - Get active delegations
- `GET /api/acting-roles/user/:userId` - Get user's delegations
- `PATCH /api/acting-roles/:id/revoke` - Revoke delegation

### Audit Logs
- `GET /api/audit-logs` - Get all logs (Admin)
- `GET /api/audit-logs/user/:userId` - Get user's logs
- `POST /api/audit-logs/search` - Search logs
- `GET /api/audit-logs/stats` - Get statistics

### Health Check
- `GET /api/health` - Check API status

## Configuration Files

### Frontend (`src/environments/environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api'
};
```

### Backend (`backend/.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/bathroom-tosh
JWT_SECRET=your_super_secret_jwt_key_change_in_production
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network/firewall settings

### API Connection Error
- Ensure backend is running on port 5000
- Check `apiUrl` in `src/environments/environment.ts`
- Verify CORS settings in `backend/src/server.js`

### Port Already in Use
```bash
# Kill process on port 4200 (frontend)
lsof -ti:4200 | xargs kill -9

# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9
```

### Token Issues
- Clear localStorage: Developer Tools → Application → Storage → Clear
- Clear browser cache (Ctrl+Shift+Delete)
- Re-login

## Architecture

### Frontend (Angular 21+)
- Standalone components
- Signal-based state management
- Route guards for RBAC
- HTTP interceptors for JWT
- Responsive design

### Backend (Express.js)
- RESTful API
- MongoDB with Mongoose ODM
- JWT authentication
- Audit logging
- Role-based access control

### Database (MongoDB)
- Collections: users, tasks, leave_requests, acting_assignments, audit_logs
- Indexes for efficient queries
- Automatic demo data initialization

## Key Features

✅ **RBAC System**
- 4 role hierarchy (Tech Admin, Manager, Supervisor, Staff)
- Role-based route guards
- Permission matrix

✅ **Acting Role Logic**
- Temporal delegation with auto-expiration
- 5-second monitoring with forced refresh
- Prevents self-approval paradox

✅ **Task Management**
- Checklist validation (all boolean items must be toggled)
- Immutable notes with threading
- Staff vs Supervisor note tagging

✅ **Leave Management**
- Auto-escalation for Acting Supervisors
- Approval workflow
- Leave constraint checking

✅ **Audit Trail**
- All actions logged with timestamps
- User and "on-behalf-of" tracking
- Full searchability

## Development Guidelines

### Adding New API Endpoints

1. Create model in `backend/src/models/`
2. Create routes in `backend/src/routes/`
3. Register in `backend/src/server.js`
4. Update frontend service with HTTP calls

### Updating Database Schema

1. Modify model file
2. Restart backend (auto-creates new collections)
3. Run migrations if needed

### Frontend Service Updates

Services are in `src/app/services/`:
- `auth.service.ts` - Authentication and RBAC
- `task.service.ts` - Task operations

All services use HttpClient with auto-intercepted JWT tokens.

## Production Deployment

Before deploying:

1. **Frontend Build:**
   ```bash
   npm run build
   Deploy `dist/` folder to web hosting (Netlify, Vercel, etc.)
   ```

2. **Backend Deployment:**
   ```bash
   Deploy to cloud (Heroku, AWS, Azure, etc.)
   Set environment variables
   Ensure MongoDB is accessible
   ```

3. **Update `apiUrl`** in production environment configuration

4. **Change JWT_SECRET** to a strong value

5. **Enable HTTPS** for all communications

## Support & Documentation

- Frontend: See [src/app/README.md](src/app/README.md)
- Backend: See [backend/README.md](backend/README.md)
- Angular Docs: https://angular.dev
- MongoDB Docs: https://docs.mongodb.com
- Express Docs: https://expressjs.com

## License

ISC
