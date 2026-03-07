# Company Portal

Portal for companies to view and manage their auto assignments, track payments, and submit tickets/requests.

## Features

- **Assignment Viewing**: View all assigned vehicles with dates and details
- **Calendar View**: Monthly calendar showing vehicle availability
- **Payment Tracking**: View advance and monthly payments
- **Request Management**: Submit and track company requests for new assignments
- **Ticket System**: Open support tickets and receive updates
- **Google OAuth**: Login with Google account

## Setup

```bash
cd company-portal
npm install
npm run dev
```

Runs on `http://localhost:3001`

## Environment Variables

Create a `.env` file:

```
VITE_API_BASE_URL=http://localhost:5001/api
```

## Related Documentation

- [../docs/features/COMPANY_PORTAL_GUIDE.md](../docs/features/COMPANY_PORTAL_GUIDE.md) - Detailed guide
- [../docs/setup/COMPANY_AUTH_SETUP.md](../docs/setup/COMPANY_AUTH_SETUP.md) - Authentication setup
