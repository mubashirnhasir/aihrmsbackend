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
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const employee = await Employee.findById(employeeId).select("-password");
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Structure the response to match the frontend expectations
    const profileData = {
      personalInfo: {
        firstName: employee.name ? employee.name.split(" ")[0] : "",
        lastName: employee.name
          ? employee.name.split(" ").slice(1).join(" ")
          : "",
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        maritalStatus: employee.maritalStatus,
        nationality: employee.nationality,
        address: employee.address?.street || employee.address || "",
        city: employee.address?.city || "",
        state: employee.address?.state || "",
        zipCode: employee.address?.zipCode || "",
        country: employee.address?.country || "",
      },
      contactInfo: {
        email: employee.email,
        phone: employee.phone,
        alternativePhone: employee.alternativePhone,
        workEmail: employee.workEmail,
        linkedinProfile: employee.linkedinProfile,
        skypeId: employee.skypeId,
      },
      emergencyContact: employee.emergencyContact || {},
      bankDetails: employee.bankDetails || {},
      preferences: employee.preferences || {
        language: "en",
        timezone: "",
        theme: "light",
        dateFormat: "MM/dd/yyyy",
        timeFormat: "12h",
        notifications: {
          email: true,
          sms: false,
          push: true,
          leaveRequests: true,
          attendance: true,
          payroll: true,
          announcements: true,
        },
      },
      // Include other basic info
      name: employee.name,
      employeeId: employee.employeeId,
      designation: employee.designation,
      department: employee.department,
      profilePicture: employee.profilePicture,
      joiningDate: employee.joiningDate,
    };

    return res.json(profileData);
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
    const todayString = today.toISOString().split("T")[0];
    const todayAttendance = employee.attendance.find(
      (att) => att.date.toISOString().split("T")[0] === todayString
    );

    // Calculate leave balance
    const currentYear = today.getFullYear();
    const yearlyLeaves = employee.leaveRequests.filter(
      (leave) =>
        new Date(leave.startDate).getFullYear() === currentYear &&
        leave.status === "approved"
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
        profilePicture: employee.profilePicture,
      },
      attendance: {
        today: todayAttendance,
        isCheckedIn: todayAttendance?.clockIn && !todayAttendance?.clockOut,
      },
      leaves: {
        totalAllowed: 24, // Default annual leave
        used: usedLeaves,
        remaining: 24 - usedLeaves,
        pending: employee.leaveRequests.filter(
          (leave) => leave.status === "pending"
        ).length,
      },
      documents: {
        recent: recentDocuments,
        total: employee.documents.length,
      },
      career: {
        skills: employee.skills?.length || 0,
        recommendedSkills: employee.recommendedSkills?.length || 0,
        studyPlans: employee.studyPlans?.length || 0,
      },
    };

    res.status(200).json({
      message: "Dashboard data retrieved successfully",
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error getting employee dashboard:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- updateEmployeeProfile -------------------- */
const updateEmployeeProfile = async (req, res) => {
  try {
    const updateData = req.body;

    // Get employee ID from the authenticated user (set by auth middleware)
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Validate that at least one valid section is provided
    const validSections = [
      "personalInfo",
      "contactInfo",
      "emergencyContact",
      "bankDetails",
      "preferences",
    ];
    const providedSections = Object.keys(updateData);
    const validUpdate = providedSections.some((section) =>
      validSections.includes(section)
    );

    if (!validUpdate) {
      return res.status(400).json({
        message: "At least one valid profile section must be provided",
        validSections,
      });
    }

    // Find the employee by ID from the token
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Build the update object based on the schema structure
    const updateFields = {}; // Handle personalInfo section
    if (updateData.personalInfo) {
      const personalInfo = updateData.personalInfo;

      // Map personalInfo fields to employee schema fields
      if (personalInfo.firstName && personalInfo.lastName) {
        updateFields.name =
          `${personalInfo.firstName} ${personalInfo.lastName}`.trim();
      } else if (personalInfo.firstName) {
        // If only firstName is provided, keep existing lastName if available
        const existingLastName = employee.name
          ? employee.name.split(" ").slice(1).join(" ")
          : "";
        updateFields.name =
          `${personalInfo.firstName} ${existingLastName}`.trim();
      } else if (personalInfo.lastName) {
        // If only lastName is provided, keep existing firstName if available
        const existingFirstName = employee.name
          ? employee.name.split(" ")[0]
          : "";
        updateFields.name =
          `${existingFirstName} ${personalInfo.lastName}`.trim();
      }

      if (personalInfo.dateOfBirth)
        updateFields.dateOfBirth = personalInfo.dateOfBirth;

      // Handle address as nested object
      if (
        personalInfo.address ||
        personalInfo.city ||
        personalInfo.state ||
        personalInfo.postalCode ||
        personalInfo.country
      ) {
        updateFields.address = {
          street:
            personalInfo.address?.street ||
            personalInfo.address ||
            employee.address?.street ||
            "",
          city:
            personalInfo.address?.city ||
            personalInfo.city ||
            employee.address?.city ||
            "",
          state:
            personalInfo.address?.state ||
            personalInfo.state ||
            employee.address?.state ||
            "",
          country:
            personalInfo.address?.country ||
            personalInfo.country ||
            employee.address?.country ||
            "",
          zipCode:
            personalInfo.address?.postalCode ||
            personalInfo.postalCode ||
            personalInfo.address?.zipCode ||
            employee.address?.zipCode ||
            "",
        };
      }

      // Handle phone number
      if (personalInfo.phoneNumber)
        updateFields.phone = personalInfo.phoneNumber;
    }

    // Handle contactInfo section
    if (updateData.contactInfo) {
      const contactInfo = updateData.contactInfo;
      if (contactInfo.email) updateFields.email = contactInfo.email;
      if (contactInfo.phone) updateFields.phone = contactInfo.phone;
    }

    // Handle emergencyContact section
    if (updateData.emergencyContact) {
      const emergencyContact = updateData.emergencyContact;
      updateFields.emergencyContact = {
        name: emergencyContact.name || employee.emergencyContact?.name || "",
        relationship:
          emergencyContact.relationship ||
          employee.emergencyContact?.relationship ||
          "",
        phone: emergencyContact.phone || employee.emergencyContact?.phone || "",
        email: emergencyContact.email || employee.emergencyContact?.email || "",
      };
    }

    // Handle bankDetails section (store as custom field since it's not in the schema)
    if (updateData.bankDetails) {
      // Since bank details aren't in the current schema, we'll store them as a custom field
      updateFields.bankDetails = updateData.bankDetails;
    } // Handle preferences section (store as custom field since it's not in the schema)
    if (updateData.preferences) {
      updateFields.preferences = updateData.preferences;
    }

    // If this is an onboarding completion (multiple sections provided), mark as not first login
    const isOnboardingCompletion =
      providedSections.length >= 3 ||
      (updateData.personalInfo &&
        updateData.emergencyContact &&
        updateData.bankDetails);

    if (isOnboardingCompletion && employee.isFirstLogin) {
      updateFields.isFirstLogin = false;
    }

    // Update the employee
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Profile updated successfully",
      employee: updatedEmployee,
    });
  } catch (err) {
    console.error("updateEmployeeProfile →", err);

    // Handle validation errors
    if (err.name === "ValidationError") {
      const validationErrors = Object.values(err.errors).map((error) => ({
        field: error.path,
        message: error.message,
      }));
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        message: `${duplicateField} already exists`,
      });
    }

    return res.status(500).json({ message: err.message });
  }
};

const getEmployeeAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const employee = await Employee.findById(req.user.id).select(
      "attendance name employeeId"
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    let attendanceData = employee.attendance;

    // Filter by month/year if provided
    if (month && year) {
      attendanceData = attendanceData.filter((att) => {
        const attDate = new Date(att.date);
        return (
          attDate.getMonth() === parseInt(month) - 1 &&
          attDate.getFullYear() === parseInt(year)
        );
      });
    }

    res.status(200).json({
      message: "Attendance data retrieved successfully",
      attendance: attendanceData,
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
    const todayString = today.toISOString().split("T")[0];

    // Check if already clocked in today
    const existingAttendance = employee.attendance.find(
      (att) => att.date.toISOString().split("T")[0] === todayString
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
        status: "present",
      });
    }

    await employee.save();

    res.status(200).json({
      message: "Clocked in successfully",
      clockIn: today,
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
    const todayString = today.toISOString().split("T")[0];

    const todayAttendance = employee.attendance.find(
      (att) => att.date.toISOString().split("T")[0] === todayString
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
      totalHours: todayAttendance.totalHours,
    });
  } catch (error) {
    console.error("Error clocking out:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getEmployeeLeaves = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select(
      "leaveRequests casualLeaves sickLeaves earnedLeaves unpaidLeaves name employeeId"
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    console.log(
      `📋 Fetching leaves for employee: ${employee.name} (${employee.employeeId})`
    );
    console.log(
      `📋 Leave requests count: ${employee.leaveRequests?.length || 0}`
    );

    if (employee.leaveRequests?.length > 0) {
      console.log(
        "📋 Recent leave requests:",
        employee.leaveRequests.slice(-2)
      );
    }

    res.status(200).json({
      message: "Leave data retrieved successfully",
      casualLeaves: employee.casualLeaves || 1,
      sickLeaves: employee.sickLeaves || 2,
      earnedLeaves: employee.earnedLeaves || 1,
      unpaidLeaves: employee.unpaidLeaves || 0,
      leaveRequests: employee.leaveRequests || [],
    });
  } catch (error) {
    console.error("Error getting employee leaves:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const requestLeave = async (req, res) => {
  try {
    const {
      type,
      startDate,
      endDate,
      reason,
      halfDay,
      halfDayType,
      emergencyContact,
    } = req.body;

    console.log("📝 Leave request received:", {
      type,
      startDate,
      endDate,
      reason,
    });
    console.log("📝 User ID from token:", req.user.id);

    // Validate required fields only
    const errors = [];
    if (!type) errors.push("Leave type is required");
    if (!startDate) errors.push("Start date is required");
    if (!endDate) errors.push("End date is required");
    if (!reason) errors.push("Reason is required");

    if (errors.length > 0) {
      console.log("❌ Validation errors:", errors);
      return res.status(400).json({
        message: errors.join(", "),
        errors: errors,
      });
    }
    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    console.log(
      `📝 Creating leave request for employee: ${employee.name} (${employee.employeeId})`
    );

    const leaveRequest = {
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      halfDay: halfDay || false,
      halfDayType: halfDayType || null,
      emergencyContact: emergencyContact || null,
      status: "pending",
      appliedOn: new Date(),
    };

    console.log("📝 Leave request data:", leaveRequest);

    employee.leaveRequests.push(leaveRequest);
    await employee.save();

    console.log(
      `✅ Leave request saved. Total requests: ${employee.leaveRequests.length}`
    );

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveRequest,
    });
  } catch (error) {
    console.error("Error requesting leave:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getEmployeeDocuments = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select(
      "documents name employeeId"
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // For demonstration purposes, return dummy documents if the employee has no documents
    let documents = employee.documents || [];

    // If no documents exist, provide dummy data for demonstration
    if (documents.length === 0) {
      documents = [
        {
          _id: "dummy_1",
          filename: "Offer_Letter_2024.pdf",
          name: "Offer Letter 2024",
          category: "contracts",
          fileType: "application/pdf",
          fileSize: 245760,
          url: "/dummy/offer-letter-2024.pdf",
          uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          description:
            "Official job offer letter containing terms and conditions of employment",
        },
        {
          _id: "dummy_2",
          filename: "Payslip_December_2024.pdf",
          name: "December 2024 Payslip",
          category: "payroll",
          fileType: "application/pdf",
          fileSize: 156432,
          url: "/dummy/payslip-dec-2024.pdf",
          uploadedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          description: "Monthly salary slip for December 2024",
        },
        {
          _id: "dummy_3",
          filename: "Employee_Handbook_2024.pdf",
          name: "Employee Handbook",
          category: "training",
          fileType: "application/pdf",
          fileSize: 2048000,
          url: "/dummy/employee-handbook-2024.pdf",
          uploadedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          description:
            "Complete guide to company policies, procedures, and benefits",
        },
        {
          _id: "dummy_4",
          filename: "Resume_John_Doe.pdf",
          name: "My Resume",
          category: "personal",
          fileType: "application/pdf",
          fileSize: 389120,
          url: "/dummy/resume-john-doe.pdf",
          uploadedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
          description:
            "Professional resume with work experience and qualifications",
        },
        {
          _id: "dummy_5",
          filename: "Tax_Certificate_2024.pdf",
          name: "2024 Tax Certificate",
          category: "certificates",
          fileType: "application/pdf",
          fileSize: 198540,
          url: "/dummy/tax-certificate-2024.pdf",
          uploadedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          description:
            "Annual tax deduction certificate for financial year 2024",
        },
        {
          _id: "dummy_6",
          filename: "ID_Card_Copy.jpg",
          name: "Employee ID Card",
          category: "personal",
          fileType: "image/jpeg",
          fileSize: 756890,
          url: "/dummy/id-card-copy.jpg",
          uploadedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
          description: "Copy of official employee identification card",
        },
        {
          _id: "dummy_7",
          filename: "Training_Certificate_Leadership.pdf",
          name: "Leadership Training Certificate",
          category: "training",
          fileType: "application/pdf",
          fileSize: 445632,
          url: "/dummy/leadership-cert.pdf",
          uploadedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          description:
            "Certificate of completion for leadership development program",
        },
        {
          _id: "dummy_8",
          filename: "Performance_Review_2024.pdf",
          name: "Annual Performance Review 2024",
          category: "professional",
          fileType: "application/pdf",
          fileSize: 523984,
          url: "/dummy/performance-review-2024.pdf",
          uploadedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000), // 75 days ago
          description:
            "Annual performance evaluation and goal setting document",
        },
      ];
    }

    // Get unique categories
    const categories = [...new Set(documents.map((doc) => doc.category))];

    res.status(200).json({
      message: "Documents retrieved successfully",
      documents: documents,
      categories: categories,
    });
  } catch (error) {
    console.error("Error getting employee documents:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const uploadDocument = async (req, res) => {
  try {
    // For demonstration purposes, we'll simulate file upload
    // In a real implementation, you'd use multer or similar middleware
    const { body } = req;

    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Simulate file upload - in reality this would be handled by multer
    const fileName = `uploaded_document_${Date.now()}.pdf`;
    const fileSize = Math.floor(Math.random() * 1000000) + 100000;
    const category = body.category || "general";

    const document = {
      _id: new Date().getTime().toString(), // Generate simple ID
      filename: fileName,
      name: fileName.split(".")[0].replace(/_/g, " "),
      category: category,
      fileType: "application/pdf",
      fileSize: fileSize,
      url: `/uploads/${fileName}`,
      uploadedAt: new Date(),
      description: `User uploaded ${fileName}`,
      status: "pending",
    };

    // Initialize documents array if it doesn't exist
    if (!employee.documents) {
      employee.documents = [];
    }

    employee.documents.push(document);
    await employee.save();
    res.status(201).json({
      message: "Document uploaded successfully",
      document,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const employee = await Employee.findById(req.user.id).select(
      "documents name employeeId"
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // For dummy documents, create a simple PDF content
    const dummyDocuments = {
      dummy_1: {
        filename: "Offer_Letter_2024.pdf",
        content: Buffer.from(
          "This is a dummy offer letter document for demonstration purposes."
        ),
        mimeType: "application/pdf",
      },
      dummy_2: {
        filename: "Payslip_December_2024.pdf",
        content: Buffer.from(
          "This is a dummy payslip document for demonstration purposes."
        ),
        mimeType: "application/pdf",
      },
      dummy_3: {
        filename: "Employee_Handbook_2024.pdf",
        content: Buffer.from(
          "This is a dummy employee handbook document for demonstration purposes."
        ),
        mimeType: "application/pdf",
      },
      dummy_4: {
        filename: "Resume_John_Doe.pdf",
        content: Buffer.from(
          "This is a dummy resume document for demonstration purposes."
        ),
        mimeType: "application/pdf",
      },
      dummy_5: {
        filename: "Tax_Certificate_2024.pdf",
        content: Buffer.from(
          "This is a dummy tax certificate document for demonstration purposes."
        ),
        mimeType: "application/pdf",
      },
      dummy_6: {
        filename: "ID_Card_Copy.jpg",
        content: Buffer.from(
          "This is a dummy image file for demonstration purposes."
        ),
        mimeType: "image/jpeg",
      },
      dummy_7: {
        filename: "Training_Certificate_Leadership.pdf",
        content: Buffer.from(
          "This is a dummy training certificate document for demonstration purposes."
        ),
        mimeType: "application/pdf",
      },
      dummy_8: {
        filename: "Performance_Review_2024.pdf",
        content: Buffer.from(
          "This is a dummy performance review document for demonstration purposes."
        ),
        mimeType: "application/pdf",
      },
    };

    const document = dummyDocuments[documentId];

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Set appropriate headers for file download
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.filename}"`
    );
    res.setHeader("Content-Length", document.content.length);

    // Send the file content
    res.send(document.content);
  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────── onboarding functions ───────────────────────── */
const createEmployeeOnboarding = async (req, res) => {
  try {
    // Temporarily use a test employee ID for testing
    const employeeId = req.user?.id || "673d6bbc8b21b1c02b0797f0";

    console.log("🎯 Onboarding request received for employee:", employeeId);

    // For testing - if no user auth, create a test employee first
    if (!req.user?.id) {
      console.log("🧪 Test mode - creating test employee if not exists");
      let testEmployee = await Employee.findById(employeeId);
      if (!testEmployee) {
        testEmployee = new Employee({
          _id: employeeId,
          name: "Test Employee",
          email: "test@example.com",
          employeeId: "EMP001",
          password: "hashed_password",
        });
        await testEmployee.save();
        console.log("✅ Test employee created");
      }
    }

    const {
      personalInfo,
      address,
      previousEmployment,
      bankDetails,
      familyDetails,
      documentAttachments,
    } = req.body;

    // Validate required fields
    if (
      !personalInfo ||
      !personalInfo.firstName ||
      !personalInfo.lastName ||
      !personalInfo.email
    ) {
      return res.status(400).json({
        message:
          "Required personal information missing (firstName, lastName, email)",
      });
    }

    // Find the employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Update employee with onboarding data
    const updateData = {
      // Personal Info
      name: `${personalInfo.firstName} ${personalInfo.lastName}`,
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      email: personalInfo.email,
      phone: personalInfo.phone,
      dateOfBirth: personalInfo.dateOfBirth,
      gender: personalInfo.gender,
      nationality: personalInfo.nationality,

      // Address
      address: {
        street: address?.presentAddress || "",
        city: address?.city || "",
        state: address?.state || "",
        zipCode: address?.postalCode || "",
        country: address?.country || "",
      },

      // Previous Employment
      previousEmployment: previousEmployment || [],

      // Bank Details
      bankDetails: {
        accountNumber: bankDetails?.accountNumber || "",
        bankName: bankDetails?.bankName || "",
        ifscCode: bankDetails?.ifscCode || "",
        panNumber: bankDetails?.panNumber || "",
        aadharNumber: bankDetails?.aadharNumber || "",
        pfNumber: bankDetails?.pfNumber || "",
        esiNumber: bankDetails?.esiNumber || "",
      },

      // Family Details
      familyDetails: familyDetails || [],

      // Document Attachments
      documentAttachments: documentAttachments || [],

      // Mark onboarding as completed
      onboardingCompleted: true,
      onboardingCompletedDate: new Date(),
    };

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Onboarding completed successfully",
      employee: {
        id: updatedEmployee._id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        onboardingCompleted: updatedEmployee.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("Error in createEmployeeOnboarding:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getEmployeeOnboardingStatus = async (req, res) => {
  try {
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const employee = await Employee.findById(employeeId).select(
      "onboardingCompleted onboardingCompletedDate name email"
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      onboardingCompleted: employee.onboardingCompleted || false,
      onboardingCompletedDate: employee.onboardingCompletedDate,
      employeeName: employee.name,
      employeeEmail: employee.email,
    });
  } catch (error) {
    console.error("Error in getEmployeeOnboardingStatus:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
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
  uploadDocument,
  downloadDocument,
  createEmployeeOnboarding,
  getEmployeeOnboardingStatus,
};
