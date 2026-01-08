export type DemoMessageItem = {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
}

type Person = { name: string; email: string }

const people: Person[] = [
  { name: "John Smith", email: "john.smith@example.com" },
  { name: "Maria Garcia", email: "maria.garcia@example.com" },
  { name: "Robert Johnson", email: "robert.johnson@example.com" },
  { name: "Susan Williams", email: "susan.williams@example.com" },
  { name: "David Chen", email: "david.chen@example.com" },
  { name: "Aisha Khan", email: "aisha.khan@example.com" },
  { name: "Michael Brown", email: "michael.brown@example.com" },
  { name: "Emily Davis", email: "emily.davis@example.com" },
  { name: "Victor Alvarez", email: "victor.alvarez@example.com" },
  { name: "Priya Patel", email: "priya.patel@example.com" },
  { name: "James Anderson", email: "james.anderson@example.com" },
  { name: "Olivia Thompson", email: "olivia.thompson@example.com" },
  { name: "Noah Martinez", email: "noah.martinez@example.com" },
  { name: "Isabella Lopez", email: "isabella.lopez@example.com" },
  { name: "Liam Wilson", email: "liam.wilson@example.com" },
  { name: "Sophia Moore", email: "sophia.moore@example.com" },
  { name: "Ethan Taylor", email: "ethan.taylor@example.com" },
  { name: "Ava Jackson", email: "ava.jackson@example.com" },
  { name: "Mason White", email: "mason.white@example.com" },
  { name: "Mia Harris", email: "mia.harris@example.com" },
  { name: "Elena Popov", email: "elena.popov@example.com" },
  { name: "Omar Haddad", email: "omar.haddad@example.com" },
  { name: "Hannah Green", email: "hannah.green@example.com" },
  { name: "Caleb Wright", email: "caleb.wright@example.com" },
  { name: "Chloe Baker", email: "chloe.baker@example.com" },
  { name: "Yusuf Ali", email: "yusuf.ali@example.com" },
  { name: "Nora Cohen", email: "nora.cohen@example.com" },
  { name: "Zoe Nguyen", email: "zoe.nguyen@example.com" },
  { name: "Arjun Singh", email: "arjun.singh@example.com" },
  { name: "Grace Rivera", email: "grace.rivera@example.com" },
]

const warTopics: Array<{ subject: string; snippet: string }> = [
  {
    subject: "Ukraine aid package vote — constituent opinion",
    snippet: "Writing to share my view on additional security and humanitarian support for Ukraine.",
  },
  {
    subject: "Ceasefire in Gaza — request for public statement",
    snippet: "I urge you to support an immediate ceasefire and expanded humanitarian access in Gaza.",
  },
  {
    subject: "Sanctions on Russia — local business impact",
    snippet: "Concerned about sanctions’ secondary effects on local suppliers while supporting accountability.",
  },
  {
    subject: "Israel aid with humanitarian safeguards — support",
    snippet: "Please pair assistance with strong civilian-protection conditions and oversight.",
  },
  {
    subject: "Civilian protection in Gaza — constituent concern",
    snippet: "Please press for protections for civilians and sustained humanitarian corridors.",
  },
  {
    subject: "Accountability for Ukraine assistance — oversight request",
    snippet: "I support aid but want transparent reporting on use and end-users.",
  },
  {
    subject: "Hostages and humanitarian corridors — action needed",
    snippet: "Please prioritize safe return of hostages and unhindered delivery of aid.",
  },
  {
    subject: "De-escalation in Israel–Palestine — diplomacy first",
    snippet: "Encouraging robust diplomacy to reduce violence and protect civilians on all sides.",
  },
  {
    subject: "Oppose escalation in Ukraine — focus on diplomacy",
    snippet: "Favor negotiations and humanitarian relief to prevent further loss of life.",
  },
  {
    subject: "Support for Ukraine refugees — community resources",
    snippet: "Local groups are ready to assist resettlement; please expand federal support.",
  },
  {
    subject: "Combat antisemitism and Islamophobia — community safety",
    snippet: "We need clear leadership condemning hate and supporting targeted communities.",
  },
  {
    subject: "International humanitarian law — uphold standards",
    snippet: "Please insist on compliance with IHL and independent investigations of harm to civilians.",
  },
  {
    subject: "Balanced approach to Israel–Palestine — constituent input",
    snippet: "Condemn terrorism and protect civilians; support aid and credible peace efforts.",
  },
  {
    subject: "Russia accountability and sanctions enforcement",
    snippet: "Back stronger sanctions enforcement while mitigating local economic disruption.",
  },
  {
    subject: "Protect media and NGOs in conflict zones",
    snippet: "Please advocate for safety of journalists and aid workers operating in Gaza and Ukraine.",
  },
]

