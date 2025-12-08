# Gmail Inbox Seeder for MunicipalLabs

Quickly seed a test Gmail inbox with 30+ realistic constituent emails for testing the MunicipalLabs app.

## Quick Start

```bash
# 1. Navigate to the seeder directory
cd scripts/gmail-seeder

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
# Copy .env.example to .env and fill in your credentials

# 4. Run the seeder
npm start
```

## Setup

### 1. Get a Gmail App Password

You'll need a Gmail App Password (not your regular password):

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Sign in with your Google account
3. Create a new app password (name it "MunicipalLabs Seeder" or similar)
4. Copy the 16-character password

### 2. Configure Environment Variables

Create a `.env` file in this directory:

```bash
SENDER_EMAIL=your-email@gmail.com
SENDER_PASS=your-app-password-here
TARGET_EMAIL=johndoe@municipallabs.ai
```

Or export them directly:

```bash
export SENDER_EMAIL=your-email@gmail.com
export SENDER_PASS=your-app-password-here
export TARGET_EMAIL=johndoe@municipallabs.ai
```

### 3. Run the Script

```bash
npm start
# or
node seed.js
```

## What It Does

The script sends **30+ emails** across these categories:

- **Potholes / Road Maintenance** - Road hazards, repair requests
- **Trash / Sanitation** - Missed pickups, damaged property
- **Parking and Tickets** - Ticket disputes, permit requests
- **Noise Complaints** - Loud neighbors, construction noise
- **Housing and Evictions** - Tenant rights, abandoned properties
- **Small Business Permits** - Food trucks, health inspections
- **Public Safety** - Suspicious activity, crosswalk safety
- **Public Records (FOIA)** - Document requests
- **Property Taxes** - Assessment disputes, exemptions
- **Community Events** - Block parties, festival permits

### Features:

- **Thread simulation**: Some emails use "Re:" subjects to simulate follow-ups
- **Attachments**: 5 emails include fake PDF/image attachments
- **Varied tone**: Polite, frustrated, urgent messages
- **Urgent flags**: Several emails marked as urgent/safety concerns
- **Realistic details**: Names, neighborhoods, case numbers

### Rate Limiting

The script waits 1.5 seconds between each email to avoid spam filters and rate limits.

## Troubleshooting

### Authentication Failed

- Make sure you're using a Gmail **App Password**, not your regular password
- Enable 2-factor authentication on your Google account first
- Check that SENDER_EMAIL and SENDER_PASS are set correctly

### Rate Limited

- Gmail has sending limits (typically 500/day for free accounts)
- The script already includes delays between sends
- If blocked, wait a few hours and try again

### Wrong Inbox

- Double-check the TARGET_EMAIL environment variable
- Make sure the target inbox exists and can receive emails

## Customization

To modify the emails, edit the `getMessages()` function in [seed.js](seed.js):

- Add more messages to the array
- Change topics, names, or content
- Adjust attachments
- Modify sender addresses

To change SMTP settings (e.g., use a different provider), edit the `createTransporter()` function.
