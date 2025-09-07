import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.promises.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content.toString());
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client: OAuth2Client) {
  const content = await fs.promises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content.toString());
  const key = keys.installed || keys.web;
  const payload = {
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  };
  await fs.promises.writeFile(TOKEN_PATH, JSON.stringify(payload));
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('Error: credentials.json file not found!');
    console.log('Please follow these steps:');
    console.log('1. Go to Google Cloud Console (https://console.cloud.google.com)');
    console.log('2. Create a new project or select an existing one');
    console.log('3. Enable Gmail API and Google Calendar API');
    console.log('4. Configure OAuth consent screen');
    console.log('5. Create OAuth client ID credentials');
    console.log('6. Download the credentials and save them as credentials.json in the root folder');
    process.exit(1);
  }

  const content = await fs.promises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content.toString());
  const key = keys.installed || keys.web;

  const oAuth2Client = new google.auth.OAuth2(
    key.client_id,
    key.client_secret,
    key.redirect_uris[0]
  );

  // Generate the url that will be used for authorization
  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url:', authorizeUrl);
  console.log('\nAfter authorization, copy the code from the redirect URL and save it in a file named "auth-code.txt" in the root folder.');
  process.exit(0);
}

async function saveToken() {
  if (!fs.existsSync('auth-code.txt')) {
    console.error('Error: auth-code.txt not found!');
    console.log('Please save the authorization code in auth-code.txt file.');
    process.exit(1);
  }

  const content = await fs.promises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content.toString());
  const key = keys.installed || keys.web;

  const oAuth2Client = new google.auth.OAuth2(
    key.client_id,
    key.client_secret,
    key.redirect_uris[0]
  );

  const authCode = await fs.promises.readFile('auth-code.txt', 'utf-8');
  const token = await oAuth2Client.getToken(authCode.trim());
  oAuth2Client.setCredentials(token.tokens);
  await saveCredentials(oAuth2Client);
  console.log('Token stored successfully!');
  await fs.promises.unlink('auth-code.txt');
}

// Check command line arguments
const args = process.argv.slice(2);
if (args[0] === '--save-token') {
  saveToken().catch(console.error);
} else {
  authorize().catch(console.error);
}
