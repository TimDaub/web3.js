import { EthExecutionAPI } from 'web3-common';
import { Web3Context } from 'web3-core';
import { HexString, toNumber, ValidTypes } from 'web3-utils';
import { TransactionFactory, TxOptions } from '@ethereumjs/tx';
import Common from '@ethereumjs/common';

import {
	PopulatedUnsignedEip1559Transaction,
	PopulatedUnsignedEip2930Transaction,
	PopulatedUnsignedTransaction,
	Transaction,
} from '../types';
import { populateTransaction } from './populate_transaction';
import { validateTransactionForSigning } from '../validation';

const getEthereumjsTxDataFromTransaction = (
	transaction: PopulatedUnsignedTransaction<HexString>,
) => ({
	nonce: transaction.nonce as HexString,
	gasPrice: transaction.gasPrice as HexString,
	gasLimit: transaction.gasLimit as HexString,
	to: transaction.to as HexString,
	value: transaction.value as HexString,
	data: transaction.data,
	type: transaction.type as HexString,
	chainId: transaction.chainId as HexString,
	accessList: (transaction as PopulatedUnsignedEip2930Transaction).accessList,
	maxPriorityFeePerGas: (transaction as PopulatedUnsignedEip1559Transaction)
		.maxPriorityFeePerGas as HexString,
	maxFeePerGas: (transaction as PopulatedUnsignedEip1559Transaction).maxFeePerGas as HexString,
});

const getEthereumjsTransactionOptions = (
	transaction: PopulatedUnsignedTransaction<HexString>,
	web3Context: Web3Context<EthExecutionAPI>,
) => {
	const hasTransactionSigningOptions =
		(transaction.chain !== undefined && transaction.hardfork !== undefined) ||
		transaction.common !== undefined;

	let common;
	if (!hasTransactionSigningOptions) {
		common = Common.custom(
			{
				name: 'custom-network',
				chainId: toNumber(transaction.chainId) as number,
				networkId:
					transaction.networkId !== undefined
						? (toNumber(transaction.networkId) as number)
						: undefined,
				defaultHardfork: transaction.hardfork ?? web3Context.defaultHardfork,
			},
			{
				baseChain: web3Context.defaultChain,
			},
		);
	} else if (transaction.common)
		common = Common.custom(
			{
				name: transaction.common.customChain.name ?? 'custom-network',
				chainId: toNumber(transaction.common.customChain.chainId) as number,
				networkId: toNumber(transaction.common.customChain.networkId) as number,
				defaultHardfork: transaction.common.hardfork ?? web3Context.defaultHardfork,
			},
			{
				baseChain: transaction.common.baseChain ?? web3Context.defaultChain,
			},
		);

	return { common } as TxOptions;
};

// TODO - Needs override function
export const prepareTransactionForSigning = async (
	transaction: Transaction,
	web3Context: Web3Context<EthExecutionAPI>,
	privateKey?: HexString | Buffer,
) => {
	const populatedTransaction = await populateTransaction(
		transaction,
		web3Context,
		ValidTypes.HexString,
		privateKey,
	);

	validateTransactionForSigning(populatedTransaction);

	return TransactionFactory.fromTxData(
		getEthereumjsTxDataFromTransaction(populatedTransaction),
		getEthereumjsTransactionOptions(populatedTransaction, web3Context),
	);
};