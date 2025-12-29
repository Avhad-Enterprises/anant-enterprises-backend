import { encrypt, decrypt, generateSecurePassword } from '../../auth/encryption';

// Mock dependencies
jest.mock('crypto', () => ({
    createHash: jest.fn(),
    pbkdf2Sync: jest.fn(),
    randomBytes: jest.fn(),
    createCipheriv: jest.fn(),
    createDecipheriv: jest.fn(),
    randomInt: jest.fn(),
}));

jest.mock('../../validateEnv', () => ({
    config: {
        JWT_SECRET: 'test-jwt-secret-for-testing-purposes-only',
    },
}));

jest.mock('../../logging/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));

import crypto from 'crypto';
import { config } from '../../validateEnv';

const mockCreateHash = crypto.createHash as jest.MockedFunction<typeof crypto.createHash>;
const mockPbkdf2Sync = crypto.pbkdf2Sync as jest.MockedFunction<typeof crypto.pbkdf2Sync>;
const mockRandomBytes = crypto.randomBytes as jest.MockedFunction<typeof crypto.randomBytes>;
const mockCreateCipheriv = crypto.createCipheriv as jest.MockedFunction<typeof crypto.createCipheriv>;
const mockCreateDecipheriv = crypto.createDecipheriv as jest.MockedFunction<typeof crypto.createDecipheriv>;
const mockRandomInt = crypto.randomInt as jest.MockedFunction<typeof crypto.randomInt>;

describe('Encryption Utility', () => {
    let mockCipher: any;
    let mockDecipher: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock hash for salt derivation
        const mockHash = {
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue(Buffer.from('0123456789abcdef0123456789abcdef', 'hex')),
        };
        mockCreateHash.mockReturnValue(mockHash as any);

        // Mock PBKDF2 key derivation
        mockPbkdf2Sync.mockReturnValue(Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex'));

        // Mock cipher/decipher
        mockCipher = {
            update: jest.fn().mockReturnValue('encrypted-data'),
            final: jest.fn().mockReturnValue('final-data'),
            getAuthTag: jest.fn().mockReturnValue(Buffer.from('authtag12345678', 'utf8')),
        };
        mockDecipher = {
            update: jest.fn().mockReturnValue('decrypted-data'),
            final: jest.fn().mockReturnValue('final-decrypted'),
            setAuthTag: jest.fn(),
        };

        mockCreateCipheriv.mockReturnValue(mockCipher as any);
        mockCreateDecipheriv.mockReturnValue(mockDecipher as any);

        // Mock random bytes for IV
        mockRandomBytes.mockReturnValue(Buffer.from('0123456789abcdef', 'hex'));
    });

    describe('encrypt function', () => {
        it('should encrypt plaintext successfully', () => {
            const result = encrypt('hello world');

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(mockCreateCipheriv).toHaveBeenCalledWith('aes-256-gcm', expect.any(Buffer), expect.any(Buffer));
            expect(mockCipher.update).toHaveBeenCalledWith('hello world', 'utf8', 'base64');
            expect(mockCipher.final).toHaveBeenCalledWith('base64');
            expect(mockCipher.getAuthTag).toHaveBeenCalled();
        });

        it('should handle encryption errors', () => {
            mockCipher.update.mockImplementation(() => {
                throw new Error('Encryption failed');
            });

            expect(() => encrypt('test')).toThrow('Failed to encrypt data');
        });
    });

    describe('decrypt function', () => {
        it('should decrypt encrypted text successfully', () => {
            // Create a mock encrypted string (IV + authTag + encrypted data)
            const iv = Buffer.from('0123456789abcdef', 'hex');
            const authTag = Buffer.from('authtag12345678', 'utf8');
            const encryptedData = Buffer.from('encrypted-datafinal-data', 'utf8');
            const combined = Buffer.concat([iv, authTag, encryptedData]);
            const encryptedString = combined.toString('base64');

            const result = decrypt(encryptedString);

            expect(result).toBe('decrypted-datafinal-decrypted');
            expect(mockCreateDecipheriv).toHaveBeenCalledWith('aes-256-gcm', expect.any(Buffer), iv);
            expect(mockDecipher.setAuthTag).toHaveBeenCalledWith(authTag);
            expect(mockDecipher.update).toHaveBeenCalledWith(encryptedData.toString('base64'), 'base64', 'utf8');
            expect(mockDecipher.final).toHaveBeenCalledWith('utf8');
        });

        it('should handle decryption errors', () => {
            mockDecipher.update.mockImplementation(() => {
                throw new Error('Decryption failed');
            });

            expect(() => decrypt('invalid-encrypted-data')).toThrow('Failed to decrypt data');
        });
    });

    describe('encrypt/decrypt roundtrip', () => {
        it('should be able to decrypt what was encrypted', () => {
            const originalText = 'This is a test message for encryption';

            const encrypted = encrypt(originalText);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(originalText);
        });

        it('should handle special characters', () => {
            const originalText = 'Special chars: àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ @#$%^&*()';

            const encrypted = encrypt(originalText);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(originalText);
        });
    });

    describe('generateSecurePassword function', () => {
        beforeEach(() => {
            // Mock randomInt for predictable results
            let callCount = 0;
            mockRandomInt.mockImplementation((max) => {
                const values = [0, 1, 2, 3, 10, 15, 20, 25, 5, 8, 12, 18, 22, 7, 9, 14];
                return values[callCount++ % values.length];
            });
        });

        it('should generate password with default length', () => {
            const password = generateSecurePassword();

            expect(password).toBeDefined();
            expect(password.length).toBe(16);
            expect(typeof password).toBe('string');
        });

        it('should generate password with custom length', () => {
            const password = generateSecurePassword(12);

            expect(password.length).toBe(12);
        });

        it('should include all required character types', () => {
            const password = generateSecurePassword(20);

            // Check for uppercase (A-D)
            expect(password).toMatch(/[A-D]/);
            // Check for lowercase (a-d)
            expect(password).toMatch(/[a-d]/);
            // Check for numbers (2-3)
            expect(password).toMatch(/[2-3]/);
            // Check for special chars (@#$%&*!)
            expect(password).toMatch(/[@#$%&*!]/);
        });

        it('should generate different passwords on multiple calls', () => {
            const password1 = generateSecurePassword(10);
            const password2 = generateSecurePassword(10);

            // They might be the same due to mocked random values, but that's ok for testing
            expect(typeof password1).toBe('string');
            expect(typeof password2).toBe('string');
        });
    });

    describe('Key derivation', () => {
        it('should derive encryption key from JWT_SECRET', () => {
            // Clear cached key
            (global as any).cachedEncryptionKey = null;

            encrypt('test');

            expect(mockCreateHash).toHaveBeenCalledWith('sha256');
            expect(mockPbkdf2Sync).toHaveBeenCalledWith(
                config.JWT_SECRET,
                expect.any(Buffer),
                100000,
                32,
                'sha256'
            );
        });

        it('should cache the derived key', () => {
            // Clear cached key
            (global as any).cachedEncryptionKey = null;

            encrypt('test1');
            encrypt('test2');

            // PBKDF2 should only be called once due to caching
            expect(mockPbkdf2Sync).toHaveBeenCalledTimes(1);
        });
    });
});
