/**
 * Rule-based matching engine.
 *
 * Scores how well a volunteer fits an opportunity based on:
 *   1. Skill overlap  (70% weight) - what fraction of required skills the volunteer has
 *   2. Availability   (30% weight) - a simple heuristic based on how many days/slots
 *                                    the volunteer has marked as available
 *
 * This is intentionally deterministic and explainable (good for a viva walkthrough),
 * and is then optionally enriched with a natural-language explanation from an LLM
 * via utils/aiExplain.js.
 */

function skillOverlapScore(volunteerSkillIds, requiredSkillIds) {
  if (!requiredSkillIds.length) return 1; // opportunity has no specific skill requirement
  const reqSet = new Set(requiredSkillIds.map((id) => id.toString()));
  const volSet = new Set(volunteerSkillIds.map((id) => id.toString()));
  let matched = 0;
  reqSet.forEach((id) => {
    if (volSet.has(id)) matched += 1;
  });
  return matched / reqSet.size; // 0..1
}

function availabilityOverlapScore(volunteerAvailability) {
  if (!volunteerAvailability || !volunteerAvailability.length) return 0.3;
  const uniqueDays = new Set(volunteerAvailability.map((slot) => slot.day));
  return Math.min(1, 0.3 + uniqueDays.size * 0.15);
}

function computeMatchScore({ volunteerSkills, volunteerAvailability, requiredSkills }) {
  const skillScore = skillOverlapScore(volunteerSkills, requiredSkills);
  const availabilityScore = availabilityOverlapScore(volunteerAvailability);
  const finalScore = skillScore * 0.7 + availabilityScore * 0.3;

  return {
    score: Math.round(finalScore * 100) / 100,
    skillScore: Math.round(skillScore * 100) / 100,
    availabilityScore: Math.round(availabilityScore * 100) / 100,
  };
}

module.exports = { computeMatchScore, skillOverlapScore, availabilityOverlapScore };
