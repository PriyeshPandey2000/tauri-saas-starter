/** A transactional email the API needs to send. */
export interface Mail {
  to: string;
  subject: string;
  text: string;
  url?: string;
}

/** Mail boundary. Real providers are adapters in later milestones. */
export interface MailerPort {
  send(mail: Mail): Promise<void>;
}

/** Development stub: writes the mail to the API log, never to the desktop log. */
export const loggingMailer: MailerPort = {
  async send(mail) {
    console.info(
      `[mail] to=${mail.to} subject=${mail.subject} url=${mail.url ?? ""}`,
    );
  },
};
