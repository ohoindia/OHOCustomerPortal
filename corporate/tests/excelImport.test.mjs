import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const code=ts.transpileModule(readFileSync(new URL("../src/excelImport.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {parseEmployees,excelDate,compatibleSheet,importRequestId}=await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const headings=["Sno","FullName","Gender","DateofBirth","MobileNumber","CardHolder Type","Relationship","ProductsId","PaidAmount","State","District","AddressLine1"];
const primary=(sno=1,mobile="9876543210")=>[sno,"Example Employee","Male",new Date("1990-01-01"),mobile,"Primary","Self",999,0,"Telangana","Hyderabad","Example address"];
const dependent=(name="Example Spouse",relationship="Spouse")=>[null,name,"Female","1992-01-01",null,"Secondary",relationship,999,0];

test("extra1 layout groups employees and normalizes Secondary family roles",()=>{
 const result=parseEmployees([headings,primary(),dependent(),dependent("Child","Daughter"),primary(2,"9876543211")]);
 assert.deepEqual(result.errors,[]);assert.equal(result.employees.length,2);
 assert.deepEqual(result.employees[0].family.map(p=>p.cardHolderType),["Secondary","Family"]);
 assert.equal(result.employees[0].employeeCode,"EMP-9876543210");
 assert.equal(result.employees[0].email,"");
 assert.equal(result.employees[0].orderDetails.paidAmount,0);
 assert.equal(result.employees[0].orderDetails.state,"Telangana");
 assert.equal("productsId" in result.employees[0],false);
});
test("orphan family and invalid primary rows prevent silent reassignment",()=>{
 const invalid=primary(2,"bad-number");
 const result=parseEmployees([headings,dependent(),primary(),invalid,dependent("Another child","Son")]);
 assert.equal(result.employees[0].family.length,0);assert.equal(result.errors.length,3);
 assert.ok(result.errors.some(e=>e.includes("Row 5")));
});
test("literal NULL cells in the supplied format are treated as empty",()=>{
 const p=dependent();p[4]="NULL";p[8]="NULL";
 const result=parseEmployees([headings,primary(),p]);
 assert.deepEqual(result.errors,[]);assert.equal(result.employees[0].family.length,1);
 assert.equal(result.employees[0].family[0].mobileNumber,undefined);
 assert.equal(result.employees[0].family[0].orderDetails.paidAmount,undefined);
});
test("duplicate employee mobile numbers and column headings are rejected",()=>{
 assert.ok(parseEmployees([headings,primary(),primary(2)]).errors.some(e=>e.includes("Duplicate mobile")));
 assert.throws(()=>parseEmployees([[...headings," FullName "],primary()]),/Duplicate column/);
});
test("Excel serials, real dates and explicit text date formats are validated",()=>{
 assert.equal(excelDate("02/03/1990",true),"1990-03-02");
 assert.equal(excelDate("02/03/1990",false),"1990-02-03");
 assert.equal(excelDate(new Date("1990-01-01")),"1990-01-01");
 assert.equal(excelDate(32874),"1990-01-01");
 assert.throws(()=>excelDate("2026-02-30"));assert.throws(()=>excelDate(new Date("2099-01-01")));
});
test("unrelated sheets, malformed primary roles and negative payment values are rejected",()=>{
 assert.equal(compatibleSheet([["S.No","Names"]]),false);
 const bad=primary();bad[5]="Secondary";
 assert.ok(parseEmployees([headings,bad]).errors.some(e=>e.includes("Primary")));
 const negative=primary();negative[8]=-1;
 assert.ok(parseEmployees([headings,negative]).errors.some(e=>e.includes("PaidAmount")));
});
test("retries retain the same UUID while company and Group product changes do not",async()=>{
 const a=await importRequestId(1,"Sheet1",{mobile:"9876543210",productsId:10});
 assert.equal(a,await importRequestId(1,"Sheet1",{mobile:"9876543210",productsId:10}));
 assert.notEqual(a,await importRequestId(2,"Sheet1",{mobile:"9876543210",productsId:10}));
 assert.notEqual(a,await importRequestId(1,"Sheet1",{mobile:"9876543210",productsId:11}));
 assert.match(a,/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-a[a-f\d]{3}-[a-f\d]{12}$/);
});
