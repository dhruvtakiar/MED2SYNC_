import test from 'node:test';
import assert from 'node:assert/strict';
import { Attendance, Event, Role, User, Volunteer } from '../src/models/index.js';

test('user email is normalized and password is excluded from selection', () => {
  const user = new User({ name: 'Test Volunteer', email: 'USER@EXAMPLE.COM', password: 'password123' });
  assert.equal(user.email, 'user@example.com');
  assert.equal(user.role, 'volunteer');
  assert.equal(user.schema.path('password').options.select, false);
});

test('availability rejects a reversed time window', async () => {
  const doc = new Volunteer({ userId: '507f1f77bcf86cd799439011', availability: [{ day: 'Mon', startTime: '17:00', endTime: '09:00' }] });
  await assert.rejects(doc.validate(), /endTime must be after startTime/);
});

test('events and roles reject invalid ranges and capacity values', async () => {
  const event = new Event({ title: 'Event', description: 'Description', organization: 'Org', location: { city: 'Pune', state: 'MH' }, startDate: '2026-10-02', endDate: '2026-10-01', createdBy: '507f1f77bcf86cd799439011' });
  await assert.rejects(event.validate(), /endDate must be after startDate/);
  const role = new Role({ eventId: '507f1f77bcf86cd799439011', title: 'Support', capacity: 1, filledCount: 2 });
  await assert.rejects(role.validate(), /filledCount cannot exceed capacity/);
});

test('attendance derives hours and rejects check-out before check-in', async () => {
  const attendance = new Attendance({ shiftAssignmentId: '507f1f77bcf86cd799439011', volunteerId: '507f1f77bcf86cd799439012', checkIn: '2026-10-01T09:00:00Z', checkOut: '2026-10-01T13:30:00Z' });
  await attendance.validate();
  assert.equal(attendance.hoursLogged, 4.5);
  attendance.checkOut = new Date('2026-10-01T08:59:00Z');
  await assert.rejects(attendance.validate(), /checkOut cannot be before checkIn/);
});
