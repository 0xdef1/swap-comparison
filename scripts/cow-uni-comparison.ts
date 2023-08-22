import fs from 'fs'
import { fetchUniswapTrades, fetchCurveTrades, fetchCowSwapTrades, Trade } from '../src/fetch-trades'
import { uniswapQuote, curveQuote } from '../src/fetch-quotes'
import _ from 'lodash'
import pThrottle from '../src/p-throttle'
const TRICRYPTO_ADDRESS = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46'
const UNI_USDT_ETH_30_ADDRESS = '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36'
const UNI_USDT_ETH_05_ADDRESS = '0x11b815efb8f581194ae79006d24e0d814b7697f6'
const COWSWAP_ADDRESS = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'
const TRICRYPTO_ASSETS = ['USDT', 'WBTC', 'WETH']
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
const assetAddresses: any = {
    WETH: WETH_ADDRESS,
    USDT: USDT_ADDRESS,
    WBTC: WBTC_ADDRESS,
}
import Web3 from 'web3'
const w3 = new Web3('https://eth-mainnet.g.alchemy.com/v2/d-zNwmGUjkCQpqag89kNbXdhpFRyU7Ln')

main()

async function main() {
    let startBlock = 13916166
    let endBlock = 15000000
    let batchSize = 10
    let numBatches = Math.ceil((endBlock - startBlock) / batchSize)
    for (var batch = 0; batch < numBatches; batch++) {
        let fromBlock = startBlock + (batch * batchSize)
        let toBlock = startBlock + (batch * batchSize) + batchSize - 1
        console.log(`Fetching ${fromBlock} - ${toBlock}`)
        await runBatch(fromBlock, toBlock)
    }
}

async function runBatch(fromBlock: number, toBlock: number) {
    // let uni05bpsTrades = await fetchUniswapTrades(fromBlock, toBlock, ['WETH','USDT'], UNI_USDT_ETH_05_ADDRESS, w3)
    // let uni30bpsTrades = await fetchUniswapTrades(fromBlock, toBlock, ['WETH','USDT'], UNI_USDT_ETH_30_ADDRESS, w3)
    // let curveTrades = await fetchCurveTrades(fromBlock, toBlock, TRICRYPTO_ASSETS, TRICRYPTO_ADDRESS, w3)
    // curveTrades = curveTrades .filter(t => 
    //     (t.bought_asset == 'WETH' && t.sold_asset == 'USDT') || 
    //     (t.bought_asset == 'USDT' && t.sold_asset == 'WETH')
    // )
    // let trades = _([...uni05bpsTrades, ...uni30bpsTrades, ...curveTrades])
    //     .sortBy(['block','txIndex']).value()

    let cowTrades = await fetchCowSwapTrades(fromBlock, toBlock, COWSWAP_ADDRESS, w3)

    let trades = _([...cowTrades])
        .sortBy(['block','txIndex']).value()

    // const throttle = pThrottle({
    //     limit: 5,
    //     interval: 1000
    // })

    // let uni05 = await Promise.all(
    //     trades.map(t => 
    //         throttle(() => uniswapQuote(t.block - 1, assetAddresses[t.sold_asset], assetAddresses[t.bought_asset], 500, t.tokens_sold, w3))()
    //     )
    // )
    // let uni30 = await Promise.all(
    //     trades.map(t => 
    //         throttle(() => uniswapQuote(t.block - 1, assetAddresses[t.sold_asset], assetAddresses[t.bought_asset], 3000, t.tokens_sold, w3))()
    //     )
    // )
    // let curve = await Promise.all(
    //     trades.map(t => 
    //         throttle(() => curveQuote(t.block - 1, TRICRYPTO_ASSETS.indexOf(t.sold_asset), TRICRYPTO_ASSETS.indexOf(t.bought_asset), t.tokens_sold, w3))()
    //     )
    // )
    writeData('trades.csv',trades)
}

// function writeData(filename: string, trades: Trade[], quotes: string[][]) {
function writeData(filename: string, trades: Trade[]) {
    for (let i = 0; i < trades.length; i++) {
        let t = trades[i]
        // let q = quotes.map(q => q[i]).join(',')
        fs.writeFileSync(`${__dirname}/../data/${filename}`, 
            // `${t.block},${t.txHash},${t.account},${t.pool},${t.sold_asset},${t.bought_asset},${t.tokens_sold},${t.tokens_bought},${q}\n`, 
            `${t.block},${t.txHash},${t.account},${t.pool},${t.sold_asset},${t.bought_asset},${t.tokens_sold},${t.tokens_bought}\n`, 
            { flag: 'a+' })
    }
}
