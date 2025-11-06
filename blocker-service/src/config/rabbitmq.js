const amqp = require("amqplib");

let connection;
let channel;

async function initRabbitMQ(queueName) {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(queueName, { durable: true });
    console.log(` Listening to queue: ${queueName}`);

    return channel;
  } catch (err) {
    console.error(" RabbitMQ connection failed:", err);
    process.exit(1);
  }
}

module.exports = { initRabbitMQ };
