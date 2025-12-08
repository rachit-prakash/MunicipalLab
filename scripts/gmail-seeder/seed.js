/**
 * Gmail Inbox Seeder for MunicipalLabs
 * Sends realistic constituent emails to a test inbox
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// ============================================================================
// CONFIG
// ============================================================================

const config = {
  senderEmail: process.env.SENDER_EMAIL,
  senderPass: process.env.SENDER_PASS,
  targetEmail: process.env.TARGET_EMAIL || 'johndoe@municipallabs.ai',
  delayBetweenEmails: 1500, // milliseconds
};

// Validate required config
function validateConfig() {
  if (!config.senderEmail) {
    console.error('L ERROR: SENDER_EMAIL environment variable is required');
    process.exit(1);
  }
  if (!config.senderPass) {
    console.error('L ERROR: SENDER_PASS environment variable is required');
    process.exit(1);
  }
  console.log(' Config validated');
  console.log(`   Sender: ${config.senderEmail}`);
  console.log(`   Target: ${config.targetEmail}`);
  console.log('');
}

// ============================================================================
// TRANSPORTER
// ============================================================================

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.senderEmail,
      pass: config.senderPass,
    },
  });
}

// ============================================================================
// MESSAGE DATA
// ============================================================================

function getMessages() {
  // Helper to create fake PDF attachment
  const createPdfAttachment = (filename) => ({
    filename,
    content: Buffer.from('%PDF-1.4\n%fake pdf content for testing\n'),
    contentType: 'application/pdf',
  });

  // Helper to create fake image attachment
  const createImageAttachment = (filename) => ({
    filename,
    content: Buffer.from('fake-image-data-for-testing'),
    contentType: 'image/jpeg',
  });

  const messages = [
    // ========================================================================
    // POTHOLES / ROAD MAINTENANCE
    // ========================================================================
    {
      from: 'maria.gonzalez@email.com',
      fromName: 'Maria Gonzalez',
      subject: 'Large pothole on Elm Street near Central Ave',
      body: `Hello,

There is a very large pothole on Elm Street, right near the intersection with Central Ave. It's been there for over two weeks and is getting worse. My neighbor damaged a tire hitting it yesterday.

Can someone please come fix it soon?

Thank you,
Maria Gonzalez
Elm Street resident`,
    },
    {
      from: 'james.butler@email.com',
      fromName: 'James Butler',
      subject: 'URGENT: Road hazard on Highway 12',
      body: `URGENT - There's a huge chunk of asphalt missing on Highway 12 northbound near mile marker 47. This is a safety hazard and needs immediate attention. Multiple cars have swerved to avoid it.

Please address this immediately.

James Butler
(555) 234-5678`,
    },
    {
      from: 'maria.gonzalez@email.com',
      fromName: 'Maria Gonzalez',
      subject: 'Re: Large pothole on Elm Street near Central Ave',
      body: `Hi again,

I submitted a request about this pothole two weeks ago (Case #12345) and still haven't seen anyone come to fix it. The hole is now even larger and more dangerous.

Please can you provide an update on when this will be repaired?

Maria Gonzalez`,
    },

    // ========================================================================
    // TRASH / SANITATION
    // ========================================================================
    {
      from: 'kevin.park@email.com',
      fromName: 'Kevin Park',
      subject: 'Missed trash pickup - Oak Drive',
      body: `Good morning,

Our trash was not picked up yesterday (Tuesday) on Oak Drive. The whole street was missed. Can you please send a truck today or let us know when we can expect pickup?

Thanks,
Kevin Park
234 Oak Drive`,
    },
    {
      from: 'sandra.williams@email.com',
      fromName: 'Sandra Williams',
      subject: 'Request for additional recycling bins',
      body: `Hello,

I would like to request an additional recycling bin for my household. We generate a lot of recyclables and one bin is not enough.

Please let me know the process and any associated fees.

Sandra Williams
567 Maple Lane`,
    },
    {
      from: 'angry.resident@email.com',
      fromName: 'Robert Chen',
      subject: 'Garbage truck damaged my mailbox',
      body: `To whom it may concern,

This morning the garbage truck knocked over and damaged my mailbox at 890 Birch Street. The driver didn't stop or leave a note. I have video footage from my doorbell camera.

I expect the city to repair or reimburse me for this damage. Please contact me ASAP.

Robert Chen
(555) 876-5432`,
      attachments: [createImageAttachment('mailbox-damage.jpg')],
    },

    // ========================================================================
    // PARKING AND TICKETS
    // ========================================================================
    {
      from: 'jennifer.moore@email.com',
      fromName: 'Jennifer Moore',
      subject: 'Disputing parking ticket #PTK-9876',
      body: `Hello,

I received parking ticket #PTK-9876 on December 1st, but I believe it was issued in error. The parking sign was covered by tree branches and not visible. I have photos showing this.

Please review and consider dismissing this ticket. Photos are attached.

Jennifer Moore`,
      attachments: [createImageAttachment('parking-sign-photo.jpg')],
    },
    {
      from: 'mike.torres@email.com',
      fromName: 'Mike Torres',
      subject: 'Permit parking on Washington Street',
      body: `Hi,

I'm a new resident on Washington Street and would like to apply for a residential parking permit. Can you please send me the application or direct me to where I can apply online?

Thank you,
Mike Torres
456 Washington Street, Apt 3B`,
    },
    {
      from: 'downtown.business@email.com',
      fromName: 'Lisa Anderson',
      subject: 'Commercial parking permits for employees',
      body: `Good afternoon,

We operate a small business downtown and need parking permits for 5 employees. What is the process and cost for commercial parking permits?

Also, is there a waiting list?

Best regards,
Lisa Anderson
Downtown Cafe & Bakery`,
    },

    // ========================================================================
    // NOISE COMPLAINTS
    // ========================================================================
    {
      from: 'sleepless.in.town@email.com',
      fromName: 'Patricia Lee',
      subject: 'Noise complaint - loud music at night',
      body: `Hello,

I'm writing to complain about excessive noise from 789 Pine Street. Almost every weekend there's loud music until 2-3am. I've tried talking to the neighbors but nothing changes.

Can someone please enforce the noise ordinance?

Patricia Lee
791 Pine Street`,
    },
    {
      from: 'david.brown@email.com',
      fromName: 'David Brown',
      subject: 'Construction noise starting at 6am',
      body: `Hi,

There's construction happening at the lot next to my house and they start with heavy machinery at 6am every day. I thought construction wasn't allowed before 7am on weekdays and 8am on weekends?

Can you please look into this?

David Brown
123 Cherry Lane`,
    },

    // ========================================================================
    // HOUSING AND EVICTIONS
    // ========================================================================
    {
      from: 'tenant.help@email.com',
      fromName: 'Angela Martinez',
      subject: 'Question about eviction notice',
      body: `Hello,

I received an eviction notice from my landlord but I don't think the process was done correctly. Can you direct me to resources for tenant rights or legal aid?

Thank you,
Angela Martinez`,
    },
    {
      from: 'concerned.neighbor@email.com',
      fromName: 'Thomas Green',
      subject: 'Abandoned property concerns',
      body: `To the city council,

The house at 555 Willow Ave has been abandoned for over a year. The yard is overgrown, there are broken windows, and it's becoming a safety issue. I'm worried about squatters and vermin.

Can the city do something about this property?

Thomas Green
557 Willow Ave`,
    },

    // ========================================================================
    // SMALL BUSINESS PERMITS AND INSPECTIONS
    // ========================================================================
    {
      from: 'newbiz@email.com',
      fromName: 'Sarah Johnson',
      subject: 'Food truck permit application',
      body: `Good morning,

I'm interested in operating a food truck in the city and would like information about:
1. Required permits and licenses
2. Approved locations
3. Fees and application process
4. Health inspection requirements

Please send me the relevant information or direct me to the right department.

Thank you,
Sarah Johnson
(555) 123-4567`,
    },
    {
      from: 'restaurant.owner@email.com',
      fromName: 'Carlos Rivera',
      subject: 'Failed health inspection - requesting re-inspection',
      body: `Hello,

My restaurant received a health inspection last week and we failed due to some minor issues. We have corrected all the problems and would like to request a re-inspection as soon as possible.

Our business license #BL-45678.

Please let me know the next available date.

Carlos Rivera
Rivera's Mexican Grill`,
    },
    {
      from: 'startup.founder@email.com',
      fromName: 'Emily White',
      subject: 'Home occupation permit question',
      body: `Hi,

I'm starting a small consulting business from my home office. Do I need a home occupation permit? I won't have clients visiting - it's all remote work.

My address is 321 Cedar Street.

Thanks,
Emily White`,
    },
    {
      from: 'carlos.rivera@email.com',
      fromName: 'Carlos Rivera',
      subject: 'Re: Failed health inspection - requesting re-inspection',
      body: `Following up on my previous email - it's been 5 days and I haven't heard back about scheduling the re-inspection.

Our business is losing money every day we can't operate. Please respond urgently.

Carlos Rivera
(555) 789-0123`,
    },

    // ========================================================================
    // PUBLIC SAFETY / POLICE
    // ========================================================================
    {
      from: 'concerned.citizen@email.com',
      fromName: 'Margaret Thompson',
      subject: 'URGENT: Suspicious activity in Memorial Park',
      body: `URGENT - There has been suspicious activity in Memorial Park after dark for the past week. Groups of people loitering, possible drug activity.

Can we please get increased police patrols in this area? Many families use this park and we don't feel safe.

Margaret Thompson
Park neighborhood resident`,
    },
    {
      from: 'bike.commuter@email.com',
      fromName: 'Alex Kim',
      subject: 'Request for crosswalk safety improvements',
      body: `Hello,

The crosswalk at Main Street and 5th Avenue is very dangerous. Cars rarely stop for pedestrians and there have been several near-misses.

Can the city install better signage, flashing lights, or a traffic signal?

Alex Kim
Daily pedestrian commuter`,
    },
    {
      from: 'parent.pta@email.com',
      fromName: 'Rachel Foster',
      subject: 'School zone speeding concerns',
      body: `Dear City Officials,

Cars are regularly speeding through the school zone on Jefferson Road during drop-off and pickup times. This is extremely dangerous for our children.

We need better enforcement and possibly speed cameras.

Rachel Foster
Jefferson Elementary PTA President`,
      attachments: [createPdfAttachment('pta-petition.pdf')],
    },

    // ========================================================================
    // PUBLIC RECORDS REQUESTS (FOIA)
    // ========================================================================
    {
      from: 'journalist@localnews.com',
      fromName: 'Daniel Scott',
      subject: 'Public Records Request - Building Permits',
      body: `Dear Records Department,

I am submitting a public records request under the Freedom of Information Act for:

All building permits issued in the downtown district from January 1, 2024 to December 1, 2024.

Please provide these records in electronic format if possible.

Thank you,
Daniel Scott
Local News Reporter`,
    },
    {
      from: 'lawyer@lawfirm.com',
      fromName: 'Attorney Susan Blake',
      subject: 'FOIA Request - Police Reports',
      body: `To whom it may concern,

This is a formal public records request for all police reports related to incidents at 999 Main Street during October 2024.

Case reference: City vs. Smith

Please confirm receipt and provide an estimated timeline for fulfilling this request.

Susan Blake, Esq.
Blake & Associates Law Firm`,
    },
    {
      from: 'journalist@localnews.com',
      fromName: 'Daniel Scott',
      subject: 'Re: Public Records Request - Building Permits',
      body: `Following up on my request from November 15th (Reference #FOIA-2024-156).

I haven't received the requested records yet. The law requires a response within 10 business days. Can you please provide an update?

Daniel Scott
Local News Reporter`,
    },

    // ========================================================================
    // PROPERTY TAXES
    // ========================================================================
    {
      from: 'homeowner@email.com',
      fromName: 'Richard Walsh',
      subject: 'Property tax assessment seems incorrect',
      body: `Hello,

I just received my property tax assessment and the value seems much higher than comparable homes in my neighborhood. My property is assessed at $450,000 but similar homes are assessed at $380,000-$400,000.

How do I dispute this assessment?

Richard Walsh
876 Sycamore Drive`,
    },
    {
      from: 'senior.citizen@email.com',
      fromName: 'Dorothy Patterson',
      subject: 'Question about senior property tax exemption',
      body: `Good afternoon,

I recently turned 65 and heard there may be property tax exemptions available for seniors. Can you send me information about this program and how to apply?

Thank you,
Dorothy Patterson
234 Elderly Lane`,
    },
    {
      from: 'confused.taxpayer@email.com',
      fromName: 'John Miller',
      subject: 'Did not receive tax bill',
      body: `Hi,

I never received my property tax bill for this year. I don't want to incur late fees. Can you please resend it to my email or mailing address?

Property address: 555 Beech Street

John Miller
(555) 234-9876`,
    },

    // ========================================================================
    // COMMUNITY EVENTS
    // ========================================================================
    {
      from: 'block.party@email.com',
      fromName: 'Catherine Rodriguez',
      subject: 'Permit for neighborhood block party',
      body: `Hello,

We're organizing a block party on Sunset Avenue for June 15th and need to apply for a street closure permit.

What is the process and how far in advance do we need to apply?

Thank you,
Catherine Rodriguez
Sunset Avenue Block Party Committee`,
    },
    {
      from: 'festival.organizer@email.com',
      fromName: 'Mark Stevens',
      subject: 'Vendor permits for Summer Arts Festival',
      body: `Good morning,

I'm organizing the Summer Arts Festival at City Plaza and we'll have about 30 food and craft vendors. What permits do the vendors need and what does the event organizer need to provide?

Event date: July 20-21

Mark Stevens
Events Coordinator`,
      attachments: [createPdfAttachment('vendor-list.pdf')],
    },
    {
      from: 'youth.sports@email.com',
      fromName: 'Coach Williams',
      subject: 'Request to reserve soccer fields',
      body: `Hi,

Our youth soccer league would like to reserve the fields at Riverside Park for our spring season (March-May). We need fields on Saturdays from 9am-3pm.

What's the reservation process and fee structure?

Thanks,
Coach Williams
Riverside Youth Soccer League`,
    },

    // ========================================================================
    // MISCELLANEOUS
    // ========================================================================
    {
      from: 'dog.owner@email.com',
      fromName: 'Laura Bennett',
      subject: 'Request for dog park in West side',
      body: `Dear City Council,

The west side of town has been growing rapidly but we still don't have a dog park. The nearest one is 20 minutes away.

Many of us would love to see a dog park built in the vacant lot near the community center. Is this something the city would consider?

Laura Bennett
West Side Residents Association`,
      attachments: [createPdfAttachment('dog-park-proposal.pdf')],
    },
    {
      from: 'tree.hugger@email.com',
      fromName: 'Environmental Committee',
      subject: 'Request to save old oak tree',
      body: `Hello,

We understand there are plans to remove the old oak tree at 123 Heritage Street for a development project. This tree is over 100 years old and is a neighborhood landmark.

Can the city intervene to save this tree? Perhaps the development plans can be modified?

Concerned Citizens for Historic Trees`,
    },
    {
      from: 'utility.customer@email.com',
      fromName: 'Steve Jackson',
      subject: 'Water bill seems very high',
      body: `Hi,

My water bill this month is $450, which is triple my normal bill. I don't think I have a leak. Can someone check if there's a meter reading error?

Account #: WTR-78965

Steve Jackson
(555) 345-6789`,
    },
    {
      from: 'winter.worrier@email.com',
      fromName: 'Betty Cooper',
      subject: 'Snow removal on side streets',
      body: `Good morning,

Main roads are always plowed quickly after snow, but side streets like mine (Frost Lane) are often left for days. We can barely get our cars out.

Can the city improve snow removal on residential side streets?

Betty Cooper
Frost Lane resident`,
    },
  ];

  // Assign senders and format
  return messages.map((msg) => ({
    from: `"${msg.fromName}" <${msg.from}>`,
    to: config.targetEmail,
    subject: msg.subject,
    text: msg.body,
    attachments: msg.attachments || [],
  }));
}

// ============================================================================
// SEND EMAILS
// ============================================================================

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessages(transporter, messages) {
  let successCount = 0;
  let failureCount = 0;

  console.log(`=� Starting to send ${messages.length} emails...\n`);

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const progress = `${i + 1}/${messages.length}`;

    try {
      await transporter.sendMail(message);
      successCount++;
      console.log(` Sent ${progress}: "${message.subject}"`);
    } catch (error) {
      failureCount++;
      console.error(`L Failed ${progress}: "${message.subject}"`);
      console.error(`   Error: ${error.message}`);
    }

    // Delay between sends to avoid rate limiting
    if (i < messages.length - 1) {
      await delay(config.delayBetweenEmails);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('=� SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total emails: ${messages.length}`);
  console.log(` Successful: ${successCount}`);
  console.log(`L Failed: ${failureCount}`);
  console.log('='.repeat(70));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n<1 Gmail Inbox Seeder for MunicipalLabs\n');

  // Validate configuration
  validateConfig();

  // Create transporter
  console.log('=� Creating email transporter...');
  const transporter = createTransporter();

  // Get messages
  console.log('=� Generating messages...');
  const messages = getMessages();
  console.log(`   Generated ${messages.length} messages\n`);

  // Send messages
  await sendMessages(transporter, messages);

  console.log('\n( Seeding complete!\n');
}

// Run the script
main().catch((error) => {
  console.error('\n=� Fatal error:', error);
  process.exit(1);
});
