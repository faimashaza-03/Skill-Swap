require("dotenv").config();

const app = require("./app");
const { connectDatabase, mongoose } = require("./config/database");

const PORT = Number(process.env.PORT) || 3001;
const server = app.listen(PORT, () => {
  console.log(`SkillSwap Hub is running at http://localhost:${PORT}`);
  console.log("Checking MongoDB Atlas connection...");
});

connectDatabase();

async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down SkillSwap Hub...`);

  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
