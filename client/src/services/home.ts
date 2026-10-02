import { createHomeController } from "../../../common/controllers/home.controller";
import { apiRequest } from "./api";

export type {
  MemberProduct,
  MemberCard,
  Appointment,
} from "../../../common/models/customer";
export {
  formatHomeDate,
  nextAppointment,
  expiryStatus,
  cardStatus,
  latestActivePackage,
  appointmentState,
} from "../../../common/utils/home";
export const { loadHomeData } = createHomeController(apiRequest);
export {
  membershipState,
  membershipBadge,
  vaultMembershipStatus,
} from "../../../common/utils/membership";
