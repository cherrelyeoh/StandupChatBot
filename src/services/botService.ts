import {
  ActivityHandler,
  MessageFactory,
  CardFactory,
  TurnContext,
  CloudAdapter,
  ConversationReference,
} from 'botbuilder';
import { JiraService } from './jiraService';
import { ConversationStorage } from './conversationStorage';
import { JiraTicket, TicketUpdate, DailySummary } from '../types';
import { format } from 'date-fns';
import { config } from '../config';

interface PendingResponse {
  ticketKey: string;
  summary: string;
  assigneeEmail: string;
  timestamp: Date;
  conversationReference: any;
}

export class BotService extends ActivityHandler {
  private jiraService: JiraService;
  private adapter: CloudAdapter | null = null;
  private conversationStorage: ConversationStorage;
  private pendingResponses: Map<string, PendingResponse[]> = new Map();

  constructor(jiraService: JiraService, conversationStorage?: ConversationStorage) {
    super();

    this.jiraService = jiraService;
    this.conversationStorage = conversationStorage || new ConversationStorage();

    // Handle message activities
    this.onMessage(async (context: TurnContext, next) => {
      // Save conversation reference for proactive messaging
      await this.saveConversationReference(context);
      await this.handleMessage(context);
      await next();
    });

    // Handle members added
    this.onMembersAdded(async (context: TurnContext, next) => {
      // Save conversation reference when user joins
      await this.saveConversationReference(context);
      
      const welcomeText = 'Hello! I\'m the Jira Status Bot. I\'ll help you manage your Jira tickets by requesting daily updates and providing summaries.';
      
      for (const member of context.activity.membersAdded || []) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(MessageFactory.text(welcomeText));
        }
      }
      
      await next();
    });
  }

  /**
   * Set the adapter for proactive messaging
   */
  setAdapter(adapter: CloudAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Save conversation reference for proactive messaging
   */
  private async saveConversationReference(context: TurnContext): Promise<void> {
    const userEmail = await this.getUserEmail(context);
    if (userEmail) {
      const reference = TurnContext.getConversationReference(context.activity) as ConversationReference;
      this.conversationStorage.save(userEmail, reference);
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(context: TurnContext): Promise<void> {
    const text = context.activity.text?.trim().toLowerCase() || '';
    const userEmail = await this.getUserEmail(context);

    // Handle card button actions
    if (context.activity.value && typeof context.activity.value === 'object') {
      const value = context.activity.value as any;
      if (value.action === 'updateTicket' && value.ticketKey) {
        await this.handleTicketUpdateAction(context, value.ticketKey);
        return;
      }
    }

    // Handle status update responses
    if (text.startsWith('update:')) {
      await this.handleStatusUpdate(context, text, userEmail);
      return;
    }

    // Handle commands
    switch (text) {
      case 'help':
        await this.sendHelpMessage(context);
        break;
      case 'my tickets':
      case 'tickets':
        await this.sendMyTickets(context, userEmail);
        break;
      case 'summary':
      case 'daily summary':
        await this.sendDailySummary(context, userEmail);
        break;
      default:
        await context.sendActivity(
          MessageFactory.text('I didn\'t understand that. Type "help" to see available commands.')
        );
    }
  }

  /**
   * Handle ticket update action from card button
   */
  private async handleTicketUpdateAction(context: TurnContext, ticketKey: string): Promise<void> {
    await context.sendActivity(
      MessageFactory.text(`To add an update for ${ticketKey}, please reply with:\n\nupdate: ${ticketKey} Your update message here`)
    );
  }

  /**
   * Send status request for tickets to a user
   */
  async sendStatusRequest(email: string, tickets: JiraTicket[]): Promise<void> {
    if (!this.adapter) {
      console.error('Adapter not set. Cannot send proactive messages.');
      return;
    }

    const conversationReference = this.conversationStorage.get(email);
    if (!conversationReference) {
      console.log(`No conversation reference found for ${email}. User may not have interacted with the bot yet.`);
      return;
    }

    try {
      await this.adapter!.continueConversationAsync(
        config.microsoftAppId,
        conversationReference,
        async (context: TurnContext) => {
          const message = this.createStatusRequestMessage(tickets);
          await context.sendActivity(message);
        }
      );
      console.log(`Status request sent to ${email} for ${tickets.length} tickets`);
    } catch (error: any) {
      console.error(`Error sending status request to ${email}:`, error.message);
    }
  }

  /**
   * Create status request message with ticket cards
   */
  private createStatusRequestMessage(tickets: JiraTicket[]): any {
    const messageText = `📋 **Daily Status Request**\n\nYou have ${tickets.length} active ticket(s). Please provide status updates:\n\n`;
    const cards = tickets.map(ticket => this.createStatusRequestCard(ticket));
    
    return MessageFactory.carousel(cards, messageText);
  }

  /**
   * Create card for status request
   */
  private createStatusRequestCard(ticket: JiraTicket): any {
    return CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: `**${ticket.key}**`,
          weight: 'Bolder',
          size: 'Medium',
        },
        {
          type: 'TextBlock',
          text: ticket.summary,
          wrap: true,
          spacing: 'Small',
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Status', value: ticket.status },
            { title: 'Priority', value: ticket.priority || 'Not set' },
            { title: 'Last Updated', value: format(new Date(ticket.updated), 'MMM dd, yyyy') },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Add Update',
          data: {
            action: 'updateTicket',
            ticketKey: ticket.key,
          },
        },
        {
          type: 'Action.OpenUrl',
          title: 'View in Jira',
          url: `${config.jiraBaseUrl}/browse/${ticket.key}`,
        },
      ],
    });
  }

  /**
   * Handle status update response from user
   */
  private async handleStatusUpdate(
    context: TurnContext,
    text: string,
    userEmail?: string
  ): Promise<void> {
    const updateText = text.replace('update:', '').trim();
    const parts = updateText.split(' ');
    const ticketKey = parts[0].toUpperCase();
    const comment = parts.slice(1).join(' ');

    if (!comment) {
      await context.sendActivity(
        MessageFactory.text(`Please provide an update comment. Format: update: TICKET-123 Your update here`)
      );
      return;
    }

    try {
      // Add comment to Jira ticket
      await this.jiraService.addComment(ticketKey, `[Teams Bot Update] ${comment}`);
      
      await context.sendActivity(
        MessageFactory.text(`✅ Update added to ${ticketKey}: "${comment}"`)
      );
    } catch (error: any) {
      await context.sendActivity(
        MessageFactory.text(`❌ Failed to update ${ticketKey}: ${error.message}`)
      );
    }
  }

  /**
   * Send user's assigned tickets
   */
  private async sendMyTickets(context: TurnContext, userEmail?: string): Promise<void> {
    if (!userEmail) {
      await context.sendActivity(
        MessageFactory.text('Unable to identify your email address. Please ensure you\'re authenticated.')
      );
      return;
    }

    try {
      const tickets = await this.jiraService.getTicketsByAssignee(userEmail);
      
      if (tickets.length === 0) {
        await context.sendActivity(MessageFactory.text('You have no assigned tickets.'));
        return;
      }

      const cards = tickets.map(ticket => this.createTicketCard(ticket));
      await context.sendActivity(MessageFactory.carousel(cards));
    } catch (error: any) {
      await context.sendActivity(
        MessageFactory.text(`❌ Error fetching tickets: ${error.message}`)
      );
    }
  }

  /**
   * Send daily summary
   */
  private async sendDailySummary(context: TurnContext, userEmail?: string): Promise<void> {
    try {
      const tickets = await this.jiraService.getActiveTickets();
      
      const summary = this.generateSummary(tickets);
      const summaryCard = this.createSummaryCard(summary);
      
      await context.sendActivity(MessageFactory.attachment(summaryCard));
    } catch (error: any) {
      await context.sendActivity(
        MessageFactory.text(`❌ Error generating summary: ${error.message}`)
      );
    }
  }

  /**
   * Generate daily summary from tickets
   */
  private generateSummary(tickets: JiraTicket[]): DailySummary {
    const today = new Date();
    const completed: TicketUpdate[] = [];
    const inProgress: TicketUpdate[] = [];
    const needsAttention: TicketUpdate[] = [];

    for (const ticket of tickets) {
      const update: TicketUpdate = {
        ticketKey: ticket.key,
        summary: ticket.summary,
        status: ticket.status,
        assigneeEmail: ticket.assigneeEmail,
        lastUpdated: new Date(ticket.updated),
        hasResponse: false,
      };

      const statusLower = ticket.status.toLowerCase();
      if (statusLower === 'done' || statusLower === 'completed' || statusLower === 'closed') {
        completed.push(update);
      } else if (statusLower.includes('progress') || statusLower.includes('in review')) {
        inProgress.push(update);
      } else {
        needsAttention.push(update);
      }
    }

    const summaryText = this.formatSummaryText(completed, inProgress, needsAttention);

    return {
      date: today,
      ticketsRequested: tickets.length,
      ticketsWithUpdates: tickets.length,
      completed,
      inProgress,
      needsAttention,
      summaryText,
    };
  }

  /**
   * Format summary text
   */
  private formatSummaryText(
    completed: TicketUpdate[],
    inProgress: TicketUpdate[],
    needsAttention: TicketUpdate[]
  ): string {
    let text = `📊 **Daily Ticket Summary**\n\n`;
    
    text += `✅ **Completed** (${completed.length}):\n`;
    if (completed.length === 0) {
      text += `   None\n`;
    } else {
      completed.forEach(ticket => {
        text += `   • ${ticket.ticketKey}: ${ticket.summary}\n`;
      });
    }

    text += `\n🔄 **In Progress** (${inProgress.length}):\n`;
    if (inProgress.length === 0) {
      text += `   None\n`;
    } else {
      inProgress.forEach(ticket => {
        text += `   • ${ticket.ticketKey}: ${ticket.summary}\n`;
      });
    }

    text += `\n⚠️ **Needs Attention** (${needsAttention.length}):\n`;
    if (needsAttention.length === 0) {
      text += `   None\n`;
    } else {
      needsAttention.forEach(ticket => {
        text += `   • ${ticket.ticketKey}: ${ticket.summary}\n`;
      });
    }

    return text;
  }

  /**
   * Create ticket card
   */
  private createTicketCard(ticket: JiraTicket): any {
    return CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: `**${ticket.key}**`,
          weight: 'Bolder',
          size: 'Medium',
        },
        {
          type: 'TextBlock',
          text: ticket.summary,
          wrap: true,
          spacing: 'Small',
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Status', value: ticket.status },
            { title: 'Type', value: ticket.issueType },
            { title: 'Updated', value: format(new Date(ticket.updated), 'MMM dd, yyyy') },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View in Jira',
          url: `${process.env.JIRA_BASE_URL}/browse/${ticket.key}`,
        },
      ],
    });
  }

  /**
   * Create summary card
   */
  private createSummaryCard(summary: DailySummary): any {
    return CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: `📊 Daily Ticket Summary - ${format(summary.date, 'MMMM dd, yyyy')}`,
          weight: 'Bolder',
          size: 'Large',
        },
        {
          type: 'TextBlock',
          text: summary.summaryText,
          wrap: true,
          spacing: 'Medium',
        },
      ],
    });
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(context: TurnContext): Promise<void> {
    const helpText = `
**Available Commands:**

• **help** - Show this help message
• **my tickets** or **tickets** - View your assigned tickets
• **summary** or **daily summary** - View today's ticket summary
• **update: TICKET-123 Your update here** - Add an update comment to a ticket

**Daily Updates:**
The bot will automatically send you status requests for your assigned tickets at ${process.env.DAILY_UPDATE_TIME || '09:00'} daily.
    `.trim();

    await context.sendActivity(MessageFactory.text(helpText));
  }

  /**
   * Get user email (simplified - would need proper Teams Graph API integration)
   */
  private async getUserEmail(context: TurnContext): Promise<string | undefined> {
    // This is a placeholder - in production, you would use Microsoft Graph API
    // to get the user's email from their AAD object ID
    // For now, we'll use the name as a fallback identifier
    // In Teams, you'd typically use the Teams-specific channel data or Graph API
    const channelData = context.activity.channelData;
    if (channelData && (channelData as any).from?.userPrincipalName) {
      return (channelData as any).from.userPrincipalName;
    }
    if (channelData && (channelData as any).from?.email) {
      return (channelData as any).from.email;
    }
    // Fallback to name (this won't match Jira emails, but works for testing)
    return context.activity.from.name;
  }
}

