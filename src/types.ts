export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  assignee?: string;
  assigneeEmail?: string;
  description?: string;
  updated: string;
  created: string;
  issueType: string;
  priority?: string;
}

export interface TicketUpdate {
  ticketKey: string;
  summary: string;
  status: string;
  assigneeEmail?: string;
  lastUpdated: Date;
  userResponse?: string;
  hasResponse: boolean;
}

export interface DailySummary {
  date: Date;
  ticketsRequested: number;
  ticketsWithUpdates: number;
  completed: TicketUpdate[];
  inProgress: TicketUpdate[];
  needsAttention: TicketUpdate[];
  summaryText: string;
}

