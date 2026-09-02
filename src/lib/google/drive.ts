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
}

/**
 * List image files inside a specific Google Drive folder
 */
export async function listSlipsInFolder(folderId: string): Promise<DriveFileItem[]> {
  const drive = await getDriveClient();

  const query = `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`;

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, webViewLink, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 50,
  });

  return (res.data.files as DriveFileItem[]) || [];
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
