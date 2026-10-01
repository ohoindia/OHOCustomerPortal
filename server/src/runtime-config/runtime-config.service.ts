import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

const aliases: Record<string, string> = {
  SMSGATEWAY: "SMS_PROVIDER",
  AUTHKEY: "MSG91_AUTH_KEY",
  MSG91OTPTEMPLATEID: "MSG91_OTP_TEMPLATE_ID",
  MSG91OTPURL: "MSG91_OTP_URL",
  SMSFRESHOTPURL: "SMSFRESH_OTP_URL",
  SMSFRESHUSER: "SMSFRESH_USER",
  SMSFRESHPASS: "SMSFRESH_PASSWORD",
  SMSFRESHSENDER: "SMSFRESH_SENDER",
  ONBOARDINGSMSQUEUE: "ONBOARDING_SMS_QUEUE_URL",
};

function normalize(key: string) {
  const upper = key.trim().toUpperCase();
  return aliases[upper] ?? upper;
}

@Injectable()
export class RuntimeConfigService {
  private settings = new Map<string, string>();
  private secrets = new Map<string, string>();
  private expiresAt = 0;
  private loading?: Promise<void>;
  constructor(private readonly db: DatabaseService) {}

  private async refresh() {
    // Match .NET Program.cs: ConfigValues first, then ConfigSecrets overrides.
    // Read only server-side; never copy credentials into process.env or API responses.
    const values = await this.db.rows(
      "SELECT ConfigKey, ConfigValue FROM ConfigValues ORDER BY ConfigValuesId",
    );
    const secrets = await this.db.rows(
      "SELECT ConfigKey, ConfigValue FROM ConfigSecrets ORDER BY ConfigSecretsId",
    );
    const settings = new Map<string, string>();
    for (const row of [...values, ...secrets]) {
      if (typeof row.ConfigKey !== "string") continue;
      const key = normalize(row.ConfigKey);
      // The connection must always come from Lambda env / local .env, never these tables.
      if (key.startsWith("DB_") || key === "DBSTRING") continue;
      if (row.ConfigValue != null) settings.set(key, String(row.ConfigValue));
    }
    this.settings = settings;
    this.secrets = new Map(
      secrets
        .filter(
          (row) =>
            typeof row.ConfigKey === "string" &&
            row.ConfigValue != null &&
            !normalize(row.ConfigKey).startsWith("DB_") &&
            normalize(row.ConfigKey) !== "DBSTRING",
        )
        .map((row) => [
          normalize(String(row.ConfigKey)),
          String(row.ConfigValue),
        ]),
    );
    this.expiresAt = Date.now() + 60000;
  }

  async get(key: string, fallback = ""): Promise<string> {
    if (Date.now() >= this.expiresAt) {
      // A failed refresh must be retried and must not silently use expired secrets.
      this.loading ??= this.refresh().finally(() => {
        this.loading = undefined;
      });
      await this.loading;
    }
    return this.settings.get(normalize(key)) ?? fallback;
  }

  async getSecret(key: string): Promise<string> {
    await this.get(key);
    return this.secrets.get(normalize(key)) ?? "";
  }
}
