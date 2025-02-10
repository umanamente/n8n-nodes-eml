/*
This file contains the list of all resources that are available for the Node.
Each resource is located in a separate directory along with its operations.
*/

import { IResourceDef } from "../utils/CommonDefinitions";
import { emlResourceDefinitions } from "./eml/OperationsList";

export const allResourceDefinitions: IResourceDef[] = [
  emlResourceDefinitions,
];
