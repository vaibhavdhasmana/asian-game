# Node.js API Design for Asian Game App with MongoDB

## Overview

This document outlines the design for a Node.js API to support the Asian Game React application. The API will handle user registration, score management, leaderboards, and admin content uploads using MongoDB as the database.

## Architecture

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **File Uploads**: Multer
- **CSV Parsing**: csv-parser
- **Security**: Helmet, CORS
- **Environment**: dotenv for configuration

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  uuid: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  score: {
    quiz: {
      day1: { type: Number, default: 0 },
      day2: { type: Number, default: 0 },
      day3: { type: Number, default: 0 }
    },
    crossword: {
      day1: { type: Number, default: 0 },
      day2: { type: Number, default: 0 },
      day3: { type: Number, default: 0 }
    },
    wordSearch: {
      day1: { type: Number, default: 0 },
      day2: { type: Number, default: 0 },
      day3: { type: Number, default: 0 }
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### Content Collection

```javascript
{
  _id: ObjectId,
  day: { type: String, enum: ['day1', 'day2', 'day3'], required: true },
  game: { type: String, enum: ['quiz', 'crossword', 'wordSearch'], required: true },
  group: { type: String, default: 'default' },
  version: { type: Number, default: 1 },
  data: [{ type: Object }], // Parsed CSV data
  uploadedAt: { type: Date, default: Date.now }
}
```

### Settings Collection

```javascript
{
  _id: ObjectId,
  currentDay: { type: String, enum: ['day1', 'day2', 'day3'], default: 'day1' },
  groupsColors: {
    day2: [{ type: String }],
    day3: [{ type: String }]
  },
  updatedAt: { type: Date, default: Date.now }
}
```

### Groups Collection

```javascript
{
  _id: ObjectId,
  day: { type: String, enum: ['day2', 'day3'], required: true },
  groups: [{
    groupName: String,
    users: [{ type: String }], // UUIDs
    totalScore: { type: Number, default: 0 }
  }]
}
```

## API Endpoints

### Public Endpoints

#### POST /api/asian-paint/register

- **Body**: `{ name: string, uuid: string }`
- **Response**: `{ statusCode: 200|400, message: string }`
- **Logic**: Create new user if uuid doesn't exist

#### GET /api/asian-paint/score/detail

- **Query**: `uuid`
- **Response**: `{ score: object }`
- **Logic**: Return user's score object

#### GET /api/asian-paint/leaderboard

- **Query**: `scope` (overall|day), `day` (optional), `limit` (default 50)
- **Response**: `{ leaderboard: [{ name, uuid, total }] }`
- **Logic**: Aggregate scores and return sorted leaderboard

#### GET /api/asian-paint/leaderboard/grouped

- **Query**: `day` (day2|day3)
- **Response**: `{ groups: array }`
- **Logic**: Return grouped leaderboard for specified day

### Admin Endpoints (Require x-admin-key header)

#### GET /api/admin/settings

- **Response**: `{ currentDay, groupsColors }`
- **Logic**: Return current settings

#### POST /api/admin/settings/day

- **Body**: `{ currentDay: string }`
- **Response**: Success message
- **Logic**: Update current day setting

#### POST /api/admin/content/upload

- **Query**: `day`, `game`, `group` (optional)
- **Body**: FormData with `file` (CSV)
- **Response**: `{ version: number }`
- **Logic**: Parse CSV, increment version, store data

#### POST /api/admin/settings/groups-colors

- **Body**: `{ day: string, colors: array }`
- **Response**: Success message
- **Logic**: Update groups colors for specified day

## Authentication & Authorization

- **User Auth**: UUID-based, no JWT required
- **Admin Auth**: x-admin-key header validation
- **Middleware**: Check admin key for admin routes

## Project Structure

```
api/
├── src/
│   ├── models/
│   │   ├── User.js
│   │   ├── Content.js
│   │   ├── Settings.js
│   │   └── Groups.js
│   ├── routes/
│   │   ├── asian-paint.js
│   │   └── admin.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   └── csvParser.js
│   └── app.js
├── .env
├── package.json
└── server.js
```

## Dependencies

- express
- mongoose
- multer
- csv-parser
- helmet
- cors
- dotenv

## Environment Variables

- MONGODB_URI
- ADMIN_KEY
- PORT

## Deployment Considerations

- Use MongoDB Atlas for cloud database
- Implement rate limiting
- Add input validation with Joi
- Set up logging with Winston
- Configure PM2 for production
