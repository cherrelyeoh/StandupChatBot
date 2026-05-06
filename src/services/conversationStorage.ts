import { ConversationReference } from 'botbuilder';

/**
 * Simple in-memory storage for conversation references
 * In production, use a database (Azure Cosmos DB, SQL Server, etc.)
 */
export class ConversationStorage {
  private storage: Map<string, ConversationReference> = new Map();

  /**
   * Store conversation reference by user email
   */
  save(email: string, reference: ConversationReference): void {
    this.storage.set(email.toLowerCase(), reference);
  }

  /**
   * Get conversation reference by user email
   */
  get(email: string): ConversationReference | undefined {
    return this.storage.get(email.toLowerCase());
  }

  /**
   * Get all stored conversation references
   */
  getAll(): ConversationReference[] {
    return Array.from(this.storage.values());
  }

  /**
   * Remove conversation reference
   */
  remove(email: string): void {
    this.storage.delete(email.toLowerCase());
  }

  /**
   * Check if a conversation reference exists
   */
  has(email: string): boolean {
    return this.storage.has(email.toLowerCase());
  }
}

