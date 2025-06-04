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

// Employee Portal Methods
const getEmployeeDashboard = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select("-password");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Get today's attendance
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const todayAttendance = employee.attendance.find(
      att => att.date.toISOString().split('T')[0] === todayString
    );

    // Calculate leave balance
    const currentYear = today.getFullYear();
    const yearlyLeaves = employee.leaveRequests.filter(
      leave => new Date(leave.startDate).getFullYear() === currentYear && leave.status === 'approved'
    );
    const usedLeaves = yearlyLeaves.reduce((total, leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return total + diffDays;
    }, 0);

    // Get recent documents (last 5)
    const recentDocuments = employee.documents
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
      .slice(0, 5);

    const dashboardData = {
      employee: {
        name: employee.name,
        employeeId: employee.employeeId,
        designation: employee.designation,
        department: employee.department,
        email: employee.email,
        profilePicture: employee.profilePicture
      },
      attendance: {
        today: todayAttendance,
        isCheckedIn: todayAttendance?.clockIn && !todayAttendance?.clockOut
      },
      leaves: {
        totalAllowed: 24, // Default annual leave
        used: usedLeaves,
        remaining: 24 - usedLeaves,
        pending: employee.leaveRequests.filter(leave => leave.status === 'pending').length
      },
      documents: {
        recent: recentDocuments,
        total: employee.documents.length
      },
      career: {
        skills: employee.skills?.length || 0,
        recommendedSkills: employee.recommendedSkills?.length || 0,
        studyPlans: employee.studyPlans?.length || 0
      }
    };

    res.status(200).json({
      message: "Dashboard data retrieved successfully",
      data: dashboardData
    });

  } catch (error) {
    console.error("Error getting employee dashboard:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateEmployeeProfile = async (req, res) => {
  try {
    const {
      personalInfo,
      contactInfo,
      emergencyContact,
      bankDetails,
      preferences
    } = req.body;

    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Update allowed fields
    if (personalInfo) {
      employee.personalInfo = { ...employee.personalInfo, ...personalInfo };
    }
    if (contactInfo) {
      employee.contactInfo = { ...employee.contactInfo, ...contactInfo };
    }
    if (emergencyContact) {
      employee.emergencyContact = { ...employee.emergencyContact, ...emergencyContact };
    }
    if (bankDetails) {
      employee.bankDetails = { ...employee.bankDetails, ...bankDetails };
    }
    if (preferences) {
      employee.preferences = { ...employee.preferences, ...preferences };
    }

    await employee.save();

    res.status(200).json({
      message: "Profile updated successfully",
      employee: employee
    });

  } catch (error) {
    console.error("Error updating employee profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getEmployeeAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const employee = await Employee.findById(req.user.id).select("attendance name employeeId");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    let attendanceData = employee.attendance;

    // Filter by month/year if provided
    if (month && year) {
      attendanceData = attendanceData.filter(att => {
        const attDate = new Date(att.date);
        return attDate.getMonth() === parseInt(month) - 1 && attDate.getFullYear() === parseInt(year);
      });
    }

    res.status(200).json({
      message: "Attendance data retrieved successfully",
      attendance: attendanceData
    });

  } catch (error) {
    console.error("Error getting employee attendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const clockIn = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Check if already clocked in today
    const existingAttendance = employee.attendance.find(
      att => att.date.toISOString().split('T')[0] === todayString
    );

    if (existingAttendance && existingAttendance.clockIn) {
      return res.status(400).json({ message: "Already clocked in today" });
    }

    if (existingAttendance) {
      existingAttendance.clockIn = today;
    } else {
      employee.attendance.push({
        date: today,
        clockIn: today,
        status: 'present'
      });
    }

    await employee.save();

    res.status(200).json({
      message: "Clocked in successfully",
      clockIn: today
    });

  } catch (error) {
    console.error("Error clocking in:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const clockOut = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const todayAttendance = employee.attendance.find(
      att => att.date.toISOString().split('T')[0] === todayString
    );

    if (!todayAttendance || !todayAttendance.clockIn) {
      return res.status(400).json({ message: "Please clock in first" });
    }

    if (todayAttendance.clockOut) {
      return res.status(400).json({ message: "Already clocked out today" });
    }

    todayAttendance.clockOut = today;
    
    // Calculate total hours
    const clockIn = new Date(todayAttendance.clockIn);
    const clockOut = today;
    const totalHours = (clockOut - clockIn) / (1000 * 60 * 60);
    todayAttendance.totalHours = Math.round(totalHours * 100) / 100;

    await employee.save();

    res.status(200).json({
      message: "Clocked out successfully",
      clockOut: today,
      totalHours: todayAttendance.totalHours
    });

  } catch (error) {
    console.error("Error clocking out:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getEmployeeLeaves = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select("leaveRequests name employeeId");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Leave requests retrieved successfully",
      leaves: employee.leaveRequests
    });

  } catch (error) {
    console.error("Error getting employee leaves:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const requestLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason, halfDay } = req.body;

    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const leaveRequest = {
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      halfDay: halfDay || false,
      status: 'pending',
      appliedDate: new Date()
    };

    employee.leaveRequests.push(leaveRequest);
    await employee.save();

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveRequest
    });

  } catch (error) {
    console.error("Error requesting leave:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getEmployeeDocuments = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select("documents name employeeId");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Documents retrieved successfully",
      documents: employee.documents
    });

  } catch (error) {
    console.error("Error getting employee documents:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const { name, type, category, fileUrl } = req.body;

    if (!name || !type || !category || !fileUrl) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const document = {
      name,
      type,
      category,
      fileUrl,
      uploadDate: new Date()
    };

    employee.documents.push(document);
    await employee.save();

    res.status(201).json({
      message: "Document uploaded successfully",
      document
    });

  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ message: "Server error" });
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
  getEmployeeDashboard,
  updateEmployeeProfile,
  getEmployeeAttendance,
  clockIn,
  clockOut,
  getEmployeeLeaves,
  requestLeave,
  getEmployeeDocuments,
  uploadDocument
};
