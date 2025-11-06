const amqp = require("amqplib");

let connection;
let channel;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

const QUEUE_NAME = "chat_message";

async function initRabbitMQ() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
    });

    console.log("Connected to RabbitMQ and queue initialized:", QUEUE_NAME);

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err);
    });

    connection.on("close", () => {
      console.warn("RabbitMQ connection closed");
    });

    return channel;
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    process.exit(1);
  }
}

async function sendToQueue(message) {
  if (!channel) {
    console.error("RabbitMQ channel not initialized");
    return;
  }

  try {
    const msgBuffer = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(QUEUE_NAME, msgBuffer, { persistent: true });
    console.log("Sent message to queue:", message);
  } catch (error) {
    console.error("Failed to send message to RabbitMQ:", error);
  }
}

module.exports = {initRabbitMQ, sendToQueue}