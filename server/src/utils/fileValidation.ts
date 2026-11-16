import fs from 'fs';
import path from 'path';

export interface FileValidationResult {
  isValid: boolean;
  detectedType: string;
  error?: string;
}

/**
 * Validates the actual byte signatures (magic numbers) of uploaded evidence files
 * to prevent extension spoofing and block executable/malicious binaries.
 */
export async function validateFileContent(
  filePath: string,
  originalFilename: string
): Promise<FileValidationResult> {
  const ext = path.extname(originalFilename).toLowerCase();

  // Read the first 16 bytes for magic number identification
  const buffer = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  if (bytesRead === 0) {
    return {
      isValid: false,
      detectedType: 'empty_file',
      error: 'Uploaded file is empty (0 bytes). Digital evidence must contain data.',
    };
  }

  // 1. Detect and immediately reject executable binaries
  // 'MZ' (Windows PE Executable)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return {
      isValid: false,
      detectedType: 'application/x-dosexec',
      error:
        'Security Policy Violation: Windows PE executable files (MZ header) are forbidden in the evidence vault.',
    };
  }

  // '\x7fELF' (Linux Executable)
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return {
      isValid: false,
      detectedType: 'application/x-executable',
      error:
        'Security Policy Violation: Linux ELF executable binaries are forbidden in the evidence vault.',
    };
  }

  // 2. Validate known forensic formats against their expected headers
  if (ext === '.pdf') {
    // '%PDF-' (0x25 0x50 0x44 0x46)
    const isPdf =
      buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    if (!isPdf) {
      return {
        isValid: false,
        detectedType: 'invalid_pdf_header',
        error:
          'File signature mismatch: File claims to be .pdf but lacks the standard %PDF header signature.',
      };
    }
  }

  if (ext === '.png') {
    // 0x89 'PNG'
    const isPng =
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    if (!isPng) {
      return {
        isValid: false,
        detectedType: 'invalid_png_header',
        error:
          'File signature mismatch: File claims to be .png but lacks standard PNG magic bytes.',
      };
    }
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    // 0xFF 0xD8 0xFF
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!isJpeg) {
      return {
        isValid: false,
        detectedType: 'invalid_jpeg_header',
        error: 'File signature mismatch: File claims to be JPEG but lacks JPEG SOI magic bytes.',
      };
    }
  }

  if (ext === '.zip') {
    // 'PK\x03\x04' or 'PK\x05\x06'
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (!isZip) {
      return {
        isValid: false,
        detectedType: 'invalid_zip_header',
        error:
          'File signature mismatch: File claims to be .zip but lacks standard PK archive header.',
      };
    }
  }

  if (ext === '.pcap') {
    // Standard PCAP magic numbers: 0xa1b2c3d4, 0xd4c3b2a1, or PCAPNG: 0x0a0d0d0a
    const isPcap =
      (buffer[0] === 0xa1 && buffer[1] === 0xb2 && buffer[2] === 0xc3 && buffer[3] === 0xd4) ||
      (buffer[0] === 0xd4 && buffer[1] === 0xb2 && buffer[2] === 0xc3 && buffer[3] === 0xa1) ||
      (buffer[0] === 0x0a && buffer[1] === 0x0d && buffer[2] === 0x0d && buffer[3] === 0x0a);
    return {
      isValid: true,
      detectedType: isPcap ? 'application/vnd.tcpdump.pcap' : 'pcap-capture',
    };
  }

  return {
    isValid: true,
    detectedType: ext ? ext.slice(1) : 'binary',
  };
}
