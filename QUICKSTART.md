# Quick Start Guide

Get up and running with the Teams Jira Status Bot in 5 minutes.

## Prerequisites Check

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Azure account with bot registration
- [ ] Jira account with API token

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

1. Copy `env.template` to `.env`
2. Fill in your credentials (see SETUP.md for detailed instructions)

### 3. Build

```bash
npm run build
```

### 4. Run (Local Development)

```bash
npm run dev
```

### 5. Test Locally

1. Use ngrok: `ngrok http 3978`
2. Update bot messaging endpoint with ngrok URL
3. Open Teams and chat with your bot
4. Try commands: `help`, `tickets`, `summary`

## Quick Test Commands

Once the bot is running in Teams:

- `help` - Show available commands
- `tickets` - View your assigned tickets
- `summary` - View daily ticket summary
- `update: TICKET-123 Your update message` - Add update to a ticket

## Scheduling Daily Updates

The bot automatically sends status requests at the time specified in `DAILY_UPDATE_TIME` (default: 09:00).

To test immediately:
- Modify the scheduler cron expression in `src/services/schedulerService.ts`
- Or add a manual trigger endpoint (for testing)

## Troubleshooting

**Bot not responding?**
- Check bot is running (`npm run dev`)
- Verify messaging endpoint is correct
- Check `.env` credentials

**Jira errors?**
- Verify JIRA_BASE_URL format (no trailing slash)
- Check API token is valid
- Ensure project key exists

For detailed setup, see [SETUP.md](./SETUP.md)

