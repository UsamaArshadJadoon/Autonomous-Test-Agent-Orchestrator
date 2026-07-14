import { randomBytes } from 'crypto';

/**
 * Generates a unique execution ID with format: exec_YYYYMMDD_RANDOM
 */
export function generateExecutionId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = randomBytes(4).toString('hex').substring(0, 8);

  return `exec_${year}${month}${day}_${random}`;
}

/**
 * Validates if a string is a valid execution ID
 */
export function isValidExecutionId(id: string): boolean {
  return /^exec_\d{8}_[a-f0-9]{8}$/.test(id);
}

/**
 * Extracts the timestamp from an execution ID
 */
export function extractTimestamp(executionId: string): Date {
  const match = executionId.match(/^exec_(\d{4})(\d{2})(\d{2})_/);
  if (!match) throw new Error('Invalid execution ID format');

  const [, year, month, day] = match;
  return new Date(`${year}-${month}-${day}`);
}
