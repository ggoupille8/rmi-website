const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

class WipUploader {
  async upload(filePath) {
    const fileName = path.basename(filePath);
    const stats = fs.statSync(filePath);

    // Validate file size
    if (stats.size < config.minFileSizeBytes) {
      logger.warn(`File too small (${stats.size} bytes), skipping: ${fileName}`);
      return { success: false, reason: 'file_too_small' };
    }

    logger.info(`Uploading ${fileName} (${Math.round(stats.size / 1024)} KiB)...`);

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const fileBuffer = fs.readFileSync(filePath);

        // Build multipart form data manually (avoid heavy dependencies)
        const boundary = '----WipSync' + Date.now();
        const body = Buffer.concat([
          Buffer.from(`--${boundary}\r\n`),
          Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`),
          Buffer.from('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'),
          fileBuffer,
          Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);

        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: body,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        logger.info(`Upload successful: ${fileName}`);
        logger.info(`  Snapshots — Created: ${result.snapshots?.created || 0}, Updated: ${result.snapshots?.updated || 0}, Unchanged: ${result.snapshots?.unchanged || 0}`);
        if (result.totals) {
          logger.info(`  Totals — Months: ${result.totals.months || 0}`);
        }
        if (result.errors && result.errors.length > 0) {
          logger.warn(`  Errors: ${JSON.stringify(result.errors)}`);
        }

        return { success: true, result };

      } catch (error) {
        logger.error(`Upload attempt ${attempt}/${config.maxRetries} failed: ${error.message}`);
        if (attempt < config.maxRetries) {
          logger.info(`Retrying in ${config.retryDelayMs / 1000}s...`);
          await new Promise(r => setTimeout(r, config.retryDelayMs));
        }
      }
    }

    logger.error(`Upload failed after ${config.maxRetries} attempts: ${fileName}`);
    return { success: false, reason: 'max_retries_exceeded' };
  }
}

module.exports = WipUploader;
