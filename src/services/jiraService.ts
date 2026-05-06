import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { JiraTicket } from '../types';

export class JiraService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.jiraBaseUrl;
    const auth = Buffer.from(`${config.jiraEmail}:${config.jiraApiToken}`).toString('base64');
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Fetch all tickets for the configured project
   */
  async getProjectTickets(projectKey?: string): Promise<JiraTicket[]> {
    try {
      const project = projectKey || config.jiraProjectKey;
      const jql = `project = ${project} ORDER BY updated DESC`;
      
      const response = await this.client.get('/rest/api/3/search', {
        params: {
          jql,
          fields: 'summary,status,assignee,description,updated,created,issuetype,priority',
          maxResults: 100,
        },
      });

      return response.data.issues.map((issue: any) => this.mapIssueToTicket(issue));
    } catch (error: any) {
      console.error('Error fetching Jira tickets:', error.message);
      throw new Error(`Failed to fetch Jira tickets: ${error.message}`);
    }
  }

  /**
   * Get tickets assigned to a specific user
   */
  async getTicketsByAssignee(email: string, projectKey?: string): Promise<JiraTicket[]> {
    try {
      const project = projectKey || config.jiraProjectKey;
      const jql = `project = ${project} AND assignee = ${email} ORDER BY updated DESC`;
      
      const response = await this.client.get('/rest/api/3/search', {
        params: {
          jql,
          fields: 'summary,status,assignee,description,updated,created,issuetype,priority',
          maxResults: 100,
        },
      });

      return response.data.issues.map((issue: any) => this.mapIssueToTicket(issue));
    } catch (error: any) {
      console.error('Error fetching assigned tickets:', error.message);
      throw new Error(`Failed to fetch assigned tickets: ${error.message}`);
    }
  }

  /**
   * Get active tickets (not in Done/Closed status)
   */
  async getActiveTickets(projectKey?: string): Promise<JiraTicket[]> {
    try {
      const project = projectKey || config.jiraProjectKey;
      const jql = `project = ${project} AND status != Done AND status != Closed ORDER BY updated DESC`;
      
      const response = await this.client.get('/rest/api/3/search', {
        params: {
          jql,
          fields: 'summary,status,assignee,description,updated,created,issuetype,priority',
          maxResults: 100,
        },
      });

      return response.data.issues.map((issue: any) => this.mapIssueToTicket(issue));
    } catch (error: any) {
      console.error('Error fetching active tickets:', error.message);
      throw new Error(`Failed to fetch active tickets: ${error.message}`);
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketKey: string, statusName: string): Promise<void> {
    try {
      // First, get the status ID
      const issueResponse = await this.client.get(`/rest/api/3/issue/${ticketKey}`);
      const transitions = await this.client.get(`/rest/api/3/issue/${ticketKey}/transitions`);
      
      // Find the transition that matches the target status
      const transition = transitions.data.transitions.find((t: any) => 
        t.to.name.toLowerCase() === statusName.toLowerCase()
      );

      if (!transition) {
        throw new Error(`Transition to status "${statusName}" not found for ticket ${ticketKey}`);
      }

      await this.client.post(`/rest/api/3/issue/${ticketKey}/transitions`, {
        transition: {
          id: transition.id,
        },
      });
    } catch (error: any) {
      console.error(`Error updating ticket ${ticketKey}:`, error.message);
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
  }

  /**
   * Add a comment to a ticket
   */
  async addComment(ticketKey: string, comment: string): Promise<void> {
    try {
      await this.client.post(`/rest/api/3/issue/${ticketKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment,
                },
              ],
            },
          ],
        },
      });
    } catch (error: any) {
      console.error(`Error adding comment to ${ticketKey}:`, error.message);
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Get ticket details
   */
  async getTicket(ticketKey: string): Promise<JiraTicket | null> {
    try {
      const response = await this.client.get(`/rest/api/3/issue/${ticketKey}`, {
        params: {
          fields: 'summary,status,assignee,description,updated,created,issuetype,priority',
        },
      });

      return this.mapIssueToTicket(response.data);
    } catch (error: any) {
      console.error(`Error fetching ticket ${ticketKey}:`, error.message);
      return null;
    }
  }

  /**
   * Map Jira issue to JiraTicket interface
   */
  private mapIssueToTicket(issue: any): JiraTicket {
    return {
      key: issue.key,
      summary: issue.fields.summary || '',
      status: issue.fields.status?.name || 'Unknown',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      assigneeEmail: issue.fields.assignee?.emailAddress,
      description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
      updated: issue.fields.updated || '',
      created: issue.fields.created || '',
      issueType: issue.fields.issuetype?.name || 'Task',
      priority: issue.fields.priority?.name,
    };
  }
}

