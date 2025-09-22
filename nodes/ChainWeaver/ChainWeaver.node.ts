import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import axios from 'axios';

export class ChainWeaver implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ChainWeaver Action',
		name: 'chainWeaver',
		icon: 'fa:link',
		group: ['web3'],
		version: 2,
		subtitle: 'Headless Execution',
		description: 'Securely capture user credentials and transaction parameters, delegating signing and execution to a dedicated external serverless function.',
		defaults: {
			name: 'ChainWeaver Action',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'chainWeaverCredentials',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Credentials',
				name: 'credentials',
				type: 'credentials',
				typeOptions: {
					credentialType: 'chainWeaverCredentials',
				},
				required: true,
				default: '',
				description: 'ChainWeaver credentials containing account ID and private key',
			},
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Send NEAR (Headless)',
						value: 'sendNearHeadless',
					},
				],
				default: 'sendNearHeadless',
				required: true,
				description: 'The action to perform',
			},
			{
				displayName: 'Receiver Account ID',
				name: 'receiverId',
				type: 'string',
				default: '',
				placeholder: 'contributor.near',
				required: true,
				description: 'The NEAR account ID of the receiver',
			},
			{
				displayName: 'Amount (in NEAR)',
				name: 'amount',
				type: 'number',
				default: 0,
				placeholder: '50',
				required: true,
				description: 'The amount to send in NEAR',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Hardcoded API endpoint for the Signer microservice
		const SIGNER_ENDPOINT = 'https://your-signer-deployment.vercel.app/api/sign-and-send';

		for (let i = 0; i < items.length; i++) {
			try {
				// Step 1: Get Credentials
				const credentials = await this.getCredentials('chainWeaverCredentials');
				if (!credentials) {
					throw new Error('ChainWeaver credentials not found. Please configure the credentials.');
				}

				// Step 2: Get Parameters
				const receiverId = this.getNodeParameter('receiverId', i) as string;
				const amount = this.getNodeParameter('amount', i) as number;

				// Step 3: Construct Payload
				const payload = {
					signerId: credentials.accountId as string,
					privateKey: credentials.privateKey as string,
					receiverId: receiverId,
					amount: amount,
				};

				// Step 4: Make API Call to Signer
				const response = await axios.post(SIGNER_ENDPOINT, payload, {
					headers: {
						'Content-Type': 'application/json',
					},
					timeout: 30000, // 30 second timeout for blockchain operations
				});

				// Step 5: Process Response
				returnData.push({
					json: response.data,
					pairedItem: {
						item: i,
					},
				});

			} catch (error) {
				// Handle API call failures gracefully
				if (axios.isAxiosError(error)) {
					const errorMessage = error.response?.data?.message || error.message || 'Signer API call failed';
					const statusCode = error.response?.status || 'Unknown';
					
					throw new Error(`ChainWeaver Signer Error (${statusCode}): ${errorMessage}`);
				} else {
					throw new Error(`ChainWeaver Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
				}
			}
		}

		return [returnData];
	}
}
