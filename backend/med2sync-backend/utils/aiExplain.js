/**
 * Generates a short, human-readable explanation of why a volunteer is (or isn't)
 * a good fit for an opportunity.
 *
 * If ENABLE_AI_EXPLANATIONS is not "true" (or the API call fails for any reason),
 * this falls back to a template string so the feature never breaks the core flow.
 * This means the matching engine (utils/matchingEngine.js) always works even
 * without an API key configured; the AI layer is a pure enhancement on top.
 */

const enabled = process.env.ENABLE_AI_EXPLANATIONS === 'true';
let anthropic = null;

if (enabled) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function explainMatch({
  volunteerName,
  specialization,
  skillNames,
  opportunityTitle,
  requiredSkillNames,
  score,
}) {
  const fallback = `${volunteerName} matches ${Math.round(score * 100)}% of the required skills for "${opportunityTitle}".`;

  if (!enabled || !anthropic) return fallback;

  try {
    const prompt = `Volunteer: ${volunteerName}, specialization: ${specialization || 'N/A'}, skills: ${
      skillNames.join(', ') || 'none listed'
    }.
Opportunity: "${opportunityTitle}", required skills: ${requiredSkillNames.join(', ') || 'none specified'}.
Match score: ${score} (0 to 1 scale).
In one short sentence, explain why this volunteer is or isn't a good fit for this opportunity.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content && response.content[0] && response.content[0].text;
    return text ? text.trim() : fallback;
  } catch (err) {
    console.error('AI explanation failed, using fallback:', err.message);
    return fallback;
  }
}

module.exports = { explainMatch };
