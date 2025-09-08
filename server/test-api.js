const axios = require("axios");

const BASE_URL = "http://localhost:7000";

// Test health endpoint
async function testHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log("✅ Health check:", response.data);
    return true;
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
    return false;
  }
}

// Test leaderboard endpoint
async function testLeaderboard() {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/asian-paint/leaderboard`,
      {
        params: { scope: "overall", limit: 5 },
      }
    );
    console.log("✅ Leaderboard:", response.data);
    return true;
  } catch (error) {
    console.log(
      "❌ Leaderboard failed:",
      error.response?.data || error.message
    );
    return false;
  }
}

// Test user registration
async function testRegistration() {
  try {
    const response = await axios.post(`${BASE_URL}/api/asian-paint/register`, {
      name: "Test User",
      uuid: "test-uuid-" + Date.now(),
    });
    console.log("✅ Registration:", response.data);
    return true;
  } catch (error) {
    console.log(
      "❌ Registration failed:",
      error.response?.data || error.message
    );
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log("🧪 Testing Asian Game API...\n");

  const healthOk = await testHealth();
  if (!healthOk) {
    console.log("\n❌ Server is not running. Please start the server first:");
    console.log("   cd server && npm run dev");
    return;
  }

  await testLeaderboard();
  await testRegistration();

  console.log("\n🎉 API testing complete!");
}

runTests().catch(console.error);
