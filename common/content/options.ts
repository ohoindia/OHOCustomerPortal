import { UI_TEXT } from "./labels";

// Shared menu entries, form options, field labels, and sample display collections.
export const otpKeypad = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  "",
  0,
  UI_TEXT.backspaceIcon,
];

export const appointmentDates = [
  [UI_TEXT.mon, "20"],
  [UI_TEXT.tue, "21"],
  [UI_TEXT.wed, "22"],
  [UI_TEXT.thu, "23"],
  [UI_TEXT.fri, "24"],
];

export const appointmentTimeSlots = [
  UI_TEXT.value0900Am,
  UI_TEXT.value0930Am,
  UI_TEXT.value1000Am,
  UI_TEXT.value1030Am,
  UI_TEXT.value1100Am,
  UI_TEXT.value1130Am,
];

export const bookableCardStatuses: string[] = [
  UI_TEXT.active,
  UI_TEXT.expiresToday,
];

export const sampleOrderTimeline = [
  [UI_TEXT.orderPlaced, UI_TEXT.value20May20261000Am],
  [UI_TEXT.confirmed, UI_TEXT.value20May20261005Am],
  [UI_TEXT.packed, UI_TEXT.value20May20261130Am],
  [UI_TEXT.outForDelivery, UI_TEXT.value20May20260400Pm],
  [UI_TEXT.delivered, UI_TEXT.value20May20260615Pm],
];

export const paymentMethods = [
  UI_TEXT.upiPhonepeGpayPaytm,
  UI_TEXT.creditDebitCard,
  UI_TEXT.netBanking,
  UI_TEXT.ohoWalletBalance2450,
];

export const paymentMethodIcons = [
  UI_TEXT.selectedCircleIcon,
  UI_TEXT.gridIcon,
  UI_TEXT.homeIcon,
  UI_TEXT.walletIcon,
];

export const pharmacyCategories = [
  UI_TEXT.allMedicines,
  UI_TEXT.healthCare,
  UI_TEXT.babyCare,
  UI_TEXT.devices,
];

export const pharmacyCategoryIcons = [
  UI_TEXT.medicineEmoji,
  UI_TEXT.bottleEmoji,
  UI_TEXT.babyEmoji,
  UI_TEXT.watchEmoji,
];

export const homeServices = [
  [UI_TEXT.hospitalEmoji, UI_TEXT.hospitals, "/hospitals"],
  [UI_TEXT.doctorEmoji, UI_TEXT.doctors, "/doctors"],
  [UI_TEXT.labEmoji, UI_TEXT.labTests, "/lab-tests"],
  [UI_TEXT.medicineEmoji, UI_TEXT.pharmacy, "/pharmacy"],
  [UI_TEXT.heartIcon, UI_TEXT.wellness, "/packages"],
  [UI_TEXT.stethoscopeEmoji, UI_TEXT.healthCheckups, "/packages"],
  [UI_TEXT.packageEmoji, UI_TEXT.packages, "/packages"],
  [UI_TEXT.moreIcon, UI_TEXT.more, "/profile"],
];

export const membershipAttentionStatuses: string[] = [
  UI_TEXT.expired,
  UI_TEXT.expiresToday,
  UI_TEXT.inactive,
];

export const renewalStatuses: string[] = [
  UI_TEXT.expired,
  UI_TEXT.expiresToday,
];

export const portalServices = [
  [UI_TEXT.myMembership, "/PurchasedPackages"],
  [UI_TEXT.healthProducts, "/products"],
  [UI_TEXT.myBookings, "/ConsultationList"],
  [UI_TEXT.hospitalNetwork, "/network"],
  [UI_TEXT.myProfile, "/myprofile"],
  [UI_TEXT.familyMembers2, "/family-members"],
  [UI_TEXT.nomineeDetails, "/NomineeDetails"],
  [UI_TEXT.kycVerification2, "/kyc-verification"],
  [UI_TEXT.accountManagement, "/account-management"],
  [UI_TEXT.bmiCalculator, "/BMICalculator"],
  [UI_TEXT.meditationBreathing, "/MeditationBreathing"],
  [UI_TEXT.stepTracker, "/StepTracker"],
  [UI_TEXT.nutritionTracking, "/NutritionTracking"],
  [UI_TEXT.support2, "/support"],
  [UI_TEXT.privacyPolicy, "/privacy-policy"],
  [UI_TEXT.aboutUs, "/aboutus"],
] as const;

