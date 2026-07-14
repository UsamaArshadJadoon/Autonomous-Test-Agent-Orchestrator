import { generateExecutionId, isValidExecutionId, extractTimestamp } from '../../src/execution/id-generator';

describe('Execution ID Generator', () => {
  it('should generate valid execution ID', () => {
    const id = generateExecutionId();
    expect(isValidExecutionId(id)).toBe(true);
  });

  it('should have correct format', () => {
    const id = generateExecutionId();
    expect(id).toMatch(/^exec_\d{8}_[a-f0-9]{8}$/);
  });

  it('should generate unique IDs', () => {
    const id1 = generateExecutionId();
    const id2 = generateExecutionId();
    expect(id1).not.toBe(id2);
  });

  it('should extract timestamp from execution ID', () => {
    const id = generateExecutionId();
    const timestamp = extractTimestamp(id);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should reject invalid execution IDs', () => {
    expect(isValidExecutionId('invalid')).toBe(false);
    expect(isValidExecutionId('exec_20260714_xyz')).toBe(false);
    expect(isValidExecutionId('exec_20260714')).toBe(false);
    expect(isValidExecutionId('exec_abcd1234_12345678')).toBe(false);
  });

  it('should throw on invalid ID format when extracting timestamp', () => {
    expect(() => extractTimestamp('invalid-id')).toThrow('Invalid execution ID format');
  });

  it('should contain current date in execution ID', () => {
    const id = generateExecutionId();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const expectedDate = `${year}${month}${day}`;

    expect(id).toContain(expectedDate);
  });
});
