const { initRabbitMQ } = require("../config/rabbitmq");
const Strike = require("../models/Strike");
const BlockedUser = require("../models/BlockedUser");

async function startStrikeConsumer() {
  const queueName = "strikes";
  const channel = await initRabbitMQ(queueName);

  channel.consume(queueName, async (msg) => {
    if (!msg) return;
    const data = JSON.parse(msg.content.toString());
    const { userId, violationType } = data;

    console.log(`Received strike for user: ${userId}`);

    // Increment strike count
    const strike = await Strike.findOneAndUpdate(
      { userId },
      { $inc: { strikeCount: 1 }, lastStrikeAt: new Date() },
      { new: true, upsert: true }
    );

    console.log(`User ${userId} has ${strike.strikeCount} strikes.`);

    // Check if exceeds threshold
    const threshold = parseInt(process.env.BLOCK_THRESHOLD || "3", 10);
    if (strike.strikeCount >= threshold) {
      const blockDuration = parseInt(process.env.BLOCK_DURATION_MINUTES || "10", 10);
      const expiresAt = new Date(Date.now() + blockDuration * 60 * 1000);

      await BlockedUser.findOneAndUpdate(
        { userId },
        {
          userId,
          blockedAt: new Date(),
          expiresAt,
          reason: `Exceeded ${threshold} strikes`,
        },
        { upsert: true }
      );

      console.log(` User ${userId} blocked for ${blockDuration} minutes`);
      //  reset strikes after blocking
      await Strike.updateOne( { userId }, { $set: { strikeCount: 0 }, $inc: { totalBlocks: 1 },});
    }

    channel.ack(msg);
  });

  console.log("Blocker service is listening for strikes...");
}

module.exports = { startStrikeConsumer };