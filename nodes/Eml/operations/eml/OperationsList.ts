import { IResourceDef } from "../../utils/CommonDefinitions";
import { parseEmlOperation } from "./functions/EmlParse";
import { resourceEml } from "./ResourceName";

export const emlResourceDefinitions: IResourceDef = {
  resource: resourceEml,
  operationDefs: [
    parseEmlOperation,
  ],
};
