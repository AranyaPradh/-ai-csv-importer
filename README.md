# AI-Powered CSV Importer

An AI-powered CSV importer for converting messy lead CSV files into GrowEasy CRM-compatible records. The app supports CSV upload, preview before AI processing, AI-based CRM field extraction, skipped-record handling, MongoDB persistence, and a responsive Next.js interface.

## Tech Stack

- Frontend: Next.js, React, CSS
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- AI: OpenAI
- CSV Parsing: csv-parser

## Features

- Drag and drop CSV upload
- File picker upload
- CSV preview before confirmation
- No AI processing during preview
- AI extraction only after user confirms import
- Structured CRM JSON response
- MongoDB import job and lead storage
- Skips invalid rows with no email and no mobile number
- AI batch processing
- Retry mechanism for failed AI batches
- Stream-based/incremental CSV parsing on backend
- Virtualized table rendering for large result tables
- Dark mode
- Responsive tables with horizontal and vertical scrolling
- Sticky table headers

## Project Structure

```txt
CSV-Parser/
  backend/
    src/
      config/
      controllers/
      middlewares/
      models/
      routes/
      services/
      utils/
      app.js
      server.js
  frontend/
    src/
      app/
      constants/
      lib/
```

## CRM Fields

The AI maps CSV rows into these CRM fields:

```txt
created_at
name
email
country_code
mobile_without_country_code
company
city
state
country
lead_owner
crm_status
crm_note
data_source
possession_time
description
```

Allowed `crm_status` values:

```txt
GOOD_LEAD_FOLLOW_UP
DID_NOT_CONNECT
BAD_LEAD
SALE_DONE
```

Allowed `data_source` values:

```txt
leads_on_demand
meridian_tower
eden_park
varah_swamy
sarjapur_plots
```

## Prerequisites

Install these before running the project:

- Node.js
- MongoDB Community Server or MongoDB running locally
- MongoDB Compass, optional but recommended
- OpenAI API key

## Backend Setup

Go to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in `backend/`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/csv_importer
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

Start MongoDB locally, then run the backend:

```bash
npm run dev
```

Backend should run at:

```txt
http://localhost:5000
```

Health check:

```txt
GET http://localhost:5000/
```

## Frontend Setup

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run frontend:

```bash
npm run dev
```

Frontend should run at:

```txt
http://localhost:3000
```

By default, frontend calls backend at:

```txt
http://localhost:5000/api
```

To use another backend URL, create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

## API Endpoints

### Preview CSV

```txt
POST /api/imports/preview
```

Body type: `multipart/form-data`

```txt
key: file
value: CSV file
```

This endpoint parses the CSV and returns preview rows only. It does not call AI and does not save leads.

### Confirm Import

```txt
POST /api/imports/confirm
```

Body type: `multipart/form-data`

```txt
key: file
value: CSV file
```

This endpoint parses the CSV, sends rows to AI in batches, saves imported leads in MongoDB, and returns imported/skipped records.

## Testing Flow

1. Start MongoDB.
2. Start backend with `npm run dev` inside `backend/`.
3. Start frontend with `npm run dev` inside `frontend/`.
4. Open `http://localhost:3000`.
5. Upload a `.csv` file.
6. Verify preview table appears first.
7. Click `Upload File` to confirm import.
8. Verify parsed CRM records, skipped records, and totals.
9. Open MongoDB Compass and check:

```txt
csv_importer
  importjobs
  importedleads
```

## Sample CSV

```csv
Full Name,Phone Number,Email Address,Company,Location,Remarks,Status
Aranya,6297401817,ara@gmail.com,Glowsy,Kolkata,Client wants demo,Follow Up
Aro,6295401817,araan@gmail.com,Tech Solutions,Pune,Busy Call next week,did not connect
No Contact,,,tech tech,Delhi,no phone,bad lead
```

Expected result:

```txt
Total Rows: 3
Total Imported: 2
Total Skipped: 1
```

## Notes

- Preview does not trigger AI processing.
- AI processing starts only after confirmation.
- Rows with neither email nor mobile number are skipped.
- Missing CRM fields are returned as blank values where possible.
- Temporary uploaded CSV files are cleaned up after processing.
- Do not commit real `.env` files or API keys.

## Docker Setup

The project includes Docker support for frontend, backend, and MongoDB.

Create a root `.env` file from `.env.example`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

Run the full app with Docker Compose:

```bash
docker compose up --build
```

Services:

```txt
Frontend: http://localhost:3000
Backend:  http://localhost:5000
MongoDB:  mongodb://localhost:27017
```

Stop containers:

```bash
docker compose down
```

Remove containers and MongoDB volume:

```bash
docker compose down -v
```

## Deployment Guide

### Frontend Deployment: Vercel

1. Push this project to GitHub.
2. Go to Vercel and create a new project.
3. Import the GitHub repository.
4. Set the root directory to:

```txt
frontend
```

5. Add environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com/api
```

6. Deploy.

### Backend Deployment: Render

1. Push this project to GitHub.
2. Create a new Web Service on Render.
3. Connect the GitHub repository.
4. Set the root directory to:

```txt
backend
```

5. Set build command:

```bash
npm install
```

6. Set start command:

```bash
npm start
```

7. Add environment variables:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

8. Deploy and copy the backend URL.
9. Add that backend URL to Vercel as `NEXT_PUBLIC_API_BASE_URL`.

### Backend Deployment: Railway

1. Push this project to GitHub.
2. Create a new Railway project from GitHub.
3. Select the backend service/root folder.
4. Add environment variables:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

5. Deploy and use the generated backend domain in the frontend environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-railway-backend-domain/api
```

### Production Database

For hosted deployment, use MongoDB Atlas instead of local MongoDB.

Your production `MONGO_URI` should look like:

```txt
mongodb+srv://USERNAME:PASSWORD@cluster-url/csv_importer
```

Never commit real API keys, MongoDB passwords, or `.env` files to GitHub.
