import { Link } from "react-router-dom";
import { UI_TEXT } from "../../../../common/content/labels";
import { AppShell, PageHeader } from "../../components/Layout";
import { textValue, usePortalData } from "../portal/usePortalData";
import {
  groupPackages,
  packageAmount,
} from "../../../../common/utils/packages";
import "./packages.css";

function features(description: string) {
  const document = new DOMParser().parseFromString(description, "text/html");
  document.querySelectorAll("script, style").forEach((node) => node.remove());
  document
    .querySelectorAll("br, p, li, div")
    .forEach((node) => node.append("\n"));
  return (document.body.textContent ?? "")
    .split(/\n|\.\s+/)
    .map((feature) => feature.trim())
    .filter(Boolean);
}

export function Packages() {
  const data = usePortalData("api/Products/all", { skip: 0, take: 0 });
  const groups = groupPackages(data.rows);
  return (
    <AppShell className="packages-page">
      <PageHeader title={UI_TEXT.packages} />
      <div className="packages-intro">
        <span className="packages-eyebrow">OHOINDIA HEALTH PACKAGES</span>
        <h2>
          Care for you.
          <br />
          Confidence for your family.
        </h2>
        <p>Explore health benefits and find a package that fits your needs.</p>
        <span className="packages-intro-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path
              d="M24 5 40 11v12c0 10-7 17-16 21C15 40 8 33 8 23V11L24 5Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M24 16v14m-7-7h14"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>
      <div className="packages-catalog">
        {data.loading && (
          <div className="packages-loading" role="status">
            <p>{UI_TEXT.loadingPackages}</p>
            {[0, 1, 2].map((i) => (
              <div className="package-skeleton" key={i} aria-hidden="true" />
            ))}
          </div>
        )}
        {data.error && (
          <div className="packages-message" role="alert">
            <p>{UI_TEXT.packagesUnavailablePleaseTryAgainLater}</p>
            <button className="outline-btn" onClick={data.retry}>
              {UI_TEXT.tryAgain}
            </button>
          </div>
        )}
        {!data.loading && !data.error && groups.length === 0 && (
          <div className="packages-message">
            <h2>More care is on the way</h2>
            <p>No packages are available right now. Please check again soon.</p>
          </div>
        )}
        {groups.map((group, index) => (
          <section
            className={`packages-category packages-tone-${index % 6}`}
            key={group.id}
            aria-labelledby={`package-category-${index}`}
          >
            <div className="packages-category-heading">
              <h2 id={`package-category-${index}`}>{group.name}</h2>
              <span>
                {group.packages.length}{" "}
                {group.packages.length === 1 ? "package" : "packages"}
              </span>
            </div>
            {group.packages.map((product) => {
              const amount = packageAmount(product);
              const benefits = features(
                textValue(product, "LongDescription") ||
                  textValue(product, "KeyFeatures"),
              );
              const members = Number(product.MaximumMembers);
              const validity = Number(product.ValidForDays);
              return (
                <Link
                  className="catalog-package-card"
                  key={textValue(product, "ProductsId")}
                  to={`/product-details?productId=${encodeURIComponent(textValue(product, "ProductsId"))}&purchase=1`}
                >
                  <div className="catalog-package-top">
                    <span className="catalog-package-badge">{group.name}</span>
                    <span className="catalog-package-symbol" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 3 20 6v6c0 5-4 8-8 10-4-2-8-5-8-10V6l8-3Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="m8 12 3 3 5-6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="catalog-package-heading">
                    <h3>{textValue(product, "ProductName")}</h3>
                  </div>
                  {textValue(product, "ShortDescription") && (
                    <p>{textValue(product, "ShortDescription")}</p>
                  )}
                  {(members > 0 || validity > 0) && (
                    <div className="catalog-package-meta">
                      {members > 0 && (
                        <span>
                          Up to {members} {members === 1 ? "member" : "members"}
                        </span>
                      )}
                      {validity > 0 && <span>{validity} days validity</span>}
                    </div>
                  )}
                  {benefits.length > 0 && (
                    <ul className="catalog-package-benefits">
                      {benefits.slice(0, 3).map((benefit, i) => (
                        <li key={i}>{benefit}</li>
                      ))}
                    </ul>
                  )}
                  {benefits.length > 3 && (
                    <span className="catalog-package-more">
                      +{benefits.length - 3} more benefits
                    </span>
                  )}
                  <div className="catalog-package-footer">
                    <div>
                      {amount !== null && (
                        <>
                          <span className="catalog-package-price-label">
                            Package price
                          </span>
                          <strong className="catalog-package-price">
                            {UI_TEXT.currencySymbol}
                            {amount.toLocaleString("en-IN")}
                          </strong>
                        </>
                      )}
                    </div>
                    <span className="catalog-package-cta">
                      Purchase <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
