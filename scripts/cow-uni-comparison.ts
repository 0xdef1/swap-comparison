import fs from 'fs'
import { fetchUniswapTrades, fetchCurveTrades, fetchCowSwapTrades, Trade } from '../src/fetch-trades'
import { uniswapQuote, curveQuote, uniswapQuoteAllTiers } from '../src/fetch-quotes'
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
import { sleep } from '../src/sleep'
// const w3 = new Web3('https://alpha-bold-mound.discover.quiknode.pro/fe9ff2822396afb244e6c32c7a91840506b41a3b/')
const w3 = new Web3('https://eth.llamarpc.com')

main()

async function main() {
    let startBlock = 13916166
    let endBlock = 18000000
    let batchSize = 500
    let numBatches = Math.ceil((endBlock - startBlock) / batchSize)
    for (var batch = 0; batch < numBatches; batch++) {
        let fromBlock = startBlock + (batch * batchSize)
        let toBlock = startBlock + (batch * batchSize) + batchSize - 1
        console.log(`Fetching ${fromBlock} - ${toBlock}`)
        await runBatch(fromBlock, toBlock)
    }
}

async function runBatch(fromBlock: number, toBlock: number) {

    let cowTrades = await fetchCowSwapTrades(fromBlock, toBlock, COWSWAP_ADDRESS, w3)

    let trades = _([...cowTrades])
        .sortBy(['block','txIndex']).value()

    // await sleep(100);

    const throttle = pThrottle({
        limit: 5,
        interval: 1000
    })
    
    let uniAll = await Promise.all(
        trades.map(t => 
            throttle(() => uniswapQuoteAllTiers(t.block - 1, t.sold_asset, t.bought_asset, t.tokens_sold, w3))()
        )
    )

    writeData('cow-trades.csv',trades, [uniAll])
}

function writeData(filename: string, trades: Trade[], quotes: any[][]) {
    for (let i = 0; i < trades.length; i++) {
        let t = trades[i]
        let q = quotes.map(q => q[i]).join(',')
        if (q != '') {
            fs.writeFileSync(`${__dirname}/../data/${filename}`, 
                `${t.block},${t.txHash},${t.account},${t.pool},${t.sold_asset},${t.bought_asset},${t.tokens_sold},${t.tokens_bought},${q}\n`, 
                { flag: 'a+' })
        }
    }
}
