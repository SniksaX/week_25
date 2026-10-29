import { createApp } from "./src/app.ts";
import { PORT } from "./src/config.ts";
const app = createApp();

app.listen(PORT, () => {
  console.log(`TechHelp assistant disponible sur http://localhost:${PORT}`);
});
