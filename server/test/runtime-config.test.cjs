const assert = require('node:assert/strict');
const { test } = require('node:test');
const { RuntimeConfigService } = require('../dist/runtime-config/runtime-config.service');
const { NotificationsService } = require('../dist/notifications/notifications.service');
const { SQSClient } = require('@aws-sdk/client-sqs');

function database(values, secrets) {
  return { async rows(sql) { return sql.includes('FROM ConfigSecrets') ? secrets : values; } };
}

test('configuration matches .NET precedence, supports legacy aliases and ignores DB keys', async () => {
  const settings = new RuntimeConfigService(database([
    { ConfigKey: 'SMS_PROVIDER', ConfigValue: 'disabled' },
    { ConfigKey: 'MSG91_AUTH_KEY', ConfigValue: 'public-placeholder' },
    { ConfigKey: 'CORS_ORIGINS', ConfigValue: 'https://customer.example' },
    { ConfigKey: 'DB_NAME', ConfigValue: 'must-not-override-db' },
  ], [
    { ConfigKey: 'SMSGateway', ConfigValue: 'MSG91' },
    { ConfigKey: 'authkey', ConfigValue: 'private-key' },
    { ConfigKey: 'smsfreshPass', ConfigValue: 'private-password' },
    { ConfigKey: 'onboardingSMSQueue', ConfigValue: 'welcome-queue' },
    { ConfigKey: 'dbString', ConfigValue: 'must-not-override-db' },
  ]));
  assert.equal(await settings.get('SMS_PROVIDER'), 'MSG91');
  assert.equal(await settings.get('MSG91_AUTH_KEY'), 'private-key');
  assert.equal(await settings.get('SMSFRESH_PASSWORD'), 'private-password');
  assert.equal(await settings.get('ONBOARDING_SMS_QUEUE_URL'), 'welcome-queue');
  assert.equal(await settings.get('cors_origins'), 'https://customer.example');
  assert.equal(await settings.get('DB_NAME', 'ignored'), 'ignored');
  assert.equal(await settings.get('dbString', 'ignored'), 'ignored');
});

test('concurrent lookups share a refresh and table changes are visible after expiry', async () => {
  let calls = 0;
  let value = 'old-template';
  const settings = new RuntimeConfigService({ async rows(sql) {
    calls++;
    return sql.includes('FROM ConfigValues') ? [{ ConfigKey: 'MSG91OTPTemplateId', ConfigValue: value }] : [];
  } });
  assert.deepEqual(await Promise.all([settings.get('MSG91_OTP_TEMPLATE_ID'), settings.get('MSG91_OTP_TEMPLATE_ID')]), ['old-template', 'old-template']);
  assert.equal(calls, 2);
  value = 'new-template';
  assert.equal(await settings.get('MSG91_OTP_TEMPLATE_ID'), 'old-template');
  settings.expiresAt = 0;
  assert.equal(await settings.get('MSG91_OTP_TEMPLATE_ID'), 'new-template');
  assert.equal(calls, 4);
});

test('failed refresh is retried and never serves expired credentials', async () => {
  let fail = false;
  let value = 'old-key';
  const settings = new RuntimeConfigService({ async rows(sql) {
    if (fail && sql.includes('FROM ConfigSecrets')) throw new Error('database unavailable');
    return sql.includes('FROM ConfigSecrets') ? [{ ConfigKey: 'authkey', ConfigValue: value }] : [];
  } });
  assert.equal(await settings.get('MSG91_AUTH_KEY'), 'old-key');
  settings.expiresAt = 0;
  fail = true;
  await assert.rejects(settings.get('MSG91_AUTH_KEY'), /database unavailable/);
  await assert.rejects(settings.get('MSG91_AUTH_KEY'), /database unavailable/);
  fail = false;
  value = 'new-key';
  assert.equal(await settings.get('MSG91_AUTH_KEY'), 'new-key');
});

test('MSG91 notifications use table credentials and provider settings rather than environment settings', async () => {
  const settings = new RuntimeConfigService(database([
    { ConfigKey: 'SMSGateway', ConfigValue: 'MSG91' },
    { ConfigKey: 'MSG91OTPTemplateId', ConfigValue: 'table-template' },
  ], [{ ConfigKey: 'authkey', ConfigValue: 'table-key' }]));
  const originalFetch = global.fetch;
  const previousKey = process.env.MSG91_AUTH_KEY;
  process.env.MSG91_AUTH_KEY = 'wrong-environment-key';
  let sent;
  global.fetch = async (url, options) => { sent = { url, options }; return { ok: true, async json() { return { type: 'success' }; } }; };
  try {
    await new NotificationsService(settings).sendOtp('9876543210', '654321');
    assert.equal(sent.options.headers.authkey, 'table-key');
    assert.equal(JSON.parse(sent.options.body).template_id, 'table-template');
  } finally {
    global.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.MSG91_AUTH_KEY; else process.env.MSG91_AUTH_KEY = previousKey;
  }
});

test('an environment SMS provider cannot bypass missing table configuration', async () => {
  const previous = process.env.SMS_PROVIDER;
  process.env.SMS_PROVIDER = 'msg91';
  try {
    const service = new NotificationsService(new RuntimeConfigService(database([], [])));
    await assert.rejects(service.sendOtp('9876543210', '654321'), /Configure an SMS provider/);
  } finally {
    if (previous === undefined) delete process.env.SMS_PROVIDER; else process.env.SMS_PROVIDER = previous;
  }
});

test('legacy onboarding queue name is resolved before sending the welcome payload', async () => {
  const settings = new RuntimeConfigService(database([{ ConfigKey: 'onboardingSMSQueue', ConfigValue: 'welcome-queue' }], []));
  const previousSend = SQSClient.prototype.send;
  const commands = [];
  SQSClient.prototype.send = async function(command) {
    commands.push(command);
    return command.constructor.name === 'GetQueueUrlCommand' ? { QueueUrl: 'https://sqs.ap-south-1.amazonaws.com/123456789012/welcome-queue' } : {};
  };
  try {
    await new NotificationsService(settings).onboarding(12);
    assert.equal(commands[0].input.QueueName, 'welcome-queue');
    assert.equal(commands[1].input.QueueUrl, 'https://sqs.ap-south-1.amazonaws.com/123456789012/welcome-queue');
    assert.equal(JSON.parse(commands[1].input.MessageBody).memberId, 12);
  } finally { SQSClient.prototype.send = previousSend; }
});
