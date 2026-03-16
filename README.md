# HAR File Extractor

A powerful Node.js tool to extract resources and data from HTTP Archive (HAR) files, organizing them into a structured directory hierarchy that mirrors the original URLs.

## 🌟 Features

- **Automatic Extraction**: Processes all HAR files in the input directory
- **Organized Output**: Creates a directory structure matching the original URL paths
- **Smart File Handling**: 
  - Sanitizes filenames for Windows compatibility
  - Handles zero-byte files (configurable)
  - Truncates overly long filenames
  - Preserves directory structure
- **Base64 Decoding**: Automatically decodes base64-encoded content
- **Duplicate Handling**: Creates unique folder names when duplicates exist
- **Progress Tracking**: Shows detailed progress and statistics
- **Error Handling**: Robust error handling with informative messages

## 📋 Prerequisites

- Node.js 12.0.0 or higher

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/HarFileExtract.git
cd HarFileExtract
```

2. Install dependencies (if any):
```bash
npm install
```

## 💻 Usage

1. Place your HAR files in the `input/` directory

2. Run the extractor:
```bash
npm start
# or
node extractor.js
```

3. Find extracted files in the `output/` directory

## 📁 Project Structure

```
HarFileExtract/
├── input/          # Place your .har files here
├── output/         # Extracted files will be saved here
├── extractor.js    # Main extraction script
├── package.json    # Project configuration
└── README.md       # This file
```

## ⚙️ Configuration

Edit the `CONFIG` object in `extractor.js` to customize behavior:

```javascript
const CONFIG = {
  inputDir: path.resolve(__dirname, 'input'),
  outputBaseDir: path.resolve(__dirname, 'output'),
  removeZeroByteFiles: true,      // Set to false to keep empty files
  maxFilenameLength: 250,         // Windows max filename length
};
```

## 📝 How It Works

1. **Reads HAR Files**: Scans the `input/` directory for `.har` files
2. **Parses Entries**: Extracts all HTTP entries from each HAR file
3. **Normalizes Paths**: Converts URLs to file system paths
4. **Sanitizes Names**: Removes invalid characters for Windows compatibility
5. **Decodes Content**: Handles base64 and UTF-8 encoded content
6. **Saves Files**: Creates directory structure and saves files

## 🎯 Example

Given a HAR file with entries like:
- `https://example.com/api/data.json`
- `https://example.com/css/style.css`
- `https://example.com/js/app.js`

The extractor will create:
```
output/
└── example.com/
    ├── api/
    │   └── data.json
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

## 🔧 Troubleshooting

- **No files extracted**: Ensure HAR files are in the `input/` directory
- **Invalid characters**: The tool automatically sanitizes filenames
- **Long filenames**: Automatically truncated to 250 characters (Windows limit)
- **Duplicate folders**: Automatically renamed with `_new(1)`, `_new(2)`, etc.

## 📊 Output Statistics

The tool provides detailed statistics:
- Files processed
- Files saved
- Zero-byte files removed
- Failed entries

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for any purpose.

## 🙏 Acknowledgments

- Built for web developers who need to analyze HAR files
- Useful for debugging and understanding web application behavior

---

**Made with ❤️ for the web development community**
