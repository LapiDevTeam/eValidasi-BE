const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

const FTP_CONFIG = {
  host: 'web.lapilabs.co.id',
  user: 'webattachnew',
  password: 'Web221124**',
  secure: false,
  folder: 'eKalibrasi'
};

async function uploadFileToFTP(localFilePath, remoteFileName) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('FTP Upload - Starting:', {
      localFilePath,
      exists: fs.existsSync(localFilePath),
      remoteFileName,
      ftpHost: FTP_CONFIG.host
    });

    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: FTP_CONFIG.secure
    });

    console.log('FTP Upload - Connected to FTP server');

    // List current directory
    const pwdBefore = await client.pwd();
    console.log('FTP Upload - Current directory:', pwdBefore);

    // Change to target directory (ensureDir already does cd internally)
    await client.ensureDir(FTP_CONFIG.folder);

    const pwdAfter = await client.pwd();
    console.log('FTP Upload - Now in directory:', pwdAfter);

    const fileStream = fs.createReadStream(localFilePath);
    await client.uploadFrom(fileStream, remoteFileName);
    console.log('FTP Upload - File uploaded successfully');

    return {
      success: true,
      message: 'File uploaded successfully',
      fileName: remoteFileName
    };
  } catch (error) {
    console.error('FTP Upload Error:', error);
    return {
      success: false,
      message: error.message || 'Error uploading file to FTP',
      error: error
    };
  } finally {
    client.close();
  }
}

async function downloadFileFromFTP(remoteFileName, localFilePath) {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: FTP_CONFIG.secure
    });

    await client.cd(FTP_CONFIG.folder);

    const fileStream = fs.createWriteStream(localFilePath);
    await client.downloadTo(fileStream, remoteFileName);

    return {
      success: true,
      message: 'File downloaded successfully',
      localPath: localFilePath
    };
  } catch (error) {
    console.error('FTP Download Error:', error);
    return {
      success: false,
      message: error.message || 'Error downloading file from FTP',
      error: error
    };
  } finally {
    client.close();
  }
}

function getFileExtension(filename) {
  const ext = path.extname(filename);
  return ext ? ext.substring(1) : '';
}

function formatFileName(noPermohonan, originalFileName) {
  const sanitizedNoPermohonan = noPermohonan.replace(/\//g, '_');
  const extension = getFileExtension(originalFileName);
  return `${sanitizedNoPermohonan}.${extension}`;
}

async function deleteFileFromFTP(remoteFileName) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('FTP Delete - Starting:', {
      remoteFileName,
      ftpHost: FTP_CONFIG.host
    });

    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: FTP_CONFIG.secure
    });

    console.log('FTP Delete - Connected to FTP server');

    await client.ensureDir(FTP_CONFIG.folder);

    const pwdAfter = await client.pwd();
    console.log('FTP Delete - Now in directory:', pwdAfter);

    await client.remove(remoteFileName);
    console.log('FTP Delete - File deleted successfully');

    return {
      success: true,
      message: 'File deleted successfully',
      fileName: remoteFileName
    };
  } catch (error) {
    console.error('FTP Delete Error:', error);
    return {
      success: false,
      message: error.message || 'Error deleting file from FTP',
      error: error
    };
  } finally {
    client.close();
  }
}

module.exports = {
  uploadFileToFTP,
  downloadFileFromFTP,
  deleteFileFromFTP,
  getFileExtension,
  formatFileName,
  FTP_CONFIG
};
