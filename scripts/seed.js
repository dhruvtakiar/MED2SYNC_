import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Application, Attendance, Event, Notification, Role, ShiftAssignment, Skill, User, Volunteer } from '../src/models/index.js';

await connectDatabase();
const session = await mongoose.startSession();
try {
  await session.withTransaction(async () => {
    await Promise.all([Attendance, Notification, ShiftAssignment, Application, Role, Event, Volunteer, Skill, User].map(m => m.deleteMany({}, { session })));
    const admin = await User.create([{ name: 'Med2Sync Demo Admin', email: 'admin@medvol.com', password: 'Admin@123', role: 'admin' }], { session });
    const people = await User.create([
      { name: 'Aarav Sharma', email: 'volunteer@medvol.com', password: 'Volunteer@123' },
      { name: 'Mira Patel', email: 'mira.patel@example.com', password: 'Volunteer@123' },
      { name: 'Kabir Rao', email: 'kabir.rao@example.com', password: 'Volunteer@123' },
      { name: 'Ananya Sen', email: 'ananya.sen@example.com', password: 'Volunteer@123' }
    ], { session });
    const skills = await Skill.create([
      ['First Aid', 'Clinical first response', 'health'], ['Communication', 'Clear communication with attendees', 'people'],
      ['Event Management', 'Event coordination', 'operations'], ['Registration', 'Attendee registration and check-in', 'operations'],
      ['Logistics', 'Supplies and venue logistics', 'operations'], ['Crowd Management', 'Safe crowd flow', 'safety'],
      ['Community Outreach', 'Community engagement', 'people'], ['Patient Assistance', 'Non-clinical patient support', 'care'],
      ['Data Entry', 'Accurate records and forms', 'operations']
    ].map(([name, description, category]) => ({ name, description, category })), { session });
    const volunteers = await Volunteer.create(people.map((user, i) => ({
      userId: user._id, phone: `+91 98${String(10000000 + i).slice(0, 8)}`, bio: 'Community-minded volunteer supporting accessible healthcare.',
      specialization: ['Public health', 'Community care', 'Event support', 'Patient services'][i], yearsOfExperience: i,
      location: { city: ['Pune', 'Mumbai', 'Bengaluru', 'Delhi'][i], state: ['Maharashtra', 'Maharashtra', 'Karnataka', 'Delhi'][i] },
      skills: [skills[i]._id, skills[1]._id, skills[(i + 3) % skills.length]._id],
      availability: [{ day: 'Sat', startTime: '08:00', endTime: '18:00' }, { day: 'Sun', startTime: '08:00', endTime: '18:00' }],
      verificationStatus: 'verified', verifiedBy: admin[0]._id, verifiedAt: new Date()
    })), { session });
    const base = new Date(); base.setDate(base.getDate() + 14); base.setHours(9, 0, 0, 0);
    const events = await Event.create(Array.from({ length: 5 }, (_, i) => {
      const start = new Date(base); start.setDate(start.getDate() + i * 7); start.setHours(9, 0, 0, 0);
      const end = new Date(start); end.setHours(16, 0, 0, 0);
      return { title: ['Community Health Screening', 'Heart Health Awareness Day', 'Mobile Wellness Clinic', 'Family Health Fair', 'Rural Outreach Camp'][i], description: 'A community healthcare event providing accessible screening, guidance and support.', organization: ['Med2Sync Foundation', 'City Health Network'][i % 2], location: { address: 'Community Health Centre', city: ['Pune', 'Mumbai', 'Bengaluru', 'Delhi', 'Pune'][i], state: ['Maharashtra', 'Maharashtra', 'Karnataka', 'Delhi', 'Maharashtra'][i] }, startDate: start, endDate: end, createdBy: admin[0]._id };
    }), { session });
    const roles = [];
    for (const [i, event] of events.entries()) {
      roles.push(...await Role.create([
        { eventId: event._id, title: 'Registration Support', description: 'Welcome participants and support registration.', requiredSkills: [skills[3]._id, skills[1]._id], capacity: 5 },
        { eventId: event._id, title: 'Logistics Volunteer', description: 'Prepare supplies and guide venue setup.', requiredSkills: [skills[4]._id, skills[2]._id], capacity: 4 },
        { eventId: event._id, title: 'Community Outreach', description: 'Share health information with attendees.', requiredSkills: [skills[6]._id, skills[1]._id], capacity: 3 }
      ], { session }));
    }
    const applications = await Application.create(volunteers.slice(0, 3).map((v, i) => ({ volunteerId: v._id, eventId: events[i]._id, roleId: roles[i * 3]._id, message: 'I am available and would be glad to support the event.', status: i === 2 ? 'pending' : 'approved', ...(i < 2 ? { reviewedBy: admin[0]._id, reviewedAt: new Date() } : {}) })), { session });
    for (let i = 0; i < 2; i++) {
      await Role.updateOne({ _id: applications[i].roleId }, { $inc: { filledCount: 1 } }, { session });
      const start = new Date(events[i].startDate), end = new Date(start); end.setHours(13);
      const [assignment] = await ShiftAssignment.create([{ applicationId: applications[i]._id, volunteerId: applications[i].volunteerId, eventId: applications[i].eventId, roleId: applications[i].roleId, shiftStart: start, shiftEnd: end, status: 'completed', assignedBy: admin[0]._id }], { session });
      const checkIn = new Date(start); checkIn.setMinutes(5); const checkOut = new Date(end); checkOut.setMinutes(10);
      await Attendance.create([{ shiftAssignmentId: assignment._id, volunteerId: assignment.volunteerId, checkIn, checkOut, status: 'completed', markedBy: admin[0]._id, notes: 'Demo attendance record' }], { session });
    }
    await Notification.create(volunteers.map((v, i) => ({ userId: v.userId, type: i ? 'success' : 'info', title: i ? 'Volunteer verified' : 'Welcome to Med2Sync', message: i ? 'Your demo volunteer profile is verified.' : 'Your demo account is ready.', relatedEntityType: 'volunteer', relatedEntityId: v._id })), { session });
  });
  console.log('Med2Sync demo data seeded. Development-only credentials: admin@medvol.com / Admin@123; volunteer@medvol.com / Volunteer@123');
} finally {
  await session.endSession();
  await disconnectDatabase();
}
