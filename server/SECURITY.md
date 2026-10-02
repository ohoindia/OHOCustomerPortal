# API security

All controller routes, including health and public authentication, share a per-IP
budget of 120 requests per minute. Authentication routes additionally share 60
requests per five minutes and each authentication operation permits 10 requests
per minute. Exceeding a budget returns HTTP 429 with a standard Retry-After header
and the existing JSON error envelope. Invalid requests count toward these budgets.
JWT authorization and ownership checks remain mandatory on data and catalog routes.

Counters are in memory per process. For production Lambda or multiple replicas,
configure AWS WAF rate-based rules and API Gateway throttling, or provide a shared
atomic ThrottlerStorage implementation. Local counters alone do not enforce an
aggregate deployment budget and reset when an instance restarts. Configure these
infrastructure controls before treating this as distributed brute-force protection.

Forwarded IP headers are ignored unless TRUSTED_PROXIES lists trusted IPs/subnets.
Ensure ingress overwrites forwarded headers and direct backend access is blocked.
For Lambda, verify API Gateway's event source IP reaches the adapter's remote address;
do not enable blanket proxy trust to compensate for adapter configuration.

JSON/form bodies are limited to 32 KiB. DTOs reject unknown fields, duplicate aliases,
and prototype keys. Helmet sets security headers; API responses disable caching.
Production enables HSTS and disables Swagger UI and its JSON endpoint. Terminate
TLS at ingress. Production CORS has no default origin: set CORS_ORIGINS to explicit
frontend origins in ConfigSecrets/ConfigValues. CORS is a browser control; JWT
authentication remains necessary for non-browser clients.

The existing four-digit plaintext passwords and default registration password
remain a security risk. Migrating them requires coordinated changes with the legacy
backend and database; see AUTHENTICATION.md. Public mobile lookup responses also
retain their existing account-existence contract. Rate limiting reduces abuse but
does not remove account enumeration. No claim of complete API security is implied.

References: [NestJS rate limiting](https://docs.nestjs.com/security/rate-limiting)
and [Express proxy configuration](https://expressjs.com/en/guide/behind-proxies.html).
