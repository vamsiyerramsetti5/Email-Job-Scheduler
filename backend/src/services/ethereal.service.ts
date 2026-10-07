import nodemailer from 'nodemailer';

class EtherealService {
  private transporter: nodemailer.Transporter | null = null;
  private testAccount: nodemailer.TestAccount | null = null;

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    console.log('[EtherealService] Creating Ethereal test account...');
    this.testAccount = await nodemailer.createTestAccount();
    console.log(`[EtherealService] Created account: ${this.testAccount.user}`);

    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: this.testAccount.user,
        pass: this.testAccount.pass,
      },
    });

    return this.transporter;
  }

  async sendEmail(params: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string; previewUrl: string }> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.body.replace(/\n/g, '<br/>'),
      text: params.body.replace(/<[^>]*>?/gm, ''),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || `https://ethereal.email/message/${info.messageId}`;

    console.log(`[EtherealService] Sent email to ${params.to}. MessageId: ${info.messageId}. Preview: ${previewUrl}`);

    return {
      messageId: info.messageId,
      previewUrl,
    };
  }
}

export const etherealService = new EtherealService();
