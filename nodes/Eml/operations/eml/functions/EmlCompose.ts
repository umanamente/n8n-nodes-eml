import { IBinaryData, IDataObject, IExecuteFunctions, INodeExecutionData, NodeApiError } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import * as nodemailer from 'nodemailer';
import Mail from "nodemailer/lib/mailer";


export const composeEmlOperation: IResourceOperationDef = {
  operation: {
    name: 'Compose EML',
    value: 'composeEml',
    description: 'Compose an EML message from the provided data',
  },
  parameters: [
    {
      displayName: 'From',
      name: 'from',
      type: 'string',
      default: '',
      description: 'The email address of the sender',
    },
    {
      displayName: 'To',
      name: 'to',
      type: 'string',
      default: '',
      description: 'The email address of the recipient, or a comma-separated list of addresses. Each address can be in the format "email@example.com" or "Name &lt;email@example.com&gt;".',
    },
    {
      displayName: 'CC',
      name: 'cc',
      type: 'string',
      default: '',
      description: 'The email address of the CC recipient, or a comma-separated list of addresses. Each address can be in the format "email@example.com" or "Name &lt;email@example.com&gt;".',
    },
    {
      displayName: 'Subject',
      name: 'subject',
      type: 'string',
      default: '',
      description: 'The subject of the email',
    },
    {
      displayName: 'Text',
      name: 'text',
      type: 'string',
      default: '',
      typeOptions: {
        rows: 5,
      },
      description: 'The text content of the email',
    },
    // options
    {
      displayName: 'Options',
      name: 'options',
      type: 'collection',
      placeholder: 'Add Option',
      default: {},
      options: [
        {
          displayName: 'BCC',
          name: 'bcc',
          type: 'string',
          default: '',
          description: 'The email address of the BCC recipient, or a comma-separated list of addresses. Each address can be in the format "email@example.com" or "Name &lt;email@example.com&gt;".',
        },
        {
          displayName: 'HTML',
          name: 'html',
          type: 'string',
          default: '',
          typeOptions: {
            editor: 'htmlEditor',
            rows: 5,
          },
          description: 'The HTML content of the email',
        },
        {
          displayName: 'Attachments',
          name: 'attachments',
          type: 'string',
          default: '',
          description: 'A comma-separated list of binary property names to attach to the email',
        }
      ],

    }
  ],
  async execute(context: IExecuteFunctions, itemIndex: number, item: INodeExecutionData): Promise<INodeExecutionData[] | null> {

    var returnItem: INodeExecutionData = {
      json: {},
      binary: {},
    };

    const from = context.getNodeParameter('from', itemIndex) as string;
    const to = context.getNodeParameter('to', itemIndex) as string;
    const cc = context.getNodeParameter('cc', itemIndex) as string;    
    const subject = context.getNodeParameter('subject', itemIndex) as string;
    const text = context.getNodeParameter('text', itemIndex) as string;    

    let mail_params: Mail.Options = {
      from: from,
      to: to,
      cc: cc,
      subject: subject,
      text: text,
    };


    // optional parameters
    const optionalParameters = context.getNodeParameter('options', itemIndex) as IDataObject;
    if ("bcc" in optionalParameters) {
      mail_params.bcc = optionalParameters.bcc as string;
    }
    if ("html" in optionalParameters) { 
      mail_params.html = optionalParameters.html as string;
    }

    // attachments
    if ("attachments" in optionalParameters) {
      const attachments = (optionalParameters.attachments as string).trim().split(',');
      
      // check if attachments field is empty
      if (attachments.length === 1 && attachments[0] === '') {
        // do nothing as there are no attachments
      }
      // check if input does not contain binary data
      else if (item.binary === undefined) {
        throw new NodeApiError(context.getNode(), {}, {
          message: `No binary data found in the input while attachments are requested`,
        });
      } else {
        for (let i = 0; i < attachments.length; i++) {
          const propertyName = attachments[i].trim();
          if (propertyName in item.binary) {
            const binaryData: IBinaryData = item.binary[propertyName];
            
            const fileName = binaryData.fileName || propertyName;

            let newAttachment: Mail.Attachment = {
              filename: fileName,
              content: binaryData.data,
              contentType: binaryData.mimeType,
              encoding: 'base64',
            };
            

            mail_params.attachments = mail_params.attachments || [];
            mail_params.attachments.push(newAttachment);
          }
        }
      }
    }


    type ComposeMailResult = {
      error: Error | null;
      info: ComposedEmailInfo | null;
    };

    type ComposedEmailInfo = {
      envelope: any;
      messageId: string;
      message: Buffer;
    };

    let transporter = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: 'unix',
  });


    const promise_compose_rfc822: Promise<ComposeMailResult> = new Promise((resolve, reject) => {
      transporter.sendMail(mail_params, (err, info) => {
        if (err) {
          resolve({
            error: err,
            info: null,
          });
          return;
        } else {
          // try to convert info type to ComposedEmailInfo
          // check fields
          if (!info.envelope || !info.messageId || !info.message) {
            resolve({
              error: new Error('Invalid info object returned by nodemailer. Expected fields: envelope, messageId, message. Found: ' + JSON.stringify(info)),
              info: null,
            });
            return;
          }

          let result: ComposeMailResult = {
            error: null,
            info: info as ComposedEmailInfo,
          };
          resolve(result);
        }
      });
    });

    const result: ComposeMailResult = await promise_compose_rfc822;

    // check errors
    if (result.error) {
      throw new NodeApiError(context.getNode(), {}, {
        message: `Error composing the email: ${result.error}`,
      });
    }

    // convert the email to rfc822 format
    const rfc822Content = result.info!.message.toString('utf8');

    returnItem.json.rfc822 = rfc822Content;

    var returnData: INodeExecutionData[] = [returnItem];
    return returnData;
  },
};
