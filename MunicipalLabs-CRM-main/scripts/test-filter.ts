/**
 * Test script for the improved message filter
 */
import { testFilter } from "@/lib/message-filter"

console.log("\n📧 Testing improved classification algorithm:\n")

// Test Venmo
testFilter("Venmo <venmo@venmo.com>", "You have a new payment")

// Test Uber
testFilter("Uber <uber@uber.com>", "Your ride receipt")

// Test VSCO
testFilter("VSCO <hello@vsco.co>", "Your photos are ready")

// Test real person on Gmail
testFilter(
  "John Smith <john.smith@gmail.com>",
  "Quick question about your project"
)

// Test real person at company
testFilter(
  "Sarah Johnson <sarah.johnson@company.com>",
  "Following up on our meeting"
)

// Test newsletter on personal domain
testFilter("Weekly Newsletter <newsletter@gmail.com>", "This week in tech")

// Test Academia
testFilter("Academia.edu <updates@academia-mail.com>", "Here is your download")

// Test Turkish Airlines
testFilter("Turkish Airlines <noreply@turkishairlines.com>", "Your flight confirmation")

// Test College Board
testFilter("College Board <info@collegeboard.org>", "Your SAT scores are ready")

console.log("\n✅ Tests complete!\n")
