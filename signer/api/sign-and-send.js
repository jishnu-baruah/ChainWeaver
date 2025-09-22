// NEAR Signer Microservice - Serverless Relayer
// Handles secure transaction signing and broadcasting to NEAR testnet using modern @near-js packages

import { Account } from '@near-js/accounts';
import { JsonRpcProvider } from '@near-js/providers';
import { KeyPairSigner } from '@near-js/signers';
import { NEAR } from '@near-js/tokens';
import { actionCreators } from '@near-js/transactions';

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

    // Step 2: Initialize Provider and Signer
    const provider = new JsonRpcProvider({
      url: 'https://rpc.testnet.near.org',
    });

    // Create signer from private key
    const signer = KeyPairSigner.fromSecretKey(privateKey);

    // Step 3: Create Account
    const account = new Account(signerId, provider, signer);

    // Step 4: Convert amount to yoctoNEAR
    const yoctoNEARAmount = NEAR.toUnits(amount.toString());

    // Step 5: Create and Send Transaction
    const { transaction } = await account.signAndSendTransaction({
      receiverId: receiverId,
      actions: [
        actionCreators.transfer(yoctoNEARAmount),
      ],
      waitUntil: 'EXECUTED_OPTIMISTIC',
    });

    // Step 6: Respond with Success
    console.log(`Transaction successful: ${signerId} -> ${receiverId}, Amount: ${amount} NEAR, Hash: ${transaction.hash}`);
    
    return res.status(200).json({
      status: 'success',
      transactionHash: transaction.hash,
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
