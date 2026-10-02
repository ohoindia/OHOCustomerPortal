import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

/** ASP.NET accepts PascalCase and camelCase DTO properties. Normalize only DTO keys. */
@Injectable()
export class LegacyBodyPipe implements PipeTransform {
  transform(value: unknown, metadata: { type: string }) {
    if (metadata.type !== "body") return value;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException("A JSON object is required.");
    }
    const result: Record<string, unknown> = Object.create(null);
    for (const [key, item] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key.toLowerCase()))
        throw new BadRequestException("Invalid field.");
      const normalized =
        key === "GUID"
          ? "guid"
          : key === "OTPGenerated"
            ? "otpGenerated"
            : key === "AadhaarNumber"
              ? "aadhaarNumber"
              : key.charAt(0).toLowerCase() + key.slice(1);
      if (Object.hasOwn(result, normalized))
        throw new BadRequestException(`Duplicate field: ${normalized}`);
      result[normalized] = item;
    }
    return result;
  }
}
