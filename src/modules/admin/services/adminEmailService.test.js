import { describe, expect, it } from 'vitest';
import XLSX from 'xlsx';
import {
  dedupeEmails,
  isValidEmail,
  normalizeEmail,
  chunkArray,
  parseRecipientsFromSpreadsheet,
  MAX_RECIPIENTS_PER_SEND,
} from './adminEmailService.js';

describe('adminEmailService helpers', () => {
  it('normalizes and validates emails', () => {
    expect(normalizeEmail('  Test@Example.COM ')).toBe('test@example.com');
    expect(isValidEmail('valid@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
  });

  it('deduplicates emails case-insensitively', () => {
    expect(
      dedupeEmails(['A@Example.com', 'a@example.com', 'b@example.com'])
    ).toEqual(['a@example.com', 'b@example.com']);
  });

  it('chunks arrays into requested sizes', () => {
    const items = Array.from({ length: 101 }, (_, index) => `user${index}@example.com`);
    const chunks = chunkArray(items, 100);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(1);
  });

  it('parses email addresses from spreadsheet buffer', () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['email'],
      ['one@example.com'],
      ['two@example.com'],
      ['invalid'],
      ['one@example.com'],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recipients');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const result = parseRecipientsFromSpreadsheet(buffer);

    expect(result.emails).toEqual(['one@example.com', 'two@example.com']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        row: 4,
        email: 'invalid',
        error: 'Invalid email format',
      })
    );
  });

  it('exposes a max recipient limit constant', () => {
    expect(MAX_RECIPIENTS_PER_SEND).toBe(500);
  });
});
