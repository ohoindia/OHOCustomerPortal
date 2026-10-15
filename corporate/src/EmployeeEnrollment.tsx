import { useState } from "react";
import type { Workspace } from "./api";

const relationships = [
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Father-in-law",
  "Mother-in-law",
  "Brother",
  "Sister",
];
export function EmployeeEnrollment({
  products,
}: {
  products: Workspace["products"];
}) {
  const [productId, setProductId] = useState("");
  const [family, setFamily] = useState<{ key: string; name: string }[]>([]);
  const product = products.find((p) => p.id === Number(productId));
  const limit = Math.max(0, (product?.maximumMembers ?? 1) - 1);
  return (
    <>
      <h3>OHOINDIA membership</h3>
      <div className="form-grid">
        <label className="field">
          Group product
          <select
            name="productsId"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="" disabled>
              Select a product
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Date of birth
          <input name="dateofBirth" type="date" required />
        </label>
        <label className="field">
          Gender
          <select name="gender" required defaultValue="">
            <option value="" disabled>
              Select gender
            </option>
            {["Male", "Female", "Other"].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="field">
          OHO card number (optional)
          <input
            name="ohoCardNumber"
            inputMode="numeric"
            pattern="[0-9]{12}|[0-9]{4} [0-9]{4} [0-9]{4}"
            maxLength={14}
          />
          <small>
            Enter the provided card number, or leave blank to generate a card.
          </small>
        </label>
      </div>
      {!products.length && (
        <p className="error">
          No products are attached to this company group. Ask OHOINDIA to attach
          a product before onboarding.
        </p>
      )}
      <h3>Family members</h3>
      <p className="hint">
        The employee is Primary. A spouse defaults to Secondary; other members
        default to Family.
      </p>
      <p className="hint">
        {product
          ? `${product.name} allows up to ${limit} family members. Product age and relationship rules apply.`
          : "Select a group product to add family members."}
      </p>
      {product?.requiresSpouse && (
        <p className="hint">
          This product requires your spouse. Add your spouse as the first family
          member.
        </p>
      )}
      {family.map((person, index) => (
        <fieldset key={person.key}>
          <legend>Family member {index + 1}</legend>
          <div className="form-grid">
            <label className="field">
              Card holder type
              <select name={`family.${index}.cardHolderType`} defaultValue="">
                <option value="">Automatic from relationship</option>
                <option>Secondary</option>
                <option>Family</option>
              </select>
            </label>
            <label className="field">
              Full name
              <input
                name={`family.${index}.fullName`}
                required
                maxLength={100}
                value={person.name}
                onChange={(e) =>
                  setFamily((rows) =>
                    rows.map((row) =>
                      row.key === person.key
                        ? { ...row, name: e.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <label className="field">
              Relationship
              <select
                name={`family.${index}.relationship`}
                required
                defaultValue=""
              >
                <option disabled value="">
                  Select relationship
                </option>
                {relationships.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Date of birth
              <input
                name={`family.${index}.dateofBirth`}
                type="date"
                required
              />
            </label>
            <label className="field">
              Gender
              <select name={`family.${index}.gender`} required defaultValue="">
                <option disabled value="">
                  Select gender
                </option>
                {["Male", "Female", "Other"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Mobile number (optional)
              <input
                name={`family.${index}.mobileNumber`}
                type="tel"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
              />
            </label>
          </div>
          <button
            type="button"
            className="text-button remove"
            onClick={() =>
              setFamily((rows) => rows.filter((row) => row.key !== person.key))
            }
          >
            Remove family member
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary"
        disabled={!product || family.length >= limit}
        onClick={() =>
          setFamily((rows) => [...rows, { key: crypto.randomUUID(), name: "" }])
        }
      >
        Add family member
      </button>
      {family.length > limit && (
        <p className="error">
          Remove extra family members to fit the selected product.
        </p>
      )}
      {product?.nominees.map((nominee) => (
        <fieldset
          key={`${product.id}-${nominee.id}-${family.map((p) => p.key).join()}`}
        >
          <legend>Nominee for {nominee.name}</legend>
          <div className="form-grid">
            <label className="field">
              Family nominee
              <select name={`nominee.${nominee.id}`} required defaultValue="">
                <option disabled value="">
                  Select family member
                </option>
                {family.map((p, i) => (
                  <option key={p.key} value={i}>
                    {p.name || `Family member ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Guardian if nominee is a minor
              <select name={`guardian.${nominee.id}`} defaultValue="-1">
                <option value="-1">Employee</option>
                {family.map((p, i) => (
                  <option key={p.key} value={i}>
                    {p.name || `Family member ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!family.length && (
            <p className="hint">
              Add a family member to select a nominee for this product.
            </p>
          )}
        </fieldset>
      ))}
    </>
  );
}
