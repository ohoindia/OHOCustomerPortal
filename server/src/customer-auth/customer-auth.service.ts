import { Injectable } from '@nestjs/common';
import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { Connection, DatabaseService, DbRow } from '../database/database.service';
import { LoginDto, MobileDto, OtpDto, RegisterDto, ResetPasswordDto } from '../common/dto';
import { NotificationsService } from '../notifications/notifications.service';
import { toMember } from '../customers/member.mapper';

const failure = (message: string) => ({ status: false as const, message });
function equals(a: unknown, b: string) {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class CustomerAuthService {
  constructor(private readonly db: DatabaseService, private readonly notifications: NotificationsService) {}

  async mobileNoValid(dto: MobileDto) {
    const rows = await this.db.rows('SELECT CustomerId FROM Customer WHERE MobileNumber = ? LIMIT 1', [dto.mobileNumber]);
    // Include community customers because memberlogin also supports them.
    const community = rows.length ? [] : await this.db.rows('SELECT CommunityCustomersId FROM CommunityCustomers WHERE MobileNumber = ? LIMIT 1', [dto.mobileNumber]);
    const status = rows.length > 0 || community.length > 0;
    return { status, message: status ? 'Mobile Number Already exists' : 'Mobile Number not exists' };
  }

  async sendOtp(dto: MobileDto, reset: boolean) {
    return this.db.transaction(async (connection) => {
        const customers = await this.db.rows('SELECT CustomerId, IsProfileCompleted FROM Customer WHERE MobileNumber = ? LIMIT 1', [dto.mobileNumber], connection);
        const community = customers.length ? [] : await this.db.rows('SELECT CommunityCustomersId FROM CommunityCustomers WHERE MobileNumber = ? LIMIT 1', [dto.mobileNumber], connection);
        if (reset && !customers.length && !community.length) return failure('Mobile Number not yet registered. Please create account');
        if (!reset && customers.length) return failure(customers[0].IsProfileCompleted ? 'Already Registered with this Number. Please try with New Mobile Number' : "your profile already exist but no password has been set. Please click 'Reset Password' to set your password");
        if (!reset && community.length) return failure('Already Registered with this Number.');
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const history = await this.db.rows('SELECT ExpiredOTPOn FROM MobileOTPHistory WHERE MobileNumber = ? AND DATE(ExpiredOTPOn) = ?', [dto.mobileNumber, today], connection);
        if (history.length >= 5) return failure('You exhausted your tries. Try after 24hrs');
        if (history.some(row => new Date(row.ExpiredOTPOn as string).getTime() > Date.now())) return failure('OTP already sent');
        const otp = String(randomInt(100000, 1000000));
        const guid = randomUUID();
        const now = new Date();
        const expires = new Date(now.getTime() + 120000);
        await this.notifications.sendOtp(dto.mobileNumber, otp);
        await this.db.execute('INSERT INTO MobileOTPHistory (MobileNumber, OTPGenerated, GUID, ExpiredOTPOn, GeneratedOn, ValidFor) VALUES (?, ?, ?, ?, ?, ?)', [dto.mobileNumber, otp, guid, expires, now, reset ? 'CustomerPasswordReset' : 'CustomerRegistration'], connection);
        return { status: true, msg: 'success', guid, futureTime: expires.toISOString() };
    }, `oho-customer-otp:${dto.mobileNumber}`);
  }

  private async otpRecord(dto: OtpDto, connection?: Connection): Promise<DbRow | undefined> {
    const rows = await this.db.rows('SELECT * FROM MobileOTPHistory WHERE MobileNumber = ? AND GUID = ? ORDER BY ExpiredOTPOn DESC LIMIT 1' + (connection ? ' FOR UPDATE' : ''), [dto.mobileNumber, dto.guid], connection);
    const record = rows[0];
    if (!record || !equals(record.OTPGenerated, dto.otpGenerated) || !(new Date(record.ExpiredOTPOn as string).getTime() > Date.now())) return undefined;
    return record;
  }

  async validateOtp(dto: OtpDto) {
    const record = await this.otpRecord(dto);
    return record ? { status: true, msg: 'OTP Validated Successfully' } : { status: false, msg: 'Invalid or expired OTP. Click on Resend OTP.' };
  }

  async register(dto: RegisterDto) {
    const result = await this.db.transaction(async connection => {
      const proof = await this.otpRecord(dto, connection);
      if (!proof || proof.ValidFor !== 'CustomerRegistration') return failure('A valid registration OTP is required.');
      const existing = await this.db.rows('SELECT CustomerId FROM Customer WHERE MobileNumber = ? LIMIT 1 FOR UPDATE', [dto.mobileNumber], connection);
      if (existing.length) return failure('Mobile num existed');
        const codes = await this.db.rows('SELECT OHOCODE FROM Customer WHERE OHOCODE IS NOT NULL ORDER BY CustomerId DESC LIMIT 1 FOR UPDATE', [], connection);
        const number = Number(String(codes[0]?.OHOCODE ?? 'OHO 000000').slice(4)) + 1;
        if (!Number.isSafeInteger(number)) throw new Error('Invalid existing OHOCODE sequence.');
        const code = `OHO ${String(number).padStart(6, '0')}`;
        const saved = await this.db.execute('INSERT INTO Customer (Name, MobileNumber, CardHolderType, RegisterOn, IsActive, Password, IsProfileCompleted, OHOCODE, RegisteredWithOTP, OTPValidateDate) VALUES (?, ?, ?, ?, TRUE, ?, TRUE, ?, ?, ?)', [dto.name.trim(), dto.mobileNumber, dto.cardHolderType, new Date(), '1234', code, dto.otpGenerated, proof.ExpiredOTPOn as Date], connection);
        await this.consumeOtp(dto, connection);
        return { status: true as const, message: 'Your registration completed successfully.', data: { customerId: saved.insertId } };
    }, 'oho-customer-code');
    if (result.status) await this.notifications.onboarding(result.data.customerId);
    return result;
  }

  private consumeOtp(dto: OtpDto, connection: Connection) {
    // Expire the proof after use without requiring a schema change or deleting audit history.
    return this.db.execute('UPDATE MobileOTPHistory SET ExpiredOTPOn = ? WHERE MobileNumber = ? AND GUID = ?', [new Date(Date.now() - 1000), dto.mobileNumber, dto.guid], connection);
  }

  async resetPassword(dto: ResetPasswordDto) {
    return this.db.transaction(async connection => {
      const proof = await this.otpRecord(dto, connection);
      if (!proof || proof.ValidFor !== 'CustomerPasswordReset') return failure('A valid password reset OTP is required.');
      const result = await this.db.execute('UPDATE Customer SET Password = ?, IsProfileCompleted = TRUE WHERE MobileNumber = ?', [dto.password, dto.mobileNumber], connection);
      const community = result.affectedRows ? undefined : await this.db.execute('UPDATE CommunityCustomers SET Password = ? WHERE MobileNumber = ?', [dto.password, dto.mobileNumber], connection);
      if (!result.affectedRows && !community?.affectedRows) return failure('Mobile Number not yet registered.');
      await this.consumeOtp(dto, connection);
      return { status: true, message: 'Password updated successfully' };
    });
  }

  async login(dto: LoginDto) {
    const customers = await this.db.rows('SELECT * FROM Customer WHERE MobileNumber = ? LIMIT 1', [dto.mobileNumber]);
    const communities = await this.db.rows('SELECT * FROM CommunityCustomers WHERE MobileNumber = ? LIMIT 1', [dto.mobileNumber]);
    const customer = customers[0];
    const community = communities[0];
    const customerValid = customer && equals(customer.Password, dto.password);
    const communityValid = community && equals(community.Password, dto.password);
    if (!customerValid && !communityValid) return failure(!customer && !community ? 'Mobile Number not yet registered. Please create account' : "Incorrect password. Please reset your password using the 'Forgot Password' link");
    const groups = community?.GroupId ? await this.db.rows('SELECT CommunityId FROM CommunityGroup WHERE GroupId = ? LIMIT 1', [Number(community.GroupId)]) : [];
    const member = toMember(customerValid ? customer : community, !customerValid);
    Object.assign(member, { GroupId: community?.GroupId ?? 0, CommunityCustomerId: community?.CommunityCustomersId ?? 0, CommunityId: groups[0]?.CommunityId ?? 0 });
    if (customerValid) {
      const now = new Date();
      await this.db.execute('INSERT INTO UserLogin (LoginId, LoginTime, ExpiryTime, CustomerId) VALUES (?, ?, ?, ?)', [dto.mobileNumber, now, new Date(now.getTime() + 86400000), Number(customer.CustomerId)]);
    }
    return { status: true, memberData: [member] };
  }
}
