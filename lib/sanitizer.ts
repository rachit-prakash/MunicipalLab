// redacts PII from text.
export function redactPII(text: string): string {
  if (!text) return text;

  let redacted = text;

  // redacts email addresses
  // Matches: user@example.com, name.lastname@domain.co.uk, etc.
  redacted = redacted.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[redacted]'
  );

  // redacts phone numbers
  // Matches: (123) 456-7890, 123-456-7890, +1 123 456 7890, 123.456.7890, etc.
  redacted = redacted.replace(
    /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    '[redacted]'
  );

  // redacts street numbers
  // Matches: 123 Main Street, 456 Oak Avenue, 7890 Park Road, etc.
  redacted = redacted.replace(
    /\b\d+\s+([\w\s]+\s+)?(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir|Parkway|Pkwy|Terrace|Ter)\b/gi,
    '[redacted]'
  );

  return redacted;
}

