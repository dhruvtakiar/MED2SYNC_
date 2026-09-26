export const opportunities = [
  { id: 1, title: 'Community Health Awareness Camp', organization: 'CareFirst Foundation', location: 'Bengaluru', date: 'Oct 14, 2026', status: 'open', roles: 3, description: 'Help our community team welcome guests and guide people through a day of accessible preventive health education.', tags: ['Communication', 'Registration', 'Patient Assistance'], fill: 58 },
  { id: 2, title: 'Rural Health Outreach Program', organization: 'HealthBridge India', location: 'Mysuru', date: 'Oct 21, 2026', status: 'open', roles: 4, description: 'Coordinate non-clinical support for a multi-day community outreach initiative.', tags: ['Logistics', 'Community Outreach'], fill: 42 },
  { id: 3, title: 'Blood Donation Drive', organization: 'Red Circle Network', location: 'Bengaluru', date: 'Nov 02, 2026', status: 'open', roles: 2, description: 'Support donor registration, wayfinding and participant care at a high-impact drive.', tags: ['Event Management', 'First Aid'], fill: 71 }
];

export const roles = [
  { id: 11, title: 'Registration Support', capacity: 5, filledCount: 3, requiredSkills: ['Communication', 'Registration'], description: 'Welcome attendees, verify sign-ins and maintain a reassuring, organized flow.' },
  { id: 12, title: 'Patient Assistance', capacity: 4, filledCount: 2, requiredSkills: ['Patient Assistance', 'Communication'], description: 'Guide attendees through the event space and support their non-clinical needs.' },
  { id: 13, title: 'Logistics Volunteer', capacity: 4, filledCount: 3, requiredSkills: ['Logistics', 'Event Management'], description: 'Coordinate supplies, rooms and wayfinding with the operations lead.' }
];

export const notifications = [
  { id: 1, title: 'Application approved', text: 'You are approved for Registration Support at Community Health Awareness Camp.', time: '2h ago', type: 'success', unread: true },
  { id: 2, title: 'Shift assigned', text: 'Your first shift starts on October 14 at 9:00 AM.', time: '1d ago', type: 'info', unread: true },
  { id: 3, title: 'Complete your profile', text: 'Add availability to receive more accurate opportunities.', time: '3d ago', type: 'warning', unread: false }
];
