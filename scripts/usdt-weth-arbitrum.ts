import fs from 'fs'
import { fetchUniswapTrades, fetchCurveTrades, Trade } from '../src/fetch-trades'
import { uniswapQuote, curveQuote } from '../src/fetch-quotes'
import _ from 'lodash'
import pThrottle from '../src/p-throttle'
const TRICRYPTO_ADDRESS = '0x960ea3e3C7FB317332d990873d354E18d7645590'
const UNI_USDT_ETH_30_ADDRESS = '0xc82819f72a9e77e2c0c3a69b3196478f44303cf4'
const UNI_USDT_ETH_05_ADDRESS = '0x641c00a822e8b671738d32a431a4fb6074e5c79d'
const TRICRYPTO_ASSETS = ['USDT', 'WBTC', 'WETH']
const USDT_ADDRESS = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9'
const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
const WBTC_ADDRESS = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
const assetAddresses: any = {
    WETH: WETH_ADDRESS,
    USDT: USDT_ADDRESS,
    WBTC: WBTC_ADDRESS,
}
import Web3 from 'web3'
const w3 = new Web3('INSERT_YOUR_RPC_URL')

main()

async function main() {
    let startBlock = 4221290
    let endBlock = 17430026
    let batchSize = 10000
    let numBatches = Math.ceil((endBlock - startBlock) / batchSize)
    for (var batch = 0; batch < numBatches; batch++) {
        let fromBlock = startBlock + (batch * batchSize)
        let toBlock = startBlock + (batch * batchSize) + batchSize - 1
        console.log(`Fetching ${fromBlock} - ${toBlock}`)
        await runBatch(fromBlock, toBlock)
    }
}

async function runBatch(fromBlock: number, toBlock: number) {
    let uni05bpsTrades = await fetchUniswapTrades(fromBlock, toBlock, ['WETH','USDT'], UNI_USDT_ETH_05_ADDRESS, w3)
    let uni30bpsTrades = await fetchUniswapTrades(fromBlock, toBlock, ['WETH','USDT'], UNI_USDT_ETH_30_ADDRESS, w3)
    let curveTrades = await fetchCurveTrades(fromBlock, toBlock, ['USDT','WBTC','WETH'], TRICRYPTO_ADDRESS, w3)
    curveTrades = curveTrades .filter(t => 
        (t.bought_asset == 'WETH' && t.sold_asset == 'USDT') || 
        (t.bought_asset == 'USDT' && t.sold_asset == 'WETH')
    )
    let trades = _([...uni05bpsTrades, ...uni30bpsTrades, ...curveTrades])
        .sortBy(['block','txIndex']).value()

    const throttle = pThrottle({
        limit: 5,
        interval: 1000
    })

    let uni05 = await Promise.all(
        trades.map(t => 
            throttle(() => uniswapQuote(t.block - 1, assetAddresses[t.sold_asset], assetAddresses[t.bought_asset], 500, t.tokens_sold, w3))()
        )
    )
    let uni30 = await Promise.all(
        trades.map(t => 
            throttle(() => uniswapQuote(t.block - 1, assetAddresses[t.sold_asset], assetAddresses[t.bought_asset], 3000, t.tokens_sold, w3))()
        )
    )
    let curve = await Promise.all(
        trades.map(t => 
            throttle(() => curveQuote(t.block - 1, TRICRYPTO_ASSETS.indexOf(t.sold_asset), TRICRYPTO_ASSETS.indexOf(t.bought_asset), t.tokens_sold, w3, TRICRYPTO_ADDRESS))()
        )
    )
    writeData('trades-usdt-weth-arbitrum.csv',trades, [uni05,uni30,curve])
}

function writeData(filename: string, trades: Trade[], quotes: string[][]) {
    for (let i = 0; i < trades.length; i++) {
        let t = trades[i]
        let q = quotes.map(q => q[i]).join(',')
        fs.writeFileSync(`${__dirname}/../data/${filename}`, 
            `${t.block},${t.txHash},${t.account},${t.pool},${t.sold_asset},${t.bought_asset},${t.tokens_sold},${t.tokens_bought},${q}\n`, 
            { flag: 'a+' })
    }
}