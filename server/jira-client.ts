// Jira client setup - Reference: jira blueprint
import { Version3Client } from 'jira.js';
import { storage } from './storage';

let connectionSettings: any;

// Try to get credentials from Replit connector
async function getAccessTokenFromConnector() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    return null;
  }

  try {
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=jira',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
    const hostName = connectionSettings?.settings?.site_url;

    if (connectionSettings && accessToken && hostName) {
      return { accessToken, hostName, type: 'oauth' };
    }
  } catch (error) {
    console.log('Replit connector not available, trying manual credentials...');
  }

  return null;
}

// Try to get credentials from database (manual configuration)
async function getManualCredentials(businessUserId: string = 'demo-business-user') {
  try {
    const settings = await storage.getJiraSettings(businessUserId);
    
    if (settings && settings.jiraDomain && settings.jiraEmail && settings.jiraApiToken && settings.isConfigured) {
      return {
        hostName: settings.jiraDomain.startsWith('https://') ? settings.jiraDomain : `https://${settings.jiraDomain}`,
        email: settings.jiraEmail,
        apiToken: settings.jiraApiToken,
        type: 'basic'
      };
    }
  } catch (error) {
    console.error('Error fetching manual Jira credentials:', error);
  }
  
  return null;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableJiraClient(businessUserId: string = 'demo-business-user') {
  // Try Replit connector first
  const connectorAuth = await getAccessTokenFromConnector();
  
  if (connectorAuth && connectorAuth.type === 'oauth') {
    return new Version3Client({
      host: connectorAuth.hostName,
      authentication: {
        oauth2: { accessToken: connectorAuth.accessToken },
      },
    });
  }

  // Fall back to manual credentials
  const manualAuth = await getManualCredentials(businessUserId);
  
  if (manualAuth && manualAuth.type === 'basic') {
    return new Version3Client({
      host: manualAuth.hostName,
      authentication: {
        basic: {
          email: manualAuth.email,
          apiToken: manualAuth.apiToken,
        },
      },
    });
  }

  throw new Error('Jira not connected. Please configure Jira credentials in the settings.');
}
