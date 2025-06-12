const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const Employee = require("../models/employeeSchema");

/**
 * Mock ML prediction logic (replace with actual ML model integration)
 */
function predictEmployeeRetention(employeeData) {
  let riskScore = 0;

  // Job satisfaction factor (0-10 scale, lower = higher risk)
  if (employeeData.jobSatisfaction <= 3) riskScore += 30;
  else if (employeeData.jobSatisfaction <= 6) riskScore += 15;
  else if (employeeData.jobSatisfaction <= 8) riskScore += 5;

  // Engagement level factor (0-10 scale, lower = higher risk)
  if (employeeData.engagementLevel <= 3) riskScore += 25;
  else if (employeeData.engagementLevel <= 6) riskScore += 12;
  else if (employeeData.engagementLevel <= 8) riskScore += 3;

  // Tenure factor (years)
  if (employeeData.tenure < 1) riskScore += 20;
  else if (employeeData.tenure < 2) riskScore += 10;
  else if (employeeData.tenure > 5) riskScore += 5;

  // Work-life balance factor
  if (employeeData.workLifeBalance <= 3) riskScore += 15;
  else if (employeeData.workLifeBalance <= 6) riskScore += 8;

  // Salary satisfaction factor
  if (employeeData.salarySatisfaction <= 3) riskScore += 20;
  else if (employeeData.salarySatisfaction <= 6) riskScore += 10;

  // Career growth opportunities
  if (employeeData.careerGrowth <= 3) riskScore += 15;
  else if (employeeData.careerGrowth <= 6) riskScore += 7;

  // Manager relationship
  if (employeeData.managerRelationship <= 3) riskScore += 12;
  else if (employeeData.managerRelationship <= 6) riskScore += 6;

  // Recent performance reviews
  if (employeeData.performanceScore <= 3) riskScore += 10;

  // Determine risk level
  let riskLevel = "Low";
  if (riskScore >= 60) riskLevel = "High";
  else if (riskScore >= 30) riskLevel = "Medium";

  // Calculate retention probability (inverse of risk)
  const retentionProbability = Math.max(0, Math.min(100, 100 - riskScore));

  return {
    riskLevel,
    riskScore,
    retentionProbability,
    recommendations: generateRecommendations(riskLevel, employeeData)
  };
}

/**
 * Generate recommendations based on risk level and employee data
 */
function generateRecommendations(riskLevel, employeeData) {
  const recommendations = [];

  if (employeeData.jobSatisfaction <= 5) {
    recommendations.push("Schedule one-on-one meetings to discuss job satisfaction");
  }
  
  if (employeeData.careerGrowth <= 5) {
    recommendations.push("Provide career development opportunities and training");
  }
  
  if (employeeData.workLifeBalance <= 5) {
    recommendations.push("Review workload and consider flexible working arrangements");
  }
  
  if (employeeData.salarySatisfaction <= 5) {
    recommendations.push("Review compensation package and benefits");
  }
  
  if (employeeData.managerRelationship <= 5) {
    recommendations.push("Manager training on employee engagement and communication");
  }

  if (riskLevel === "High") {
    recommendations.push("Immediate retention intervention required");
    recommendations.push("Consider retention bonus or promotion opportunities");
  }

  return recommendations;
}

/**
 * Predict employee retention risk
 */
const predictRetention = async (req, res) => {
  try {
    const employeeData = req.body;

    // Validate required fields
    const requiredFields = [
      'jobSatisfaction', 'engagementLevel', 'tenure', 'workLifeBalance',
      'salarySatisfaction', 'careerGrowth', 'managerRelationship', 'performanceScore'
    ];

    for (const field of requiredFields) {
      if (employeeData[field] === undefined || employeeData[field] === null) {
        throw new ApiError(400, `Missing required field: ${field}`);
      }
    }

    const prediction = predictEmployeeRetention(employeeData);

    return res.status(200).json(new ApiResponse(
      200,
      prediction,
      "Employee retention prediction completed successfully"
    ));

  } catch (error) {
    console.error('Prediction Error:', error);
    throw new ApiError(500, "Failed to predict employee retention", error);
  }
};

/**
 * Get analytics data for employee retention
 */
const getAnalytics = async (req, res) => {
  try {
    // Mock analytics data - replace with actual data from your database
    const analytics = {
      totalEmployees: 150,
      atRiskEmployees: 23,
      highRiskEmployees: 8,
      mediumRiskEmployees: 15,
      lowRiskEmployees: 127,
      retentionRate: 84.7,
      averageTenure: 3.2,
      departmentBreakdown: {
        Engineering: { total: 60, atRisk: 8 },
        Sales: { total: 40, atRisk: 7 },
        Marketing: { total: 25, atRisk: 4 },
        HR: { total: 15, atRisk: 2 },
        Finance: { total: 10, atRisk: 2 }
      },
      riskFactors: {
        lowJobSatisfaction: 12,
        poorWorkLifeBalance: 18,
        limitedCareerGrowth: 15,
        salaryDissatisfaction: 9,
        managerIssues: 6
      },
      monthlyTrends: [
        { month: 'Jan', atRisk: 20, turnover: 2 },
        { month: 'Feb', atRisk: 22, turnover: 3 },
        { month: 'Mar', atRisk: 25, turnover: 1 },
        { month: 'Apr', atRisk: 23, turnover: 4 },
        { month: 'May', atRisk: 21, turnover: 2 },
        { month: 'Jun', atRisk: 23, turnover: 3 }
      ]
    };

    return res.status(200).json(new ApiResponse(
      200,
      analytics,
      "Analytics data retrieved successfully"
    ));

  } catch (error) {
    console.error('Analytics Error:', error);
    throw new ApiError(500, "Failed to retrieve analytics data", error);
  }
};

module.exports = {
  predictRetention,
  getAnalytics
};
