import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { allResourceDefinitions } from './operations/ResourcesList';
import { getAllResourceNodeParameters } from './utils/CommonDefinitions';

export class Eml implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'EML',
    name: 'eml',
    // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
    icon: 'file:node-eml-icon.png',
    group: ['transform'],
    version: 1,
    subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
    description: 'Node to work with EML files',
    defaults: {
      name: 'EML',
    },
    // eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
    inputs: [NodeConnectionType.Main],
    // eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
    outputs: [NodeConnectionType.Main],
    properties: [

      // eslint-disable-next-line n8n-nodes-base/node-param-default-missing
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: allResourceDefinitions.map((resourceDef) => resourceDef.resource),
        default: allResourceDefinitions[0].resource.value,
      },

      // combine all parameters from all operations
      ...allResourceDefinitions.map((resourceDef) => getAllResourceNodeParameters(resourceDef)).flat(),


    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // get node parameters
    const FIRST_ITEM_INDEX = 0; // resource and operation are the same for all items
    const resource = this.getNodeParameter('resource', FIRST_ITEM_INDEX) as string;
    const operation = this.getNodeParameter('operation', FIRST_ITEM_INDEX) as string;

    var resultBranches: INodeExecutionData[][] = [];
    var resultItems: INodeExecutionData[] = [];
    resultBranches.push(resultItems);

    // run corresponding operation
    const handler = allResourceDefinitions.find((resourceDef) => resourceDef.resource.value === resource)?.operationDefs.find((operationDef) => operationDef.operation.value === operation);
    if (handler) {
        // running operation in a loop for each input item
        const items = this.getInputData();

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          try {
            const itemResults = await handler.execute(this, itemIndex, items[itemIndex]);
            if (itemResults) {
              resultItems.push(...itemResults);
            }    
          } catch (error) {
            new NodeOperationError(this.getNode(), error);
          }
        }
      }
    return resultBranches;
  }
}