export const customerProfileFields: [string, string][] = [
  ["Name", UI_TEXT.name],
  ["MobileNumber", UI_TEXT.mobileNumber],
  ["Email", UI_TEXT.email],
  ["DateofBirth", UI_TEXT.dateOfBirth],
  ["Gender", UI_TEXT.gender],
  ["AddressLine1", UI_TEXT.address],
  ["AddressLine2", UI_TEXT.addressLine2],
  ["Village", UI_TEXT.village],
  ["City", UI_TEXT.city],
  ["Pincode", UI_TEXT.pincode],
];

export const familyMemberFields: [string, string][] = [
  ["Name", UI_TEXT.name],
  ["Relationship", UI_TEXT.relationship],
  ["DateofBirth", UI_TEXT.dateOfBirth],
  ["Gender", UI_TEXT.gender],
];

export const bookingPeriods = [
  UI_TEXT.all,
  UI_TEXT.previous,
  UI_TEXT.upcoming,
  UI_TEXT.running,
];

export const appointmentFields: [string, string][] = [
  ["BookingDate", UI_TEXT.bookedOn],
  ["AppointmentDate", UI_TEXT.appointmentDate],
  ["ServiceName", UI_TEXT.service],
  ["Name", UI_TEXT.patient],
  ["StatusName", UI_TEXT.status],
];

export const policyFields: [string, string][] = [
  ["PoliciesProductName", UI_TEXT.policy],
  ["PolicyCOINumber", UI_TEXT.coiNumber],
];

export const insurerFields: [string, string][] = [
  ["InsurerName", UI_TEXT.name],
  ["InsurerRelationship", UI_TEXT.relationship],
];

export const dependentFields: [string, string][] = [
  ["DependentFullName", UI_TEXT.name],
  ["DependentRelationship", UI_TEXT.relationship],
];

export const nomineeFields: [string, string][] = [
  ["NomineeFullName", UI_TEXT.name],
  ["NomineeRelationship", UI_TEXT.relationship],
  ["NomineeDateofBirth", UI_TEXT.dateOfBirth],
];

export const packageValidityFields: [string, string][] = [
  ["IssuedOn", UI_TEXT.issuedOn],
  ["ValidTill", UI_TEXT.validUntil],
  ["PaidAmount", UI_TEXT.paidAmount],
];

export const hospitalFields: [string, string][] = [
  ["Specialization", UI_TEXT.speciality],
  ["AddressLine1", UI_TEXT.address],
  ["AddressLine2", UI_TEXT.addressLine2],
  ["City", UI_TEXT.city],
  ["HospitalCode", UI_TEXT.hospitalCode],
];

export const productFields: [string, string][] = [
  ["SaleAmount", UI_TEXT.price],
  ["MaximumAdult", UI_TEXT.adultsCovered],
  ["MaximumChild", UI_TEXT.childrenCovered],
  ["SumAssured", UI_TEXT.sumAssured],
];

export const membershipBenefits = [
  UI_TEXT.discountsAtPartnerHospitals,
  UI_TEXT.freeAnnualHealthCheck,
  UI_TEXT.priorityAppointmentBooking,
  UI_TEXT.ohoCoinsOnEveryPurchase,
];

export const sampleNotifications = [
  [
    UI_TEXT.calendarEmoji,
    UI_TEXT.appointmentConfirmed,
    UI_TEXT.drRajeshSharmaOn20May1030Am,
  ],
  [
    UI_TEXT.labEmoji,
    UI_TEXT.labTestReminder,
    UI_TEXT.yourBloodTestIsScheduledTomorrow,
  ],
];

export const sampleHealthRecords = [
  [UI_TEXT.bloodTestReport, UI_TEXT.value20May2026],
  [UI_TEXT.xRayChest, UI_TEXT.value15Apr2026],
  [UI_TEXT.ecgReport, UI_TEXT.value10Mar2026],
  [UI_TEXT.mriScan, UI_TEXT.value05Feb2026],
];

export const sampleFamilyMembers = [
  [UI_TEXT.srikanthReddy, UI_TEXT.self, UI_TEXT.manEmoji],
  [UI_TEXT.sujathaReddy, UI_TEXT.wife, UI_TEXT.womanEmoji],
  [UI_TEXT.chinnuReddy, UI_TEXT.daughter, UI_TEXT.girlEmoji],
];
