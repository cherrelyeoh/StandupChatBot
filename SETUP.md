# Setup Guide for Teams Jira Status Bot

This guide will walk you through setting up the Teams Jira Status Bot from scratch.

## Prerequisites

- Node.js 18 or higher installed
- A Microsoft Teams account (for testing)
- Access to Azure Portal (for bot registration)
- A Jira account with API access

## Step 1: Microsoft Bot Registration

### 1.1 Create Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Enter a name (e.g., "Jira Status Bot")
5. Select **Accounts in any organizational directory and personal Microsoft accounts**
6. Leave Redirect URI empty for now
7. Click **Register**

### 1.2 Create Client Secret

1. In your App Registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and choose expiration
4. Click **Add**
5. **IMPORTANT**: Copy the secret value immediately (you won't be able to see it again)

### 1.3 Note Your App ID

1. From the **Overview** page, copy the **Application (client) ID**
2. Save both the App ID and Client Secret for later use

## Step 2: Register Bot with Bot Framework

1. Go to [Azure Bot Service](https://portal.azure.com/#create/Microsoft.BotService) or [Bot Framework Portal](https://dev.botframework.com/)
2. Click **Create a resource** → **AI + Machine Learning** → **Azure Bot**
3. Fill in:
   - **Bot handle**: Choose a unique name
   - **Subscription**: Your Azure subscription
   - **Resource group**: Create new or use existing
   - **Pricing tier**: F0 (Free) for testing
   - **Microsoft App ID**: Paste your App ID from Step 1.3
   - **App password**: Paste your Client Secret from Step 1.2
4. Click **Review + create** then **Create**

### 2.1 Configure Messaging Endpoint

1. After creation, go to your Bot resource
2. Under **Configuration**, set:
   - **Messaging endpoint**: `https://your-domain.com/api/messages` (update after deployment)
   - For local testing: Use ngrok or similar tunneling service
3. Click **Apply**

### 2.2 Add Teams Channel

1. In your Bot resource, go to **Channels**
2. Click **Microsoft Teams** icon
3. Review the terms and click **Agree**
4. The Teams channel will be added automatically

## Step 3: Jira API Token

1. Log in to your Jira instance
2. Click your profile picture → **Account settings**
3. Go to **Security** → **API tokens**
4. Click **Create API token**
5. Give it a label (e.g., "Teams Bot")
6. Click **Create**
7. **Copy the token immediately** (you won't be able to see it again)
8. Also note your Jira email address

## Step 4: Project Setup

### 4.1 Clone/Download Project

```bash
cd C:\Project\TeamChat
```

### 4.2 Install Dependencies

```bash
npm install
```

### 4.3 Configure Environment

1. Copy `env.template` to `.env`:

```bash
# On Windows PowerShell
Copy-Item env.template .env
```

2. Edit `.env` and fill in your values:

```env
MICROSOFT_APP_ID=<your-app-id-from-step-1.3>
MICROSOFT_APP_PASSWORD=<your-client-secret-from-step-1.2>
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=<your-jira-email>
JIRA_API_TOKEN=<your-api-token-from-step-3>
JIRA_PROJECT_KEY=<your-jira-project-key>
DAILY_UPDATE_TIME=09:00
TIMEZONE=America/New_York
PORT=3978
```

**Note**: Replace placeholders with your actual values. Do not commit `.env` to version control.

## Step 5: Build and Run

### 5.1 Build the Project

```bash
npm run build
```

### 5.2 Run the Bot

For production:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Step 6: Testing Locally

### 6.1 Using ngrok (Recommended for Local Testing)

1. Download [ngrok](https://ngrok.com/download)
2. Run ngrok:
```bash
ngrok http 3978
```
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Update your Bot's messaging endpoint to: `https://abc123.ngrok.io/api/messages`
5. Restart the bot if needed

### 6.2 Test in Teams

1. Open Microsoft Teams
2. Go to **Apps** → Search for your bot name
3. Click **Add** to add it to a chat or team
4. Send a message to the bot (e.g., "help")
5. Verify you receive a response

## Step 7: Deploy to Production

### Option 1: Azure App Service (Recommended)

1. Create a new Web App in Azure Portal
2. Configure:
   - Runtime stack: Node.js 18 LTS
   - Operating system: Linux or Windows
3. In **Configuration** → **Application settings**, add all your environment variables from `.env`
4. Deploy your code (GitHub Actions, Azure DevOps, or manually)
5. Update your Bot's messaging endpoint to: `https://your-app.azurewebsites.net/api/messages`

### Option 2: Other Platforms

- **AWS Lambda**: Use AWS SAM or Serverless Framework
- **Docker**: Build a container and deploy to Azure Container Instances, AWS ECS, etc.
- **Heroku**: Use Heroku CLI for deployment

## Step 8: Verify Daily Updates

1. Ensure users have interacted with the bot at least once (so conversation references are saved)
2. Wait for the scheduled time (or manually trigger for testing)
3. Check that status requests are sent to users with active tickets

## Troubleshooting

### Bot Not Responding

- Verify messaging endpoint is accessible
- Check bot logs for errors
- Ensure App ID and Password are correct
- Verify the bot is added to Teams

### Jira API Errors

- Verify JIRA_BASE_URL format (should not have trailing slash)
- Check API token hasn't expired
- Ensure email matches the Jira account email
- Verify project key exists

### Scheduler Not Working

- Check DAILY_UPDATE_TIME format (HH:MM, 24-hour)
- Verify TIMEZONE is valid (e.g., America/New_York)
- Check server logs for cron errors

### Users Not Receiving Updates

- Users must interact with the bot first to establish conversation references
- Verify user emails match Jira assignee emails
- Check bot logs for proactive messaging errors

## Next Steps

- Customize JQL queries for ticket filtering
- Add more bot commands
- Integrate with Microsoft Graph API for better user identification
- Add persistent storage (Azure Cosmos DB, SQL Server) for conversation references
- Implement more sophisticated summarization logic

## Support

For issues or questions:
- Check the main README.md for usage instructions
- Review Bot Framework documentation: https://docs.microsoft.com/en-us/azure/bot-service/
- Review Jira API documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

