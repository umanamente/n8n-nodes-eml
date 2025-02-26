import { IResourceDef } from "../../utils/CommonDefinitions";
import { composeEmlOperation } from "./functions/EmlCompose";
import { parseEmlOperation } from "./functions/EmlParse";
import { resourceEml } from "./ResourceName";

export const emlResourceDefinitions: IResourceDef = {
  resource: resourceEml,
  operationDefs: [
    parseEmlOperation,
    composeEmlOperation,
  ],
};
