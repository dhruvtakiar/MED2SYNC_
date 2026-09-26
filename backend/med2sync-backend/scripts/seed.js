require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Skill = require('../models/Skill');
const VolunteerProfile = require('../models/VolunteerProfile');
const Event = require('../models/Event');
const Role = require('../models/Role');
const Application = require('../models/Application');
const ShiftAssignment = require('../models/ShiftAssignment');
const Attendance = require('../models/Attendance');

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany(),
    Skill.deleteMany(),
    VolunteerProfile.deleteMany(),
    Event.deleteMany(),
    Role.deleteMany(),
    Application.deleteMany(),
    ShiftAssignment.deleteMany(),
    Attendance.deleteMany(),
  ]);

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@medvol.com',
    password: 'Admin@123',
    role: 'admin',
  });

  const skillNames = [
    'First Aid',
    'General Medicine',
    'Nursing',
    'Pediatrics',
    'Emergency Response',
    'Mental Health Support',
  ];
  const skills = await Skill.insertMany(skillNames.map((name) => ({ name })));

  const volunteerUser = await User.create({
    name: 'Demo Volunteer',
    email: 'volunteer@medvol.com',
    password: 'Volunteer@123',
    role: 'volunteer',
  });

  const profile = await VolunteerProfile.create({
    user: volunteerUser._id,
    specialization: 'General Physician',
    yearsOfExperience: 3,
    skills: [skills[0]._id, skills[1]._id],
    availability: [{ day: 'Mon', startTime: '09:00', endTime: '17:00' }],
    isVerified: true,
  });

  const event = await Event.create({
    title: 'Rural Health Camp',
    description: 'Free medical checkup camp for a rural community.',
    organization: 'HealthReach NGO',
    location: 'Amritsar',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    createdBy: admin._id,
  });

  const triageRole = await Role.create({
    event: event._id,
    title: 'Triage Nurse',
    description: 'First point of contact, assess patient severity.',
    requiredSkills: [skills[0]._id, skills[4]._id],
    capacity: 3,
  });

  await Role.create({
    event: event._id,
    title: 'General Physician',
    description: 'Diagnose and prescribe treatment.',
    requiredSkills: [skills[1]._id],
    capacity: 2,
  });

  // Walk the demo volunteer all the way through the flow: apply -> approve -> shift -> attendance
  const application = await Application.create({
    volunteer: volunteerUser._id,
    event: event._id,
    role: triageRole._id,
    message: 'Happy to help with triage, I have first aid experience.',
    status: 'approved',
    reviewedBy: admin._id,
    reviewedAt: new Date(),
  });
  triageRole.filledCount += 1;
  await triageRole.save();

  const shift = await ShiftAssignment.create({
    application: application._id,
    volunteer: volunteerUser._id,
    event: event._id,
    role: triageRole._id,
    shiftStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    shiftEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
    assignedBy: admin._id,
  });

  await Attendance.create({
    shiftAssignment: shift._id,
    volunteer: volunteerUser._id,
    status: 'scheduled',
  });

  console.log('Seed data created successfully.');
  console.log('Admin login     -> admin@medvol.com / Admin@123');
  console.log('Volunteer login -> volunteer@medvol.com / Volunteer@123');
  console.log('Demo flow: 1 event, 2 roles, 1 approved application, 1 scheduled shift + attendance record.');
  process.exit();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
