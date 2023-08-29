import Web3 from 'web3'
const UNIV3_QUOTER_ABI = require('../abi/univ3-quoter-abi.json')
const TRICRYPTO_ABI = require('../abi/tricrypto-abi.json')
const TRICRYPTO_ADDRESS = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46' // ETH Mainnet Default
const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' // ETH Mainnet Default
import _ from 'lodash'

export async function uniswapQuoteAllTiers(
    block: number, 
    sellAssetAddress: string, 
    buyAssetAddress: string,
    amount: string,
    web3: Web3,
    quoterAddress = QUOTER_ADDRESS,
    ): Promise<string> {

    let quotes = await Promise.all([500,3000,10000].map(tier => {
        return uniswapQuote(block, sellAssetAddress, buyAssetAddress, tier, amount, web3, quoterAddress)
    }));

    let output = _(quotes).filter(v => v != '').orderBy(v => parseInt(v), 'desc').valueOf()[0];
    return output

}

export async function uniswapQuote(
    block: number, 
    sellAssetAddress: string, 
    buyAssetAddress: string,
    feeTier: number, 
    amount: string,
    web3: Web3,
    quoterAddress = QUOTER_ADDRESS,
    ): Promise<string> {
    const contract = new web3.eth.Contract(UNIV3_QUOTER_ABI, quoterAddress)
    
    let output = ''
    try {
        output = await contract.methods.quoteExactInputSingle(
            sellAssetAddress,
            buyAssetAddress,
            feeTier,
            amount,
            0
        ).call({}, block)
        console.log('Successful uniswap quote:', block, sellAssetAddress, buyAssetAddress, feeTier, amount)
    } catch (e) {
        console.log('Failed uniswap quote: ', block, sellAssetAddress, buyAssetAddress, feeTier, amount)
        //throw e
    }
    return output
}

export async function curveQuote(
    block: number,
    sellAssetIndex: number,
    buyAssetIndex: number,
    amount: string,
    web3: Web3, 
    tricryptoAddress = TRICRYPTO_ADDRESS,
    ): Promise<string> {

    let output = ''
    try {
        const contract = new web3.eth.Contract(TRICRYPTO_ABI, tricryptoAddress)
        output = await contract.methods.get_dy(
            sellAssetIndex, 
            buyAssetIndex, 
            amount
        ).call({}, block)
    } catch (e) {
        console.log('Failed curve quote', block, sellAssetIndex, buyAssetIndex, amount)
        throw e
    }
    return output
}