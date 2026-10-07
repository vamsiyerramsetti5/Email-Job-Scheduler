import { Client } from '@elastic/elasticsearch';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';

class ElasticsearchService {
  private client: Client | null = null;
  private indexName = 'emails';
  private isConnected = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.client = new Client({
        node: config.elasticsearchUrl,
        maxRetries: 3,
        requestTimeout: 3000,
      });

      // Test ping
      await this.client.ping();
      this.isConnected = true;
      console.log(`[ElasticsearchService] Connected successfully to Elasticsearch at ${config.elasticsearchUrl}`);

      // Ensure index exists
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              jobId: { type: 'keyword' },
              userId: { type: 'keyword' },
              sender: { type: 'text' },
              recipient: { type: 'text' },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledFor: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        });
        console.log(`[ElasticsearchService] Created index "${this.indexName}"`);
      }
    } catch (err: any) {
      console.warn(`[ElasticsearchService] Could not connect to Elasticsearch (${err.message}). Using DB Fallback Search.`);
      this.isConnected = false;
    }
  }

  /**
   * Index an email document into Elasticsearch
   */
  async indexEmail(email: any): Promise<void> {
    const doc = {
      id: email.id,
      jobId: email.jobId,
      userId: email.userId,
      sender: email.sender,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledFor: email.scheduledFor ? new Date(email.scheduledFor).toISOString() : null,
      sentAt: email.sentAt ? new Date(email.sentAt).toISOString() : null,
      createdAt: email.createdAt ? new Date(email.createdAt).toISOString() : null,
    };

    if (this.isConnected && this.client) {
      try {
        await this.client.index({
          index: this.indexName,
          id: email.id,
          document: doc,
          refresh: 'wait_for',
        });
        console.log(`[ElasticsearchService] Indexed email ${email.id} in Elasticsearch`);
        return;
      } catch (err: any) {
        console.error(`[ElasticsearchService] Indexing error: ${err.message}`);
      }
    }
  }

  /**
   * Search emails using Elasticsearch query, with DB fallback
   */
  async searchEmails(query: string, status?: string, userId?: string): Promise<any[]> {
    if (this.isConnected && this.client && query) {
      try {
        const mustConditions: any[] = [];

        if (status) {
          mustConditions.push({ term: { status } });
        }
        if (userId) {
          mustConditions.push({ term: { userId } });
        }

        const response = await this.client.search({
          index: this.indexName,
          query: {
            bool: {
              must: [
                ...mustConditions,
                {
                  multi_match: {
                    query: query,
                    fields: ['subject^3', 'body', 'recipient^2', 'sender^2'],
                    fuzziness: 'AUTO',
                  },
                },
              ],
            },
          },
        });

        const hits = response.hits.hits;
        return hits.map((hit: any) => hit._source);
      } catch (err: any) {
        console.error(`[ElasticsearchService] Search error: ${err.message}. Falling back to DB search.`);
      }
    }

    // DB Fallback Search
    console.log(`[ElasticsearchService] Executing DB search query for: "${query}"`);
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    if (query) {
      where.OR = [
        { subject: { contains: query } },
        { body: { contains: query } },
        { recipient: { contains: query } },
        { sender: { contains: query } },
      ];
    }

    const dbResults = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return dbResults;
  }
}

export const elasticsearchService = new ElasticsearchService();
