
import { google } from 'googleapis';
import { IncomingForm } from 'formidable';
import fs from 'fs';

// Cấu hình bodyParser để nhận multipart/form-data trong Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Parse form data (File & Metadata)
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    // Handle array or single object for file (Formidable v3)
    const file = Array.isArray(data.files.file) ? data.files.file[0] : data.files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Handle array or single string for fields (Formidable v3)
    const metadataRaw = Array.isArray(data.fields.metadata) 
      ? data.fields.metadata[0] 
      : data.fields.metadata;
    const metadata = JSON.parse(metadataRaw || '{}');

    // Format tên file: CHI_<HangMuc>_<Time>_<NguoiChi>
    const fileName = `CHI_${metadata.category || 'General'}_${metadata.timestamp}_${metadata.staffName || 'Staff'}`
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename

    // 2. Setup Google Drive Auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 3. Upload to Google Drive
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : [], // Upload vào folder chỉ định
    };

    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.filepath),
    };

    // Thêm supportsAllDrives: true để hỗ trợ upload vào Shared Drives (Team Drives)
    const uploadRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true, 
    });

    const fileId = uploadRes.data.id;
    const webViewLink = uploadRes.data.webViewLink;

    // 4. Set Permission (Anyone with link can view)
    // Cũng cần supportsAllDrives: true ở đây
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });

    // 5. Return the link
    return res.status(200).json({ 
      success: true, 
      fileId: fileId,
      url: webViewLink 
    });

  } catch (error) {
    console.error('Drive Upload Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal Server Error' 
    });
  }
}
