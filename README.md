# StandupChatBot

A Microsoft Teams bot that sends daily status update requests for Jira tickets and provides summaries of what has been done and what needs to be done.

## Features

- 🤖 **Daily Status Requests**: Automatically sends status update requests to team members before a specified time
- 📊 **Ticket Summaries**: Generates daily summaries showing completed, in-progress, and pending tickets
- 🔄 **Jira Integration**: Fetches and updates Jira tickets through the Jira REST API
- 💬 **Interactive Commands**: Users can view their tickets, request summaries, and add updates via Teams chat

## Prerequisites

- Node.js 18+ and npm
- Microsoft Teams Bot registration (App ID and Password)
- Jira instance with API access (email and API token)
- A server to host the bot (can be localhost for development)

## Setup

### 1. Microsoft Teams Bot Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Create or select an App Registration
3. Under "Authentication", add a platform for "Mobile and desktop applications"
4. Under "API permissions", add Microsoft Graph permissions
5. Note your **Application (client) ID** and create a **Client secret** (password)

### 2. Register Bot with Teams

1. Go to [Bot Framework Portal](https://dev.botframework.com/bots/new)
2. Register your bot with:
   - Messaging endpoint: `https://your-domain.com/api/messages`
   - Microsoft App ID and Password from step 1
3. Add Teams as a channel

### 3. Jira API Token

1. Go to your Jira account settings
2. Navigate to Security → API tokens
3. Create a new API token
4. Note your Jira email and the API token

### 4. Configuration

1. Copy `.env.example` to `.env`
2. Fill in all required configuration values:

```env
MICROSOFT_APP_ID=your-bot-app-id
MICROSOFT_APP_PASSWORD=your-bot-app-password
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=PROJ
DAILY_UPDATE_TIME=09:00
TIMEZONE=America/New_York
PORT=3978
```

### 5. Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the bot
npm start

# Or for development with auto-reload
npm run dev
```

## Usage

### User Commands

- **help** - Show available commands
- **my tickets** or **tickets** - View your assigned Jira tickets
- **summary** or **daily summary** - View today's ticket summary
- **update: TICKET-123 Your update here** - Add a comment/update to a Jira ticket

### Daily Updates

The bot automatically:
1. Fetches all active tickets (not Done/Closed) from the configured Jira project
2. Groups tickets by assignee
3. Sends status update requests to each assignee at the configured time (default: 9:00 AM)
4. Collects responses and generates summaries

### Summary Format

The daily summary includes:
- ✅ **Completed tickets**: Tickets marked as Done/Completed/Closed
- 🔄 **In Progress tickets**: Tickets in progress or review status
- ⚠️ **Needs Attention tickets**: All other active tickets

## Development

### Project Structure

```
src/
  ├── index.ts              # Main entry point
  ├── config.ts             # Configuration management
  ├── types.ts              # TypeScript interfaces
  └── services/
      ├── botService.ts     # Teams bot logic
      ├── jiraService.ts    # Jira API integration
      └── schedulerService.ts # Daily update scheduler
```

### Testing Locally

1. Use [Bot Framework Emulator](https://github.com/Microsoft/BotFramework-Emulator) to test locally
2. Set messaging endpoint to `http://localhost:3978/api/messages`
3. Update `.env` with your credentials

### Extending Functionality

- **Custom JQL queries**: Modify `jiraService.ts` to add custom ticket filtering
- **Different summary formats**: Update `generateSummary()` in `botService.ts`
- **Additional commands**: Add new cases in `handleMessage()` in `botService.ts`
- **Proactive messaging**: Implement conversation reference storage for proactive messages

## Deployment

### Requirements

- Node.js 18+ runtime
- Public HTTPS endpoint for the bot messaging endpoint
- Environment variables configured

### Deployment Options

- **Azure App Service**: Recommended for Teams bots
- **AWS Lambda/API Gateway**: With appropriate adapter
- **Docker Container**: Deploy to any container platform

### Environment Variables

Ensure all environment variables are set in your hosting environment. Never commit `.env` to version control.

## Troubleshooting

### Bot not responding in Teams

- Verify the messaging endpoint is publicly accessible
- Check that the Microsoft App ID and Password are correct
- Ensure the bot is added to your Teams workspace

### Jira API errors

- Verify JIRA_BASE_URL format (should end with `.atlassian.net` or your domain)
- Check that JIRA_EMAIL and JIRA_API_TOKEN are correct
- Ensure the API token has not expired
- Verify the project key exists

### Scheduler not running

- Check the DAILY_UPDATE_TIME format (HH:MM, 24-hour format)
- Verify TIMEZONE is a valid timezone name
- Check server logs for cron errors

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
