const jwt = require("jsonwebtoken");

// Test submitting a leave request
async function testLeaveRequest() {
  try {
    // Get a valid token (you may need to update this with a real token from your login)
    const token = "your_actual_token_here"; // Replace with actual token

    const leaveData = {
      type: "sick",
      startDate: "2025-06-10",
      endDate: "2025-06-11",
      reason: "Medical appointment and recovery",
      halfDay: false,
    };

    const response = await fetch(
      "http://localhost:5000/api/employee/leaves/request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(leaveData),
      }
    );

    const result = await response.json();
    console.log("Leave request response:", result);

    // Now fetch leave data to see if it appears
    const fetchResponse = await fetch(
      "http://localhost:5000/api/employee/leaves",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const leaveResult = await fetchResponse.json();
    console.log("Fetched leave data:", leaveResult);
  } catch (error) {
    console.error("Error testing leave request:", error);
  }
}

console.log("Testing leave request submission...");
// testLeaveRequest(); // Uncomment when you have a valid token
