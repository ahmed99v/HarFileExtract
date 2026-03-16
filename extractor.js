const fs = require('fs');
const path = require('path');

/**
 * HAR File Extractor
 * 
 * Extracts resources from HTTP Archive (HAR) files and saves them
 * to a structured directory hierarchy matching the original URLs.
 * 
 * @author Your Name
 * @version 1.0.0
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  inputDir: path.resolve(__dirname, 'input'),
  outputBaseDir: path.resolve(__dirname, 'output'),
  removeZeroByteFiles: true,
  maxFilenameLength: 250, // Windows max filename length
  invalidChars: /[<>:"|?*%,!&()]/g,
  replacementChar: '-',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitizes a filename by replacing invalid characters
 * @param {string} name - The filename to sanitize
 * @returns {string} - Sanitized filename
 */
function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') {
    return 'unnamed';
  }
  return name.replace(CONFIG.invalidChars, CONFIG.replacementChar);
}

/**
 * Gets a unique folder name if the base folder already exists
 * @param {string} baseDir - Base directory path
 * @param {string} folderName - Desired folder name
 * @returns {string} - Unique folder path
 */
function getUniqueFolder(baseDir, folderName) {
  const sanitizedFolderName = sanitizeFileName(folderName);
  let folderPath = path.join(baseDir, sanitizedFolderName);
  
  if (!fs.existsSync(folderPath)) {
    return folderPath;
  }

  let counter = 1;
  while (true) {
    const newFolderName = `${sanitizedFolderName}_new(${counter})`;
    folderPath = path.join(baseDir, newFolderName);
    if (!fs.existsSync(folderPath)) {
      return folderPath;
    }
    counter++;
    
    // Safety check to prevent infinite loops
    if (counter > 10000) {
      throw new Error(`Cannot create unique folder after 10000 attempts: ${folderName}`);
    }
  }
}

/**
 * Truncates a file path if it exceeds the maximum filename length
 * @param {string} filePath - Full file path
 * @returns {string} - Truncated file path if necessary
 */
function truncateFilePath(filePath) {
  const dir = path.dirname(filePath);
  let base = path.basename(filePath);
  
  if (base.length > CONFIG.maxFilenameLength) {
    const ext = path.extname(base);
    const nameWithoutExt = base.slice(0, base.length - ext.length);
    const truncatedName = nameWithoutExt.slice(0, CONFIG.maxFilenameLength - ext.length);
    base = truncatedName + ext;
  }
  
  return path.join(dir, base);
}

/**
 * Normalizes URL pathname for file system storage
 * @param {string} pathname - URL pathname
 * @param {string} search - URL search/query string
 * @returns {string} - Normalized pathname
 */
function normalizePathname(pathname, search = '') {
  // Remove leading slashes
  let normalized = pathname.replace(/^\/+/, '');
  
  // Handle directory paths (ending with /)
  if (normalized.endsWith('/')) {
    normalized += 'index.html';
  }
  
  // Handle paths without extension
  if (!path.extname(normalized)) {
    normalized += '/index.html';
  }
  
  // Handle query string safely
  if (search) {
    const safeQuery = sanitizeFileName(search);
    normalized = normalized.replace(/index\.html$/, `${safeQuery}-index.html`);
  }
  
  return normalized;
}

/**
 * Decodes content based on encoding type
 * @param {Object} content - HAR content object
 * @returns {Buffer} - Decoded content buffer
 */
function decodeContent(content) {
  if (!content) {
    return Buffer.alloc(0);
  }
  
  const text = content.text || '';
  
  if (content.encoding === 'base64') {
    try {
      return Buffer.from(text, 'base64');
    } catch (error) {
      console.warn('Failed to decode base64 content, using as-is');
      return Buffer.from(text, 'utf8');
    }
  }
  
  return Buffer.from(text, 'utf8');
}

// ============================================================================
// Core Extraction Logic
// ============================================================================

/**
 * Extracts a single HAR file
 * @param {string} harFilePath - Path to the HAR file
 * @param {string} outputDir - Output directory for extracted files
 * @returns {Object} - Statistics about the extraction
 */
