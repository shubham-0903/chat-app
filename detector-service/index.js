require("dotenv").config();
const amqp = require("amqplib");
const { VIOLATION_PATTERNS } = require("./constants/patterns");
const connectDB = require("./src/config/db");
const { detectViolations } = require("./src/service/detectore");

const CHAT_QUEUE = "chat_message";
const STRIKE_QUEUE = "strikes";

async function startDetector() {
  try {
    // mongodb connection
     await connectDB();
    // Connect to RabbitMQ
    const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    //  Ensure queues exist
    await channel.assertQueue(CHAT_QUEUE, { durable: true });
    await channel.assertQueue(STRIKE_QUEUE, { durable: true });

    console.log("Detector service connected to RabbitMQ");
    console.log(`Listening for messages on queue: ${CHAT_QUEUE}`);

    //  Consume chat messages
    channel.consume(CHAT_QUEUE, async (msg) => {
      if (!msg) return;
      const data = JSON.parse(msg.content.toString());
      const { userId, message } = data;

      console.log(`Received message from ${userId}:`, message);

      const violations = await detectViolations(message);

      if (violations.length > 0) {
        console.log(`Violations found:`, violations.map(v => v.type));

        // Emit a strike event
        const strikeEvent = {
          userId,
          violations,
          timestamp: new Date().toISOString(),
        };

        channel.sendToQueue(
          STRIKE_QUEUE,
          Buffer.from(JSON.stringify(strikeEvent)),
          { persistent: true }
        );

        console.log(`Strike issued for user ${userId}`);
      } else {
        console.log("Message clean");
      }

      // Acknowledge message
      channel.ack(msg);
    });
  } catch (error) {
    console.error(" Detector service error:", error);
  }
}

startDetector();
