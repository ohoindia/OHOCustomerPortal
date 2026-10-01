import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RuntimeConfigService } from '../runtime-config/runtime-config.service';
import { GetQueueUrlCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly config: RuntimeConfigService) {}
  async sendOtp(mobile: string, otp: string) {
    const provider = (await this.config.get('SMS_PROVIDER', 'disabled')).toLowerCase();
    if (provider === 'disabled') throw new ServiceUnavailableException('Configure an SMS provider to send OTPs.');
    let response: Response;
    if (provider === 'msg91') {
      const authkey = await this.config.get('MSG91_AUTH_KEY');
      const template = await this.config.get('MSG91_OTP_TEMPLATE_ID');
      if (!authkey || !template) throw new ServiceUnavailableException('MSG91 is not configured.');
      response = await fetch(await this.config.get('MSG91_OTP_URL', 'https://control.msg91.com/api/v5/flow'), {
        method: 'POST', headers: { authkey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: template, recipients: [{ mobiles: `91${mobile}`, var: otp }] }),
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json() as { type?: string };
      if (!response.ok || body.type !== 'success') throw new ServiceUnavailableException('Unable to send OTP.');
    } else if (provider === 'smsfresh') {
      const endpoint = await this.config.get('SMSFRESH_OTP_URL');
      const user = await this.config.get('SMSFRESH_USER');
      const pass = await this.config.get('SMSFRESH_PASSWORD');
      const sender = await this.config.get('SMSFRESH_SENDER');
      if (!endpoint || !user || !pass || !sender) throw new ServiceUnavailableException('SMSFresh is not configured.');
      const url = new URL(endpoint);
      url.search = new URLSearchParams({ user, pass, sender, phone: mobile, text: `Dear Customer, OTP(one time password) for your OHOINDIA registration is ${otp}.`, priority: 'ndnd', stype: 'normal' }).toString();
      response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok || !(await response.text()).includes('S.')) throw new ServiceUnavailableException('Unable to send OTP.');
    } else throw new ServiceUnavailableException('Unsupported SMS_PROVIDER.');
  }
  async onboarding(customerId: number) {
    let client: SQSClient | undefined;
    try {
      const queue = await this.config.get('ONBOARDING_SMS_QUEUE_URL');
      if (!queue) return;
      client = new SQSClient({ region: await this.config.get('AWS_REGION', 'ap-south-1') });
      // The original .NET onboardingSMSQueue setting stores a queue name.
      const queueUrl = queue.startsWith('https://') ? queue : (await client.send(new GetQueueUrlCommand({ QueueName: queue }))).QueueUrl;
      if (!queueUrl) throw new Error('Onboarding queue URL could not be resolved.');
      await client.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ memberId: customerId, message: 'Onboarding Welcome SMS', messageTypeName: 'SendWebhookMSG' }),
        MessageAttributes: { MessageTypeName: { DataType: 'String', StringValue: 'SendWebhookMSG' } },
      }));
    } catch {
      this.logger.error(`Onboarding SMS queue delivery failed for customer ${customerId}; retry delivery separately.`);
    } finally { client?.destroy(); }
  }
}
