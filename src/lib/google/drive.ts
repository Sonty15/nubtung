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
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 1000,
      pageToken: pageToken || undefined,
    });

    if (res.data && res.data.files) {
      allFiles.push(...(res.data.files as DriveFileItem[]));
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
