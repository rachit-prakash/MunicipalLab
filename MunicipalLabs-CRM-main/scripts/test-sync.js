// Complete test with CORRECT token format
require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
});

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

async function test() {
    try {
        console.log('=== Gmail Sync Test ===\n');

        // Get account
        const { rows } = await pool.query(`SELECT * FROM gmail_accounts LIMIT 1`);
        if (!rows.length) {
            console.log('❌ No Gmail account found!');
            return;
        }

        const acc = rows[0];
        console.log('1. Account:', acc.email);
        console.log('   User ID:', acc.user_id);
        console.log('   Has token:', !!acc.encrypted_refresh_token);

        // Check TOKEN_VAULT_KEY
        const vaultKey = process.env.TOKEN_VAULT_KEY;
        if (!vaultKey) {
            console.log('❌ TOKEN_VAULT_KEY not set!');
            return;
        }

        const key = Buffer.from(vaultKey, 'base64');
        console.log('\n2. TOKEN_VAULT_KEY length:', key.length, '(need 32)');

        if (key.length !== 32) {
            console.log('❌ KEY IS WRONG LENGTH!');
            return;
        }
        console.log('   ✓ Key length OK');

        // Decrypt token using CORRECT format: [IV (12)][TAG (16)][CIPHERTEXT]
        console.log('\n3. Decrypting token...');
        const enc = acc.encrypted_refresh_token;
        const buf = Buffer.isBuffer(enc) ? enc : Buffer.from(enc, 'base64');
        console.log('   Encrypted length:', buf.length, 'bytes');

        if (buf.length < IV_LENGTH + TAG_LENGTH) {
            console.log('   ❌ Token too short!');
            return;
        }

        try {
            // Correct format: [IV (12)][TAG (16)][CIPHERTEXT]
            const iv = buf.subarray(0, IV_LENGTH);
            const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
            const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);

            console.log('   IV length:', iv.length);
            console.log('   Tag length:', authTag.length);
            console.log('   Ciphertext length:', ciphertext.length);

            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            const refreshToken = decrypted.toString('utf8');
            console.log('   ✓ Decryption OK! Token starts with:', refreshToken.substring(0, 10) + '...');

            // Test Google OAuth
            console.log('\n4. Testing Google OAuth...');
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

            if (!clientId || !clientSecret) {
                console.log('   ❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
                return;
            }

            const resp = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
            });

            const data = await resp.json();
            if (!resp.ok) {
                console.log('   ❌ Google OAuth error:', data.error, '-', data.error_description);
                return;
            }
            console.log('   ✓ Got access token! Expires in:', data.expires_in, 'seconds');

            // Test Gmail API
            console.log('\n5. Testing Gmail API...');
            const gmail = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
                headers: { Authorization: `Bearer ${data.access_token}` }
            });
            const gdata = await gmail.json();

            if (!gmail.ok) {
                console.log('   ❌ Gmail API error:', gdata.error?.message);
                return;
            }
            console.log('   ✓ Gmail API works!');
            console.log('   Messages in inbox:', gdata.resultSizeEstimate);

            console.log('\n✅ ALL TESTS PASSED! Click Sync Now in the browser.');

        } catch (decryptError) {
            console.log('   ❌ Decryption failed:', decryptError.message);
            console.log('\n   Token cannot be decrypted with current TOKEN_VAULT_KEY.');
        }

    } catch (e) {
        console.log('Error:', e.message);
    } finally {
        await pool.end();
    }
}

test();
