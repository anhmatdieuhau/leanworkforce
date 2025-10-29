/**
 * Jira Sync Error Handler
 * Wraps Jira API calls with comprehensive error handling and logging
 */

import { storage } from './storage';
import type { InsertJiraSyncLog } from '@shared/schema';

interface JiraSyncContext {
  businessUserId: string;
  syncType: 'import_projects' | 'sync_project' | 'sync_milestone';
  projectId?: string;
  jiraProjectKey?: string;
}

interface JiraSyncResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  logId?: string;
  canRetry: boolean;
}

/**
 * Categorize Jira errors to determine if retry is possible
 */
function categorizeJiraError(error: any): { canRetry: boolean; errorType: string } {
  const errorMessage = error?.message || String(error);
  const statusCode = error?.response?.status || error?.statusCode;

  // Network errors - can retry
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
    return { canRetry: true, errorType: 'network_error' };
  }

  // Rate limiting - can retry after delay
  if (statusCode === 429) {
    return { canRetry: true, errorType: 'rate_limit' };
  }

  // Authentication errors - cannot retry without fixing credentials
  if (statusCode === 401 || statusCode === 403) {
    return { canRetry: false, errorType: 'authentication_error' };
  }

  // Not found - cannot retry
  if (statusCode === 404) {
    return { canRetry: false, errorType: 'not_found' };
  }

  // Server errors - can retry
  if (statusCode >= 500) {
    return { canRetry: true, errorType: 'server_error' };
  }

  // Bad request - cannot retry without fixing request
  if (statusCode >= 400 && statusCode < 500) {
    return { canRetry: false, errorType: 'client_error' };
  }

  // Unknown error - allow retry
  return { canRetry: true, errorType: 'unknown_error' };
}

/**
 * Execute Jira sync operation with error handling and logging
 */
export async function executeJiraSync<T>(
  context: JiraSyncContext,
  operation: () => Promise<T>
): Promise<JiraSyncResult<T>> {
  // Create initial log entry
  const logEntry: InsertJiraSyncLog = {
    businessUserId: context.businessUserId,
    syncType: context.syncType,
    projectId: context.projectId,
    jiraProjectKey: context.jiraProjectKey,
    status: 'success', // Will update if fails
    startedAt: new Date(),
  };

  const log = await storage.createJiraSyncLog(logEntry);

  try {
    // Execute the Jira operation
    const result = await operation();

    // Update log as successful
    await storage.updateJiraSyncLog(log.id, {
      status: 'success',
      completedAt: new Date(),
    });

    // Update project sync status if applicable
    if (context.projectId) {
      await storage.updateProject(context.projectId, {
        lastJiraSyncAt: new Date(),
        lastJiraSyncStatus: 'success',
        lastJiraSyncError: null,
      });
    }

    return {
      success: true,
      data: result,
      logId: log.id,
      canRetry: false,
    };
  } catch (error: any) {
    console.error(`[Jira Sync Error] ${context.syncType}:`, error);

    const { canRetry, errorType } = categorizeJiraError(error);
    const errorMessage = error?.message || String(error);

    // Update log with error details
    await storage.updateJiraSyncLog(log.id, {
      status: 'failed',
      error: errorMessage,
      errorDetails: {
        type: errorType,
        statusCode: error?.response?.status || error?.statusCode,
        stack: error?.stack,
        response: error?.response?.data,
      } as any,
      canRetry,
      completedAt: new Date(),
    });

    // Update project sync status if applicable
    if (context.projectId) {
      await storage.updateProject(context.projectId, {
        lastJiraSyncAt: new Date(),
        lastJiraSyncStatus: 'failed',
        lastJiraSyncError: errorMessage,
      });
    }

    return {
      success: false,
      error: errorMessage,
      logId: log.id,
      canRetry,
    };
  }
}

/**
 * Execute Jira sync with partial success tracking
 * Used when syncing multiple items (e.g., importing multiple projects)
 */
export async function executeJiraSyncBatch<T>(
  context: JiraSyncContext,
  operation: () => Promise<{ created: number; updated: number; data: T }>
): Promise<JiraSyncResult<T>> {
  const logEntry: InsertJiraSyncLog = {
    businessUserId: context.businessUserId,
    syncType: context.syncType,
    projectId: context.projectId,
    jiraProjectKey: context.jiraProjectKey,
    status: 'success',
    startedAt: new Date(),
  };

  const log = await storage.createJiraSyncLog(logEntry);

  try {
    const result = await operation();

    // Update log with counts
    await storage.updateJiraSyncLog(log.id, {
      status: 'success',
      milestonesCreated: result.created,
      milestonesUpdated: result.updated,
      completedAt: new Date(),
    });

    if (context.projectId) {
      await storage.updateProject(context.projectId, {
        lastJiraSyncAt: new Date(),
        lastJiraSyncStatus: 'success',
        lastJiraSyncError: null,
      });
    }

    return {
      success: true,
      data: result.data,
      logId: log.id,
      canRetry: false,
    };
  } catch (error: any) {
    console.error(`[Jira Sync Batch Error] ${context.syncType}:`, error);

    const { canRetry, errorType } = categorizeJiraError(error);
    const errorMessage = error?.message || String(error);

    await storage.updateJiraSyncLog(log.id, {
      status: 'failed',
      error: errorMessage,
      errorDetails: {
        type: errorType,
        statusCode: error?.response?.status || error?.statusCode,
        stack: error?.stack,
      } as any,
      canRetry,
      completedAt: new Date(),
    });

    if (context.projectId) {
      await storage.updateProject(context.projectId, {
        lastJiraSyncAt: new Date(),
        lastJiraSyncStatus: 'failed',
        lastJiraSyncError: errorMessage,
      });
    }

    return {
      success: false,
      error: errorMessage,
      logId: log.id,
      canRetry,
    };
  }
}

/**
 * Get user-friendly error message for Jira sync failures
 */
export function getJiraSyncErrorMessage(error: string, canRetry: boolean): string {
  if (error.includes('not connected') || error.includes('401') || error.includes('403')) {
    return 'Jira connection failed. Please check your Jira credentials in settings.';
  }

  if (error.includes('404')) {
    return 'Jira project or issue not found. It may have been deleted or you don\'t have access.';
  }

  if (error.includes('429') || error.includes('rate limit')) {
    return 'Jira rate limit reached. Please try again in a few minutes.';
  }

  if (error.includes('ECONNREFUSED') || error.includes('ETIMEDOUT')) {
    return 'Unable to connect to Jira. Please check your internet connection and try again.';
  }

  if (error.includes('500') || error.includes('502') || error.includes('503')) {
    return 'Jira server error. This is temporary - please try again later.';
  }

  if (canRetry) {
    return `Jira sync failed: ${error}. You can try again using the Retry button.`;
  }

  return `Jira sync failed: ${error}. Please check your Jira configuration.`;
}