function extractHarFile(harFilePath, outputDir) {
  const stats = {
    saved: 0,
    removed: 0,
    failed: 0,
    total: 0,
  };

  try {
    // Read and parse HAR file
    const harContent = fs.readFileSync(harFilePath, 'utf8');
    const har = JSON.parse(harContent);
    
    if (!har.log || !Array.isArray(har.log.entries)) {
      throw new Error('Invalid HAR file format: missing log.entries');
    }

    stats.total = har.log.entries.length;
    console.log(`\nProcessing ${stats.total} entries from ${path.basename(harFilePath)}...`);

    // Process each entry
    har.log.entries.forEach((entry, index) => {
      try {
        const url = new URL(entry.request.url);
        const pathname = normalizePathname(url.pathname, url.search);
        
        // Split into parts and sanitize each folder/file
        const pathParts = pathname
          .split('/')
          .filter(part => part.length > 0) // Remove empty parts
          .map(part => sanitizeFileName(part));
        
        if (pathParts.length === 0) {
          console.warn(`Skipping entry ${index + 1}: empty pathname`);
          return;
        }

        const filePath = truncateFilePath(path.join(outputDir, ...pathParts));
        
        // Ensure parent directories exist
        const parentDir = path.dirname(filePath);
        fs.mkdirSync(parentDir, { recursive: true });

        // Decode and write content
        const content = decodeContent(entry.response.content);
        
        fs.writeFileSync(filePath, content);
        
        // Handle zero-byte files
        const fileStats = fs.statSync(filePath);
        if (CONFIG.removeZeroByteFiles && fileStats.size === 0) {
          fs.unlinkSync(filePath);
          stats.removed++;
          console.log(`  [${index + 1}/${stats.total}] Removed 0-byte file: ${path.relative(outputDir, filePath)}`);
        } else {
          stats.saved++;
          if (stats.saved % 10 === 0 || stats.saved === 1) {
            console.log(`  [${index + 1}/${stats.total}] Saved: ${path.relative(outputDir, filePath)}`);
          }
        }
      } catch (entryError) {
        stats.failed++;
        console.error(`  [${index + 1}/${stats.total}] Failed to process entry:`, entryError.message);
      }
    });

  } catch (error) {
    throw new Error(`Failed to extract HAR file: ${error.message}`);
  }

  return stats;
}

/**
 * Processes all HAR files in the input directory
 * @returns {Object} - Overall statistics
 */
function processHarFiles() {
  const overallStats = {
    filesProcessed: 0,
    totalSaved: 0,
    totalRemoved: 0,
    totalFailed: 0,
  };

  // Validate input directory exists
  if (!fs.existsSync(CONFIG.inputDir)) {
    throw new Error(`Input directory does not exist: ${CONFIG.inputDir}`);
  }

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputBaseDir)) {
    fs.mkdirSync(CONFIG.outputBaseDir, { recursive: true });
    console.log(`Created output directory: ${CONFIG.outputBaseDir}`);
  }

  // Find all HAR files
  const harFiles = fs.readdirSync(CONFIG.inputDir)
    .filter(file => file.toLowerCase().endsWith('.har'))
    .map(file => path.join(CONFIG.inputDir, file));

  if (harFiles.length === 0) {
    console.warn(`No HAR files found in: ${CONFIG.inputDir}`);
    return overallStats;
  }

  console.log(`Found ${harFiles.length} HAR file(s) to process\n`);

  // Process each HAR file
  harFiles.forEach((harFilePath, index) => {
    try {
      const harFileName = path.basename(harFilePath);
      const harBaseName = path.basename(harFileName, '.har');
      const outputDir = getUniqueFolder(CONFIG.outputBaseDir, harBaseName);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[${index + 1}/${harFiles.length}] Extracting: ${harFileName}`);
      console.log(`Output directory: ${outputDir}`);
      console.log(`${'='.repeat(60)}`);

      fs.mkdirSync(outputDir, { recursive: true });

      const stats = extractHarFile(harFilePath, outputDir);

      overallStats.filesProcessed++;
      overallStats.totalSaved += stats.saved;
      overallStats.totalRemoved += stats.removed;
      overallStats.totalFailed += stats.failed;

      console.log(`\n✓ Extraction complete: ${harFileName}`);
      console.log(`  Saved: ${stats.saved}, Removed: ${stats.removed}, Failed: ${stats.failed}`);

    } catch (error) {
      console.error(`\n✗ Failed to process ${path.basename(harFilePath)}:`, error.message);
      overallStats.totalFailed++;
    }
  });

  return overallStats;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main function
 */
function main() {
  console.log('\n' + '='.repeat(60));
  console.log('HAR File Extractor');
  console.log('='.repeat(60));
  console.log(`Input directory: ${CONFIG.inputDir}`);
  console.log(`Output directory: ${CONFIG.outputBaseDir}`);
  console.log(`Remove zero-byte files: ${CONFIG.removeZeroByteFiles}`);
  console.log('='.repeat(60));

  try {
    const stats = processHarFiles();

    console.log('\n' + '='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Total files saved: ${stats.totalSaved}`);
    console.log(`Total zero-byte files removed: ${stats.totalRemoved}`);
    console.log(`Total failed entries: ${stats.totalFailed}`);
    console.log('='.repeat(60));
    console.log('\n✓ All HAR files processed successfully!\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  extractHarFile,
  processHarFiles,
  sanitizeFileName,
  getUniqueFolder,
  CONFIG,
};
