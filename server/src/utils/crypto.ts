import crypto from 'crypto';
import fs from 'fs';

export interface CustodyHashParams {
  evidenceId: string;
  eventType: string;
  actorId: string;
  previousCustodianId?: string | null;
  newCustodianId?: string | null;
  reason: string;
  timestamp: string | Date;
  previousEventHash: string;
}

/**
 * Computes SHA-256 hash of an in-memory buffer.
 */
export const computeSha256 = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Computes SHA-256 hash of a file on disk via streaming to avoid memory exhaustion.
 */
export const computeFileSha256 = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

/**
 * Computes the canonical hash of a chain-of-custody event.
 * Canonical format:
 * evidenceId|eventType|actorId|prevCustodian|newCustodian|reason|ISOtimestamp|prevEventHash
 */
export const computeCustodyEventHash = (params: CustodyHashParams): string => {
  const isoTime =
    params.timestamp instanceof Date
      ? params.timestamp.toISOString()
      : new Date(params.timestamp).toISOString();

  const canonicalString = [
    params.evidenceId,
    params.eventType,
    params.actorId,
    params.previousCustodianId || 'NONE',
    params.newCustodianId || 'NONE',
    params.reason.trim(),
    isoTime,
    params.previousEventHash,
  ].join('|');

  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
};

/**
 * Genesis previous hash constant for initial evidence registration.
 */
export const GENESIS_PREVIOUS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';
