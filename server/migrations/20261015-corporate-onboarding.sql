-- Historical migration only. Superseded by scripts/migrate-employee-onboarding.cjs.
-- Do not run on new installations.
-- Additive migration; preserves existing customer, order and card records.
CREATE TABLE IF NOT EXISTS CorporateOnboarding (
 EmployeeId INT UNSIGNED PRIMARY KEY,
 CompanyId INT UNSIGNED NOT NULL,
 RequestId CHAR(36) NOT NULL,
 RequestHash CHAR(64) NOT NULL,
 OrderId INT NOT NULL,
 CreatedTime VARCHAR(19) NOT NULL,
 Status ENUM('Ready','Processing','Completed','Review') NOT NULL DEFAULT 'Ready',
 UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY (CompanyId, RequestId),
 UNIQUE KEY (OrderId),
 FOREIGN KEY (EmployeeId) REFERENCES CorporateEmployee(Id),
 FOREIGN KEY (CompanyId) REFERENCES CorporateCompany(Id)
) ENGINE=InnoDB;
