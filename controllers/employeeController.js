// controllers/employeeController.js
require("dotenv").config();
const crypto = require("crypto");
const { Configuration, OpenAIApi } = require("openai");
const Employee = require("../models/employeeSchema");
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});
/* ───────────────────────── helpers ───────────────────────── */
const shaSig = (arr) =>
  crypto.createHash("sha1").update(arr.sort().join("|")).digest("hex");

const yearsSince = (d) =>
  d ? Math.floor((Date.now() - new Date(d)) / 3.154e10) : 0;

/* ───────────────────────── handlers ──────────────────────── */
const getEmployeeProfile = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name)
      return res.status(400).json({ message: "Employee name is required" });

    const emp = await Employee.findOne({ name });
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    return res.json(emp);
  } catch (err) {
    console.error("getEmployeeProfile →", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ---------------- updateRecommendedSkills ------------------ */
const updateRecommendedSkills = async (req, res) => {
  try {
    const { name, recommendedSkills } = req.body;
    const emp = await Employee.findOneAndUpdate(
      { name },
      { $set: { recommendedSkills } },
      { new: true }
    );
    return res.json(emp);
  } catch (err) {
    console.error("updateRecommendedSkills →", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ---------------- markModuleComplete ----------------------- */
const markModuleComplete = async (req, res) => {
  try {
    const { name, skillName, moduleTitle } = req.body;
    if (!name || !skillName || !moduleTitle)
      return res
        .status(400)
        .json({ message: "name, skillName, moduleTitle are required" });

    const employee = await Employee.findOne({ name });
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const decodedSkill = decodeURIComponent(skillName);
    const planIdx = employee.studyPlans.findIndex(
      (sp) => decodeURIComponent(sp.skillName) === decodedSkill
    );
    if (planIdx === -1)
      return res
        .status(404)
        .json({ message: "Study plan not found for skill" });

    /* toggle the module */
    const modules = employee.studyPlans[planIdx].modules.map((m) =>
      m.title.trim().toLowerCase() === moduleTitle.trim().toLowerCase()
        ? { ...m, completed: !m.completed }
        : m
    );
    employee.studyPlans[planIdx].modules = modules;

    /* check if ALL modules are completed */
    const allComplete = modules.every((m) => m.completed);

    if (allComplete) {
      /* ① move skill to currentSkills if not already there */
      const already = employee.skills.some((s) => s.name === decodedSkill);
      if (!already) {
        employee.skills.push({ name: decodedSkill, level: "Beginner" });
      }

      /* ② remove from recommendedSkills */
      employee.recommendedSkills = employee.recommendedSkills.filter(
        (r) => r.name !== decodedSkill
      );

      /* ③ remove the studyPlan entry */
      employee.studyPlans.splice(planIdx, 1);
    }

    await employee.save();
    return res.json({
      message: allComplete
        ? "Skill completed & moved to current skills."
        : "Module toggled.",
      allComplete,
    });
  } catch (err) {
    console.error("markModuleComplete →", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ---------------- saveStudyPlan ---------------------------- */
const saveStudyPlan = async (req, res) => {
  try {
    const { name, skillName, modules } = req.body;
    const emp = await Employee.findOne({ name });
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    emp.studyPlans = emp.studyPlans.filter((sp) => sp.skillName !== skillName);
    emp.studyPlans.push({ skillName, modules });
    await emp.save();
    return res.json({ message: "Study plan saved." });
  } catch (err) {
    console.error("saveStudyPlan →", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ---------------- generateCareerPath ------------------------ */
const generateCareerPath = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res.status(400).json({ message: "Employee name required" });

    const emp = await Employee.findOne({ name });
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    const skills = (emp.skills || []).map((s) => s.name);
    const yoe = yearsSince(emp.joiningDate);
    const sig = shaSig(skills); // cache key

    /* cached? */
    const cached = (emp.careerPaths || []).find(
      (c) => c.skillsSignature === sig
    );
    if (cached) return res.json({ options: cached.options, source: "cache" });

    /* stub when no GPT key */
    if (!process.env.OPENAI_API_KEY) {
      const stub = [
        `Senior ${emp.designation}`,
        `Lead ${emp.designation}`,
        `Principal ${emp.designation}`,
      ];
      emp.careerPaths.push({ skillsSignature: sig, options: stub });
      await emp.save();
      return res.json({ options: stub, source: "stub" });
    }

    /* GPT */
    const prompt = `You are a career coach AI.
Employee role: ${emp.designation}.
Years of experience: ${yoe}.
Current skills: ${skills.join(", ")}.
Suggest three logical next career roles, from closest to most ambitious.
Return ONLY a JSON array of strings.`;

    const gpt = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const options = JSON.parse(
      gpt.choices[0].message.content.replace(/```json|```/g, "").trim()
    );

    emp.careerPaths.push({ skillsSignature: sig, options });
    await emp.save();
    res.json({ options, source: "openai" });
  } catch (err) {
    console.error("generateCareerPath →", err);
    res.status(500).json({ message: err.message });
  }
};

/* ───────────────────────── helper for roadmap ───────────────────────── */
async function computeCareerPath(emp) {
  const skills = (emp.skills || []).map((s) => s.name);
  const sig = shaSig(skills);

  const cached = (emp.careerPaths || []).find((c) => c.skillsSignature === sig);
  if (cached) return cached.options;

  if (!process.env.OPENAI_API_KEY) {
    const stub = [
      `Senior ${emp.designation}`,
      `Lead ${emp.designation}`,
      `Principal ${emp.designation}`,
    ];
    emp.careerPaths.push({ skillsSignature: sig, options: stub });
    await emp.save();
    return stub;
  }

  const prompt = `You are a career coach AI.
Suggest three logical next career roles for a "${emp.designation}".
Return ONLY a JSON array of strings.`;

  const gpt = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const options = JSON.parse(
    gpt.choices[0].message.content.replace(/```json|```/g, "").trim()
  );

  emp.careerPaths.push({ skillsSignature: sig, options });
  await emp.save();
  return options;
}

/* ─────────────────────────── roadmap endpoint ───────────────────────── */
const generateRoadmap = async (req, res) => {
  try {
    const { name, role: explicitRole } = req.body;
    if (!name)
      return res.status(400).json({ message: "Employee name required" });

    const emp = await Employee.findOne({ name });
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    const skills = (emp.skills || []).map((s) => s.name);
    const yoe = yearsSince(emp.joiningDate);

    /* choose role */
    let role = explicitRole?.trim();
    if (!role) {
      const [first] = await computeCareerPath(emp);
      role = first;
    }

    /* cached roadmap? */
    let roadmap = (emp.roadmaps || []).find(
      (r) => r.role.toLowerCase() === role.toLowerCase()
    );
    if (roadmap) return res.json(roadmap);

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(503)
        .json({ message: "OpenAI key missing – cannot generate roadmap" });
    }

    /* prompt */
    const prompt = `You are an AI career-coach writing content for a web card.

Context
- Target next role: "${role}"
- Employee experience: ${yoe} years
- Current skills: ${skills.join(", ")}

Task
Create a concise 4-tier technical roadmap to reach "${role}".
Tiers (in order): Foundation, Growth, Specialisation, Leadership.

Output (JSON only):
{
  "role":"${role}",
  "tiers":[
    {"title":"Foundation","bullets":["💻 <one actionable technical step>"]},
    {"title":"Growth","bullets":["🚀 <one actionable technical step>"]},
    {"title":"Specialisation","bullets":["🔧 <one actionable technical step>"]},
    {"title":"Leadership","bullets":["📊 <one actionable technical step>"]}
  ]
}

Rules
- Exactly one bullet per tier (≤ 12 words).
- Bullet starts with an emoji.
- No markdown fences, no extra keys.`;

    const gpt = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    roadmap = JSON.parse(
      gpt.choices[0].message.content.replace(/```json|```/g, "").trim()
    );

    if (!roadmap?.tiers || roadmap.tiers.length !== 4)
      return res.status(500).json({ message: "GPT returned invalid roadmap" });

    emp.roadmaps.push(roadmap);
    await emp.save();
    res.json(roadmap);
  } catch (err) {
    console.error("generateRoadmap →", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────── exports ─────────────────────────────────── */
module.exports = {
  getEmployeeProfile,
  updateRecommendedSkills,
  markModuleComplete,
  saveStudyPlan,
  generateCareerPath,
  generateRoadmap,
};
