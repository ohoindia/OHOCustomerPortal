import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly config: ConfigService) {}
  async sendOtp(mobile: string, otp: string) {
    const provider = this.config.get('SMS_PROVIDER', 'disabled');
    if (provider === 'disabled') throw new ServiceUnavailableException('Configure an SMS provider to send OTPs.');
    let response: Response;
    if (provider === 'msg91') {
      const authkey = this.config.get<string>('MSG91_AUTH_KEY');
      const template = this.config.get<string>('MSG91_OTP_TEMPLATE_ID');
      if (!authkey || !template) throw new ServiceUnavailableException('MSG91 is not configured.');
      response = await fetch('https://control.msg91.com/api/v5/flow', {
        method: 'POST', headers: { authkey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: template, recipients: [{ mobiles: `91${mobile}`, var: otp }] }),
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json() as { type?: string };
      if (!response.ok || body.type !== 'success') throw new ServiceUnavailableException('Unable to send OTP.');
    } else if (provider === 'smsfresh') {
      const endpoint = this.config.get<string>('SMSFRESH_OTP_URL');
      const user = this.config.get<string>('SMSFRESH_USER');
      const pass = this.config.get<string>('SMSFRESH_PASSWORD');
      const sender = this.config.get<string>('SMSFRESH_SENDER');
      if (!endpoint || !user || !pass || !sender) throw new ServiceUnavailableException('SMSFresh is not configured.');
      const url = new URL(endpoint);
      url.search = new URLSearchParams({ user, pass, sender, phone: mobile, text: `Dear Customer, OTP(one time password) for your OHOINDIA registration is ${otp}.`, priority: 'ndnd', stype: 'normal' }).toString();
      response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok || !(await response.text()).includes('S.')) throw new ServiceUnavailableException('Unable to send OTP.');
    } else throw new ServiceUnavailableException('Unsupported SMS_PROVIDER.');
  }
  async onboarding(customerId: number) {
    const queue = this.config.get<string>('ONBOARDING_SMS_QUEUE_URL');
    if (!queue) return;
    const client = new SQSClient({ region: this.config.get('AWS_REGION', 'ap-south-1') });
    try {
      await client.send(new SendMessageCommand({
        QueueUrl: queue,
        MessageBody: JSON.stringify({ memberId: customerId, message: 'Onboarding Welcome SMS', messageTypeName: 'SendWebhookMSG' }),
        MessageAttributes: { MessageTypeName: { DataType: 'String', StringValue: 'SendWebhookMSG' } },
      }));
    } catch {
      this.logger.error(`Onboarding SMS queue delivery failed for customer ${customerId}; retry delivery separately.`);
    } finally { client.destroy(); }
  }
}
