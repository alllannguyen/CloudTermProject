const { SendEmailCommand } = require("@aws-sdk/client-ses");

const { sesClient } = require("../awsClients");

function isEmailConfigured() {
  return Boolean(process.env.SES_FROM_EMAIL);
}

function buildContactBody({ post, senderEmail, message }) {
  const optionalMessage = message ? `\n\nMessage from sender:\n${message}` : "";

  return [
    "Someone wants to contact you about your Lost & Found Board post.",
    "",
    `Post: ${post.title}`,
    `Type: ${post.type}`,
    `Location: ${post.location}`,
    `Date: ${post.date}`,
    `Sender email: ${senderEmail}`,
    optionalMessage,
    "",
    "Reply directly to the sender email above."
  ].join("\n");
}

async function sendContactEmail({ post, senderEmail, message }) {
  if (!isEmailConfigured()) {
    throw new Error("SES_FROM_EMAIL is required to send contact emails.");
  }

  await sesClient.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [post.ownerEmail]
      },
      ReplyToAddresses: [senderEmail],
      Message: {
        Subject: {
          Data: `Inquiry about your ${post.type} item post`,
          Charset: "UTF-8"
        },
        Body: {
          Text: {
            Data: buildContactBody({ post, senderEmail, message }),
            Charset: "UTF-8"
          }
        }
      }
    })
  );
}

module.exports = {
  isEmailConfigured,
  sendContactEmail
};
