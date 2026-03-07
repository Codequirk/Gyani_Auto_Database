# Auto Portal

Portal for auto/vehicle owners to track their vehicle assignments, view payment schedules, and submit support requests.

## Features

- **Vehicle Dashboard**: View all your vehicles and their current assignments
- **Assignment Tracking**: Track active, idle, and prebooked assignments
- **Payment Schedule**: View monthly payment schedules and advance payments
- **Image Management**: Upload and manage vehicle images
- **Support Tickets**: Submit and track support tickets for vehicle issues
- **Status Updates**: Real-time updates on vehicle assignment status

## Setup

```bash
cd auto-portal
npm install
npm run dev
```

Runs on `http://localhost:3002`

## Environment Variables

Create a `.env` file:

```
VITE_API_BASE_URL=http://localhost:5001/api
```

## Related Documentation

See main [../README.md](../README.md) for full project setup. View full documentation guide at [../docs/DOCS_GUIDE.md](../docs/DOCS_GUIDE.md).

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- React Router
