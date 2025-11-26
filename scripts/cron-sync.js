#!/usr/bin/env node

/**
 * Local cron script for syncing Gmail emails
 * 
 * Usage:
 *   node scripts/cron-sync.js
 * 
 * Set up in crontab to run every 5 minutes:
 *   */5 * * * * cd /path/to/MunicipalLabs-CRM && node scripts/cron-sync.js >> /var/log/gmail-sync.log 2>&1
 * 
 * Or on Windows Task Scheduler:
 *   Action: Start a program
 *   Program: node
 *   Arguments: C:\Dev\MunicipalLabs-CRM\scripts\cron-sync.js
 *   Start in: C:\Dev\MunicipalLabs-CRM
 */

const https = require('https')
const http = require('http')

// Load environment variables if needed
try {
  require('dotenv').config()
} catch (e) {
  // dotenv not installed, that's okay
}

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const cronSecret = process.env.CRON_SECRET || ''

function makeRequest(url, secret) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret && { 'Authorization': `Bearer ${secret}` })
      }
    }

    const req = protocol.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            resolve({ status: res.statusCode, body: data })
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}

async function main() {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Starting Gmail sync...`)
  
  try {
    const url = `${baseUrl}/api/sync/cron`
    const result = await makeRequest(url, cronSecret)
    
    console.log(`[${timestamp}] ✓ Sync completed successfully`)
    console.log(`  Accounts processed: ${result.accountsProcessed || 0}`)
    
    if (result.results && result.results.length > 0) {
      const successes = result.results.filter(r => r.status === 'success').length
      const errors = result.results.filter(r => r.status === 'error').length
      console.log(`  Successes: ${successes}, Errors: ${errors}`)
      
      if (errors > 0) {
        result.results
          .filter(r => r.status === 'error')
          .forEach(r => {
            console.error(`  ✗ User ${r.userId}: ${r.error}`)
          })
      }
    }
  } catch (error) {
    console.error(`[${timestamp}] ✗ Sync failed:`, error.message)
    process.exit(1)
  }
}

main()

