import { Role, Volunteer } from '../models/index.js';

const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const clock = date => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export function scoreMatch(volunteer, role, event) {
  const have = new Set((volunteer.skills || []).map(x => String(x._id ?? x)));
  const required = (role.requiredSkills || []).map(x => String(x._id ?? x));
  const skillScore = required.length ? Math.round(100 * required.filter(id => have.has(id)).length / required.length) : 100;
  const windows = volunteer.availability || [];
  const start = new Date(event.startDate), end = new Date(event.endDate);
  const overlappingDays = new Set();
  for (let day = new Date(start); day <= end && overlappingDays.size < 7; day.setDate(day.getDate() + 1)) overlappingDays.add(weekday[day.getDay()]);
  const availabilityScore = windows.some(w => overlappingDays.has(w.day) && w.startTime <= clock(start) && w.endTime >= clock(end)) ? 100 : 0;
  const score = Math.round(skillScore * 0.7 + availabilityScore * 0.3);
  const missing = required.filter(id => !have.has(id)).length;
  const explanation = `Skills match ${skillScore}% (${required.length - missing}/${required.length} required); schedule availability ${availabilityScore ? 'matches' : 'does not fully match'}; weighted score ${score}%.`;
  return { volunteerId: volunteer._id, roleId: role._id, score, skillScore, availabilityScore, explanation };
}

export async function recommendRoles(volunteerId) {
  const volunteer = await Volunteer.findById(volunteerId).populate('skills');
  if (!volunteer) throw new Error('Volunteer not found');
  const roles = await Role.find({ isActive: true, $expr: { $lt: ['$filledCount', '$capacity'] } }).populate('eventId').populate('requiredSkills');
  return roles.filter(r => r.eventId?.status === 'open').map(r => scoreMatch(volunteer, r, r.eventId)).sort((a, b) => b.score - a.score);
}
