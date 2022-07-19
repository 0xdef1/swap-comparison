import Web3 from 'web3'
import _ from 'lodash'
import { sleep } from '../src/sleep'
import fs from 'fs'
import pThrottle from '../src/p-throttle'
const TRICRYPTO_ADDRESS = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46'
const TRICRYPTO_ABI = require('../abi/tricrypto-abi.json')
const ERC20_ABI = require('../abi/erc20-abi.json')
const TRICRYPTO_LP_ADDRESS = '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff'
const web3 = new Web3('INSERT_YOUR_RPC_URL')

main()

async function main() {
    let startBlock = 13916166
    let endBlock = 15000000
    let batchSize = 100
    let numBatches = Math.ceil((endBlock - startBlock) / batchSize)
    for (var batch = 0; batch < numBatches; batch++) {
        let fromBlock = startBlock + (batch * batchSize)
        let toBlock = startBlock + (batch * batchSize) + batchSize - 1
        console.log(`Fetching ${fromBlock} - ${toBlock}`)
        await runBatch(fromBlock, toBlock)
        await sleep(1000)
    }
}

async function runBatch(fromBlock: number, toBlock: number) {
    const contract = new web3.eth.Contract(TRICRYPTO_ABI, TRICRYPTO_ADDRESS)
    const lp = new web3.eth.Contract(ERC20_ABI, TRICRYPTO_LP_ADDRESS)

    let trades = await contract.getPastEvents('TokenExchange', {
        fromBlock: fromBlock,
        toBlock: toBlock
    })

    const throttle = pThrottle({
        limit: 1,
        interval: 1000
    })

    async function fetchPrices(t: any) {
        let block = t.blockNumber
        let scale_0 = (await contract.methods.price_scale(0).call({}, block)) / 1e18
        let scale_1 = (await contract.methods.price_scale(1).call({}, block)) / 1e18
        let oracle_0 = (await contract.methods.price_oracle(0).call({}, block)) / 1e18
        let oracle_1 = (await contract.methods.price_oracle(1).call({}, block)) / 1e18
        let xcp_profit = (await contract.methods.xcp_profit().call({}, block)) / 1e18
        let virtual_price = (await contract.methods.virtual_price().call({}, block)) / 1e18
        let fee = (await contract.methods.fee().call({}, block)) / 1e10
        let balance_0 = (await contract.methods.balances(0).call({}, block)) / 1e6
        let balance_1 = (await contract.methods.balances(1).call({}, block)) / 1e8
        let balance_2 = (await contract.methods.balances(2).call({}, block)) / 1e18
        let lp_supply = (await lp.methods.totalSupply().call({}, block)) / 1e18
        
        let volume = t.returnValues.sold_id == 0 ? t.returnValues.tokens_sold / 1e6
            : t.returnValues.sold_id == 1 ? t.returnValues.tokens_sold / 1e8 * scale_0
            : t.returnValues.sold_id == 2 ? t.returnValues.tokens_sold / 1e18 * scale_1 : 0
        return {
            block: block, 
            price_scale: [scale_0, scale_1], 
            price_oracle: [oracle_0, oracle_1], 
            xcp_profit: xcp_profit, 
            virtual_price: virtual_price, 
            fee: fee, 
            volume: volume, 
            balances: [balance_0, balance_1, balance_2],
            lp_supply: lp_supply,
            sold_id: t.returnValues.sold_id, 
            tokens_sold: t.returnValues.tokens_sold, 
            bought_id: t.returnValues.bought_id, 
            tokens_bought: t.returnValues.tokens_bought}
    }

    let results: any[] = await Promise.all(
        trades.map(t =>  
            throttle(() => fetchPrices(t))()
        )
    )

    results.forEach(r => writeData('curve_repegs.csv', r))
}

function writeData(filename: string, result: any) {

        fs.writeFileSync(`${__dirname}/../data/${filename}`, 
            `${result.block},${result.price_scale[0]},${result.price_scale[1]},${result.price_oracle[0]},${result.price_oracle[1]},${result.balances[0]},${result.balances[1]},${result.balances[2]},${result.lp_supply},${result.xcp_profit},${result.virtual_price},${result.fee},${result.volume},${result.sold_id},${result.tokens_sold},${result.bought_id},${result.tokens_bought}\n`, 
            { flag: 'a+' })

}