// NEAR Signer Microservice - Serverless Relayer
// Handles secure transaction signing and broadcasting to NEAR testnet

import { connect, KeyPair, keyStores, utils } from 'near-api-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Method not allowed. Only POST requests are supported.',
    });
  }

  try {
    // Step 1: Input Validation
    const { signerId, privateKey, receiverId, amount } = req.body;

    if (!signerId || !privateKey || !receiverId || amount === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields. Please provide signerId, privateKey, receiverId, and amount.',
      });
    }

    if (typeof signerId !== 'string' || typeof privateKey !== 'string' || typeof receiverId !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'signerId, privateKey, and receiverId must be strings.',
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'amount must be a positive number.',
      });
    }

    // Step 2: Dependency Import (already imported at top)
    // Step 3: Key & Keystore
    const keyPair = KeyPair.fromString(privateKey);
    const keyStore = new keyStores.InMemoryKeyStore();
    
    // Add the key to the keystore for the signerId and testnet network
    await keyStore.setKey('testnet', signerId, keyPair);

    // Step 4: NEAR Connection
    const near = await connect({
      deps: { keyStore },
      nodeUrl: 'https://rpc.testnet.near.org',
      networkId: 'testnet',
    });

    // Step 5: Account & Execution
    const account = await near.account(signerId);
    
    // Convert amount from NEAR to yoctoNEAR
    const yoctoNEARAmount = utils.format.parseNearAmount(amount.toString());
    
    if (!yoctoNEARAmount) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid amount format. Please provide a valid NEAR amount.',
      });
    }

    // Send the transaction
    const result = await account.sendMoney(receiverId, yoctoNEARAmount);

    // Step 6: Respond with Success
    console.log(`Transaction successful: ${signerId} -> ${receiverId}, Amount: ${amount} NEAR, Hash: ${result.transaction.hash}`);
    
    return res.status(200).json({
      status: 'success',
      transactionHash: result.transaction.hash,
    });

  } catch (error) {
    // Log error for debugging (without sensitive data)
    console.error('Signer error:', {
      message: error.message,
      signerId: req.body?.signerId,
      receiverId: req.body?.receiverId,
      amount: req.body?.amount,
    });

    // Return error response
    return res.status(500).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred while processing the transaction.',
    });
  }
}
