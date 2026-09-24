import { google } from 'googleapis';
import { getGoogleAuth } from './auth';

export async function getDriveClient() {
  const auth = getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  md5Checksum?: string;
}

/**
 * List all image files inside a specific Google Drive folder (with pagination)
 */
export async function listSlipsInFolder(folderId: string): Promise<DriveFileItem[]> {
  const drive = await getDriveClient();

  const query = `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`;
  const allFiles: DriveFileItem[] = [];
  let pageToken: string | undefined = undefined;

  while (true) {
    const res: any = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, createdTime, md5Checksum)',
      orderBy: 'createdTime desc',
      pageSize: 1000,
      pageToken: pageToken || undefined,
    });

    if (res.data && res.data.files) {
      const validFiles = (res.data.files as DriveFileItem[]).filter(
        file => file.name && !file.name.startsWith('.') && !file.name.includes('.trashed')
      );
      allFiles.push(...validFiles);
    }

    if (!res.data.nextPageToken) {
      break;
    }
    pageToken = res.data.nextPageToken;
  }

  return allFiles;
}

/**
 * Downloads a file from Google Drive and returns it as a base64 string
 */
export async function downloadFileAsBase64(fileId: string): Promise<{ base64: string; mimeType: string }> {
  const drive = await getDriveClient();

  const meta = await drive.files.get({
    fileId,
    fields: 'mimeType',
  });

  const mimeType = meta.data.mimeType || 'image/jpeg';

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  const buffer = Buffer.from(res.data as ArrayBuffer);
  return {
    base64: buffer.toString('base64'),
    mimeType,
  };
}

/**
 * Returns a Google Drive client authenticated via OAuth 2.0 (using user's personal Drive quota),
 * falling back to Service Account if OAuth is not configured.
 */
export function getDriveOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // Fallback to Service Account
  const auth = getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}

/**
 * Uploads a slip image file to Google Drive using personal OAuth quota
 */
export async function uploadSlipToDrive({
  buffer,
  filename,
  mimeType,
  folderId = process.env.GOOGLE_DRIVE_UPLOAD_FOLDER_ID || '14IP9ywr7z3aa3sllt4HMF-CFA90bKV-x',
}: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folderId?: string;
}): Promise<{ id: string; name: string; webViewLink: string }> {
  const { Readable } = await import('stream');
  const drive = getDriveOAuthClient();

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });

  const fileId = res.data.id || '';
  const webViewLink = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  return {
    id: fileId,
    name: res.data.name || filename,
    webViewLink,
  };
}
