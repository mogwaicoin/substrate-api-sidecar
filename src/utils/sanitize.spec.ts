import {
	BTreeMap,
	BTreeSet,
	Bytes,
	Compact,
	Data,
	Enum,
	Null,
	Raw,
	Result,
	Set as CodecSet,
	StorageKey,
	Struct,
	Tuple,
	U8aFixed,
	Vec,
} from '@polkadot/types';
import Int from '@polkadot/types/codec/Int';
import Option from '@polkadot/types/codec/Option';
import UInt from '@polkadot/types/codec/UInt';
import VecFixed from '@polkadot/types/codec/VecFixed';
import AccountId from '@polkadot/types/generic/AccountId';
import Bool from '@polkadot/types/primitive/Bool';
import Text from '@polkadot/types/primitive/Text';
import U32 from '@polkadot/types/primitive/U32';
import U64 from '@polkadot/types/primitive/U64';
import U128 from '@polkadot/types/primitive/U128';

import { sanitizeNumbers } from './sanitize';
import {
	kusamaRegistry,
	PRE_SANITIZED_BALANCE_LOCK,
	PRE_SANITIZED_OPTION_VESTING_INFO,
	PRE_SANITIZED_RUNTIME_DISPATCH_INFO,
	PRE_SANITIZED_STAKING_RESPONSE,
} from './test_util';

