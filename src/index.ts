import * as restify from 'restify';
import { CloudAdapter, ConfigurationBotFrameworkAuthentication } from 'botbuilder';
import { config } from './config';
import { BotService } from './services/botService';
import { JiraService } from './services/jiraService';
import { SchedulerService } from './services/schedulerService';

// Create adapter
const credentials = new ConfigurationBotFrameworkAuthentication({
  MicrosoftAppId: config.microsoftAppId,
  MicrosoftAppPassword: config.microsoftAppPassword,
});

const adapter = new CloudAdapter(credentials);

// Create services
const jiraService = new JiraService();
const botService = new BotService(jiraService);
botService.setAdapter(adapter);
const schedulerService = new SchedulerService(botService, jiraService);

// Handle errors
adapter.onTurnError = async (context, error) => {
  console.error(`\n [onTurnError] unhandled error: ${error}`);
  
  await context.sendActivity('The bot encountered an error or bug.');
  await context.sendActivity('To continue to run this bot, please fix the bot source code.');
  
  // Trace the error
  console.error(error);
};

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(config.port, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
  console.log(`\nTo talk to your bot, open the emulator and connect to ${server.url}`);
});

// Listen for incoming requests
server.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await botService.run(context);
  });
});

// Health check endpoint
server.get('/health', (req, res, next) => {
  res.send(200, 'Bot is running');
  next();
});

// Start scheduler
schedulerService.start();

console.log('Jira Status Bot started successfully!');
console.log(`Daily updates scheduled for ${config.dailyUpdateTime} ${config.timezone}`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  schedulerService.stop();
  server.close();
  process.exit(0);
});

