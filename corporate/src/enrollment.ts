export function enrollmentBody(
  form: FormData,
  body: Record<string, unknown>,
  requestId: string,
) {
  body.requestId = requestId;
  body.productsId = Number(body.productsId);
  if (!body.ohoCardNumber) delete body.ohoCardNumber;
  const family: Record<string, string>[] = [];
  const nominees: {
    productsId: number;
    familyIndex: number;
    guardianIndex: number;
  }[] = [];
  for (const [key, value] of form.entries()) {
    const match = /^family\.(\d+)\.(\w+)$/.exec(key);
    if (match) {
      const index = Number(match[1]);
      family[index] ??= {};
      if (value) family[index][match[2]] = String(value);
      delete body[key];
    }
    if (key.startsWith("nominee.")) {
      const id = Number(key.slice(8));
      nominees.push({
        productsId: id,
        familyIndex: Number(value),
        guardianIndex: Number(form.get(`guardian.${id}`) ?? -1),
      });
      delete body[key];
    }
    if (key.startsWith("guardian.")) delete body[key];
  }
  body.family = family;
  body.nominees = nominees;
}
