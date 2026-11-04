const { FALLBACK_MODELS } = require("./lib/gemini");

console.log("Registered Fallback Model Cascade:");
FALLBACK_MODELS.forEach((m, idx) => {
  console.log(` ${idx + 1}. ${m}`);
});

