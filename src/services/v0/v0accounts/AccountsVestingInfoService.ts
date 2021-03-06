import { Metadata } from '@polkadot/types';
import { BlockHash } from '@polkadot/types/interfaces';
import { IAccountVestingInfo } from 'src/types/responses';

import { AbstractService } from '../../AbstractService';

export class AccountsVestingInfoService extends AbstractService {
	/**
	 * Fetch vesting information for an account at a given block.
	 *
	 * @param hash `BlockHash` to make call at
	 * @param address address of the account to get the vesting info of
	 */
	async fetchAccountVestingInfo(
		hash: BlockHash,
		address: string
	): Promise<IAccountVestingInfo> {
		const api = await this.ensureMeta(hash);

		const [header, vesting] = await Promise.all([
			api.rpc.chain.getHeader(hash),
			api.query.vesting.vesting.at(hash, address),
		]);

		const at = {
			hash,
			height: header.number.toNumber().toString(10),
		};

		return {
			at,
			vesting: vesting.isNone ? {} : vesting.unwrap(),
		};
	}

	async fetchMetadata(hash: BlockHash): Promise<Metadata> {
		const api = await this.ensureMeta(hash);

		const metadata = await api.rpc.state.getMetadata(hash);

		return metadata;
	}
}
