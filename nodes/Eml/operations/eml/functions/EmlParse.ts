import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { AddressObject, HeaderValue, ParsedMail, simpleParser } from "mailparser";


type Address = {
  email: string;
  name: string;
};

// Parsed EML JSON returned by the operation
type ParsedEmlJson = {
  envelope: {
    from: Address[];
    to: Address[];
    cc: Address[];
    bcc: Address[];
    subject: string;    
    date: Date | null;    
  };
  headers: {
    [key: string]: HeaderValue;
  };
  body_text: string;
  body_html: string;
};

// convert AddressObject (from mailparser) to Address[]
function fromSimpleParserAddressObject(addressObj: AddressObject|AddressObject[]|undefined): Address[] {
  if (!addressObj) {
    return [];
  }

  if (!Array.isArray(addressObj)) {
    addressObj = [addressObj];
  }

  return addressObj.map((address) => {
    return address.value.map((emailAddress) => {
      return {
        email: emailAddress.address || '',
        name: emailAddress.name,
      };
    });
  }).flat();
}

export const parseEmlOperation: IResourceOperationDef = {
  operation: {
    name: 'Parse EML',
    value: 'parseEml',
    description: 'Parse EML content',
  },
  parameters: [
    {
      displayName: 'EML Content (RFC822)',
      name: 'emlContent',
      type: 'string',
      default: '',
      description: 'EML content to parse',
      typeOptions: {
        rows: 10,
      },
    },
    {
      displayName: 'Output All Headers',
      name: 'includeAllHeaders',
      type: 'boolean',
      default: true,
      description: 'Whether to include all headers in the output',
    },
    {
      displayName: 'Headers to Output',
      name: 'headersToInclude',
      type: 'string',
      default: 'received,authentication-results,return-path',
      description: 'Comma-separated list of headers to include in the output. If empty, no headers will be included. Example: received,authentication-results,return-path',      
      displayOptions: {
        show: {
          includeAllHeaders: [
            false,
          ],
        },
      },
    },
    {
      displayName: 'Include Attachments',
      name: 'includeAttachments',
      type: 'boolean',
      default: false,
      description: 'Whether to include attachments in the output (as binary data)',
    },
  ],
  async execute(context: IExecuteFunctions, itemIndex: number): Promise<INodeExecutionData[] | null> {

    var returnItem: INodeExecutionData = {
      json: {},
      binary: {},
    };

    var returnData: INodeExecutionData[] = [returnItem];

    const emlContent = context.getNodeParameter('emlContent', itemIndex) as string;
    const includeAllHeaders = context.getNodeParameter('includeAllHeaders', itemIndex) as boolean;
    const includeAttachments = context.getNodeParameter('includeAttachments', itemIndex) as boolean; 

    let parsed:ParsedMail = await simpleParser(emlContent, {
      skipHtmlToText: true,
      skipTextToHtml: true,
    });
0
    let parsedEmlJson: ParsedEmlJson = {
      envelope: {
        from: [],
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        date: null,
      },
      headers: {},
      body_text: '',
      body_html: '',
    };

    // envelope
    parsedEmlJson.envelope.from = fromSimpleParserAddressObject(parsed.from);
    parsedEmlJson.envelope.to = fromSimpleParserAddressObject(parsed.to);
    parsedEmlJson.envelope.cc = fromSimpleParserAddressObject(parsed.cc);
    parsedEmlJson.envelope.bcc = fromSimpleParserAddressObject(parsed.bcc);
    parsedEmlJson.envelope.subject = parsed.subject || '';
    parsedEmlJson.envelope.date = parsed.date || null;

    // headers
    parsedEmlJson.headers = Object.fromEntries(parsed.headers.entries());

    // if filtering headers
    if (!includeAllHeaders) {
      const headersToInclude = context.getNodeParameter('headersToInclude', itemIndex) as string;
      context.logger.info('Debug: headersToInclude: ' + headersToInclude);
      const headersToIncludeArray = headersToInclude.split(',').map((header) => header.trim().toLowerCase());
      // only keep headers that are in the headersToIncludeArray
      parsedEmlJson.headers = Object.fromEntries(Object.entries(parsedEmlJson.headers).filter(([key, value]) => headersToIncludeArray.includes(key.toLowerCase())));
    }

    // body
    parsedEmlJson.body_text = parsed.text || '';
    parsedEmlJson.body_html = parsed.html || '';

    // attachments
    if (includeAttachments) {
      for (let attachment of parsed.attachments) {
        if (attachment.filename) {
          const binaryData = await context.helpers.prepareBinaryData(attachment.content, attachment.filename, attachment.contentType);
          returnItem.binary![attachment.filename] = binaryData;
        }
      }
    }

    context.logger.info('Parsed EML JSON: ' + JSON.stringify(parsedEmlJson));

    returnItem.json = parsedEmlJson;

    return returnData;
  },
};
