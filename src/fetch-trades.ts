import Web3 from 'web3'
const TRICRYPTO_ABI = require('../abi/tricrypto-abi.json')
const UNI_ABI = require('../abi/univ3-pool-abi.json')
const COWSWAP_ABI = require('../abi/cowswap-abi.json')

export type Trade = {
    block: number,
    txHash: string,
    txIndex: number,
    account: string,
    pool: string,
    sold_asset: string,
    bought_asset: string,
    tokens_sold: string,
    tokens_bought: string
}

export async function fetchUniswapTrades(
    fromBlock: number, 
    toBlock: number, 
    assets: string[], 
    contractAddress: string, 
    web3: Web3) : Promise<Trade[]> {
    
    let contract = new web3.eth.Contract(UNI_ABI, contractAddress)
    let result = await contract.getPastEvents('Swap', {
        fromBlock: fromBlock,
        toBlock: toBlock
    })

    return result.map((event: any) => ({
        block: event.blockNumber,
        txHash: event.transactionHash,
        txIndex: event.transactionIndex,
        account: event.returnValues.sender,
        pool: contractAddress,
        sold_asset: event.returnValues.amount0 > 0 ? assets[0] : assets[1],
        bought_asset: event.returnValues.amount0 > 0 ? assets[1] : assets[0],
        tokens_sold: event.returnValues.amount0 > 0 ? event.returnValues.amount0 : event.returnValues.amount1,
        tokens_bought: event.returnValues.amount0 > 0 ? event.returnValues.amount1.substr(1) : event.returnValues.amount0.substr(1),
    })).filter(t => t.tokens_bought != '')
}

export async function fetchCurveTrades(
    fromBlock: number,
    toBlock: number,
    assets: string[],
    contractAddress: string,
    web3: Web3): Promise<Trade[]> {
    
    let contract = new web3.eth.Contract(TRICRYPTO_ABI, contractAddress)
    let result = await contract.getPastEvents('TokenExchange', {
        fromBlock: fromBlock,
        toBlock: toBlock
    })

    return result.map((event: any) => ({
        block: event.blockNumber,
        txHash: event.transactionHash,
        txIndex: event.transactionIndex,
        account: event.returnValues.buyer,
        pool: contractAddress,
        sold_asset: assets[event.returnValues.sold_id],
        bought_asset: assets[event.returnValues.bought_id],
        tokens_sold: event.returnValues.tokens_sold,
        tokens_bought: event.returnValues.tokens_bought
    }))

}

export async function fetchCowSwapTrades(
    fromBlock: number,
    toBlock: number,
    contractAddress: string,
    web3: Web3): Promise<Trade[]> {

    let contract = new web3.eth.Contract(COWSWAP_ABI, contractAddress)
    let result = await contract.getPastEvents('Trade', {
        fromBlock: fromBlock,
        toBlock: toBlock
    })

    return result.map((event: any) => ({
        block: event.blockNumber,
        txHash: event.transactionHash,
        txIndex: event.transactionIndex,
        account: event.returnValues.owner,
        pool: contractAddress,
        sold_asset: event.returnValues.sellToken !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? event.returnValues.sellToken : '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        bought_asset: event.returnValues.buyToken !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? event.returnValues.buyToken : '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokens_sold: event.returnValues.sellAmount,
        tokens_bought: event.returnValues.buyAmount
    }))
    
}