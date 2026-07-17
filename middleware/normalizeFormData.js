const normalizeFormData = (req, res, next) => {
  const data = { ...req.body };

  Object.keys(data).forEach((key) => {
    let value = data[key];

    if(typeof value === 'string'){
        // Handle arrays (multiple formData.append with same key)
        if (Array.isArray(value)) {
        data[key] = value.map((v) => convertValue(v));
        } else {
        data[key] = convertValue(value);
        }
    }
  });

  req.body = data;
  next();
};


// helper converter
const convertValue = (value) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  // empty string stays empty
  if (trimmed === "") return "";

  // boolean
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // number
  if (!isNaN(trimmed)) return Number(trimmed);

  // JSON (for arrays sent as string)
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) || typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch (e) {}

  return trimmed;
};

module.exports = normalizeFormData;

