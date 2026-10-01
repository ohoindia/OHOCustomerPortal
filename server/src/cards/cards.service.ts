import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { validId } from "../customers/customers.service";
@Injectable()
export class CardsService {
  constructor(private readonly db: DatabaseService) {}
  async getMemberCard(id: number) {
    const returnData = await this.db.rows(
      `SELECT o.OHOCardsId, o.OHOCardnumber, o.SaleDoneBy,
      o.CustomerId AS CardPurchasedMemberId, c.Name AS FullName, c.DateofBirth, c.Age,
      c.Gender, c.MobileNumber, c.AddressLine1, o.StartDate, o.EndDate, o.KYCCardType,
      o.KYCCardNumber, o.KYCCardFront, o.KYCCardBack, o.ProductsId, o.UserId, o.IsActivated
      FROM OHOCards o INNER JOIN Customer c ON o.CustomerId = c.CustomerId WHERE o.CustomerId = ?`,
      [validId(id)],
    );
    return { status: returnData.length > 0, returnData };
  }
}
