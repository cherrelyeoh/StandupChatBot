import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  microsoftAppId: process.env.MICROSOFT_APP_ID || '',
  microsoftAppPassword: process.env.MICROSOFT_APP_PASSWORD || '',
  jiraBaseUrl: process.env.JIRA_BASE_URL || '',
  jiraEmail: process.env.JIRA_EMAIL || '',
  jiraApiToken: process.env.JIRA_API_TOKEN || '',
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || '',
  dailyUpdateTime: process.env.DAILY_UPDATE_TIME || '09:00',
  timezone: process.env.TIMEZONE || 'America/New_York',
  port: parseInt(process.env.PORT || '3978', 10),
};

// Validate required configuration
const requiredConfig = [
  'microsoftAppId',
  'microsoftAppPassword',
  'jiraBaseUrl',
  'jiraEmail',
  'jiraApiToken',
];

for (const key of requiredConfig) {
  if (!config[key as keyof typeof config]) {
    throw new Error(`Missing required configuration: ${key.toUpperCase()}`);
  }
}