describe('sanitizeNumbers', () => {
	it('does not affect non-numbers', () => {
		expect(sanitizeNumbers('Hello world')).toBe('Hello world');
	});

	it('does not convert plain hexadecimal', () => {
		expect(sanitizeNumbers('40C0A7')).toBe('40C0A7');
		expect(sanitizeNumbers('0x40C0A7')).toBe('0x40C0A7');
	});

	describe('primitives and Codec base types', () => {
		it('handles Codec Bool', () => {
			const t = new Bool(kusamaRegistry, true);
			expect(sanitizeNumbers(t)).toBe(true);

			const f = new Bool(kusamaRegistry, false);
			expect(sanitizeNumbers(f)).toBe(false);
		});

		it('handles Codec Bytes', () => {
			const code = new Bytes(kusamaRegistry, ':code');
			expect(sanitizeNumbers(code)).toBe('0x3a636f6465');
		});

		it('handles Codec Data', () => {
			const data = new Data(kusamaRegistry, {
				Keccak256:
					'0x0102030405060708091011121314151617181920212223242526272829303132',
			});
			expect(sanitizeNumbers(data)).toStrictEqual({
				Keccak256:
					'0x0102030405060708091011121314151617181920212223242526272829303132',
			});
		});

		it('handles Codec Null', () => {
			expect(sanitizeNumbers(new Null(kusamaRegistry))).toBe(null);
		});

		it('handles StorageKey', () => {
			const key = new StorageKey(
				kusamaRegistry,
				'0x426e15054d267946093858132eb537f191ca57b0c4b20b29ae7e99d6201d680cc906f7710aa165d62c709012f807af8fc3f0d2abb0c51ca9a88d4ef24d1a092bf89dacf5ce63ea1d'
			);
			expect(sanitizeNumbers(key)).toStrictEqual(
				'0x426e15054d267946093858132eb537f191ca57b0c4b20b29ae7e99d6201d680cc906f7710aa165d62c709012f807af8fc3f0d2abb0c51ca9a88d4ef24d1a092bf89dacf5ce63ea1d'
			);
		});

		it('handles Text', () => {
			const notEnglish = new Text(kusamaRegistry, '中文');
			expect(sanitizeNumbers(notEnglish)).toBe('中文');
		});

		it('converts javascript Set<any>', () => {
			const negInt = new Int(kusamaRegistry, '0x80000000', 32, true);

			const maxInt = new Int(
				kusamaRegistry,
				'0x7FFFFFFFFFFFFFFF',
				64,
				true
			);

			const struct = new Struct(
				kusamaRegistry,
				{
					foo: Text,
					bar: U32,
				},
				{ foo: 'hi :)', bar: '4294967295' }
			);

			const set = new Set([struct, maxInt, negInt]);
			expect(sanitizeNumbers(set)).toStrictEqual([
				{
					foo: 'hi :)',
					bar: '4294967295',
				},
				'9223372036854775807',
				'-2147483648',
			]);
		});

		it('converts Int', () => {
			const intTen = new Int(kusamaRegistry, 10);
			expect(sanitizeNumbers(intTen)).toBe('10');

			const intPaddedHex = new Int(
				kusamaRegistry,
				'0x000000000000000004fe9f24a6a9c00'
			);
			expect(sanitizeNumbers(intPaddedHex)).toBe('22493750000000000');

			const maxInt = new Int(
				kusamaRegistry,
				'0x7FFFFFFFFFFFFFFF',
				64,
				true
			);
			expect(sanitizeNumbers(maxInt)).toBe('9223372036854775807');

			const negInt = new Int(kusamaRegistry, '0x80000000', 32, true);
			expect(sanitizeNumbers(negInt)).toBe('-2147483648');
		});

		it('converts UInt', () => {
			const uIntTen = new UInt(kusamaRegistry, 10);
			expect(sanitizeNumbers(uIntTen)).toBe('10');

			const uIntPaddedHex = new UInt(
				kusamaRegistry,
				'0x000000000000000004fe9f24a6a9c00'
			);
			expect(sanitizeNumbers(uIntPaddedHex)).toBe('22493750000000000');
		});

		it('converts U32', () => {
			const u32Zero = new U32(kusamaRegistry, '0x0');
			expect(sanitizeNumbers(u32Zero)).toBe('0');

			const u32Max = new U32(kusamaRegistry, '0xFFFFFFFF');
			expect(sanitizeNumbers(u32Max)).toBe('4294967295');
		});

		it('converts U64', () => {
			const u64Zero = new U64(kusamaRegistry, '0x0');
			expect(sanitizeNumbers(u64Zero)).toBe('0');

			const u64Max = new U64(kusamaRegistry, '0xFFFFFFFFFFFFFFFF');
			expect(sanitizeNumbers(u64Max)).toBe('18446744073709551615');
		});

		it('converts U128', () => {
			const u128Zero = new U128(kusamaRegistry, '0x0');
			expect(sanitizeNumbers(u128Zero)).toBe('0');

			const u128Max = new U128(
				kusamaRegistry,
				'340282366920938463463374607431768211455'
			);
			expect(sanitizeNumbers(u128Max)).toBe(
				'340282366920938463463374607431768211455'
			);
		});

		it('converts BTreeMap and nested BTreeMap (Should cover Map)', () => {
			const mockU32TextMap = new Map<Text, U32>()
				.set(
					new Text(kusamaRegistry, 'u32Max'),
					new U32(kusamaRegistry, '0xffffffff')
				)
				.set(
					new Text(kusamaRegistry, 'zero'),
					new U32(kusamaRegistry, 0)
				);
			const bTreeMapConstructor = BTreeMap.with(Text, U32);
			const sanitizedBTreeMap = {
				u32Max: '4294967295',
				zero: '0',
			};

			expect(
				sanitizeNumbers(
					new bTreeMapConstructor(kusamaRegistry, mockU32TextMap)
				)
			).toStrictEqual(sanitizedBTreeMap);

			const structWithBTreeMap = new Struct(kusamaRegistry, {
				foo: U32,
				value: 'BTreeMap<Text, u32>' as 'u32',
			})
				.set('foo', new U32(kusamaRegistry, 50))
				.set(
					'value',
					new bTreeMapConstructor(kusamaRegistry, mockU32TextMap)
				);

			expect(sanitizeNumbers(structWithBTreeMap)).toStrictEqual({
				foo: '50',
				value: {
					u32Max: '4294967295',
					zero: '0',
				},
			});
		});

		const U64Set = new Set<U64>()
			.add(new U64(kusamaRegistry, '0x0'))
			.add(new U64(kusamaRegistry, '24'))
			.add(new U64(kusamaRegistry, '30'))
			.add(new U64(kusamaRegistry, '0xFFFFFFFFFFFFFFFF'));

		const sanitizedBTreeSet = ['0', '24', '30', '18446744073709551615'];

		it('converts BTreeSet', () => {
			const bTreeSet = new BTreeSet(kusamaRegistry, 'u64', U64Set);
			expect(sanitizeNumbers(bTreeSet)).toStrictEqual(sanitizedBTreeSet);
		});

		it('converts nested BTreeSet', () => {
			const structWithBTreeSet = new Struct(kusamaRegistry, {
				foo: U64,
				value: BTreeSet.with(U64),
			})
				.set('foo', new U64(kusamaRegistry, 50))
				.set('value', new BTreeSet(kusamaRegistry, 'u64', U64Set));

			expect(sanitizeNumbers(structWithBTreeSet)).toStrictEqual({
				foo: '50',
				value: sanitizedBTreeSet,
			});
		});

		it('converts an assortment of Compact values', () => {
			const wednesday = kusamaRegistry.createType('Moment', 1537968546);
			expect(
				sanitizeNumbers(
					new (Compact.with('Moment'))(kusamaRegistry, wednesday)
				)
			).toBe('1537968546');

			expect(
				sanitizeNumbers(
					new (Compact.with(U32))(kusamaRegistry, '0xffffffff')
				)
			).toBe('4294967295');

			expect(
				sanitizeNumbers(
					new (Compact.with(U128))(
						kusamaRegistry,
						'0xffffffffffffffffffffffffffffffff'
					)
				)
			).toBe('340282366920938463463374607431768211455');
		});

		test.todo('handles Date');

		it('converts nested Enum', () => {
			const Nest = Enum.with({
				C: U64,
				D: U64,
			});
			const Test = Enum.with({
				A: U64,
				B: Nest,
			});
			const test = new Test(
				kusamaRegistry,
				new Nest(kusamaRegistry, '0xFFFFFFFFFFFFFFFF', 1),
				1
			);

			expect(sanitizeNumbers(test)).toStrictEqual({
				B: {
					D: '18446744073709551615',
				},
			});
		});

		it('handles Linkage', () => {
			const linkage = kusamaRegistry.createType(
				'(ValidatorPrefs, Linkage<AccountId>)' as 'u32',
				'0x0284d7170001da30b68f54f686f586ddb29de12b682dd8bd1404566fb8a8db5dec20aa5b6b36'
			);
			expect(sanitizeNumbers(linkage)).toStrictEqual([
				{ commission: '100000000' },
				{
					previous: null,
					next: '5GznmRvdi5htUJKnMSWJgJUzSJJXSvWuHRSEdyUbHJZDNcwU',
				},
			]);
		});

		describe('Option', () => {
			it('converts None to null', () => {
				const none = new Option(kusamaRegistry, Text, null);
				expect(sanitizeNumbers(none)).toBe(null);
			});

			it('handles wrapped Some(Text)', () => {
				const hi = new Option(kusamaRegistry, Text, 'hi');
				expect(sanitizeNumbers(hi)).toBe('hi');
			});

			it('converts Some(U128)', () => {
				const u128MaxOption = new Option(
					kusamaRegistry,
					U128,
					'0xffffffffffffffffffffffffffffffff'
				);
				expect(sanitizeNumbers(u128MaxOption)).toBe(
					'340282366920938463463374607431768211455'
				);
			});
		});

		it('handles Raw', () => {
			const u8a = new Raw(kusamaRegistry, [1, 2, 3, 4, 5]);
			expect(sanitizeNumbers(u8a)).toBe('0x0102030405');
		});

		describe('Result', () => {
			const ResultConstructor = Result.with({ Error: Text, Ok: U128 });
			const message = new Text(kusamaRegistry, 'error message');
			const maxU128 = new U128(
				kusamaRegistry,
				'0xffffffffffffffffffffffffffffffff'
			);
			const sanitizedMaxU128 = '340282366920938463463374607431768211455';
			it('converts Error(u128)', () => {
				const error = new ResultConstructor(kusamaRegistry, {
					Error: maxU128,
				});
				expect(sanitizeNumbers(error)).toStrictEqual({
					Error: sanitizedMaxU128,
				});
			});

			it('handles Error(Text)', () => {
				const error = new ResultConstructor(kusamaRegistry, {
					Error: message,
				});
				expect(sanitizeNumbers(error)).toStrictEqual({
					Error: message.toString(),
				});
			});

			it('converts Some(u128)', () => {
				const ok = new ResultConstructor(kusamaRegistry, {
					ok: maxU128,
				});

				expect(sanitizeNumbers(ok)).toStrictEqual({
					Ok: sanitizedMaxU128,
				});
			});

			it('handles Ok(Text)', () => {
				const R = Result.with({ Error: Text, Ok: Text });
				const ok = new R(kusamaRegistry, {
					Ok: message,
				});
				expect(sanitizeNumbers(ok)).toStrictEqual({
					Ok: message.toString(),
				});
			});
		});

		it('converts CodecSet', () => {
			const setRoles = {
				full: 1,
				authority: 3,
			};
			const set = new CodecSet(kusamaRegistry, setRoles, [
				'full',
				'authority',
			]);
			expect(sanitizeNumbers(set)).toStrictEqual(['full', 'authority']);
		});

		describe('Struct', () => {
			it('converts a simple Struct', () => {
				const struct = new Struct(
					kusamaRegistry,
					{
						foo: Text,
						bar: U32,
					},
					{ foo: 'hi :)', bar: '4294967295' }
				);

				expect(sanitizeNumbers(struct)).toStrictEqual({
					foo: 'hi :)',
					bar: '4294967295',
				});
			});

			it('converts a more complex Struct', () => {
				const struct = new Struct(
					kusamaRegistry,
					{
						foo: Vec.with(
							Struct.with({
								w: Text,
								bar: U32,
							})
						),
					},
					{
						foo: [
							{ bar: '4294967295', w: 'x' },
							{ bar: '0', w: 'X' },
						],
					}
				);

				expect(sanitizeNumbers(struct)).toStrictEqual({
					foo: [
						{ bar: '4294967295', w: 'x' },
						{ bar: '0', w: 'X' },
					],
				});
			});

			it('converts a five deep nested struct', () => {
				const content = {
					n: '4294967295',
					x: {
						n: '4294967295',
						x: {
							n: '4294967295',
							x: {
								n: '4294967295',
								x: {
									n:
										'340282366920938463463374607431768211455',
									w: 'sorry',
								},
							},
						},
					},
				};
				const struct = new Struct(
					kusamaRegistry,
					{
						n: U32,
						x: Struct.with({
							n: U32,
							x: Struct.with({
								n: U32,
								x: Struct.with({
									n: U32,
									x: Struct.with({
										n: U128,
										w: Text,
									}),
								}),
							}),
						}),
					},
					content
				);

				expect(sanitizeNumbers(struct)).toStrictEqual(content);
			});
		});

		it('converts a simple Tuple', () => {
			const tuple = new Tuple(
				kusamaRegistry,
				[Text, U128],
				['xX', '340282366920938463463374607431768211455']
			);

			expect(sanitizeNumbers(tuple)).toStrictEqual([
				'xX',
				'340282366920938463463374607431768211455',
			]);
		});

		it('converts a 3 deep nested Tuple', () => {
			const tuple = new Tuple(
				kusamaRegistry,
				[Tuple.with([Tuple.with([U32, U128]), U128]), U32],
				[[0, 6074317682114550], 0]
			);

			expect(sanitizeNumbers(tuple)).toStrictEqual([
				[['0', '0'], '6074317682114550'],
				'0',
			]);
		});

		it('converts U8a fixed', () => {
			const u8a = new (U8aFixed.with(32))(kusamaRegistry, [0x02, 0x03]);
			expect(sanitizeNumbers(u8a)).toStrictEqual('0x02030000');
		});

		it('converts Vec<U128>', () => {
			const vec = new (Vec.with(U128))(kusamaRegistry, [
				'0',
				'366920938463463374607431768211455',
				'340282366920938463463374607431768211455',
			]);
			expect(sanitizeNumbers(vec)).toStrictEqual([
				'0',
				'366920938463463374607431768211455',
				'340282366920938463463374607431768211455',
			]);
		});

		it('converts VecFixed<U128>', () => {
			const vec = new (VecFixed.with(U128, 3))(kusamaRegistry, [
				'0',
				'366920938463463374607431768211455',
				'340282366920938463463374607431768211455',
			]);

			expect(sanitizeNumbers(vec)).toStrictEqual([
				'0',
				'366920938463463374607431768211455',
				'340282366920938463463374607431768211455',
			]);
		});
	});

	describe('substrate specific types', () => {
		it('converts Balance to decimal', () => {
			const balanceZero = kusamaRegistry.createType('Balance', '0x0');
			expect(sanitizeNumbers(balanceZero)).toBe('0');

			const balanceTen = kusamaRegistry.createType('Balance', 10);
			expect(sanitizeNumbers(balanceTen)).toBe('10');

			const balancePaddedHex = kusamaRegistry.createType(
				'Balance',
				'0x000000000000000004fe9f24a6a9c00'
			);
			expect(sanitizeNumbers(balancePaddedHex)).toBe('22493750000000000');

			const balanceMax = kusamaRegistry.createType(
				'Balance',
				'0xffffffffffffffffffffffffffffffff'
			);
			expect(sanitizeNumbers(balanceMax)).toBe(
				'340282366920938463463374607431768211455'
			);
		});

		it('converts Compact<Balance>', () => {
			const compactBalanceZero = kusamaRegistry.createType(
				'Compact<Balance>',
				'0x0'
			);
			expect(sanitizeNumbers(compactBalanceZero)).toBe('0');

			const compactBalancePaddedHex = kusamaRegistry.createType(
				'Compact<Balance>',
				'0x0000000000000000004fe9f24a6a9c00'
			);
			expect(sanitizeNumbers(compactBalancePaddedHex)).toBe(
				'22493750000000000'
			);

			const compactBalancePaddedHex2 = kusamaRegistry.createType(
				'Compact<Balance>',
				'0x000000000000000000ff49f24a6a9c00'
			);
			expect(sanitizeNumbers(compactBalancePaddedHex2)).toBe(
				'71857424040631296'
			);

			const compactBalanceMax = kusamaRegistry.createType(
				'Compact<Balance>',
				'0xffffffffffffffffffffffffffffffff'
			);
			expect(sanitizeNumbers(compactBalanceMax)).toBe(
				'340282366920938463463374607431768211455'
			);
		});

		it('converts Index and Compact<Index>', () => {
			const IndexPadded = kusamaRegistry.createType(
				'Index',
				'0x00000384'
			);
			expect(sanitizeNumbers(IndexPadded)).toBe('900');

			const IndexMax = kusamaRegistry.createType('Index', '0x7FFFFFFF');
			expect(sanitizeNumbers(IndexMax)).toBe('2147483647');

			const CompactIndexPadded = kusamaRegistry.createType(
				'Compact<Index>',
				'0x00000384'
			);
			expect(sanitizeNumbers(CompactIndexPadded)).toBe('900');

			const CompactIndexMax = kusamaRegistry.createType(
				'Compact<Index>',
				'0x7FFFFFFF'
			);
			expect(sanitizeNumbers(CompactIndexMax)).toBe('2147483647');
		});

		it('converts Compact<Balance> that are values in an object', () => {
			const totalBalance = kusamaRegistry.createType(
				'Compact<Balance>',
				'0x0000000000000000ff49f24a6a9c00'
			);

			const activeBalance = kusamaRegistry.createType(
				'Compact<Balance>',
				'0x0000000000000000ff49f24a6a9100'
			);

			const arbitraryObject = {
				total: totalBalance,
				active: activeBalance,
			};

			const sanitizedArbitraryObject = {
				total: '71857424040631296',
				active: '71857424040628480',
			};

			expect(sanitizeNumbers(arbitraryObject)).toStrictEqual(
				sanitizedArbitraryObject
			);
		});

		it('converts a staking response', () => {
			expect(
				sanitizeNumbers(PRE_SANITIZED_STAKING_RESPONSE)
			).toStrictEqual({
				at: {
					hash:
						'0x5f2a8b33c24368148982c37aefe77d5724f5aca0bcae1a599e2a4634c1f0fab2',
					height: '2669784',
				},
				staking: {
					active: '71857424040628480',
					claimedRewards: [],
					stash: '5DRihWfVSmhbk25D4VRSjacZTtrnv8w8qnGttLmfro5MCPgm',
					total: '71857424040631296',
					unlocking: [],
				},
			});
		});

		it('converts Vec<BalanceLock>', () => {
			expect(sanitizeNumbers(PRE_SANITIZED_BALANCE_LOCK)).toStrictEqual([
				{
					id: '0x4c6f636b49640000',
					amount: '71857424040631296',
					reasons: 'Misc',
				},
			]);
		});

		it('converts Option<VestingInfo>', () => {
			expect(
				sanitizeNumbers(PRE_SANITIZED_OPTION_VESTING_INFO)
			).toStrictEqual({
				locked: '71857424040631296',
				perBlock: '71857424040628480',
				startingBlock: '299694200',
			});
		});

		it('converts RuntimeDispatchInfo', () => {
			expect(
				sanitizeNumbers(PRE_SANITIZED_RUNTIME_DISPATCH_INFO)
			).toStrictEqual({
				weight: '18446744073709551615',
				class: 'Operational',
				partialFee: '340282366920938463463374607431768211455',
			});
		});

		it('handles enum ElectionStatus', () => {
			const open = kusamaRegistry.createType('ElectionStatus', {
				open: 420420,
			});
			expect(sanitizeNumbers(open)).toStrictEqual({ Open: '420420' });

			const close = kusamaRegistry.createType('ElectionStatus', 'close');
			expect(sanitizeNumbers(close)).toStrictEqual({ Close: null });
		});
	});

	it('handles Vec<AccountId>', () => {
		const vec = new Vec(kusamaRegistry, AccountId, [
			'5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
			'5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
			'5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
		]);

		expect(sanitizeNumbers(vec)).toStrictEqual([
			'5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
			'5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
			'5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
		]);
	});

	test.todo('sanitizes arrays of elements');

	test.todo(
		'sanitize deeply nested object and arrays with other arbitrary types'
	);
});
