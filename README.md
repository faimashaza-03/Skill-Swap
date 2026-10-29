# SkillSwap Hub

SkillSwap Hub is a web app for sharing skills with a community. Members can create a profile, list skills they can teach and want to learn, and discover skills to add to their interests. The project includes an Express API backed by MongoDB and a static HTML, CSS, and JavaScript frontend.

## Features

- Account registration with email validation and bcrypt password hashing.
- Login and a browser dashboard for signed-in users.
- Profile bio and lists of skills to teach and learn.
- A built-in skill catalog, custom skill entry, and skill search.
- Member search by name or skill, with skill-swap request composition.
- Sent and received request management, including accepting and rejecting requests.
- Accepted connections and direct conversations with message history.
- MongoDB-backed API endpoints for member discovery, exchange requests, connections, and messages.
- Render Blueprint configuration in `render.yaml`.

The dashboard implements account access, profile editing, member discovery, requests, connections, and messaging. Its availability selection is stored in the browser and is not part of the MongoDB profile. Authentication is a prototype; see [Security and Current Limitations](#security-and-current-limitations).

## Technology

- Node.js `20.19.0` or newer
- Express 5
- MongoDB Atlas and Mongoose 9
- `bcryptjs`
- Vanilla HTML, CSS, and browser JavaScript

## Project Layout

```text
.
├── app.js                  # Express middleware and static frontend
├── config/
│   └── database.js         # MongoDB connection and lifecycle handlers
├── controllers/            # HTTP request handlers grouped by feature
│   ├── authController.js
│   ├── connectionController.js
│   ├── healthController.js
│   ├── memberController.js
│   ├── profileController.js
│   └── requestController.js
├── middleware/
│   └── requireDatabase.js  # Database availability gate
├── models/                 # Mongoose schemas for users, requests, connections, and messages
├── public/                 # Static pages and shared styles
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── style.css
│   └── theme.css
├── render.yaml             # Render web service Blueprint
├── routes/
│   └── apiRoutes.js         # API paths mapped to controllers
├── server.js               # Runtime startup and graceful shutdown
├── test/
│   └── api.test.js          # API and middleware smoke tests
├── package.json
└── package-lock.json
```

The backend follows MVC boundaries: `models/` defines persisted data, `controllers/` handles request behavior, and `routes/` maps HTTP paths to controller methods. `app.js` configures Express, while `server.js` starts and stops the application.

## Run Locally

1. Install Node.js `20.19.0` or newer and npm.
2. From the project root, install the locked dependencies:

   ```sh
   npm ci
   ```

3. Create a `.env` file in the project root with your MongoDB connection string:

   ```dotenv
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
   PORT=3001
   ```

   Replace the placeholders with your Atlas database user, password, cluster host, and database name. Percent-encode special characters in the username or password as required by MongoDB URI syntax. Never commit `.env`; it is ignored by Git.

4. Start the server:

   ```sh
   npm start
   ```

5. Open `http://localhost:3001`.

The server can serve the frontend when MongoDB is unavailable, but signup, login, and profile endpoints require a database connection. Check `http://localhost:3001/api/test` for the API status and reported database state.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes for database features | MongoDB connection string. |
| `PORT` | No | HTTP port; defaults to `3001` locally. Render supplies this automatically. |
| `NODE_ENV` | No | Set to `production` when deployed. |

The app loads `.env` with `dotenv` for local development. On Render, configure these values in the service's **Environment** settings. Keep the MongoDB URI secret.

## Tests

Run the API and middleware smoke tests with:

```sh
npm test
```

These tests cover the health endpoint, unknown API route response, and database availability middleware without requiring a live MongoDB instance.

## API Reference

All API routes are under `/api`. Database-backed routes return `503` if MongoDB is disconnected. Request and response bodies use JSON unless noted.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/test` | Health/status response with the database connection state. |
| `POST` | `/api/signup` | Create an account. Body: `{ "name", "email", "password" }`. |
| `POST` | `/api/login` | Verify credentials. Body: `{ "email", "password" }`. |
| `GET` | `/api/profile/:userId` | Load a profile's name, email, bio, and skill lists. |
| `PUT` | `/api/profile/:userId` | Save profile fields. Body: `{ "bio", "teach": [], "learn": [] }`. |
| `GET` | `/api/users?exclude=:userId&search=:term` | Find up to 50 other members; `search` is optional and matches names or skill lists. |
| `POST` | `/api/requests` | Send a skill request. Body: `{ "senderId", "receiverId", "skillOffered", "skillWanted", "message" }`. |
| `GET` | `/api/requests/:userId` | List requests sent or received by a user. |
| `PATCH` | `/api/requests/:requestId` | Accept or reject a pending request. Body: `{ "userId", "status": "accepted" }` or `"rejected"`. |
| `GET` | `/api/connections/:userId` | List connected members for a user. |
| `POST` | `/api/connections/:connectionId/messages` | Send a message. Body: `{ "senderId", "text" }`. |
| `GET` | `/api/connections/:connectionId/messages?userId=:userId` | List up to 500 messages in a connection. |

### Data Models

- **User:** name, unique normalized email, password hash, bio, skills to teach, and skills to learn.
- **Request:** sender, receiver, offered and wanted skills, optional message, and `pending`, `accepted`, or `rejected` status.
- **Connection:** exactly two users, created from an accepted request.
- **Message:** connection, sender, receiver, text, timestamps, and an optional read timestamp.

## Deploy to Render

The repository includes a Render Blueprint in `render.yaml`:

- Runtime: Node
- Build command: `npm ci`
- Start command: `npm start`
- Health check: `/api/test`
- Environment: `NODE_ENV=production` and a secret `MONGODB_URI`

In Render, create a **Blueprint** from this GitHub repository and branch `main`, or create a Web Service with the same settings. Leave the root directory blank. Provide the Atlas URI as `MONGODB_URI` in Render's environment settings; do not put credentials in the repository. Configure Atlas Network Access so the deployed service can reach the database.

The health endpoint reports HTTP success even when MongoDB is disconnected; inspect its `database` field and the service logs when diagnosing database access.

## Security and Current Limitations

This project is still a prototype. Login returns the user profile to the browser, which stores it in `sessionStorage`; the server does not currently establish a server-side session or issue a signed token. User-specific API routes accept user IDs from the client and do not authenticate those IDs against a trusted session. Do not rely on these checks to protect real user accounts or private data. Before public production use, add authentication and authorization on the server for every user-specific operation, along with appropriate rate limiting and account recovery protections.
