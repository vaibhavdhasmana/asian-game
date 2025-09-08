# Asian Game API Server

Node.js API server for the Asian Game React application with MongoDB.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up MongoDB:**

   **Option A: MongoDB Atlas (Recommended)**

   - Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a new cluster
   - Get your connection string
   - Update `MONGODB_URI` in `.env` file

   **Option B: Local MongoDB**

   - Install MongoDB Community Server
   - Start MongoDB service
   - Use the local connection string in `.env`

3. **Configure environment:**

   - Update `.env` file with your MongoDB URI
   - Set a secure `ADMIN_KEY` for admin operations

4. **Start the server:**

   ```bash
   # Development mode (with auto-restart)
   npm run dev

   # Production mode
   npm start
   ```

The server will run on `http://localhost:7000`

## 📋 API Endpoints

### Public Endpoints

- `POST /api/asian-paint/register` - Register new user
- `GET /api/asian-paint/score/detail?uuid=...` - Get user scores
- `GET /api/asian-paint/leaderboard?scope=overall|day&day=...&limit=...` - Get leaderboards
- `GET /api/asian-paint/leaderboard/grouped?day=...` - Get grouped leaderboards

### Admin Endpoints (Require `x-admin-key` header)

- `GET /api/admin/settings` - Get app settings
- `POST /api/admin/settings/day` - Update current day
- `POST /api/admin/content/upload?day=...&game=...&group=...` - Upload CSV content
- `POST /api/admin/settings/groups-colors` - Update group colors

## 🔧 Environment Variables

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/asian-game
ADMIN_KEY=your-secure-admin-key
PORT=7000
NODE_ENV=development
```

## 🗄️ Database Schema

### Users Collection

```javascript
{
  uuid: String,
  name: String,
  score: {
    quiz: { day1: Number, day2: Number, day3: Number },
    crossword: { day1: Number, day2: Number, day3: Number },
    wordSearch: { day1: Number, day2: Number, day3: Number }
  }
}
```

### Content Collection

```javascript
{
  day: String,
  game: String,
  group: String,
  version: Number,
  data: Array
}
```

## 🧪 Testing the API

Test the health endpoint:

```bash
curl http://localhost:7000/health
```

Test leaderboard endpoint:

```bash
curl "http://localhost:7000/api/asian-paint/leaderboard?scope=overall&limit=5"
```

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a production MongoDB instance
3. Set up proper CORS origins
4. Use a process manager like PM2
5. Set up environment variables securely

## 🐛 Troubleshooting

**404 Errors:**

- Ensure server is running on port 7000
- Check that all route files are properly imported in `app.js`

**500 Internal Server Errors:**

- Check MongoDB connection
- Verify environment variables are set correctly
- Check server logs for detailed error messages

**CORS Issues:**

- Update CORS origins in `app.js` for your frontend domain

## 📝 Notes

- The server automatically creates default settings on first run
- File uploads are stored in the `uploads/` directory
- Admin operations require the `x-admin-key` header
- All endpoints return JSON responses
