export * from "./client";
export * from "./studio";
export * from "./narrative";
export * from "./shots";
export * from "./breakdown";
export * from "./production";
export * from "./budgeting";
export * from "./media";
export * from "./ai";

import { studioApi } from "./studio";
import { narrativeApi } from "./narrative";
import { shotsApi } from "./shots";
import { breakdownApi } from "./breakdown";
import { productionApi } from "./production";
import { budgetingApi } from "./budgeting";
import { mediaApi } from "./media";
import { aiApi } from "./ai";

export const api = {
  ...studioApi,
  ...narrativeApi,
  ...shotsApi,
  ...breakdownApi,
  ...productionApi,
  ...budgetingApi,
  ...mediaApi,
  ...aiApi,
};
