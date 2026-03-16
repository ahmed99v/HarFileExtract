const fs = require('fs');
const path = require('path');

const inputDir = path.resolve(__dirname, 'input');   // HAR files go here
const outputBaseDir = path.resolve(__dirname, 'output'); // Output base folder
const REMOVE_ZERO_BYTE_FILES = true; // <-- set to false to keep 0-byte files
const MAX_FILENAME_LENGTH = 250; // Windows max filename length

if (!fs.existsSync(outputBaseDir)) fs.mkdirSync(outputBaseDir, { recursive: true });

// Sanitize filenames for Windows
function sanitizeFileName(name) {
  return name.replace(/[<>:"|?*%,!&()]/g, '-');
}

// Get unique folder if it already exists
function getUniqueFolder(baseDir, folderName) {
  let folderPath = path.join(baseDir, folderName);
  if (!fs.existsSync(folderPath)) return folderPath;

  let counter = 1;
  while (true) {
    const newFolderName = `${folderName}_new(${counter})`;
    folderPath = path.join(baseDir, newFolderName);
    if (!fs.existsSync(folderPath)) return folderPath;
    counter++;
  }
}

// Truncate filename if too long
function truncateFilePath(filePath) {
  const dir = path.dirname(filePath);
  let base = path.basename(filePath);
  if (base.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(base);
    base = base.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
  }
  return path.join(dir, base);
}
function extractHarFile(harFiles) {
  harFiles.forEach(harFileName => {
    const harFilePath = path.join(inputDir, harFileName);
    const harBaseName = path.basename(harFileName, '.har');
    const outputDir = getUniqueFolder(outputBaseDir, harBaseName);

    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`\nExtracting HAR: ${harFileName} -> ${outputDir}`);

    const har = JSON.parse(fs.readFileSync(harFilePath, 'utf8'));
    let savedCount = 0;
    let removedCount = 0;

    har.log.entries.forEach((entry, index) => {
      const url = new URL(entry.request.url);
      let pathname = url.pathname.replace(/^\/+/, '');

      // Append index.html if no extension or ends with /
      if (pathname.endsWith('/')) pathname += 'index.html';
      if (!path.extname(pathname)) pathname += '/index.html';

      // Handle query string safely
      if (url.search) {
        const safeQuery = sanitizeFileName(url.search);
        pathname = pathname.replace(/index\.html$/, `${safeQuery}-index.html`);
      }

      // Split into parts and sanitize each folder/file
      const pathParts = pathname.split('/').map(p => sanitizeFileName(p));
      let filePath = path.join(outputDir, ...pathParts);
      filePath = truncateFilePath(filePath);

      // Ensure parent directories exist
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      // Get content
      let content = entry.response.content.text || '';
      if (entry.response.content.encoding === 'base64') {
        content = Buffer.from(content, 'base64');
      } else {
        content = Buffer.from(content, 'utf8');
      }

      // Write file
      try {
        fs.writeFileSync(filePath, content);
        // Remove 0-byte files if flag enabled
        if (REMOVE_ZERO_BYTE_FILES && fs.statSync(filePath).size === 0) {
          fs.unlinkSync(filePath);
          removedCount++;
          console.log(`Removed 0-byte file: ${filePath}`);
        } else {
          savedCount++;
          console.log(`Saved: ${filePath}`);
        }
      } catch (err) {
        console.error(`Failed to write file: ${filePath}`, err);
      }
    });

    console.log(`\nHAR extraction complete: ${harFileName}`);
    console.log(`Saved files: ${savedCount}, Removed 0-byte files: ${removedCount}`);
  });
}

function main() {
  const harFiles = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.har'));
  extractHarFile(harFiles);
  console.log('\nAll HAR files extracted successfully!');
}

main();