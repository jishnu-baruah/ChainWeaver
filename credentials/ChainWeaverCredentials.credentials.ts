import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ChainWeaverCredentials implements ICredentialType {
	name = 'chainWeaverCredentials';
	displayName = 'ChainWeaver Credentials';
	documentationUrl = 'chainweaver';
	properties: INodeProperties[] = [
		{
			displayName: 'Account ID',
			name: 'accountId',
			type: 'string',
			default: '',
			placeholder: 'my-dao-bot.testnet',
			required: true,
			description: 'The NEAR account ID of the bot wallet',
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The private key for the bot wallet',
		},
	];
}