const domesticTopics: Array<{ subject: string; snippet: string }> = [
  { subject: "Healthcare premiums — need relief", snippet: "Family plan costs keep rising; please support measures to lower premiums." },
  { subject: "Housing affordability — zoning and supply", snippet: "We need more homes near transit and incentives for affordable units." },
  { subject: "Small business grants — recovery and hiring", snippet: "Requesting support for hiring credits and streamlined grant programs." },
  { subject: "Climate resilience — wildfire and flood funding", snippet: "Back adaptation projects and grid hardening in high-risk areas." },
  { subject: "Student debt — interest relief", snippet: "Please expand income-driven repayment and pause interest accruals." },
  { subject: "Border security and asylum processing", snippet: "Support smart security plus humane, timely asylum adjudication." },
  { subject: "Fentanyl crisis — prevention and treatment", snippet: "Invest in interdiction tech and expand medication-assisted treatment." },
  { subject: "Veterans’ healthcare access", snippet: "Reduce wait times and expand mental health services in our region." },
  { subject: "Broadband access — last-mile buildout", snippet: "Rural neighborhoods need reliable, affordable high-speed internet." },
  { subject: "AI safety and transparency standards", snippet: "Back baseline safety tests and labeling for AI-generated content." },
  { subject: "Antitrust and fair competition", snippet: "Strengthen enforcement to protect small businesses and consumers." },
  { subject: "Gun safety — background checks", snippet: "Please support universal background checks and secure storage incentives." },
  { subject: "Childcare availability — workforce support", snippet: "Expand childcare tax credits and provider capacity grants." },
  { subject: "Transportation — safer streets", snippet: "Fund Vision Zero projects and pedestrian safety improvements." },
  { subject: "Education funding — teacher retention", snippet: "Support stipends for student teachers and loan forgiveness." },
  { subject: "Seniors — cost of living relief", snippet: "Protect Social Security and cap prescription costs further." },
  { subject: "Cybersecurity — critical infrastructure", snippet: "Please fund assessments and incident-response drills for utilities." },
  { subject: "Election administration — trust and security", snippet: "Back bipartisan standards, paper trails, and poll worker support." },
  { subject: "Net neutrality and open internet", snippet: "Restore net neutrality to protect consumers and startups." },
  { subject: "Water quality — PFAS remediation", snippet: "Communities need monitoring funds and cleanup assistance for PFAS." },
]

function formatFrom(person: Person): string {
  return `${person.name} <${person.email}>`
}

function computeDate(hoursBack: number): string {
  const millis = Math.max(0, hoursBack) * 60 * 60 * 1000
  return new Date(Date.now() - millis).toUTCString()
}

function topicAt(index: number): { subject: string; snippet: string } {
  // Heavier weighting toward war/conflict topics (~60%)
  const useWar = index % 10 < 6
  const pool = useWar ? warTopics : domesticTopics
  return pool[index % pool.length]
}

export function buildDemoMessages(count: number = 100): DemoMessageItem[] {
  const items: DemoMessageItem[] = []
  for (let i = 0; i < count; i++) {
    const person = people[i % people.length]
    const t = topicAt(i)
    // Spread emails across roughly the last 25–30 days
    const hoursBack = 6 * i + ((i % 3) * 2)
    items.push({
      id: `demo-${i + 1}`,
      threadId: `demo-t-${i + 1}`,
      subject: t.subject,
      from: formatFrom(person),
      date: computeDate(hoursBack),
      snippet: t.snippet,
    })
  }
  return items
}

export const demoMessages: DemoMessageItem[] = buildDemoMessages(114)


