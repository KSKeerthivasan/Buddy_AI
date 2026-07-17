# Buddy_AI
## An AI Companion to helps users accomplish their task before deadline

### Running the Application (NPM Workspaces)

Buddy AI is structured as an NPM Workspace containing `frontend`, `backend`, and `shared`.

#### 1. Install Dependencies
Run this command from the root of the project to install dependencies for all packages:
```bash
npm install
```

#### 2. Build the Shared Package
The frontend and backend depend on the `@buddy-ai/shared` package. Build it first:
```bash
npm run build -w shared
```

#### 3. Run the Backend
In a new terminal window, start the backend execution core:
```bash
npm run dev --workspace=backend
```

#### 4. Run the Frontend
In another terminal window, start the frontend UI:
```bash
npm run dev --workspace=frontend
```
