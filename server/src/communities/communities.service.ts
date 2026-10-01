import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { toMember } from "../customers/member.mapper";
import { validId } from "../customers/customers.service";
@Injectable()
export class CommunitiesService {
  constructor(private readonly db: DatabaseService) {}
  async customer(id: number) {
    const rows = await this.db.rows(
      `SELECT cc.*, (SELECT c.CustomerId FROM Customer c
      WHERE c.MobileNumber = cc.MobileNumber AND c.RelatedCustomerId IS NULL LIMIT 1) AS CustomerId
      FROM CommunityCustomers cc WHERE cc.CommunityCustomersId = ?`,
      [validId(id)],
    );
    return rows.map((row) => ({
      ...toMember(row, true),
      CommunityCustomersId: row.CommunityCustomersId,
      CustomerId: row.CustomerId,
    }));
  }
  group(id: number) {
    return this.db.rows("SELECT * FROM `Group` WHERE GroupId = ?", [
      validId(id),
    ]);
  }
}
