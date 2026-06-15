import nodemailer from "nodemailer";
import smtpapi from "smtpapi";
import { randomBytes } from "crypto";

/**
 * @function generateOTP
 * Generates a cryptographically secure, random One-Time Password (OTP).
 * It creates 3 random bytes and converts them into a hexadecimal string, resulting in a 6-character unique code.
 */
export const generateOTP = () => {
  return randomBytes(3).toString("hex");
};

/**
 * @function sendMail
 * Orchestrates the process of sending an email using the SendGrid SMTP service.
 *
 * @param {string} email - The recipient's email address.
 * @param {string} subject - The subject line of the email.
 * @param {string} text - The plain-text body content (typically the OTP message).
 */
export const sendMail = async (email, subject, text) => {
  try {
    /**
     * @constant header
     * Initializes a new 'smtpapi' instance to handle custom SendGrid headers if needed for tracking or scheduling.
     */
    const header = new smtpapi();

    // Send usin Nodemailer
    const headers = { "x-smtpapi": header.jsonString() };

    /**
     * @constant transporter
     * Configures the Nodemailer transport object.
     * - 'host': Points to SendGrid’s official SMTP server.
     * - 'auth': Uses a static "apikey" username and a private API Key from environment variables for secure authentication.
     */
    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: parseInt(587, 10),
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    });

    /**
     * @constant mailOptions
     * Defines the email metadata, including the verified sender domain, recipient, and the content body.
     */
    const mailOptions = {
      from: process.env.SEND_GRID_DOMAIN,
      to: email,
      subject,
      text,
      headers: headers,
    };

    /**
     * @method transporter.sendMail
     * Executes the actual transmission of the email.
     * Includes a callback to close the connection and log any delivery errors to the console.
     */
    transporter.sendMail(mailOptions, (error, info) => {
      transporter.close();

      if (error) {
        console.log(error);
      } else {
        //console.log("Email sent: " + info.response);
      }
    });
  } catch (error) {
    /**
     * @description Error Handling
     * Wraps the setup in a try-catch block to catch initialization failures (like missing environment variables) and throws the error for the calling controller to handle.
     */
    console.log("Mail Error", error.message);
    throw error;
  }
};
