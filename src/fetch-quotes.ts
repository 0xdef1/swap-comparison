import Web3 from 'web3'
const UNIV3_QUOTER_ABI = require('../abi/univ3-quoter-abi.json')
const TRICRYPTO_ABI = require('../abi/tricrypto-abi.json')
const ROUTER_ABI = require('../abi/univ3-swap-router-abi.json')
const TRICRYPTO_ADDRESS = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46' // ETH Mainnet Default
const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' // ETH Mainnet Default
const ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
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


        let ethBlock = await web3.eth.getBlock(block);
        console.log(ethBlock.timestamp)

        let params = [
            sellAssetAddress,
            buyAssetAddress,
            feeTier,
            '0x1558Fc1033a67363FfDf0182B8c07c725d01abab',
            +ethBlock.timestamp + 100000000000,
            amount,
            0,
            0
        ]
        let routerContract = new web3.eth.Contract(ROUTER_ABI, ROUTER_ADDRESS)
        let gasAmount =  await routerContract.methods.exactInputSingle(params).estimateGas({from: '0x1558Fc1033a67363FfDf0182B8c07c725d01abab'})
        let gasPrice = ethBlock.baseFeePerGas
        let gasCost = gasAmount * gasPrice!;

        console.log({
            gasAmount,
            gasPrice,
            gasCost,
            sellAssetAddress,
            buyAssetAddress
        })

        let input = sellAssetAddress == '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' ? String(+amount - gasCost) : amount;
        output = await contract.methods.quoteExactInputSingle(
            sellAssetAddress,
            buyAssetAddress,
            feeTier,
            input,
            0
        ).call({}, block)
        output = buyAssetAddress == '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' ? String(+output - gasCost) : output;
        console.log('Successful uniswap quote:', block, sellAssetAddress, buyAssetAddress, feeTier, amount)


        //let gasAmount = await poolContract.methods.swap(WETH_ADDRESS, USDC_ADDRESS, amount).estimateGas()
    } catch (e) {
        console.log('Failed uniswap quote: ', block, sellAssetAddress, buyAssetAddress, feeTier, amount)
        throw e
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