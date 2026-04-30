export const STUDIO = {
  name: 'Regular Studio Limited',
  shortName: 'Regular Studio',
  email: 'hello@rglr.studio',
  website: 'www.rglr.studio',
  logoPath: '/logo.svg',
  vatRate: 0.20,
  vatNumber: 'GB 402583421',
  companyReg: '12821217',
  address: {
    line1: 'Unit 11F Hewlett House',
    line2: 'Havelock Terrace',
    city: 'London',
    postcode: 'SW8 4AS',
  },
  bank: {
    accountName: 'Regular Studio Limited',
    iban: 'GB43SRLG60837175173177',
    bic: 'SRLGGB2L',
    sortCode: '60-83-71',
    accountNumber: '75173177',
  },
}

export const TERMS_AND_CONDITIONS = `General Notes
All costs exclude VAT. Deliverables listed are indicative and may vary in type but will remain within the scope defined by the retainer. Additional work outside of agreed scope will be estimated and approved separately.

Payment Terms
The project fee will be invoiced for each month's work and will be due within 30 days of issuing.

Cancellation Policy
Either party may terminate this Agreement by providing written notice via email. The Agreement will officially end once the other party acknowledges the cancellation in writing. Upon termination, the Agency will cease work immediately unless otherwise specified in the notice.

Intellectual Property Rights
Any intellectual property created for the Client during the course of providing services under this Agreement shall remain the property of the Client. These works may not be used for commercial purposes or showcased for profit by any party outside this Agreement. The Agency holds the right to showcase the completed works across marketing channels such as website, socials and credentials deck.

Confidentiality
Both parties agree to maintain the confidentiality of any proprietary or confidential information disclosed during the term of this Agreement.

Limitation Of Liability & Indemnification
The Agency is not liable for any indirect, incidental, consequential, or special damages arising from the use of the deliverables or any delays in project completion. The Client agrees to indemnify and hold harmless the Agency from any claims, damages, liabilities, costs, and expenses (including reasonable attorney fees) arising out of or related to the Client's use of the services provided under this Agreement.

Amendments
Any amendments to this Agreement must be made in writing and signed by both parties.

Governing Law
This Contract shall be governed by and construed in accordance with the laws of England and Wales.`

export const PIPELINE_STAGES = ['Lead', 'Quoted', 'Confirmed', 'Active', 'Complete', 'Lost']
export const SECTORS = ['Real Estate', 'Property', 'Hospitality', 'DTC', 'Healthcare', 'Other']
export const SOURCES = ['LinkedIn', 'Referral', 'NYC Trip', 'Cold Outreach', 'Inbound', 'Existing Client', 'Other']
export const PROJECT_TYPES = ['Brand Identity', 'Website', 'Campaign', 'Print', 'Packaging', 'Motion', 'Strategy', 'Retainer', 'Other']
export const INVOICE_STATUS = ['draft', 'sent', 'paid']
export const QUOTE_STATUS = ['draft', 'sent', 'approved', 'rejected']
export const DOC_TYPES = ['quote', 'sow', 'invoice']

// Lead tracking
export const LEAD_TEMPERATURES = ['Cold', 'Warm', 'Hot']
export const NEXT_ACTIONS = ['call_booked', 'proposal_sent', 'sow_sent', 'waiting']
export const NEXT_ACTION_LABELS = {
  call_booked: 'Call Booked',
  proposal_sent: 'Proposal Sent',
  sow_sent: 'SOW Sent',
  waiting: 'Waiting',
}
export const DOCUMENT_SENT_OPTIONS = ['Studio Credentials', 'Tailored Credentials', 'Process Document', 'Event Report', 'No Document']
export const DOCUMENT_SENT_VALUES = {
  'Studio Credentials': 'studio_credentials',
  'Tailored Credentials': 'tailored_credentials',
  'Process Document': 'process_document',
  'Event Report': 'event_report',
  'No Document': 'no_document',
}
