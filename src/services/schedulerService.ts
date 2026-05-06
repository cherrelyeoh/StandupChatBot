import * as cron from 'node-cron';
import { BotService } from './botService';
import { JiraService } from './jiraService';
import { config } from '../config';

export class SchedulerService {
  private botService: BotService;
  private jiraService: JiraService;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(botService: BotService, jiraService: JiraService) {
    this.botService = botService;
    this.jiraService = jiraService;
  }

  /**
   * Start the daily scheduler
   */
  start(): void {
    // Parse time from config (format: HH:MM)
    const [hours, minutes] = config.dailyUpdateTime.split(':').map(Number);
    
    // Schedule the job to run daily at the specified time
    // Cron format: minute hour * * *
    const cronExpression = `${minutes} ${hours} * * *`;
    
    console.log(`Scheduling daily updates at ${config.dailyUpdateTime} (cron: ${cronExpression})`);

    this.cronJob = cron.schedule(cronExpression, async () => {
      console.log('Daily update triggered');
      await this.sendDailyStatusRequests();
    }, {
      timezone: config.timezone,
    });

    console.log('Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('Scheduler stopped');
    }
  }

  /**
   * Send daily status requests for all active tickets
   */
  private async sendDailyStatusRequests(): Promise<void> {
    try {
      const activeTickets = await this.jiraService.getActiveTickets();
      
      if (activeTickets.length === 0) {
        console.log('No active tickets found');
        return;
      }

      console.log(`Sending status requests for ${activeTickets.length} tickets`);

      // Group tickets by assignee
      const ticketsByAssignee = new Map<string, typeof activeTickets>();
      
      for (const ticket of activeTickets) {
        if (ticket.assigneeEmail) {
          if (!ticketsByAssignee.has(ticket.assigneeEmail)) {
            ticketsByAssignee.set(ticket.assigneeEmail, []);
          }
          ticketsByAssignee.get(ticket.assigneeEmail)!.push(ticket);
        }
      }

      // Send status requests to each assignee
      for (const [email, tickets] of ticketsByAssignee.entries()) {
        await this.botService.sendStatusRequest(email, tickets);
      }

    } catch (error: any) {
      console.error('Error sending daily status requests:', error.message);
    }
  }

  /**
   * Manually trigger daily update (for testing)
   */
  async triggerDailyUpdate(): Promise<void> {
    await this.sendDailyStatusRequests();
  }
}

